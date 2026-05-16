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
  Calendar,
  BarChart3,
  Shield,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { getAnalysis } from "@/lib/store";
import type { StockAnalysis, SourceCitation } from "@/lib/types";

function SourceLinks({ sources }: { sources?: SourceCitation[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-4 pt-3 border-t border-border/30 space-y-1.5">
      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Sources</p>
      {sources.map((s, i) => (
        <a
          key={i}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] font-mono text-primary/70 hover:text-primary transition-colors group"
        >
          <ExternalLink className="w-3 h-3 shrink-0 group-hover:scale-110 transition-transform" />
          <span className="truncate">{s.title}</span>
        </a>
      ))}
    </div>
  );
}

function DataCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`p-4 bg-card border border-border rounded ${className || ""}`}>
      <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">{label}</h4>
      <p className="text-sm font-medium leading-relaxed">{value || "data unavailable"}</p>
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
        <Link href="/" className="mt-4 px-4 py-2 bg-primary text-primary-foreground font-bold rounded uppercase text-sm">
          Return to Terminal
        </Link>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = analysis as any;
  const cs = a.catalystSentiment || {};
  const fs = a.fundamentalSnapshot || {};
  const val = fs.valuation || {};
  const fin = fs.financials || {};
  const bs = fs.balanceSheet || {};
  const rf = fs.redFlags || {};
  const cc = a.catalystCalendar || {};
  const ts = a.technicalSetup || {};
  const pf = a.priceFramework || {};
  const risks = a.riskRegister || [];

  return (
    <div className="min-h-dvh pb-24">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-3">
              <span className="font-mono text-xl font-bold text-primary">{a.ticker}</span>
              <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">{a.exchange || "NSE"}</span>
            </div>
          </div>
          <div className="hidden md:block font-mono text-xs text-muted-foreground">
            GENERATED {format(new Date(a.analyzedAt), "dd MMM yyyy HH:mm 'IST'")}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-12">
        {/* Company Header */}
        <section className="border-b border-border pb-8">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">{a.companyName}</h1>
          <p className="text-muted-foreground font-mono uppercase tracking-widest text-sm flex items-center gap-2">
            <Briefcase className="w-4 h-4" /> {a.sector}
          </p>
        </section>

        {/* ── SECTION 1: Catalyst & Sentiment ── */}
        <section className="space-y-6">
          <h2 className="text-xl font-mono uppercase tracking-widest text-primary flex items-center gap-2 border-l-4 border-primary pl-4">
            <Activity className="w-5 h-5" /> Catalyst & Sentiment
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-border p-6 rounded">
              <h3 className="text-xs font-mono text-muted-foreground uppercase mb-4 tracking-wider">Social Narrative</h3>
              <p className="text-sm leading-relaxed">{cs.socialNarrative}</p>
            </div>
            <div className="bg-card border border-border p-6 rounded">
              <h3 className="text-xs font-mono text-muted-foreground uppercase mb-4 tracking-wider">Actual Catalyst</h3>
              <p className="text-sm leading-relaxed">{cs.actualCatalyst}</p>
            </div>
            <div className="bg-card border border-border p-6 rounded">
              <h3 className="text-xs font-mono text-muted-foreground uppercase mb-4 tracking-wider">Institutional View</h3>
              <p className="text-sm leading-relaxed">{cs.institutionalView}</p>
            </div>
          </div>
          <div className="bg-primary/10 border border-primary/20 p-6 rounded">
            <strong className="text-primary font-mono uppercase text-sm tracking-wider block mb-2">The Bottom Line</strong>
            <p className="text-lg font-medium leading-relaxed">{cs.bottomLine}</p>
          </div>
          <SourceLinks sources={cs.sources} />
        </section>

        {/* ── SECTION 2: Fundamental Snapshot ── */}
        <section className="space-y-6 pt-8 border-t border-border/50">
          <h2 className="text-xl font-mono uppercase tracking-widest text-primary flex items-center gap-2 border-l-4 border-primary pl-4">
            <PieChart className="w-5 h-5" /> Fundamental Snapshot
          </h2>

          {/* Valuation */}
          <div>
            <h3 className="text-sm font-mono text-muted-foreground uppercase mb-3 tracking-wider">Valuation</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <DataCard label="Current Price" value={val.currentPrice} />
              <DataCard label="52-Week Range" value={val.fiftyTwoWeek} />
              <DataCard label="Market Cap" value={val.marketCap} />
              <DataCard label="30D Performance" value={val.performance30d} />
              <DataCard label="1Y Performance" value={val.performance1y} />
              <DataCard label="Forward P/E" value={val.forwardPE} />
              <DataCard label="EV/EBITDA" value={val.evEbitda} />
              <DataCard label="Price/Book" value={val.priceBook} />
            </div>
          </div>

          {/* Financials */}
          <div>
            <h3 className="text-sm font-mono text-muted-foreground uppercase mb-3 tracking-wider">
              Financials {fin.quarter && <span className="text-primary">({fin.quarter})</span>}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <DataCard label="Revenue" value={fin.revenue} />
              <DataCard label="EBITDA" value={fin.ebitda} />
              <DataCard label="EBITDA Margin" value={fin.ebitdaMargin} />
              <DataCard label="PAT" value={fin.pat} />
              <DataCard label="EPS (Trailing)" value={fin.epsTrailing} />
              <DataCard label="EPS (Forward)" value={fin.epsForward} />
            </div>
          </div>

          {/* Balance Sheet */}
          <div>
            <h3 className="text-sm font-mono text-muted-foreground uppercase mb-3 tracking-wider">Balance Sheet</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <DataCard label="Total Debt" value={bs.totalDebt} />
              <DataCard label="Cash & Equiv." value={bs.cashEquivalents} />
              <DataCard label="Net Debt" value={bs.netDebt} />
              <DataCard label="Debt/Equity" value={bs.debtEquity} />
              <DataCard label="Interest Coverage" value={bs.interestCoverage} />
              <DataCard label="Share Count" value={bs.shareCount} />
              <DataCard label="Dilution" value={bs.dilution} />
            </div>
          </div>

          {/* Red Flags */}
          <div>
            <h3 className="text-sm font-mono text-destructive uppercase mb-3 tracking-wider flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> India-Specific Red Flags
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <DataCard label="Promoter Holding" value={rf.promoterHolding} className="border-destructive/20" />
              <DataCard label="Promoter Pledge" value={rf.promoterPledge} className="border-destructive/20" />
              <DataCard label="FII Holding Change" value={rf.fiiChange} className="border-destructive/20" />
              <DataCard label="DII Holding Change" value={rf.diiChange} className="border-destructive/20" />
              <DataCard label="Related Party" value={rf.relatedParty} className="border-destructive/20" />
            </div>
          </div>

          {/* Fair Value */}
          <div className="bg-secondary p-6 rounded border border-border">
            <h3 className="text-xs font-mono text-muted-foreground uppercase mb-4 tracking-wider">Fair Value Assessment (with math)</h3>
            <p className="text-sm leading-relaxed whitespace-pre-line">{fs.fairValueAssessment}</p>
          </div>

          <SourceLinks sources={fs.sources} />
        </section>

        {/* ── SECTION 3: Catalyst Calendar ── */}
        <section className="space-y-6 pt-8 border-t border-border/50">
          <h2 className="text-xl font-mono uppercase tracking-widest text-primary flex items-center gap-2 border-l-4 border-primary pl-4">
            <Calendar className="w-5 h-5" /> Catalyst Calendar
          </h2>
          {cc.events && cc.events.length > 0 ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {cc.events.map((ev: any, idx: number) => (
                <div key={idx} className="flex items-start gap-4 p-4 bg-card border border-border rounded">
                  <div className="font-mono text-xs text-primary bg-primary/10 px-2 py-1 rounded whitespace-nowrap">{ev.date}</div>
                  <div>
                    <p className="text-sm font-medium">{ev.event}</p>
                    <p className="text-xs text-muted-foreground mt-1">{ev.details}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming events found.</p>
          )}
          <SourceLinks sources={cc.sources} />
        </section>

        {/* ── SECTION 4: Technical Setup ── */}
        <section className="space-y-6 pt-8 border-t border-border/50">
          <h2 className="text-xl font-mono uppercase tracking-widest text-primary flex items-center gap-2 border-l-4 border-primary pl-4">
            <BarChart3 className="w-5 h-5" /> Technical Setup
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <DataCard label="50-DMA" value={ts.dma50} />
            <DataCard label="200-DMA" value={ts.dma200} />
            <DataCard label="Price vs DMA" value={ts.priceVsDMA} />
            <DataCard label="RSI (14)" value={ts.rsi} />
            <DataCard label="Support 1" value={ts.support1} className="border-emerald-500/20" />
            <DataCard label="Support 2" value={ts.support2} className="border-emerald-500/20" />
            <DataCard label="Resistance 1" value={ts.resistance1} className="border-red-500/20" />
            <DataCard label="Resistance 2" value={ts.resistance2} className="border-red-500/20" />
          </div>
          <DataCard label="Volume Analysis" value={ts.volumeAnalysis} />
          <SourceLinks sources={ts.sources} />
        </section>

        {/* ── SECTION 5: Price Framework ── */}
        <section className="space-y-6 pt-8 border-t border-border/50">
          <h2 className="text-xl font-mono uppercase tracking-widest text-primary flex items-center gap-2 border-l-4 border-primary pl-4">
            <DollarSign className="w-5 h-5" /> Price Framework
          </h2>

          {/* Scenarios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(pf.scenarios || []).map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (s: any, idx: number) => (
                <div key={idx} className="bg-card border border-border rounded p-5 relative overflow-hidden hover:border-primary/50 transition-colors">
                  <div className={`absolute top-0 left-0 w-1 h-full ${
                    s.label === "Bear Case" ? "bg-red-500"
                    : s.label === "Base Case" ? "bg-primary"
                    : s.label === "Bull Case" ? "bg-emerald-500"
                    : "bg-teal-400"
                  }`} />
                  <h3 className="text-xs font-mono text-muted-foreground uppercase mb-1">{s.label}</h3>
                  <div className="text-xs font-mono bg-secondary inline-block px-2 py-0.5 rounded mb-3">{s.timeframe}</div>
                  <div className="text-2xl font-bold font-mono mb-2 text-foreground">{s.price}</div>
                  <div className="text-[10px] font-mono text-muted-foreground mb-2">
                    {s.multipleUsed} × {s.epsUsed}
                  </div>
                  <p className="text-xs text-muted-foreground">{s.rationale}</p>
                </div>
              )
            )}
          </div>

          {/* Entry / Trim / Stop */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded">
              <h4 className="text-xs font-mono text-emerald-500 uppercase mb-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Entry Zone
              </h4>
              <p className="font-mono text-sm">{pf.entryZone}</p>
            </div>
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded">
              <h4 className="text-xs font-mono text-amber-500 uppercase mb-1">Trim Levels</h4>
              <p className="font-mono text-sm">{pf.trimLevels}</p>
            </div>
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded">
              <h4 className="text-xs font-mono text-destructive uppercase mb-1 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> Hard Stop
              </h4>
              <p className="font-mono text-sm">{pf.hardStop}</p>
            </div>
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded">
              <h4 className="text-xs font-mono text-blue-400 uppercase mb-1">Position Sizing</h4>
              <p className="font-mono text-sm">{pf.positionSizing}</p>
            </div>
          </div>

          <SourceLinks sources={pf.sources} />
        </section>

        {/* ── SECTION 6: Risk Register ── */}
        <section className="space-y-6 pt-8 border-t border-border/50">
          <h2 className="text-xl font-mono uppercase tracking-widest text-primary flex items-center gap-2 border-l-4 border-primary pl-4">
            <Shield className="w-5 h-5" /> Risk Register
          </h2>
          {risks.length > 0 ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {risks.map((risk: any, idx: number) => {
                const probColor = risk.probability === "High" ? "text-red-400 bg-red-500/10" : risk.probability === "Medium" ? "text-amber-400 bg-amber-500/10" : "text-emerald-400 bg-emerald-500/10";
                const impactColor = risk.impact === "High" ? "text-red-400 bg-red-500/10" : risk.impact === "Medium" ? "text-amber-400 bg-amber-500/10" : "text-emerald-400 bg-emerald-500/10";

                return (
                  <div key={idx} className="p-4 bg-card border border-border rounded">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium mb-1">{risk.name}</h4>
                        <p className="text-xs text-muted-foreground">{risk.mitigant}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${probColor}`}>
                          P: {risk.probability}
                        </span>
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${impactColor}`}>
                          I: {risk.impact}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No risks identified.</p>
          )}
        </section>
      </main>
    </div>
  );
}
