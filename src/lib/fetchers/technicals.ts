import type { FetchResult, TechnicalData, OHLCV } from "@/lib/types";

function calculateSMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(closes.length - period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateRSI(closes: number[], period: number = 14): number | null {
  if (closes.length < period + 1) return null;

  let avgGain = 0;
  let avgLoss = 0;

  // First average
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function findSupportResistance(ohlcv: OHLCV[]): {
  support1: number | null;
  support2: number | null;
  resistance1: number | null;
  resistance2: number | null;
} {
  if (ohlcv.length < 20) {
    return { support1: null, support2: null, resistance1: null, resistance2: null };
  }

  const recent = ohlcv.slice(-60);
  const currentPrice = recent[recent.length - 1].close;
  const lows = recent.map((c) => c.low).sort((a, b) => a - b);
  const highs = recent.map((c) => c.high).sort((a, b) => b - a);

  // Find support levels below current price
  const supportsBelow = lows.filter((l) => l < currentPrice);
  // Find resistance levels above current price
  const resistanceAbove = highs.filter((h) => h > currentPrice);

  return {
    support1: supportsBelow.length > 0 ? supportsBelow[Math.floor(supportsBelow.length * 0.3)] : null,
    support2: supportsBelow.length > 0 ? supportsBelow[Math.floor(supportsBelow.length * 0.1)] : null,
    resistance1: resistanceAbove.length > 0 ? resistanceAbove[Math.floor(resistanceAbove.length * 0.3)] : null,
    resistance2: resistanceAbove.length > 0 ? resistanceAbove[Math.floor(resistanceAbove.length * 0.1)] : null,
  };
}

export function calculateTechnicals(ohlcv: OHLCV[]): FetchResult<TechnicalData> {
  const fetchedAt = new Date().toISOString();

  if (!ohlcv || ohlcv.length < 14) {
    return {
      success: false,
      data: null,
      error: "Insufficient OHLCV data (need at least 14 data points)",
      source: "calculated_from_yahoo",
      fetchedAt,
    };
  }

  const closes = ohlcv.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];
  const insufficientHistory: string[] = [];

  // DMA calculations with explicit guards
  const canCalculate50DMA = ohlcv.length >= 50;
  const canCalculate200DMA = ohlcv.length >= 200;
  const canCalculateRSI = ohlcv.length >= 15; // 14 + 1

  const dma50 = canCalculate50DMA ? calculateSMA(closes, 50) : null;
  const dma200 = canCalculate200DMA ? calculateSMA(closes, 200) : null;
  const rsi14 = canCalculateRSI ? calculateRSI(closes, 14) : null;

  if (!canCalculate50DMA) insufficientHistory.push("50-DMA (need 50 days, have " + ohlcv.length + ")");
  if (!canCalculate200DMA) insufficientHistory.push("200-DMA (need 200 days, have " + ohlcv.length + ")");
  if (!canCalculateRSI) insufficientHistory.push("RSI (need 15 days, have " + ohlcv.length + ")");

  // Volume analysis
  const volumes = ohlcv.map((c) => c.volume);
  const avgVolume30d = ohlcv.length >= 30
    ? volumes.slice(-30).reduce((a, b) => a + b, 0) / 30
    : null;
  const latestVolume = volumes[volumes.length - 1];

  // Support/Resistance
  const levels = findSupportResistance(ohlcv);

  // Signals
  let priceVs50DMA: string | null = null;
  if (dma50 !== null) {
    const pct = ((currentPrice - dma50) / dma50) * 100;
    priceVs50DMA = currentPrice > dma50
      ? `Above 50-DMA (₹${dma50.toFixed(2)}) by ${pct.toFixed(1)}%`
      : `Below 50-DMA (₹${dma50.toFixed(2)}) by ${Math.abs(pct).toFixed(1)}%`;
  }

  let priceVs200DMA: string | null = null;
  if (dma200 !== null) {
    const pct = ((currentPrice - dma200) / dma200) * 100;
    priceVs200DMA = currentPrice > dma200
      ? `Above 200-DMA (₹${dma200.toFixed(2)}) by ${pct.toFixed(1)}%`
      : `Below 200-DMA (₹${dma200.toFixed(2)}) by ${Math.abs(pct).toFixed(1)}%`;
  }

  let rsiSignal: string | null = null;
  if (rsi14 !== null) {
    if (rsi14 > 70) rsiSignal = `Overbought (${rsi14.toFixed(1)})`;
    else if (rsi14 < 30) rsiSignal = `Oversold (${rsi14.toFixed(1)})`;
    else rsiSignal = `Neutral (${rsi14.toFixed(1)})`;
  }

  let volumeSignal: string | null = null;
  if (avgVolume30d !== null && latestVolume !== null) {
    const ratio = latestVolume / avgVolume30d;
    if (ratio > 1.5) volumeSignal = `Above average (${ratio.toFixed(1)}x 30d avg) — strong conviction`;
    else if (ratio < 0.5) volumeSignal = `Below average (${ratio.toFixed(1)}x 30d avg) — low conviction`;
    else volumeSignal = `Near average (${ratio.toFixed(1)}x 30d avg)`;
  }

  return {
    success: true,
    data: {
      dma50: dma50 ? Math.round(dma50 * 100) / 100 : null,
      dma200: dma200 ? Math.round(dma200 * 100) / 100 : null,
      rsi14: rsi14 ? Math.round(rsi14 * 100) / 100 : null,
      currentPrice,
      avgVolume30d: avgVolume30d ? Math.round(avgVolume30d) : null,
      latestVolume,
      ...levels,
      priceVs50DMA,
      priceVs200DMA,
      rsiSignal,
      volumeSignal,
      insufficientHistory,
    },
    error: null,
    source: "calculated_from_yahoo",
    fetchedAt,
  };
}
