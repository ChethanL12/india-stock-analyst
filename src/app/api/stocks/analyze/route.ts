import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a senior equity research analyst specializing in Indian stock markets (NSE/BSE). 
You have deep expertise in fundamental analysis, technical analysis, market sentiment, and institutional flows.
You always provide specific numbers, dates, and data points. You never give vague answers.
You format your responses as valid JSON only - no markdown, no code fences, no explanation outside the JSON.`;

const buildAnalysisPrompt = (query: string) => `
Analyze the Indian stock: "${query}"

Search the web for the most current and accurate information from sources like NSE/BSE official data, 
Screener.in, Trendlyne, Moneycontrol, Economic Times Markets, Livemint, TradingView India, Zerodha Pulse, 
and recent brokerage research reports.

Return a JSON object with EXACTLY this structure (no other text, no markdown, no code fences):

{
  "ticker": "NSE ticker symbol (e.g., RELIANCE, INFY, TCS)",
  "companyName": "Full company name",
  "exchange": "NSE or BSE",
  "sector": "Sector name",
  "movementAnalysis": {
    "socialNarrative": "What retail investors on X/Twitter/Reddit/financial forums are saying about this stock. What hashtags, themes, or memes are circulating? Under 3 sentences.",
    "actualCatalyst": "The specific real catalyst driving the move - earnings date/numbers, contract win value, partnership details, policy change, management change etc. Be specific with exact numbers, percentages, and dates. Under 3 sentences.",
    "institutionalView": "What professional analysts are saying. Include specific brokerage names, recent target price changes, upgrades/downgrades with dates. Under 3 sentences.",
    "oneLinerSummary": "The stock is moving because [specific reason], but [the overlooked factor nobody is talking about] is the part nobody is talking about."
  },
  "fundamentalSnapshot": {
    "priceAndMarketCap": "Current price in INR, market cap in Cr/Lakh Cr, 30-day % change. E.g.: Rs.2,456 | Market Cap: Rs.16.5L Cr | 30D: +12.4%",
    "valuationMultiples": "Forward P/E: X.X (sector avg: Y.Y) | EV/Sales: X.X (sector avg: Y.Y). Include a one-line interpretation.",
    "growthMetrics": "Q[X] FY[YY] Revenue: Rs.X,XXX Cr (+XX% YoY) | PAT: Rs.XXX Cr (+XX% YoY). Include any key highlights.",
    "balanceSheet": "Cash: Rs.X,XXX Cr | Debt: Rs.X,XXX Cr | Net Debt/Equity: X.X | Shares outstanding: X.X Cr (dilution: +X% YoY or flat)",
    "fairValueAssessment": "Is the stock trading above, at, or below fundamental fair value? Show the math using DCF or peer multiple approach. Max 1 paragraph."
  },
  "priceTargetFramework": {
    "scenarios": [
      {
        "label": "Bear Case",
        "timeframe": "3-6 months",
        "price": "Rs.X,XXX",
        "rationale": "Specific bear scenario. Math: X.X x Rs.XX EPS = Rs.X,XXX"
      },
      {
        "label": "Base Case",
        "timeframe": "6-12 months",
        "price": "Rs.X,XXX",
        "rationale": "Specific base scenario with execution assumptions. Math shown."
      },
      {
        "label": "Bull Case",
        "timeframe": "12-18 months",
        "price": "Rs.X,XXX",
        "rationale": "Specific bull scenario. What needs to work. Math shown."
      },
      {
        "label": "Stretched Bull",
        "timeframe": "24 months",
        "price": "Rs.X,XXX",
        "rationale": "Absolute ceiling scenario. All catalysts firing. Math shown."
      }
    ],
    "entryZone": "Rs.X,XXX - Rs.X,XXX (specific range with technical or fundamental reason)",
    "trimLevels": "First trim at Rs.X,XXX (+XX%), full exit at Rs.X,XXX (+XX%)",
    "hardStop": "Rs.X,XXX (below this level, specific thesis-breaking reason)"
  }
}

IMPORTANT: Return ONLY the JSON object. No markdown code fences. No backticks. No explanation text before or after. Just pure JSON.`;

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

    // Extract grounding sources from Gemini's search metadata
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
          // Categorize by domain
          const url = web.uri.toLowerCase();
          let section = "general";
          if (url.includes("trendlyne") || url.includes("target") || url.includes("forecast")) {
            section = "priceTargets";
          } else if (url.includes("screener") || url.includes("moneycontrol") || url.includes("nse") || url.includes("bse")) {
            section = "fundamentals";
          } else if (url.includes("twitter") || url.includes("reddit") || url.includes("economic") || url.includes("livemint") || url.includes("business-standard")) {
            section = "movement";
          }
          sources.push({
            title: web.title || web.uri,
            url: web.uri,
            section,
          });
        }
      }
    }

    // Parse the JSON from the response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let analysisData: Record<string, any>;
    try {
      // Remove markdown code fences if present
      let cleanText = outputText.trim();
      cleanText = cleanText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      analysisData = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", outputText.slice(0, 500), parseErr);
      return NextResponse.json(
        { error: "Failed to parse AI analysis response. Please try again." },
        { status: 500 }
      );
    }

    const ticker = analysisData.ticker || query.trim().toUpperCase();
    const companyName = analysisData.companyName || query.trim();
    const exchange = analysisData.exchange || "NSE";
    const sector = analysisData.sector || "Unknown";

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return NextResponse.json({
      id,
      ticker,
      companyName,
      exchange,
      sector,
      movementAnalysis: analysisData.movementAnalysis ?? {},
      fundamentalSnapshot: analysisData.fundamentalSnapshot ?? {},
      priceTargetFramework: analysisData.priceTargetFramework ?? {},
      sources,
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
