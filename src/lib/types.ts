export interface MovementAnalysis {
  socialNarrative: string;
  actualCatalyst: string;
  institutionalView: string;
  oneLinerSummary: string;
}

export interface FundamentalSnapshot {
  priceAndMarketCap: string;
  valuationMultiples: string;
  growthMetrics: string;
  balanceSheet: string;
  fairValueAssessment: string;
}

export interface PriceScenario {
  label: string;
  timeframe: string;
  price: string;
  rationale: string;
}

export interface PriceTargetFramework {
  scenarios: PriceScenario[];
  entryZone: string;
  trimLevels: string;
  hardStop: string;
}

export interface SourceCitation {
  title: string;
  url: string;
  section: string;
}

export interface StockAnalysis {
  id: string;
  ticker: string;
  companyName: string;
  exchange: string;
  sector: string;
  movementAnalysis: MovementAnalysis;
  fundamentalSnapshot: FundamentalSnapshot;
  priceTargetFramework: PriceTargetFramework;
  sources: SourceCitation[];
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
