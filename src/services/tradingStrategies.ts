import { CandleData } from './technicalAnalysis';
import { HarmonicPattern } from './harmonicPatterns';
import { FibonacciLevel, IchimokuComponents, PivotLevels } from './advancedIndicators';

export interface StrategySignal {
  name: string;
  type: 'scalping' | 'day_trading' | 'swing_trading' | 'position_trading';
  signal: 'buy' | 'sell' | 'neutral';
  strength: number;
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  description: string;
  timeframe: string;
  conditions: string[];
}

export interface MultiTimeframeAnalysis {
  timeframes: { [key: string]: { trend: 'bullish' | 'bearish' | 'neutral'; strength: number; signals: StrategySignal[] } };
  alignment: number;
  overallBias: 'bullish' | 'bearish' | 'neutral';
}

// ─── Shared helpers ───────────────────────────────────────────────────
function calcATR(candles: CandleData[]): number {
  let atr = 0;
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i-1].close), Math.abs(candles[i].low - candles[i-1].close));
    atr = i === 1 ? tr : ((atr * 13) + tr) / 14;
  }
  return atr;
}

function calcEMA(data: number[], period: number): number[] {
  const r: number[] = [data[0]];
  const m = 2 / (period + 1);
  for (let i = 1; i < data.length; i++) r[i] = (data[i] - r[i-1]) * m + r[i-1];
  return r;
}

function calcSMA(data: number[], period: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { r.push(0); continue; }
    r.push(data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period);
  }
  return r;
}

function calcRSI(data: number[], period: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period) { r.push(50); continue; }
    let g = 0, l = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const c = data[j] - data[j-1];
      if (c > 0) g += c; else l += Math.abs(c);
    }
    const rs = (g / period) / (l / period || 0.001);
    r.push(100 - 100 / (1 + rs));
  }
  return r;
}

function calcStochastic(candles: CandleData[], kPeriod = 14, dPeriod = 3): { k: number[]; d: number[] } {
  const kArr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < kPeriod - 1) { kArr.push(50); continue; }
    const slice = candles.slice(i - kPeriod + 1, i + 1);
    const h = Math.max(...slice.map(c => c.high));
    const l = Math.min(...slice.map(c => c.low));
    kArr.push(h === l ? 50 : ((candles[i].close - l) / (h - l)) * 100);
  }
  return { k: kArr, d: calcSMA(kArr, dPeriod) };
}

function calcMACD(closes: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
  const e12 = calcEMA(closes, 12), e26 = calcEMA(closes, 26);
  const macd = e12.map((v, i) => v - e26[i]);
  const signal = calcEMA(macd, 9);
  const histogram = macd.map((v, i) => v - signal[i]);
  return { macd, signal, histogram };
}

function calcADX(candles: CandleData[], period = 14): { adx: number[]; pdi: number[]; ndi: number[] } {
  const pdi: number[] = [], ndi: number[] = [], adx: number[] = [];
  let smoothPDM = 0, smoothNDM = 0, smoothTR = 0, prevADX = 0;
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) { pdi.push(0); ndi.push(0); adx.push(0); continue; }
    const upMove = candles[i].high - candles[i-1].high;
    const downMove = candles[i-1].low - candles[i].low;
    const pdm = upMove > downMove && upMove > 0 ? upMove : 0;
    const ndm = downMove > upMove && downMove > 0 ? downMove : 0;
    const tr = Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i-1].close), Math.abs(candles[i].low - candles[i-1].close));
    if (i <= period) {
      smoothPDM += pdm; smoothNDM += ndm; smoothTR += tr;
      if (i === period) { smoothPDM /= period; smoothNDM /= period; smoothTR /= period; }
      pdi.push(smoothTR > 0 ? (smoothPDM / smoothTR) * 100 : 0);
      ndi.push(smoothTR > 0 ? (smoothNDM / smoothTR) * 100 : 0);
      adx.push(0);
    } else {
      smoothPDM = smoothPDM - smoothPDM / period + pdm;
      smoothNDM = smoothNDM - smoothNDM / period + ndm;
      smoothTR = smoothTR - smoothTR / period + tr;
      const p = smoothTR > 0 ? (smoothPDM / smoothTR) * 100 : 0;
      const n = smoothTR > 0 ? (smoothNDM / smoothTR) * 100 : 0;
      pdi.push(p); ndi.push(n);
      const dx = (p + n) > 0 ? Math.abs(p - n) / (p + n) * 100 : 0;
      prevADX = (prevADX * (period - 1) + dx) / period;
      adx.push(prevADX);
    }
  }
  return { adx, pdi, ndi };
}

function superTrend(candles: CandleData[], period = 10, multiplier = 3): { trend: number[]; direction: number[] } {
  const atrArr: number[] = [0];
  let atr = 0;
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i-1].close), Math.abs(candles[i].low - candles[i-1].close));
    atr = i < period ? tr : ((atr * (period - 1)) + tr) / period;
    atrArr.push(atr);
  }
  const trend: number[] = [], dir: number[] = [];
  let prevUpper = 0, prevLower = 0, prevDir = 1;
  for (let i = 0; i < candles.length; i++) {
    const mid = (candles[i].high + candles[i].low) / 2;
    let upper = mid + multiplier * atrArr[i];
    let lower = mid - multiplier * atrArr[i];
    if (i > 0) {
      upper = upper < prevUpper || candles[i-1].close > prevUpper ? upper : prevUpper;
      lower = lower > prevLower || candles[i-1].close < prevLower ? lower : prevLower;
    }
    const d = i === 0 ? 1 : candles[i].close > prevUpper ? 1 : candles[i].close < prevLower ? -1 : prevDir;
    trend.push(d === 1 ? lower : upper);
    dir.push(d);
    prevUpper = upper; prevLower = lower; prevDir = d;
  }
  return { trend, direction: dir };
}

function makeSig(name: string, type: StrategySignal['type'], signal: 'buy' | 'sell', strength: number, confidence: number, entry: number, sl: number, tp: number, desc: string, tf: string, conds: string[]): StrategySignal {
  return { name, type, signal, strength, confidence, entry, stopLoss: sl, takeProfit: tp, riskReward: Math.abs(tp - entry) / (Math.abs(entry - sl) || 0.0001), description: desc, timeframe: tf, conditions: conds };
}

// ═══════════════════════════════════════════════════════════════════════
// SCALPING STRATEGIES
// ═══════════════════════════════════════════════════════════════════════
export class ScalpingStrategies {
  
  // 1. Momentum Scalping (existing)
  static momentumScalping(candles: CandleData[], ema8: number[], ema21: number[], rsi: number[]): StrategySignal | null {
    if (candles.length < 50) return null;
    const li = candles.length - 1;
    const cp = candles[li].close, cr = rsi[li], ce8 = ema8[li], ce21 = ema21[li];
    const atr = calcATR(candles.slice(-14));
    if (ce8 > ce21 && cr > 50 && cr < 80) {
      return makeSig('Momentum Scalping', 'scalping', 'buy', Math.min(Math.floor((cr - 50) / 5), 10), 65, cp, cp - atr * 1.5, cp + atr * 2, 'BUY on EMA crossover + RSI momentum', '1m', ['EMA8 > EMA21', 'RSI bullish']);
    }
    if (ce8 < ce21 && cr < 50 && cr > 20) {
      return makeSig('Momentum Scalping', 'scalping', 'sell', Math.min(Math.floor((50 - cr) / 5), 10), 65, cp, cp + atr * 1.5, cp - atr * 2, 'SELL on EMA crossover + RSI momentum', '1m', ['EMA8 < EMA21', 'RSI bearish']);
    }
    return null;
  }

  // 2. Bollinger Squeeze Scalping (existing)
  static bollingerSqueezeScalping(candles: CandleData[], bb: Array<{upper: number; middle: number; lower: number}>): StrategySignal | null {
    if (candles.length < 20 || bb.length < 20) return null;
    const li = candles.length - 1;
    const cp = candles[li].close, cb = bb[li];
    const bw = (cb.upper - cb.lower) / cb.middle;
    const avg = bb.slice(-20).reduce((s, b) => s + (b.upper - b.lower) / b.middle, 0) / 20;
    if (bw > avg * 0.8) return null;
    const atr = calcATR(candles.slice(-14));
    if (cp > cb.upper) return makeSig('Bollinger Squeeze', 'scalping', 'buy', 8, 75, cp, cb.middle, cp + atr * 3, 'BUY on BB breakout after squeeze', '1m-5m', ['BB squeeze', 'Upper break']);
    if (cp < cb.lower) return makeSig('Bollinger Squeeze', 'scalping', 'sell', 8, 75, cp, cb.middle, cp - atr * 3, 'SELL on BB breakdown after squeeze', '1m-5m', ['BB squeeze', 'Lower break']);
    return null;
  }

  // 3. RSI Divergence Scalp (NEW)
  static rsiDivergenceScalp(candles: CandleData[]): StrategySignal | null {
    if (candles.length < 30) return null;
    const closes = candles.map(c => c.close);
    const rsi = calcRSI(closes, 14);
    const li = candles.length - 1;
    const cp = closes[li];
    const atr = calcATR(candles.slice(-14));
    // Bullish divergence: price lower low, RSI higher low
    for (let lookback = 5; lookback <= 15; lookback++) {
      const pi = li - lookback;
      if (pi < 1) continue;
      if (closes[li] < closes[pi] && rsi[li] > rsi[pi] && rsi[li] < 35) {
        return makeSig('RSI Divergence Scalp', 'scalping', 'buy', 7, 70, cp, cp - atr * 1.5, cp + atr * 2.5, 'BUY on bullish RSI divergence', '1m-5m', ['Price lower low', 'RSI higher low', 'RSI oversold zone']);
      }
      if (closes[li] > closes[pi] && rsi[li] < rsi[pi] && rsi[li] > 65) {
        return makeSig('RSI Divergence Scalp', 'scalping', 'sell', 7, 70, cp, cp + atr * 1.5, cp - atr * 2.5, 'SELL on bearish RSI divergence', '1m-5m', ['Price higher high', 'RSI lower high', 'RSI overbought zone']);
      }
    }
    return null;
  }

  // 4. Stochastic Crossover (NEW)
  static stochasticCrossover(candles: CandleData[]): StrategySignal | null {
    if (candles.length < 20) return null;
    const { k, d } = calcStochastic(candles);
    const li = candles.length - 1;
    const cp = candles[li].close;
    const atr = calcATR(candles.slice(-14));
    // Bullish: %K crosses above %D in oversold zone
    if (k[li] > d[li] && k[li - 1] <= d[li - 1] && k[li] < 25) {
      return makeSig('Stochastic Crossover', 'scalping', 'buy', 7, 68, cp, cp - atr * 1.5, cp + atr * 2, 'BUY on stochastic bullish crossover in oversold', '1m-5m', ['%K > %D crossover', 'Oversold zone (<25)']);
    }
    if (k[li] < d[li] && k[li - 1] >= d[li - 1] && k[li] > 75) {
      return makeSig('Stochastic Crossover', 'scalping', 'sell', 7, 68, cp, cp + atr * 1.5, cp - atr * 2, 'SELL on stochastic bearish crossover in overbought', '1m-5m', ['%K < %D crossover', 'Overbought zone (>75)']);
    }
    return null;
  }

  // 5. MACD Histogram Scalp (NEW)
  static macdHistogramScalp(candles: CandleData[]): StrategySignal | null {
    if (candles.length < 30) return null;
    const closes = candles.map(c => c.close);
    const { histogram } = calcMACD(closes);
    const li = candles.length - 1;
    const cp = closes[li];
    const atr = calcATR(candles.slice(-14));
    // Histogram reversal from extreme negative
    const recent = histogram.slice(-10);
    const minHist = Math.min(...recent);
    const maxHist = Math.max(...recent);
    if (histogram[li] > histogram[li - 1] && histogram[li - 1] < 0 && histogram[li - 1] <= minHist * 0.9) {
      return makeSig('MACD Histogram Scalp', 'scalping', 'buy', 6, 65, cp, cp - atr * 1.5, cp + atr * 2, 'BUY on MACD histogram reversal from extreme', '1m-5m', ['Histogram uptick', 'From negative extreme']);
    }
    if (histogram[li] < histogram[li - 1] && histogram[li - 1] > 0 && histogram[li - 1] >= maxHist * 0.9) {
      return makeSig('MACD Histogram Scalp', 'scalping', 'sell', 6, 65, cp, cp + atr * 1.5, cp - atr * 2, 'SELL on MACD histogram reversal from extreme', '1m-5m', ['Histogram downtick', 'From positive extreme']);
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// DAY TRADING STRATEGIES
// ═══════════════════════════════════════════════════════════════════════
export class DayTradingStrategies {

  // 1. Opening Range Breakout (existing)
  static openingRangeBreakout(candles: CandleData[], openingMinutes = 30): StrategySignal | null {
    if (candles.length < openingMinutes + 10) return null;
    const openCandles = candles.slice(0, openingMinutes);
    const oH = Math.max(...openCandles.map(c => c.high));
    const oL = Math.min(...openCandles.map(c => c.low));
    const oR = oH - oL;
    const cp = candles[candles.length - 1].close;
    if (cp > oH && oR > 0) return makeSig('Opening Range Breakout', 'day_trading', 'buy', 7, 70, cp, oL, cp + oR * 2, 'BUY on opening range breakout', '5m-15m', ['Break above opening high']);
    if (cp < oL && oR > 0) return makeSig('Opening Range Breakout', 'day_trading', 'sell', 7, 70, cp, oH, cp - oR * 2, 'SELL on opening range breakdown', '5m-15m', ['Break below opening low']);
    return null;
  }

  // 2. VWAP Mean Reversion (existing)
  static vwapMeanReversion(candles: CandleData[], vwap: number[]): StrategySignal | null {
    if (candles.length < 50 || vwap.length < 50) return null;
    const li = candles.length - 1;
    const cp = candles[li].close, cv = vwap[li];
    const dev = Math.abs(cp - cv) / cv;
    if (dev < 0.005) return null;
    const atr = calcATR(candles.slice(-14));
    if (cp < cv * 0.995) return makeSig('VWAP Mean Reversion', 'day_trading', 'buy', Math.min(Math.floor(dev * 1000), 10), 65, cp, cp - atr * 2, cv, 'BUY mean reversion to VWAP', '15m-1h', ['Below VWAP', `Dev: ${(dev*100).toFixed(2)}%`]);
    if (cp > cv * 1.005) return makeSig('VWAP Mean Reversion', 'day_trading', 'sell', Math.min(Math.floor(dev * 1000), 10), 65, cp, cp + atr * 2, cv, 'SELL mean reversion to VWAP', '15m-1h', ['Above VWAP', `Dev: ${(dev*100).toFixed(2)}%`]);
    return null;
  }

  // 3. Pivot Point Bounce (NEW)
  static pivotPointBounce(candles: CandleData[]): StrategySignal | null {
    if (candles.length < 50) return null;
    // Calculate daily pivot from prior day's high/low/close
    const prev = candles[candles.length - 2];
    const pivot = (prev.high + prev.low + prev.close) / 3;
    const s1 = 2 * pivot - prev.high;
    const r1 = 2 * pivot - prev.low;
    const cp = candles[candles.length - 1].close;
    const atr = calcATR(candles.slice(-14));
    const tol = atr * 0.3;
    if (Math.abs(cp - s1) < tol && cp > s1) return makeSig('Pivot Point Bounce', 'day_trading', 'buy', 7, 70, cp, s1 - atr, pivot, 'BUY bounce off S1 pivot', '15m-1h', ['Price at S1 support', 'Bouncing higher']);
    if (Math.abs(cp - r1) < tol && cp < r1) return makeSig('Pivot Point Bounce', 'day_trading', 'sell', 7, 70, cp, r1 + atr, pivot, 'SELL rejection at R1 pivot', '15m-1h', ['Price at R1 resistance', 'Rejecting lower']);
    return null;
  }

  // 4. Keltner Channel Breakout (NEW)
  static keltnerChannelBreakout(candles: CandleData[]): StrategySignal | null {
    if (candles.length < 30) return null;
    const closes = candles.map(c => c.close);
    const ema20 = calcEMA(closes, 20);
    const li = candles.length - 1;
    const atr = calcATR(candles.slice(-20));
    const upper = ema20[li] + atr * 2;
    const lower = ema20[li] - atr * 2;
    const cp = closes[li];
    if (cp > upper) return makeSig('Keltner Breakout', 'day_trading', 'buy', 8, 72, cp, ema20[li], cp + atr * 3, 'BUY on Keltner upper breakout', '15m-1h', ['Close above upper Keltner', 'Strong momentum']);
    if (cp < lower) return makeSig('Keltner Breakout', 'day_trading', 'sell', 8, 72, cp, ema20[li], cp - atr * 3, 'SELL on Keltner lower breakdown', '15m-1h', ['Close below lower Keltner', 'Strong momentum']);
    return null;
  }

  // 5. Triple EMA Crossover (NEW)
  static tripleEmaCrossover(candles: CandleData[]): StrategySignal | null {
    if (candles.length < 30) return null;
    const closes = candles.map(c => c.close);
    const e5 = calcEMA(closes, 5), e13 = calcEMA(closes, 13), e26 = calcEMA(closes, 26);
    const li = candles.length - 1;
    const cp = closes[li];
    const atr = calcATR(candles.slice(-14));
    if (e5[li] > e13[li] && e13[li] > e26[li] && e5[li - 1] <= e13[li - 1]) {
      return makeSig('Triple EMA Crossover', 'day_trading', 'buy', 8, 73, cp, cp - atr * 2, cp + atr * 3, 'BUY on triple EMA bullish alignment', '15m-1h', ['EMA5 > EMA13 > EMA26', 'Fresh crossover']);
    }
    if (e5[li] < e13[li] && e13[li] < e26[li] && e5[li - 1] >= e13[li - 1]) {
      return makeSig('Triple EMA Crossover', 'day_trading', 'sell', 8, 73, cp, cp + atr * 2, cp - atr * 3, 'SELL on triple EMA bearish alignment', '15m-1h', ['EMA5 < EMA13 < EMA26', 'Fresh crossover']);
    }
    return null;
  }

  // 6. MACD Histogram Reversal (NEW)
  static macdHistogramReversal(candles: CandleData[]): StrategySignal | null {
    if (candles.length < 35) return null;
    const closes = candles.map(c => c.close);
    const { histogram } = calcMACD(closes);
    const li = candles.length - 1;
    const cp = closes[li];
    const atr = calcATR(candles.slice(-14));
    // Detect histogram direction change after 3+ bars in one direction
    let negCount = 0, posCount = 0;
    for (let i = li - 1; i >= li - 5 && i >= 0; i--) {
      if (histogram[i] < 0) negCount++; else posCount++;
    }
    if (negCount >= 3 && histogram[li] > histogram[li - 1] && histogram[li - 1] < 0) {
      return makeSig('MACD Histogram Reversal', 'day_trading', 'buy', 7, 68, cp, cp - atr * 2, cp + atr * 3, 'BUY on MACD histogram bullish reversal', '15m-1h', ['Histogram uptick after 3+ negative bars']);
    }
    if (posCount >= 3 && histogram[li] < histogram[li - 1] && histogram[li - 1] > 0) {
      return makeSig('MACD Histogram Reversal', 'day_trading', 'sell', 7, 68, cp, cp + atr * 2, cp - atr * 3, 'SELL on MACD histogram bearish reversal', '15m-1h', ['Histogram downtick after 3+ positive bars']);
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SWING TRADING STRATEGIES
// ═══════════════════════════════════════════════════════════════════════
export class SwingTradingStrategies {

  // 1. Ichimoku Cloud (existing)
  static ichimokuCloudStrategy(candles: CandleData[], ichimoku: IchimokuComponents): StrategySignal | null {
    if (candles.length < 52) return null;
    const li = candles.length - 1;
    const cp = candles[li].close;
    const atr = calcATR(candles.slice(-26));
    if (cp > ichimoku.kumoTop[li] && ichimoku.tenkanSen[li] > ichimoku.kijunSen[li] && cp > ichimoku.tenkanSen[li]) {
      return makeSig('Ichimoku Cloud', 'swing_trading', 'buy', 8, 80, cp, ichimoku.kijunSen[li], cp + atr * 4, 'BUY above Ichimoku cloud', '1h-4h', ['Price above cloud', 'Tenkan > Kijun']);
    }
    if (cp < ichimoku.kumoBottom[li] && ichimoku.tenkanSen[li] < ichimoku.kijunSen[li] && cp < ichimoku.tenkanSen[li]) {
      return makeSig('Ichimoku Cloud', 'swing_trading', 'sell', 8, 80, cp, ichimoku.kijunSen[li], cp - atr * 4, 'SELL below Ichimoku cloud', '1h-4h', ['Price below cloud', 'Tenkan < Kijun']);
    }
    return null;
  }

  // 2. Fibonacci Retracement (existing)
  static fibonacciRetracementStrategy(candles: CandleData[], fibLevels: FibonacciLevel[]): StrategySignal | null {
    if (candles.length < 50 || fibLevels.length === 0) return null;
    const cp = candles[candles.length - 1].close;
    const keyLevels = [0.382, 0.5, 0.618, 0.786];
    let nearLevel = false, levelType = '';
    for (const lv of fibLevels) {
      if (keyLevels.includes(lv.level) && Math.abs(cp - lv.price) / cp < 0.002) {
        nearLevel = true; levelType = `${(lv.level*100).toFixed(1)}% Fib`; break;
      }
    }
    if (!nearLevel) return null;
    const sma50 = calcSMA(candles.map(c => c.close), 50);
    const trend = cp > sma50[sma50.length - 1] ? 'bullish' : 'bearish';
    const atr = calcATR(candles.slice(-14));
    if (trend === 'bullish') return makeSig('Fibonacci Retracement', 'swing_trading', 'buy', 7, 75, cp, cp - atr * 2, cp + atr * 3, `BUY at ${levelType} in bullish trend`, '4h-1d', [`Near ${levelType}`, 'Bullish trend']);
    return makeSig('Fibonacci Retracement', 'swing_trading', 'sell', 7, 75, cp, cp + atr * 2, cp - atr * 3, `SELL at ${levelType} in bearish trend`, '4h-1d', [`Near ${levelType}`, 'Bearish trend']);
  }

  // 3. RSI Divergence Swing (NEW)
  static rsiDivergenceSwing(candles: CandleData[]): StrategySignal | null {
    if (candles.length < 50) return null;
    const closes = candles.map(c => c.close);
    const rsi = calcRSI(closes, 14);
    const li = candles.length - 1;
    const cp = closes[li];
    const atr = calcATR(candles.slice(-20));
    for (let lb = 10; lb <= 30; lb += 5) {
      const pi = li - lb;
      if (pi < 1) continue;
      if (closes[li] < closes[pi] && rsi[li] > rsi[pi] && rsi[li] < 40) {
        return makeSig('RSI Divergence Swing', 'swing_trading', 'buy', 8, 75, cp, cp - atr * 2.5, cp + atr * 4, 'BUY on multi-bar bullish RSI divergence', '1h-4h', ['Price lower low', 'RSI higher low', `${lb}-bar divergence`]);
      }
      if (closes[li] > closes[pi] && rsi[li] < rsi[pi] && rsi[li] > 60) {
        return makeSig('RSI Divergence Swing', 'swing_trading', 'sell', 8, 75, cp, cp + atr * 2.5, cp - atr * 4, 'SELL on multi-bar bearish RSI divergence', '1h-4h', ['Price higher high', 'RSI lower high', `${lb}-bar divergence`]);
      }
    }
    return null;
  }

  // 4. SuperTrend Following (NEW)
  static superTrendFollowing(candles: CandleData[]): StrategySignal | null {
    if (candles.length < 30) return null;
    const st = superTrend(candles);
    const { adx } = calcADX(candles);
    const li = candles.length - 1;
    const cp = candles[li].close;
    const atr = calcATR(candles.slice(-14));
    // SuperTrend flip + ADX confirmation
    if (st.direction[li] === 1 && st.direction[li - 1] === -1 && adx[li] > 20) {
      return makeSig('SuperTrend Following', 'swing_trading', 'buy', 8, 78, cp, st.trend[li], cp + atr * 4, 'BUY on SuperTrend flip bullish + ADX', '1h-4h', ['SuperTrend flipped bullish', `ADX: ${adx[li].toFixed(1)}`]);
    }
    if (st.direction[li] === -1 && st.direction[li - 1] === 1 && adx[li] > 20) {
      return makeSig('SuperTrend Following', 'swing_trading', 'sell', 8, 78, cp, st.trend[li], cp - atr * 4, 'SELL on SuperTrend flip bearish + ADX', '1h-4h', ['SuperTrend flipped bearish', `ADX: ${adx[li].toFixed(1)}`]);
    }
    return null;
  }

  // 5. Double Top/Bottom Entry (NEW)
  static doubleTopBottomEntry(candles: CandleData[]): StrategySignal | null {
    if (candles.length < 40) return null;
    const closes = candles.map(c => c.close);
    const li = candles.length - 1;
    const cp = closes[li];
    const atr = calcATR(candles.slice(-14));
    // Simple double-bottom: two lows within tolerance in recent 30 bars
    const recent = candles.slice(-30);
    const lows = recent.map(c => c.low);
    const minLow = Math.min(...lows);
    const minIdx1 = lows.indexOf(minLow);
    // Find second low near first
    for (let i = minIdx1 + 5; i < lows.length; i++) {
      if (Math.abs(lows[i] - minLow) / minLow < 0.003 && cp > minLow * 1.005) {
        const neckline = Math.max(...recent.slice(minIdx1, i).map(c => c.high));
        if (cp > neckline) {
          return makeSig('Double Bottom Entry', 'swing_trading', 'buy', 8, 72, cp, minLow - atr * 0.5, cp + (cp - minLow), 'BUY on double bottom neckline break', '1h-4h', ['Double bottom formed', 'Neckline broken']);
        }
      }
    }
    // Double top
    const highs = recent.map(c => c.high);
    const maxHigh = Math.max(...highs);
    const maxIdx1 = highs.indexOf(maxHigh);
    for (let i = maxIdx1 + 5; i < highs.length; i++) {
      if (Math.abs(highs[i] - maxHigh) / maxHigh < 0.003 && cp < maxHigh * 0.995) {
        const neckline = Math.min(...recent.slice(maxIdx1, i).map(c => c.low));
        if (cp < neckline) {
          return makeSig('Double Top Entry', 'swing_trading', 'sell', 8, 72, cp, maxHigh + atr * 0.5, cp - (maxHigh - cp), 'SELL on double top neckline break', '1h-4h', ['Double top formed', 'Neckline broken']);
        }
      }
    }
    return null;
  }

  // 6. ADX Trend Strength (NEW)
  static adxTrendStrength(candles: CandleData[]): StrategySignal | null {
    if (candles.length < 30) return null;
    const { adx, pdi, ndi } = calcADX(candles);
    const li = candles.length - 1;
    const cp = candles[li].close;
    const atr = calcATR(candles.slice(-14));
    if (adx[li] > 25 && pdi[li] > ndi[li] && pdi[li - 1] <= ndi[li - 1]) {
      return makeSig('ADX Trend Strength', 'swing_trading', 'buy', 8, 74, cp, cp - atr * 2, cp + atr * 3.5, 'BUY on +DI crossover with strong ADX', '1h-4h', [`ADX: ${adx[li].toFixed(1)}`, '+DI crossed above -DI']);
    }
    if (adx[li] > 25 && ndi[li] > pdi[li] && ndi[li - 1] <= pdi[li - 1]) {
      return makeSig('ADX Trend Strength', 'swing_trading', 'sell', 8, 74, cp, cp + atr * 2, cp - atr * 3.5, 'SELL on -DI crossover with strong ADX', '1h-4h', [`ADX: ${adx[li].toFixed(1)}`, '-DI crossed above +DI']);
    }
    return null;
  }

  // 7. Harmonic PRZ Entry (NEW)
  static harmonicPRZEntry(candles: CandleData[], patterns: HarmonicPattern[]): StrategySignal | null {
    if (patterns.length === 0) return null;
    const cp = candles[candles.length - 1].close;
    const atr = calcATR(candles.slice(-14));
    // Find pattern where price is in PRZ
    for (const p of patterns) {
      if (cp >= p.prz.lower && cp <= p.prz.upper && p.confidence >= 60) {
        const sig = p.type === 'bullish' ? 'buy' : 'sell';
        return makeSig(`Harmonic ${p.name} Entry`, 'swing_trading', sig as 'buy' | 'sell', Math.min(Math.floor(p.confidence / 10), 10), p.confidence,
          cp, p.stopLoss, p.projectedTarget, `${sig.toUpperCase()} at ${p.name} PRZ (${p.confidence}% conf)`, '1h-4h',
          [`${p.name} pattern detected`, `PRZ: ${p.prz.lower.toFixed(5)}-${p.prz.upper.toFixed(5)}`, `Confidence: ${p.confidence}%`]);
      }
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// POSITION TRADING STRATEGIES
// ═══════════════════════════════════════════════════════════════════════
export class PositionTradingStrategies {

  // 1. Long-term Trend Following (existing)
  static longTermTrendFollowing(candles: CandleData[]): StrategySignal | null {
    if (candles.length < 200) return null;
    const closes = candles.map(c => c.close);
    const sma50 = calcSMA(closes, 50), sma200 = calcSMA(closes, 200);
    const li = closes.length - 1;
    const cp = closes[li], c50 = sma50[li], c200 = sma200[li];
    const atr = calcATR(candles.slice(-20));
    if (c50 > c200 && cp > c50) return makeSig('Long-term Trend', 'position_trading', 'buy', 6, 70, cp, c200, cp + atr * 10, 'BUY on Golden Cross', '1d-1w', ['SMA50 > SMA200', 'Price above SMA50']);
    if (c50 < c200 && cp < c50) return makeSig('Long-term Trend', 'position_trading', 'sell', 6, 70, cp, c200, cp - atr * 10, 'SELL on Death Cross', '1d-1w', ['SMA50 < SMA200', 'Price below SMA50']);
    return null;
  }

  // 2. MA Ribbon (NEW)
  static maRibbon(candles: CandleData[]): StrategySignal | null {
    if (candles.length < 60) return null;
    const closes = candles.map(c => c.close);
    const periods = [8, 13, 21, 34, 55];
    const emas = periods.map(p => calcEMA(closes, p));
    const li = closes.length - 1;
    const cp = closes[li];
    const atr = calcATR(candles.slice(-20));
    // Check fan alignment
    const vals = emas.map(e => e[li]);
    const bullish = vals.every((v, i) => i === 0 || v < vals[i - 1]); // EMA8 > EMA13 > ...
    const bearish = vals.every((v, i) => i === 0 || v > vals[i - 1]);
    if (bullish) return makeSig('MA Ribbon', 'position_trading', 'buy', 7, 72, cp, vals[vals.length - 1], cp + atr * 6, 'BUY on full MA ribbon bullish alignment', '4h-1d', ['All 5 EMAs aligned bullish']);
    if (bearish) return makeSig('MA Ribbon', 'position_trading', 'sell', 7, 72, cp, vals[vals.length - 1], cp - atr * 6, 'SELL on full MA ribbon bearish alignment', '4h-1d', ['All 5 EMAs aligned bearish']);
    return null;
  }

  // 3. Monthly Pivot Strategy (NEW)
  static monthlyPivotStrategy(candles: CandleData[]): StrategySignal | null {
    if (candles.length < 100) return null;
    // Use last 20 candles as "monthly" proxy
    const monthSlice = candles.slice(-22, -1);
    const mH = Math.max(...monthSlice.map(c => c.high));
    const mL = Math.min(...monthSlice.map(c => c.low));
    const mC = monthSlice[monthSlice.length - 1].close;
    const pivot = (mH + mL + mC) / 3;
    const s1 = 2 * pivot - mH;
    const r1 = 2 * pivot - mL;
    const cp = candles[candles.length - 1].close;
    const atr = calcATR(candles.slice(-20));
    if (cp > pivot && cp < r1 * 0.998) return makeSig('Monthly Pivot', 'position_trading', 'buy', 6, 65, cp, s1, r1, 'BUY above monthly pivot targeting R1', '1d-1w', ['Price above monthly pivot', `Pivot: ${pivot.toFixed(5)}`]);
    if (cp < pivot && cp > s1 * 1.002) return makeSig('Monthly Pivot', 'position_trading', 'sell', 6, 65, cp, r1, s1, 'SELL below monthly pivot targeting S1', '1d-1w', ['Price below monthly pivot', `Pivot: ${pivot.toFixed(5)}`]);
    return null;
  }

  // 4. Breakout Retest (NEW)
  static breakoutRetest(candles: CandleData[]): StrategySignal | null {
    if (candles.length < 50) return null;
    const li = candles.length - 1;
    const cp = candles[li].close;
    const atr = calcATR(candles.slice(-20));
    // Find recent resistance (highest high in 20-50 bars ago)
    const lookbackSlice = candles.slice(-50, -10);
    const resistance = Math.max(...lookbackSlice.map(c => c.high));
    const support = Math.min(...lookbackSlice.map(c => c.low));
    // Breakout above resistance, now retesting
    if (cp > resistance * 0.998 && cp < resistance * 1.005) {
      // Check that we broke above earlier
      const recentAbove = candles.slice(-10).some(c => c.close > resistance * 1.005);
      if (recentAbove) return makeSig('Breakout Retest', 'position_trading', 'buy', 7, 70, cp, resistance - atr, cp + atr * 5, 'BUY on breakout retest of resistance as support', '4h-1d', ['Prior resistance now support', 'Retest in progress']);
    }
    if (cp < support * 1.002 && cp > support * 0.995) {
      const recentBelow = candles.slice(-10).some(c => c.close < support * 0.995);
      if (recentBelow) return makeSig('Breakout Retest', 'position_trading', 'sell', 7, 70, cp, support + atr, cp - atr * 5, 'SELL on breakdown retest of support as resistance', '4h-1d', ['Prior support now resistance', 'Retest in progress']);
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MULTI-TIMEFRAME ENGINE
// ═══════════════════════════════════════════════════════════════════════
export class MultiTimeframeEngine {

  static analyzeMultipleTimeframes(data: { [timeframe: string]: CandleData[] }): MultiTimeframeAnalysis {
    const analysis: MultiTimeframeAnalysis = { timeframes: {}, alignment: 0, overallBias: 'neutral' };
    let bull = 0, bear = 0, total = 0;

    for (const tf of Object.keys(data)) {
      const candles = data[tf];
      if (candles.length < 50) continue;
      const signals = this.generateSignalsForTimeframe(candles, tf);
      const trend = this.determineTrend(candles);
      analysis.timeframes[tf] = { trend, strength: this.calculateTrendStrength(candles), signals };
      if (trend === 'bullish') bull++;
      if (trend === 'bearish') bear++;
      total++;
    }

    const max = Math.max(bull, bear);
    analysis.alignment = total > 0 ? (max / total) * 100 : 0;
    if (bull > bear && analysis.alignment > 60) analysis.overallBias = 'bullish';
    else if (bear > bull && analysis.alignment > 60) analysis.overallBias = 'bearish';
    return analysis;
  }

  private static generateSignalsForTimeframe(candles: CandleData[], timeframe: string): StrategySignal[] {
    const signals: StrategySignal[] = [];
    if (timeframe.includes('m') && parseInt(timeframe) <= 5) {
      const ema8 = calcEMA(candles.map(c => c.close), 8);
      const ema21 = calcEMA(candles.map(c => c.close), 21);
      const rsi = calcRSI(candles.map(c => c.close), 14);
      const s = ScalpingStrategies.momentumScalping(candles, ema8, ema21, rsi);
      if (s) signals.push(s);
      const s2 = ScalpingStrategies.rsiDivergenceScalp(candles);
      if (s2) signals.push(s2);
      const s3 = ScalpingStrategies.stochasticCrossover(candles);
      if (s3) signals.push(s3);
    } else if (timeframe.includes('h') || timeframe.includes('15m') || timeframe.includes('30m')) {
      const orb = DayTradingStrategies.openingRangeBreakout(candles);
      if (orb) signals.push(orb);
      const pp = DayTradingStrategies.pivotPointBounce(candles);
      if (pp) signals.push(pp);
      const kb = DayTradingStrategies.keltnerChannelBreakout(candles);
      if (kb) signals.push(kb);
      const te = DayTradingStrategies.tripleEmaCrossover(candles);
      if (te) signals.push(te);
      // Swing
      const rd = SwingTradingStrategies.rsiDivergenceSwing(candles);
      if (rd) signals.push(rd);
      const st = SwingTradingStrategies.superTrendFollowing(candles);
      if (st) signals.push(st);
      const dt = SwingTradingStrategies.doubleTopBottomEntry(candles);
      if (dt) signals.push(dt);
      const ax = SwingTradingStrategies.adxTrendStrength(candles);
      if (ax) signals.push(ax);
    } else if (timeframe.includes('d') || timeframe.includes('4h')) {
      const trend = PositionTradingStrategies.longTermTrendFollowing(candles);
      if (trend) signals.push(trend);
      const mr = PositionTradingStrategies.maRibbon(candles);
      if (mr) signals.push(mr);
      const mp = PositionTradingStrategies.monthlyPivotStrategy(candles);
      if (mp) signals.push(mp);
      const br = PositionTradingStrategies.breakoutRetest(candles);
      if (br) signals.push(br);
    }
    return signals;
  }

  private static determineTrend(candles: CandleData[]): 'bullish' | 'bearish' | 'neutral' {
    if (candles.length < 50) return 'neutral';
    const closes = candles.map(c => c.close);
    const sma20 = calcSMA(closes, 20), sma50 = calcSMA(closes, 50);
    const li = closes.length - 1;
    if (closes[li] > sma20[li] && sma20[li] > sma50[li]) return 'bullish';
    if (closes[li] < sma20[li] && sma20[li] < sma50[li]) return 'bearish';
    return 'neutral';
  }

  private static calculateTrendStrength(candles: CandleData[]): number {
    if (candles.length < 20) return 0;
    const closes = candles.map(c => c.close).slice(-20);
    return Math.min(Math.floor(Math.abs(closes[closes.length - 1] - closes[0]) / closes[0] * 100), 10);
  }
}
