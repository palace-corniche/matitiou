import { CandleData } from './technicalAnalysis';

export interface FibonacciLevel {
  level: number;
  price: number;
  type: 'retracement' | 'extension' | 'projection' | 'time_zone' | 'fan';
  time?: Date; // For time zones
  angle?: number; // For fans
}

export interface GannLevel {
  angle: number;
  price: number;
  time: string;
  type: 'support' | 'resistance' | 'square_of_9' | 'time_cycle';
  strength?: number; // 1-10 scale for confluence integration
}

export interface IchimokuComponents {
  tenkanSen: number[];
  kijunSen: number[];
  senkouSpanA: number[];
  senkouSpanB: number[];
  chikouSpan: number[];
  kumoTop: number[];
  kumoBottom: number[];
}

export interface PivotLevels {
  pivot: number;
  support1: number;
  support2: number;
  support3: number;
  resistance1: number;
  resistance2: number;
  resistance3: number;
  type: 'standard' | 'fibonacci' | 'camarilla' | 'woodie';
}

// Advanced Trend Indicators
export class AdvancedTrendIndicators {
  
  // Ichimoku Cloud Complete System
  static calculateIchimoku(candles: CandleData[], tenkanPeriod = 9, kijunPeriod = 26, senkouPeriod = 52): IchimokuComponents {
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);
    
    const tenkanSen: number[] = [];
    const kijunSen: number[] = [];
    const senkouSpanA: number[] = [];
    const senkouSpanB: number[] = [];
    const chikouSpan: number[] = [];
    
    for (let i = 0; i < candles.length; i++) {
      // Tenkan-sen (Conversion Line)
      if (i >= tenkanPeriod - 1) {
        const highestHigh = Math.max(...highs.slice(i - tenkanPeriod + 1, i + 1));
        const lowestLow = Math.min(...lows.slice(i - tenkanPeriod + 1, i + 1));
        tenkanSen.push((highestHigh + lowestLow) / 2);
      } else {
        tenkanSen.push(0);
      }
      
      // Kijun-sen (Base Line)
      if (i >= kijunPeriod - 1) {
        const highestHigh = Math.max(...highs.slice(i - kijunPeriod + 1, i + 1));
        const lowestLow = Math.min(...lows.slice(i - kijunPeriod + 1, i + 1));
        kijunSen.push((highestHigh + lowestLow) / 2);
      } else {
        kijunSen.push(0);
      }
      
      // Senkou Span A (Leading Span A)
      if (i >= Math.max(tenkanPeriod, kijunPeriod) - 1) {
        senkouSpanA.push((tenkanSen[i] + kijunSen[i]) / 2);
      } else {
        senkouSpanA.push(0);
      }
      
      // Senkou Span B (Leading Span B)
      if (i >= senkouPeriod - 1) {
        const highestHigh = Math.max(...highs.slice(i - senkouPeriod + 1, i + 1));
        const lowestLow = Math.min(...lows.slice(i - senkouPeriod + 1, i + 1));
        senkouSpanB.push((highestHigh + lowestLow) / 2);
      } else {
        senkouSpanB.push(0);
      }
      
      // Chikou Span (Lagging Span)
      chikouSpan.push(closes[i]);
    }
    
    const kumoTop = senkouSpanA.map((a, i) => Math.max(a, senkouSpanB[i]));
    const kumoBottom = senkouSpanA.map((a, i) => Math.min(a, senkouSpanB[i]));
    
    return {
      tenkanSen,
      kijunSen,
      senkouSpanA,
      senkouSpanB,
      chikouSpan,
      kumoTop,
      kumoBottom
    };
  }
  
  // Parabolic SAR
  static calculateParabolicSAR(candles: CandleData[], accelerationFactor = 0.02, maxAcceleration = 0.2): number[] {
    const result: number[] = [];
    let trend = 1; // 1 for uptrend, -1 for downtrend
    let sar = candles[0].low;
    let extremePoint = candles[0].high;
    let acceleration = accelerationFactor;
    
    result.push(sar);
    
    for (let i = 1; i < candles.length; i++) {
      const candle = candles[i];
      
      // Calculate new SAR
      sar = sar + acceleration * (extremePoint - sar);
      
      if (trend === 1) { // Uptrend
        if (candle.low <= sar) {
          // Trend reversal
          trend = -1;
          sar = extremePoint;
          extremePoint = candle.low;
          acceleration = accelerationFactor;
        } else {
          // Continue uptrend
          if (candle.high > extremePoint) {
            extremePoint = candle.high;
            acceleration = Math.min(acceleration + accelerationFactor, maxAcceleration);
          }
          // Ensure SAR doesn't go above previous two lows
          const minLow = Math.min(candles[i-1].low, i > 1 ? candles[i-2].low : candles[i-1].low);
          sar = Math.min(sar, minLow);
        }
      } else { // Downtrend
        if (candle.high >= sar) {
          // Trend reversal
          trend = 1;
          sar = extremePoint;
          extremePoint = candle.high;
          acceleration = accelerationFactor;
        } else {
          // Continue downtrend
          if (candle.low < extremePoint) {
            extremePoint = candle.low;
            acceleration = Math.min(acceleration + accelerationFactor, maxAcceleration);
          }
          // Ensure SAR doesn't go below previous two highs
          const maxHigh = Math.max(candles[i-1].high, i > 1 ? candles[i-2].high : candles[i-1].high);
          sar = Math.max(sar, maxHigh);
        }
      }
      
      result.push(sar);
    }
    
    return result;
  }
  
  // SuperTrend Indicator
  static calculateSuperTrend(candles: CandleData[], period = 10, multiplier = 3): number[] {
    const atr = this.calculateATR(candles, period);
    const hl2 = candles.map(c => (c.high + c.low) / 2);
    const result: number[] = [];
    
    let trend = 1;
    let superTrend = 0;
    
    for (let i = 0; i < candles.length; i++) {
      if (i < period) {
        result.push(0);
        continue;
      }
      
      const basicUpperBand = hl2[i] + (multiplier * atr[i]);
      const basicLowerBand = hl2[i] - (multiplier * atr[i]);
      
      // Final upper and lower bands
      const finalUpperBand = basicUpperBand < result[i-1] || candles[i-1].close > result[i-1] 
        ? basicUpperBand 
        : result[i-1];
      const finalLowerBand = basicLowerBand > result[i-1] || candles[i-1].close < result[i-1] 
        ? basicLowerBand 
        : result[i-1];
      
      // Determine trend
      if (superTrend === finalUpperBand && candles[i].close <= finalUpperBand) {
        trend = -1;
      } else if (superTrend === finalLowerBand && candles[i].close >= finalLowerBand) {
        trend = 1;
      }
      
      superTrend = trend === 1 ? finalLowerBand : finalUpperBand;
      result.push(superTrend);
    }
    
    return result;
  }
  
  // Helper method for ATR calculation
  private static calculateATR(candles: CandleData[], period: number): number[] {
    const trueRanges: number[] = [];
    
    for (let i = 0; i < candles.length; i++) {
      if (i === 0) {
        trueRanges.push(candles[i].high - candles[i].low);
      } else {
        const tr1 = candles[i].high - candles[i].low;
        const tr2 = Math.abs(candles[i].high - candles[i-1].close);
        const tr3 = Math.abs(candles[i].low - candles[i-1].close);
        trueRanges.push(Math.max(tr1, tr2, tr3));
      }
    }
    
    // Calculate ATR using EMA
    const result: number[] = [];
    let atr = 0;
    
    for (let i = 0; i < trueRanges.length; i++) {
      if (i === 0) {
        atr = trueRanges[i];
      } else {
        atr = ((atr * (period - 1)) + trueRanges[i]) / period;
      }
      result.push(atr);
    }
    
    return result;
  }
}

// Fibonacci Tools
export class FibonacciTools {
  
  // Fibonacci Retracements
  static calculateRetracements(high: number, low: number): FibonacciLevel[] {
    const difference = high - low;
    const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    
    return levels.map(level => ({
      level,
      price: high - (difference * level),
      type: 'retracement' as const
    }));
  }
  
  // Fibonacci Extensions
  static calculateExtensions(point1: number, point2: number, point3: number): FibonacciLevel[] {
    const swingRange = Math.abs(point2 - point1);
    const direction = point2 > point1 ? 1 : -1;
    const levels = [1.272, 1.414, 1.618, 2.0, 2.618, 3.272, 4.236];
    
    return levels.map(level => ({
      level,
      price: point3 + (direction * swingRange * level),
      type: 'extension' as const
    }));
  }
  
  // Golden Pocket (61.8% - 65% zone)
  static calculateGoldenPocket(high: number, low: number): { upper: number; lower: number } {
    const difference = high - low;
    return {
      upper: high - (difference * 0.618),
      lower: high - (difference * 0.65)
    };
  }
  
  // **PHASE 5: Fibonacci Time Zones** - Predict future reversal times
  static calculateTimeZones(startIndex: number, startTime: Date, candleIntervalMinutes: number): FibonacciLevel[] {
    const fibSequence = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
    
    return fibSequence.map(fib => {
      const timeZoneDate = new Date(startTime.getTime() + (fib * candleIntervalMinutes * 60 * 1000));
      
      return {
        level: fib,
        price: 0, // Time zones are vertical lines, no price
        type: 'time_zone' as const,
        time: timeZoneDate
      };
    });
  }
  
  // **PHASE 5: Fibonacci Fans** - Dynamic support/resistance based on angle
  static calculateFans(point1: { price: number; index: number }, point2: { price: number; index: number }, currentIndex: number): FibonacciLevel[] {
    const priceChange = point2.price - point1.price;
    const timeChange = point2.index - point1.index;
    const fanLevels = [0.382, 0.5, 0.618];
    
    return fanLevels.map(level => {
      // Calculate fan line price at current index
      const timeElapsed = currentIndex - point1.index;
      const fanPrice = point1.price + (priceChange * level) + 
                      ((priceChange / timeChange) * timeElapsed * (1 - level));
      
      // Calculate angle for the fan line
      const angle = Math.atan2(priceChange * level, timeChange) * (180 / Math.PI);
      
      return {
        level,
        price: fanPrice,
        type: 'fan' as const,
        angle: angle
      };
    });
  }
}

// Gann Analysis Tools
export class GannAnalysis {
  
  // Gann Angles
  static calculateGannAngles(startPrice: number, startTime: number, timeUnit: number): GannLevel[] {
    const angles = [
      { ratio: '1x8', angle: 7.5 },
      { ratio: '1x4', angle: 15 },
      { ratio: '1x3', angle: 18.75 },
      { ratio: '1x2', angle: 26.25 },
      { ratio: '1x1', angle: 45 },
      { ratio: '2x1', angle: 63.75 },
      { ratio: '3x1', angle: 71.25 },
      { ratio: '4x1', angle: 75 },
      { ratio: '8x1', angle: 82.5 }
    ];
    
    return angles.map(({ ratio, angle }) => {
      const slope = Math.tan(angle * Math.PI / 180);
      const timeElapsed = timeUnit;
      const priceChange = slope * timeElapsed;
      
      return {
        angle,
        price: startPrice + priceChange,
        time: new Date(startTime + timeUnit).toISOString(),
        type: priceChange > 0 ? 'resistance' as const : 'support' as const
      };
    });
  }
  
  // **PHASE 5: Enhanced Gann Time Cycles** - Predict reversal dates with strength
  static calculateTimeCycles(startDate: Date): GannLevel[] {
    const cycles = [
      { days: 30, strength: 5 },
      { days: 60, strength: 6 },
      { days: 90, strength: 8 },
      { days: 120, strength: 6 },
      { days: 144, strength: 9 }, // Fibonacci number
      { days: 180, strength: 7 },
      { days: 240, strength: 6 },
      { days: 360, strength: 10 } // Full year cycle
    ];
    
    return cycles.map(({ days, strength }) => {
      const cycleDate = new Date(startDate);
      cycleDate.setDate(cycleDate.getDate() + days);
      
      return {
        angle: days, // Use days as angle for identification
        price: 0, // Time cycles are vertical, no price
        time: cycleDate.toISOString(),
        type: 'time_cycle' as const,
        strength
      };
    });
  }
  
  // **PHASE 5: Enhanced Gann Square of 9** - Calculate support/resistance levels with strength
  static calculateSquareOf9(centerPrice: number, currentPrice: number): GannLevel[] {
    const levels: GannLevel[] = [];
    const sqrtCenter = Math.sqrt(centerPrice);
    
    // Calculate resistance levels (above current price)
    for (let i = 1; i <= 8; i++) {
      const priceLevel = Math.pow(sqrtCenter + (i * 0.125), 2);
      const distance = Math.abs(priceLevel - currentPrice);
      const strength = Math.max(1, 10 - Math.floor(distance / centerPrice * 100)); // Closer = stronger
      
      levels.push({
        angle: 45 + (i * 5), // Symbolic angle
        price: priceLevel,
        time: new Date().toISOString(),
        type: priceLevel > currentPrice ? 'resistance' as const : 'support' as const,
        strength: Math.min(10, strength)
      });
    }
    
    // Calculate support levels (below current price)
    for (let i = 1; i <= 8; i++) {
      const priceLevel = Math.pow(sqrtCenter - (i * 0.125), 2);
      if (priceLevel > 0) {
        const distance = Math.abs(priceLevel - currentPrice);
        const strength = Math.max(1, 10 - Math.floor(distance / centerPrice * 100));
        
        levels.push({
          angle: 45 - (i * 5), // Symbolic angle
          price: priceLevel,
          time: new Date().toISOString(),
          type: priceLevel > currentPrice ? 'resistance' as const : 'support' as const,
          strength: Math.min(10, strength)
        });
      }
    }
    
    return levels;
  }
  
  // **PHASE 5: Gann Square of 9 Cardinal Points** - Key reversal levels
  static calculateSquareOf9Cardinals(centerPrice: number): GannLevel[] {
    const cardinals = [0, 90, 180, 270]; // Degrees
    const levels: GannLevel[] = [];
    const sqrtCenter = Math.sqrt(centerPrice);
    
    cardinals.forEach(degree => {
      // Each 90-degree rotation represents a significant level
      const rotation = degree / 360;
      const priceLevel = Math.pow(sqrtCenter + rotation, 2);
      
      levels.push({
        angle: degree,
        price: priceLevel,
        time: new Date().toISOString(),
        type: priceLevel > centerPrice ? 'resistance' as const : 'support' as const,
        strength: 9 // Cardinal points are strong
      });
    });
    
    return levels;
  }
}

// Pivot Point Calculations
export class PivotPoints {
  
  // Standard Pivot Points
  static calculateStandard(high: number, low: number, close: number): PivotLevels {
    const pivot = (high + low + close) / 3;
    
    return {
      pivot,
      support1: (2 * pivot) - high,
      support2: pivot - (high - low),
      support3: low - (2 * (high - pivot)),
      resistance1: (2 * pivot) - low,
      resistance2: pivot + (high - low),
      resistance3: high + (2 * (pivot - low)),
      type: 'standard'
    };
  }
  
  // Fibonacci Pivot Points
  static calculateFibonacci(high: number, low: number, close: number): PivotLevels {
    const pivot = (high + low + close) / 3;
    const range = high - low;
    
    return {
      pivot,
      support1: pivot - (0.382 * range),
      support2: pivot - (0.618 * range),
      support3: pivot - range,
      resistance1: pivot + (0.382 * range),
      resistance2: pivot + (0.618 * range),
      resistance3: pivot + range,
      type: 'fibonacci'
    };
  }
  
  // Camarilla Pivot Points
  static calculateCamarilla(high: number, low: number, close: number): PivotLevels {
    const range = high - low;
    
    return {
      pivot: close,
      support1: close - (range * 1.1 / 12),
      support2: close - (range * 1.1 / 6),
      support3: close - (range * 1.1 / 4),
      resistance1: close + (range * 1.1 / 12),
      resistance2: close + (range * 1.1 / 6),
      resistance3: close + (range * 1.1 / 4),
      type: 'camarilla'
    };
  }
  
  // Woodie's Pivot Points
  static calculateWoodie(high: number, low: number, close: number, open: number): PivotLevels {
    const pivot = (high + low + (2 * close)) / 4;
    
    return {
      pivot,
      support1: (2 * pivot) - high,
      support2: pivot - high + low,
      support3: low - (2 * (high - pivot)),
      resistance1: (2 * pivot) - low,
      resistance2: pivot + high - low,
      resistance3: high + (2 * (pivot - low)),
      type: 'woodie'
    };
  }
}

// Advanced Volume Indicators
export class AdvancedVolumeIndicators {
  
  // Money Flow Index
  static calculateMFI(candles: CandleData[], period = 14): number[] {
    const result: number[] = [];
    const typicalPrices = candles.map(c => (c.high + c.low + c.close) / 3);
    const rawMoneyFlow = candles.map((c, i) => typicalPrices[i] * (c.volume || 0));
    
    for (let i = 0; i < candles.length; i++) {
      if (i < period) {
        result.push(0);
        continue;
      }
      
      let positiveFlow = 0;
      let negativeFlow = 0;
      
      for (let j = i - period + 1; j <= i; j++) {
        if (j > 0) {
          if (typicalPrices[j] > typicalPrices[j - 1]) {
            positiveFlow += rawMoneyFlow[j];
          } else if (typicalPrices[j] < typicalPrices[j - 1]) {
            negativeFlow += rawMoneyFlow[j];
          }
        }
      }
      
      const moneyFlowRatio = positiveFlow / negativeFlow;
      const mfi = 100 - (100 / (1 + moneyFlowRatio));
      result.push(mfi);
    }
    
    return result;
  }
  
  // Chaikin Oscillator
  static calculateChaikinOscillator(candles: CandleData[], fastPeriod = 3, slowPeriod = 10): number[] {
    const adl = this.calculateAccumulationDistribution(candles);
    const fastEMA = this.calculateEMA(adl, fastPeriod);
    const slowEMA = this.calculateEMA(adl, slowPeriod);
    
    return fastEMA.map((fast, i) => fast - slowEMA[i]);
  }
  
  // Accumulation/Distribution Line
  static calculateAccumulationDistribution(candles: CandleData[]): number[] {
    const result: number[] = [];
    let adl = 0;
    
    for (const candle of candles) {
      const clv = ((candle.close - candle.low) - (candle.high - candle.close)) / (candle.high - candle.low);
      const currentAD = clv * (candle.volume || 0);
      adl += currentAD;
      result.push(adl);
    }
    
    return result;
  }
  
  // Volume Weighted Average Price (VWAP)
  static calculateVWAP(candles: CandleData[]): number[] {
    const result: number[] = [];
    let cumulativePriceVolume = 0;
    let cumulativeVolume = 0;
    
    for (const candle of candles) {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      const volume = candle.volume || 0;
      
      cumulativePriceVolume += typicalPrice * volume;
      cumulativeVolume += volume;
      
      const vwap = cumulativeVolume > 0 ? cumulativePriceVolume / cumulativeVolume : typicalPrice;
      result.push(vwap);
    }
    
    return result;
  }
  
  // Helper EMA calculation
  private static calculateEMA(data: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    
    result[0] = data[0];
    
    for (let i = 1; i < data.length; i++) {
      result[i] = (data[i] - result[i - 1]) * multiplier + result[i - 1];
    }
    
    return result;
  }
}

// Market Structure Analysis
export class MarketStructure {
  
  // Identify Swing Highs and Lows
  static identifySwingPoints(candles: CandleData[], leftBars = 2, rightBars = 2): Array<{index: number, type: 'high' | 'low', price: number}> {
    const swingPoints: Array<{index: number, type: 'high' | 'low', price: number}> = [];
    
    for (let i = leftBars; i < candles.length - rightBars; i++) {
      let isSwingHigh = true;
      let isSwingLow = true;
      
      // Check if current candle is swing high
      for (let j = i - leftBars; j <= i + rightBars; j++) {
        if (j !== i && candles[j].high >= candles[i].high) {
          isSwingHigh = false;
          break;
        }
      }
      
      // Check if current candle is swing low
      for (let j = i - leftBars; j <= i + rightBars; j++) {
        if (j !== i && candles[j].low <= candles[i].low) {
          isSwingLow = false;
          break;
        }
      }
      
      if (isSwingHigh) {
        swingPoints.push({index: i, type: 'high', price: candles[i].high});
      }
      
      if (isSwingLow) {
        swingPoints.push({index: i, type: 'low', price: candles[i].low});
      }
    }
    
    return swingPoints;
  }
  
  // Identify Break of Structure
  static identifyBreakOfStructure(candles: CandleData[]): Array<{index: number, type: 'bullish' | 'bearish', price: number}> {
    const swingPoints = this.identifySwingPoints(candles);
    const bosPoints: Array<{index: number, type: 'bullish' | 'bearish', price: number}> = [];
    
    for (let i = 1; i < swingPoints.length; i++) {
      const current = swingPoints[i];
      const previous = swingPoints[i - 1];
      
      if (current.type === 'high' && previous.type === 'high' && current.price > previous.price) {
        bosPoints.push({index: current.index, type: 'bullish', price: current.price});
      } else if (current.type === 'low' && previous.type === 'low' && current.price < previous.price) {
        bosPoints.push({index: current.index, type: 'bearish', price: current.price});
      }
    }
    
    return bosPoints;
  }
  
  // Identify Fair Value Gaps
  static identifyFairValueGaps(candles: CandleData[]): Array<{index: number, type: 'bullish' | 'bearish', top: number, bottom: number}> {
    const fvgs: Array<{index: number, type: 'bullish' | 'bearish', top: number, bottom: number}> = [];
    
    for (let i = 2; i < candles.length; i++) {
      const prev2 = candles[i - 2];
      const prev1 = candles[i - 1];
      const current = candles[i];
      
      // Bullish FVG
      if (prev2.high < current.low) {
        fvgs.push({
          index: i - 1,
          type: 'bullish',
          top: current.low,
          bottom: prev2.high
        });
      }
      
      // Bearish FVG
      if (prev2.low > current.high) {
        fvgs.push({
          index: i - 1,
          type: 'bearish',
          top: prev2.low,
          bottom: current.high
        });
      }
    }
    
    return fvgs;
  }
}