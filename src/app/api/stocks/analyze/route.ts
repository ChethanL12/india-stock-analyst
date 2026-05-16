import { NextRequest, NextResponse } from "next/server";
import { fetchPriceData, fetchOHLCV } from "@/lib/fetchers/yahoo";
import { fetchScreenerData } from "@/lib/fetchers/screener";
import { searchNews, searchEvents, searchFinancials, searchBalanceSheet, searchAnalystRatings } from "@/lib/fetchers/tavily";
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

  // Yahoo price + fundamentals data
  const yahoo = results.yahoo;
  if (yahoo.success && yahoo.data) {
    const d = yahoo.data;
    lines.push(`CURRENT_PRICE: ₹${d.currentPrice} [source: ${yahoo.source}, as_of: ${yahoo.fetchedAt}]`);
    lines.push(`MARKET_CAP: ₹${d.marketCap > 0 ? (d.marketCap / 10000000).toFixed(0) + " Cr" : "NULL"} [source: ${yahoo.source}]`);
    lines.push(`52W_HIGH: ₹${d.fiftyTwoWeekHigh} [source: ${yahoo.source}]`);
    lines.push(`52W_LOW: ₹${d.fiftyTwoWeekLow} [source: ${yahoo.source}]`);

    // Extended Yahoo data (from v10 quoteSummary)
    if (d.pe) lines.push(`TRAILING_PE: ${d.pe.toFixed(2)} [source: ${yahoo.source}]`);
    if (d.forwardPE) lines.push(`FORWARD_PE: ${d.forwardPE.toFixed(2)} [source: ${yahoo.source}]`);
    if (d.pb) lines.push(`PRICE_TO_BOOK: ${d.pb.toFixed(2)} [source: ${yahoo.source}]`);
    if (d.eps) lines.push(`TRAILING_EPS: ₹${d.eps.toFixed(2)} [source: ${yahoo.source}]`);
    if (d.forwardEps) lines.push(`FORWARD_EPS: ₹${d.forwardEps.toFixed(2)} [source: ${yahoo.source}]`);
    if (d.evEbitda) lines.push(`EV_EBITDA: ${d.evEbitda.toFixed(2)} [source: ${yahoo.source}]`);
    if (d.evRevenue) lines.push(`EV_REVENUE: ${d.evRevenue.toFixed(2)} [source: ${yahoo.source}]`);
    if (d.dividendYield) lines.push(`DIVIDEND_YIELD: ${(d.dividendYield * 100).toFixed(2)}% [source: ${yahoo.source}]`);
    if (d.beta) lines.push(`BETA: ${d.beta.toFixed(2)} [source: ${yahoo.source}]`);
    if (d.debtToEquity) lines.push(`DEBT_TO_EQUITY: ${d.debtToEquity.toFixed(2)} [source: ${yahoo.source}]`);
    if (d.returnOnEquity) lines.push(`RETURN_ON_EQUITY: ${(d.returnOnEquity * 100).toFixed(2)}% [source: ${yahoo.source}]`);
    if (d.revenueGrowth) lines.push(`REVENUE_GROWTH_YOY: ${(d.revenueGrowth * 100).toFixed(1)}% [source: ${yahoo.source}]`);
    if (d.earningsGrowth) lines.push(`EARNINGS_GROWTH_YOY: ${(d.earningsGrowth * 100).toFixed(1)}% [source: ${yahoo.source}]`);
    if (d.totalRevenue) lines.push(`TTM_REVENUE: ₹${(d.totalRevenue / 10000000).toFixed(0)} Cr [source: ${yahoo.source}]`);
    if (d.ebitda) lines.push(`TTM_EBITDA: ₹${(d.ebitda / 10000000).toFixed(0)} Cr [source: ${yahoo.source}]`);
    if (d.totalDebt) lines.push(`TOTAL_DEBT: ₹${(d.totalDebt / 10000000).toFixed(0)} Cr [source: ${yahoo.source}]`);
    if (d.totalCash) lines.push(`TOTAL_CASH: ₹${(d.totalCash / 10000000).toFixed(0)} Cr [source: ${yahoo.source}]`);
    if (d.operatingMargin) lines.push(`OPERATING_MARGIN: ${(d.operatingMargin * 100).toFixed(1)}% [source: ${yahoo.source}]`);
    if (d.profitMargin) lines.push(`PROFIT_MARGIN: ${(d.profitMargin * 100).toFixed(1)}% [source: ${yahoo.source}]`);
    if (d.sharesOutstanding) lines.push(`SHARES_OUTSTANDING: ${(d.sharesOutstanding / 10000000).toFixed(2)} Cr [source: ${yahoo.source}]`);
  } else {
    lines.push(`YAHOO_DATA: NULL [source: ${yahoo.source}, error: ${yahoo.error}]`);
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
      lines.push(`- "${item.title}" | ${item.url} | ${item.content.slice(0, 400)} [source: ${news.source}]`);
    }
  } else {
    lines.push(`\nRECENT_NEWS: NULL [source: ${news.source}, error: ${news.error}]`);
  }

  // Financial results data (targeted search)
  const financials = results.financials;
  if (financials.success && financials.data && financials.data.length > 0) {
    lines.push(`\nFINANCIAL_RESULTS_DATA (from web search - extract exact numbers):`);
    for (const item of financials.data.slice(0, 8)) {
      lines.push(`- "${item.title}" | ${item.url} | ${item.content.slice(0, 500)} [source: ${financials.source}]`);
    }
  }

  // Balance sheet / shareholding data (targeted search)
  const balanceSheet = results.balanceSheet;
  if (balanceSheet.success && balanceSheet.data && balanceSheet.data.length > 0) {
    lines.push(`\nBALANCE_SHEET_SHAREHOLDING_DATA (from web search - extract exact numbers):`);
    for (const item of balanceSheet.data.slice(0, 5)) {
      lines.push(`- "${item.title}" | ${item.url} | ${item.content.slice(0, 500)} [source: ${balanceSheet.source}]`);
    }
  }

  // Analyst ratings data (targeted search)
  const analysts = results.analysts;
  if (analysts.success && analysts.data && analysts.data.length > 0) {
    lines.push(`\nANALYST_RATINGS_DATA (from web search):`);
    for (const item of analysts.data.slice(0, 5)) {
      lines.push(`- "${item.title}" | ${item.url} | ${item.content.slice(0, 400)} [source: ${analysts.source}]`);
    }
  }

  // Events data
  const events = results.events;
  if (events.success && events.data && events.data.length > 0) {
    lines.push(`\nUPCOMING_EVENTS_NEWS:`);
    for (const item of events.data.slice(0, 5)) {
      lines.push(`- "${item.title}" | ${item.url} | ${item.content.slice(0, 300)} [source: ${events.source}]`);
    }
  }

  return lines.join("\n");
}

// ── Analysis prompt for OpenRouter ───────────────────────────────────
function buildAnalysisPrompt(ticker: string, dataBundle: string): string {
  return `You are a senior equity research analyst at a top-tier investment bank specializing in Indian markets (NSE/BSE).

Below is a VERIFIED DATA BUNDLE for the stock "${ticker}". This data was fetched from real APIs and web searches moments ago. Each data point includes its source and timestamp in square brackets.

${dataBundle}

=== YOUR TASK ===

Using ONLY the data provided above, produce a comprehensive research report as a JSON object. Follow these rules strictly:

ANTI-HALLUCINATION RULES:
1. Every number you include MUST come from the data bundle above. If a field is NULL, write "data unavailable" — do NOT estimate.
2. Do NOT use your training knowledge to fill in any missing numbers.
3. When citing a number, include which source it came from in parentheses, e.g., "(source: yahoo_finance_v10)"
4. If two data points contradict each other, flag the discrepancy.
5. Use ₹ symbol for all Rupee amounts.
6. IMPORTANT: For the FINANCIAL_RESULTS_DATA and BALANCE_SHEET_SHAREHOLDING_DATA sections, carefully extract exact numbers mentioned in the article text. These contain real quarterly results, revenue, PAT, debt etc.

Return this EXACT JSON structure:

{
  "ticker": "${ticker}",
  "companyName": "Full company name from the data",
  "exchange": "NSE",
  "sector": "Sector from the data",

  "catalystSentiment": {
    "socialNarrative": "Based on the news articles provided, what are retail investors discussing? What is the dominant retail thesis? Max 3 sentences.",
    "actualCatalyst": "The single most important recent event with EXACT numbers and dates from the data.",
    "institutionalView": "What analysts are saying — specific brokerage names, ratings, target prices, dates. Only from the data.",
    "bottomLine": "The stock is moving because [X], but [Y] is the part nobody is talking about."
  },

  "fundamentalSnapshot": {
    "valuation": {
      "currentPrice": "₹XXX.XX (source: yahoo_finance)",
      "fiftyTwoWeek": "High: ₹XXX | Low: ₹XXX (source: yahoo_finance)",
      "marketCap": "₹X,XXX Cr (source: yahoo_finance)",
      "performance30d": "Calculate from OHLCV if available",
      "performance1y": "Calculate from OHLCV if available",
      "forwardPE": "X.X (source: yahoo_finance)",
      "evEbitda": "X.X (source: yahoo_finance)",
      "priceBook": "X.X (source: yahoo_finance)"
    },
    "financials": {
      "quarter": "Q4 FY25 or latest quarter from FINANCIAL_RESULTS_DATA",
      "revenue": "₹XX,XXX Cr (+XX% YoY) — extract from FINANCIAL_RESULTS_DATA articles",
      "ebitda": "₹XX,XXX Cr — extract from FINANCIAL_RESULTS_DATA or yahoo",
      "ebitdaMargin": "XX.X% — calculate from revenue and ebitda",
      "pat": "₹X,XXX Cr (+XX% YoY) — extract from FINANCIAL_RESULTS_DATA articles",
      "epsTrailing": "₹XX.XX (source: yahoo_finance)",
      "epsForward": "₹XX.XX (source: yahoo_finance)"
    },
    "balanceSheet": {
      "totalDebt": "₹XX,XXX Cr (source: yahoo_finance or BALANCE_SHEET data)",
      "cashEquivalents": "₹XX,XXX Cr (source: yahoo_finance or BALANCE_SHEET data)",
      "netDebt": "₹XX,XXX Cr (calculated: debt - cash)",
      "debtEquity": "X.XX (source: yahoo_finance)",
      "interestCoverage": "X.Xx or data unavailable",
      "shareCount": "XXX Cr (source: yahoo_finance)",
      "dilution": "data from web search or data unavailable"
    },
    "redFlags": {
      "promoterHolding": "XX.X% — from BALANCE_SHEET_SHAREHOLDING_DATA or data unavailable",
      "promoterPledge": "XX.X% or data unavailable",
      "fiiChange": "XX.X% — from shareholding data or data unavailable",
      "diiChange": "XX.X% — from shareholding data or data unavailable",
      "relatedParty": "Any flagged related-party transactions or data unavailable"
    },
    "fairValueAssessment": "Use 2 methods with math: (1) P/E method: Forward EPS × sector median P/E = ₹XXX (2) EV/EBITDA method if data available. State premium/discount %."
  },

  "catalystCalendar": {
    "events": [
      {"date": "YYYY-MM-DD or estimate", "event": "Event name", "details": "Details from news/data"}
    ]
  },

  "technicalSetup": {
    "dma50": "₹XXX.XX or data unavailable",
    "dma200": "₹XXX.XX or data unavailable",
    "priceVsDMA": "Above/below both DMAs — what this means",
    "support1": "₹XXX",
    "support2": "₹XXX",
    "resistance1": "₹XXX",
    "resistance2": "₹XXX",
    "volumeAnalysis": "From the volume signal data",
    "rsi": "RSI value and interpretation"
  },

  "priceFramework": {
    "scenarios": [
      {"label": "Bear Case", "timeframe": "3-6 months", "price": "₹XXX", "multipleUsed": "X.Xx P/E", "epsUsed": "₹XX", "rationale": "What breaks. Math shown."},
      {"label": "Base Case", "timeframe": "6-12 months", "price": "₹XXX", "multipleUsed": "X.Xx P/E", "epsUsed": "₹XX", "rationale": "What holds. Math shown."},
      {"label": "Bull Case", "timeframe": "12-18 months", "price": "₹XXX", "multipleUsed": "X.Xx P/E", "epsUsed": "₹XX", "rationale": "What works. Math shown."},
      {"label": "Stretched Bull", "timeframe": "24 months", "price": "₹XXX", "multipleUsed": "X.Xx P/E", "epsUsed": "₹XX", "rationale": "All catalysts firing. Math shown."}
    ],
    "entryZone": "₹XXX - ₹XXX",
    "trimLevels": "First trim at ₹XXX (+XX%), full exit at ₹XXX (+XX%)",
    "hardStop": "₹XXX (below this, thesis breaks because...)",
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
  allResults: (TavilyResult[] | null)[],
  section: string
): SourceCitation[] {
  const sources: SourceCitation[] = [];
  const seen = new Set<string>();

  for (const results of allResults) {
    if (!results) continue;
    for (const r of results) {
      if (r.url && !seen.has(r.url)) {
        seen.add(r.url);
        sources.push({ title: r.title, url: r.url, section });
      }
    }
  }
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

    // Step 1: Fetch ALL data in parallel (7 requests)
    const [yahooResult, ohlcvResult, screenerResult, newsResult, eventsResult, financialsResult, balanceSheetResult, analystsResult] =
      await Promise.allSettled([
        fetchPriceData(ticker),
        fetchOHLCV(ticker),
        fetchScreenerData(ticker),
        searchNews(ticker, ticker),
        searchEvents(ticker, ticker),
        searchFinancials(ticker, ticker),
        searchBalanceSheet(ticker, ticker),
        searchAnalystRatings(ticker, ticker),
      ]);

    const yahoo = yahooResult.status === "fulfilled" ? yahooResult.value : {
      success: false, data: null, error: "Promise rejected", source: "yahoo_finance", fetchedAt: new Date().toISOString()
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
    const financials = financialsResult.status === "fulfilled" ? financialsResult.value : {
      success: false, data: null, error: "Promise rejected", source: "tavily_search", fetchedAt: new Date().toISOString()
    };
    const balanceSheet = balanceSheetResult.status === "fulfilled" ? balanceSheetResult.value : {
      success: false, data: null, error: "Promise rejected", source: "tavily_search", fetchedAt: new Date().toISOString()
    };
    const analysts = analystsResult.status === "fulfilled" ? analystsResult.value : {
      success: false, data: null, error: "Promise rejected", source: "tavily_search", fetchedAt: new Date().toISOString()
    };

    // Step 2: Calculate technicals from OHLCV
    const technicals = ohlcv.success && ohlcv.data
      ? calculateTechnicals(ohlcv.data)
      : { success: false, data: null, error: "No OHLCV data available", source: "calculated_from_yahoo", fetchedAt: new Date().toISOString() };

    // Step 3: Build source-tagged data bundle
    const dataBundle = buildDataBundle({ yahoo, screener, technicals, news, events, financials, balanceSheet, analysts });

    // Step 4: Send to OpenRouter for analysis
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

    // Step 6: Attach real source URLs to each section
    const newsData = news.success ? news.data : null;
    const eventsData = events.success ? events.data : null;
    const financialsData = financials.success ? financials.data : null;
    const balanceSheetData = balanceSheet.success ? balanceSheet.data : null;
    const analystsData = analysts.success ? analysts.data : null;

    const allSources = buildSourceCitations([newsData, eventsData, financialsData, balanceSheetData, analystsData], "general");

    // Merge sources into sections
    if (analysisData.catalystSentiment) {
      analysisData.catalystSentiment.sources = buildSourceCitations([newsData, analystsData], "catalyst");
    }
    if (analysisData.fundamentalSnapshot) {
      analysisData.fundamentalSnapshot.sources = [
        { title: "Screener.in Financial Data", url: `https://www.screener.in/company/${ticker}/consolidated/`, section: "fundamentals" },
        { title: "Yahoo Finance", url: `https://finance.yahoo.com/quote/${ticker}.NS/`, section: "fundamentals" },
        ...buildSourceCitations([financialsData, balanceSheetData], "fundamentals").slice(0, 5),
      ];
    }
    if (analysisData.catalystCalendar) {
      analysisData.catalystCalendar.sources = buildSourceCitations([eventsData, newsData], "calendar");
    }
    if (analysisData.technicalSetup) {
      analysisData.technicalSetup.sources = [
        { title: "Yahoo Finance OHLCV Data", url: `https://finance.yahoo.com/quote/${ticker}.NS/`, section: "technicals" },
      ];
    }
    if (analysisData.priceFramework) {
      analysisData.priceFramework.sources = [
        { title: "Screener.in Financial Data", url: `https://www.screener.in/company/${ticker}/consolidated/`, section: "priceTargets" },
        ...buildSourceCitations([analystsData, financialsData], "priceTargets").slice(0, 4),
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
