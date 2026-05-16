import type { FetchResult, YahooPrice, OHLCV } from "@/lib/types";

const YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart";
const YAHOO_QUOTE = "https://query2.finance.yahoo.com/v10/finance/quoteSummary";

export async function fetchPriceData(ticker: string): Promise<FetchResult<YahooPrice>> {
  const fetchedAt = new Date().toISOString();
  try {
    const symbol = ticker.includes(".") ? ticker : `${ticker}.NS`;

    // Try quoteSummary for comprehensive data
    const modules = "price,defaultKeyStatistics,financialData,summaryDetail";
    const res = await fetch(
      `${YAHOO_QUOTE}/${symbol}?modules=${modules}`,
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }
    );

    if (res.ok) {
      const json = await res.json();
      const result = json?.quoteSummary?.result?.[0];
      if (result) {
        const price = result.price || {};
        const stats = result.defaultKeyStatistics || {};
        const finData = result.financialData || {};
        const summary = result.summaryDetail || {};

        return {
          success: true,
          data: {
            currentPrice: price.regularMarketPrice?.raw || finData.currentPrice?.raw || 0,
            marketCap: price.marketCap?.raw || 0,
            fiftyTwoWeekHigh: summary.fiftyTwoWeekHigh?.raw || price.fiftyTwoWeekHigh?.raw || 0,
            fiftyTwoWeekLow: summary.fiftyTwoWeekLow?.raw || price.fiftyTwoWeekLow?.raw || 0,
            currency: price.currency || "INR",
            // Extra fields
            pe: summary.trailingPE?.raw || stats.trailingPE?.raw || 0,
            forwardPE: summary.forwardPE?.raw || stats.forwardPE?.raw || 0,
            pb: summary.priceToBook?.raw || stats.priceToBook?.raw || 0,
            eps: stats.trailingEps?.raw || 0,
            forwardEps: stats.forwardEps?.raw || 0,
            dividendYield: summary.dividendYield?.raw || 0,
            beta: summary.beta?.raw || stats.beta?.raw || 0,
            evEbitda: stats.enterpriseToEbitda?.raw || 0,
            evRevenue: stats.enterpriseToRevenue?.raw || 0,
            debtToEquity: finData.debtToEquity?.raw || 0,
            returnOnEquity: finData.returnOnEquity?.raw || 0,
            revenueGrowth: finData.revenueGrowth?.raw || 0,
            earningsGrowth: finData.earningsGrowth?.raw || 0,
            totalRevenue: finData.totalRevenue?.raw || 0,
            ebitda: finData.ebitda?.raw || 0,
            totalDebt: finData.totalDebt?.raw || 0,
            totalCash: finData.totalCash?.raw || 0,
            operatingMargin: finData.operatingMargins?.raw || 0,
            profitMargin: finData.profitMargins?.raw || 0,
            sharesOutstanding: stats.sharesOutstanding?.raw || price.sharesOutstanding?.raw || 0,
          },
          error: null,
          source: "yahoo_finance_v10",
          fetchedAt,
        };
      }
    }

    // Fallback to v8 chart API
    const chartRes = await fetch(`${YAHOO_CHART}/${symbol}?range=1mo&interval=1d`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!chartRes.ok) throw new Error(`Yahoo Finance HTTP ${chartRes.status}`);
    const chartJson = await chartRes.json();
    const meta = chartJson?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error("No meta data in Yahoo response");

    return {
      success: true,
      data: {
        currentPrice: meta.regularMarketPrice ?? 0,
        marketCap: meta.marketCap ?? 0,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
        currency: meta.currency ?? "INR",
      },
      error: null,
      source: "yahoo_finance_v8",
      fetchedAt,
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
      source: "yahoo_finance",
      fetchedAt,
    };
  }
}

export async function fetchOHLCV(ticker: string): Promise<FetchResult<OHLCV[]>> {
  const fetchedAt = new Date().toISOString();
  try {
    const symbol = ticker.includes(".") ? ticker : `${ticker}.NS`;
    const res = await fetch(`${YAHOO_CHART}/${symbol}?range=1y&interval=1d`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status}`);
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error("No chart data");

    const timestamps: number[] = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0];
    if (!quotes) throw new Error("No quote data");

    const ohlcv: OHLCV[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (quotes.close[i] != null) {
        ohlcv.push({
          date: new Date(timestamps[i] * 1000).toISOString().split("T")[0],
          open: quotes.open[i] ?? 0,
          high: quotes.high[i] ?? 0,
          low: quotes.low[i] ?? 0,
          close: quotes.close[i],
          volume: quotes.volume[i] ?? 0,
        });
      }
    }

    return {
      success: true,
      data: ohlcv,
      error: null,
      source: "yahoo_finance_v8",
      fetchedAt,
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
      source: "yahoo_finance_v8",
      fetchedAt,
    };
  }
}
