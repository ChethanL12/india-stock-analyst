import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a senior equity research analyst specializing in Indian stock markets (NSE/BSE). 
You have deep expertise in fundamental analysis, technical analysis, market sentiment, and institutional flows.
You always provide specific numbers, dates, and data points. You never give vague answers.
You format your responses as valid JSON only - no markdown, no explanation outside the JSON.`;

const buildAnalysisPrompt = (query: string) => `
Analyze the Indian stock: "${query}"

Search the web for the most current and accurate information from sources like NSE/BSE official data, 
Screener.in, Trendlyne, Moneycontrol, Economic Times Markets, Livemint, TradingView India, Zerodha Pulse, 
and recent brokerage research reports.

Return a JSON object with EXACTLY this structure (no other text):

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
    "priceAndMarketCap": "Current price in INR, market cap in Cr/Lakh Cr, 30-day % change. E.g.: ₹2,456 | Market Cap: ₹16.5L Cr | 30D: +12.4%",
    "valuationMultiples": "Forward P/E: X.X (sector avg: Y.Y) | EV/Sales: X.X (sector avg: Y.Y). Include a one-line interpretation.",
    "growthMetrics": "Q[X] FY[YY] Revenue: ₹X,XXX Cr (+XX% YoY) | PAT: ₹XXX Cr (+XX% YoY). Include any key highlights.",
    "balanceSheet": "Cash: ₹X,XXX Cr | Debt: ₹X,XXX Cr | Net Debt/Equity: X.X | Shares outstanding: X.X Cr (dilution: +X% YoY or flat)",
    "fairValueAssessment": "Is the stock trading above, at, or below fundamental fair value? Show the math using DCF or peer multiple approach. Max 1 paragraph."
  },
  "priceTargetFramework": {
    "scenarios": [
      {
        "label": "Bear Case",
        "timeframe": "3-6 months",
        "price": "₹X,XXX",
        "rationale": "Specific bear scenario. Math: X.X x ₹XX EPS = ₹X,XXX or X.X x ₹X,XXX revenue x Y% margin = ₹X,XXX"
      },
      {
        "label": "Base Case",
        "timeframe": "6-12 months",
        "price": "₹X,XXX",
        "rationale": "Specific base scenario with execution assumptions. Math shown."
      },
      {
        "label": "Bull Case",
        "timeframe": "12-18 months",
        "price": "₹X,XXX",
        "rationale": "Specific bull scenario. What needs to work. Math shown."
      },
      {
        "label": "Stretched Bull",
        "timeframe": "24 months",
        "price": "₹X,XXX",
        "rationale": "Absolute ceiling scenario. All catalysts firing. Math shown."
      }
    ],
    "entryZone": "₹X,XXX - ₹X,XXX (specific range with technical or fundamental reason)",
    "trimLevels": "First trim at ₹X,XXX (+XX%), full exit at ₹X,XXX (+XX%)",
    "hardStop": "₹X,XXX (below this level, specific thesis-breaking reason)"
  },
  "sources": [
    {
      "title": "Exact page title of the source you consulted",
      "url": "https://full-url-of-source.com/page",
      "section": "movement | fundamentals | priceTargets | general"
    }
  ]
}

For the sources array: list every specific web page you actually searched and used to derive data in this analysis. 
Each source must have a real URL (not a homepage). Categorize each by which section it most informed:
- "movement" = social narrative, catalyst, institutional views
- "fundamentals" = price, P/E, revenue, balance sheet data
- "priceTargets" = analyst targets, valuation models
- "general" = company overview, sector context
Aim for 5-10 sources minimum. Only include sources you actually consulted.`;

interface UrlCitation {
  type: "url_citation";
  url: string;
  title?: string;
}

interface OutputTextContent {
  type: "output_text";
  text: string;
  annotations?: UrlCitation[];
}

interface MessageOutputItem {
  type: "message";
  content: OutputTextContent[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCitationsFromResponse(
  output: any[]
): Array<{ title: string; url: string }> {
  const citations: Array<{ title: string; url: string }> = [];
  const seen = new Set<string>();

  for (const item of output) {
    if (item.type !== "message") continue;
    const msgItem = item as MessageOutputItem;
    for (const content of msgItem.content ?? []) {
      if (content.type !== "output_text") continue;
      for (const annotation of content.annotations ?? []) {
        if (annotation.type === "url_citation" && annotation.url) {
          if (!seen.has(annotation.url)) {
            seen.add(annotation.url);
            citations.push({
              title: annotation.title ?? annotation.url,
              url: annotation.url,
            });
          }
        }
      }
    }
  }

  return citations;
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      max_output_tokens: 8192,
      tools: [{ type: "web_search_preview" as const }],
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildAnalysisPrompt(query.trim()) },
      ],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const outputItems = response.output as any[];

    // Extract the text from the response
    const outputText = outputItems
      .filter((item: any) => item.type === "message")
      .flatMap(
        (item: any) => (item as MessageOutputItem).content ?? []
      )
      .filter((c: any) => c.type === "output_text")
      .map((c: any) => c.text)
      .join("");

    // Extract URL citations from annotations
    const annotationCitations = extractCitationsFromResponse(outputItems);

    // Parse the JSON from the response
    let analysisData: Record<string, unknown>;
    try {
      const jsonMatch = outputText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      analysisData = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch {
      console.error("Failed to parse AI response:", outputText.slice(0, 500));
      return NextResponse.json(
        { error: "Failed to parse AI analysis response. Please try again." },
        { status: 500 }
      );
    }

    // Merge AI-declared sources with annotation-extracted citations
    const aiSources = (analysisData.sources as Array<{
      title: string;
      url: string;
      section: string;
    }>) ?? [];

    const aiUrls = new Set(aiSources.map((s) => s.url));
    for (const citation of annotationCitations) {
      if (!aiUrls.has(citation.url)) {
        aiSources.push({
          title: citation.title,
          url: citation.url,
          section: "general",
        });
        aiUrls.add(citation.url);
      }
    }

    // Clean sources
    const sources = aiSources.filter(
      (s) => s.url && s.url.startsWith("http")
    );
    analysisData.sources = sources;

    const ticker =
      (analysisData.ticker as string) || query.trim().toUpperCase();
    const companyName = (analysisData.companyName as string) || query.trim();
    const exchange = (analysisData.exchange as string) || "NSE";
    const sector = (analysisData.sector as string) || "Unknown";

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return NextResponse.json({
      id,
      ticker,
      companyName,
      exchange,
      sector,
      movementAnalysis:
        (analysisData.movementAnalysis as Record<string, unknown>) ?? {},
      fundamentalSnapshot:
        (analysisData.fundamentalSnapshot as Record<string, unknown>) ?? {},
      priceTargetFramework:
        (analysisData.priceTargetFramework as Record<string, unknown>) ?? {},
      sources,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error analyzing stock:", err);
    return NextResponse.json(
      { error: "Failed to analyze stock. Please try again." },
      { status: 500 }
    );
  }
}
