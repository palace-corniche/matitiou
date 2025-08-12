import { CandleData } from './technicalAnalysis';

export interface CandlestickPattern {
  name: string;
  type: 'reversal' | 'continuation';
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 1-10
  position: number; // Index in the data array
  description: string;
}

export interface ChartPattern {
  name: string;
  type: 'support' | 'resistance' | 'trend' | 'reversal';
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  startIndex: number;
  endIndex: number;
  levels?: number[]; // Price levels for support/resistance
  description: string;
}

export class CandlestickPatternRecognition {
  
  // Single Candlestick Patterns
  static isDoji(candle: CandleData): boolean {
    const bodySize = Math.abs(candle.close - candle.open);
    const totalRange = candle.high - candle.low;
    return bodySize <= totalRange * 0.1;
  }

  static isHammer(candle: CandleData): boolean {
    const bodySize = Math.abs(candle.close - candle.open);
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const totalRange = candle.high - candle.low;
    
    return lowerShadow >= bodySize * 2 && upperShadow <= bodySize * 0.1 && totalRange > 0;
  }

  static isShootingStar(candle: CandleData): boolean {
    const bodySize = Math.abs(candle.close - candle.open);
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    
    return upperShadow >= bodySize * 2 && lowerShadow <= bodySize * 0.1;
  }

  static isSpinningTop(candle: CandleData): boolean {
    const bodySize = Math.abs(candle.close - candle.open);
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const totalRange = candle.high - candle.low;
    
    return bodySize <= totalRange * 0.3 && upperShadow >= bodySize && lowerShadow >= bodySize;
  }

  static isMarubozu(candle: CandleData): boolean {
    const bodySize = Math.abs(candle.close - candle.open);
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const totalRange = candle.high - candle.low;
    
    return bodySize >= totalRange * 0.95 && upperShadow <= totalRange * 0.05 && lowerShadow <= totalRange * 0.05;
  }

  // Two Candlestick Patterns
  static isEngulfing(candle1: CandleData, candle2: CandleData): 'bullish' | 'bearish' | null {
    const isBullishEngulfing = candle1.close < candle1.open && // First candle bearish
                               candle2.close > candle2.open && // Second candle bullish
                               candle2.open < candle1.close && // Second opens below first close
                               candle2.close > candle1.open;   // Second closes above first open

    const isBearishEngulfing = candle1.close > candle1.open && // First candle bullish
                               candle2.close < candle2.open && // Second candle bearish
                               candle2.open > candle1.close && // Second opens above first close
                               candle2.close < candle1.open;   // Second closes below first open

    if (isBullishEngulfing) return 'bullish';
    if (isBearishEngulfing) return 'bearish';
    return null;
  }

  static isHarami(candle1: CandleData, candle2: CandleData): 'bullish' | 'bearish' | null {
    const body1High = Math.max(candle1.open, candle1.close);
    const body1Low = Math.min(candle1.open, candle1.close);
    const body2High = Math.max(candle2.open, candle2.close);
    const body2Low = Math.min(candle2.open, candle2.close);

    const isHaramiPattern = body2High < body1High && body2Low > body1Low;

    if (!isHaramiPattern) return null;

    const isBullishHarami = candle1.close < candle1.open && candle2.close > candle2.open;
    const isBearishHarami = candle1.close > candle1.open && candle2.close < candle2.open;

    if (isBullishHarami) return 'bullish';
    if (isBearishHarami) return 'bearish';
    return null;
  }

  static isPiercingLine(candle1: CandleData, candle2: CandleData): boolean {
    return candle1.close < candle1.open && // First candle bearish
           candle2.close > candle2.open && // Second candle bullish
           candle2.open < candle1.low &&   // Second opens below first low
           candle2.close > (candle1.open + candle1.close) / 2; // Second closes above midpoint of first
  }

  static isDarkCloudCover(candle1: CandleData, candle2: CandleData): boolean {
    return candle1.close > candle1.open && // First candle bullish
           candle2.close < candle2.open && // Second candle bearish
           candle2.open > candle1.high &&  // Second opens above first high
           candle2.close < (candle1.open + candle1.close) / 2; // Second closes below midpoint of first
  }

  // Three Candlestick Patterns
  static isMorningStar(candle1: CandleData, candle2: CandleData, candle3: CandleData): boolean {
    return candle1.close < candle1.open && // First candle bearish
           this.isDoji(candle2) &&           // Second candle doji/small body
           candle3.close > candle3.open &&   // Third candle bullish
           candle3.close > (candle1.open + candle1.close) / 2; // Third closes above first midpoint
  }

  static isEveningStar(candle1: CandleData, candle2: CandleData, candle3: CandleData): boolean {
    return candle1.close > candle1.open && // First candle bullish
           this.isDoji(candle2) &&           // Second candle doji/small body
           candle3.close < candle3.open &&   // Third candle bearish
           candle3.close < (candle1.open + candle1.close) / 2; // Third closes below first midpoint
  }

  static isThreeWhiteSoldiers(candle1: CandleData, candle2: CandleData, candle3: CandleData): boolean {
    return candle1.close > candle1.open && // All three bullish
           candle2.close > candle2.open &&
           candle3.close > candle3.open &&
           candle2.close > candle1.close && // Each closes higher than previous
           candle3.close > candle2.close &&
           candle2.open > candle1.open &&   // Each opens higher than previous close
           candle3.open > candle2.open;
  }

  static isThreeBlackCrows(candle1: CandleData, candle2: CandleData, candle3: CandleData): boolean {
    return candle1.close < candle1.open && // All three bearish
           candle2.close < candle2.open &&
           candle3.close < candle3.open &&
           candle2.close < candle1.close && // Each closes lower than previous
           candle3.close < candle2.close &&
           candle2.open < candle1.open &&   // Each opens lower than previous close
           candle3.open < candle2.open;
  }

  // Main pattern detection function
  static detectPatterns(candles: CandleData[]): CandlestickPattern[] {
    const patterns: CandlestickPattern[] = [];
    
    if (candles.length < 3) return patterns;

    for (let i = 2; i < candles.length; i++) {
      const current = candles[i];
      const prev1 = candles[i - 1];
      const prev2 = candles[i - 2];

      // Single candle patterns
      if (this.isDoji(current)) {
        patterns.push({
          name: 'Doji',
          type: 'reversal',
          signal: 'neutral',
          strength: 6,
          position: i,
          description: 'Indecision candle, potential reversal signal'
        });
      }

      if (this.isHammer(current)) {
        patterns.push({
          name: 'Hammer',
          type: 'reversal',
          signal: 'bullish',
          strength: 7,
          position: i,
          description: 'Bullish reversal pattern at support levels'
        });
      }

      if (this.isShootingStar(current)) {
        patterns.push({
          name: 'Shooting Star',
          type: 'reversal',
          signal: 'bearish',
          strength: 7,
          position: i,
          description: 'Bearish reversal pattern at resistance levels'
        });
      }

      if (i >= 1) {
        // Two candle patterns
        const engulfing = this.isEngulfing(prev1, current);
        if (engulfing) {
          patterns.push({
            name: `${engulfing === 'bullish' ? 'Bullish' : 'Bearish'} Engulfing`,
            type: 'reversal',
            signal: engulfing,
            strength: 8,
            position: i,
            description: `Strong ${engulfing} reversal pattern`
          });
        }

        const harami = this.isHarami(prev1, current);
        if (harami) {
          patterns.push({
            name: `${harami === 'bullish' ? 'Bullish' : 'Bearish'} Harami`,
            type: 'reversal',
            signal: harami,
            strength: 6,
            position: i,
            description: `Potential ${harami} reversal pattern`
          });
        }

        if (this.isPiercingLine(prev1, current)) {
          patterns.push({
            name: 'Piercing Line',
            type: 'reversal',
            signal: 'bullish',
            strength: 7,
            position: i,
            description: 'Bullish reversal pattern'
          });
        }

        if (this.isDarkCloudCover(prev1, current)) {
          patterns.push({
            name: 'Dark Cloud Cover',
            type: 'reversal',
            signal: 'bearish',
            strength: 7,
            position: i,
            description: 'Bearish reversal pattern'
          });
        }
      }

      // Three candle patterns
      if (this.isMorningStar(prev2, prev1, current)) {
        patterns.push({
          name: 'Morning Star',
          type: 'reversal',
          signal: 'bullish',
          strength: 9,
          position: i,
          description: 'Strong bullish reversal pattern'
        });
      }

      if (this.isEveningStar(prev2, prev1, current)) {
        patterns.push({
          name: 'Evening Star',
          type: 'reversal',
          signal: 'bearish',
          strength: 9,
          position: i,
          description: 'Strong bearish reversal pattern'
        });
      }

      if (this.isThreeWhiteSoldiers(prev2, prev1, current)) {
        patterns.push({
          name: 'Three White Soldiers',
          type: 'continuation',
          signal: 'bullish',
          strength: 8,
          position: i,
          description: 'Strong bullish continuation pattern'
        });
      }

      if (this.isThreeBlackCrows(prev2, prev1, current)) {
        patterns.push({
          name: 'Three Black Crows',
          type: 'continuation',
          signal: 'bearish',
          strength: 8,
          position: i,
          description: 'Strong bearish continuation pattern'
        });
      }
    }

    return patterns;
  }
}

export class ChartPatternRecognition {
  static findSupportResistance(candles: CandleData[], lookback: number = 20): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    
    if (candles.length < lookback * 2) return patterns;

    // Find support levels
    for (let i = lookback; i < candles.length - lookback; i++) {
      const current = candles[i];
      let isSupport = true;
      
      // Check if current low is lower than surrounding lows
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && candles[j].low <= current.low) {
          isSupport = false;
          break;
        }
      }
      
      if (isSupport) {
        // Count touches of this level
        let touches = 1;
        const threshold = (current.high - current.low) * 0.02; // 2% threshold
        
        for (let k = 0; k < candles.length; k++) {
          if (k !== i && Math.abs(candles[k].low - current.low) <= threshold) {
            touches++;
          }
        }
        
        if (touches >= 2) {
          patterns.push({
            name: 'Support Level',
            type: 'support',
            signal: 'bullish',
            strength: Math.min(10, touches + 3),
            startIndex: Math.max(0, i - lookback),
            endIndex: Math.min(candles.length - 1, i + lookback),
            levels: [current.low],
            description: `Support level at ${current.low.toFixed(5)} (${touches} touches)`
          });
        }
      }
      
      // Check for resistance
      let isResistance = true;
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && candles[j].high >= current.high) {
          isResistance = false;
          break;
        }
      }
      
      if (isResistance) {
        let touches = 1;
        const threshold = (current.high - current.low) * 0.02;
        
        for (let k = 0; k < candles.length; k++) {
          if (k !== i && Math.abs(candles[k].high - current.high) <= threshold) {
            touches++;
          }
        }
        
        if (touches >= 2) {
          patterns.push({
            name: 'Resistance Level',
            type: 'resistance',
            signal: 'bearish',
            strength: Math.min(10, touches + 3),
            startIndex: Math.max(0, i - lookback),
            endIndex: Math.min(candles.length - 1, i + lookback),
            levels: [current.high],
            description: `Resistance level at ${current.high.toFixed(5)} (${touches} touches)`
          });
        }
      }
    }

    return patterns;
  }

  static detectDoubleTop(candles: CandleData[]): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    if (candles.length < 50) return patterns;

    // Find two peaks with a valley between them
    const peaks = [];
    const valleys = [];

    for (let i = 5; i < candles.length - 5; i++) {
      const current = candles[i];
      let isPeak = true;
      let isValley = true;

      for (let j = i - 5; j <= i + 5; j++) {
        if (j !== i) {
          if (candles[j].high >= current.high) isPeak = false;
          if (candles[j].low <= current.low) isValley = false;
        }
      }

      if (isPeak) peaks.push({ index: i, price: current.high });
      if (isValley) valleys.push({ index: i, price: current.low });
    }

    // Look for double top pattern
    for (let i = 0; i < peaks.length - 1; i++) {
      for (let j = i + 1; j < peaks.length; j++) {
        const peak1 = peaks[i];
        const peak2 = peaks[j];
        
        // Check if peaks are similar height (within 1%)
        if (Math.abs(peak1.price - peak2.price) / peak1.price <= 0.01) {
          // Find valley between peaks
          const valleysBetween = valleys.filter(v => 
            v.index > peak1.index && v.index < peak2.index
          );
          
          if (valleysBetween.length > 0) {
            const valley = valleysBetween.reduce((lowest, current) => 
              current.price < lowest.price ? current : lowest
            );
            
            // Valley should be significantly lower than peaks
            if ((peak1.price - valley.price) / peak1.price >= 0.03) {
              patterns.push({
                name: 'Double Top',
                type: 'reversal',
                signal: 'bearish',
                strength: 8,
                startIndex: peak1.index,
                endIndex: peak2.index,
                levels: [peak1.price, valley.price],
                description: `Bearish reversal pattern with peaks at ${peak1.price.toFixed(5)}`
              });
            }
          }
        }
      }
    }

    return patterns;
  }

  static detectTrendLines(candles: CandleData[]): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    if (candles.length < 20) return patterns;

    // Simple trend line detection using linear regression
    const points = candles.map((candle, index) => ({
      x: index,
      y: (candle.high + candle.low) / 2 // midpoint
    }));

    // Calculate trend line for last 20 periods
    const recentPoints = points.slice(-20);
    const n = recentPoints.length;
    
    const sumX = recentPoints.reduce((sum, p) => sum + p.x, 0);
    const sumY = recentPoints.reduce((sum, p) => sum + p.y, 0);
    const sumXY = recentPoints.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = recentPoints.reduce((sum, p) => sum + p.x * p.x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Determine trend direction and strength
    const trendStrength = Math.abs(slope) * 1000; // Scale for readability
    
    if (trendStrength > 0.5) {
      patterns.push({
        name: slope > 0 ? 'Uptrend Line' : 'Downtrend Line',
        type: 'trend',
        signal: slope > 0 ? 'bullish' : 'bearish',
        strength: Math.min(10, Math.round(trendStrength * 2)),
        startIndex: candles.length - 20,
        endIndex: candles.length - 1,
        description: `${slope > 0 ? 'Rising' : 'Falling'} trend line with slope ${slope.toFixed(6)}`
      });
    }

    return patterns;
  }

  static analyzePatterns(candles: CandleData[]): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    
    patterns.push(...this.findSupportResistance(candles));
    patterns.push(...this.detectDoubleTop(candles));
    patterns.push(...this.detectTrendLines(candles));
    
    // Sort by strength descending
    return patterns.sort((a, b) => b.strength - a.strength);
  }
}

export default { CandlestickPatternRecognition, ChartPatternRecognition };