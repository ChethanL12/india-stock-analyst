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

Return a JSON object with EXACTLY this structure (no other text, no markdown, no code fences):

{
  "ticker": "NSE ticker symbol",
  "companyName": "Full registered company name",
  "exchange": "NSE",
  "sector": "Sector classification",
  "movementAnalysis": {
    "socialNarrative": "What retail investors on X/Twitter, Reddit, TradingView community, Moneycontrol forums are saying. Mention specific themes, hashtags, or debates. Max 3 sentences.",
    "actualCatalyst": "The specific catalyst with EXACT numbers and dates. Be very specific with earnings numbers, dates, percentages.",
    "institutionalView": "Name specific brokerages with their exact target prices and dates.",
    "oneLinerSummary": "The stock is moving because [specific catalyst], but [the overlooked risk] is the part nobody is talking about."
  },
  "fundamentalSnapshot": {
    "priceAndMarketCap": "₹XXX.XX | Market Cap: ₹X.XXL Cr | 30D: +XX.X%",
    "valuationMultiples": "Forward P/E: X.X (sector avg: Y.Y) | EV/Sales: X.X (sector avg: Y.Y). One-line interpretation.",
    "growthMetrics": "Q[X] FY[YY] Revenue: ₹XX,XXX Cr (+XX% YoY) | PAT: ₹X,XXX Cr (+XX% YoY). Key highlights.",
    "balanceSheet": "Cash: ₹XX,XXX Cr | Debt: ₹XX,XXX Cr | Net Debt/Equity: X.X | Shares outstanding: XXX Cr",
    "fairValueAssessment": "Show the math: 'Using FY27 EPS of ₹XX and a peer multiple of X.Xx gives fair value of ₹XXX.'"
  },
  "priceTargetFramework": {
    "scenarios": [
      {
        "label": "Bear Case",
        "timeframe": "3-6 months",
        "price": "₹XXX",
        "rationale": "If [negative catalyst]. Math: X.Xx EPS of ₹XX = ₹XXX"
      },
      {
        "label": "Base Case",
        "timeframe": "6-12 months",
        "price": "₹XXX",
        "rationale": "If execution holds. Math shown. Aligned with [brokerage] target."
      },
      {
        "label": "Bull Case",
        "timeframe": "12-18 months",
        "price": "₹XXX",
        "rationale": "If [positive catalysts]. Math: X.Xx EPS of ₹XX = ₹XXX"
      },
      {
        "label": "Stretched Bull",
        "timeframe": "24 months",
        "price": "₹XXX",
        "rationale": "All catalysts firing. Math: X.Xx EPS of ₹XX = ₹XXX"
      }
    ],
    "entryZone": "₹XXX - ₹XXX (cite technical support level or brokerage zone)",
    "trimLevels": "First trim at ₹XXX (+XX%), full exit at ₹XXX (+XX%)",
    "hardStop": "₹XXX (below this, [specific thesis-breaking reason])"
  }
}

CRITICAL RULES:
1. Every number must come from actual web search results. Do not fabricate.
2. Cross-reference key numbers across at least 2 sources.
3. For price targets, cite specific brokerage names and their published targets with dates.
4. Use ₹ symbol for all Rupee amounts.
5. Do NOT include source URLs or source fields in your JSON.

Return ONLY the JSON. No markdown. No code fences. No explanation.`;

// Keywords to match grounding chunks to specific fields
const FIELD_KEYWORDS: Record<string, string[]> = {
  socialNarrative: ["forum", "twitter", "reddit", "social", "sentiment", "retail", "community", "discussion"],
  actualCatalyst: ["news", "announce", "earning", "result", "quarter", "catalyst", "deal", "contract", "merger", "demerger", "split", "fpo", "ipo"],
  institutionalView: ["target", "analyst", "broker", "upgrade", "downgrade", "research", "forecast", "consensus", "rating", "trendlyne"],
  priceAndMarketCap: ["share price", "stock price", "market cap", "nse", "bse", "google finance", "live price"],
  valuationMultiples: ["valuation", "p/e", "pe ratio", "ev/sales", "multiple", "peer", "comparison", "screener"],
  growthMetrics: ["quarterly", "q1", "q2", "q3", "q4", "revenue", "profit", "pat", "ebitda", "financial result"],
  balanceSheet: ["balance sheet", "debt", "cash", "equity", "financial", "standalone", "consolidated"],
  fairValueAssessment: ["fair value", "dcf", "intrinsic", "overvalued", "undervalued", "alpha spread", "valuation"],
  priceTargets: ["target price", "price target", "forecast", "bull", "bear", "analyst", "brokerage", "trendlyne", "consensus"],
  entryZone: ["support", "technical", "chart", "level", "tradingview", "entry"],
  hardStop: ["52-week", "low", "stop loss", "breakdown", "support"],
};

interface GroundingSource {
  title: string;
  url: string;
}

function matchSourcesToField(
  fieldKey: string,
  allSources: GroundingSource[]
): GroundingSource[] {
  const keywords = FIELD_KEYWORDS[fieldKey] || [];
  if (keywords.length === 0 || allSources.length === 0) return [];

  const matched: GroundingSource[] = [];
  for (const source of allSources) {
    const titleLower = source.title.toLowerCase();
    for (const kw of keywords) {
      if (titleLower.includes(kw)) {
        matched.push(source);
        break;
      }
    }
  }
  return matched.slice(0, 3); // max 3 per field
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

    // Extract grounding sources (REAL URLs from Google's actual search)
    const allGroundingSources: GroundingSource[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidate = response.candidates?.[0] as any;
    const groundingMetadata = candidate?.groundingMetadata;

    if (groundingMetadata?.groundingChunks) {
      const seen = new Set<string>();
      for (const chunk of groundingMetadata.groundingChunks) {
        const web = chunk.web;
        if (web?.uri && !seen.has(web.uri)) {
          seen.add(web.uri);
          allGroundingSources.push({
            title: web.title || "Source",
            url: web.uri,
          });
        }
      }
    }

    // Match sources to each field
    const fieldSources: Record<string, GroundingSource[]> = {
      socialNarrative: matchSourcesToField("socialNarrative", allGroundingSources),
      actualCatalyst: matchSourcesToField("actualCatalyst", allGroundingSources),
      institutionalView: matchSourcesToField("institutionalView", allGroundingSources),
      priceAndMarketCap: matchSourcesToField("priceAndMarketCap", allGroundingSources),
      valuationMultiples: matchSourcesToField("valuationMultiples", allGroundingSources),
      growthMetrics: matchSourcesToField("growthMetrics", allGroundingSources),
      balanceSheet: matchSourcesToField("balanceSheet", allGroundingSources),
      fairValueAssessment: matchSourcesToField("fairValueAssessment", allGroundingSources),
      priceTargets: matchSourcesToField("priceTargets", allGroundingSources),
      entryZone: matchSourcesToField("entryZone", allGroundingSources),
      hardStop: matchSourcesToField("hardStop", allGroundingSources),
    };

    // Any unmatched sources go to a general pool
    const matchedUrls = new Set(
      Object.values(fieldSources).flatMap((arr) => arr.map((s) => s.url))
    );
    const unmatchedSources = allGroundingSources.filter(
      (s) => !matchedUrls.has(s.url)
    );
    // Distribute unmatched to fields with no sources
    const emptyFields = Object.entries(fieldSources)
      .filter(([, arr]) => arr.length === 0)
      .map(([key]) => key);
    let unmIdx = 0;
    for (const field of emptyFields) {
      if (unmIdx < unmatchedSources.length) {
        fieldSources[field].push(unmatchedSources[unmIdx]);
        unmIdx++;
      }
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return NextResponse.json({
      id,
      ticker: analysisData.ticker || query.trim().toUpperCase(),
      companyName: analysisData.companyName || query.trim(),
      exchange: analysisData.exchange || "NSE",
      sector: analysisData.sector || "Unknown",
      movementAnalysis: analysisData.movementAnalysis ?? {},
      fundamentalSnapshot: analysisData.fundamentalSnapshot ?? {},
      priceTargetFramework: analysisData.priceTargetFramework ?? {},
      sources: allGroundingSources,
      fieldSources,
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
