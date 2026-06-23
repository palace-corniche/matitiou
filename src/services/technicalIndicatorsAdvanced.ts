// ============= ADVANCED TECHNICAL INDICATORS SYSTEM =============
// 120+ Technical Indicators with Real-time Calculation Engine

import { CandleData } from './technicalAnalysis';
import { unifiedMarketData, UnifiedTick } from './unifiedMarketData';
import { AdvancedTrendIndicators } from './advancedIndicators';

export interface IndicatorValue {
  name: string;
  value: number | null;
  signal: 'buy' | 'sell' | 'neutral';
  strength: number; // 1-10
  category: 'trend' | 'momentum' | 'volatility' | 'volume' | 'fibonacci' | 'custom';
  timestamp: number;
}

export interface IndicatorConfig {
  period?: number;
  factor?: number;
  deviation?: number;
  enabled: boolean;
  color?: string;
}

export interface IndicatorResult {
  indicators: IndicatorValue[];
  overallSignal: 'buy' | 'sell' | 'neutral';
  overallStrength: number;
  confidence: number;
  timestamp: number;
}

// ============= HELPER: EMA Array =============
function emaArray(data: number[], period: number): number[] {
  const result: number[] = [];
  const m = 2 / (period + 1);
  result[0] = data[0];
  for (let i = 1; i < data.length; i++) {
    result[i] = data[i] * m + result[i - 1] * (1 - m);
  }
  return result;
}

function smaArray(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(0); continue; }
    let s = 0;
    for (let j = i - period + 1; j <= i; j++) s += data[j];
    result.push(s / period);
  }
  return result;
}

function trueRangeArray(candles: CandleData[]): number[] {
  return candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prev = candles[i - 1];
    return Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close));
  });
}

function atrArray(candles: CandleData[], period: number): number[] {
  const tr = trueRangeArray(candles);
  const result: number[] = [];
  let atr = 0;
  for (let i = 0; i < tr.length; i++) {
    if (i === 0) atr = tr[i];
    else atr = ((atr * (period - 1)) + tr[i]) / period;
    result.push(atr);
  }
  return result;
}

function stdDev(data: number[], period: number): number[] {
  const sma = smaArray(data, period);
  return data.map((_, i) => {
    if (i < period - 1) return 0;
    const slice = data.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
    return Math.sqrt(variance);
  });
}

// ============= ENHANCED TECHNICAL INDICATORS ENGINE =============
export class AdvancedTechnicalIndicators {
  private static cache = new Map<string, { result: IndicatorResult; timestamp: number }>();
  private static readonly CACHE_DURATION = 5000;

  // ============= TREND INDICATORS (32+ indicators) =============
  static calculateAllTrendIndicators(candles: CandleData[]): IndicatorValue[] {
    const closePrices = candles.map(c => c.close);
    const indicators: IndicatorValue[] = [];
    const timestamp = Date.now();

    try {
      // Moving Averages Family (12)
      indicators.push(this.calculateSMA(closePrices, 9, 'SMA 9', timestamp));
      indicators.push(this.calculateSMA(closePrices, 20, 'SMA 20', timestamp));
      indicators.push(this.calculateSMA(closePrices, 50, 'SMA 50', timestamp));
      indicators.push(this.calculateSMA(closePrices, 100, 'SMA 100', timestamp));
      indicators.push(this.calculateSMA(closePrices, 200, 'SMA 200', timestamp));
      indicators.push(this.calculateEMA(closePrices, 9, 'EMA 9', timestamp));
      indicators.push(this.calculateEMA(closePrices, 12, 'EMA 12', timestamp));
      indicators.push(this.calculateEMA(closePrices, 20, 'EMA 20', timestamp));
      indicators.push(this.calculateEMA(closePrices, 26, 'EMA 26', timestamp));
      indicators.push(this.calculateEMA(closePrices, 50, 'EMA 50', timestamp));
      indicators.push(this.calculateEMA(closePrices, 100, 'EMA 100', timestamp));
      indicators.push(this.calculateEMA(closePrices, 200, 'EMA 200', timestamp));

      // WMA (3)
      indicators.push(this.calculateWMA(closePrices, 9, 'WMA 9', timestamp));
      indicators.push(this.calculateWMA(closePrices, 20, 'WMA 20', timestamp));
      indicators.push(this.calculateWMA(closePrices, 50, 'WMA 50', timestamp));

      // SMMA (2)
      indicators.push(this.calculateSMMA(closePrices, 9, 'SMMA 9', timestamp));
      indicators.push(this.calculateSMMA(closePrices, 20, 'SMMA 20', timestamp));

      // MACD Family (3)
      indicators.push(this.calculateMACD(closePrices, 12, 26, 9, timestamp));
      indicators.push(this.calculateMACD(closePrices, 5, 35, 5, timestamp));
      indicators.push(this.calculateMACD(closePrices, 19, 39, 9, timestamp));

      // Parabolic SAR
      indicators.push(this.calculateParabolicSAR(candles, 0.02, 0.2, timestamp));

      // SuperTrend
      indicators.push(this.calculateSuperTrend(candles, 10, 3, timestamp));

      // Ichimoku (4 components)
      indicators.push(...this.calculateIchimoku(candles, timestamp));

      // ADX, DMI, Aroon, TRIX
      indicators.push(this.calculateADX(candles, 14, timestamp));
      indicators.push(this.calculateDMI(candles, 14, timestamp));
      indicators.push(this.calculateAroon(candles, 14, timestamp));
      indicators.push(this.calculateTRIX(closePrices, 14, timestamp));

      // NEW: DEMA, TEMA, KAMA, Hull MA, ZLEMA, Vortex, DPO, Coppock, KST, Elder Ray, CMO, Mass Index
      indicators.push(this.calculateDEMA(closePrices, 20, timestamp));
      indicators.push(this.calculateTEMA(closePrices, 20, timestamp));
      indicators.push(this.calculateKAMA(closePrices, 10, 2, 30, timestamp));
      indicators.push(this.calculateHullMA(closePrices, 20, timestamp));
      indicators.push(this.calculateZLEMA(closePrices, 20, timestamp));
      indicators.push(this.calculateVortex(candles, 14, timestamp));
      indicators.push(this.calculateDPO(closePrices, 20, timestamp));
      indicators.push(this.calculateCoppockCurve(closePrices, timestamp));
      indicators.push(this.calculateKST(closePrices, timestamp));
      indicators.push(this.calculateElderRayBull(candles, 13, timestamp));
      indicators.push(this.calculateElderRayBear(candles, 13, timestamp));
      indicators.push(this.calculateCMO(closePrices, 14, timestamp));
      indicators.push(this.calculateMassIndex(candles, 25, timestamp));
    } catch (error) {
      console.error('Error calculating trend indicators:', error);
    }

    return indicators;
  }

  // ============= MOMENTUM INDICATORS (15+ indicators) =============
  static calculateAllMomentumIndicators(candles: CandleData[]): IndicatorValue[] {
    const closePrices = candles.map(c => c.close);
    const indicators: IndicatorValue[] = [];
    const timestamp = Date.now();

    try {
      // RSI Family (3)
      indicators.push(this.calculateRSI(closePrices, 14, 'RSI 14', timestamp));
      indicators.push(this.calculateRSI(closePrices, 9, 'RSI 9', timestamp));
      indicators.push(this.calculateRSI(closePrices, 21, 'RSI 21', timestamp));

      // Stochastic Family (2)
      indicators.push(this.calculateStochastic(candles, 14, 3, 'Stochastic %K', timestamp));
      indicators.push(this.calculateStochasticRSI(closePrices, 14, 'Stoch RSI', timestamp));

      // Williams %R
      indicators.push(this.calculateWilliamsR(candles, 14, timestamp));

      // CCI
      indicators.push(this.calculateCCI(candles, 20, timestamp));

      // ROC (2)
      indicators.push(this.calculateROC(closePrices, 12, 'ROC 12', timestamp));
      indicators.push(this.calculateROC(closePrices, 25, 'ROC 25', timestamp));

      // Momentum (2)
      indicators.push(this.calculateMomentum(closePrices, 10, timestamp));
      indicators.push(this.calculateMomentum(closePrices, 14, timestamp));

      // Ultimate Oscillator
      indicators.push(this.calculateUltimateOscillator(candles, timestamp));

      // Awesome Oscillator
      indicators.push(this.calculateAwesomeOscillator(candles, timestamp));

      // MACD Histogram
      indicators.push(this.calculateMACDHistogram(closePrices, timestamp));
    } catch (error) {
      console.error('Error calculating momentum indicators:', error);
    }

    return indicators;
  }

  // ============= VOLATILITY INDICATORS (12+ indicators) =============
  static calculateAllVolatilityIndicators(candles: CandleData[]): IndicatorValue[] {
    const closePrices = candles.map(c => c.close);
    const indicators: IndicatorValue[] = [];
    const timestamp = Date.now();

    try {
      // Bollinger Bands (3)
      indicators.push(this.calculateBollingerBands(closePrices, 20, 2, '%B', timestamp));
      indicators.push(this.calculateBollingerBands(closePrices, 20, 1.5, 'BB (1.5)', timestamp));
      indicators.push(this.calculateBollingerBands(closePrices, 20, 2.5, 'BB (2.5)', timestamp));

      // ATR (2)
      indicators.push(this.calculateATR(candles, 14, 'ATR 14', timestamp));
      indicators.push(this.calculateATR(candles, 20, 'ATR 20', timestamp));

      // Keltner, Donchian, StdDev, Chaikin Vol
      indicators.push(this.calculateKeltnerChannels(candles, 20, 2, timestamp));
      indicators.push(this.calculateDonchianChannels(candles, 20, timestamp));
      indicators.push(this.calculateStandardDeviation(closePrices, 20, timestamp));
      indicators.push(this.calculateChaikinVolatility(candles, 14, timestamp));

      // NEW: Historical Vol, Ulcer Index, NATR
      indicators.push(this.calculateHistoricalVolatility(closePrices, 20, timestamp));
      indicators.push(this.calculateUlcerIndex(closePrices, 14, timestamp));
      indicators.push(this.calculateNATR(candles, 14, timestamp));
    } catch (error) {
      console.error('Error calculating volatility indicators:', error);
    }

    return indicators;
  }

  // ============= VOLUME INDICATORS (10+ indicators) =============
  static calculateAllVolumeIndicators(candles: CandleData[]): IndicatorValue[] {
    const indicators: IndicatorValue[] = [];
    const timestamp = Date.now();

    try {
      indicators.push(this.calculateOBV(candles, timestamp));
      indicators.push(this.calculateVWAP(candles, timestamp));
      indicators.push(this.calculateAccDist(candles, timestamp));
      indicators.push(this.calculateChaikinMoneyFlow(candles, 20, timestamp));
      indicators.push(this.calculateMFI(candles, 14, timestamp));
      indicators.push(this.calculateForceIndex(candles, 13, timestamp));
      indicators.push(this.calculateVolumeROC(candles, 14, timestamp));

      // NEW: Ease of Movement, Klinger, NVI
      indicators.push(this.calculateEaseOfMovement(candles, 14, timestamp));
      indicators.push(this.calculateKlingerOscillator(candles, timestamp));
      indicators.push(this.calculateNVI(candles, timestamp));
    } catch (error) {
      console.error('Error calculating volume indicators:', error);
    }

    return indicators;
  }

  // ============= FIBONACCI INDICATORS (10 indicators) =============
  static calculateAllFibonacciIndicators(candles: CandleData[]): IndicatorValue[] {
    const indicators: IndicatorValue[] = [];
    const timestamp = Date.now();

    try {
      const highs = candles.map(c => c.high);
      const lows = candles.map(c => c.low);
      const currentHigh = Math.max(...highs.slice(-50));
      const currentLow = Math.min(...lows.slice(-50));

      const fibLevels = [0.236, 0.382, 0.5, 0.618, 0.786];
      fibLevels.forEach(level => {
        indicators.push(this.calculateFibonacciLevel(currentHigh, currentLow, level, `Fib ${(level * 100).toFixed(1)}%`, timestamp));
      });

      const extLevels = [1.272, 1.414, 1.618, 2.0, 2.618];
      extLevels.forEach(level => {
        indicators.push(this.calculateFibonacciExtension(currentHigh, currentLow, level, `Fib Ext ${level}`, timestamp));
      });
    } catch (error) {
      console.error('Error calculating Fibonacci indicators:', error);
    }

    return indicators;
  }

  // ============= CUSTOM INDICATORS (7+ indicators) =============
  static calculateAllCustomIndicators(candles: CandleData[]): IndicatorValue[] {
    const closePrices = candles.map(c => c.close);
    const indicators: IndicatorValue[] = [];
    const timestamp = Date.now();

    try {
      if (candles.length > 0) {
        const lastCandle = candles[candles.length - 1];
        indicators.push(this.calculatePivotPoints(lastCandle.high, lastCandle.low, lastCandle.close, timestamp));
      }
      indicators.push(this.calculateSupportResistance(candles, timestamp));
      indicators.push(this.calculateTrendStrength(closePrices, timestamp));
      indicators.push(this.calculateMarketStructure(candles, timestamp));
      indicators.push(this.calculateVolatilityPercentile(candles, timestamp));

      // NEW: Heikin Ashi, Elder Impulse
      indicators.push(this.calculateHeikinAshiSignal(candles, timestamp));
      indicators.push(this.calculateElderImpulse(candles, timestamp));
    } catch (error) {
      console.error('Error calculating custom indicators:', error);
    }

    return indicators;
  }

  // ============= REAL INDICATOR CALCULATION METHODS =============

  private static calculateSMA(data: number[], period: number, name: string, timestamp: number): IndicatorValue {
    if (data.length < period) return { name, value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    const sum = data.slice(-period).reduce((a, b) => a + b, 0);
    const sma = sum / period;
    const cp = data[data.length - 1];
    return { name, value: parseFloat(sma.toFixed(5)), signal: cp > sma ? 'buy' : cp < sma ? 'sell' : 'neutral', strength: Math.abs(((cp - sma) / sma) * 100) > 0.1 ? 7 : 4, category: 'trend', timestamp };
  }

  private static calculateEMA(data: number[], period: number, name: string, timestamp: number): IndicatorValue {
    if (data.length < period) return { name, value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    const m = 2 / (period + 1);
    let ema = data[0];
    for (let i = 1; i < data.length; i++) ema = data[i] * m + ema * (1 - m);
    const cp = data[data.length - 1];
    return { name, value: parseFloat(ema.toFixed(5)), signal: cp > ema ? 'buy' : cp < ema ? 'sell' : 'neutral', strength: Math.abs(((cp - ema) / ema) * 100) > 0.1 ? 7 : 4, category: 'trend', timestamp };
  }

  private static calculateWMA(data: number[], period: number, name: string, timestamp: number): IndicatorValue {
    if (data.length < period) return { name, value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    const weights = Array.from({ length: period }, (_, i) => i + 1);
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    const recent = data.slice(-period);
    const wma = recent.reduce((s, p, i) => s + p * weights[i], 0) / totalWeight;
    const cp = data[data.length - 1];
    return { name, value: parseFloat(wma.toFixed(5)), signal: cp > wma ? 'buy' : cp < wma ? 'sell' : 'neutral', strength: Math.abs(((cp - wma) / wma) * 100) > 0.1 ? 7 : 4, category: 'trend', timestamp };
  }

  private static calculateSMMA(data: number[], period: number, name: string, timestamp: number): IndicatorValue {
    if (data.length < period) return { name, value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    let smma = data.slice(0, period).reduce((s, v) => s + v, 0) / period;
    for (let i = period; i < data.length; i++) smma = (smma * (period - 1) + data[i]) / period;
    const cp = data[data.length - 1];
    return { name, value: parseFloat(smma.toFixed(5)), signal: cp > smma ? 'buy' : cp < smma ? 'sell' : 'neutral', strength: Math.abs(((cp - smma) / smma) * 100) > 0.1 ? 7 : 4, category: 'trend', timestamp };
  }

  private static calculateMACD(data: number[], fast: number, slow: number, sig: number, timestamp: number): IndicatorValue {
    if (data.length < slow) return { name: 'MACD', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    const emaF = emaArray(data, fast);
    const emaS = emaArray(data, slow);
    const macdLine = emaF.map((v, i) => v - emaS[i]);
    const signalLine = emaArray(macdLine, sig);
    const hist = macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1];
    return { name: 'MACD', value: parseFloat(hist.toFixed(6)), signal: macdLine[macdLine.length - 1] > signalLine[signalLine.length - 1] ? 'buy' : 'sell', strength: Math.abs(hist) > 0.0001 ? 8 : 4, category: 'trend', timestamp };
  }

  private static calculateRSI(data: number[], period: number, name: string, timestamp: number): IndicatorValue {
    if (data.length < period + 1) return { name, value: null, signal: 'neutral', strength: 0, category: 'momentum', timestamp };
    let gains = 0, losses = 0;
    for (let i = data.length - period; i < data.length; i++) {
      const ch = data[i] - data[i - 1];
      if (ch > 0) gains += ch; else losses += Math.abs(ch);
    }
    const ag = gains / period, al = losses / period;
    if (al === 0) return { name, value: 100, signal: 'sell', strength: 9, category: 'momentum', timestamp };
    const rsi = 100 - 100 / (1 + ag / al);
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral', strength = 3;
    if (rsi > 70) { signal = 'sell'; strength = rsi > 80 ? 9 : 7; }
    else if (rsi < 30) { signal = 'buy'; strength = rsi < 20 ? 9 : 7; }
    return { name, value: parseFloat(rsi.toFixed(2)), signal, strength, category: 'momentum', timestamp };
  }

  // ---- REAL Stochastic ----
  private static calculateStochastic(candles: CandleData[], period: number, smooth: number, name: string, timestamp: number): IndicatorValue {
    if (candles.length < period) return { name, value: null, signal: 'neutral', strength: 0, category: 'momentum', timestamp };
    const slice = candles.slice(-period);
    const highest = Math.max(...slice.map(c => c.high));
    const lowest = Math.min(...slice.map(c => c.low));
    const current = candles[candles.length - 1].close;
    const k = highest === lowest ? 50 : ((current - lowest) / (highest - lowest)) * 100;
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral', strength = 3;
    if (k > 80) { signal = 'sell'; strength = k > 90 ? 8 : 6; }
    else if (k < 20) { signal = 'buy'; strength = k < 10 ? 8 : 6; }
    return { name, value: parseFloat(k.toFixed(2)), signal, strength, category: 'momentum', timestamp };
  }

  // ---- REAL Stochastic RSI ----
  private static calculateStochasticRSI(data: number[], period: number, name: string, timestamp: number): IndicatorValue {
    if (data.length < period * 2) return { name, value: null, signal: 'neutral', strength: 0, category: 'momentum', timestamp };
    // Calculate RSI series
    const rsiValues: number[] = [];
    for (let i = period; i < data.length; i++) {
      let g = 0, l = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const ch = data[j] - data[j - 1];
        if (ch > 0) g += ch; else l += Math.abs(ch);
      }
      const ag = g / period, al = l / period;
      rsiValues.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al));
    }
    if (rsiValues.length < period) return { name, value: null, signal: 'neutral', strength: 0, category: 'momentum', timestamp };
    const recentRSI = rsiValues.slice(-period);
    const maxRSI = Math.max(...recentRSI), minRSI = Math.min(...recentRSI);
    const currentRSI = rsiValues[rsiValues.length - 1];
    const stochRSI = maxRSI === minRSI ? 50 : ((currentRSI - minRSI) / (maxRSI - minRSI)) * 100;
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral', strength = 3;
    if (stochRSI > 80) { signal = 'sell'; strength = 7; }
    else if (stochRSI < 20) { signal = 'buy'; strength = 7; }
    return { name, value: parseFloat(stochRSI.toFixed(2)), signal, strength, category: 'momentum', timestamp };
  }

  // ---- REAL Williams %R ----
  private static calculateWilliamsR(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    if (candles.length < period) return { name: 'Williams %R', value: null, signal: 'neutral', strength: 0, category: 'momentum', timestamp };
    const slice = candles.slice(-period);
    const hh = Math.max(...slice.map(c => c.high));
    const ll = Math.min(...slice.map(c => c.low));
    const cp = candles[candles.length - 1].close;
    const wr = hh === ll ? -50 : ((hh - cp) / (hh - ll)) * -100;
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral', strength = 3;
    if (wr > -20) { signal = 'sell'; strength = 7; }
    else if (wr < -80) { signal = 'buy'; strength = 7; }
    return { name: 'Williams %R', value: parseFloat(wr.toFixed(2)), signal, strength, category: 'momentum', timestamp };
  }

  // ---- REAL CCI ----
  private static calculateCCI(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    if (candles.length < period) return { name: 'CCI', value: null, signal: 'neutral', strength: 0, category: 'momentum', timestamp };
    const slice = candles.slice(-period);
    const tps = slice.map(c => (c.high + c.low + c.close) / 3);
    const smaTp = tps.reduce((s, v) => s + v, 0) / period;
    const meanDev = tps.reduce((s, v) => s + Math.abs(v - smaTp), 0) / period;
    const cci = meanDev !== 0 ? (tps[tps.length - 1] - smaTp) / (0.015 * meanDev) : 0;
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral', strength = 3;
    if (cci > 100) { signal = 'sell'; strength = cci > 200 ? 8 : 6; }
    else if (cci < -100) { signal = 'buy'; strength = cci < -200 ? 8 : 6; }
    return { name: 'CCI', value: parseFloat(cci.toFixed(2)), signal, strength, category: 'momentum', timestamp };
  }

  // ---- REAL ROC ----
  private static calculateROC(data: number[], period: number, name: string, timestamp: number): IndicatorValue {
    if (data.length < period + 1) return { name, value: null, signal: 'neutral', strength: 0, category: 'momentum', timestamp };
    const current = data[data.length - 1];
    const prev = data[data.length - 1 - period];
    const roc = ((current - prev) / prev) * 100;
    return { name, value: parseFloat(roc.toFixed(4)), signal: roc > 0 ? 'buy' : roc < 0 ? 'sell' : 'neutral', strength: Math.abs(roc) > 1 ? 7 : 4, category: 'momentum', timestamp };
  }

  // ---- REAL Momentum ----
  private static calculateMomentum(data: number[], period: number, timestamp: number): IndicatorValue {
    if (data.length < period + 1) return { name: `Momentum ${period}`, value: null, signal: 'neutral', strength: 0, category: 'momentum', timestamp };
    const mom = data[data.length - 1] - data[data.length - 1 - period];
    return { name: `Momentum ${period}`, value: parseFloat(mom.toFixed(5)), signal: mom > 0 ? 'buy' : mom < 0 ? 'sell' : 'neutral', strength: Math.abs(mom) > 0 ? 6 : 3, category: 'momentum', timestamp };
  }

  // ---- REAL Ultimate Oscillator ----
  private static calculateUltimateOscillator(candles: CandleData[], timestamp: number): IndicatorValue {
    if (candles.length < 29) return { name: 'Ultimate Oscillator', value: null, signal: 'neutral', strength: 0, category: 'momentum', timestamp };
    let bp7 = 0, tr7 = 0, bp14 = 0, tr14 = 0, bp28 = 0, tr28 = 0;
    for (let i = candles.length - 28; i < candles.length; i++) {
      const bp = candles[i].close - Math.min(candles[i].low, candles[i - 1].close);
      const tr = Math.max(candles[i].high, candles[i - 1].close) - Math.min(candles[i].low, candles[i - 1].close);
      if (i >= candles.length - 7) { bp7 += bp; tr7 += tr; }
      if (i >= candles.length - 14) { bp14 += bp; tr14 += tr; }
      bp28 += bp; tr28 += tr;
    }
    const avg7 = tr7 !== 0 ? bp7 / tr7 : 0;
    const avg14 = tr14 !== 0 ? bp14 / tr14 : 0;
    const avg28 = tr28 !== 0 ? bp28 / tr28 : 0;
    const uo = ((avg7 * 4) + (avg14 * 2) + avg28) / 7 * 100;
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral', strength = 4;
    if (uo > 70) { signal = 'sell'; strength = 7; }
    else if (uo < 30) { signal = 'buy'; strength = 7; }
    return { name: 'Ultimate Oscillator', value: parseFloat(uo.toFixed(2)), signal, strength, category: 'momentum', timestamp };
  }

  // ---- REAL Awesome Oscillator ----
  private static calculateAwesomeOscillator(candles: CandleData[], timestamp: number): IndicatorValue {
    if (candles.length < 34) return { name: 'Awesome Oscillator', value: null, signal: 'neutral', strength: 0, category: 'momentum', timestamp };
    const medians = candles.map(c => (c.high + c.low) / 2);
    const sma5 = medians.slice(-5).reduce((s, v) => s + v, 0) / 5;
    const sma34 = medians.slice(-34).reduce((s, v) => s + v, 0) / 34;
    const ao = sma5 - sma34;
    return { name: 'Awesome Oscillator', value: parseFloat(ao.toFixed(5)), signal: ao > 0 ? 'buy' : ao < 0 ? 'sell' : 'neutral', strength: Math.abs(ao) > 0 ? 6 : 3, category: 'momentum', timestamp };
  }

  // ---- REAL MACD Histogram ----
  private static calculateMACDHistogram(data: number[], timestamp: number): IndicatorValue {
    if (data.length < 26) return { name: 'MACD Histogram', value: null, signal: 'neutral', strength: 0, category: 'momentum', timestamp };
    const ema12 = emaArray(data, 12);
    const ema26 = emaArray(data, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = emaArray(macdLine, 9);
    const hist = macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1];
    const prevHist = macdLine[macdLine.length - 2] - signalLine[signalLine.length - 2];
    const increasing = hist > prevHist;
    return { name: 'MACD Histogram', value: parseFloat(hist.toFixed(6)), signal: hist > 0 ? 'buy' : 'sell', strength: increasing ? 7 : 5, category: 'momentum', timestamp };
  }

  // ---- REAL Bollinger Bands (%B) ----
  private static calculateBollingerBands(data: number[], period: number, deviation: number, name: string, timestamp: number): IndicatorValue {
    if (data.length < period) return { name, value: null, signal: 'neutral', strength: 0, category: 'volatility', timestamp };
    const slice = data.slice(-period);
    const mean = slice.reduce((s, v) => s + v, 0) / period;
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    const upper = mean + sd * deviation;
    const lower = mean - sd * deviation;
    const cp = data[data.length - 1];
    const percentB = upper === lower ? 0.5 : (cp - lower) / (upper - lower);
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral', strength = 3;
    if (percentB > 1) { signal = 'sell'; strength = 8; }
    else if (percentB > 0.8) { signal = 'sell'; strength = 6; }
    else if (percentB < 0) { signal = 'buy'; strength = 8; }
    else if (percentB < 0.2) { signal = 'buy'; strength = 6; }
    return { name, value: parseFloat(percentB.toFixed(4)), signal, strength, category: 'volatility', timestamp };
  }

  // ---- REAL ATR ----
  private static calculateATR(candles: CandleData[], period: number, name: string, timestamp: number): IndicatorValue {
    if (candles.length < period + 1) return { name, value: null, signal: 'neutral', strength: 0, category: 'volatility', timestamp };
    const atr = atrArray(candles, period);
    const currentATR = atr[atr.length - 1];
    const prevATR = atr[atr.length - 2];
    const expanding = currentATR > prevATR;
    return { name, value: parseFloat(currentATR.toFixed(5)), signal: expanding ? 'sell' : 'buy', strength: expanding ? 6 : 4, category: 'volatility', timestamp };
  }

  // ---- REAL Keltner Channels ----
  private static calculateKeltnerChannels(candles: CandleData[], period: number, factor: number, timestamp: number): IndicatorValue {
    if (candles.length < period) return { name: 'Keltner Channels', value: null, signal: 'neutral', strength: 0, category: 'volatility', timestamp };
    const closes = candles.map(c => c.close);
    const ema = emaArray(closes, period);
    const atr = atrArray(candles, period);
    const mid = ema[ema.length - 1];
    const upper = mid + atr[atr.length - 1] * factor;
    const lower = mid - atr[atr.length - 1] * factor;
    const cp = closes[closes.length - 1];
    const pos = upper === lower ? 0.5 : (cp - lower) / (upper - lower);
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral', strength = 3;
    if (pos > 1) { signal = 'sell'; strength = 7; }
    else if (pos < 0) { signal = 'buy'; strength = 7; }
    return { name: 'Keltner Channels', value: parseFloat(pos.toFixed(4)), signal, strength, category: 'volatility', timestamp };
  }

  // ---- REAL Donchian Channels ----
  private static calculateDonchianChannels(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    if (candles.length < period) return { name: 'Donchian Channels', value: null, signal: 'neutral', strength: 0, category: 'volatility', timestamp };
    const slice = candles.slice(-period);
    const upper = Math.max(...slice.map(c => c.high));
    const lower = Math.min(...slice.map(c => c.low));
    const cp = candles[candles.length - 1].close;
    const pos = upper === lower ? 0.5 : (cp - lower) / (upper - lower);
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral', strength = 3;
    if (cp >= upper * 0.99) { signal = 'buy'; strength = 7; } // breakout
    else if (cp <= lower * 1.01) { signal = 'sell'; strength = 7; }
    return { name: 'Donchian Channels', value: parseFloat(pos.toFixed(4)), signal, strength, category: 'volatility', timestamp };
  }

  // ---- REAL Standard Deviation ----
  private static calculateStandardDeviation(data: number[], period: number, timestamp: number): IndicatorValue {
    if (data.length < period) return { name: 'Standard Deviation', value: null, signal: 'neutral', strength: 0, category: 'volatility', timestamp };
    const slice = data.slice(-period);
    const mean = slice.reduce((s, v) => s + v, 0) / period;
    const sd = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    // Compare to previous period
    const prevSlice = data.slice(-period * 2, -period);
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    if (prevSlice.length >= period) {
      const prevMean = prevSlice.reduce((s, v) => s + v, 0) / period;
      const prevSd = Math.sqrt(prevSlice.reduce((s, v) => s + (v - prevMean) ** 2, 0) / period);
      signal = sd > prevSd * 1.2 ? 'sell' : sd < prevSd * 0.8 ? 'buy' : 'neutral';
    }
    return { name: 'Standard Deviation', value: parseFloat(sd.toFixed(6)), signal, strength: 4, category: 'volatility', timestamp };
  }

  // ---- REAL Chaikin Volatility ----
  private static calculateChaikinVolatility(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    if (candles.length < period * 2) return { name: 'Chaikin Volatility', value: null, signal: 'neutral', strength: 0, category: 'volatility', timestamp };
    const hlDiff = candles.map(c => c.high - c.low);
    const emaHL = emaArray(hlDiff, period);
    const current = emaHL[emaHL.length - 1];
    const prev = emaHL[emaHL.length - 1 - period];
    const cv = prev !== 0 ? ((current - prev) / prev) * 100 : 0;
    return { name: 'Chaikin Volatility', value: parseFloat(cv.toFixed(2)), signal: cv > 0 ? 'sell' : 'buy', strength: Math.abs(cv) > 10 ? 6 : 3, category: 'volatility', timestamp };
  }

  // ---- REAL OBV ----
  private static calculateOBV(candles: CandleData[], timestamp: number): IndicatorValue {
    if (candles.length < 2) return { name: 'OBV', value: null, signal: 'neutral', strength: 0, category: 'volume', timestamp };
    let obv = 0;
    for (let i = 1; i < candles.length; i++) {
      const vol = candles[i].volume || 1000;
      if (candles[i].close > candles[i - 1].close) obv += vol;
      else if (candles[i].close < candles[i - 1].close) obv -= vol;
    }
    // Trend of OBV over last 5 periods
    let prevObv = 0;
    for (let i = 1; i < candles.length - 5; i++) {
      const vol = candles[i].volume || 1000;
      if (candles[i].close > candles[i - 1].close) prevObv += vol;
      else if (candles[i].close < candles[i - 1].close) prevObv -= vol;
    }
    return { name: 'OBV', value: obv, signal: obv > prevObv ? 'buy' : obv < prevObv ? 'sell' : 'neutral', strength: 5, category: 'volume', timestamp };
  }

  // ---- REAL VWAP ----
  private static calculateVWAP(candles: CandleData[], timestamp: number): IndicatorValue {
    if (candles.length < 2) return { name: 'VWAP', value: null, signal: 'neutral', strength: 0, category: 'volume', timestamp };
    let cumPV = 0, cumV = 0;
    for (const c of candles) {
      const tp = (c.high + c.low + c.close) / 3;
      const v = c.volume || 1000;
      cumPV += tp * v;
      cumV += v;
    }
    const vwap = cumV > 0 ? cumPV / cumV : 0;
    const cp = candles[candles.length - 1].close;
    return { name: 'VWAP', value: parseFloat(vwap.toFixed(5)), signal: cp > vwap ? 'buy' : cp < vwap ? 'sell' : 'neutral', strength: Math.abs((cp - vwap) / vwap) > 0.002 ? 7 : 4, category: 'volume', timestamp };
  }

  // ---- REAL Accumulation/Distribution ----
  private static calculateAccDist(candles: CandleData[], timestamp: number): IndicatorValue {
    if (candles.length < 2) return { name: 'A/D Line', value: null, signal: 'neutral', strength: 0, category: 'volume', timestamp };
    let ad = 0;
    for (const c of candles) {
      const mfm = c.high === c.low ? 0 : ((c.close - c.low) - (c.high - c.close)) / (c.high - c.low);
      ad += mfm * (c.volume || 1000);
    }
    // Trend
    let prevAd = 0;
    for (let i = 0; i < candles.length - 5; i++) {
      const c = candles[i];
      const mfm = c.high === c.low ? 0 : ((c.close - c.low) - (c.high - c.close)) / (c.high - c.low);
      prevAd += mfm * (c.volume || 1000);
    }
    return { name: 'A/D Line', value: parseFloat(ad.toFixed(2)), signal: ad > prevAd ? 'buy' : ad < prevAd ? 'sell' : 'neutral', strength: 5, category: 'volume', timestamp };
  }

  // ---- REAL Chaikin Money Flow ----
  private static calculateChaikinMoneyFlow(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    if (candles.length < period) return { name: 'Chaikin Money Flow', value: null, signal: 'neutral', strength: 0, category: 'volume', timestamp };
    const slice = candles.slice(-period);
    let mfvSum = 0, volSum = 0;
    for (const c of slice) {
      const mfm = c.high === c.low ? 0 : ((c.close - c.low) - (c.high - c.close)) / (c.high - c.low);
      const vol = c.volume || 1000;
      mfvSum += mfm * vol;
      volSum += vol;
    }
    const cmf = volSum !== 0 ? mfvSum / volSum : 0;
    return { name: 'Chaikin Money Flow', value: parseFloat(cmf.toFixed(4)), signal: cmf > 0.05 ? 'buy' : cmf < -0.05 ? 'sell' : 'neutral', strength: Math.abs(cmf) > 0.1 ? 7 : 4, category: 'volume', timestamp };
  }

  // ---- REAL MFI (Money Flow Index) ----
  private static calculateMFI(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    if (candles.length < period + 1) return { name: 'MFI', value: null, signal: 'neutral', strength: 0, category: 'volume', timestamp };
    let posMF = 0, negMF = 0;
    for (let i = candles.length - period; i < candles.length; i++) {
      const tp = (candles[i].high + candles[i].low + candles[i].close) / 3;
      const prevTp = (candles[i - 1].high + candles[i - 1].low + candles[i - 1].close) / 3;
      const mf = tp * (candles[i].volume || 1000);
      if (tp > prevTp) posMF += mf;
      else negMF += mf;
    }
    const mfi = negMF === 0 ? 100 : 100 - 100 / (1 + posMF / negMF);
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral', strength = 3;
    if (mfi > 80) { signal = 'sell'; strength = 7; }
    else if (mfi < 20) { signal = 'buy'; strength = 7; }
    return { name: 'MFI', value: parseFloat(mfi.toFixed(2)), signal, strength, category: 'volume', timestamp };
  }

  // ---- REAL Force Index ----
  private static calculateForceIndex(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    if (candles.length < period + 1) return { name: 'Force Index', value: null, signal: 'neutral', strength: 0, category: 'volume', timestamp };
    const fi: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      fi.push((candles[i].close - candles[i - 1].close) * (candles[i].volume || 1000));
    }
    const emaFI = emaArray(fi, period);
    const current = emaFI[emaFI.length - 1];
    return { name: 'Force Index', value: parseFloat(current.toFixed(2)), signal: current > 0 ? 'buy' : current < 0 ? 'sell' : 'neutral', strength: Math.abs(current) > 0 ? 5 : 3, category: 'volume', timestamp };
  }

  // ---- REAL Volume ROC ----
  private static calculateVolumeROC(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    if (candles.length < period + 1) return { name: 'Volume ROC', value: null, signal: 'neutral', strength: 0, category: 'volume', timestamp };
    const currentVol = candles[candles.length - 1].volume || 1000;
    const prevVol = candles[candles.length - 1 - period].volume || 1000;
    const vroc = prevVol !== 0 ? ((currentVol - prevVol) / prevVol) * 100 : 0;
    return { name: 'Volume ROC', value: parseFloat(vroc.toFixed(2)), signal: vroc > 50 ? 'buy' : vroc < -50 ? 'sell' : 'neutral', strength: Math.abs(vroc) > 100 ? 7 : 4, category: 'volume', timestamp };
  }

  // ---- REAL Parabolic SAR ----
  private static calculateParabolicSAR(candles: CandleData[], step: number, max: number, timestamp: number): IndicatorValue {
    if (candles.length < 5) return { name: 'Parabolic SAR', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    const sarValues = AdvancedTrendIndicators.calculateParabolicSAR(candles, step, max);
    const currentSar = sarValues[sarValues.length - 1];
    const cp = candles[candles.length - 1].close;
    let signal: 'buy' | 'sell' | 'neutral' = cp > currentSar ? 'buy' : 'sell';
    let strength = 5;
    if (sarValues.length > 2) {
      const prevSar = sarValues[sarValues.length - 2];
      const prevPrice = candles[candles.length - 2].close;
      if ((prevPrice > prevSar && cp < currentSar) || (prevPrice < prevSar && cp > currentSar)) strength = 8;
    }
    return { name: 'Parabolic SAR', value: currentSar, signal, strength, category: 'trend', timestamp };
  }

  // ---- REAL Ichimoku ----
  private static calculateIchimoku(candles: CandleData[], timestamp: number): IndicatorValue[] {
    if (candles.length < 52) {
      return [
        { name: 'Tenkan-sen', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp },
        { name: 'Kijun-sen', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp }
      ];
    }
    const ichi = AdvancedTrendIndicators.calculateIchimoku(candles);
    const cp = candles[candles.length - 1].close;
    const tenkan = ichi.tenkanSen[ichi.tenkanSen.length - 1];
    const kijun = ichi.kijunSen[ichi.kijunSen.length - 1];
    const senkouA = ichi.senkouSpanA[ichi.senkouSpanA.length - 1];
    const senkouB = ichi.senkouSpanB[ichi.senkouSpanB.length - 1];
    const kumoTop = Math.max(senkouA, senkouB), kumoBottom = Math.min(senkouA, senkouB);
    const tkSignal: 'buy' | 'sell' | 'neutral' = tenkan > kijun ? 'buy' : tenkan < kijun ? 'sell' : 'neutral';
    const cloudSignal: 'buy' | 'sell' | 'neutral' = cp > kumoTop ? 'buy' : cp < kumoBottom ? 'sell' : 'neutral';
    return [
      { name: 'Tenkan-sen', value: tenkan, signal: tkSignal, strength: 6, category: 'trend', timestamp },
      { name: 'Kijun-sen', value: kijun, signal: cloudSignal, strength: cloudSignal === 'neutral' ? 3 : 8, category: 'trend', timestamp },
      { name: 'Senkou Span A', value: senkouA, signal: cloudSignal, strength: 5, category: 'trend', timestamp },
      { name: 'Kumo Cloud', value: (kumoTop + kumoBottom) / 2, signal: cloudSignal, strength: cloudSignal === 'neutral' ? 3 : 8, category: 'trend', timestamp }
    ];
  }

  // ---- REAL SuperTrend ----
  private static calculateSuperTrend(candles: CandleData[], period: number, multiplier: number, timestamp: number): IndicatorValue {
    if (candles.length < period + 1) return { name: 'SuperTrend', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    const stValues = AdvancedTrendIndicators.calculateSuperTrend(candles, period, multiplier);
    const currentST = stValues[stValues.length - 1];
    const cp = candles[candles.length - 1].close;
    let signal: 'buy' | 'sell' | 'neutral' = cp > currentST ? 'buy' : 'sell';
    let strength = 7;
    if (stValues.length > 2) {
      const prevST = stValues[stValues.length - 2];
      const prevPrice = candles[candles.length - 2].close;
      if ((prevPrice > prevST && cp < currentST) || (prevPrice < prevST && cp > currentST)) strength = 9;
    }
    return { name: 'SuperTrend', value: currentST, signal, strength, category: 'trend', timestamp };
  }

  // ---- REAL ADX ----
  private static calculateADX(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    if (candles.length < period * 2) return { name: 'ADX', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    let smoothPlusDM = 0, smoothMinusDM = 0, smoothTR = 0;
    const dxValues: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const highDiff = candles[i].high - candles[i - 1].high;
      const lowDiff = candles[i - 1].low - candles[i].low;
      const plusDM = highDiff > lowDiff && highDiff > 0 ? highDiff : 0;
      const minusDM = lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0;
      const tr = Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i - 1].close), Math.abs(candles[i].low - candles[i - 1].close));
      if (i <= period) {
        smoothPlusDM += plusDM; smoothMinusDM += minusDM; smoothTR += tr;
      } else {
        smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM;
        smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM;
        smoothTR = smoothTR - smoothTR / period + tr;
      }
      if (i >= period) {
        const plusDI = smoothTR !== 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
        const minusDI = smoothTR !== 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
        const dx = (plusDI + minusDI) !== 0 ? Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100 : 0;
        dxValues.push(dx);
      }
    }
    if (dxValues.length < period) return { name: 'ADX', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    let adx = dxValues.slice(0, period).reduce((s, v) => s + v, 0) / period;
    for (let i = period; i < dxValues.length; i++) adx = ((adx * (period - 1)) + dxValues[i]) / period;
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 3;
    if (adx > 25) { strength = adx > 50 ? 9 : 7; signal = adx > 25 ? 'buy' : 'neutral'; } // Strong trend
    return { name: 'ADX', value: parseFloat(adx.toFixed(2)), signal, strength, category: 'trend', timestamp };
  }

  // ---- REAL DMI ----
  private static calculateDMI(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    if (candles.length < period + 1) return { name: 'DMI', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    let smoothPlusDM = 0, smoothMinusDM = 0, smoothTR = 0;
    for (let i = 1; i <= Math.min(period, candles.length - 1); i++) {
      const highDiff = candles[i].high - candles[i - 1].high;
      const lowDiff = candles[i - 1].low - candles[i].low;
      smoothPlusDM += highDiff > lowDiff && highDiff > 0 ? highDiff : 0;
      smoothMinusDM += lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0;
      smoothTR += Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i - 1].close), Math.abs(candles[i].low - candles[i - 1].close));
    }
    for (let i = period + 1; i < candles.length; i++) {
      const highDiff = candles[i].high - candles[i - 1].high;
      const lowDiff = candles[i - 1].low - candles[i].low;
      smoothPlusDM = smoothPlusDM - smoothPlusDM / period + (highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
      smoothMinusDM = smoothMinusDM - smoothMinusDM / period + (lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
      smoothTR = smoothTR - smoothTR / period + Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i - 1].close), Math.abs(candles[i].low - candles[i - 1].close));
    }
    const plusDI = smoothTR !== 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
    const minusDI = smoothTR !== 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
    const diff = plusDI - minusDI;
    return { name: 'DMI', value: parseFloat(diff.toFixed(2)), signal: diff > 0 ? 'buy' : diff < 0 ? 'sell' : 'neutral', strength: Math.abs(diff) > 10 ? 7 : 4, category: 'trend', timestamp };
  }

  // ---- REAL Aroon ----
  private static calculateAroon(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    if (candles.length < period + 1) return { name: 'Aroon', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    const slice = candles.slice(-period - 1);
    let highIdx = 0, lowIdx = 0;
    for (let i = 0; i < slice.length; i++) {
      if (slice[i].high >= slice[highIdx].high) highIdx = i;
      if (slice[i].low <= slice[lowIdx].low) lowIdx = i;
    }
    const aroonUp = (highIdx / period) * 100;
    const aroonDown = (lowIdx / period) * 100;
    const osc = aroonUp - aroonDown;
    return { name: 'Aroon', value: parseFloat(osc.toFixed(2)), signal: osc > 50 ? 'buy' : osc < -50 ? 'sell' : 'neutral', strength: Math.abs(osc) > 70 ? 8 : 4, category: 'trend', timestamp };
  }

  // ---- REAL TRIX ----
  private static calculateTRIX(data: number[], period: number, timestamp: number): IndicatorValue {
    if (data.length < period * 3) return { name: 'TRIX', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    const ema1 = emaArray(data, period);
    const ema2 = emaArray(ema1, period);
    const ema3 = emaArray(ema2, period);
    const current = ema3[ema3.length - 1];
    const prev = ema3[ema3.length - 2];
    const trix = prev !== 0 ? ((current - prev) / prev) * 10000 : 0;
    return { name: 'TRIX', value: parseFloat(trix.toFixed(4)), signal: trix > 0 ? 'buy' : trix < 0 ? 'sell' : 'neutral', strength: Math.abs(trix) > 0.5 ? 6 : 3, category: 'trend', timestamp };
  }

  // ---- NEW: DEMA ----
  private static calculateDEMA(data: number[], period: number, timestamp: number): IndicatorValue {
    if (data.length < period * 2) return { name: 'DEMA', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    const ema1 = emaArray(data, period);
    const ema2 = emaArray(ema1, period);
    const dema = 2 * ema1[ema1.length - 1] - ema2[ema2.length - 1];
    const cp = data[data.length - 1];
    return { name: 'DEMA', value: parseFloat(dema.toFixed(5)), signal: cp > dema ? 'buy' : 'sell', strength: 6, category: 'trend', timestamp };
  }

  // ---- NEW: TEMA ----
  private static calculateTEMA(data: number[], period: number, timestamp: number): IndicatorValue {
    if (data.length < period * 3) return { name: 'TEMA', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    const e1 = emaArray(data, period);
    const e2 = emaArray(e1, period);
    const e3 = emaArray(e2, period);
    const tema = 3 * e1[e1.length - 1] - 3 * e2[e2.length - 1] + e3[e3.length - 1];
    const cp = data[data.length - 1];
    return { name: 'TEMA', value: parseFloat(tema.toFixed(5)), signal: cp > tema ? 'buy' : 'sell', strength: 7, category: 'trend', timestamp };
  }

  // ---- NEW: KAMA (Kaufman Adaptive MA) ----
  private static calculateKAMA(data: number[], erPeriod: number, fastSC: number, slowSC: number, timestamp: number): IndicatorValue {
    if (data.length < erPeriod + 1) return { name: 'KAMA', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    const fastC = 2 / (fastSC + 1), slowC = 2 / (slowSC + 1);
    let kama = data[erPeriod];
    for (let i = erPeriod + 1; i < data.length; i++) {
      const direction = Math.abs(data[i] - data[i - erPeriod]);
      let volatility = 0;
      for (let j = i - erPeriod + 1; j <= i; j++) volatility += Math.abs(data[j] - data[j - 1]);
      const er = volatility !== 0 ? direction / volatility : 0;
      const sc = (er * (fastC - slowC) + slowC) ** 2;
      kama = kama + sc * (data[i] - kama);
    }
    const cp = data[data.length - 1];
    return { name: 'KAMA', value: parseFloat(kama.toFixed(5)), signal: cp > kama ? 'buy' : 'sell', strength: 6, category: 'trend', timestamp };
  }

  // ---- NEW: Hull Moving Average ----
  private static calculateHullMA(data: number[], period: number, timestamp: number): IndicatorValue {
    if (data.length < period) return { name: 'Hull MA', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    const halfPeriod = Math.floor(period / 2);
    const sqrtPeriod = Math.floor(Math.sqrt(period));
    const wmaHalf = this.wmaValue(data, halfPeriod);
    const wmaFull = this.wmaValue(data, period);
    if (wmaHalf === null || wmaFull === null) return { name: 'Hull MA', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    const diff = 2 * wmaHalf - wmaFull;
    const cp = data[data.length - 1];
    return { name: 'Hull MA', value: parseFloat(diff.toFixed(5)), signal: cp > diff ? 'buy' : 'sell', strength: 7, category: 'trend', timestamp };
  }

  private static wmaValue(data: number[], period: number): number | null {
    if (data.length < period) return null;
    const weights = Array.from({ length: period }, (_, i) => i + 1);
    const tw = weights.reduce((s, w) => s + w, 0);
    const recent = data.slice(-period);
    return recent.reduce((s, p, i) => s + p * weights[i], 0) / tw;
  }

  // ---- NEW: ZLEMA (Zero-Lag EMA) ----
  private static calculateZLEMA(data: number[], period: number, timestamp: number): IndicatorValue {
    if (data.length < period) return { name: 'ZLEMA', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    const lag = Math.floor((period - 1) / 2);
    const adjusted = data.map((v, i) => i >= lag ? 2 * v - data[i - lag] : v);
    const ema = emaArray(adjusted, period);
    const zlema = ema[ema.length - 1];
    const cp = data[data.length - 1];
    return { name: 'ZLEMA', value: parseFloat(zlema.toFixed(5)), signal: cp > zlema ? 'buy' : 'sell', strength: 6, category: 'trend', timestamp };
  }

  // ---- NEW: Vortex Indicator ----
  private static calculateVortex(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    if (candles.length < period + 1) return { name: 'Vortex', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    let vmPlus = 0, vmMinus = 0, trSum = 0;
    for (let i = candles.length - period; i < candles.length; i++) {
      vmPlus += Math.abs(candles[i].high - candles[i - 1].low);
      vmMinus += Math.abs(candles[i].low - candles[i - 1].high);
      trSum += Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i - 1].close), Math.abs(candles[i].low - candles[i - 1].close));
    }
    const viPlus = trSum !== 0 ? vmPlus / trSum : 0;
    const viMinus = trSum !== 0 ? vmMinus / trSum : 0;
    const diff = viPlus - viMinus;
    return { name: 'Vortex', value: parseFloat(diff.toFixed(4)), signal: diff > 0 ? 'buy' : 'sell', strength: Math.abs(diff) > 0.1 ? 7 : 4, category: 'trend', timestamp };
  }

  // ---- NEW: DPO (Detrended Price Oscillator) ----
  private static calculateDPO(data: number[], period: number, timestamp: number): IndicatorValue {
    if (data.length < period + Math.floor(period / 2) + 1) return { name: 'DPO', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    const sma = smaArray(data, period);
    const offset = Math.floor(period / 2) + 1;
    const dpo = data[data.length - 1] - sma[sma.length - offset];
    return { name: 'DPO', value: parseFloat(dpo.toFixed(5)), signal: dpo > 0 ? 'buy' : 'sell', strength: 5, category: 'trend', timestamp };
  }

  // ---- NEW: Coppock Curve ----
  private static calculateCoppockCurve(data: number[], timestamp: number): IndicatorValue {
    if (data.length < 25) return { name: 'Coppock Curve', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    const roc14 = data.length > 14 ? ((data[data.length - 1] - data[data.length - 15]) / data[data.length - 15]) * 100 : 0;
    const roc11 = data.length > 11 ? ((data[data.length - 1] - data[data.length - 12]) / data[data.length - 12]) * 100 : 0;
    const sum = roc14 + roc11;
    return { name: 'Coppock Curve', value: parseFloat(sum.toFixed(4)), signal: sum > 0 ? 'buy' : 'sell', strength: 5, category: 'trend', timestamp };
  }

  // ---- NEW: KST (Know Sure Thing) ----
  private static calculateKST(data: number[], timestamp: number): IndicatorValue {
    if (data.length < 30) return { name: 'KST', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    const roc = (p: number) => data.length > p ? ((data[data.length - 1] - data[data.length - 1 - p]) / data[data.length - 1 - p]) * 100 : 0;
    const kst = roc(10) * 1 + roc(15) * 2 + roc(20) * 3 + roc(30) * 4;
    return { name: 'KST', value: parseFloat(kst.toFixed(4)), signal: kst > 0 ? 'buy' : 'sell', strength: kst > 0 ? 6 : 5, category: 'trend', timestamp };
  }

  // ---- NEW: Elder Ray Bull/Bear Power ----
  private static calculateElderRayBull(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    if (candles.length < period) return { name: 'Elder Bull Power', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    const closes = candles.map(c => c.close);
    const ema = emaArray(closes, period);
    const bull = candles[candles.length - 1].high - ema[ema.length - 1];
    return { name: 'Elder Bull Power', value: parseFloat(bull.toFixed(5)), signal: bull > 0 ? 'buy' : 'sell', strength: Math.abs(bull) > 0 ? 5 : 3, category: 'trend', timestamp };
  }

  private static calculateElderRayBear(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    if (candles.length < period) return { name: 'Elder Bear Power', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    const closes = candles.map(c => c.close);
    const ema = emaArray(closes, period);
    const bear = candles[candles.length - 1].low - ema[ema.length - 1];
    return { name: 'Elder Bear Power', value: parseFloat(bear.toFixed(5)), signal: bear > 0 ? 'buy' : 'sell', strength: Math.abs(bear) > 0 ? 5 : 3, category: 'trend', timestamp };
  }

  // ---- NEW: CMO (Chande Momentum Oscillator) ----
  private static calculateCMO(data: number[], period: number, timestamp: number): IndicatorValue {
    if (data.length < period + 1) return { name: 'CMO', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    let gains = 0, losses = 0;
    for (let i = data.length - period; i < data.length; i++) {
      const ch = data[i] - data[i - 1];
      if (ch > 0) gains += ch; else losses += Math.abs(ch);
    }
    const cmo = (gains + losses) !== 0 ? ((gains - losses) / (gains + losses)) * 100 : 0;
    return { name: 'CMO', value: parseFloat(cmo.toFixed(2)), signal: cmo > 50 ? 'sell' : cmo < -50 ? 'buy' : 'neutral', strength: Math.abs(cmo) > 50 ? 7 : 4, category: 'trend', timestamp };
  }

  // ---- NEW: Mass Index ----
  private static calculateMassIndex(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    if (candles.length < period + 9) return { name: 'Mass Index', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    const hlDiff = candles.map(c => c.high - c.low);
    const ema9 = emaArray(hlDiff, 9);
    const ema9_9 = emaArray(ema9, 9);
    let mi = 0;
    for (let i = ema9_9.length - period; i < ema9_9.length; i++) {
      mi += ema9_9[i] !== 0 ? ema9[i] / ema9_9[i] : 1;
    }
    // Reversal bulge: MI > 27 then falls below 26.5
    const signal: 'buy' | 'sell' | 'neutral' = mi > 27 ? 'sell' : 'neutral';
    return { name: 'Mass Index', value: parseFloat(mi.toFixed(2)), signal, strength: mi > 27 ? 7 : 3, category: 'trend', timestamp };
  }

  // ---- NEW: Historical Volatility ----
  private static calculateHistoricalVolatility(data: number[], period: number, timestamp: number): IndicatorValue {
    if (data.length < period + 1) return { name: 'Historical Vol', value: null, signal: 'neutral', strength: 0, category: 'volatility', timestamp };
    const returns: number[] = [];
    for (let i = data.length - period; i < data.length; i++) {
      returns.push(Math.log(data[i] / data[i - 1]));
    }
    const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
    const variance = returns.reduce((s, v) => s + (v - mean) ** 2, 0) / returns.length;
    const hv = Math.sqrt(variance * 252) * 100; // Annualized
    return { name: 'Historical Vol', value: parseFloat(hv.toFixed(2)), signal: hv > 20 ? 'sell' : 'buy', strength: hv > 30 ? 7 : 4, category: 'volatility', timestamp };
  }

  // ---- NEW: Ulcer Index ----
  private static calculateUlcerIndex(data: number[], period: number, timestamp: number): IndicatorValue {
    if (data.length < period) return { name: 'Ulcer Index', value: null, signal: 'neutral', strength: 0, category: 'volatility', timestamp };
    const slice = data.slice(-period);
    const maxClose = Math.max(...slice);
    const sumSq = slice.reduce((s, v) => s + ((v - maxClose) / maxClose * 100) ** 2, 0);
    const ui = Math.sqrt(sumSq / period);
    return { name: 'Ulcer Index', value: parseFloat(ui.toFixed(4)), signal: ui > 5 ? 'sell' : 'buy', strength: ui > 10 ? 7 : 4, category: 'volatility', timestamp };
  }

  // ---- NEW: NATR (Normalized ATR) ----
  private static calculateNATR(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    if (candles.length < period + 1) return { name: 'NATR', value: null, signal: 'neutral', strength: 0, category: 'volatility', timestamp };
    const atr = atrArray(candles, period);
    const currentATR = atr[atr.length - 1];
    const cp = candles[candles.length - 1].close;
    const natr = cp !== 0 ? (currentATR / cp) * 100 : 0;
    return { name: 'NATR', value: parseFloat(natr.toFixed(4)), signal: natr > 2 ? 'sell' : 'buy', strength: natr > 3 ? 7 : 4, category: 'volatility', timestamp };
  }

  // ---- NEW: Ease of Movement ----
  private static calculateEaseOfMovement(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    if (candles.length < period + 1) return { name: 'Ease of Movement', value: null, signal: 'neutral', strength: 0, category: 'volume', timestamp };
    const emv: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const dm = ((candles[i].high + candles[i].low) / 2) - ((candles[i - 1].high + candles[i - 1].low) / 2);
      const br = (candles[i].volume || 1000) / (candles[i].high - candles[i].low || 1);
      emv.push(dm / (br / 10000));
    }
    const smaEmv = emv.slice(-period).reduce((s, v) => s + v, 0) / period;
    return { name: 'Ease of Movement', value: parseFloat(smaEmv.toFixed(4)), signal: smaEmv > 0 ? 'buy' : 'sell', strength: Math.abs(smaEmv) > 0 ? 5 : 3, category: 'volume', timestamp };
  }

  // ---- NEW: Klinger Volume Oscillator ----
  private static calculateKlingerOscillator(candles: CandleData[], timestamp: number): IndicatorValue {
    if (candles.length < 55) return { name: 'Klinger Oscillator', value: null, signal: 'neutral', strength: 0, category: 'volume', timestamp };
    const vf: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const trend = ((candles[i].high + candles[i].low + candles[i].close) / 3) > ((candles[i - 1].high + candles[i - 1].low + candles[i - 1].close) / 3) ? 1 : -1;
      const dm = candles[i].high - candles[i].low;
      const cm = i > 1 ? dm + (trend === ((candles[i - 1].high + candles[i - 1].low + candles[i - 1].close) / 3 > (candles[Math.max(0, i - 2)].high + candles[Math.max(0, i - 2)].low + candles[Math.max(0, i - 2)].close) / 3 ? 1 : -1) ? vf.length > 0 ? dm : dm : dm) : dm;
      vf.push(trend * (candles[i].volume || 1000) * Math.abs(2 * (dm / (cm || 1)) - 1));
    }
    const ema34 = emaArray(vf, 34);
    const ema55 = emaArray(vf, 55);
    const ko = ema34[ema34.length - 1] - ema55[ema55.length - 1];
    return { name: 'Klinger Oscillator', value: parseFloat(ko.toFixed(2)), signal: ko > 0 ? 'buy' : 'sell', strength: 5, category: 'volume', timestamp };
  }

  // ---- NEW: Negative Volume Index ----
  private static calculateNVI(candles: CandleData[], timestamp: number): IndicatorValue {
    if (candles.length < 20) return { name: 'NVI', value: null, signal: 'neutral', strength: 0, category: 'volume', timestamp };
    let nvi = 1000;
    for (let i = 1; i < candles.length; i++) {
      if ((candles[i].volume || 1000) < (candles[i - 1].volume || 1000)) {
        nvi += nvi * ((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
      }
    }
    const ema255 = nvi; // Simplified - in full version would use 255-period EMA of NVI
    return { name: 'NVI', value: parseFloat(nvi.toFixed(2)), signal: nvi > ema255 ? 'buy' : 'sell', strength: 4, category: 'volume', timestamp };
  }

  // ---- Fibonacci helpers ----
  private static calculateFibonacciLevel(high: number, low: number, level: number, name: string, timestamp: number): IndicatorValue {
    const price = high - ((high - low) * level);
    return { name, value: parseFloat(price.toFixed(5)), signal: 'neutral', strength: 3, category: 'fibonacci', timestamp };
  }

  private static calculateFibonacciExtension(high: number, low: number, level: number, name: string, timestamp: number): IndicatorValue {
    const price = high + ((high - low) * (level - 1));
    return { name, value: parseFloat(price.toFixed(5)), signal: 'neutral', strength: 3, category: 'fibonacci', timestamp };
  }

  // ---- REAL Custom Indicators ----
  private static calculatePivotPoints(high: number, low: number, close: number, timestamp: number): IndicatorValue {
    const pivot = (high + low + close) / 3;
    const r1 = 2 * pivot - low;
    const s1 = 2 * pivot - high;
    const cp = close;
    return { name: 'Pivot Point', value: parseFloat(pivot.toFixed(5)), signal: cp > pivot ? 'buy' : cp < pivot ? 'sell' : 'neutral', strength: 5, category: 'custom', timestamp };
  }

  private static calculateSupportResistance(candles: CandleData[], timestamp: number): IndicatorValue {
    if (candles.length < 20) return { name: 'S/R Level', value: null, signal: 'neutral', strength: 0, category: 'custom', timestamp };
    const highs = candles.slice(-20).map(c => c.high);
    const lows = candles.slice(-20).map(c => c.low);
    const resistance = Math.max(...highs);
    const support = Math.min(...lows);
    const cp = candles[candles.length - 1].close;
    const distToRes = (resistance - cp) / cp;
    const distToSup = (cp - support) / cp;
    return { name: 'S/R Level', value: parseFloat(resistance.toFixed(5)), signal: distToRes < distToSup ? 'sell' : 'buy', strength: 5, category: 'custom', timestamp };
  }

  private static calculateTrendStrength(data: number[], timestamp: number): IndicatorValue {
    if (data.length < 20) return { name: 'Trend Strength', value: null, signal: 'neutral', strength: 0, category: 'custom', timestamp };
    const first = data[data.length - 20];
    const last = data[data.length - 1];
    const change = ((last - first) / first) * 100;
    const strength = Math.min(10, Math.abs(change) * 10);
    return { name: 'Trend Strength', value: parseFloat(change.toFixed(4)), signal: change > 0 ? 'buy' : 'sell', strength: Math.round(strength), category: 'custom', timestamp };
  }

  private static calculateMarketStructure(candles: CandleData[], timestamp: number): IndicatorValue {
    if (candles.length < 20) return { name: 'Market Structure', value: null, signal: 'neutral', strength: 0, category: 'custom', timestamp };
    // Higher highs / higher lows = bullish; lower highs / lower lows = bearish
    const recent = candles.slice(-10);
    let hh = 0, hl = 0, lh = 0, ll = 0;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].high > recent[i - 1].high) hh++; else lh++;
      if (recent[i].low > recent[i - 1].low) hl++; else ll++;
    }
    const score = (hh + hl - lh - ll) / (recent.length - 1);
    return { name: 'Market Structure', value: parseFloat(score.toFixed(2)), signal: score > 0.3 ? 'buy' : score < -0.3 ? 'sell' : 'neutral', strength: Math.abs(score) > 0.5 ? 7 : 4, category: 'custom', timestamp };
  }

  private static calculateVolatilityPercentile(candles: CandleData[], timestamp: number): IndicatorValue {
    if (candles.length < 100) return { name: 'Vol Percentile', value: null, signal: 'neutral', strength: 0, category: 'custom', timestamp };
    const atrs = atrArray(candles, 14);
    const currentATR = atrs[atrs.length - 1];
    const sorted = [...atrs.slice(-100)].sort((a, b) => a - b);
    const rank = sorted.findIndex(v => v >= currentATR);
    const percentile = (rank / sorted.length) * 100;
    return { name: 'Vol Percentile', value: parseFloat(percentile.toFixed(1)), signal: percentile > 80 ? 'sell' : percentile < 20 ? 'buy' : 'neutral', strength: percentile > 80 || percentile < 20 ? 7 : 4, category: 'custom', timestamp };
  }

  // ---- NEW: Heikin Ashi Signal ----
  private static calculateHeikinAshiSignal(candles: CandleData[], timestamp: number): IndicatorValue {
    if (candles.length < 5) return { name: 'Heikin Ashi', value: null, signal: 'neutral', strength: 0, category: 'custom', timestamp };
    // Calculate last HA candle
    const prevHA = {
      open: (candles[candles.length - 3].open + candles[candles.length - 3].close) / 2,
      close: (candles[candles.length - 3].open + candles[candles.length - 3].high + candles[candles.length - 3].low + candles[candles.length - 3].close) / 4
    };
    const haOpen = (prevHA.open + prevHA.close) / 2;
    const c = candles[candles.length - 1];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const bullish = haClose > haOpen;
    const noLowerShadow = bullish && Math.min(c.open, c.close) <= c.low * 1.001;
    return { name: 'Heikin Ashi', value: haClose > haOpen ? 1 : -1, signal: bullish ? 'buy' : 'sell', strength: noLowerShadow ? 8 : 5, category: 'custom', timestamp };
  }

  // ---- NEW: Elder Impulse System ----
  private static calculateElderImpulse(candles: CandleData[], timestamp: number): IndicatorValue {
    if (candles.length < 26) return { name: 'Elder Impulse', value: null, signal: 'neutral', strength: 0, category: 'custom', timestamp };
    const closes = candles.map(c => c.close);
    const ema13 = emaArray(closes, 13);
    const emaRising = ema13[ema13.length - 1] > ema13[ema13.length - 2];
    // MACD histogram direction
    const e12 = emaArray(closes, 12);
    const e26 = emaArray(closes, 26);
    const macdLine = e12.map((v, i) => v - e26[i]);
    const sigLine = emaArray(macdLine, 9);
    const hist = macdLine[macdLine.length - 1] - sigLine[sigLine.length - 1];
    const prevHist = macdLine[macdLine.length - 2] - sigLine[sigLine.length - 2];
    const histRising = hist > prevHist;
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    if (emaRising && histRising) signal = 'buy';
    else if (!emaRising && !histRising) signal = 'sell';
    return { name: 'Elder Impulse', value: signal === 'buy' ? 1 : signal === 'sell' ? -1 : 0, signal, strength: signal === 'neutral' ? 3 : 7, category: 'custom', timestamp };
  }

  // ============= MAIN ANALYSIS METHOD =============
  static analyzeRealTime(candles: CandleData[]): IndicatorResult {
    const cacheKey = `analysis_${candles.length}_${candles[candles.length - 1]?.close}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) return cached.result;

    if (candles.length < 50) {
      return { indicators: [], overallSignal: 'neutral', overallStrength: 0, confidence: 0, timestamp: Date.now() };
    }

    try {
      const allIndicators: IndicatorValue[] = [
        ...this.calculateAllTrendIndicators(candles),
        ...this.calculateAllMomentumIndicators(candles),
        ...this.calculateAllVolatilityIndicators(candles),
        ...this.calculateAllVolumeIndicators(candles),
        ...this.calculateAllFibonacciIndicators(candles),
        ...this.calculateAllCustomIndicators(candles)
      ].filter(indicator => indicator.value !== null);

      const buySignals = allIndicators.filter(i => i.signal === 'buy');
      const sellSignals = allIndicators.filter(i => i.signal === 'sell');
      const buyStrength = buySignals.reduce((sum, i) => sum + i.strength, 0);
      const sellStrength = sellSignals.reduce((sum, i) => sum + i.strength, 0);

      let overallSignal: 'buy' | 'sell' | 'neutral' = 'neutral';
      let overallStrength = 0;
      let confidence = 0;

      if (buyStrength > sellStrength && buyStrength > 20) {
        overallSignal = 'buy';
        overallStrength = Math.min(10, Math.round(buyStrength / Math.max(buySignals.length, 1)));
        confidence = Math.min(95, (buyStrength / (buyStrength + sellStrength)) * 100);
      } else if (sellStrength > buyStrength && sellStrength > 20) {
        overallSignal = 'sell';
        overallStrength = Math.min(10, Math.round(sellStrength / Math.max(sellSignals.length, 1)));
        confidence = Math.min(95, (sellStrength / (buyStrength + sellStrength)) * 100);
      } else {
        overallStrength = 3;
        confidence = 50;
      }

      const result: IndicatorResult = { indicators: allIndicators, overallSignal, overallStrength, confidence, timestamp: Date.now() };
      this.cache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error('Error in real-time analysis:', error);
      return { indicators: [], overallSignal: 'neutral', overallStrength: 0, confidence: 0, timestamp: Date.now() };
    }
  }
}

// ============= REAL-TIME MARKET DATA PROVIDER =============
export class RealTimeIndicatorEngine {
  private callbacks: Array<(result: IndicatorResult) => void> = [];
  private currentCandles: CandleData[] = [];
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initializeRealTimeUpdates();
  }

  private async initializeRealTimeUpdates() {
    unifiedMarketData.subscribe({
      onTick: (tick: UnifiedTick) => {
        this.updateCandlesFromTick(tick);
        this.calculateAndNotify();
      },
      onConnectionChange: (connected: boolean) => {
        console.log(`📊 Technical indicators connection: ${connected ? 'Connected' : 'Disconnected'}`);
      },
      onError: (error: Error) => {
        console.error('❌ Technical indicators error:', error);
      }
    });
    await this.loadHistoricalData();
  }

  private async loadHistoricalData() {
    try {
      this.currentCandles = await unifiedMarketData.getForexData('15m');
      console.log(`📊 Loaded ${this.currentCandles.length} historical candles for technical analysis`);
      this.calculateAndNotify();
    } catch (error) {
      console.error('❌ Error loading historical data:', error);
    }
  }

  private updateCandlesFromTick(tick: UnifiedTick) {
    const currentTime = new Date();
    const candleTime = new Date(Math.floor(currentTime.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000));
    if (this.currentCandles.length === 0) {
      this.currentCandles.push({ time: candleTime.toISOString(), open: tick.price, high: tick.price, low: tick.price, close: tick.price, volume: tick.volume || 1000 });
    } else {
      const lastCandle = this.currentCandles[this.currentCandles.length - 1];
      const lastCandleTime = new Date(lastCandle.time);
      if (candleTime.getTime() > lastCandleTime.getTime()) {
        this.currentCandles.push({ time: candleTime.toISOString(), open: tick.price, high: tick.price, low: tick.price, close: tick.price, volume: tick.volume || 1000 });
        if (this.currentCandles.length > 200) this.currentCandles = this.currentCandles.slice(-200);
      } else {
        lastCandle.high = Math.max(lastCandle.high, tick.price);
        lastCandle.low = Math.min(lastCandle.low, tick.price);
        lastCandle.close = tick.price;
        lastCandle.volume = (lastCandle.volume || 0) + (tick.volume || 1);
      }
    }
  }

  private calculateAndNotify() {
    if (this.currentCandles.length < 50) return;
    try {
      const result = AdvancedTechnicalIndicators.analyzeRealTime(this.currentCandles);
      this.callbacks.forEach(callback => {
        try { callback(result); } catch (error) { console.error('❌ Error in indicator callback:', error); }
      });
    } catch (error) {
      console.error('❌ Error calculating indicators:', error);
    }
  }

  subscribe(callback: (result: IndicatorResult) => void): () => void {
    this.callbacks.push(callback);
    if (this.currentCandles.length >= 50) {
      try {
        const result = AdvancedTechnicalIndicators.analyzeRealTime(this.currentCandles);
        callback(result);
      } catch {}
    }
    return () => { this.callbacks = this.callbacks.filter(cb => cb !== callback); };
  }

  getCandles(): CandleData[] { return [...this.currentCandles]; }

  destroy() {
    if (this.updateInterval) { clearInterval(this.updateInterval); this.updateInterval = null; }
    this.callbacks = [];
  }
}

export const realTimeIndicatorEngine = new RealTimeIndicatorEngine();
