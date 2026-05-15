import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a senior equity research analyst at a top-tier investment bank, specializing in Indian stock markets (NSE/BSE).
You produce institutional-quality research notes with specific numbers, exact dates, and precise data points sourced from financial databases.
You NEVER guess or approximate. Every number you cite must come from a real, verifiable source.
You cross-reference data across multiple sources before including it.
You format your responses as valid JSON only - no markdown, no code fences, no explanation outside the JSON.
Always use the ₹ symbol for Indian Rupee amounts.`;

const buildAnalysisPrompt = (query: string) => `
Analyze the Indian stock: "${query}"

Search the web thoroughly using these specific sources:
- NSE India (nseindia.com) and BSE India (bseindia.com) for official filings and price data
- Screener.in for financial statements, ratios, and peer comparison
- Trendlyne.com for analyst consensus targets, brokerage reports, and technical data
- Moneycontrol.com for quarterly results, balance sheet, and analyst recommendations
- Economic Times, Livemint, Business Standard for recent news and catalysts
- TradingView for technical levels and chart data
- Company investor relations page for latest presentations

Return a JSON object with EXACTLY this structure. For EACH section, provide the specific sources you used for that section's data:

{
  "ticker": "NSE ticker symbol",
  "companyName": "Full registered company name",
  "exchange": "NSE",
  "sector": "Sector classification",
  "movementAnalysis": {
    "socialNarrative": "What retail investors on X/Twitter, Reddit, TradingView community, Moneycontrol forums are saying. Mention specific themes, hashtags, or debates. Max 3 sentences.",
    "actualCatalyst": "The specific catalyst with EXACT numbers and dates. E.g., 'Q4 FY26 results announced on April 29, 2026 showed revenue of ₹51,524 Cr (+29% YoY), PAT of ₹9,352 Cr (+89% YoY)'. Be this specific.",
    "institutionalView": "Name specific brokerages with their exact target prices and dates. E.g., 'ICICI Direct on April 24, 2026 maintained HOLD with TP ₹308. Motilal Oswal has TP ₹857 as of May 7, 2026.' Be this specific.",
    "oneLinerSummary": "The stock is moving because [specific catalyst], but [the overlooked risk/factor nobody discusses] is the part nobody is talking about.",
    "sources": [
      {"title": "Exact article/page title", "url": "https://real-source-url.com/specific-page"}
    ]
  },
  "fundamentalSnapshot": {
    "priceAndMarketCap": "₹XXX.XX | Market Cap: ₹X.XXL Cr | 30D: +XX.X%",
    "valuationMultiples": "Forward P/E: X.X (sector avg: Y.Y) | EV/Sales: X.X (sector avg: Y.Y). One-line interpretation of whether cheap/expensive vs peers.",
    "growthMetrics": "Q[X] FY[YY] Revenue: ₹XX,XXX Cr (+XX% YoY) | PAT: ₹X,XXX Cr (+XX% YoY). Key highlights: EBITDA margin, ARPU, subscriber count, or segment-specific metrics.",
    "balanceSheet": "Cash: ₹XX,XXX Cr | Debt: ₹XX,XXX Cr | Net Debt/Equity: X.X | Shares outstanding: XXX Cr (dilution: +X.X% YoY or flat)",
    "fairValueAssessment": "Show the math: 'Using FY27 EPS of ₹XX and a peer multiple of X.Xx gives fair value of ₹XXX. Current price of ₹XXX implies X% discount/premium.' One paragraph max.",
    "sources": [
      {"title": "Exact page title from Screener/NSE/Moneycontrol", "url": "https://real-url.com/page"}
    ]
  },
  "priceTargetFramework": {
    "scenarios": [
      {
        "label": "Bear Case",
        "timeframe": "3-6 months",
        "price": "₹XXX",
        "rationale": "If [specific negative catalyst]. Math: X.Xx EPS of ₹XX = ₹XXX"
      },
      {
        "label": "Base Case",
        "timeframe": "6-12 months",
        "price": "₹XXX",
        "rationale": "If execution holds. Math: X.Xx EPS of ₹XX = ₹XXX. Aligned with [brokerage] fair value of ₹XXX."
      },
      {
        "label": "Bull Case",
        "timeframe": "12-18 months",
        "price": "₹XXX",
        "rationale": "If [specific positive catalysts]. Math: X.Xx EPS of ₹XX = ₹XXX"
      },
      {
        "label": "Stretched Bull",
        "timeframe": "24 months",
        "price": "₹XXX",
        "rationale": "All catalysts firing. Math: X.Xx EPS of ₹XX = ₹XXX"
      }
    ],
    "entryZone": "₹XXX - ₹XXX (cite technical support level or brokerage accumulation zone)",
    "trimLevels": "First trim at ₹XXX (+XX% from ₹XXX), full exit at ₹XXX (+XX% from ₹XXX)",
    "hardStop": "₹XXX (below this, [specific thesis-breaking reason])",
    "sources": [
      {"title": "Brokerage report or analyst page title", "url": "https://trendlyne.com/or/moneycontrol/page"}
    ]
  }
}

CRITICAL RULES:
1. Every number must be sourced from actual web search results. Do not fabricate data.
2. Each section has its own "sources" array. List 2-4 REAL source URLs per section.
3. Source URLs must be actual website URLs (screener.in, trendlyne.com, moneycontrol.com, nseindia.com, etc.)
4. NEVER use Google proxy URLs (vertexaisearch.cloud.google.com). Only real source URLs.
5. Cross-reference key numbers (price, market cap, P/E) across at least 2 sources.
6. For price targets, cite specific brokerage names and their published targets with dates.
7. Use ₹ symbol for all Rupee amounts.

Return ONLY the JSON. No markdown. No code fences. No explanation.`;

interface SourceItem {
  title: string;
  url: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = body?.query;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ googleSearch: {} } as any],
    });

    const result = await model.generateContent(buildAnalysisPrompt(query.trim()));
    const response = result.response;
    const outputText = response.text();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let analysisData: Record<string, any>;
    try {
      let cleanText = outputText.trim();
      cleanText = cleanText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      analysisData = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", outputText.slice(0, 500), parseErr);
      return NextResponse.json(
        { error: "Failed to parse AI analysis response. Please try again." },
        { status: 500 }
      );
    }

    // Clean sources - filter out proxy URLs
    const cleanSources = (sources: SourceItem[] | undefined): SourceItem[] => {
      if (!Array.isArray(sources)) return [];
      return sources.filter(
        (s) => s.url && s.url.startsWith("http") && !s.url.includes("vertexaisearch")
      );
    };

    // Extract per-section sources
    const movementSources = cleanSources(analysisData.movementAnalysis?.sources);
    const fundamentalSources = cleanSources(analysisData.fundamentalSnapshot?.sources);
    const priceSources = cleanSources(analysisData.priceTargetFramework?.sources);

    // Build all sources list (for backward compat)
    const allSources = [
      ...movementSources.map((s: SourceItem) => ({ ...s, section: "movement" })),
      ...fundamentalSources.map((s: SourceItem) => ({ ...s, section: "fundamentals" })),
      ...priceSources.map((s: SourceItem) => ({ ...s, section: "priceTargets" })),
    ];

    // Remove sources from nested objects before sending (they'll be top-level)
    const movementAnalysis = { ...analysisData.movementAnalysis };
    delete movementAnalysis.sources;
    const fundamentalSnapshot = { ...analysisData.fundamentalSnapshot };
    delete fundamentalSnapshot.sources;
    const priceTargetFramework = { ...analysisData.priceTargetFramework };
    delete priceTargetFramework.sources;

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return NextResponse.json({
      id,
      ticker: analysisData.ticker || query.trim().toUpperCase(),
      companyName: analysisData.companyName || query.trim(),
      exchange: analysisData.exchange || "NSE",
      sector: analysisData.sector || "Unknown",
      movementAnalysis,
      fundamentalSnapshot,
      priceTargetFramework,
      sources: allSources,
      movementSources,
      fundamentalSources,
      priceSources,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error analyzing stock:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to analyze stock: ${message}` },
      { status: 500 }
    );
  }
}
