import type { FetchResult, TavilyResult } from "@/lib/types";

const TAVILY_URL = "https://api.tavily.com/search";

export async function searchNews(
  ticker: string,
  companyName: string
): Promise<FetchResult<TavilyResult[]>> {
  const fetchedAt = new Date().toISOString();
  try {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) throw new Error("TAVILY_API_KEY not configured");

    const query = `${companyName} ${ticker} NSE stock latest news earnings results analyst target price 2026`;
    const res = await fetch(TAVILY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        max_results: 10,
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Tavily HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    const results: TavilyResult[] = (json.results || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => ({
        title: r.title || "",
        url: r.url || "",
        content: r.content || "",
        score: r.score || 0,
      })
    );

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

export async function searchEvents(
  ticker: string,
  companyName: string
): Promise<FetchResult<TavilyResult[]>> {
  const fetchedAt = new Date().toISOString();
  try {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) throw new Error("TAVILY_API_KEY not configured");

    const query = `${companyName} ${ticker} upcoming AGM dividend board meeting catalyst event 2026`;
    const res = await fetch(TAVILY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: 5,
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!res.ok) throw new Error(`Tavily HTTP ${res.status}`);
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
