import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import puppeteer from 'puppeteer';
import sanitizeHtml from 'sanitize-html';
import { diffLines } from 'diff';
import OpenAI from 'openai';
import dotenv from 'dotenv';

const scriptDirForEnv = path.dirname(import.meta.url.substring(7));
dotenv.config({ path: path.resolve(scriptDirForEnv, '.env') });

const xai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1'
});

const FAILURES_LOG = 'scraper/failures.log';
const AI_RETRIES = 3;

async function alertAdmin(details) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const message = `
**Admin Alert**
**Service:** ${details.service}
**Document:** ${details.docType}
---
**Raw AI Response:**
\`\`\`
${details.rawResponse}
\`\`\`
  `;

  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      });
      console.log(`Admin alert sent for ${details.service} ${details.docType}`);
    } catch (error) {
      console.error('Failed to send Discord alert:', error.message);
      const logMessage = `${new Date().toISOString()} - DISCORD_ALERT_FAILED: ${JSON.stringify(details)}\n`;
      await fs.appendFile(FAILURES_LOG, logMessage);
    }
  } else {
    console.warn(`Admin alert triggered for ${details.service} ${details.docType}, but no DISCORD_WEBHOOK_URL is set. Logging to failures.log.`);
    const logMessage = `${new Date().toISOString()} - ADMIN_ALERT: ${JSON.stringify(details)}\n`;
    await fs.appendFile(FAILURES_LOG, logMessage);
  }
}

function getRandomDelay() {
  return Math.floor(Math.random() * 6000) + 2000;
}

async function scrapeDocument(page, cfg, docType, docSlug, url, selector, systemPrompt) {
  try {
    console.log(`Scraping ${cfg.service} ${docType}...`);
    
    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    } catch (error) {
      console.warn(`Failed to navigate to ${url} for ${cfg.service} ${docType}:`, error.message);
      return;
    }

    let raw;
    try {
      raw = await page.$eval(selector, el => el.innerHTML);
    } catch (error) {
      console.warn(`Selector "${selector}" not found for ${cfg.service} ${docType}:`, error.message);
      return;
    }

    const sourceHash = createHash('sha256').update(raw).digest('hex');

    const clean = sanitizeHtml(raw, {
      allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'b', 'i', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'br', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
      ],
      allowedAttributes: {
        'a': ['href', 'target', 'rel']
      }
    });

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
    
    const diff = diffLines(prev, clean);

    const significantDiff = diff.filter(part => {
        return part.added || part.removed || part.value.trim().length > 0;
    });

    if (!significantDiff.some(part => part.added || part.removed)) {
        console.log(`No significant changes detected (whitespace only) for ${cfg.service} ${docType}`);
        return;
    }
    
    const diffText = significantDiff
      .filter(p => p.added || p.removed)
      .map(p => {
        const prefix = p.added ? '+' : '-';
        return p.value.split(/\r?\n/).map(line => `${prefix} ${line}`).join('\n');
      })
      .join('');
    
    const diffHtml = significantDiff.map(part => {
      const className = part.added ? 'added' : part.removed ? 'removed' : '';
      const escapedValue = part.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (className) {
        return `<div class="${className}">${escapedValue}</div>`;
      }
      return `<div>${escapedValue}</div>`;
    }).join('');

    const prompt = `Summarize these ${docType} changes as a Markdown bullet list. The changes are provided in a diff format, with lines prefixed by '+' for additions and '-' for removals. The diff contains HTML, so interpret it accordingly:\n\n${diffText}`;
    
    let completion;
    let lastError = null;

    for (let i = 0; i < AI_RETRIES; i++) {
      try {
        completion = await xai.chat.completions.create({
          model: 'grok-3-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          reasoning_effort: 'high'
        });
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
      const logMessage = `${new Date().toISOString()} - SERVICE: ${cfg.service}, TYPE: ${docType}, ERROR: ${lastError.message}\n`;
      await fs.appendFile(FAILURES_LOG, logMessage);
      
      console.warn(`AI summary failed for ${cfg.service} ${docType} after ${AI_RETRIES} attempts. Logged to ${FAILURES_LOG}.`);
      const outDir = path.resolve(scriptDirForEnv, '../web/static/data', cfg.service.toLowerCase(), docSlug);
      await fs.mkdir(outDir, { recursive: true });
      const changesFile = path.join(outDir, 'changes.json');
      
      let data = { schemaVersion: 2, changes: [] };
      try {
        const fileContent = await fs.readFile(changesFile, 'utf-8');
        const existingData = JSON.parse(fileContent);
        if (Array.isArray(existingData)) {
          data.changes = existingData;
        } else {
          data = existingData;
        }
      } catch {}
      
      data.changes.unshift({
        timestamp: new Date().toISOString(),
        type: docType,
        summary: ['<p>Changes detected but AI summary failed</p>'],
        diffHtml
      });
      await fs.writeFile(changesFile, JSON.stringify(data, null, 2));
      return;
    }
    
    const aiResponse = completion.choices[0].message.content;

    if (aiResponse.includes('alert_admin()')) {
      await alertAdmin({
        service: cfg.service,
        docType: docType,
        rawResponse: aiResponse
      });
    }

    const summaryLines = aiResponse
      .replace(/alert_admin\(\)/g, '')
      .trim()
      .split(/\r?\n/)
      .filter(line => Boolean(line) && !line.includes('[ADMIN]'))
      .map(l => `<p>${l}</p>`);

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

  } catch (error) {
    console.error(`Unexpected error processing ${cfg.service} ${docType}:`, error.message);
  }
}

async function scrapeService(page, cfg, systemPrompt) {
  if (!cfg.documents) return;

  const docTypes = Object.keys(cfg.documents);
  for (let i = 0; i < docTypes.length; i++) {
    const docType = docTypes[i];
    const docConfig = cfg.documents[docType];
    if (docConfig.url && docConfig.selector) {
      const docSlug = docType.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
      await scrapeDocument(page, cfg, docType, docSlug, docConfig.url, docConfig.selector, systemPrompt);
    }
    
    if (i < docTypes.length - 1) {
      const delay = getRandomDelay();
      console.log(`Waiting ${delay / 1000}s before next scrape...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function main() {
  const scriptDir = path.dirname(import.meta.url.substring(7));
  const systemPromptPath = path.resolve(scriptDir, 'system_prompt.txt');
  const systemPrompt = await fs.readFile(systemPromptPath, 'utf-8');
  
  await fs.mkdir('web/static/data', { recursive: true });
  
  let browser;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    
    const cfgDir = path.resolve(scriptDir, '../service-config');
    const files = await fs.readdir(cfgDir);
    
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      
      const cfg = JSON.parse(await fs.readFile(path.join(cfgDir, f), 'utf-8'));
      
      const page = await browser.newPage();
      try {
        await scrapeService(page, cfg, systemPrompt);
      } finally {
        await page.close();
      }
    }
  } catch (error) {
    console.error('Error in main:', error);
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
