export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number; // Made optional to match realMarketData interface
}

export interface IndicatorResult {
  name: string;
  value: number | null;
  signal: 'buy' | 'sell' | 'neutral';
  strength: number; // 1-10
}

export interface TechnicalAnalysisResult {
  indicators: IndicatorResult[];
  overallSignal: 'buy' | 'sell' | 'neutral';
  overallStrength: number;
}

// Trend Indicators
export class TrendIndicators {
  static calculateSMA(data: number[], period: number = 20): number[] {
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

  static calculateEMA(data: number[], period: number = 20): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA for first value
    if (data.length === 0) return result;
    
    result[0] = data[0];
    
    for (let i = 1; i < data.length; i++) {
      if (i < period) {
        // Use SMA until we have enough data
        const sum = data.slice(0, i + 1).reduce((acc, val) => acc + val, 0);
        result[i] = sum / (i + 1);
      } else {
        result[i] = (data[i] * multiplier) + (result[i - 1] * (1 - multiplier));
      }
    }
    
    return result;
  }

  static calculateMACD(data: number[]): Array<{macd: number, signal: number, histogram: number}> {
    const ema12 = this.calculateEMA(data, 12);
    const ema26 = this.calculateEMA(data, 26);
    const macdLine = ema12.map((val, i) => val - ema26[i]);
    const signalLine = this.calculateEMA(macdLine, 9);
    
    return macdLine.map((macd, i) => ({
      macd,
      signal: signalLine[i],
      histogram: macd - signalLine[i]
    }));
  }

  static calculateADX(candles: CandleData[], period: number = 14): number[] {
    const result: number[] = [];
    
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];
      
      const highDiff = current.high - previous.high;
      const lowDiff = previous.low - current.low;
      
      const plusDM = highDiff > lowDiff && highDiff > 0 ? highDiff : 0;
      const minusDM = lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0;
      
      // Simplified ADX calculation
      result.push(Math.abs(plusDM - minusDM) / (plusDM + minusDM + 0.0001) * 100);
    }
    
    return [0, ...result]; // Add 0 for first element
  }
}

// Momentum Indicators
export class MomentumIndicators {
  static calculateRSI(data: number[], period: number = 14): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        result.push(50);
        continue;
      }
      
      const slice = data.slice(i - period, i);
      let gains = 0;
      let losses = 0;
      
      for (let j = 1; j < slice.length; j++) {
        const change = slice[j] - slice[j - 1];
        if (change > 0) gains += change;
        else losses += Math.abs(change);
      }
      
      const avgGain = gains / period;
      const avgLoss = losses / period;
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        result.push(rsi);
      }
    }
    
    return result;
  }

  static calculateStochastic(candles: CandleData[], period: number = 14): Array<{k: number, d: number}> {
    const result: Array<{k: number, d: number}> = [];
    
    for (let i = 0; i < candles.length; i++) {
      if (i < period - 1) {
        result.push({ k: 50, d: 50 });
        continue;
      }
      
      const slice = candles.slice(i - period + 1, i + 1);
      const highest = Math.max(...slice.map(c => c.high));
      const lowest = Math.min(...slice.map(c => c.low));
      const current = candles[i].close;
      
      // Prevent division by zero when highest equals lowest
      const k = (highest === lowest) ? 50 : ((current - lowest) / (highest - lowest)) * 100;
      
      // Simple D calculation (3-period average of K)
      const recentK = result.slice(-2).map(r => r.k).concat([k]);
      const d = recentK.reduce((sum, val) => sum + val, 0) / recentK.length;
      
      result.push({ k, d });
    }
    
    return result;
  }

  static calculateCCI(candles: CandleData[], period: number = 20): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < candles.length; i++) {
      if (i < period - 1) {
        result.push(0);
        continue;
      }
      
      const slice = candles.slice(i - period + 1, i + 1);
      const typicalPrices = slice.map(c => (c.high + c.low + c.close) / 3);
      const smaTP = typicalPrices.reduce((sum, tp) => sum + tp, 0) / period;
      const currentTP = typicalPrices[typicalPrices.length - 1];
      
      const meanDeviation = typicalPrices.reduce((sum, tp) => sum + Math.abs(tp - smaTP), 0) / period;
      
      const cci = meanDeviation !== 0 ? (currentTP - smaTP) / (0.015 * meanDeviation) : 0;
      result.push(cci);
    }
    
    return result;
  }

  static calculateROC(data: number[], period: number = 12): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        result.push(0);
        continue;
      }
      
      const current = data[i];
      const previous = data[i - period];
      const roc = ((current - previous) / previous) * 100;
      
      result.push(roc);
    }
    
    return result;
  }
}

// Volatility Indicators
export class VolatilityIndicators {
  static calculateBollingerBands(data: number[], period: number = 20, standardDeviations: number = 2): Array<{upper: number, middle: number, lower: number}> {
    const sma = TrendIndicators.calculateSMA(data, period);
    
    return data.map((price, i) => {
      if (i < period - 1) {
        return { upper: price, middle: price, lower: price };
      }
      
      const slice = data.slice(i - period + 1, i + 1);
      const mean = sma[i];
      
      const squaredDifferences = slice.map(val => Math.pow(val - mean, 2));
      const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / period;
      const stdDev = Math.sqrt(variance);
      
      return {
        upper: mean + (stdDev * standardDeviations),
        middle: mean,
        lower: mean - (stdDev * standardDeviations)
      };
    });
  }

  static calculateATR(candles: CandleData[], period: number = 14): number[] {
    const trueRanges: number[] = [];
    
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];
      
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      );
      
      trueRanges.push(tr);
    }
    
    // Calculate simple moving average of true ranges
    const atr = TrendIndicators.calculateSMA(trueRanges, period);
    return [0, ...atr]; // Add 0 for first element
  }
}

// Volume Indicators
export class VolumeIndicators {
  static calculateOBV(candles: CandleData[]): number[] {
    const result: number[] = [0];
    
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];
      const volume = current.volume || 1000; // Default volume if not provided
      
      if (current.close > previous.close) {
        result.push(result[i - 1] + volume);
      } else if (current.close < previous.close) {
        result.push(result[i - 1] - volume);
      } else {
        result.push(result[i - 1]);
      }
    }
    
    return result;
  }

  static calculateVWAP(candles: CandleData[]): number[] {
    let cumulativePriceVolume = 0;
    let cumulativeVolume = 0;
    
    return candles.map(candle => {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      const volume = candle.volume || 1000; // Default volume if not provided
      cumulativePriceVolume += typicalPrice * volume;
      cumulativeVolume += volume;
      
      return cumulativeVolume > 0 ? cumulativePriceVolume / cumulativeVolume : 0;
    });
  }
}

// Main Technical Analysis Engine
export class TechnicalAnalysisEngine {
  static analyzeCandles(candles: CandleData[]): TechnicalAnalysisResult {
    if (candles.length < 50) {
      return {
        indicators: [],
        overallSignal: 'neutral',
        overallStrength: 0
      };
    }

    const closePrices = candles.map(c => c.close);
    const indicators: IndicatorResult[] = [];

    try {
      // RSI Analysis
      const rsi = MomentumIndicators.calculateRSI(closePrices);
      const latestRSI = rsi[rsi.length - 1];
      indicators.push({
        name: 'RSI',
        value: latestRSI,
        signal: latestRSI > 70 ? 'sell' : latestRSI < 30 ? 'buy' : 'neutral',
        strength: latestRSI > 80 || latestRSI < 20 ? 9 : latestRSI > 70 || latestRSI < 30 ? 7 : 3
      });

      // MACD Analysis
      const macd = TrendIndicators.calculateMACD(closePrices);
      const latestMACD = macd[macd.length - 1];
      const prevMACD = macd[macd.length - 2];
      const macdCrossover = latestMACD.macd > latestMACD.signal && prevMACD.macd <= prevMACD.signal;
      const macdCrossunder = latestMACD.macd < latestMACD.signal && prevMACD.macd >= prevMACD.signal;
      
      indicators.push({
        name: 'MACD',
        value: latestMACD.histogram,
        signal: macdCrossover ? 'buy' : macdCrossunder ? 'sell' : 'neutral',
        strength: macdCrossover || macdCrossunder ? 8 : Math.abs(latestMACD.histogram) > 0.001 ? 5 : 2
      });

      // Bollinger Bands Analysis
      const bb = VolatilityIndicators.calculateBollingerBands(closePrices);
      const latestBB = bb[bb.length - 1];
      const currentPrice = closePrices[closePrices.length - 1];
      const bbPosition = (currentPrice - latestBB.lower) / (latestBB.upper - latestBB.lower);
      
      indicators.push({
        name: 'Bollinger Bands',
        value: bbPosition,
        signal: bbPosition > 0.8 ? 'sell' : bbPosition < 0.2 ? 'buy' : 'neutral',
        strength: bbPosition > 0.9 || bbPosition < 0.1 ? 8 : bbPosition > 0.8 || bbPosition < 0.2 ? 6 : 3
      });

      // SMA Crossover Analysis
      const sma20 = TrendIndicators.calculateSMA(closePrices, 20);
      const sma50 = TrendIndicators.calculateSMA(closePrices, 50);
      const sma20Current = sma20[sma20.length - 1];
      const sma50Current = sma50[sma50.length - 1];
      const sma20Prev = sma20[sma20.length - 2];
      const sma50Prev = sma50[sma50.length - 2];
      
      const goldenCross = sma20Current > sma50Current && sma20Prev <= sma50Prev;
      const deathCross = sma20Current < sma50Current && sma20Prev >= sma50Prev;
      
      indicators.push({
        name: 'SMA Crossover',
        value: sma20Current - sma50Current,
        signal: goldenCross ? 'buy' : deathCross ? 'sell' : sma20Current > sma50Current ? 'buy' : 'sell',
        strength: goldenCross || deathCross ? 9 : 4
      });

      // Stochastic Analysis
      const stoch = MomentumIndicators.calculateStochastic(candles);
      const latestStoch = stoch[stoch.length - 1];
      indicators.push({
        name: 'Stochastic',
        value: latestStoch.k,
        signal: latestStoch.k > 80 ? 'sell' : latestStoch.k < 20 ? 'buy' : 'neutral',
        strength: latestStoch.k > 90 || latestStoch.k < 10 ? 8 : latestStoch.k > 80 || latestStoch.k < 20 ? 6 : 3
      });

    } catch (error) {
      console.error('Error in technical analysis:', error);
    }

    // Calculate overall signal
    const buySignals = indicators.filter(i => i.signal === 'buy');
    const sellSignals = indicators.filter(i => i.signal === 'sell');
    const buyStrength = buySignals.reduce((sum, i) => sum + i.strength, 0);
    const sellStrength = sellSignals.reduce((sum, i) => sum + i.strength, 0);

    let overallSignal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let overallStrength = 0;

    if (buyStrength > sellStrength && buyStrength > 15) {
      overallSignal = 'buy';
      overallStrength = buySignals.length > 0 ? Math.min(10, Math.round(buyStrength / buySignals.length)) : 3;
    } else if (sellStrength > buyStrength && sellStrength > 15) {
      overallSignal = 'sell';
      overallStrength = sellSignals.length > 0 ? Math.min(10, Math.round(sellStrength / sellSignals.length)) : 3;
    } else {
      overallStrength = 3;
    }

    return {
      indicators,
      overallSignal,
      overallStrength
    };
  }
}

export default TechnicalAnalysisEngine;