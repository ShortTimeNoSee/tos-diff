# ToS Diff Scraper

This scraper monitors legal document changes and uses AI to summarize them.

## Environment Setup

Create a `.env` file in the scraper directory with the following variables:

```env
# xAI Grok API Key (fallback)
XAI_API_KEY=your_xai_api_key_here

# Google Gemini API Key (primary)
GEMINI_API_KEY=your_gemini_api_key_here

# Discord Webhook URL (optional, for admin alerts)
DISCORD_WEBHOOK_URL=your_discord_webhook_url_here
```

## AI Provider Fallback

The scraper uses a fallback system:
1. **Primary**: Google Gemini 2.5 Flash (cost-efficient, reasoning enabled)
2. **Fallback**: xAI Grok 3 Mini (if Gemini fails)

Both use the same system prompt for consistent analysis.

## Usage

```bash
npm run start
```

The scraper will:
- Monitor configured services for document changes
- Use AI to summarize detected changes
- Save source HTML for verification
- Generate diff views with escaped HTML 