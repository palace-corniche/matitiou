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
  prz: { upper: number; lower: number };
  confidence: number;
  projectedTarget: number;
  stopLoss: number;
}

export interface ElliottWave {
  degree: 'minute' | 'minor' | 'intermediate' | 'primary' | 'cycle';
  type: 'impulse' | 'corrective';
  subtype?: 'zigzag' | 'flat' | 'triangle';
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

// ─── Shared helpers ───────────────────────────────────────────────────
type SwingPoint = { index: number; price: number; type: 'high' | 'low' };

function findSwingPoints(candles: CandleData[], lookback = 5): SwingPoint[] {
  const pts: SwingPoint[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    let isHigh = true, isLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (candles[j].high >= candles[i].high) isHigh = false;
      if (candles[j].low <= candles[i].low) isLow = false;
    }
    if (isHigh) pts.push({ index: i, price: candles[i].high, type: 'high' });
    if (isLow) pts.push({ index: i, price: candles[i].low, type: 'low' });
  }
  return pts.sort((a, b) => a.index - b.index);
}

function inRange(value: number, min: number, max: number, tol = 0.1): boolean {
  return value >= min * (1 - tol) && value <= max * (1 + tol);
}

function makePRZ(X: SwingPoint, A: SwingPoint, D: SwingPoint): { upper: number; lower: number } {
  const range = Math.abs(A.price - X.price) * 0.02;
  return { upper: D.price + range, lower: D.price - range };
}

// ─── Harmonic Pattern Recognition ─────────────────────────────────────
export class HarmonicPatternRecognition {

  // ---------- Generic 5-point detector used by every pattern ----------
  private static detect5Point(
    candles: CandleData[],
    name: string,
    ratioTest: (r: { AB_XA: number; BC_AB: number; CD_BC: number; AD_XA: number }) => boolean,
    confidenceFn: (r: { AB_XA: number; BC_AB: number; CD_BC: number; AD_XA: number }) => number,
    structureValidator?: (X: SwingPoint, A: SwingPoint, B: SwingPoint, C: SwingPoint, D: SwingPoint) => boolean,
  ): HarmonicPattern[] {
    const patterns: HarmonicPattern[] = [];
    const swingPoints = findSwingPoints(candles);

    for (let i = 0; i < swingPoints.length - 4; i++) {
      const [X, A, B, C, D] = [swingPoints[i], swingPoints[i+1], swingPoints[i+2], swingPoints[i+3], swingPoints[i+4]];
      if (structureValidator && !structureValidator(X, A, B, C, D)) continue;

      const XA = Math.abs(A.price - X.price);
      const AB = Math.abs(B.price - A.price);
      const BC = Math.abs(C.price - B.price);
      const CD = Math.abs(D.price - C.price);
      const AD = Math.abs(D.price - A.price);
      if (XA === 0 || AB === 0 || BC === 0) continue;

      const r = { AB_XA: AB / XA, BC_AB: BC / AB, CD_BC: CD / BC, AD_XA: AD / XA };
      if (!ratioTest(r)) continue;

      patterns.push({
        name,
        type: X.price < A.price ? 'bullish' : 'bearish',
        points: { X, A, B, C, D },
        ratios: r,
        prz: makePRZ(X, A, D),
        confidence: confidenceFn(r),
        projectedTarget: D.type === 'high' ? D.price - XA * 0.618 : D.price + XA * 0.618,
        stopLoss: D.type === 'high' ? D.price + XA * 0.1 : D.price - XA * 0.1,
      });
    }
    return patterns;
  }

  // ---------- ABCD (4-point, X=A) ----------
  static detectABCDPattern(candles: CandleData[]): HarmonicPattern[] {
    const patterns: HarmonicPattern[] = [];
    const sp = findSwingPoints(candles);
    for (let i = 0; i < sp.length - 3; i++) {
      const [A, B, C, D] = [sp[i], sp[i+1], sp[i+2], sp[i+3]];
      const AB = Math.abs(B.price - A.price);
      const BC = Math.abs(C.price - B.price);
      const CD = Math.abs(D.price - C.price);
      if (AB === 0 || BC === 0) continue;
      const BC_AB = BC / AB, CD_BC = CD / BC;
      if (inRange(BC_AB, 0.618, 0.786) && inRange(CD_BC, 1.272, 1.618)) {
        let conf = 50;
        if (inRange(BC_AB, 0.618, 0.618, 0.05)) conf += 20;
        if (inRange(CD_BC, 1.272, 1.272, 0.05)) conf += 20;
        patterns.push({
          name: 'ABCD', type: A.price < B.price ? 'bullish' : 'bearish',
          points: { X: A, A, B, C, D },
          ratios: { AB_XA: 1, BC_AB, CD_BC, AD_XA: Math.abs(D.price - A.price) / AB },
          prz: { upper: D.price + AB * 0.02, lower: D.price - AB * 0.02 },
          confidence: Math.min(conf, 100),
          projectedTarget: D.type === 'high' ? D.price - CD * 0.618 : D.price + CD * 0.618,
          stopLoss: D.type === 'high' ? D.price + AB * 0.1 : D.price - AB * 0.1,
        });
      }
    }
    return patterns;
  }

  // ---------- Gartley ----------
  static detectGartleyPattern(candles: CandleData[]): HarmonicPattern[] {
    return this.detect5Point(candles, 'Gartley',
      r => inRange(r.AB_XA, 0.618, 0.618) && inRange(r.BC_AB, 0.382, 0.886) && inRange(r.CD_BC, 1.272, 1.618) && inRange(r.AD_XA, 0.786, 0.786),
      r => { let c = 60; if (inRange(r.AB_XA, 0.618, 0.618, 0.02)) c += 15; if (inRange(r.AD_XA, 0.786, 0.786, 0.02)) c += 15; return Math.min(c + 10, 100); });
  }

  // ---------- Butterfly ----------
  static detectButterflyPattern(candles: CandleData[]): HarmonicPattern[] {
    return this.detect5Point(candles, 'Butterfly',
      r => inRange(r.AB_XA, 0.786, 0.786) && inRange(r.BC_AB, 0.382, 0.886) && inRange(r.CD_BC, 1.618, 2.618) && inRange(r.AD_XA, 1.272, 1.272),
      r => { let c = 65; if (inRange(r.AB_XA, 0.786, 0.786, 0.02)) c += 15; if (inRange(r.AD_XA, 1.272, 1.272, 0.02)) c += 10; return Math.min(c + 10, 100); });
  }

  // ---------- Bat ----------
  static detectBatPattern(candles: CandleData[]): HarmonicPattern[] {
    return this.detect5Point(candles, 'Bat',
      r => inRange(r.AB_XA, 0.382, 0.5) && inRange(r.BC_AB, 0.382, 0.886) && inRange(r.CD_BC, 1.618, 2.618) && inRange(r.AD_XA, 0.886, 0.886),
      r => { let c = 70; if (inRange(r.AD_XA, 0.886, 0.886, 0.02)) c += 10; return Math.min(c + 10, 100); });
  }

  // ---------- Crab ----------
  static detectCrabPattern(candles: CandleData[]): HarmonicPattern[] {
    return this.detect5Point(candles, 'Crab',
      r => inRange(r.AB_XA, 0.382, 0.618) && inRange(r.BC_AB, 0.382, 0.886) && inRange(r.CD_BC, 2.24, 3.618) && inRange(r.AD_XA, 1.618, 1.618),
      r => { let c = 75; if (inRange(r.AD_XA, 1.618, 1.618, 0.02)) c += 10; return Math.min(c + 10, 100); });
  }

  // ---------- Shark (NEW) ----------
  static detectSharkPattern(candles: CandleData[]): HarmonicPattern[] {
    return this.detect5Point(candles, 'Shark',
      r => inRange(r.AB_XA, 1.13, 1.618) && inRange(r.BC_AB, 1.618, 2.24) && inRange(r.AD_XA, 0.886, 1.13),
      r => {
        let c = 65;
        if (inRange(r.AB_XA, 1.13, 1.13, 0.03)) c += 15;
        if (inRange(r.BC_AB, 1.618, 1.618, 0.05)) c += 10;
        if (inRange(r.AD_XA, 0.886, 0.886, 0.03)) c += 10;
        return Math.min(c, 100);
      });
  }

  // ---------- Cypher (NEW) ----------
  static detectCypherPattern(candles: CandleData[]): HarmonicPattern[] {
    return this.detect5Point(candles, 'Cypher',
      r => inRange(r.AB_XA, 0.382, 0.618) && inRange(r.BC_AB, 1.272, 1.414) && inRange(r.AD_XA, 0.786, 0.786),
      r => {
        let c = 65;
        if (inRange(r.AB_XA, 0.382, 0.618, 0.03)) c += 10;
        if (inRange(r.BC_AB, 1.272, 1.414, 0.05)) c += 10;
        if (inRange(r.AD_XA, 0.786, 0.786, 0.02)) c += 15;
        return Math.min(c, 100);
      });
  }

  // ---------- Three Drives (NEW) ----------
  static detectThreeDrivesPattern(candles: CandleData[]): HarmonicPattern[] {
    // Three Drives needs 6 swing points (Drive1-peak-Drive2-peak-Drive3)
    const patterns: HarmonicPattern[] = [];
    const sp = findSwingPoints(candles);
    for (let i = 0; i < sp.length - 5; i++) {
      const [p1, p2, p3, p4, p5, p6] = sp.slice(i, i + 6);
      const drive1 = Math.abs(p2.price - p1.price);
      const ret1 = Math.abs(p3.price - p2.price);
      const drive2 = Math.abs(p4.price - p3.price);
      const ret2 = Math.abs(p5.price - p4.price);
      const drive3 = Math.abs(p6.price - p5.price);
      if (drive1 === 0 || drive2 === 0) continue;

      const ret1_d1 = ret1 / drive1;
      const ret2_d2 = ret2 / drive2;
      const d2_d1 = drive2 / drive1;
      const d3_d2 = drive3 / drive2;

      // Retracements ~0.618, drives extend ~1.272-1.618 of each other
      if (inRange(ret1_d1, 0.618, 0.786) && inRange(ret2_d2, 0.618, 0.786) &&
          inRange(d2_d1, 1.272, 1.618) && inRange(d3_d2, 0.9, 1.1, 0.15)) {
        let conf = 60;
        if (inRange(ret1_d1, 0.618, 0.618, 0.03)) conf += 10;
        if (inRange(d2_d1, 1.272, 1.272, 0.05)) conf += 10;
        const bullish = p1.price < p2.price;
        const XA = Math.abs(p2.price - p1.price);
        patterns.push({
          name: 'Three Drives',
          type: bullish ? 'bearish' : 'bullish', // reversal at completion
          points: { X: p1, A: p2, B: p3, C: p4, D: p6 },
          ratios: { AB_XA: d2_d1, BC_AB: ret1_d1, CD_BC: d3_d2, AD_XA: Math.abs(p6.price - p2.price) / XA },
          prz: { upper: p6.price + XA * 0.02, lower: p6.price - XA * 0.02 },
          confidence: Math.min(conf, 100),
          projectedTarget: bullish ? p6.price - drive3 * 0.618 : p6.price + drive3 * 0.618,
          stopLoss: bullish ? p6.price + XA * 0.05 : p6.price - XA * 0.05,
        });
      }
    }
    return patterns;
  }

  // ---------- Detect All ----------
  static detectAllPatterns(candles: CandleData[]): HarmonicPattern[] {
    return [
      ...this.detectABCDPattern(candles),
      ...this.detectGartleyPattern(candles),
      ...this.detectButterflyPattern(candles),
      ...this.detectBatPattern(candles),
      ...this.detectCrabPattern(candles),
      ...this.detectSharkPattern(candles),
      ...this.detectCypherPattern(candles),
      ...this.detectThreeDrivesPattern(candles),
    ];
  }
}

// ─── Elliott Wave Analysis ────────────────────────────────────────────
export class ElliottWaveAnalysis {

  static analyzeWaves(candles: CandleData[]): ElliottWave[] {
    const waves: ElliottWave[] = [];
    const sp = findSwingPoints(candles, 10);

    // Impulse patterns (5-wave)
    for (let i = 0; i < sp.length - 5; i++) {
      const [w1s, w1e, w2e, w3e, w4e, w5e] = sp.slice(i, i + 6);
      if (this.isValidImpulse(w1s, w1e, w2e, w3e, w4e, w5e)) {
        waves.push({
          degree: this.classifyDegree(candles, w1s.index, w5e.index),
          type: 'impulse',
          waves: [
            { number: 1, startIndex: w1s.index, endIndex: w1e.index, startPrice: w1s.price, endPrice: w1e.price, type: 'impulse' },
            { number: 2, startIndex: w1e.index, endIndex: w2e.index, startPrice: w1e.price, endPrice: w2e.price, type: 'corrective' },
            { number: 3, startIndex: w2e.index, endIndex: w3e.index, startPrice: w2e.price, endPrice: w3e.price, type: 'impulse' },
            { number: 4, startIndex: w3e.index, endIndex: w4e.index, startPrice: w3e.price, endPrice: w4e.price, type: 'corrective' },
            { number: 5, startIndex: w4e.index, endIndex: w5e.index, startPrice: w4e.price, endPrice: w5e.price, type: 'impulse' },
          ],
          projection: this.calcProjections(w1s, w1e, w2e, w3e, w4e),
        });
      }
    }

    // Corrective patterns
    waves.push(...this.detectZigzag(sp, candles));
    waves.push(...this.detectFlat(sp, candles));
    waves.push(...this.detectTriangle(sp, candles));

    return waves;
  }

  // ── Zigzag (5-3-5): Sharp correction ──
  private static detectZigzag(sp: SwingPoint[], candles: CandleData[]): ElliottWave[] {
    const waves: ElliottWave[] = [];
    for (let i = 0; i < sp.length - 2; i++) {
      const [A, B, C] = [sp[i], sp[i + 1], sp[i + 2]];
      const wA = Math.abs(B.price - A.price);
      const wB = Math.abs(C.price - B.price);
      if (wA === 0) continue;
      const bRet = wB / wA;
      // Wave B retraces 50-78.6% of A, Wave C extends beyond A
      if (inRange(bRet, 0.5, 0.786, 0.05)) {
        const wC_end_idx = Math.min(C.index + Math.abs(B.index - A.index), candles.length - 1);
        waves.push({
          degree: this.classifyDegree(candles, A.index, wC_end_idx),
          type: 'corrective',
          subtype: 'zigzag',
          waves: [
            { number: 1, startIndex: A.index, endIndex: B.index, startPrice: A.price, endPrice: B.price, type: 'impulse' },
            { number: 2, startIndex: B.index, endIndex: C.index, startPrice: B.price, endPrice: C.price, type: 'corrective' },
            { number: 3, startIndex: C.index, endIndex: wC_end_idx, startPrice: C.price, endPrice: candles[wC_end_idx]?.close ?? C.price, type: 'impulse' },
          ],
          projection: { wave3Target: C.price + (B.price - A.price), wave5Target: 0, confidence: 55 + (inRange(bRet, 0.618, 0.618, 0.03) ? 15 : 0) },
        });
      }
    }
    return waves;
  }

  // ── Flat (3-3-5): Sideways correction ──
  private static detectFlat(sp: SwingPoint[], candles: CandleData[]): ElliottWave[] {
    const waves: ElliottWave[] = [];
    for (let i = 0; i < sp.length - 2; i++) {
      const [A, B, C] = [sp[i], sp[i + 1], sp[i + 2]];
      const wA = Math.abs(B.price - A.price);
      const wB = Math.abs(C.price - B.price);
      if (wA === 0) continue;
      const bRet = wB / wA;
      // Wave B retraces ~90-110% of A (flat characteristic)
      if (inRange(bRet, 0.9, 1.1, 0.05)) {
        const wC_end_idx = Math.min(C.index + Math.abs(B.index - A.index), candles.length - 1);
        waves.push({
          degree: this.classifyDegree(candles, A.index, wC_end_idx),
          type: 'corrective',
          subtype: 'flat',
          waves: [
            { number: 1, startIndex: A.index, endIndex: B.index, startPrice: A.price, endPrice: B.price, type: 'corrective' },
            { number: 2, startIndex: B.index, endIndex: C.index, startPrice: B.price, endPrice: C.price, type: 'corrective' },
            { number: 3, startIndex: C.index, endIndex: wC_end_idx, startPrice: C.price, endPrice: candles[wC_end_idx]?.close ?? C.price, type: 'impulse' },
          ],
          projection: { wave3Target: A.price, wave5Target: 0, confidence: 50 + (inRange(bRet, 1.0, 1.0, 0.03) ? 15 : 0) },
        });
      }
    }
    return waves;
  }

  // ── Triangle (3-3-3-3-3): Converging ──
  private static detectTriangle(sp: SwingPoint[], candles: CandleData[]): ElliottWave[] {
    const waves: ElliottWave[] = [];
    for (let i = 0; i < sp.length - 4; i++) {
      const pts = sp.slice(i, i + 5);
      // Check converging: each successive swing is smaller
      const swings = [];
      for (let j = 0; j < pts.length - 1; j++) {
        swings.push(Math.abs(pts[j + 1].price - pts[j].price));
      }
      const isConverging = swings.every((s, idx) => idx === 0 || s < swings[idx - 1] * 1.1);
      if (isConverging && swings.length === 4) {
        const endIdx = pts[4].index;
        waves.push({
          degree: this.classifyDegree(candles, pts[0].index, endIdx),
          type: 'corrective',
          subtype: 'triangle',
          waves: pts.slice(0, 4).map((p, idx) => ({
            number: idx + 1,
            startIndex: p.index,
            endIndex: pts[idx + 1].index,
            startPrice: p.price,
            endPrice: pts[idx + 1].price,
            type: 'corrective' as const,
          })),
          projection: {
            wave3Target: pts[4].price + (pts[0].price - pts[4].price) * 0.618,
            wave5Target: 0,
            confidence: 55,
          },
        });
      }
    }
    return waves;
  }

  // ── Wave degree classification ──
  private static classifyDegree(candles: CandleData[], startIdx: number, endIdx: number): ElliottWave['degree'] {
    const bars = endIdx - startIdx;
    if (bars < 20) return 'minute';
    if (bars < 60) return 'minor';
    if (bars < 200) return 'intermediate';
    if (bars < 600) return 'primary';
    return 'cycle';
  }

  // ── Impulse validation ──
  private static isValidImpulse(w1s: SwingPoint, w1e: SwingPoint, w2e: SwingPoint, w3e: SwingPoint, w4e: SwingPoint, w5e: SwingPoint): boolean {
    if (!w5e) return false;
    const wave1 = Math.abs(w1e.price - w1s.price);
    const wave2 = Math.abs(w2e.price - w1e.price);
    const wave3 = Math.abs(w3e.price - w2e.price);
    const wave5 = Math.abs(w5e.price - w4e.price);
    if (wave2 > wave1) return false;
    if (wave3 < wave1 && wave3 < wave5) return false;
    const w1H = Math.max(w1s.price, w1e.price), w1L = Math.min(w1s.price, w1e.price);
    const w4H = Math.max(w3e.price, w4e.price), w4L = Math.min(w3e.price, w4e.price);
    if (w4L < w1H && w4H > w1L) return false;
    return true;
  }

  // ── Wave projections ──
  private static calcProjections(w1s: SwingPoint, w1e: SwingPoint, w2e: SwingPoint, w3e: SwingPoint, w4e: SwingPoint) {
    const wave1 = Math.abs(w1e.price - w1s.price);
    const wave3 = Math.abs(w3e.price - w2e.price);
    const wave3Target = w2e.price + wave1 * 1.618;
    const wave1to3 = Math.abs(w3e.price - w1s.price);
    const wave5Target = w4e.price + wave1to3 * 0.618;
    let confidence = 50;
    const r = wave3 / wave1;
    if (r >= 1.6 && r <= 1.65) confidence += 20;
    if (r >= 2.6 && r <= 2.65) confidence += 15;
    return { wave3Target, wave5Target, confidence: Math.min(confidence, 100) };
  }
}
