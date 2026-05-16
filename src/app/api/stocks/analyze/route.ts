import { NextRequest, NextResponse } from "next/server";
import { fetchPriceData, fetchOHLCV } from "@/lib/fetchers/yahoo";
import { fetchScreenerData } from "@/lib/fetchers/screener";
import { searchNews, searchEvents } from "@/lib/fetchers/tavily";
import { calculateTechnicals } from "@/lib/fetchers/technicals";
import type { TavilyResult, SourceCitation } from "@/lib/types";

export const maxDuration = 60;

// ── Build source-tagged data bundle ──────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildDataBundle(results: Record<string, any>): string {
  const lines: string[] = [];
  lines.push("=== VERIFIED DATA BUNDLE ===");
  lines.push("Every field below includes its data source and timestamp.");
  lines.push("Fields marked NULL mean data was unavailable from the API.\n");

  // Yahoo price data
  const yahoo = results.yahoo;
  if (yahoo.success && yahoo.data) {
    const d = yahoo.data;
    lines.push(`CURRENT_PRICE: ₹${d.currentPrice} [source: ${yahoo.source}, as_of: ${yahoo.fetchedAt}]`);
    lines.push(`MARKET_CAP: ₹${(d.marketCap / 10000000).toFixed(0)} Cr [source: ${yahoo.source}]`);
    lines.push(`52W_HIGH: ₹${d.fiftyTwoWeekHigh} [source: ${yahoo.source}]`);
    lines.push(`52W_LOW: ₹${d.fiftyTwoWeekLow} [source: ${yahoo.source}]`);
  } else {
    lines.push(`CURRENT_PRICE: NULL [source: ${yahoo.source}, error: ${yahoo.error}]`);
    lines.push(`MARKET_CAP: NULL [source: ${yahoo.source}, error: ${yahoo.error}]`);
    lines.push(`52W_HIGH: NULL [source: ${yahoo.source}]`);
    lines.push(`52W_LOW: NULL [source: ${yahoo.source}]`);
  }

  // Screener data
  const screener = results.screener;
  if (screener.success && screener.data) {
    const d = screener.data;
    lines.push(`\nSCREENER_RAW_DATA: ${JSON.stringify(d.raw).slice(0, 8000)} [source: ${screener.source}, as_of: ${screener.fetchedAt}]`);
    if (d.quarterlyResults.length > 0) {
      lines.push(`QUARTERLY_RESULTS: ${JSON.stringify(d.quarterlyResults).slice(0, 3000)} [source: ${screener.source}]`);
    }
    if (d.balanceSheet.length > 0) {
      lines.push(`BALANCE_SHEET: ${JSON.stringify(d.balanceSheet).slice(0, 3000)} [source: ${screener.source}]`);
    }
    if (Object.keys(d.ratios).length > 0) {
      lines.push(`RATIOS: ${JSON.stringify(d.ratios).slice(0, 2000)} [source: ${screener.source}]`);
    }
    if (d.shareholding.length > 0) {
      lines.push(`SHAREHOLDING: ${JSON.stringify(d.shareholding).slice(0, 2000)} [source: ${screener.source}]`);
    }
    if (d.peerComparison.length > 0) {
      lines.push(`PEER_COMPARISON: ${JSON.stringify(d.peerComparison).slice(0, 2000)} [source: ${screener.source}]`);
    }
  } else {
    lines.push(`\nSCREENER_DATA: NULL [source: ${screener.source}, error: ${screener.error}]`);
  }

  // Technical data
  const technicals = results.technicals;
  if (technicals.success && technicals.data) {
    const t = technicals.data;
    lines.push(`\n50_DMA: ${t.dma50 !== null ? `₹${t.dma50}` : "NULL (insufficient history)"} [source: ${technicals.source}]`);
    lines.push(`200_DMA: ${t.dma200 !== null ? `₹${t.dma200}` : "NULL (insufficient history)"} [source: ${technicals.source}]`);
    lines.push(`RSI_14: ${t.rsi14 !== null ? t.rsi14 : "NULL (insufficient history)"} [source: ${technicals.source}]`);
    lines.push(`PRICE_VS_50DMA: ${t.priceVs50DMA || "NULL"} [source: ${technicals.source}]`);
    lines.push(`PRICE_VS_200DMA: ${t.priceVs200DMA || "NULL"} [source: ${technicals.source}]`);
    lines.push(`RSI_SIGNAL: ${t.rsiSignal || "NULL"} [source: ${technicals.source}]`);
    lines.push(`VOLUME_SIGNAL: ${t.volumeSignal || "NULL"} [source: ${technicals.source}]`);
    lines.push(`SUPPORT_1: ${t.support1 !== null ? `₹${t.support1.toFixed(2)}` : "NULL"} [source: ${technicals.source}]`);
    lines.push(`SUPPORT_2: ${t.support2 !== null ? `₹${t.support2.toFixed(2)}` : "NULL"} [source: ${technicals.source}]`);
    lines.push(`RESISTANCE_1: ${t.resistance1 !== null ? `₹${t.resistance1.toFixed(2)}` : "NULL"} [source: ${technicals.source}]`);
    lines.push(`RESISTANCE_2: ${t.resistance2 !== null ? `₹${t.resistance2.toFixed(2)}` : "NULL"} [source: ${technicals.source}]`);
    if (t.insufficientHistory.length > 0) {
      lines.push(`INSUFFICIENT_HISTORY: ${t.insufficientHistory.join(", ")} [source: ${technicals.source}]`);
    }
  } else {
    lines.push(`\nTECHNICALS: NULL [source: ${technicals.source}, error: ${technicals.error}]`);
  }

  // News data
  const news = results.news;
  if (news.success && news.data && news.data.length > 0) {
    lines.push(`\nRECENT_NEWS_ARTICLES:`);
    for (const item of news.data.slice(0, 10)) {
      lines.push(`- "${item.title}" | ${item.url} | ${item.content.slice(0, 300)} [source: ${news.source}]`);
    }
  } else {
    lines.push(`\nRECENT_NEWS: NULL [source: ${news.source}, error: ${news.error}]`);
  }

  // Events data
  const events = results.events;
  if (events.success && events.data && events.data.length > 0) {
    lines.push(`\nUPCOMING_EVENTS_NEWS:`);
    for (const item of events.data.slice(0, 5)) {
      lines.push(`- "${item.title}" | ${item.url} | ${item.content.slice(0, 300)} [source: ${events.source}]`);
    }
  } else {
    lines.push(`\nUPCOMING_EVENTS: NULL [source: ${events.source}, error: ${events.error}]`);
  }

  return lines.join("\n");
}

// ── Analysis prompt for OpenRouter/Claude ────────────────────────────
function buildAnalysisPrompt(ticker: string, dataBundle: string): string {
  return `You are a senior equity research analyst at a top-tier investment bank specializing in Indian markets (NSE/BSE).

Below is a VERIFIED DATA BUNDLE for the stock "${ticker}". This data was fetched from real APIs moments ago. Each data point includes its source and timestamp in square brackets.

${dataBundle}

=== YOUR TASK ===

Using ONLY the data provided above, produce a comprehensive research report as a JSON object. Follow these rules strictly:

ANTI-HALLUCINATION RULES:
1. Every number you include MUST come from the data bundle above. If a field is NULL, write "data unavailable" — this is non-negotiable.
2. Do NOT use your training knowledge to fill in any missing numbers.
3. When citing a number, include which source it came from in parentheses, e.g., "(source: screener_in_via_apify)"
4. If two data points contradict each other, flag the discrepancy rather than picking one silently.
5. Use ₹ symbol for all Rupee amounts. Never round suspiciously — use exact numbers from the data.

Return this EXACT JSON structure:

{
  "ticker": "${ticker}",
  "companyName": "Full company name from the data",
  "exchange": "NSE",
  "sector": "Sector from the data",

  "catalystSentiment": {
    "socialNarrative": "Based on the news articles provided, what are retail investors discussing? What is the dominant retail thesis? Max 3 sentences.",
    "actualCatalyst": "The single most important recent event with EXACT numbers and dates from the data. Cross-check against the financial data.",
    "institutionalView": "What analysts are saying — specific brokerage names, ratings, target prices, dates. Only from the news data.",
    "bottomLine": "The stock is moving because [X], but [Y] is the part nobody is talking about."
  },

  "fundamentalSnapshot": {
    "valuation": {
      "currentPrice": "₹XXX.XX (source: yahoo_finance)",
      "fiftyTwoWeek": "High: ₹XXX | Low: ₹XXX (source: yahoo_finance)",
      "marketCap": "₹X,XXX Cr (source: yahoo_finance)",
      "performance30d": "+XX.X% (calculate from OHLCV data if available, else data unavailable)",
      "performance1y": "+XX.X% (calculate from OHLCV data if available, else data unavailable)",
      "forwardPE": "X.X vs sector median X.X (source: screener_in_via_apify)",
      "evEbitda": "X.X vs sector median X.X (source: screener_in_via_apify)",
      "priceBook": "X.X vs sector median X.X (source: screener_in_via_apify)"
    },
    "financials": {
      "quarter": "Q4 FY26 or whatever the latest quarter is",
      "revenue": "₹XX,XXX Cr (+XX% YoY) (source: screener_in_via_apify)",
      "ebitda": "₹XX,XXX Cr (source: screener_in_via_apify)",
      "ebitdaMargin": "XX.X% (changed from XX.X% YoY) (source: screener_in_via_apify)",
      "pat": "₹X,XXX Cr (+XX% YoY) (source: screener_in_via_apify)",
      "epsTrailing": "₹XX.XX (source: screener_in_via_apify)",
      "epsForward": "₹XX.XX (est.) or data unavailable"
    },
    "balanceSheet": {
      "totalDebt": "₹XX,XXX Cr (source: screener_in_via_apify)",
      "cashEquivalents": "₹XX,XXX Cr (source: screener_in_via_apify)",
      "netDebt": "₹XX,XXX Cr (calculated: debt - cash)",
      "debtEquity": "X.XX (source: screener_in_via_apify)",
      "interestCoverage": "X.Xx (source: screener_in_via_apify, or data unavailable)",
      "shareCount": "XXX Cr (source: screener_in_via_apify)",
      "dilution": "+X.X% YoY or flat (source: screener_in_via_apify)"
    },
    "redFlags": {
      "promoterHolding": "XX.X% (current) vs XX.X% (1 year ago) — rising/falling (source: screener_in_via_apify)",
      "promoterPledge": "XX.X% (state if above 20% red flag threshold) (source: screener_in_via_apify, or data unavailable)",
      "fiiChange": "XX.X% → XX.X% (last 2 quarters) (source: screener_in_via_apify, or data unavailable)",
      "diiChange": "XX.X% → XX.X% (last 2 quarters) (source: screener_in_via_apify, or data unavailable)",
      "relatedParty": "Any flagged related-party transactions? (source: news data, or data unavailable)"
    },
    "fairValueAssessment": "Use 2 methods with math: (1) P/E method: Forward EPS × sector median P/E = ₹XXX (2) EV/EBITDA method: Forward EBITDA × sector EV/EBITDA - net debt ÷ shares = ₹XXX. Then state premium/discount %. All numbers from the data bundle."
  },

  "catalystCalendar": {
    "events": [
      {"date": "YYYY-MM-DD or estimate", "event": "Event name", "details": "Details from news/data"},
      {"date": "...", "event": "...", "details": "..."}
    ]
  },

  "technicalSetup": {
    "dma50": "₹XXX.XX or data unavailable (source: calculated_from_yahoo)",
    "dma200": "₹XXX.XX or data unavailable (source: calculated_from_yahoo)",
    "priceVsDMA": "Above/below both DMAs — what this means",
    "support1": "₹XXX (source: calculated_from_yahoo)",
    "support2": "₹XXX (source: calculated_from_yahoo)",
    "resistance1": "₹XXX (source: calculated_from_yahoo)",
    "resistance2": "₹XXX (source: calculated_from_yahoo)",
    "volumeAnalysis": "From the volume signal data",
    "rsi": "RSI value and interpretation (source: calculated_from_yahoo)"
  },

  "priceFramework": {
    "scenarios": [
      {"label": "Bear Case", "timeframe": "3-6 months", "price": "₹XXX", "multipleUsed": "X.Xx P/E", "epsUsed": "₹XX", "rationale": "What breaks. Math shown."},
      {"label": "Base Case", "timeframe": "6-12 months", "price": "₹XXX", "multipleUsed": "X.Xx P/E", "epsUsed": "₹XX", "rationale": "What holds. Aligned with [brokerage]. Math shown."},
      {"label": "Bull Case", "timeframe": "12-18 months", "price": "₹XXX", "multipleUsed": "X.Xx P/E", "epsUsed": "₹XX", "rationale": "What works. Math shown."},
      {"label": "Stretched Bull", "timeframe": "24 months", "price": "₹XXX", "multipleUsed": "X.Xx P/E", "epsUsed": "₹XX", "rationale": "All catalysts firing. Math shown."}
    ],
    "entryZone": "₹XXX - ₹XXX (based on technical support and fundamental floor)",
    "trimLevels": "First trim at ₹XXX (+XX%), full exit at ₹XXX (+XX%)",
    "hardStop": "₹XXX (below this, [thesis-breaking reason])",
    "positionSizing": "Given [specific risk factor], keep position under X% of portfolio"
  },

  "riskRegister": [
    {"name": "Risk 1", "probability": "Low/Medium/High", "impact": "Low/Medium/High", "mitigant": "How the company addresses this"},
    {"name": "Risk 2", "probability": "...", "impact": "...", "mitigant": "..."},
    {"name": "Risk 3", "probability": "...", "impact": "...", "mitigant": "..."},
    {"name": "Risk 4", "probability": "...", "impact": "...", "mitigant": "..."},
    {"name": "Risk 5", "probability": "...", "impact": "...", "mitigant": "..."}
  ]
}

Return ONLY the JSON. No markdown. No code fences. No explanation text.`;
}

// ── Extract Tavily sources as clickable citations ────────────────────
function buildSourceCitations(
  newsResults: TavilyResult[] | null,
  eventResults: TavilyResult[] | null,
  section: string
): SourceCitation[] {
  const sources: SourceCitation[] = [];
  const seen = new Set<string>();

  const addResults = (results: TavilyResult[] | null) => {
    if (!results) return;
    for (const r of results) {
      if (r.url && !seen.has(r.url)) {
        seen.add(r.url);
        sources.push({ title: r.title, url: r.url, section });
      }
    }
  };

  addResults(newsResults);
  addResults(eventResults);
  return sources;
}

// ── Main API handler ─────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = body?.query;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const ticker = query.trim().toUpperCase();
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterKey) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
    }

    // Step 1: Fetch all data in parallel
    const [yahooResult, ohlcvResult, screenerResult, newsResult, eventsResult] =
      await Promise.allSettled([
        fetchPriceData(ticker),
        fetchOHLCV(ticker),
        fetchScreenerData(ticker),
        searchNews(ticker, ticker),
        searchEvents(ticker, ticker),
      ]);

    const yahoo = yahooResult.status === "fulfilled" ? yahooResult.value : {
      success: false, data: null, error: "Promise rejected", source: "yahoo_finance_v8", fetchedAt: new Date().toISOString()
    };
    const ohlcv = ohlcvResult.status === "fulfilled" ? ohlcvResult.value : {
      success: false, data: null, error: "Promise rejected", source: "yahoo_finance_v8", fetchedAt: new Date().toISOString()
    };
    const screener = screenerResult.status === "fulfilled" ? screenerResult.value : {
      success: false, data: null, error: "Promise rejected", source: "screener_in_via_apify", fetchedAt: new Date().toISOString()
    };
    const news = newsResult.status === "fulfilled" ? newsResult.value : {
      success: false, data: null, error: "Promise rejected", source: "tavily_search", fetchedAt: new Date().toISOString()
    };
    const events = eventsResult.status === "fulfilled" ? eventsResult.value : {
      success: false, data: null, error: "Promise rejected", source: "tavily_search", fetchedAt: new Date().toISOString()
    };

    // Step 2: Calculate technicals from OHLCV
    const technicals = ohlcv.success && ohlcv.data
      ? calculateTechnicals(ohlcv.data)
      : { success: false, data: null, error: "No OHLCV data available", source: "calculated_from_yahoo", fetchedAt: new Date().toISOString() };

    // Step 3: Build source-tagged data bundle
    const dataBundle = buildDataBundle({ yahoo, screener, technicals, news, events });

    // Step 4: Send to OpenRouter (Claude) for analysis
    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://india-stock-analyst.vercel.app",
        "X-Title": "India Stock Analyst",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 4096,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: buildAnalysisPrompt(ticker, dataBundle),
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("OpenRouter error:", errText);
      return NextResponse.json(
        { error: `AI analysis failed (HTTP ${aiRes.status}): ${errText.slice(0, 300)}` },
        { status: 500 }
      );
    }

    const aiJson = await aiRes.json();
    const aiContent = aiJson.choices?.[0]?.message?.content || "";

    // Step 5: Parse the AI response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let analysisData: Record<string, any>;
    try {
      let cleanText = aiContent.trim();
      cleanText = cleanText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in AI response");
      analysisData = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", aiContent.slice(0, 500), parseErr);
      return NextResponse.json(
        { error: "Failed to parse AI analysis. Please try again." },
        { status: 500 }
      );
    }

    // Step 6: Attach real Tavily source URLs to each section
    const newsData = news.success ? news.data : null;
    const eventsData = events.success ? events.data : null;
    const allSources = buildSourceCitations(newsData, eventsData, "general");

    // Merge sources into sections
    if (analysisData.catalystSentiment) {
      analysisData.catalystSentiment.sources = allSources.slice(0, 4);
    }
    if (analysisData.fundamentalSnapshot) {
      analysisData.fundamentalSnapshot.sources = [
        { title: "Screener.in Financial Data", url: `https://www.screener.in/company/${ticker}/consolidated/`, section: "fundamentals" },
        { title: "Yahoo Finance", url: `https://finance.yahoo.com/quote/${ticker}.NS/`, section: "fundamentals" },
        ...allSources.slice(4, 7),
      ];
    }
    if (analysisData.catalystCalendar) {
      analysisData.catalystCalendar.sources = allSources.slice(0, 3);
    }
    if (analysisData.technicalSetup) {
      analysisData.technicalSetup.sources = [
        { title: "Yahoo Finance OHLCV Data", url: `https://finance.yahoo.com/quote/${ticker}.NS/`, section: "technicals" },
      ];
    }
    if (analysisData.priceFramework) {
      analysisData.priceFramework.sources = [
        { title: "Screener.in Financial Data", url: `https://www.screener.in/company/${ticker}/consolidated/`, section: "priceTargets" },
        ...allSources.slice(2, 5),
      ];
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return NextResponse.json({
      id,
      ...analysisData,
      sources: allSources,
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
