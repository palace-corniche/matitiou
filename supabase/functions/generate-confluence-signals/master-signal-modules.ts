// Master Signal Engine - Modular Analysis Components
// This file contains the individual analysis modules used by the Master Signal Engine

interface StandardSignal {
  source: string;
  timestamp: string;
  pair: string;
  timeframe: string;
  signal: 'buy' | 'sell' | 'hold';
  confidence: number;
  strength: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  factors: Array<{
    name: string;
    value: number;
    weight: number;
    contribution: number;
  }>;
}

// Technical Analysis Signal Generation
export async function generateTechnicalSignals(candles: any[], pair: string, timeframe: string): Promise<StandardSignal[]> {
  const signals: StandardSignal[] = [];
  const currentPrice = candles[candles.length - 1].close;
  
  // RSI Analysis
  const rsi = calculateRSI(candles, 14);
  const currentRSI = rsi[rsi.length - 1];
  
  if (currentRSI < 30) {
    signals.push({
      source: 'technical_rsi',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: 'buy',
      confidence: Math.min(0.9, (30 - currentRSI) / 30 * 0.8 + 0.5),
      strength: Math.min(10, (30 - currentRSI) / 5),
      entryPrice: currentPrice,
      stopLoss: currentPrice * 0.99,
      takeProfit: currentPrice * 1.02,
      factors: [
        { name: 'RSI', value: currentRSI, weight: 0.8, contribution: (30 - currentRSI) / 30 }
      ]
    });
  } else if (currentRSI > 70) {
    signals.push({
      source: 'technical_rsi',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: 'sell',
      confidence: Math.min(0.9, (currentRSI - 70) / 30 * 0.8 + 0.5),
      strength: Math.min(10, (currentRSI - 70) / 5),
      entryPrice: currentPrice,
      stopLoss: currentPrice * 1.01,
      takeProfit: currentPrice * 0.98,
      factors: [
        { name: 'RSI', value: currentRSI, weight: 0.8, contribution: (currentRSI - 70) / 30 }
      ]
    });
  }
  
  // MACD Analysis
  const macd = calculateMACD(candles);
  const currentMACD = macd[macd.length - 1];
  
  if (currentMACD.histogram > 0 && currentMACD.macd > currentMACD.signal) {
    signals.push({
      source: 'technical_macd',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: 'buy',
      confidence: Math.min(0.8, Math.abs(currentMACD.histogram) * 1000 + 0.5),
      strength: Math.min(10, Math.abs(currentMACD.histogram) * 5000),
      entryPrice: currentPrice,
      stopLoss: currentPrice * 0.995,
      takeProfit: currentPrice * 1.015,
      factors: [
        { name: 'MACD_Histogram', value: currentMACD.histogram, weight: 0.7, contribution: Math.abs(currentMACD.histogram) * 100 }
      ]
    });
  } else if (currentMACD.histogram < 0 && currentMACD.macd < currentMACD.signal) {
    signals.push({
      source: 'technical_macd',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: 'sell',
      confidence: Math.min(0.8, Math.abs(currentMACD.histogram) * 1000 + 0.5),
      strength: Math.min(10, Math.abs(currentMACD.histogram) * 5000),
      entryPrice: currentPrice,
      stopLoss: currentPrice * 1.005,
      takeProfit: currentPrice * 0.985,
      factors: [
        { name: 'MACD_Histogram', value: currentMACD.histogram, weight: 0.7, contribution: Math.abs(currentMACD.histogram) * 100 }
      ]
    });
  }
  
  // Moving Average Crossover
  const sma20 = calculateSMA(candles, 20);
  const sma50 = calculateSMA(candles, 50);
  const currentSMA20 = sma20[sma20.length - 1];
  const currentSMA50 = sma50[sma50.length - 1];
  const prevSMA20 = sma20[sma20.length - 2];
  const prevSMA50 = sma50[sma50.length - 2];
  
  // Golden Cross
  if (currentSMA20 > currentSMA50 && prevSMA20 <= prevSMA50) {
    signals.push({
      source: 'technical_ma_cross',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: 'buy',
      confidence: 0.75,
      strength: 8,
      entryPrice: currentPrice,
      stopLoss: currentSMA50,
      takeProfit: currentPrice * 1.02,
      factors: [
        { name: 'MA_Cross', value: (currentSMA20 - currentSMA50) / currentSMA50, weight: 0.9, contribution: 0.8 }
      ]
    });
  }
  
  // Death Cross
  if (currentSMA20 < currentSMA50 && prevSMA20 >= prevSMA50) {
    signals.push({
      source: 'technical_ma_cross',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: 'sell',
      confidence: 0.75,
      strength: 8,
      entryPrice: currentPrice,
      stopLoss: currentSMA50,
      takeProfit: currentPrice * 0.98,
      factors: [
        { name: 'MA_Cross', value: (currentSMA50 - currentSMA20) / currentSMA20, weight: 0.9, contribution: 0.8 }
      ]
    });
  }
  
  return signals;
}

// Fundamental Analysis Signal Generation (placeholder)
export async function generateFundamentalSignals(candles: any[], pair: string, timeframe: string): Promise<StandardSignal[]> {
  // This would integrate with news APIs, economic calendars, etc.
  // For now, return empty array
  return [];
}

// Pattern Recognition Signal Generation
export async function generatePatternSignals(candles: any[], pair: string, timeframe: string): Promise<StandardSignal[]> {
  const signals: StandardSignal[] = [];
  const currentPrice = candles[candles.length - 1].close;
  
  // Simple support/resistance pattern
  const highs = candles.slice(-20).map(c => c.high);
  const lows = candles.slice(-20).map(c => c.low);
  const resistance = Math.max(...highs);
  const support = Math.min(...lows);
  
  // Breakout detection
  if (currentPrice > resistance * 0.999) {
    signals.push({
      source: 'pattern_breakout',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: 'buy',
      confidence: 0.7,
      strength: 7,
      entryPrice: currentPrice,
      stopLoss: resistance * 0.995,
      takeProfit: currentPrice * 1.015,
      factors: [
        { name: 'Resistance_Breakout', value: (currentPrice - resistance) / resistance, weight: 0.8, contribution: 0.7 }
      ]
    });
  }
  
  if (currentPrice < support * 1.001) {
    signals.push({
      source: 'pattern_breakdown',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: 'sell',
      confidence: 0.7,
      strength: 7,
      entryPrice: currentPrice,
      stopLoss: support * 1.005,
      takeProfit: currentPrice * 0.985,
      factors: [
        { name: 'Support_Breakdown', value: (support - currentPrice) / support, weight: 0.8, contribution: 0.7 }
      ]
    });
  }
  
  return signals;
}

// Bayesian Signal Fusion Engine
export async function fuseSignalsWithBayesian(modularResults: any): Promise<any> {
  const signals = modularResults.allSignals;
  
  if (signals.length === 0) {
    return null;
  }
  
  // Convert signals to log-odds for Bayesian fusion
  const buySignals = signals.filter(s => s.signal === 'buy');
  const sellSignals = signals.filter(s => s.signal === 'sell');
  
  // Calculate weighted log-odds
  const buyLogOdds = buySignals.reduce((sum, signal) => {
    const odds = signal.confidence / (1 - signal.confidence);
    return sum + Math.log(odds) * signal.strength / 10;
  }, 0);
  
  const sellLogOdds = sellSignals.reduce((sum, signal) => {
    const odds = signal.confidence / (1 - signal.confidence);
    return sum + Math.log(odds) * signal.strength / 10;
  }, 0);
  
  // Combined probability
  const netLogOdds = buyLogOdds - sellLogOdds;
  const combinedProbability = 1 / (1 + Math.exp(-netLogOdds));
  
  // Calculate entropy (uncertainty measure)
  const entropy = -combinedProbability * Math.log2(combinedProbability) - 
                  (1 - combinedProbability) * Math.log2(1 - combinedProbability);
  
  // Determine signal direction
  const masterSignal = combinedProbability > 0.6 ? 'buy' : 
                      combinedProbability < 0.4 ? 'sell' : 'hold';
  
  // Calculate consensus level
  const consensusLevel = Math.abs(combinedProbability - 0.5) * 2;
  
  // Risk management
  const avgEntry = signals.reduce((sum, s) => sum + s.entryPrice, 0) / signals.length;
  const avgStop = signals.reduce((sum, s) => sum + s.stopLoss, 0) / signals.length;
  const avgTarget = signals.reduce((sum, s) => sum + s.takeProfit, 0) / signals.length;
  
  const riskRewardRatio = masterSignal === 'buy' ? 
    (avgTarget - avgEntry) / (avgEntry - avgStop) :
    (avgEntry - avgTarget) / (avgStop - avgEntry);
  
  // Kelly Criterion for position sizing
  const winRate = Math.max(0.4, combinedProbability);
  const kellyFraction = Math.max(0, (winRate * riskRewardRatio - (1 - winRate)) / riskRewardRatio);
  
  return {
    signal: masterSignal,
    probability: combinedProbability,
    confidence: consensusLevel,
    strength: Math.min(10, Math.max(1, (buySignals.length + sellSignals.length) * consensusLevel)),
    entryPrice: avgEntry,
    stopLoss: avgStop,
    takeProfit: avgTarget,
    riskRewardRatio,
    kellyFraction: Math.min(0.25, kellyFraction), // Cap at 25%
    entropy,
    consensusLevel,
    reasoning: `Bayesian fusion of ${signals.length} signals (${buySignals.length} buy, ${sellSignals.length} sell)`,
    warnings: entropy > 0.8 ? ['High uncertainty detected'] : [],
    contributingSignals: signals
  };
}

// Signal Diagnostics Engine
export async function generateSignalDiagnostics(modularResults: any, fusionResults: any): Promise<any> {
  const diagnostics = {
    modulePerformance: modularResults.modulePerformance,
    dataQuality: calculateDataQuality(modularResults),
    signalDiversity: calculateSignalDiversity(modularResults.allSignals),
    processingTime: Date.now(),
    warnings: [],
    recommendations: []
  };
  
  // Data quality checks
  if (modularResults.totalSignals === 0) {
    diagnostics.warnings.push('No signals generated from any module');
    diagnostics.recommendations.push('Check technical indicator calculations');
  }
  
  if (modularResults.activeModules < 2) {
    diagnostics.warnings.push('Limited signal diversity - only one module active');
    diagnostics.recommendations.push('Activate additional analysis modules');
  }
  
  if (fusionResults?.entropy > 0.85) {
    diagnostics.warnings.push('High signal uncertainty detected');
    diagnostics.recommendations.push('Wait for clearer market conditions');
  }
  
  return diagnostics;
}

// Helper Functions
function calculateDataQuality(modularResults: any): number {
  const totalModules = modularResults.modulePerformance.length;
  const activeModules = modularResults.modulePerformance.filter(m => m.status === 'active').length;
  const signalDensity = modularResults.totalSignals / Math.max(1, activeModules);
  
  return Math.min(1, (activeModules / totalModules) * 0.6 + Math.min(1, signalDensity / 3) * 0.4);
}

function calculateSignalDiversity(signals: StandardSignal[]): number {
  const sources = new Set(signals.map(s => s.source));
  const signalTypes = new Set(signals.map(s => s.signal));
  
  return (sources.size * signalTypes.size) / Math.max(1, signals.length);
}

// Technical Indicator Calculations (simplified for edge function)
function calculateRSI(candles: any[], period: number = 14): number[] {
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  const rsi: number[] = [];
  
  for (let i = period - 1; i < gains.length; i++) {
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
    
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
}

function calculateMACD(candles: any[]): Array<{macd: number, signal: number, histogram: number}> {
  const ema12 = calculateEMA(candles.map(c => c.close), 12);
  const ema26 = calculateEMA(candles.map(c => c.close), 26);
  
  const macdLine = ema12.map((val, i) => val - ema26[i]);
  const signalLine = calculateEMA(macdLine, 9);
  
  return macdLine.map((macd, i) => ({
    macd,
    signal: signalLine[i],
    histogram: macd - signalLine[i]
  }));
}

function calculateSMA(candles: any[], period: number): number[] {
  const sma: number[] = [];
  
  for (let i = period - 1; i < candles.length; i++) {
    const sum = candles.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + candle.close, 0);
    sma.push(sum / period);
  }
  
  return sma;
}

function calculateEMA(values: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  ema[0] = values[0];
  
  for (let i = 1; i < values.length; i++) {
    ema[i] = (values[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
  }
  
  return ema;
}