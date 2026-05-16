// ── FetchResult wrapper ──────────────────────────────────────────────
export type FetchResult<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
  source: string;
  fetchedAt: string;
};

// ── Yahoo Finance types ──────────────────────────────────────────────
export interface YahooPrice {
  currentPrice: number;
  marketCap: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  currency: string;
}

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ── Technical indicators ─────────────────────────────────────────────
export interface TechnicalData {
  dma50: number | null;
  dma200: number | null;
  rsi14: number | null;
  currentPrice: number;
  avgVolume30d: number | null;
  latestVolume: number | null;
  support1: number | null;
  support2: number | null;
  resistance1: number | null;
  resistance2: number | null;
  priceVs50DMA: string | null;
  priceVs200DMA: string | null;
  rsiSignal: string | null;
  volumeSignal: string | null;
  insufficientHistory: string[];
}

// ── Screener.in / Apify types ────────────────────────────────────────
export interface ScreenerData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
  companyName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quarterlyResults: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  balanceSheet: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ratios: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shareholding: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  peerComparison: any[];
}

// ── Tavily types ─────────────────────────────────────────────────────
export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

// ── Analysis report (stored in localStorage) ─────────────────────────
export interface SourceCitation {
  title: string;
  url: string;
  section: string;
}

export interface ScenarioTarget {
  label: string;
  timeframe: string;
  price: string;
  multipleUsed: string;
  epsUsed: string;
  rationale: string;
}

export interface RiskItem {
  name: string;
  probability: string;
  impact: string;
  mitigant: string;
}

export interface StockAnalysis {
  id: string;
  ticker: string;
  companyName: string;
  exchange: string;
  sector: string;

  // Section 1
  catalystSentiment: {
    socialNarrative: string;
    actualCatalyst: string;
    institutionalView: string;
    bottomLine: string;
    sources: SourceCitation[];
  };

  // Section 2
  fundamentalSnapshot: {
    valuation: {
      currentPrice: string;
      fiftyTwoWeek: string;
      marketCap: string;
      performance30d: string;
      performance1y: string;
      forwardPE: string;
      evEbitda: string;
      priceBook: string;
    };
    financials: {
      quarter: string;
      revenue: string;
      ebitda: string;
      ebitdaMargin: string;
      pat: string;
      epsTrailing: string;
      epsForward: string;
    };
    balanceSheet: {
      totalDebt: string;
      cashEquivalents: string;
      netDebt: string;
      debtEquity: string;
      interestCoverage: string;
      shareCount: string;
      dilution: string;
    };
    redFlags: {
      promoterHolding: string;
      promoterPledge: string;
      fiiChange: string;
      diiChange: string;
      relatedParty: string;
    };
    fairValueAssessment: string;
    sources: SourceCitation[];
  };

  // Section 3
  catalystCalendar: {
    events: Array<{
      date: string;
      event: string;
      details: string;
    }>;
    sources: SourceCitation[];
  };

  // Section 4
  technicalSetup: {
    dma50: string;
    dma200: string;
    priceVsDMA: string;
    support1: string;
    support2: string;
    resistance1: string;
    resistance2: string;
    volumeAnalysis: string;
    rsi: string;
    sources: SourceCitation[];
  };

  // Section 5
  priceFramework: {
    scenarios: ScenarioTarget[];
    entryZone: string;
    trimLevels: string;
    hardStop: string;
    positionSizing: string;
    sources: SourceCitation[];
  };

  // Section 6
  riskRegister: RiskItem[];

  // Backward compat — old analyses may have this shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movementAnalysis?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  priceTargetFramework?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sources?: any[];

  analyzedAt: string;
}

export interface StockAnalysisSummary {
  id: string;
  ticker: string;
  companyName: string;
  exchange: string;
  sector: string;
  oneLinerSummary: string;
  analyzedAt: string;
}
