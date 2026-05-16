import type { FetchResult, YahooPrice, OHLCV } from "@/lib/types";

const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

export async function fetchPriceData(ticker: string): Promise<FetchResult<YahooPrice>> {
  const fetchedAt = new Date().toISOString();
  try {
    const symbol = ticker.includes(".") ? ticker : `${ticker}.NS`;
    const res = await fetch(`${YAHOO_BASE}/${symbol}?range=1mo&interval=1d`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status}`);
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
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
      source: "yahoo_finance_v8",
      fetchedAt,
    };
  }
}

export async function fetchOHLCV(ticker: string): Promise<FetchResult<OHLCV[]>> {
  const fetchedAt = new Date().toISOString();
  try {
    const symbol = ticker.includes(".") ? ticker : `${ticker}.NS`;
    const res = await fetch(`${YAHOO_BASE}/${symbol}?range=1y&interval=1d`, {
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
