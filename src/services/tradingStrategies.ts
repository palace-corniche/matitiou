import { CandleData } from './technicalAnalysis';
import { HarmonicPattern } from './harmonicPatterns';
import { FibonacciLevel, IchimokuComponents, PivotLevels } from './advancedIndicators';

export interface StrategySignal {
  name: string;
  type: 'scalping' | 'day_trading' | 'swing_trading' | 'position_trading';
  signal: 'buy' | 'sell' | 'neutral';
  strength: number; // 1-10
  confidence: number; // 0-100%
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  description: string;
  timeframe: string;
  conditions: string[];
}

export interface MultiTimeframeAnalysis {
  timeframes: {
    [key: string]: {
      trend: 'bullish' | 'bearish' | 'neutral';
      strength: number;
      signals: StrategySignal[];
    };
  };
  alignment: number; // 0-100% how aligned the timeframes are
  overallBias: 'bullish' | 'bearish' | 'neutral';
}

// Scalping Strategies
export class ScalpingStrategies {
  
  // 1-Minute Momentum Scalping
  static momentumScalping(candles: CandleData[], ema8: number[], ema21: number[], rsi: number[]): StrategySignal | null {
    if (candles.length < 50) return null;
    
    const lastIndex = candles.length - 1;
    const currentPrice = candles[lastIndex].close;
    const currentRSI = rsi[lastIndex];
    const currentEMA8 = ema8[lastIndex];
    const currentEMA21 = ema21[lastIndex];
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    let confidence = 0;
    const conditions: string[] = [];
    
    // Bullish momentum conditions
    if (currentEMA8 > currentEMA21 && currentRSI > 50 && currentRSI < 80) {
      signal = 'buy';
      strength = Math.min(Math.floor((currentRSI - 50) / 5), 10);
      confidence = 65;
      conditions.push('EMA8 > EMA21', 'RSI bullish momentum', 'Not overbought');
    }
    
    // Bearish momentum conditions
    if (currentEMA8 < currentEMA21 && currentRSI < 50 && currentRSI > 20) {
      signal = 'sell';
      strength = Math.min(Math.floor((50 - currentRSI) / 5), 10);
      confidence = 65;
      conditions.push('EMA8 < EMA21', 'RSI bearish momentum', 'Not oversold');
    }
    
    if (signal === 'neutral') return null;
    
    const atr = this.calculateATR(candles.slice(-14));
    const stopLoss = signal === 'buy' ? currentPrice - (atr * 1.5) : currentPrice + (atr * 1.5);
    const takeProfit = signal === 'buy' ? currentPrice + (atr * 2) : currentPrice - (atr * 2);
    
    return {
      name: 'Momentum Scalping',
      type: 'scalping',
      signal,
      strength,
      confidence,
      entry: currentPrice,
      stopLoss,
      takeProfit,
      riskReward: Math.abs(takeProfit - currentPrice) / Math.abs(currentPrice - stopLoss),
      description: `${signal.toUpperCase()} signal based on EMA crossover and RSI momentum`,
      timeframe: '1m',
      conditions
    };
  }
  
  // Bollinger Band Squeeze Scalping
  static bollingerSqueezeScalping(candles: CandleData[], bb: Array<{upper: number, middle: number, lower: number}>): StrategySignal | null {
    if (candles.length < 20 || bb.length < 20) return null;
    
    const lastIndex = candles.length - 1;
    const currentPrice = candles[lastIndex].close;
    const currentBB = bb[lastIndex];
    
    // Check for squeeze (narrow bands)
    const bandWidth = (currentBB.upper - currentBB.lower) / currentBB.middle;
    const avgBandWidth = bb.slice(-20).reduce((sum, band) => sum + ((band.upper - band.lower) / band.middle), 0) / 20;
    
    if (bandWidth > avgBandWidth * 0.8) return null; // Not in squeeze
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    const conditions: string[] = [];
    
    // Breakout above upper band
    if (currentPrice > currentBB.upper) {
      signal = 'buy';
      conditions.push('Price breaks above upper Bollinger Band', 'Bollinger Band squeeze present');
    }
    
    // Breakdown below lower band
    if (currentPrice < currentBB.lower) {
      signal = 'sell';
      conditions.push('Price breaks below lower Bollinger Band', 'Bollinger Band squeeze present');
    }
    
    if (signal === 'neutral') return null;
    
    const atr = this.calculateATR(candles.slice(-14));
    const stopLoss = signal === 'buy' ? currentBB.middle : currentBB.middle;
    const takeProfit = signal === 'buy' ? currentPrice + (atr * 3) : currentPrice - (atr * 3);
    
    return {
      name: 'Bollinger Squeeze Scalping',
      type: 'scalping',
      signal,
      strength: 8,
      confidence: 75,
      entry: currentPrice,
      stopLoss,
      takeProfit,
      riskReward: Math.abs(takeProfit - currentPrice) / Math.abs(currentPrice - stopLoss),
      description: `${signal.toUpperCase()} on Bollinger Band breakout after squeeze`,
      timeframe: '1m-5m',
      conditions
    };
  }
  
  private static calculateATR(candles: CandleData[]): number {
    let atr = 0;
    
    for (let i = 1; i < candles.length; i++) {
      const tr1 = candles[i].high - candles[i].low;
      const tr2 = Math.abs(candles[i].high - candles[i-1].close);
      const tr3 = Math.abs(candles[i].low - candles[i-1].close);
      const tr = Math.max(tr1, tr2, tr3);
      
      if (i === 1) {
        atr = tr;
      } else {
        atr = ((atr * 13) + tr) / 14;
      }
    }
    
    return atr;
  }
}

// Day Trading Strategies
export class DayTradingStrategies {
  
  // Opening Range Breakout
  static openingRangeBreakout(candles: CandleData[], openingMinutes = 30): StrategySignal | null {
    if (candles.length < openingMinutes + 10) return null;
    
    // Calculate opening range
    const openingCandles = candles.slice(0, openingMinutes);
    const openingHigh = Math.max(...openingCandles.map(c => c.high));
    const openingLow = Math.min(...openingCandles.map(c => c.low));
    const openingRange = openingHigh - openingLow;
    
    const currentPrice = candles[candles.length - 1].close;
    const conditions: string[] = [];
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    
    // Bullish breakout
    if (currentPrice > openingHigh && openingRange > 0) {
      signal = 'buy';
      conditions.push('Price breaks above opening range high', `Opening range: ${openingRange.toFixed(4)}`);
    }
    
    // Bearish breakdown
    if (currentPrice < openingLow && openingRange > 0) {
      signal = 'sell';
      conditions.push('Price breaks below opening range low', `Opening range: ${openingRange.toFixed(4)}`);
    }
    
    if (signal === 'neutral') return null;
    
    const stopLoss = signal === 'buy' ? openingLow : openingHigh;
    const target = openingRange * 2;
    const takeProfit = signal === 'buy' ? currentPrice + target : currentPrice - target;
    
    return {
      name: 'Opening Range Breakout',
      type: 'day_trading',
      signal,
      strength: 7,
      confidence: 70,
      entry: currentPrice,
      stopLoss,
      takeProfit,
      riskReward: Math.abs(takeProfit - currentPrice) / Math.abs(currentPrice - stopLoss),
      description: `${signal.toUpperCase()} on opening range breakout`,
      timeframe: '5m-15m',
      conditions
    };
  }
  
  // VWAP Mean Reversion
  static vwapMeanReversion(candles: CandleData[], vwap: number[]): StrategySignal | null {
    if (candles.length < 50 || vwap.length < 50) return null;
    
    const lastIndex = candles.length - 1;
    const currentPrice = candles[lastIndex].close;
    const currentVWAP = vwap[lastIndex];
    
    const deviation = Math.abs(currentPrice - currentVWAP) / currentVWAP;
    const conditions: string[] = [];
    
    // Significant deviation from VWAP (mean reversion opportunity)
    if (deviation < 0.005) return null; // Too close to VWAP
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    
    // Price significantly below VWAP - potential bounce
    if (currentPrice < currentVWAP * 0.995) {
      signal = 'buy';
      conditions.push('Price significantly below VWAP', `Deviation: ${(deviation * 100).toFixed(2)}%`);
    }
    
    // Price significantly above VWAP - potential reversion
    if (currentPrice > currentVWAP * 1.005) {
      signal = 'sell';
      conditions.push('Price significantly above VWAP', `Deviation: ${(deviation * 100).toFixed(2)}%`);
    }
    
    if (signal === 'neutral') return null;
    
    const atr = ScalpingStrategies['calculateATR'](candles.slice(-14));
    const stopLoss = signal === 'buy' ? currentPrice - (atr * 2) : currentPrice + (atr * 2);
    const takeProfit = currentVWAP; // Target is return to VWAP
    
    return {
      name: 'VWAP Mean Reversion',
      type: 'day_trading',
      signal,
      strength: Math.min(Math.floor(deviation * 1000), 10),
      confidence: 65,
      entry: currentPrice,
      stopLoss,
      takeProfit,
      riskReward: Math.abs(takeProfit - currentPrice) / Math.abs(currentPrice - stopLoss),
      description: `${signal.toUpperCase()} mean reversion to VWAP`,
      timeframe: '15m-1h',
      conditions
    };
  }
}

// Swing Trading Strategies
export class SwingTradingStrategies {
  
  // Ichimoku Cloud Strategy
  static ichimokuCloudStrategy(candles: CandleData[], ichimoku: IchimokuComponents): StrategySignal | null {
    if (candles.length < 52) return null;
    
    const lastIndex = candles.length - 1;
    const currentPrice = candles[lastIndex].close;
    const currentTenkan = ichimoku.tenkanSen[lastIndex];
    const currentKijun = ichimoku.kijunSen[lastIndex];
    const currentCloudTop = ichimoku.kumoTop[lastIndex];
    const currentCloudBottom = ichimoku.kumoBottom[lastIndex];
    
    const conditions: string[] = [];
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    // Bullish conditions
    if (currentPrice > currentCloudTop && 
        currentTenkan > currentKijun && 
        currentPrice > currentTenkan) {
      signal = 'buy';
      strength = 8;
      conditions.push('Price above cloud', 'Tenkan > Kijun', 'Price > Tenkan');
    }
    
    // Bearish conditions
    if (currentPrice < currentCloudBottom && 
        currentTenkan < currentKijun && 
        currentPrice < currentTenkan) {
      signal = 'sell';
      strength = 8;
      conditions.push('Price below cloud', 'Tenkan < Kijun', 'Price < Tenkan');
    }
    
    if (signal === 'neutral') return null;
    
    const stopLoss = signal === 'buy' ? currentKijun : currentKijun;
    const atr = ScalpingStrategies['calculateATR'](candles.slice(-26));
    const takeProfit = signal === 'buy' ? currentPrice + (atr * 4) : currentPrice - (atr * 4);
    
    return {
      name: 'Ichimoku Cloud Strategy',
      type: 'swing_trading',
      signal,
      strength,
      confidence: 80,
      entry: currentPrice,
      stopLoss,
      takeProfit,
      riskReward: Math.abs(takeProfit - currentPrice) / Math.abs(currentPrice - stopLoss),
      description: `${signal.toUpperCase()} based on Ichimoku Cloud alignment`,
      timeframe: '1h-4h',
      conditions
    };
  }
  
  // Fibonacci Retracement Strategy
  static fibonacciRetracementStrategy(candles: CandleData[], fibLevels: FibonacciLevel[]): StrategySignal | null {
    if (candles.length < 50 || fibLevels.length === 0) return null;
    
    const currentPrice = candles[candles.length - 1].close;
    const conditions: string[] = [];
    
    // Find if price is near a key Fibonacci level
    const keyLevels = [0.382, 0.5, 0.618, 0.786];
    let nearKeyLevel = false;
    let levelType = '';
    
    for (const level of fibLevels) {
      if (keyLevels.includes(level.level)) {
        const distance = Math.abs(currentPrice - level.price) / currentPrice;
        if (distance < 0.002) { // Within 0.2% of Fibonacci level
          nearKeyLevel = true;
          levelType = `${(level.level * 100).toFixed(1)}% Fibonacci`;
          conditions.push(`Price near ${levelType} level`);
          break;
        }
      }
    }
    
    if (!nearKeyLevel) return null;
    
    // Determine trend direction
    const sma50 = this.calculateSMA(candles.map(c => c.close), 50);
    const currentSMA = sma50[sma50.length - 1];
    const trendDirection = currentPrice > currentSMA ? 'bullish' : 'bearish';
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    
    if (trendDirection === 'bullish' && currentPrice < currentSMA * 1.02) {
      signal = 'buy';
      conditions.push('Bullish trend', 'Buying the dip at Fibonacci support');
    } else if (trendDirection === 'bearish' && currentPrice > currentSMA * 0.98) {
      signal = 'sell';
      conditions.push('Bearish trend', 'Selling the rally at Fibonacci resistance');
    }
    
    if (signal === 'neutral') return null;
    
    const atr = ScalpingStrategies['calculateATR'](candles.slice(-14));
    const stopLoss = signal === 'buy' ? currentPrice - (atr * 2) : currentPrice + (atr * 2);
    const takeProfit = signal === 'buy' ? currentPrice + (atr * 3) : currentPrice - (atr * 3);
    
    return {
      name: 'Fibonacci Retracement Strategy',
      type: 'swing_trading',
      signal,
      strength: 7,
      confidence: 75,
      entry: currentPrice,
      stopLoss,
      takeProfit,
      riskReward: Math.abs(takeProfit - currentPrice) / Math.abs(currentPrice - stopLoss),
      description: `${signal.toUpperCase()} at ${levelType} in ${trendDirection} trend`,
      timeframe: '4h-1d',
      conditions
    };
  }
  
  private static calculateSMA(data: number[], period: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(0);
        continue;
      }
      
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0);
      result.push(sum / period);
    }
    
    return result;
  }
}

// Position Trading Strategies
export class PositionTradingStrategies {
  
  // Long-term Trend Following
  static longTermTrendFollowing(candles: CandleData[]): StrategySignal | null {
    if (candles.length < 200) return null;
    
    const closes = candles.map(c => c.close);
    const sma50 = SwingTradingStrategies['calculateSMA'](closes, 50);
    const sma200 = SwingTradingStrategies['calculateSMA'](closes, 200);
    
    const currentPrice = closes[closes.length - 1];
    const current50 = sma50[sma50.length - 1];
    const current200 = sma200[sma200.length - 1];
    
    const conditions: string[] = [];
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    
    // Golden Cross - bullish
    if (current50 > current200 && currentPrice > current50) {
      signal = 'buy';
      conditions.push('Golden Cross (SMA50 > SMA200)', 'Price above SMA50');
    }
    
    // Death Cross - bearish
    if (current50 < current200 && currentPrice < current50) {
      signal = 'sell';
      conditions.push('Death Cross (SMA50 < SMA200)', 'Price below SMA50');
    }
    
    if (signal === 'neutral') return null;
    
    const atr = ScalpingStrategies['calculateATR'](candles.slice(-20));
    const stopLoss = signal === 'buy' ? current200 : current200;
    const takeProfit = signal === 'buy' ? currentPrice + (atr * 10) : currentPrice - (atr * 10);
    
    return {
      name: 'Long-term Trend Following',
      type: 'position_trading',
      signal,
      strength: 6,
      confidence: 70,
      entry: currentPrice,
      stopLoss,
      takeProfit,
      riskReward: Math.abs(takeProfit - currentPrice) / Math.abs(currentPrice - stopLoss),
      description: `${signal.toUpperCase()} long-term trend signal`,
      timeframe: '1d-1w',
      conditions
    };
  }
}

// Multi-Timeframe Analysis Engine
export class MultiTimeframeEngine {
  
  static analyzeMultipleTimeframes(
    data: { [timeframe: string]: CandleData[] }
  ): MultiTimeframeAnalysis {
    const timeframes = Object.keys(data);
    const analysis: MultiTimeframeAnalysis = {
      timeframes: {},
      alignment: 0,
      overallBias: 'neutral'
    };
    
    let bullishCount = 0;
    let bearishCount = 0;
    let totalSignals = 0;
    
    for (const tf of timeframes) {
      const candles = data[tf];
      if (candles.length < 50) continue;
      
      const signals = this.generateSignalsForTimeframe(candles, tf);
      const trend = this.determineTrend(candles);
      
      analysis.timeframes[tf] = {
        trend,
        strength: this.calculateTrendStrength(candles),
        signals
      };
      
      if (trend === 'bullish') bullishCount++;
      if (trend === 'bearish') bearishCount++;
      totalSignals++;
    }
    
    // Calculate alignment
    const maxCount = Math.max(bullishCount, bearishCount);
    analysis.alignment = totalSignals > 0 ? (maxCount / totalSignals) * 100 : 0;
    
    // Determine overall bias
    if (bullishCount > bearishCount && analysis.alignment > 60) {
      analysis.overallBias = 'bullish';
    } else if (bearishCount > bullishCount && analysis.alignment > 60) {
      analysis.overallBias = 'bearish';
    }
    
    return analysis;
  }
  
  private static generateSignalsForTimeframe(candles: CandleData[], timeframe: string): StrategySignal[] {
    const signals: StrategySignal[] = [];
    
    // Generate different strategies based on timeframe
    if (timeframe.includes('m') && parseInt(timeframe) <= 5) {
      // Scalping strategies for minute charts
      const ema8 = this.calculateEMA(candles.map(c => c.close), 8);
      const ema21 = this.calculateEMA(candles.map(c => c.close), 21);
      const rsi = this.calculateRSI(candles.map(c => c.close), 14);
      
      const scalping = ScalpingStrategies.momentumScalping(candles, ema8, ema21, rsi);
      if (scalping) signals.push(scalping);
    } else if (timeframe.includes('h') || timeframe.includes('15m') || timeframe.includes('30m')) {
      // Day trading strategies for hourly charts
      const orb = DayTradingStrategies.openingRangeBreakout(candles);
      if (orb) signals.push(orb);
    } else if (timeframe.includes('d') || timeframe.includes('4h')) {
      // Position trading for daily charts
      const trend = PositionTradingStrategies.longTermTrendFollowing(candles);
      if (trend) signals.push(trend);
    }
    
    return signals;
  }
  
  private static determineTrend(candles: CandleData[]): 'bullish' | 'bearish' | 'neutral' {
    if (candles.length < 50) return 'neutral';
    
    const closes = candles.map(c => c.close);
    const sma20 = SwingTradingStrategies['calculateSMA'](closes, 20);
    const sma50 = SwingTradingStrategies['calculateSMA'](closes, 50);
    
    const current20 = sma20[sma20.length - 1];
    const current50 = sma50[sma50.length - 1];
    const currentPrice = closes[closes.length - 1];
    
    if (currentPrice > current20 && current20 > current50) {
      return 'bullish';
    } else if (currentPrice < current20 && current20 < current50) {
      return 'bearish';
    }
    
    return 'neutral';
  }
  
  private static calculateTrendStrength(candles: CandleData[]): number {
    if (candles.length < 20) return 0;
    
    const closes = candles.map(c => c.close).slice(-20);
    const firstPrice = closes[0];
    const lastPrice = closes[closes.length - 1];
    
    const change = Math.abs(lastPrice - firstPrice) / firstPrice;
    return Math.min(Math.floor(change * 100), 10);
  }
  
  private static calculateEMA(data: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    
    result[0] = data[0];
    
    for (let i = 1; i < data.length; i++) {
      result[i] = (data[i] - result[i - 1]) * multiplier + result[i - 1];
    }
    
    return result;
  }
  
  private static calculateRSI(data: number[], period: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        result.push(50);
        continue;
      }
      
      let gains = 0;
      let losses = 0;
      
      for (let j = i - period + 1; j <= i; j++) {
        const change = data[j] - data[j - 1];
        if (change > 0) {
          gains += change;
        } else {
          losses += Math.abs(change);
        }
      }
      
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      
      result.push(rsi);
    }
    
    return result;
  }
}