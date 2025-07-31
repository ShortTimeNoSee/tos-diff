# Terms of Service Diff Tool

This project automatically scrapes the terms of service and other legal documents from various online services, detects changes, generates a summary using AI, and displays the differences on a web interface.

## Project Structure

- `/scraper`: Contains the Node.js scraping script, its dependencies, and service configurations.
- `/web`: Contains the SvelteKit front-end application.
- `/service-config`: JSON files defining the services and documents to scrape.

## Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd tos-diff
```

### 2. Install Dependencies

You need to install dependencies for both the scraper and the web front-end separately.

```bash
# Install scraper dependencies
npm --prefix scraper install

# Install web UI dependencies
npm --prefix web install
```

### 3. Configure API Keys and Webhook

The scraper requires API keys for AI services and a Discord webhook for alerts.

1. Navigate to the scraper directory:

   ```bash
   cd scraper
   ```

2. Create a new file named `.env`:

   ```bash
   touch .env
   ```

3. Add your keys and webhook URL to the `.env` file like this:

   ```env
   # Required for AI-powered summaries (Google Gemini)
   GEMINI_API_KEY="your_gemini_api_key"

   # Optional fallback AI (xAI Grok)
   XAI_API_KEY="your_xai_api_key"

   # Optional: for sending alerts to a Discord channel
   DISCORD_WEBHOOK_URL="your_discord_webhook_url"
   ```

## Usage

### Running the Scraper

All scraper commands should be run from the project's root directory.

#### Full Scrape

To scrape all documents for all configured services:

```bash
npm --prefix scraper start
```

This will iterate through every document defined in `/service-config`, check for changes, and update the data for the website.

#### Single Document Scrape (Patching)

To scrape a single, specific document, use the `--patch` flag. This is useful for debugging a specific service or re-running a failed scrape for one document without running the whole process.

**Format:**

```bash
node scraper/scraper.js --patch <service-name> <document-slug>
```

- `<service-name>`: The name of the service. For "DuckDuckGo", use `"DuckDuckGo"` (with quotes).
- `<document-slug>`: The URL-friendly identifier for the document. This is derived from the document title in the JSON config (e.g., "Privacy Policy" becomes "privacy-policy").

**Example:**

To re-scrape only the Privacy Policy for Facebook:

```bash
node scraper/scraper.js --patch facebook privacy-policy
```

#### Re-Running AI on Existing Changes

If you want to re-run the AI summary generation on the last detected change for a document without re-scraping the live page, use the `--diff-only` flag. This is useful for testing changes to the AI prompt or model.

This command **must** be combined with `--patch`. For some reason. Blame me.

**Format:**

```bash
node scraper/scraper.js --patch <service-name> <document-slug> --diff-only
```

**Example:**

```bash
node scraper/scraper.js --patch facebook privacy-policy --diff-only
```

### Testing Without AI

To test change detection logic without consuming AI API tokens, you can disable AI summaries.

1. Open `scraper/scraper.js`.
2. Change the `USE_AI` flag at the top of the file:

   ```javascript
   const USE_AI = false; // Set to false to disable AI summaries
   ```

### Viewing the Website

To run the local web server and view the results:

```bash
npm --prefix web run dev
```

This will start the SvelteKit development server, typically available at `http://localhost:5173`.
