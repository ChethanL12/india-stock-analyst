import type { StockAnalysis, StockAnalysisSummary } from "./types";

const STORAGE_KEY = "india-stock-analyst-data";

function getStore(): Record<string, StockAnalysis> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStore(store: Record<string, StockAnalysis>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function saveAnalysis(analysis: StockAnalysis): void {
  const store = getStore();
  store[analysis.id] = analysis;

  // Keep only last 20 analyses to avoid filling localStorage
  const entries = Object.entries(store).sort(
    ([, a], [, b]) =>
      new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
  );
  const trimmed = Object.fromEntries(entries.slice(0, 20));
  setStore(trimmed);
}

export function getAnalysis(id: string): StockAnalysis | null {
  const store = getStore();
  return store[id] || null;
}

export function getRecentAnalyses(): StockAnalysisSummary[] {
  const store = getStore();
  return Object.values(store)
    .sort(
      (a, b) =>
        new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
    )
    .slice(0, 10)
    .map((a) => ({
      id: a.id,
      ticker: a.ticker,
      companyName: a.companyName,
      exchange: a.exchange,
      sector: a.sector,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      oneLinerSummary: (a as any).catalystSentiment?.bottomLine || (a as any).movementAnalysis?.oneLinerSummary || "",
      analyzedAt: a.analyzedAt,
    }));
}
