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

Return a JSON object with EXACTLY this structure. For EVERY data field, also include a corresponding "_source" field stating the exact website name you got that data from:

{
  "ticker": "NSE ticker symbol",
  "companyName": "Full registered company name",
  "exchange": "NSE",
  "sector": "Sector classification",
  "movementAnalysis": {
    "socialNarrative": "What retail investors on X/Twitter, Reddit, TradingView community, Moneycontrol forums are saying. Mention specific themes, hashtags, or debates. Max 3 sentences.",
    "socialNarrativeSource": "e.g. X/Twitter, Reddit r/IndianStockMarket, TradingView",
    "actualCatalyst": "The specific catalyst with EXACT numbers and dates. Be very specific with earnings numbers, dates, percentages.",
    "actualCatalystSource": "e.g. BSE Filing dated April 29 2026, Moneycontrol Quarterly Results",
    "institutionalView": "Name specific brokerages with their exact target prices and dates.",
    "institutionalViewSource": "e.g. Trendlyne Forecaster, ICICI Direct Research, Motilal Oswal Report",
    "oneLinerSummary": "The stock is moving because [specific catalyst], but [the overlooked risk] is the part nobody is talking about."
  },
  "fundamentalSnapshot": {
    "priceAndMarketCap": "₹XXX.XX | Market Cap: ₹X.XXL Cr | 30D: +XX.X%",
    "priceAndMarketCapSource": "e.g. NSE India, Google Finance",
    "valuationMultiples": "Forward P/E: X.X (sector avg: Y.Y) | EV/Sales: X.X (sector avg: Y.Y). One-line interpretation.",
    "valuationMultiplesSource": "e.g. Screener.in Peer Comparison, Trendlyne",
    "growthMetrics": "Q[X] FY[YY] Revenue: ₹XX,XXX Cr (+XX% YoY) | PAT: ₹X,XXX Cr (+XX% YoY). Key highlights.",
    "growthMetricsSource": "e.g. Screener.in Quarterly Results, BSE Filing",
    "balanceSheet": "Cash: ₹XX,XXX Cr | Debt: ₹XX,XXX Cr | Net Debt/Equity: X.X | Shares outstanding: XXX Cr",
    "balanceSheetSource": "e.g. Screener.in Balance Sheet, Moneycontrol Financials",
    "fairValueAssessment": "Show the math: 'Using FY27 EPS of ₹XX and a peer multiple of X.Xx gives fair value of ₹XXX.'",
    "fairValueAssessmentSource": "e.g. Screener.in, Trendlyne Forecaster, Alpha Spread"
  },
  "priceTargetFramework": {
    "scenarios": [
      {
        "label": "Bear Case",
        "timeframe": "3-6 months",
        "price": "₹XXX",
        "rationale": "If [negative catalyst]. Math: X.Xx EPS of ₹XX = ₹XXX",
        "source": "e.g. Own calculation based on Screener.in EPS data"
      },
      {
        "label": "Base Case",
        "timeframe": "6-12 months",
        "price": "₹XXX",
        "rationale": "If execution holds. Math: X.Xx EPS of ₹XX = ₹XXX.",
        "source": "e.g. Trendlyne consensus, ICICI Direct TP"
      },
      {
        "label": "Bull Case",
        "timeframe": "12-18 months",
        "price": "₹XXX",
        "rationale": "If [positive catalysts]. Math: X.Xx EPS of ₹XX = ₹XXX",
        "source": "e.g. Motilal Oswal bull case, own calculation"
      },
      {
        "label": "Stretched Bull",
        "timeframe": "24 months",
        "price": "₹XXX",
        "rationale": "All catalysts firing. Math: X.Xx EPS of ₹XX = ₹XXX",
        "source": "e.g. Own projection from Screener.in growth data"
      }
    ],
    "entryZone": "₹XXX - ₹XXX (cite technical support level or brokerage accumulation zone)",
    "entryZoneSource": "e.g. TradingView support levels, Trendlyne",
    "trimLevels": "First trim at ₹XXX (+XX%), full exit at ₹XXX (+XX%)",
    "trimLevelsSource": "e.g. Trendlyne consensus TP, resistance levels",
    "hardStop": "₹XXX (below this, [specific thesis-breaking reason])",
    "hardStopSource": "e.g. 52-week low from NSE, key support from TradingView"
  }
}

CRITICAL RULES:
1. Every number must come from actual web search results. Do not fabricate.
2. The "_source" and "source" fields must name the ACTUAL website/report you got each data point from. Be specific (e.g. "Screener.in Balance Sheet" not just "various sources").
3. Do NOT include URLs in source fields — just the website/report name.
4. Cross-reference key numbers across at least 2 sources.
5. Use ₹ symbol for all Rupee amounts.

Return ONLY the JSON. No markdown. No code fences. No explanation.`;

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

    // Extract grounding metadata sources (real clickable URLs)
    const groundingSources: Array<{ title: string; url: string; section: string }> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidate = response.candidates?.[0] as any;
    const groundingMetadata = candidate?.groundingMetadata;

    if (groundingMetadata?.groundingChunks) {
      const seen = new Set<string>();
      for (const chunk of groundingMetadata.groundingChunks) {
        const web = chunk.web;
        if (web?.uri && !seen.has(web.uri)) {
          seen.add(web.uri);
          const title = (web.title || "").toLowerCase();
          let section = "general";
          if (title.includes("target") || title.includes("forecast") || title.includes("analyst") || title.includes("brokerage") || title.includes("trendlyne")) {
            section = "priceTargets";
          } else if (title.includes("financial") || title.includes("balance") || title.includes("quarterly") || title.includes("result") || title.includes("revenue") || title.includes("screener") || title.includes("share price") || title.includes("ratio")) {
            section = "fundamentals";
          } else if (title.includes("news") || title.includes("announce") || title.includes("deal") || title.includes("upgrade") || title.includes("downgrade") || title.includes("sentiment")) {
            section = "movement";
          }
          groundingSources.push({ title: web.title || "Source", url: web.uri, section });
        }
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
      sources: groundingSources,
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
