import { CandleData } from './technicalAnalysis';

export interface CandlestickPattern {
  name: string;
  type: 'reversal' | 'continuation';
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  position: number;
  description: string;
}

export interface ChartPattern {
  name: string;
  type: 'support' | 'resistance' | 'trend' | 'reversal';
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  startIndex: number;
  endIndex: number;
  levels?: number[];
  description: string;
}

export class CandlestickPatternRecognition {

  // ===== Single Candlestick Patterns =====
  static isDoji(candle: CandleData): boolean {
    const body = Math.abs(candle.close - candle.open);
    const range = candle.high - candle.low;
    return range > 0 && body <= range * 0.1;
  }

  static isHammer(candle: CandleData): boolean {
    const body = Math.abs(candle.close - candle.open);
    const upper = candle.high - Math.max(candle.open, candle.close);
    const lower = Math.min(candle.open, candle.close) - candle.low;
    return lower >= body * 2 && upper <= body * 0.3 && (candle.high - candle.low) > 0;
  }

  static isHangingMan(candle: CandleData): boolean {
    // Same shape as hammer but appears in uptrend (context checked in detection)
    return this.isHammer(candle);
  }

  static isInvertedHammer(candle: CandleData): boolean {
    const body = Math.abs(candle.close - candle.open);
    const upper = candle.high - Math.max(candle.open, candle.close);
    const lower = Math.min(candle.open, candle.close) - candle.low;
    return upper >= body * 2 && lower <= body * 0.3 && (candle.high - candle.low) > 0;
  }

  static isShootingStar(candle: CandleData): boolean {
    const body = Math.abs(candle.close - candle.open);
    const upper = candle.high - Math.max(candle.open, candle.close);
    const lower = Math.min(candle.open, candle.close) - candle.low;
    return upper >= body * 2 && lower <= body * 0.3;
  }

  static isSpinningTop(candle: CandleData): boolean {
    const body = Math.abs(candle.close - candle.open);
    const upper = candle.high - Math.max(candle.open, candle.close);
    const lower = Math.min(candle.open, candle.close) - candle.low;
    const range = candle.high - candle.low;
    return range > 0 && body <= range * 0.3 && upper >= body && lower >= body;
  }

  static isMarubozu(candle: CandleData): boolean {
    const body = Math.abs(candle.close - candle.open);
    const range = candle.high - candle.low;
    return range > 0 && body >= range * 0.95;
  }

  static isDragonflyDoji(candle: CandleData): boolean {
    const body = Math.abs(candle.close - candle.open);
    const range = candle.high - candle.low;
    const upper = candle.high - Math.max(candle.open, candle.close);
    const lower = Math.min(candle.open, candle.close) - candle.low;
    return range > 0 && body <= range * 0.1 && upper <= range * 0.1 && lower >= range * 0.6;
  }

  static isGravestoneDoji(candle: CandleData): boolean {
    const body = Math.abs(candle.close - candle.open);
    const range = candle.high - candle.low;
    const upper = candle.high - Math.max(candle.open, candle.close);
    const lower = Math.min(candle.open, candle.close) - candle.low;
    return range > 0 && body <= range * 0.1 && lower <= range * 0.1 && upper >= range * 0.6;
  }

  static isBullishBeltHold(candle: CandleData): boolean {
    const body = Math.abs(candle.close - candle.open);
    const range = candle.high - candle.low;
    const lower = Math.min(candle.open, candle.close) - candle.low;
    return candle.close > candle.open && body >= range * 0.6 && lower <= range * 0.05;
  }

  static isBearishBeltHold(candle: CandleData): boolean {
    const body = Math.abs(candle.close - candle.open);
    const range = candle.high - candle.low;
    const upper = candle.high - Math.max(candle.open, candle.close);
    return candle.close < candle.open && body >= range * 0.6 && upper <= range * 0.05;
  }

  // ===== Two Candlestick Patterns =====
  static isEngulfing(c1: CandleData, c2: CandleData): 'bullish' | 'bearish' | null {
    if (c1.close < c1.open && c2.close > c2.open && c2.open < c1.close && c2.close > c1.open) return 'bullish';
    if (c1.close > c1.open && c2.close < c2.open && c2.open > c1.close && c2.close < c1.open) return 'bearish';
    return null;
  }

  static isHarami(c1: CandleData, c2: CandleData): 'bullish' | 'bearish' | null {
    const b1h = Math.max(c1.open, c1.close), b1l = Math.min(c1.open, c1.close);
    const b2h = Math.max(c2.open, c2.close), b2l = Math.min(c2.open, c2.close);
    if (!(b2h < b1h && b2l > b1l)) return null;
    if (c1.close < c1.open && c2.close > c2.open) return 'bullish';
    if (c1.close > c1.open && c2.close < c2.open) return 'bearish';
    return null;
  }

  static isPiercingLine(c1: CandleData, c2: CandleData): boolean {
    return c1.close < c1.open && c2.close > c2.open && c2.open < c1.low && c2.close > (c1.open + c1.close) / 2;
  }

  static isDarkCloudCover(c1: CandleData, c2: CandleData): boolean {
    return c1.close > c1.open && c2.close < c2.open && c2.open > c1.high && c2.close < (c1.open + c1.close) / 2;
  }

  static isTweezerTop(c1: CandleData, c2: CandleData): boolean {
    return Math.abs(c1.high - c2.high) / c1.high < 0.001 && c1.close > c1.open && c2.close < c2.open;
  }

  static isTweezerBottom(c1: CandleData, c2: CandleData): boolean {
    return Math.abs(c1.low - c2.low) / c1.low < 0.001 && c1.close < c1.open && c2.close > c2.open;
  }

  static isBullishKicker(c1: CandleData, c2: CandleData): boolean {
    return c1.close < c1.open && c2.close > c2.open && c2.open > c1.open;
  }

  static isBearishKicker(c1: CandleData, c2: CandleData): boolean {
    return c1.close > c1.open && c2.close < c2.open && c2.open < c1.open;
  }

  // ===== Three Candlestick Patterns =====
  static isMorningStar(c1: CandleData, c2: CandleData, c3: CandleData): boolean {
    return c1.close < c1.open && this.isDoji(c2) && c3.close > c3.open && c3.close > (c1.open + c1.close) / 2;
  }

  static isEveningStar(c1: CandleData, c2: CandleData, c3: CandleData): boolean {
    return c1.close > c1.open && this.isDoji(c2) && c3.close < c3.open && c3.close < (c1.open + c1.close) / 2;
  }

  static isThreeWhiteSoldiers(c1: CandleData, c2: CandleData, c3: CandleData): boolean {
    return c1.close > c1.open && c2.close > c2.open && c3.close > c3.open &&
      c2.close > c1.close && c3.close > c2.close && c2.open > c1.open && c3.open > c2.open;
  }

  static isThreeBlackCrows(c1: CandleData, c2: CandleData, c3: CandleData): boolean {
    return c1.close < c1.open && c2.close < c2.open && c3.close < c3.open &&
      c2.close < c1.close && c3.close < c2.close && c2.open < c1.open && c3.open < c2.open;
  }

  static isThreeInsideUp(c1: CandleData, c2: CandleData, c3: CandleData): boolean {
    return this.isHarami(c1, c2) === 'bullish' && c3.close > c3.open && c3.close > c1.open;
  }

  static isThreeInsideDown(c1: CandleData, c2: CandleData, c3: CandleData): boolean {
    return this.isHarami(c1, c2) === 'bearish' && c3.close < c3.open && c3.close < c1.open;
  }

  static isRisingThreeMethods(c: CandleData[]): boolean {
    if (c.length < 5) return false;
    const first = c[0], last = c[c.length - 1];
    if (!(first.close > first.open && last.close > last.open && last.close > first.close)) return false;
    for (let i = 1; i < c.length - 1; i++) {
      if (c[i].close > c[i].open) return false; // Middle candles should be bearish
      if (c[i].low < first.low) return false;
    }
    return true;
  }

  static isFallingThreeMethods(c: CandleData[]): boolean {
    if (c.length < 5) return false;
    const first = c[0], last = c[c.length - 1];
    if (!(first.close < first.open && last.close < last.open && last.close < first.close)) return false;
    for (let i = 1; i < c.length - 1; i++) {
      if (c[i].close < c[i].open) return false;
      if (c[i].high > first.high) return false;
    }
    return true;
  }

  static isAbandonedBabyBullish(c1: CandleData, c2: CandleData, c3: CandleData): boolean {
    return c1.close < c1.open && this.isDoji(c2) && c2.high < c1.low && c3.close > c3.open && c3.low > c2.high;
  }

  static isAbandonedBabyBearish(c1: CandleData, c2: CandleData, c3: CandleData): boolean {
    return c1.close > c1.open && this.isDoji(c2) && c2.low > c1.high && c3.close < c3.open && c3.high < c2.low;
  }

  // ===== Main Detection =====
  static detectPatterns(candles: CandleData[]): CandlestickPattern[] {
    const patterns: CandlestickPattern[] = [];
    if (candles.length < 3) return patterns;

    // Determine trend context for last 10 candles
    const getTrend = (idx: number): 'up' | 'down' | 'flat' => {
      if (idx < 10) return 'flat';
      const first = candles[idx - 10].close, last = candles[idx].close;
      const change = (last - first) / first;
      return change > 0.002 ? 'up' : change < -0.002 ? 'down' : 'flat';
    };

    for (let i = 2; i < candles.length; i++) {
      const cur = candles[i], p1 = candles[i - 1], p2 = candles[i - 2];
      const trend = getTrend(i);

      // Single candle patterns
      if (this.isDragonflyDoji(cur)) {
        patterns.push({ name: 'Dragonfly Doji', type: 'reversal', signal: 'bullish', strength: 7, position: i, description: 'Bullish reversal doji with long lower shadow' });
      } else if (this.isGravestoneDoji(cur)) {
        patterns.push({ name: 'Gravestone Doji', type: 'reversal', signal: 'bearish', strength: 7, position: i, description: 'Bearish reversal doji with long upper shadow' });
      } else if (this.isDoji(cur)) {
        patterns.push({ name: 'Doji', type: 'reversal', signal: 'neutral', strength: 6, position: i, description: 'Indecision candle, potential reversal' });
      }

      if (this.isHammer(cur) && trend === 'down') {
        patterns.push({ name: 'Hammer', type: 'reversal', signal: 'bullish', strength: 7, position: i, description: 'Bullish reversal at support' });
      }
      if (this.isHammer(cur) && trend === 'up') {
        patterns.push({ name: 'Hanging Man', type: 'reversal', signal: 'bearish', strength: 7, position: i, description: 'Bearish reversal at resistance' });
      }
      if (this.isInvertedHammer(cur) && trend === 'down') {
        patterns.push({ name: 'Inverted Hammer', type: 'reversal', signal: 'bullish', strength: 6, position: i, description: 'Potential bullish reversal' });
      }
      if (this.isShootingStar(cur) && trend === 'up') {
        patterns.push({ name: 'Shooting Star', type: 'reversal', signal: 'bearish', strength: 7, position: i, description: 'Bearish reversal at resistance' });
      }
      if (this.isBullishBeltHold(cur)) {
        patterns.push({ name: 'Bullish Belt Hold', type: 'reversal', signal: 'bullish', strength: 6, position: i, description: 'Opening on low, strong bullish close' });
      }
      if (this.isBearishBeltHold(cur)) {
        patterns.push({ name: 'Bearish Belt Hold', type: 'reversal', signal: 'bearish', strength: 6, position: i, description: 'Opening on high, strong bearish close' });
      }

      // Two candle patterns
      const engulfing = this.isEngulfing(p1, cur);
      if (engulfing) {
        patterns.push({ name: `${engulfing === 'bullish' ? 'Bullish' : 'Bearish'} Engulfing`, type: 'reversal', signal: engulfing, strength: 8, position: i, description: `Strong ${engulfing} reversal` });
      }
      const harami = this.isHarami(p1, cur);
      if (harami) {
        patterns.push({ name: `${harami === 'bullish' ? 'Bullish' : 'Bearish'} Harami`, type: 'reversal', signal: harami, strength: 6, position: i, description: `Potential ${harami} reversal` });
      }
      if (this.isPiercingLine(p1, cur)) patterns.push({ name: 'Piercing Line', type: 'reversal', signal: 'bullish', strength: 7, position: i, description: 'Bullish reversal' });
      if (this.isDarkCloudCover(p1, cur)) patterns.push({ name: 'Dark Cloud Cover', type: 'reversal', signal: 'bearish', strength: 7, position: i, description: 'Bearish reversal' });
      if (this.isTweezerTop(p1, cur)) patterns.push({ name: 'Tweezer Top', type: 'reversal', signal: 'bearish', strength: 7, position: i, description: 'Equal highs indicate resistance' });
      if (this.isTweezerBottom(p1, cur)) patterns.push({ name: 'Tweezer Bottom', type: 'reversal', signal: 'bullish', strength: 7, position: i, description: 'Equal lows indicate support' });
      if (this.isBullishKicker(p1, cur)) patterns.push({ name: 'Bullish Kicker', type: 'reversal', signal: 'bullish', strength: 9, position: i, description: 'Very strong bullish reversal' });
      if (this.isBearishKicker(p1, cur)) patterns.push({ name: 'Bearish Kicker', type: 'reversal', signal: 'bearish', strength: 9, position: i, description: 'Very strong bearish reversal' });

      // Three candle patterns
      if (this.isMorningStar(p2, p1, cur)) patterns.push({ name: 'Morning Star', type: 'reversal', signal: 'bullish', strength: 9, position: i, description: 'Strong bullish reversal' });
      if (this.isEveningStar(p2, p1, cur)) patterns.push({ name: 'Evening Star', type: 'reversal', signal: 'bearish', strength: 9, position: i, description: 'Strong bearish reversal' });
      if (this.isThreeWhiteSoldiers(p2, p1, cur)) patterns.push({ name: 'Three White Soldiers', type: 'continuation', signal: 'bullish', strength: 8, position: i, description: 'Strong bullish continuation' });
      if (this.isThreeBlackCrows(p2, p1, cur)) patterns.push({ name: 'Three Black Crows', type: 'continuation', signal: 'bearish', strength: 8, position: i, description: 'Strong bearish continuation' });
      if (this.isThreeInsideUp(p2, p1, cur)) patterns.push({ name: 'Three Inside Up', type: 'reversal', signal: 'bullish', strength: 7, position: i, description: 'Confirmed bullish harami reversal' });
      if (this.isThreeInsideDown(p2, p1, cur)) patterns.push({ name: 'Three Inside Down', type: 'reversal', signal: 'bearish', strength: 7, position: i, description: 'Confirmed bearish harami reversal' });
      if (this.isAbandonedBabyBullish(p2, p1, cur)) patterns.push({ name: 'Abandoned Baby (Bull)', type: 'reversal', signal: 'bullish', strength: 9, position: i, description: 'Rare strong bullish reversal with gap' });
      if (this.isAbandonedBabyBearish(p2, p1, cur)) patterns.push({ name: 'Abandoned Baby (Bear)', type: 'reversal', signal: 'bearish', strength: 9, position: i, description: 'Rare strong bearish reversal with gap' });

      // Five candle patterns
      if (i >= 4) {
        const fiveSlice = candles.slice(i - 4, i + 1);
        if (this.isRisingThreeMethods(fiveSlice)) patterns.push({ name: 'Rising Three Methods', type: 'continuation', signal: 'bullish', strength: 8, position: i, description: 'Bullish continuation with brief consolidation' });
        if (this.isFallingThreeMethods(fiveSlice)) patterns.push({ name: 'Falling Three Methods', type: 'continuation', signal: 'bearish', strength: 8, position: i, description: 'Bearish continuation with brief consolidation' });
      }
    }

    return patterns;
  }
}

export class ChartPatternRecognition {
  // ===== Support & Resistance =====
  static findSupportResistance(candles: CandleData[], lookback = 20): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    if (candles.length < lookback * 2) return patterns;

    for (let i = lookback; i < candles.length - lookback; i++) {
      const cur = candles[i];
      let isSupport = true, isResistance = true;
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i) {
          if (candles[j].low <= cur.low) isSupport = false;
          if (candles[j].high >= cur.high) isResistance = false;
        }
      }
      const threshold = (cur.high - cur.low) * 0.02;
      if (isSupport) {
        let touches = 1;
        for (let k = 0; k < candles.length; k++) if (k !== i && Math.abs(candles[k].low - cur.low) <= threshold) touches++;
        if (touches >= 2) patterns.push({ name: 'Support Level', type: 'support', signal: 'bullish', strength: Math.min(10, touches + 3), startIndex: Math.max(0, i - lookback), endIndex: Math.min(candles.length - 1, i + lookback), levels: [cur.low], description: `Support at ${cur.low.toFixed(5)} (${touches} touches)` });
      }
      if (isResistance) {
        let touches = 1;
        for (let k = 0; k < candles.length; k++) if (k !== i && Math.abs(candles[k].high - cur.high) <= threshold) touches++;
        if (touches >= 2) patterns.push({ name: 'Resistance Level', type: 'resistance', signal: 'bearish', strength: Math.min(10, touches + 3), startIndex: Math.max(0, i - lookback), endIndex: Math.min(candles.length - 1, i + lookback), levels: [cur.high], description: `Resistance at ${cur.high.toFixed(5)} (${touches} touches)` });
      }
    }
    return patterns;
  }

  // ===== Peak/Valley finder (shared) =====
  private static findPeaksAndValleys(candles: CandleData[], lookback = 5) {
    const peaks: { index: number; price: number }[] = [];
    const valleys: { index: number; price: number }[] = [];
    for (let i = lookback; i < candles.length - lookback; i++) {
      let isPeak = true, isValley = true;
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i) {
          if (candles[j].high >= candles[i].high) isPeak = false;
          if (candles[j].low <= candles[i].low) isValley = false;
        }
      }
      if (isPeak) peaks.push({ index: i, price: candles[i].high });
      if (isValley) valleys.push({ index: i, price: candles[i].low });
    }
    return { peaks, valleys };
  }

  // ===== Double Top =====
  static detectDoubleTop(candles: CandleData[]): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    if (candles.length < 50) return patterns;
    const { peaks, valleys } = this.findPeaksAndValleys(candles);
    for (let i = 0; i < peaks.length - 1; i++) {
      for (let j = i + 1; j < peaks.length; j++) {
        const p1 = peaks[i], p2 = peaks[j];
        if (Math.abs(p1.price - p2.price) / p1.price > 0.01) continue;
        const vBetween = valleys.filter(v => v.index > p1.index && v.index < p2.index);
        if (vBetween.length > 0) {
          const valley = vBetween.reduce((low, cur) => cur.price < low.price ? cur : low);
          if ((p1.price - valley.price) / p1.price >= 0.03) {
            patterns.push({ name: 'Double Top', type: 'reversal', signal: 'bearish', strength: 8, startIndex: p1.index, endIndex: p2.index, levels: [p1.price, valley.price], description: `Bearish reversal at ${p1.price.toFixed(5)}` });
          }
        }
      }
    }
    return patterns;
  }

  // ===== Double Bottom =====
  static detectDoubleBottom(candles: CandleData[]): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    if (candles.length < 50) return patterns;
    const { peaks, valleys } = this.findPeaksAndValleys(candles);
    for (let i = 0; i < valleys.length - 1; i++) {
      for (let j = i + 1; j < valleys.length; j++) {
        const v1 = valleys[i], v2 = valleys[j];
        if (Math.abs(v1.price - v2.price) / v1.price > 0.01) continue;
        const pBetween = peaks.filter(p => p.index > v1.index && p.index < v2.index);
        if (pBetween.length > 0) {
          const peak = pBetween.reduce((high, cur) => cur.price > high.price ? cur : high);
          if ((peak.price - v1.price) / v1.price >= 0.03) {
            patterns.push({ name: 'Double Bottom', type: 'reversal', signal: 'bullish', strength: 8, startIndex: v1.index, endIndex: v2.index, levels: [v1.price, peak.price], description: `Bullish reversal at ${v1.price.toFixed(5)}` });
          }
        }
      }
    }
    return patterns;
  }

  // ===== Head and Shoulders =====
  static detectHeadAndShoulders(candles: CandleData[]): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    if (candles.length < 60) return patterns;
    const { peaks, valleys } = this.findPeaksAndValleys(candles);
    for (let i = 0; i < peaks.length - 2; i++) {
      const ls = peaks[i], head = peaks[i + 1], rs = peaks[i + 2];
      if (head.price <= ls.price || head.price <= rs.price) continue;
      if (Math.abs(ls.price - rs.price) / ls.price > 0.03) continue;
      const necklineValleys = valleys.filter(v => v.index > ls.index && v.index < rs.index);
      if (necklineValleys.length >= 1) {
        patterns.push({ name: 'Head & Shoulders', type: 'reversal', signal: 'bearish', strength: 9, startIndex: ls.index, endIndex: rs.index, levels: [head.price, (ls.price + rs.price) / 2], description: `Bearish H&S with head at ${head.price.toFixed(5)}` });
      }
    }
    // Inverse H&S
    for (let i = 0; i < valleys.length - 2; i++) {
      const ls = valleys[i], head = valleys[i + 1], rs = valleys[i + 2];
      if (head.price >= ls.price || head.price >= rs.price) continue;
      if (Math.abs(ls.price - rs.price) / ls.price > 0.03) continue;
      const necklinePeaks = peaks.filter(p => p.index > ls.index && p.index < rs.index);
      if (necklinePeaks.length >= 1) {
        patterns.push({ name: 'Inverse Head & Shoulders', type: 'reversal', signal: 'bullish', strength: 9, startIndex: ls.index, endIndex: rs.index, levels: [head.price, (ls.price + rs.price) / 2], description: `Bullish IH&S with head at ${head.price.toFixed(5)}` });
      }
    }
    return patterns;
  }

  // ===== Triangles =====
  static detectTriangles(candles: CandleData[]): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    if (candles.length < 40) return patterns;
    const { peaks, valleys } = this.findPeaksAndValleys(candles);
    if (peaks.length < 2 || valleys.length < 2) return patterns;

    const recentPeaks = peaks.slice(-3);
    const recentValleys = valleys.slice(-3);
    if (recentPeaks.length >= 2 && recentValleys.length >= 2) {
      const highSlope = (recentPeaks[recentPeaks.length - 1].price - recentPeaks[0].price) / (recentPeaks[recentPeaks.length - 1].index - recentPeaks[0].index || 1);
      const lowSlope = (recentValleys[recentValleys.length - 1].price - recentValleys[0].price) / (recentValleys[recentValleys.length - 1].index - recentValleys[0].index || 1);
      const startIdx = Math.min(recentPeaks[0].index, recentValleys[0].index);
      const endIdx = candles.length - 1;

      if (highSlope < -0.00001 && lowSlope > 0.00001) {
        patterns.push({ name: 'Symmetrical Triangle', type: 'trend', signal: 'neutral', strength: 7, startIndex: startIdx, endIndex: endIdx, description: 'Converging trendlines - breakout imminent' });
      } else if (Math.abs(highSlope) < 0.00001 && lowSlope > 0.00001) {
        patterns.push({ name: 'Ascending Triangle', type: 'trend', signal: 'bullish', strength: 8, startIndex: startIdx, endIndex: endIdx, description: 'Flat resistance with rising support - bullish' });
      } else if (highSlope < -0.00001 && Math.abs(lowSlope) < 0.00001) {
        patterns.push({ name: 'Descending Triangle', type: 'trend', signal: 'bearish', strength: 8, startIndex: startIdx, endIndex: endIdx, description: 'Falling resistance with flat support - bearish' });
      }
    }
    return patterns;
  }

  // ===== Wedges =====
  static detectWedges(candles: CandleData[]): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    if (candles.length < 30) return patterns;
    const { peaks, valleys } = this.findPeaksAndValleys(candles);
    if (peaks.length < 2 || valleys.length < 2) return patterns;

    const rp = peaks.slice(-3);
    const rv = valleys.slice(-3);
    if (rp.length >= 2 && rv.length >= 2) {
      const hs = (rp[rp.length - 1].price - rp[0].price) / (rp[rp.length - 1].index - rp[0].index || 1);
      const ls = (rv[rv.length - 1].price - rv[0].price) / (rv[rv.length - 1].index - rv[0].index || 1);
      const startIdx = Math.min(rp[0].index, rv[0].index);

      if (hs > 0 && ls > 0 && hs < ls * 0.8) {
        patterns.push({ name: 'Rising Wedge', type: 'reversal', signal: 'bearish', strength: 7, startIndex: startIdx, endIndex: candles.length - 1, description: 'Both trendlines rising, converging - bearish' });
      } else if (hs < 0 && ls < 0 && Math.abs(hs) < Math.abs(ls) * 0.8) {
        patterns.push({ name: 'Falling Wedge', type: 'reversal', signal: 'bullish', strength: 7, startIndex: startIdx, endIndex: candles.length - 1, description: 'Both trendlines falling, converging - bullish' });
      }
    }
    return patterns;
  }

  // ===== Flags =====
  static detectFlags(candles: CandleData[]): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    if (candles.length < 25) return patterns;
    // Look for sharp move (pole) followed by consolidation (flag)
    const poleLen = 10, flagLen = 10;
    const poleStart = candles.length - poleLen - flagLen;
    if (poleStart < 0) return patterns;
    const poleChange = (candles[poleStart + poleLen].close - candles[poleStart].close) / candles[poleStart].close;
    const flagCandles = candles.slice(-flagLen);
    const flagRange = Math.max(...flagCandles.map(c => c.high)) - Math.min(...flagCandles.map(c => c.low));
    const poleRange = Math.abs(candles[poleStart + poleLen].close - candles[poleStart].close);

    if (Math.abs(poleChange) > 0.01 && flagRange < poleRange * 0.5) {
      if (poleChange > 0) {
        patterns.push({ name: 'Bull Flag', type: 'trend', signal: 'bullish', strength: 7, startIndex: poleStart, endIndex: candles.length - 1, description: 'Bullish continuation flag pattern' });
      } else {
        patterns.push({ name: 'Bear Flag', type: 'trend', signal: 'bearish', strength: 7, startIndex: poleStart, endIndex: candles.length - 1, description: 'Bearish continuation flag pattern' });
      }
    }
    return patterns;
  }

  // ===== Channels =====
  static detectChannels(candles: CandleData[]): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    if (candles.length < 30) return patterns;
    const { peaks, valleys } = this.findPeaksAndValleys(candles);
    if (peaks.length < 2 || valleys.length < 2) return patterns;

    const rp = peaks.slice(-3);
    const rv = valleys.slice(-3);
    if (rp.length >= 2 && rv.length >= 2) {
      const hs = (rp[rp.length - 1].price - rp[0].price) / (rp[rp.length - 1].index - rp[0].index || 1);
      const ls = (rv[rv.length - 1].price - rv[0].price) / (rv[rv.length - 1].index - rv[0].index || 1);

      // Parallel lines = channel
      if (Math.abs(hs - ls) / (Math.abs(hs) + Math.abs(ls) + 0.0001) < 0.3) {
        const direction = hs > 0.00001 ? 'Ascending' : hs < -0.00001 ? 'Descending' : 'Horizontal';
        const signal: 'bullish' | 'bearish' | 'neutral' = direction === 'Ascending' ? 'bullish' : direction === 'Descending' ? 'bearish' : 'neutral';
        patterns.push({ name: `${direction} Channel`, type: 'trend', signal, strength: 6, startIndex: Math.min(rp[0].index, rv[0].index), endIndex: candles.length - 1, description: `${direction} price channel detected` });
      }
    }
    return patterns;
  }

  // ===== Trend Lines =====
  static detectTrendLines(candles: CandleData[]): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    if (candles.length < 20) return patterns;
    const points = candles.map((c, i) => ({ x: i, y: (c.high + c.low) / 2 }));
    const recent = points.slice(-20);
    const n = recent.length;
    const sumX = recent.reduce((s, p) => s + p.x, 0);
    const sumY = recent.reduce((s, p) => s + p.y, 0);
    const sumXY = recent.reduce((s, p) => s + p.x * p.y, 0);
    const sumXX = recent.reduce((s, p) => s + p.x * p.x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const trendStrength = Math.abs(slope) * 1000;
    if (trendStrength > 0.5) {
      patterns.push({ name: slope > 0 ? 'Uptrend Line' : 'Downtrend Line', type: 'trend', signal: slope > 0 ? 'bullish' : 'bearish', strength: Math.min(10, Math.round(trendStrength * 2)), startIndex: candles.length - 20, endIndex: candles.length - 1, description: `${slope > 0 ? 'Rising' : 'Falling'} trend line` });
    }
    return patterns;
  }

  // ===== Master Analysis =====
  static analyzePatterns(candles: CandleData[]): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    patterns.push(...this.findSupportResistance(candles));
    patterns.push(...this.detectDoubleTop(candles));
    patterns.push(...this.detectDoubleBottom(candles));
    patterns.push(...this.detectHeadAndShoulders(candles));
    patterns.push(...this.detectTriangles(candles));
    patterns.push(...this.detectWedges(candles));
    patterns.push(...this.detectFlags(candles));
    patterns.push(...this.detectChannels(candles));
    patterns.push(...this.detectTrendLines(candles));
    return patterns.sort((a, b) => b.strength - a.strength);
  }
}

export default { CandlestickPatternRecognition, ChartPatternRecognition };
