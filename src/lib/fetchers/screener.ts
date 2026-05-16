import type { FetchResult, ScreenerData } from "@/lib/types";

const APIFY_BASE = "https://api.apify.com/v2/acts/shashwattrivedi~screener-in/run-sync-get-dataset-items";

export async function fetchScreenerData(ticker: string): Promise<FetchResult<ScreenerData>> {
  const fetchedAt = new Date().toISOString();
  try {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) throw new Error("APIFY_API_TOKEN not configured");

    const url = `${APIFY_BASE}?token=${token}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "getstockdetails",
        url: `https://www.screener.in/company/${ticker}/consolidated/`,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Apify HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const items = await res.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("Apify returned empty dataset");
    }

    const raw = items[0];

    // Parse the Apify Screener.in response into structured data
    return {
      success: true,
      data: {
        raw,
        companyName: raw.companyName || raw.name || ticker,
        quarterlyResults: raw.quarterlyResults || raw.quarterly_results || raw.profitLoss || [],
        balanceSheet: raw.balanceSheet || raw.balance_sheet || [],
        ratios: raw.ratios || raw.keyMetrics || raw.key_metrics || {},
        shareholding: raw.shareholding || raw.shareholdingPattern || [],
        peerComparison: raw.peerComparison || raw.peer_comparison || [],
      },
      error: null,
      source: "screener_in_via_apify",
      fetchedAt,
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
      source: "screener_in_via_apify",
      fetchedAt,
    };
  }
}
