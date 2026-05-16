import type { FetchResult, TavilyResult } from "@/lib/types";

const TAVILY_URL = "https://api.tavily.com/search";

async function tavilySearch(
  query: string,
  depth: "basic" | "advanced" = "advanced",
  maxResults: number = 10
): Promise<FetchResult<TavilyResult[]>> {
  const fetchedAt = new Date().toISOString();
  try {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) throw new Error("TAVILY_API_KEY not configured");

    const res = await fetch(TAVILY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: depth,
        max_results: maxResults,
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Tavily HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: TavilyResult[] = (json.results || []).map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      content: r.content || "",
      score: r.score || 0,
    }));

    return {
      success: true,
      data: results,
      error: null,
      source: "tavily_search",
      fetchedAt,
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
      source: "tavily_search",
      fetchedAt,
    };
  }
}

// General news + sentiment
export async function searchNews(
  ticker: string,
  companyName: string
): Promise<FetchResult<TavilyResult[]>> {
  const query = `${companyName} ${ticker} NSE stock latest news earnings results analyst target price 2025 2026`;
  return tavilySearch(query, "advanced", 10);
}

// Upcoming events/catalysts
export async function searchEvents(
  ticker: string,
  companyName: string
): Promise<FetchResult<TavilyResult[]>> {
  const query = `${companyName} ${ticker} upcoming AGM dividend board meeting catalyst event 2025 2026`;
  return tavilySearch(query, "basic", 5);
}

// Financial data search — quarterly results, revenue, PAT, EPS
export async function searchFinancials(
  ticker: string,
  companyName: string
): Promise<FetchResult<TavilyResult[]>> {
  const query = `${companyName} ${ticker} quarterly results Q4 FY25 FY26 revenue PAT EBITDA EPS net profit consolidated site:moneycontrol.com OR site:screener.in OR site:trendlyne.com OR site:economictimes.com`;
  return tavilySearch(query, "advanced", 8);
}

// Balance sheet + shareholding data search
export async function searchBalanceSheet(
  ticker: string,
  companyName: string
): Promise<FetchResult<TavilyResult[]>> {
  const query = `${companyName} ${ticker} balance sheet debt equity promoter holding FII DII shareholding pattern 2025 site:screener.in OR site:trendlyne.com OR site:tickertape.in OR site:moneycontrol.com`;
  return tavilySearch(query, "advanced", 5);
}

// Analyst ratings and target prices
export async function searchAnalystRatings(
  ticker: string,
  companyName: string
): Promise<FetchResult<TavilyResult[]>> {
  const query = `${companyName} ${ticker} analyst target price rating buy sell hold brokerage 2025 2026`;
  return tavilySearch(query, "basic", 5);
}
