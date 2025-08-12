import { CandleData } from './technicalAnalysis';

export interface HarmonicPattern {
  name: string;
  type: 'bullish' | 'bearish';
  points: {
    X: { index: number; price: number };
    A: { index: number; price: number };
    B: { index: number; price: number };
    C: { index: number; price: number };
    D: { index: number; price: number };
  };
  ratios: {
    AB_XA: number;
    BC_AB: number;
    CD_BC: number;
    AD_XA: number;
  };
  prz: { // Potential Reversal Zone
    upper: number;
    lower: number;
  };
  confidence: number;
  projectedTarget: number;
  stopLoss: number;
}

export interface ElliottWave {
  degree: 'minute' | 'minor' | 'intermediate' | 'primary' | 'cycle';
  type: 'impulse' | 'corrective';
  waves: Array<{
    number: number;
    startIndex: number;
    endIndex: number;
    startPrice: number;
    endPrice: number;
    type: 'impulse' | 'corrective';
  }>;
  projection: {
    wave3Target: number;
    wave5Target: number;
    confidence: number;
  };
}

export class HarmonicPatternRecognition {
  
  // ABCD Pattern Recognition
  static detectABCDPattern(candles: CandleData[]): HarmonicPattern[] {
    const patterns: HarmonicPattern[] = [];
    const swingPoints = this.findSwingPoints(candles);
    
    for (let i = 0; i < swingPoints.length - 3; i++) {
      const A = swingPoints[i];
      const B = swingPoints[i + 1];
      const C = swingPoints[i + 2];
      const D = swingPoints[i + 3];
      
      // Validate ABCD structure
      if (!this.isValidABCDStructure(A, B, C, D)) continue;
      
      const AB = Math.abs(B.price - A.price);
      const BC = Math.abs(C.price - B.price);
      const CD = Math.abs(D.price - C.price);
      
      const BC_AB = BC / AB;
      const CD_BC = CD / BC;
      
      // ABCD Pattern ratios
      if (this.isInRange(BC_AB, 0.618, 0.786) && 
          this.isInRange(CD_BC, 1.272, 1.618)) {
        
        const pattern: HarmonicPattern = {
          name: 'ABCD',
          type: A.price < B.price ? 'bullish' : 'bearish',
          points: {
            X: A, // For ABCD, X point is same as A
            A: A,
            B: B,
            C: C,
            D: D
          },
          ratios: {
            AB_XA: 1,
            BC_AB: BC_AB,
            CD_BC: CD_BC,
            AD_XA: Math.abs(D.price - A.price) / AB
          },
          prz: {
            upper: Math.max(D.price * 1.01, D.price + (AB * 0.02)),
            lower: Math.min(D.price * 0.99, D.price - (AB * 0.02))
          },
          confidence: this.calculateABCDConfidence(BC_AB, CD_BC),
          projectedTarget: this.calculateABCDTarget(A, B, C, D),
          stopLoss: this.calculateABCDStopLoss(A, B, C, D)
        };
        
        patterns.push(pattern);
      }
    }
    
    return patterns;
  }
  
  // Gartley Pattern Recognition
  static detectGartleyPattern(candles: CandleData[]): HarmonicPattern[] {
    const patterns: HarmonicPattern[] = [];
    const swingPoints = this.findSwingPoints(candles);
    
    for (let i = 0; i < swingPoints.length - 4; i++) {
      const X = swingPoints[i];
      const A = swingPoints[i + 1];
      const B = swingPoints[i + 2];
      const C = swingPoints[i + 3];
      const D = swingPoints[i + 4];
      
      if (!this.isValidGartleyStructure(X, A, B, C, D)) continue;
      
      const XA = Math.abs(A.price - X.price);
      const AB = Math.abs(B.price - A.price);
      const BC = Math.abs(C.price - B.price);
      const CD = Math.abs(D.price - C.price);
      const AD = Math.abs(D.price - A.price);
      
      const AB_XA = AB / XA;
      const BC_AB = BC / AB;
      const CD_BC = CD / BC;
      const AD_XA = AD / XA;
      
      // Gartley Pattern ratios
      if (this.isInRange(AB_XA, 0.618, 0.618) &&
          this.isInRange(BC_AB, 0.382, 0.886) &&
          this.isInRange(CD_BC, 1.272, 1.618) &&
          this.isInRange(AD_XA, 0.786, 0.786)) {
        
        const pattern: HarmonicPattern = {
          name: 'Gartley',
          type: X.price < A.price ? 'bullish' : 'bearish',
          points: { X, A, B, C, D },
          ratios: { AB_XA, BC_AB, CD_BC, AD_XA },
          prz: this.calculatePRZ(X, A, D),
          confidence: this.calculateGartleyConfidence(AB_XA, BC_AB, CD_BC, AD_XA),
          projectedTarget: this.calculateGartleyTarget(X, A, B, C, D),
          stopLoss: this.calculateGartleyStopLoss(X, A, B, C, D)
        };
        
        patterns.push(pattern);
      }
    }
    
    return patterns;
  }
  
  // Butterfly Pattern Recognition
  static detectButterflyPattern(candles: CandleData[]): HarmonicPattern[] {
    const patterns: HarmonicPattern[] = [];
    const swingPoints = this.findSwingPoints(candles);
    
    for (let i = 0; i < swingPoints.length - 4; i++) {
      const X = swingPoints[i];
      const A = swingPoints[i + 1];
      const B = swingPoints[i + 2];
      const C = swingPoints[i + 3];
      const D = swingPoints[i + 4];
      
      if (!this.isValidButterflyStructure(X, A, B, C, D)) continue;
      
      const XA = Math.abs(A.price - X.price);
      const AB = Math.abs(B.price - A.price);
      const BC = Math.abs(C.price - B.price);
      const CD = Math.abs(D.price - C.price);
      const AD = Math.abs(D.price - A.price);
      
      const AB_XA = AB / XA;
      const BC_AB = BC / AB;
      const CD_BC = CD / BC;
      const AD_XA = AD / XA;
      
      // Butterfly Pattern ratios
      if (this.isInRange(AB_XA, 0.786, 0.786) &&
          this.isInRange(BC_AB, 0.382, 0.886) &&
          this.isInRange(CD_BC, 1.618, 2.618) &&
          this.isInRange(AD_XA, 1.272, 1.272)) {
        
        const pattern: HarmonicPattern = {
          name: 'Butterfly',
          type: X.price < A.price ? 'bullish' : 'bearish',
          points: { X, A, B, C, D },
          ratios: { AB_XA, BC_AB, CD_BC, AD_XA },
          prz: this.calculatePRZ(X, A, D),
          confidence: this.calculateButterflyConfidence(AB_XA, BC_AB, CD_BC, AD_XA),
          projectedTarget: this.calculateButterflyTarget(X, A, B, C, D),
          stopLoss: this.calculateButterflyStopLoss(X, A, B, C, D)
        };
        
        patterns.push(pattern);
      }
    }
    
    return patterns;
  }
  
  // Bat Pattern Recognition
  static detectBatPattern(candles: CandleData[]): HarmonicPattern[] {
    const patterns: HarmonicPattern[] = [];
    const swingPoints = this.findSwingPoints(candles);
    
    for (let i = 0; i < swingPoints.length - 4; i++) {
      const X = swingPoints[i];
      const A = swingPoints[i + 1];
      const B = swingPoints[i + 2];
      const C = swingPoints[i + 3];
      const D = swingPoints[i + 4];
      
      const XA = Math.abs(A.price - X.price);
      const AB = Math.abs(B.price - A.price);
      const BC = Math.abs(C.price - B.price);
      const CD = Math.abs(D.price - C.price);
      const AD = Math.abs(D.price - A.price);
      
      const AB_XA = AB / XA;
      const BC_AB = BC / AB;
      const CD_BC = CD / BC;
      const AD_XA = AD / XA;
      
      // Bat Pattern ratios
      if (this.isInRange(AB_XA, 0.382, 0.5) &&
          this.isInRange(BC_AB, 0.382, 0.886) &&
          this.isInRange(CD_BC, 1.618, 2.618) &&
          this.isInRange(AD_XA, 0.886, 0.886)) {
        
        const pattern: HarmonicPattern = {
          name: 'Bat',
          type: X.price < A.price ? 'bullish' : 'bearish',
          points: { X, A, B, C, D },
          ratios: { AB_XA, BC_AB, CD_BC, AD_XA },
          prz: this.calculatePRZ(X, A, D),
          confidence: this.calculateBatConfidence(AB_XA, BC_AB, CD_BC, AD_XA),
          projectedTarget: this.calculateBatTarget(X, A, B, C, D),
          stopLoss: this.calculateBatStopLoss(X, A, B, C, D)
        };
        
        patterns.push(pattern);
      }
    }
    
    return patterns;
  }
  
  // Crab Pattern Recognition
  static detectCrabPattern(candles: CandleData[]): HarmonicPattern[] {
    const patterns: HarmonicPattern[] = [];
    const swingPoints = this.findSwingPoints(candles);
    
    for (let i = 0; i < swingPoints.length - 4; i++) {
      const X = swingPoints[i];
      const A = swingPoints[i + 1];
      const B = swingPoints[i + 2];
      const C = swingPoints[i + 3];
      const D = swingPoints[i + 4];
      
      const XA = Math.abs(A.price - X.price);
      const AB = Math.abs(B.price - A.price);
      const BC = Math.abs(C.price - B.price);
      const CD = Math.abs(D.price - C.price);
      const AD = Math.abs(D.price - A.price);
      
      const AB_XA = AB / XA;
      const BC_AB = BC / AB;
      const CD_BC = CD / BC;
      const AD_XA = AD / XA;
      
      // Crab Pattern ratios
      if (this.isInRange(AB_XA, 0.382, 0.618) &&
          this.isInRange(BC_AB, 0.382, 0.886) &&
          this.isInRange(CD_BC, 2.24, 3.618) &&
          this.isInRange(AD_XA, 1.618, 1.618)) {
        
        const pattern: HarmonicPattern = {
          name: 'Crab',
          type: X.price < A.price ? 'bullish' : 'bearish',
          points: { X, A, B, C, D },
          ratios: { AB_XA, BC_AB, CD_BC, AD_XA },
          prz: this.calculatePRZ(X, A, D),
          confidence: this.calculateCrabConfidence(AB_XA, BC_AB, CD_BC, AD_XA),
          projectedTarget: this.calculateCrabTarget(X, A, B, C, D),
          stopLoss: this.calculateCrabStopLoss(X, A, B, C, D)
        };
        
        patterns.push(pattern);
      }
    }
    
    return patterns;
  }
  
  // Helper Methods
  private static findSwingPoints(candles: CandleData[]): Array<{index: number, price: number, type: 'high' | 'low'}> {
    const swingPoints: Array<{index: number, price: number, type: 'high' | 'low'}> = [];
    const lookback = 5;
    
    for (let i = lookback; i < candles.length - lookback; i++) {
      let isSwingHigh = true;
      let isSwingLow = true;
      
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i) {
          if (candles[j].high >= candles[i].high) isSwingHigh = false;
          if (candles[j].low <= candles[i].low) isSwingLow = false;
        }
      }
      
      if (isSwingHigh) {
        swingPoints.push({index: i, price: candles[i].high, type: 'high'});
      }
      if (isSwingLow) {
        swingPoints.push({index: i, price: candles[i].low, type: 'low'});
      }
    }
    
    return swingPoints.sort((a, b) => a.index - b.index);
  }
  
  private static isInRange(value: number, min: number, max: number, tolerance = 0.1): boolean {
    const adjustedMin = min * (1 - tolerance);
    const adjustedMax = max * (1 + tolerance);
    return value >= adjustedMin && value <= adjustedMax;
  }
  
  private static isValidABCDStructure(A: any, B: any, C: any, D: any): boolean {
    return A.index < B.index && B.index < C.index && C.index < D.index;
  }
  
  private static isValidGartleyStructure(X: any, A: any, B: any, C: any, D: any): boolean {
    return X.index < A.index && A.index < B.index && B.index < C.index && C.index < D.index;
  }
  
  private static isValidButterflyStructure(X: any, A: any, B: any, C: any, D: any): boolean {
    return X.index < A.index && A.index < B.index && B.index < C.index && C.index < D.index;
  }
  
  private static calculatePRZ(X: any, A: any, D: any): {upper: number, lower: number} {
    const range = Math.abs(A.price - X.price) * 0.02;
    return {
      upper: D.price + range,
      lower: D.price - range
    };
  }
  
  private static calculateABCDConfidence(BC_AB: number, CD_BC: number): number {
    let confidence = 50;
    
    if (this.isInRange(BC_AB, 0.618, 0.618, 0.05)) confidence += 20;
    if (this.isInRange(BC_AB, 0.786, 0.786, 0.05)) confidence += 15;
    if (this.isInRange(CD_BC, 1.272, 1.272, 0.05)) confidence += 20;
    if (this.isInRange(CD_BC, 1.618, 1.618, 0.05)) confidence += 15;
    
    return Math.min(confidence, 100);
  }
  
  private static calculateGartleyConfidence(AB_XA: number, BC_AB: number, CD_BC: number, AD_XA: number): number {
    let confidence = 60;
    
    if (this.isInRange(AB_XA, 0.618, 0.618, 0.02)) confidence += 15;
    if (this.isInRange(BC_AB, 0.382, 0.886, 0.05)) confidence += 10;
    if (this.isInRange(CD_BC, 1.272, 1.618, 0.05)) confidence += 10;
    if (this.isInRange(AD_XA, 0.786, 0.786, 0.02)) confidence += 15;
    
    return Math.min(confidence, 100);
  }
  
  private static calculateButterflyConfidence(AB_XA: number, BC_AB: number, CD_BC: number, AD_XA: number): number {
    let confidence = 65;
    
    if (this.isInRange(AB_XA, 0.786, 0.786, 0.02)) confidence += 15;
    if (this.isInRange(BC_AB, 0.382, 0.886, 0.05)) confidence += 10;
    if (this.isInRange(CD_BC, 1.618, 2.618, 0.1)) confidence += 10;
    if (this.isInRange(AD_XA, 1.272, 1.272, 0.02)) confidence += 10;
    
    return Math.min(confidence, 100);
  }
  
  private static calculateBatConfidence(AB_XA: number, BC_AB: number, CD_BC: number, AD_XA: number): number {
    let confidence = 70;
    
    if (this.isInRange(AB_XA, 0.382, 0.5, 0.02)) confidence += 10;
    if (this.isInRange(BC_AB, 0.382, 0.886, 0.05)) confidence += 10;
    if (this.isInRange(CD_BC, 1.618, 2.618, 0.1)) confidence += 10;
    if (this.isInRange(AD_XA, 0.886, 0.886, 0.02)) confidence += 10;
    
    return Math.min(confidence, 100);
  }
  
  private static calculateCrabConfidence(AB_XA: number, BC_AB: number, CD_BC: number, AD_XA: number): number {
    let confidence = 75;
    
    if (this.isInRange(AB_XA, 0.382, 0.618, 0.02)) confidence += 10;
    if (this.isInRange(BC_AB, 0.382, 0.886, 0.05)) confidence += 5;
    if (this.isInRange(CD_BC, 2.24, 3.618, 0.1)) confidence += 10;
    if (this.isInRange(AD_XA, 1.618, 1.618, 0.02)) confidence += 10;
    
    return Math.min(confidence, 100);
  }
  
  // Target and Stop Loss Calculations
  private static calculateABCDTarget(A: any, B: any, C: any, D: any): number {
    const CD = Math.abs(D.price - C.price);
    return D.type === 'high' ? D.price - CD * 0.618 : D.price + CD * 0.618;
  }
  
  private static calculateABCDStopLoss(A: any, B: any, C: any, D: any): number {
    const range = Math.abs(D.price - C.price) * 0.1;
    return D.type === 'high' ? D.price + range : D.price - range;
  }
  
  private static calculateGartleyTarget(X: any, A: any, B: any, C: any, D: any): number {
    const XA = Math.abs(A.price - X.price);
    return D.type === 'high' ? D.price - XA * 0.618 : D.price + XA * 0.618;
  }
  
  private static calculateGartleyStopLoss(X: any, A: any, B: any, C: any, D: any): number {
    const XA = Math.abs(A.price - X.price);
    return D.type === 'high' ? D.price + XA * 0.1 : D.price - XA * 0.1;
  }
  
  private static calculateButterflyTarget(X: any, A: any, B: any, C: any, D: any): number {
    const XA = Math.abs(A.price - X.price);
    return D.type === 'high' ? D.price - XA * 0.618 : D.price + XA * 0.618;
  }
  
  private static calculateButterflyStopLoss(X: any, A: any, B: any, C: any, D: any): number {
    const AD = Math.abs(D.price - A.price);
    return D.type === 'high' ? D.price + AD * 0.1 : D.price - AD * 0.1;
  }
  
  private static calculateBatTarget(X: any, A: any, B: any, C: any, D: any): number {
    const XA = Math.abs(A.price - X.price);
    return D.type === 'high' ? D.price - XA * 0.382 : D.price + XA * 0.382;
  }
  
  private static calculateBatStopLoss(X: any, A: any, B: any, C: any, D: any): number {
    const XA = Math.abs(A.price - X.price);
    return D.type === 'high' ? D.price + XA * 0.1 : D.price - XA * 0.1;
  }
  
  private static calculateCrabTarget(X: any, A: any, B: any, C: any, D: any): number {
    const XA = Math.abs(A.price - X.price);
    return D.type === 'high' ? D.price - XA * 0.618 : D.price + XA * 0.618;
  }
  
  private static calculateCrabStopLoss(X: any, A: any, B: any, C: any, D: any): number {
    const XD = Math.abs(D.price - X.price);
    return D.type === 'high' ? D.price + XD * 0.05 : D.price - XD * 0.05;
  }
}

// Elliott Wave Analysis
export class ElliottWaveAnalysis {
  
  static analyzeWaves(candles: CandleData[]): ElliottWave[] {
    const waves: ElliottWave[] = [];
    const swingPoints = this.findSignificantSwingPoints(candles);
    
    // Identify potential 5-wave impulse patterns
    for (let i = 0; i < swingPoints.length - 4; i++) {
      const wave1Start = swingPoints[i];
      const wave1End = swingPoints[i + 1];
      const wave2End = swingPoints[i + 2];
      const wave3End = swingPoints[i + 3];
      const wave4End = swingPoints[i + 4];
      const wave5End = swingPoints[i + 5];
      
      if (this.isValidImpulseStructure(wave1Start, wave1End, wave2End, wave3End, wave4End, wave5End)) {
        const elliotWave: ElliottWave = {
          degree: 'minor',
          type: 'impulse',
          waves: [
            {
              number: 1,
              startIndex: wave1Start.index,
              endIndex: wave1End.index,
              startPrice: wave1Start.price,
              endPrice: wave1End.price,
              type: 'impulse'
            },
            {
              number: 2,
              startIndex: wave1End.index,
              endIndex: wave2End.index,
              startPrice: wave1End.price,
              endPrice: wave2End.price,
              type: 'corrective'
            },
            {
              number: 3,
              startIndex: wave2End.index,
              endIndex: wave3End.index,
              startPrice: wave2End.price,
              endPrice: wave3End.price,
              type: 'impulse'
            },
            {
              number: 4,
              startIndex: wave3End.index,
              endIndex: wave4End.index,
              startPrice: wave3End.price,
              endPrice: wave4End.price,
              type: 'corrective'
            },
            {
              number: 5,
              startIndex: wave4End.index,
              endIndex: wave5End.index,
              startPrice: wave4End.price,
              endPrice: wave5End.price,
              type: 'impulse'
            }
          ],
          projection: this.calculateWaveProjections(wave1Start, wave1End, wave2End, wave3End, wave4End)
        };
        
        waves.push(elliotWave);
      }
    }
    
    return waves;
  }
  
  private static findSignificantSwingPoints(candles: CandleData[]): Array<{index: number, price: number, type: 'high' | 'low'}> {
    const swingPoints: Array<{index: number, price: number, type: 'high' | 'low'}> = [];
    const lookback = 10;
    
    for (let i = lookback; i < candles.length - lookback; i++) {
      let isSwingHigh = true;
      let isSwingLow = true;
      
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i) {
          if (candles[j].high >= candles[i].high) isSwingHigh = false;
          if (candles[j].low <= candles[i].low) isSwingLow = false;
        }
      }
      
      if (isSwingHigh) {
        swingPoints.push({index: i, price: candles[i].high, type: 'high'});
      }
      if (isSwingLow) {
        swingPoints.push({index: i, price: candles[i].low, type: 'low'});
      }
    }
    
    return swingPoints.sort((a, b) => a.index - b.index);
  }
  
  private static isValidImpulseStructure(w1Start: any, w1End: any, w2End: any, w3End: any, w4End: any, w5End: any): boolean {
    if (!w5End) return false;
    
    const wave1 = Math.abs(w1End.price - w1Start.price);
    const wave2 = Math.abs(w2End.price - w1End.price);
    const wave3 = Math.abs(w3End.price - w2End.price);
    const wave4 = Math.abs(w4End.price - w3End.price);
    const wave5 = Math.abs(w5End.price - w4End.price);
    
    // Elliott Wave rules
    // 1. Wave 2 cannot retrace more than 100% of Wave 1
    if (wave2 > wave1) return false;
    
    // 2. Wave 3 cannot be the shortest wave
    if (wave3 < wave1 && wave3 < wave5) return false;
    
    // 3. Wave 4 cannot overlap with Wave 1 price territory
    const w1High = Math.max(w1Start.price, w1End.price);
    const w1Low = Math.min(w1Start.price, w1End.price);
    const w4High = Math.max(w3End.price, w4End.price);
    const w4Low = Math.min(w3End.price, w4End.price);
    
    if (w4Low < w1High && w4High > w1Low) return false;
    
    return true;
  }
  
  private static calculateWaveProjections(w1Start: any, w1End: any, w2End: any, w3End: any, w4End: any): {wave3Target: number, wave5Target: number, confidence: number} {
    const wave1 = Math.abs(w1End.price - w1Start.price);
    const wave3 = Math.abs(w3End.price - w2End.price);
    
    // Common Wave 3 extensions: 1.618, 2.618 of Wave 1
    const wave3Target = w2End.price + (wave1 * 1.618);
    
    // Common Wave 5 projections: Equal to Wave 1, or 0.618 of Wave 1-3
    const wave1to3 = Math.abs(w3End.price - w1Start.price);
    const wave5Target = w4End.price + (wave1to3 * 0.618);
    
    // Calculate confidence based on Fibonacci relationships
    let confidence = 50;
    
    // Check if Wave 3 follows Fibonacci ratios
    const wave3Ratio = wave3 / wave1;
    if (wave3Ratio >= 1.6 && wave3Ratio <= 1.65) confidence += 20;
    if (wave3Ratio >= 2.6 && wave3Ratio <= 2.65) confidence += 15;
    
    return {
      wave3Target,
      wave5Target,
      confidence: Math.min(confidence, 100)
    };
  }
}