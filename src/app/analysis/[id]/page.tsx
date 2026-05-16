"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  Loader2,
  Activity,
  PieChart,
  DollarSign,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { getAnalysis } from "@/lib/store";
import type { StockAnalysis } from "@/lib/types";

interface FieldSource {
  title: string;
  url: string;
}

function SourceLinks({ sources }: { sources?: FieldSource[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-3 pt-2 border-t border-border/30 space-y-1">
      {sources.map((s, i) => (
        <a
          key={i}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[10px] font-mono text-primary/70 hover:text-primary transition-colors group"
        >
          <ExternalLink className="w-3 h-3 shrink-0 group-hover:scale-110 transition-transform" />
          <span className="truncate">{s.title}</span>
        </a>
      ))}
    </div>
  );
}

export default function AnalysisPage() {
  const params = useParams();
  const id = params.id as string;
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const data = getAnalysis(id);
      setAnalysis(data);
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <h1 className="text-2xl font-bold">Analysis Not Found</h1>
        <p className="text-muted-foreground">
          The requested research report could not be found or has expired.
        </p>
        <Link
          href="/"
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground font-bold rounded uppercase text-sm"
        >
          Return to Terminal
        </Link>
      </div>
    );
  }

  const { movementAnalysis, fundamentalSnapshot, priceTargetFramework } = analysis;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fs = (analysis as any).fieldSources || {};

  return (
    <div className="min-h-dvh pb-24">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-3">
              <span className="font-mono text-xl font-bold text-primary">
                {analysis.ticker}
              </span>
              <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                {analysis.exchange}
              </span>
            </div>
          </div>
          <div className="hidden md:block font-mono text-xs text-muted-foreground">
            GENERATED{" "}
            {format(new Date(analysis.analyzedAt), "dd MMM yyyy HH:mm 'IST'")}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-12">
        {/* Company Header */}
        <section className="border-b border-border pb-8">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">
            {analysis.companyName}
          </h1>
          <p className="text-muted-foreground font-mono uppercase tracking-widest text-sm flex items-center gap-2">
            <Briefcase className="w-4 h-4" /> {analysis.sector}
          </p>
        </section>

        {/* Section 1: Catalyst & Sentiment */}
        <section className="space-y-6">
          <h2 className="text-xl font-mono uppercase tracking-widest text-primary flex items-center gap-2 border-l-4 border-primary pl-4">
            <Activity className="w-5 h-5" /> Catalyst & Sentiment
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-border p-6 rounded">
              <h3 className="text-xs font-mono text-muted-foreground uppercase mb-4 tracking-wider">
                Social Narrative
              </h3>
              <p className="text-sm leading-relaxed">{movementAnalysis.socialNarrative}</p>
              <SourceLinks sources={fs.socialNarrative} />
            </div>
            <div className="bg-card border border-border p-6 rounded">
              <h3 className="text-xs font-mono text-muted-foreground uppercase mb-4 tracking-wider">
                Actual Catalyst
              </h3>
              <p className="text-sm leading-relaxed">{movementAnalysis.actualCatalyst}</p>
              <SourceLinks sources={fs.actualCatalyst} />
            </div>
            <div className="bg-card border border-border p-6 rounded">
              <h3 className="text-xs font-mono text-muted-foreground uppercase mb-4 tracking-wider">
                Institutional View
              </h3>
              <p className="text-sm leading-relaxed">{movementAnalysis.institutionalView}</p>
              <SourceLinks sources={fs.institutionalView} />
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/20 p-6 rounded">
            <p className="text-lg md:text-xl font-medium leading-relaxed">
              <strong className="text-primary font-mono uppercase text-sm tracking-wider block mb-2">
                The Bottom Line
              </strong>
              <span>{movementAnalysis.oneLinerSummary}</span>
            </p>
          </div>
        </section>

        {/* Section 2: Fundamental Snapshot */}
        <section className="space-y-6 pt-8 border-t border-border/50">
          <h2 className="text-xl font-mono uppercase tracking-widest text-primary flex items-center gap-2 border-l-4 border-primary pl-4">
            <PieChart className="w-5 h-5" /> Fundamental Snapshot
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-card border border-border rounded">
              <h3 className="text-xs font-mono text-muted-foreground uppercase mb-2">Price & MCap</h3>
              <p className="text-sm font-medium">{fundamentalSnapshot.priceAndMarketCap}</p>
              <SourceLinks sources={fs.priceAndMarketCap} />
            </div>
            <div className="p-5 bg-card border border-border rounded">
              <h3 className="text-xs font-mono text-muted-foreground uppercase mb-2">Valuation</h3>
              <p className="text-sm font-medium">{fundamentalSnapshot.valuationMultiples}</p>
              <SourceLinks sources={fs.valuationMultiples} />
            </div>
            <div className="p-5 bg-card border border-border rounded">
              <h3 className="text-xs font-mono text-muted-foreground uppercase mb-2">Growth</h3>
              <p className="text-sm font-medium">{fundamentalSnapshot.growthMetrics}</p>
              <SourceLinks sources={fs.growthMetrics} />
            </div>
            <div className="p-5 bg-card border border-border rounded">
              <h3 className="text-xs font-mono text-muted-foreground uppercase mb-2">Balance Sheet</h3>
              <p className="text-sm font-medium">{fundamentalSnapshot.balanceSheet}</p>
              <SourceLinks sources={fs.balanceSheet} />
            </div>
          </div>

          <div className="bg-secondary p-6 rounded border border-border">
            <h3 className="text-xs font-mono text-muted-foreground uppercase mb-4 tracking-wider">
              Fair Value Assessment
            </h3>
            <p className="text-sm leading-relaxed">{fundamentalSnapshot.fairValueAssessment}</p>
            <SourceLinks sources={fs.fairValueAssessment} />
          </div>
        </section>

        {/* Section 3: Price Framework */}
        <section className="space-y-6 pt-8 border-t border-border/50">
          <h2 className="text-xl font-mono uppercase tracking-widest text-primary flex items-center gap-2 border-l-4 border-primary pl-4">
            <DollarSign className="w-5 h-5" /> Price Framework
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {priceTargetFramework.scenarios.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (scenario: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-card border border-border rounded p-5 relative overflow-hidden group hover:border-primary/50 transition-colors"
                >
                  <div
                    className={`absolute top-0 left-0 w-1 h-full ${
                      scenario.label === "Bear Case"
                        ? "bg-red-500"
                        : scenario.label === "Base Case"
                          ? "bg-primary"
                          : scenario.label === "Bull Case"
                            ? "bg-emerald-500"
                            : "bg-teal-400"
                    }`}
                  />
                  <h3 className="text-xs font-mono text-muted-foreground uppercase mb-1">
                    {scenario.label}
                  </h3>
                  <div className="text-xs font-mono bg-secondary inline-block px-2 py-0.5 rounded mb-4">
                    {scenario.timeframe}
                  </div>
                  <div className="text-2xl font-bold font-mono mb-4 text-foreground">
                    {scenario.price}
                  </div>
                  <p className="text-xs text-muted-foreground">{scenario.rationale}</p>
                  <SourceLinks sources={fs.priceTargets} />
                </div>
              )
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded">
              <h4 className="text-xs font-mono text-emerald-500 uppercase mb-1">Entry Zone</h4>
              <p className="font-mono text-lg">{priceTargetFramework.entryZone}</p>
              <SourceLinks sources={fs.entryZone} />
            </div>
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded">
              <h4 className="text-xs font-mono text-amber-500 uppercase mb-1">Trim Levels</h4>
              <p className="font-mono text-lg">{priceTargetFramework.trimLevels}</p>
              <SourceLinks sources={fs.priceTargets} />
            </div>
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded">
              <h4 className="text-xs font-mono text-destructive uppercase mb-1">Hard Stop</h4>
              <p className="font-mono text-lg">{priceTargetFramework.hardStop}</p>
              <SourceLinks sources={fs.hardStop} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
