"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  TrendingUp,
  BarChart2,
  Clock,
  Loader2,
  Briefcase,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { saveAnalysis, getRecentAnalyses } from "@/lib/store";
import type { StockAnalysis, StockAnalysisSummary } from "@/lib/types";

export default function Home() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<StockAnalysisSummary[]>(
    []
  );
  const router = useRouter();

  useEffect(() => {
    setRecentAnalyses(getRecentAnalyses());
  }, []);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stocks/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error || `Analysis failed (${res.status})`
        );
      }

      const analysis: StockAnalysis = await res.json();
      saveAnalysis(analysis);
      router.push(`/analysis/${analysis.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col w-full">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">
            <TrendingUp size={20} />
          </div>
          <span className="font-bold text-lg tracking-tight uppercase">
            India Stock Analyst
          </span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-12 md:py-24">
        {isLoading ? (
          /* Loading State */
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div className="space-y-2">
              <h2 className="text-2xl font-mono text-primary uppercase tracking-widest">
                Researching Markets...
              </h2>
              <p className="text-muted-foreground font-mono text-sm max-w-md mx-auto">
                Fetching live data from Yahoo Finance, Screener.in, and
                Tavily for {query}. Analyzing with Claude AI. This takes 30-60
                seconds.
              </p>
            </div>
            <div className="w-full max-w-md bg-secondary/50 rounded-full h-1 overflow-hidden mt-4">
              <div className="bg-primary h-full rounded-full animate-progress" />
            </div>
          </div>
        ) : (
          <div className="space-y-16">
            {/* Hero + Search */}
            <div className="max-w-3xl space-y-8">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-[1.1]">
                Institutional-grade{" "}
                <span className="text-primary">research</span> for Indian
                equities.
              </h1>

              <form onSubmit={handleSearch} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="w-6 h-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  id="search-input"
                  type="text"
                  placeholder="Enter NSE/BSE ticker or company name..."
                  className="w-full bg-secondary/50 border-2 border-border rounded-lg py-5 pl-14 pr-32 text-lg font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:bg-secondary/80 transition-all shadow-xl"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  id="analyze-button"
                  type="submit"
                  disabled={!query.trim() || isLoading}
                  className="absolute inset-y-2 right-2 px-6 bg-primary text-primary-foreground font-bold rounded uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  Analyze
                </button>
              </form>

              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded text-destructive text-sm font-mono">
                  {error}
                </div>
              )}
            </div>

            {/* Recent Reports */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-muted-foreground border-b border-border/50 pb-4">
                <Clock className="w-4 h-4" />
                <h3 className="font-mono text-sm uppercase tracking-widest">
                  Recent Reports
                </h3>
              </div>

              {recentAnalyses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentAnalyses.map((analysis) => (
                    <a
                      key={analysis.id}
                      href={`/analysis/${analysis.id}`}
                      className="group border border-border bg-card p-6 rounded hover:border-primary/50 transition-colors cursor-pointer space-y-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-lg font-bold group-hover:text-primary transition-colors">
                              {analysis.ticker}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                              {analysis.exchange}
                            </span>
                          </div>
                          <h4 className="text-muted-foreground text-sm font-medium">
                            {analysis.companyName}
                          </h4>
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
                          {formatDistanceToNow(
                            new Date(analysis.analyzedAt),
                            { addSuffix: true }
                          )}
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/80 line-clamp-2">
                        {analysis.oneLinerSummary}
                      </p>
                      <div className="pt-4 border-t border-border/50">
                        <span className="text-xs font-mono text-muted-foreground uppercase flex items-center gap-1.5">
                          <Briefcase className="w-3 h-3" />
                          {analysis.sector}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center border border-dashed border-border rounded">
                  <BarChart2 className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground font-mono">
                    No recent analyses found. Search for a stock above.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
