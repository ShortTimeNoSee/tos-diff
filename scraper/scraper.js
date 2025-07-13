import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import puppeteer from 'puppeteer';
import sanitizeHtml from 'sanitize-html';
import { diffLines } from 'diff';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { getDomain } from 'tldts';
import dotenv from 'dotenv';
import prettier from 'prettier';

const scriptDirForEnv = path.dirname(import.meta.url.substring(7));
dotenv.config({ path: path.resolve(scriptDirForEnv, '.env') });

const xai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1'
});

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
];

const FAILURES_LOG = 'failures.log';
const AI_RETRIES = 3;
const MIN_CONTENT_LENGTH = 256; // Minimum characters for a valid scrape
const USE_AI = true;

async function sendDiscordAlert({ title, message, level = 'INFO' }) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    const logMessage = `${new Date().toISOString()} - DISCORD_ALERT_SKIPPED (no webhook): ${JSON.stringify({title, message})}\n`;
    await fs.appendFile(FAILURES_LOG, logMessage);
    console.warn(`Discord alert triggered but no DISCORD_WEBHOOK_URL is set. Title: ${title}`);
    return;
  }

  const color = {
    'INFO': 3447003,    // Blue
    'SUCCESS': 3066993,  // Green
    'WARN': 15105570,   // Orange
    'ERROR': 15158332,  // Red
  }[level];

  const embed = {
    title: title,
    description: message,
    color: color,
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
    console.log(`Discord alert sent: ${title}`);
  } catch (error) {
    console.error('Failed to send Discord alert:', error.message);
    const logMessage = `${new Date().toISOString()} - DISCORD_ALERT_FAILED: ${JSON.stringify({title, message})}\n`;
    await fs.appendFile(FAILURES_LOG, logMessage);
  }
}

async function generateWithGemini(prompt, systemPrompt) {
  const ai = new GoogleGenAI({});
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "user", parts: [{ text: prompt }] }
    ],
    config: {
      thinkingConfig: {
        thinkingBudget: -1,
      },
    }
  });

  return response.text;
}

async function generateWithGrok(messages) {
  const completion = await xai.chat.completions.create({
    model: 'grok-3-mini',
    messages: messages,
    reasoning_effort: 'high'
  });
  
  return completion.choices[0].message.content;
}

async function generateWithFallback(prompt, systemPrompt) {
  try {
    console.log('Attempting Gemini AI...');
    const result = await generateWithGemini(prompt, systemPrompt);
    console.log('Gemini AI succeeded');
    return result;
  } catch (error) {
    console.warn(`Gemini failed: ${error.message}, falling back to Grok`);
    try {
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ];
      const result = await generateWithGrok(messages);
      console.log('Grok fallback succeeded');
      return result;
    } catch (grokError) {
      console.error(`Both AI providers failed. Grok error: ${grokError.message}`);
      throw grokError;
    }
  }
}

async function alertAdmin(details) {
  const message = `
**Service:** ${details.service}
**Document:** ${details.docType}
---
**Raw AI Response:**
\`\`\`
${details.rawResponse}
\`\`\`
  `;

  await sendDiscordAlert({
    title: '🚨 Admin Alert Triggered',
    message,
    level: 'ERROR',
  });
}

async function updateConfig(serviceName, docType, jsHeavyFlag) {
  const filePath = path.resolve(scriptDirForEnv, '../service-config', `${serviceName.toLowerCase()}.json`);
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const config = JSON.parse(fileContent);

    if (config.documents && config.documents[docType]) {
      config.documents[docType].jsHeavy = jsHeavyFlag;
      await fs.writeFile(filePath, JSON.stringify(config, null, 2));
      const successMessage = `Permanently set 'jsHeavy: ${jsHeavyFlag}' for ${serviceName} - ${docType}.`;
      console.log(successMessage);
      await sendDiscordAlert({ title: 'Scraping Strategy Updated', message: successMessage, level: 'INFO' });
    }
  } catch (error) {
    const errorMessage = `Failed to update config for ${serviceName} at ${filePath}: ${error.message}`;
    console.error(errorMessage);
    await sendDiscordAlert({ title: 'Config Update Failed', message: errorMessage, level: 'ERROR' });
  }
}

function getRandomDelay() {
  return Math.floor(Math.random() * 6000) + 2000;
}

function normalizeUrls(html) {
  return html.replace(/href="([^"]+)"/g, (match, url) => {
    let processedUrl = url.replace(/&amp;/g, '&');

    if (processedUrl.startsWith('/video_redirect/')) {
      const srcParamMatch = processedUrl.match(/[?&]src=([^&]+)/);
      if (srcParamMatch && srcParamMatch[1]) {
        try {
          processedUrl = decodeURIComponent(srcParamMatch[1]);
        } catch (decodeError) { }
      }
    }

    try {
      let urlObj = new URL(processedUrl);

      if (urlObj.hostname.endsWith('facebook.com') && urlObj.pathname === '/l.php') {
        const actualUrl = urlObj.searchParams.get('u');
        if (actualUrl) {
          processedUrl = decodeURIComponent(actualUrl);
          urlObj = new URL(processedUrl);
        }
      }
      
      const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
      paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
      
      processedUrl = urlObj.toString();

    } catch (error) {
    }
    
    return url === processedUrl ? match : `href="${processedUrl}"`;
  });
}

async function formatHtml(html) {
  return await prettier.format(html, { parser: 'html', printWidth: 120 });
}

function getHeaderContextByLine(html) {
  const lines = html.split(/\r?\n/);
  const headerContextByLine = [];
  let currentHeaderStack = [];
  const headerRegex = /<h([1-6]).*?>(.*?)<\/h\1>/i;

  for (const line of lines) {
    const match = line.match(headerRegex);
    if (match) {
      const level = parseInt(match[1], 10);
      const text = sanitizeHtml(match[2], { allowedTags: [], allowedAttributes: {} }).trim();

      while (currentHeaderStack.length > 0 && currentHeaderStack[currentHeaderStack.length - 1].level >= level) {
        currentHeaderStack.pop();
      }
      currentHeaderStack.push({ level, text });
    }
    headerContextByLine.push([...currentHeaderStack].map(h => h.text));
  }

  return headerContextByLine;
}

async function processRawHtml(raw) {
  let clean = sanitizeHtml(raw, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'b', 'i', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'br', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    allowedAttributes: {
      'a': ['href', 'target', 'rel']
    }
  });

  clean = normalizeUrls(clean);
  clean = await formatHtml(clean);
  return clean;
}

async function attemptScrape(page, selector, isJsHeavy) {
  try {
    if (isJsHeavy) {
      console.log(`Using 'jsHeavy' strategy, waiting for selector: "${selector}"`);
      await page.waitForSelector(selector, { timeout: 30000, visible: true });
    }
    
    const raw = await page.$eval(selector, el => el.innerHTML);

    if (raw.length < MIN_CONTENT_LENGTH) {
      console.warn(`Scraped content is suspiciously small (${raw.length} chars). Discarding.`);
      return null;
    }
    
    return raw;

  } catch (error) {
    console.warn(`'${isJsHeavy ? 'jsHeavy' : 'Default'}' scrape failed for selector "${selector}": ${error.message}`);
    return null;
  }
}

async function scrapeDocument(page, cfg, docType, docSlug, url, selector, systemPrompt, { fetchFavicon = false }) {
  try {
    console.log(`Scraping ${cfg.service} ${docType}...`);
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    if (fetchFavicon) {
      let faviconUrl;
      try {
        faviconUrl = await page.evaluate(() => {
          const selectors = [
            'link[rel="icon"]',
            'link[rel="shortcut icon"]',
            'link[rel="apple-touch-icon"]'
          ];
          for (const selector of selectors) {
            const link = document.querySelector(selector);
            if (link) return link.href;
          }
          return null;
        });

        if (!faviconUrl) {
          console.log(`No standard favicon link found for ${cfg.service}. Trying base domain.`);
          const pageUrl = page.url();
          const origin = new URL(pageUrl).origin;
          const fallbackUrl = `${origin}/favicon.ico`;
          const response = await fetch(fallbackUrl);
          if (response.ok) {
            faviconUrl = fallbackUrl;
          } else {
            console.log(`Base domain favicon at ${fallbackUrl} not found.`);
          }
        }

        if (!faviconUrl) {
          console.log(`No base domain favicon found for ${cfg.service}. Searching for any .ico link.`);
          faviconUrl = await page.evaluate(() => {
            const link = document.querySelector('head link[href$=".ico"]');
            return link ? link.href : null;
          });
        }

        if (faviconUrl) {
          const response = await fetch(faviconUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch favicon from ${faviconUrl}, status: ${response.status}`);
          }
          const buffer = await response.arrayBuffer();
          const faviconDir = path.resolve(scriptDirForEnv, '../web/static/favicons');
          await fs.mkdir(faviconDir, { recursive: true });
          const faviconPath = path.join(faviconDir, `${cfg.service}.ico`);
          await fs.writeFile(faviconPath, Buffer.from(buffer));
          console.log(`Saved favicon for ${cfg.service} from ${faviconUrl}`);
        } else {
          const errorMessage = `Could not find favicon for ${cfg.service} after all fallbacks.`;
          console.warn(errorMessage);
          await sendDiscordAlert({ title: 'Favicon Not Found', message: errorMessage, level: 'WARN' });
        }
      } catch (error) {
        const errorMessage = `Failed to fetch or save favicon for ${cfg.service}: ${error.message}`;
        console.warn(errorMessage);
        await sendDiscordAlert({ title: 'Favicon Fetch Failed', message: errorMessage, level: 'ERROR' });
      }
    }

    const docConfig = cfg.documents[docType] || {};
    const initialStrategyIsJsHeavy = !!docConfig.jsHeavy;

    let raw = await attemptScrape(page, selector, initialStrategyIsJsHeavy);

    if (!raw) {
      const fallbackStrategy = !initialStrategyIsJsHeavy;
      console.log(`Initial scrape failed. Trying fallback strategy ('jsHeavy: ${fallbackStrategy}')...`);
      raw = await attemptScrape(page, selector, fallbackStrategy);

      if (raw) {
        await updateConfig(cfg.service, docType, fallbackStrategy);
      }
    }

    if (!raw) {
      const errorMessage = `All scraping attempts failed for ${cfg.service} ${docType} with selector "${selector}".`;
      console.error(errorMessage);
      await sendDiscordAlert({ title: 'Scraping Failed', message: errorMessage, level: 'ERROR' });
      return;
    }

    const sourceHash = createHash('sha256').update(raw).digest('hex');

    const clean = await processRawHtml(raw);

    if (clean.length < MIN_CONTENT_LENGTH) {
      const errorMessage = `Scraped content for ${cfg.service} ${docType} is suspiciously small (${clean.length} chars).`;
      console.warn(errorMessage);
      await sendDiscordAlert({ title: 'Low Content Warning', message: errorMessage, level: 'WARN' });
    }

    const storage = path.resolve(scriptDirForEnv, 'storage', cfg.service, docSlug);
    await fs.mkdir(storage, { recursive: true });
    const prevFile = path.join(storage, 'prev.html');
    let prev = '';
    let isFirstRun = false;
    try {
      prev = await fs.readFile(prevFile, 'utf-8');
    } catch {
      isFirstRun = true;
    }

    if (prev === clean) {
      console.log(`No changes detected for ${cfg.service} ${docType}`);
      return;
    }

    if (isFirstRun) {
      await fs.writeFile(prevFile, clean);
      console.log(`Initial content saved for ${cfg.service} ${docType}. No diff generated on first run.`);
      return;
    }

    await fs.writeFile(prevFile, clean);

    const prevHeaderContext = getHeaderContextByLine(prev);
    const cleanHeaderContext = getHeaderContextByLine(clean);
    
    const diff = diffLines(prev, clean);

    if (!diff.some(part => part.added || part.removed)) {
      console.log(`No significant changes detected (whitespace only) for ${cfg.service} ${docType}`);
      return;
    }

    let diffTextForAI = '';
    let lastHeadersJson = '';
    let prevLineNum = 0;
    let cleanLineNum = 0;

    for (const part of diff) {
      if (part.added) {
        const headers = cleanHeaderContext[cleanLineNum];
        const headersJson = JSON.stringify(headers);
        if (headers && headers.length > 0 && headersJson !== lastHeadersJson) {
          diffTextForAI += `\n[Context: ${headers.join(' > ')}]\n`;
          lastHeadersJson = headersJson;
        }
        diffTextForAI += part.value.split(/\r?\n/).filter(l => l).map(line => `+ ${line}`).join('\n') + '\n';
        cleanLineNum += part.count;
      } else if (part.removed) {
        const headers = prevHeaderContext[prevLineNum];
        const headersJson = JSON.stringify(headers);
        if (headers && headers.length > 0 && headersJson !== lastHeadersJson) {
          diffTextForAI += `\n[Context: ${headers.join(' > ')}]\n`;
          lastHeadersJson = headersJson;
        }
        diffTextForAI += part.value.split(/\r?\n/).filter(l => l).map(line => `- ${line}`).join('\n') + '\n';
        prevLineNum += part.count;
      } else {
        prevLineNum += part.count;
        cleanLineNum += part.count;
        lastHeadersJson = '';
      }
    }
    
    const diffHtml = diff.map(part => {
      const className = part.added ? 'added' : part.removed ? 'removed' : '';
      const escapedValue = part.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (className) {
        return `<div class="${className}">${escapedValue}</div>`;
      }
      return `<div>${escapedValue}</div>`;
    }).join('');

    let summaryLines;

    if (USE_AI) {
      const prompt = `Summarize these ${docType} changes as a Markdown bullet list. The changes are provided in a diff format, with lines prefixed by '+' for additions and '-' for removals. Header context is provided in [Context: ...] blocks. The diff contains HTML, so interpret it accordingly:\n\n${diffTextForAI}`;
      
      let aiResponse;
      let lastError = null;

      for (let i = 0; i < AI_RETRIES; i++) {
        try {
          aiResponse = await generateWithFallback(prompt, systemPrompt);
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          console.warn(`AI completion failed for ${cfg.service} ${docType} (attempt ${i + 1}/${AI_RETRIES}):`, error.message);
          if (i < AI_RETRIES - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      if (lastError) {
        const errorMessage = `AI processing failed for ${cfg.service} ${docType} after ${AI_RETRIES} attempts: ${lastError.message}`;
        console.error(errorMessage);
        await sendDiscordAlert({ title: 'AI Processing Failed', message: errorMessage, level: 'ERROR' });
        const logMessage = `${new Date().toISOString()} - AI_FAILED: ${JSON.stringify({ service: cfg.service, docType, error: lastError.message })}\n`;
        await fs.appendFile(FAILURES_LOG, logMessage);
        return;
      }
      
      if (aiResponse.includes('alert_admin()')) {
        await alertAdmin({
          service: cfg.service,
          docType: docType,
          rawResponse: aiResponse
        });
      }

      summaryLines = aiResponse
        .replace(/alert_admin\(\)/g, '')
        .trim()
        .split(/\r?\n/)
        .filter(line => Boolean(line) && !line.includes('[ADMIN]'))
        .map(l => `<p>${l}</p>`);
    } else {
      console.log(`AI processing skipped for ${cfg.service} ${docType} because USE_AI is false.`);
      summaryLines = [`<p>AI summary disabled for testing. Changes were detected.</p>`];
    }

    const outDir = path.resolve(scriptDirForEnv, '../web/static/data', cfg.service.toLowerCase(), docSlug);
    await fs.mkdir(outDir, { recursive: true });
    const changesFile = path.join(outDir, 'changes.json');

    let data = { schemaVersion: 2, changes: [] };
    try {
      const fileContent = await fs.readFile(changesFile, 'utf-8');
      const existingData = JSON.parse(fileContent);
      if (Array.isArray(existingData)) {
        data.changes = existingData;
      } else if (existingData && typeof existingData === 'object') {
        data = existingData;
      }
    } catch {}

    const timestamp = new Date().toISOString();
    const sourceHtmlFile = `${new Date(timestamp).getTime()}-source.html`;
    await fs.writeFile(path.join(outDir, sourceHtmlFile), raw);

    data.changes.unshift({
      timestamp: timestamp,
      type: docType,
      summary: summaryLines,
      diffHtml,
      sourceHash,
      sourceHtmlFile
    });
    await fs.writeFile(changesFile, JSON.stringify(data, null, 2));
    
    console.log(`Changes detected and processed for ${cfg.service} ${docType}`);
    const alertMessage = `
**Service:** ${cfg.service}
**Document:** [${docType}](${url})
---
**Summary of Changes:**
${summaryLines.map(p => p.replace(/<p>/g, '').replace(/<\/p>/g, '')).join('\n')}
    `;
    await sendDiscordAlert({
      title: `✅ Changes Detected: ${cfg.service} ${docType}`,
      message: alertMessage,
      level: 'SUCCESS'
    });

  } catch (error) {
    const errorMessage = `An unexpected error occurred in scrapeDocument for ${cfg.service} ${docType} at ${url}: ${error.message}`;
    console.error(errorMessage, error.stack);
    await sendDiscordAlert({ title: 'Unhandled Scraper Error', message: errorMessage, level: 'ERROR' });
    const logMessage = `${new Date().toISOString()} - UNHANDLED_ERROR: ${JSON.stringify({ service: cfg.service, docType, url, error: error.message })}\n`;
    await fs.appendFile(FAILURES_LOG, logMessage);
  }
}

async function runDiffOnly(task, systemPrompt) {
  const { cfg, docType, docSlug } = task;
  console.log(`--diff-only: Re-running AI summary for ${cfg.service} - ${docType}`);

  const outDir = path.resolve(scriptDirForEnv, '../web/static/data', cfg.service.toLowerCase(), docSlug);
  const changesFile = path.join(outDir, 'changes.json');

  let data;
  try {
    const fileContent = await fs.readFile(changesFile, 'utf-8');
    data = JSON.parse(fileContent);
  } catch (error) {
    console.error(`Could not read changes file for ${docType} at ${changesFile}: ${error.message}`);
    return;
  }

  if (!data.changes || data.changes.length < 2) {
    console.error(`Cannot run diff. Need at least two history entries, but found ${data.changes?.length || 0}.`);
    return;
  }

  const latestChange = data.changes[0];
  const previousChange = data.changes[1];

  const currentSourcePath = path.join(outDir, latestChange.sourceHtmlFile);
  const previousSourcePath = path.join(outDir, previousChange.sourceHtmlFile);

  let currentRaw, previousRaw;
  try {
    currentRaw = await fs.readFile(currentSourcePath, 'utf-8');
    previousRaw = await fs.readFile(previousSourcePath, 'utf-8');
  } catch (error) {
    console.error(`Failed to read source HTML files: ${error.message}`);
    return;
  }
  
  const prev = await processRawHtml(previousRaw);
  const clean = await processRawHtml(currentRaw);

  const prevHeaderContext = getHeaderContextByLine(prev);
  const cleanHeaderContext = getHeaderContextByLine(clean);
  const diff = diffLines(prev, clean);

  let diffTextForAI = '';
  let lastHeadersJson = '';
  let prevLineNum = 0;
  let cleanLineNum = 0;

  for (const part of diff) {
    if (part.added) {
      const headers = cleanHeaderContext[cleanLineNum];
      const headersJson = JSON.stringify(headers);
      if (headers && headers.length > 0 && headersJson !== lastHeadersJson) {
        diffTextForAI += `\n[Context: ${headers.join(' > ')}]\n`;
        lastHeadersJson = headersJson;
      }
      diffTextForAI += part.value.split(/\r?\n/).filter(l => l).map(line => `+ ${line}`).join('\n') + '\n';
      cleanLineNum += part.count;
    } else if (part.removed) {
      const headers = prevHeaderContext[prevLineNum];
      const headersJson = JSON.stringify(headers);
      if (headers && headers.length > 0 && headersJson !== lastHeadersJson) {
        diffTextForAI += `\n[Context: ${headers.join(' > ')}]\n`;
        lastHeadersJson = headersJson;
      }
      diffTextForAI += part.value.split(/\r?\n/).filter(l => l).map(line => `- ${line}`).join('\n') + '\n';
      prevLineNum += part.count;
    } else {
      prevLineNum += part.count;
      cleanLineNum += part.count;
      lastHeadersJson = '';
    }
  }

  console.log('Generating new AI summary...');
  const prompt = `Summarize these ${docType} changes as a Markdown bullet list. The changes are provided in a diff format, with lines prefixed by '+' for additions and '-' for removals. Header context is provided in [Context: ...] blocks. The diff contains HTML, so interpret it accordingly:\n\n${diffTextForAI}`;
  const aiResponse = await generateWithFallback(prompt, systemPrompt);
  
  const summaryLines = aiResponse
    .replace(/alert_admin\(\)/g, '')
    .trim()
    .split(/\r?\n/)
    .filter(line => Boolean(line) && !line.includes('[ADMIN]'))
    .map(l => `<p>${l}</p>`);

  data.changes[0].summary = summaryLines;
  await fs.writeFile(changesFile, JSON.stringify(data, null, 2));

  console.log('Successfully updated summary in changes.json.');
  const alertMessage = `
**Service:** ${cfg.service}
**Document:** [${docType}](${latestChange.url})
---
**AI Summary Re-generated:**
${summaryLines.map(p => p.replace(/<p>/g, '').replace(/<\/p>/g, '')).join('\n')}
  `;
  await sendDiscordAlert({
    title: `✅ AI Summary Updated: ${cfg.service} ${docType}`,
    message: alertMessage,
    level: 'SUCCESS'
  });
}

async function main() {
  const scriptDir = path.dirname(import.meta.url.substring(7));
  const systemPromptPath = path.resolve(scriptDir, 'system_prompt.txt');
  const systemPrompt = await fs.readFile(systemPromptPath, 'utf-8');
  
  await fs.mkdir('web/static/data', { recursive: true }).catch(() => {});
  
  console.log('Loading service configurations...');
  const cfgDir = path.resolve(scriptDir, '../service-config');
  const files = await fs.readdir(cfgDir);
  
  let allTasks = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const cfg = JSON.parse(await fs.readFile(path.join(cfgDir, f), 'utf-8'));
    if (!cfg.documents) continue;

    for (const docType in cfg.documents) {
      const docConfig = cfg.documents[docType];
      if (docConfig.url && docConfig.selector) {
        allTasks.push({
          cfg,
          docType,
          docConfig,
          docSlug: docType.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''),
        });
      }
    }
  }

  const patchIndex = process.argv.indexOf('--patch');
  if (patchIndex > -1) {
    const serviceArg = process.argv[patchIndex + 1];
    const docSlugArg = process.argv[patchIndex + 2];

    if (!serviceArg || !docSlugArg) {
      console.error('Usage: node scraper.js --patch <service-name> <document-slug>');
      process.exit(1);
    }

    console.log(`--patch specified. Running for single document: ${serviceArg} / ${docSlugArg}`);
    allTasks = allTasks.filter(task => 
      task.cfg.service.toLowerCase() === serviceArg.toLowerCase() && 
      task.docSlug === docSlugArg
    );

    if (allTasks.length === 0) {
      console.error(`Could not find a matching document for service "${serviceArg}" and slug "${docSlugArg}".`);
      process.exit(1);
    }
  }

  const diffOnly = process.argv.includes('--diff-only');
  if (diffOnly) {
    if (patchIndex < 0) {
      console.error('The --diff-only flag must be used with --patch to specify a document.');
      process.exit(1);
    }
    const systemPrompt = await fs.readFile(systemPromptPath, 'utf-8');
    await runDiffOnly(allTasks[0], systemPrompt);
    return;
  }

  const tasksByDomain = allTasks.reduce((acc, task) => {
    const domain = getDomain(task.docConfig.url);
    if (domain) {
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push(task);
    }
    return acc;
  }, {});
  
  console.log(`Found ${allTasks.length} documents to scrape across ${Object.keys(tasksByDomain).length} domains.`);

  let browser;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({ args: ['--no-sandbox'] });

    const processedFavicons = new Set();
    
    const domainPromises = Object.values(tasksByDomain).map(async (domainTasks) => {
      const page = await browser.newPage();
      const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      await page.setUserAgent(userAgent);
      
      console.log(`[Worker] Starting domain ${getDomain(domainTasks[0].docConfig.url)} with ${domainTasks.length} tasks.`);

      for (const task of domainTasks) {
        const serviceName = task.cfg.service;
        let shouldFetchFavicon = false;
        if (!processedFavicons.has(serviceName)) {
          const faviconDir = path.resolve(scriptDirForEnv, '../web/static/favicons');
          try {
            await fs.access(path.join(faviconDir, `${serviceName}.ico`));
            processedFavicons.add(serviceName);
          } catch {
            shouldFetchFavicon = true;
            processedFavicons.add(serviceName);
          }
        }
        
        await scrapeDocument(page, task.cfg, task.docType, task.docSlug, task.docConfig.url, task.docConfig.selector, systemPrompt, { fetchFavicon: shouldFetchFavicon });
        
        console.log(`Polite delay before next request to ${getDomain(task.docConfig.url)}...`);
        await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
      }
      
      await page.close();
    });

    await Promise.all(domainPromises);

  } catch (error) {
    console.error('Error in main execution:', error);
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
