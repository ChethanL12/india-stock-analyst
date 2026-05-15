# India Stock Analyst

AI-powered institutional-grade equity research for Indian stocks (NSE/BSE).

Enter any stock ticker or company name and get a comprehensive analyst report with:
- **Movement Analysis** — social sentiment, actual catalyst, institutional views
- **Fundamental Snapshot** — price, valuations, growth, balance sheet, fair value math
- **Price Target Framework** — 4 scenarios (Bear/Base/Bull/Stretched Bull) with entry/trim/stop levels
- **Sources** — all web pages consulted during analysis

## Tech Stack

- **Next.js 15** (App Router)
- **React 19** + TypeScript
- **Tailwind CSS 3** (dark theme)
- **OpenAI Responses API** with `web_search_preview` tool
- **LocalStorage** for caching recent analyses (no database needed)

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/india-stock-analyst.git
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Add environment variable:
   - `OPENAI_API_KEY` = your OpenAI API key
4. Click **Deploy**

### 3. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✅ | Your OpenAI API key ([get one here](https://platform.openai.com/api-keys)) |
| `OPENAI_MODEL` | ❌ | Model to use (default: `gpt-4o`) |

## Run Locally

```bash
npm install
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

1. User enters a stock ticker (e.g., RELIANCE, INFY, TATAMOTORS)
2. Backend calls OpenAI Responses API with `web_search_preview` tool
3. AI searches NSE/BSE, Screener.in, Trendlyne, Moneycontrol, brokerage reports, etc.
4. Returns structured JSON with analysis + source citations
5. Frontend displays the report in a professional dark-themed dashboard

## Notes

- Analysis takes **15-30 seconds** (AI needs to search the web)
- Vercel function timeout is set to 60s in `vercel.json`
- Recent analyses are stored in browser localStorage (clears if you clear browser data)
- No database required — fully serverless
