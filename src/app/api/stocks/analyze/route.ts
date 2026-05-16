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

Return a JSON object with EXACTLY this structure (no other text, no markdown, no code fences):

{
  "ticker": "NSE ticker symbol",
  "companyName": "Full registered company name",
  "exchange": "NSE",
  "sector": "Sector classification",
  "movementAnalysis": {
    "socialNarrative": "What retail investors on X/Twitter, Reddit, TradingView community, Moneycontrol forums are saying. Mention specific themes, hashtags, or debates. Max 3 sentences.",
    "actualCatalyst": "The specific catalyst with EXACT numbers and dates. E.g., 'Q4 FY26 results announced on April 29, 2026 showed revenue of ₹51,524 Cr (+29% YoY), PAT of ₹9,352 Cr (+89% YoY)'. Be this specific.",
    "institutionalView": "Name specific brokerages with their exact target prices and dates. E.g., 'ICICI Direct on April 24, 2026 maintained HOLD with TP ₹308. Motilal Oswal has TP ₹857 as of May 7, 2026.' Be this specific.",
    "oneLinerSummary": "The stock is moving because [specific catalyst], but [the overlooked risk/factor nobody discusses] is the part nobody is talking about."
  },
  "fundamentalSnapshot": {
    "priceAndMarketCap": "₹XXX.XX | Market Cap: ₹X.XXL Cr | 30D: +XX.X%",
    "valuationMultiples": "Forward P/E: X.X (sector avg: Y.Y) | EV/Sales: X.X (sector avg: Y.Y). One-line interpretation of whether cheap/expensive vs peers.",
    "growthMetrics": "Q[X] FY[YY] Revenue: ₹XX,XXX Cr (+XX% YoY) | PAT: ₹X,XXX Cr (+XX% YoY). Key highlights: EBITDA margin, ARPU, subscriber count, or segment-specific metrics.",
    "balanceSheet": "Cash: ₹XX,XXX Cr | Debt: ₹XX,XXX Cr | Net Debt/Equity: X.X | Shares outstanding: XXX Cr (dilution: +X.X% YoY or flat)",
    "fairValueAssessment": "Show the math: 'Using FY27 EPS of ₹XX and a peer multiple of X.Xx gives fair value of ₹XXX. Current price of ₹XXX implies X% discount/premium.' One paragraph max."
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
    "trimLevels": "First trim at ₹XXX (+XX% from current), full exit at ₹XXX (+XX%)",
    "hardStop": "₹XXX (below this, [specific thesis-breaking reason])"
  }
}

CRITICAL RULES:
1. Every number must be sourced from actual web search results. Do not fabricate data.
2. Do NOT include a "sources" field in your JSON - sources are tracked automatically.
3. Cross-reference key numbers (price, market cap, P/E) across at least 2 sources.
4. For price targets, cite specific brokerage names and their published targets with dates.
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

    // ONLY use Gemini's grounding metadata for sources — these are REAL URLs
    // that Google actually searched. Never use AI-generated URLs (they hallucinate).
    const sources: Array<{ title: string; url: string; section: string }> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidate = response.candidates?.[0] as any;
    const groundingMetadata = candidate?.groundingMetadata;

    if (groundingMetadata?.groundingChunks) {
      const seen = new Set<string>();
      for (const chunk of groundingMetadata.groundingChunks) {
        const web = chunk.web;
        if (web?.uri && !seen.has(web.uri)) {
          seen.add(web.uri);

          // Categorize based on the page title (more reliable than proxy URL)
          const title = (web.title || "").toLowerCase();
          let section = "general";

          if (
            title.includes("target") ||
            title.includes("forecast") ||
            title.includes("analyst") ||
            title.includes("brokerage") ||
            title.includes("research report") ||
            title.includes("price prediction") ||
            title.includes("trendlyne")
          ) {
            section = "priceTargets";
          } else if (
            title.includes("financial") ||
            title.includes("balance sheet") ||
            title.includes("quarterly") ||
            title.includes("result") ||
            title.includes("revenue") ||
            title.includes("screener") ||
            title.includes("share price") ||
            title.includes("market cap") ||
            title.includes("p/e") ||
            title.includes("ratio")
          ) {
            section = "fundamentals";
          } else if (
            title.includes("news") ||
            title.includes("catalyst") ||
            title.includes("announce") ||
            title.includes("deal") ||
            title.includes("contract") ||
            title.includes("upgrade") ||
            title.includes("downgrade") ||
            title.includes("investor") ||
            title.includes("sentiment") ||
            title.includes("social")
          ) {
            section = "movement";
          }

          sources.push({
            title: web.title || "Source",
            url: web.uri,
            section,
          });
        }
      }
    }

    // Group sources by section for per-section display
    const movementSources = sources.filter((s) => s.section === "movement");
    const fundamentalSources = sources.filter((s) => s.section === "fundamentals");
    const priceSources = sources.filter((s) => s.section === "priceTargets");
    const generalSources = sources.filter((s) => s.section === "general");

    // Distribute general sources to the section with fewest sources
    for (const gs of generalSources) {
      const counts = [
        { arr: movementSources, label: "movement" },
        { arr: fundamentalSources, label: "fundamentals" },
        { arr: priceSources, label: "priceTargets" },
      ];
      counts.sort((a, b) => a.arr.length - b.arr.length);
      gs.section = counts[0].label;
      counts[0].arr.push(gs);
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
      sources,
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
