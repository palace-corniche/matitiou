// Dynamic Triple-Barrier Labeling System
// Implements regime-aware barriers with volatility units and path-dependent exits

import type { MarketRegime } from './regimeDetection';
import type { CandleData } from './technicalAnalysis';

export interface TripleBarrierConfig {
  regime: string;
  volatilityMultiplier: {
    takeProfit: number;
    stopLoss: number;
    timeExit: number; // in hours
  };
  dynamicAdjustment: boolean;
  pathDependentExits: boolean;
  gammaScaling: boolean;
}

export interface BarrierLevels {
  takeProfit: number;
  stopLoss: number;
  timeExit: Date;
  entryPrice: number;
  currentATR: number;
  regime: string;
  confidence: number;
}

export interface BarrierHitResult {
  hitType: 'take_profit' | 'stop_loss' | 'time_exit' | 'path_dependent_exit';
  hitTime: Date;
  hitPrice: number;
  holdingPeriod: number; // in hours
  returnPercent: number;
  pathData: {
    maxFavorable: number;
    maxAdverse: number;
    volatilityRealized: number;
    gammaExits: number;
  };
}

export interface BarrierStats {
  regime: string;
  totalSignals: number;
  hitPatterns: {
    takeProfit: number;
    stopLoss: number;
    timeExit: number;
    pathDependent: number;
  };
  avgHoldingPeriods: {
    winners: number;
    losers: number;
    timeOuts: number;
  };
  volatilityEfficiency: number; // How well barriers match realized volatility
  gammaPerformance: {
    totalExits: number;
    profitImprovement: number;
  };
}

export class DynamicTripleBarrierEngine {
  private regimeConfigs: Map<string, TripleBarrierConfig> = new Map();
  private barrierHistory: Map<string, BarrierHitResult[]> = new Map();
  private barrierStats: Map<string, BarrierStats> = new Map();

  constructor() {
    this.initializeRegimeConfigs();
  }

  // ==================== BARRIER CALCULATION ====================

  calculateDynamicBarriers(
    entryPrice: number,
    signal: 'buy' | 'sell',
    regime: MarketRegime,
    candles: CandleData[],
    volatilityWindow: number = 20
  ): BarrierLevels {
    const config = this.getRegimeConfig(regime.type);
    const atr = this.calculateATR(candles, volatilityWindow);
    const volatilityAdjustment = this.calculateVolatilityAdjustment(regime, candles);

    // Calculate regime-adjusted ATR
    const adjustedATR = atr * volatilityAdjustment;

    // Calculate barrier distances in volatility units
    const tpDistance = adjustedATR * config.volatilityMultiplier.takeProfit;
    const slDistance = adjustedATR * config.volatilityMultiplier.stopLoss;

    // Apply directional logic
    const takeProfit = signal === 'buy' 
      ? entryPrice + tpDistance 
      : entryPrice - tpDistance;
    
    const stopLoss = signal === 'buy'
      ? entryPrice - slDistance
      : entryPrice + slDistance;

    // Calculate time exit
    const timeExitHours = config.volatilityMultiplier.timeExit * this.getRegimeTimeMultiplier(regime);
    const timeExit = new Date(Date.now() + timeExitHours * 60 * 60 * 1000);

    // Apply dynamic adjustments if enabled
    const dynamicBarriers = config.dynamicAdjustment 
      ? this.applyDynamicAdjustments(takeProfit, stopLoss, regime, candles)
      : { takeProfit, stopLoss };

    return {
      takeProfit: dynamicBarriers.takeProfit,
      stopLoss: dynamicBarriers.stopLoss,
      timeExit,
      entryPrice,
      currentATR: adjustedATR,
      regime: regime.type,
      confidence: regime.confidence
    };
  }

  // ==================== PATH-DEPENDENT MONITORING ====================

  monitorBarrierProgress(
    barriers: BarrierLevels,
    currentCandle: CandleData,
    priceHistory: number[],
    signal: 'buy' | 'sell'
  ): {
    shouldExit: boolean;
    exitReason?: string;
    newBarriers?: Partial<BarrierLevels>;
    pathMetrics: any;
  } {
    const config = this.getRegimeConfig(barriers.regime);
    const pathMetrics = this.calculatePathMetrics(barriers, priceHistory, signal);

    // Check for traditional barrier hits
    const traditionalHit = this.checkTraditionalBarriers(barriers, currentCandle);
    if (traditionalHit.hit) {
      return {
        shouldExit: true,
        exitReason: traditionalHit.reason,
        pathMetrics
      };
    }

    // Path-dependent exit logic
    if (config.pathDependentExits) {
      const pathExit = this.checkPathDependentExits(barriers, pathMetrics, currentCandle, signal);
      if (pathExit.shouldExit) {
        return {
          shouldExit: true,
          exitReason: pathExit.reason,
          pathMetrics
        };
      }
    }

    // Gamma scaling adjustments
    if (config.gammaScaling) {
      const gammaAdjustment = this.calculateGammaScaling(barriers, pathMetrics, currentCandle);
      if (gammaAdjustment.shouldAdjust) {
        return {
          shouldExit: false,
          newBarriers: gammaAdjustment.newBarriers,
          pathMetrics
        };
      }
    }

    return { shouldExit: false, pathMetrics };
  }

  // ==================== BARRIER ADJUSTMENT ALGORITHMS ====================

  private applyDynamicAdjustments(
    takeProfit: number,
    stopLoss: number,
    regime: MarketRegime,
    candles: CandleData[]
  ): { takeProfit: number; stopLoss: number } {
    // Support/Resistance adjustment
    const srLevels = this.findNearbySupportResistance(takeProfit, stopLoss, candles);
    
    let adjustedTP = takeProfit;
    let adjustedSL = stopLoss;

    // Adjust TP to nearby resistance (for buys) or support (for sells)
    if (srLevels.resistance && Math.abs(takeProfit - srLevels.resistance) < takeProfit * 0.005) {
      adjustedTP = srLevels.resistance * 0.999; // Slightly before resistance
    }
    if (srLevels.support && Math.abs(takeProfit - srLevels.support) < takeProfit * 0.005) {
      adjustedTP = srLevels.support * 1.001; // Slightly after support
    }

    // Adjust SL based on recent swing levels
    const swingLevels = this.findSwingLevels(candles.slice(-50));
    for (const swing of swingLevels) {
      if (Math.abs(stopLoss - swing) < stopLoss * 0.003) {
        const buffer = stopLoss * 0.001;
        adjustedSL = stopLoss > swing ? swing - buffer : swing + buffer;
        break;
      }
    }

    // Microstructure adjustments based on regime
    if (regime.microstructure.orderFlow === 'buying' && adjustedTP > takeProfit) {
      adjustedTP = takeProfit + (adjustedTP - takeProfit) * 1.1; // Extend TP in favorable flow
    } else if (regime.microstructure.orderFlow === 'selling' && adjustedTP < takeProfit) {
      adjustedTP = takeProfit - (takeProfit - adjustedTP) * 1.1;
    }

    return {
      takeProfit: adjustedTP,
      stopLoss: adjustedSL
    };
  }

  private calculatePathMetrics(
    barriers: BarrierLevels,
    priceHistory: number[],
    signal: 'buy' | 'sell'
  ): any {
    if (priceHistory.length === 0) return {};

    const entryPrice = barriers.entryPrice;
    const currentPrice = priceHistory[priceHistory.length - 1];

    // Calculate maximum favorable and adverse excursions
    let maxFavorable = 0;
    let maxAdverse = 0;

    for (const price of priceHistory) {
      const moveFromEntry = (price - entryPrice) / entryPrice;
      const favorableMove = signal === 'buy' ? moveFromEntry : -moveFromEntry;
      
      maxFavorable = Math.max(maxFavorable, favorableMove);
      maxAdverse = Math.min(maxAdverse, favorableMove);
    }

    // Calculate realized volatility
    const returns = [];
    for (let i = 1; i < priceHistory.length; i++) {
      returns.push((priceHistory[i] - priceHistory[i-1]) / priceHistory[i-1]);
    }
    const realizedVol = returns.length > 0 
      ? Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * Math.sqrt(252)
      : 0;

    // Path efficiency metrics
    const directionalEfficiency = Math.abs(currentPrice - entryPrice) / 
      (priceHistory.reduce((sum, price, i) => 
        i > 0 ? sum + Math.abs(price - priceHistory[i-1]) : sum, 0
      ) || 1);

    return {
      maxFavorable,
      maxAdverse,
      realizedVolatility: realizedVol,
      directionalEfficiency,
      currentReturn: (currentPrice - entryPrice) / entryPrice,
      pathLength: priceHistory.length,
      timeElapsed: Date.now() - barriers.timeExit.getTime() + 
        (24 * 60 * 60 * 1000) // Approximate time elapsed
    };
  }

  private checkPathDependentExits(
    barriers: BarrierLevels,
    pathMetrics: any,
    currentCandle: CandleData,
    signal: 'buy' | 'sell'
  ): { shouldExit: boolean; reason?: string } {
    // Exit if realized volatility is much higher than expected
    const expectedVol = barriers.currentATR / barriers.entryPrice * Math.sqrt(252);
    if (pathMetrics.realizedVolatility > expectedVol * 2) {
      return {
        shouldExit: true,
        reason: `High realized volatility: ${(pathMetrics.realizedVolatility * 100).toFixed(1)}% vs expected ${(expectedVol * 100).toFixed(1)}%`
      };
    }

    // Exit if path efficiency is too low (choppy movement)
    if (pathMetrics.directionalEfficiency < 0.3 && pathMetrics.pathLength > 20) {
      return {
        shouldExit: true,
        reason: `Low path efficiency: ${(pathMetrics.directionalEfficiency * 100).toFixed(1)}%`
      };
    }

    // Exit on adverse excursion beyond comfort zone
    const maxAdverseThreshold = signal === 'buy' 
      ? (barriers.entryPrice - barriers.stopLoss) / barriers.entryPrice * 0.8
      : (barriers.stopLoss - barriers.entryPrice) / barriers.entryPrice * 0.8;
    
    if (Math.abs(pathMetrics.maxAdverse) > maxAdverseThreshold) {
      return {
        shouldExit: true,
        reason: `Excessive adverse excursion: ${(pathMetrics.maxAdverse * 100).toFixed(1)}%`
      };
    }

    // Time decay exit - accelerate exit as time approaches
    const timeElapsed = pathMetrics.timeElapsed || 0;
    const totalTimeAllowed = barriers.timeExit.getTime() - (Date.now() - timeElapsed);
    const timeDecay = timeElapsed / totalTimeAllowed;
    
    if (timeDecay > 0.8 && pathMetrics.currentReturn < 0) {
      return {
        shouldExit: true,
        reason: `Time decay exit: ${(timeDecay * 100).toFixed(0)}% time elapsed with negative return`
      };
    }

    return { shouldExit: false };
  }

  private calculateGammaScaling(
    barriers: BarrierLevels,
    pathMetrics: any,
    currentCandle: CandleData
  ): { shouldAdjust: boolean; newBarriers?: Partial<BarrierLevels> } {
    // Gamma scaling for partial profit taking
    const profitRatio = pathMetrics.currentReturn > 0 
      ? pathMetrics.currentReturn / ((barriers.takeProfit - barriers.entryPrice) / barriers.entryPrice)
      : 0;

    // First gamma level at 50% of target
    if (profitRatio >= 0.5 && profitRatio < 0.75) {
      const newSL = barriers.entryPrice + (currentCandle.close - barriers.entryPrice) * 0.3; // Move SL to 30% of current profit
      return {
        shouldAdjust: true,
        newBarriers: {
          stopLoss: newSL,
          takeProfit: barriers.takeProfit * 1.2 // Extend TP by 20%
        }
      };
    }

    // Second gamma level at 75% of target
    if (profitRatio >= 0.75) {
      const newSL = barriers.entryPrice + (currentCandle.close - barriers.entryPrice) * 0.5; // Move SL to 50% of current profit
      return {
        shouldAdjust: true,
        newBarriers: {
          stopLoss: newSL,
          takeProfit: barriers.takeProfit * 1.5 // Extend TP by 50%
        }
      };
    }

    return { shouldAdjust: false };
  }

  // ==================== BARRIER HIT ANALYSIS ====================

  recordBarrierHit(
    signalId: string,
    barriers: BarrierLevels,
    hitResult: BarrierHitResult
  ): void {
    const regime = barriers.regime;
    
    // Store hit result
    if (!this.barrierHistory.has(regime)) {
      this.barrierHistory.set(regime, []);
    }
    this.barrierHistory.get(regime)!.push(hitResult);

    // Update statistics
    this.updateBarrierStats(regime, hitResult);

    // Learn from hit patterns
    this.learnFromBarrierResult(regime, hitResult);
  }

  private updateBarrierStats(regime: string, hitResult: BarrierHitResult): void {
    let stats = this.barrierStats.get(regime);
    if (!stats) {
      stats = {
        regime,
        totalSignals: 0,
        hitPatterns: {
          takeProfit: 0,
          stopLoss: 0,
          timeExit: 0,
          pathDependent: 0
        },
        avgHoldingPeriods: {
          winners: 0,
          losers: 0,
          timeOuts: 0
        },
        volatilityEfficiency: 0,
        gammaPerformance: {
          totalExits: 0,
          profitImprovement: 0
        }
      };
      this.barrierStats.set(regime, stats);
    }

    stats.totalSignals++;
    stats.hitPatterns[hitResult.hitType]++;

    // Update holding periods
    if (hitResult.returnPercent > 0) {
      stats.avgHoldingPeriods.winners = 
        (stats.avgHoldingPeriods.winners * (stats.hitPatterns.takeProfit - 1) + hitResult.holdingPeriod) /
        stats.hitPatterns.takeProfit;
    } else if (hitResult.hitType === 'stop_loss') {
      stats.avgHoldingPeriods.losers = 
        (stats.avgHoldingPeriods.losers * (stats.hitPatterns.stopLoss - 1) + hitResult.holdingPeriod) /
        stats.hitPatterns.stopLoss;
    } else if (hitResult.hitType === 'time_exit') {
      stats.avgHoldingPeriods.timeOuts = 
        (stats.avgHoldingPeriods.timeOuts * (stats.hitPatterns.timeExit - 1) + hitResult.holdingPeriod) /
        stats.hitPatterns.timeExit;
    }

    // Update gamma performance
    if (hitResult.pathData.gammaExits > 0) {
      stats.gammaPerformance.totalExits += hitResult.pathData.gammaExits;
      // This would be calculated based on actual vs non-gamma outcomes
    }
  }

  private learnFromBarrierResult(regime: string, hitResult: BarrierHitResult): void {
    const config = this.regimeConfigs.get(regime);
    if (!config) return;

    const stats = this.barrierStats.get(regime);
    if (!stats || stats.totalSignals < 20) return; // Need minimum data

    // Adjust volatility multipliers based on hit patterns
    const tpHitRate = stats.hitPatterns.takeProfit / stats.totalSignals;
    const slHitRate = stats.hitPatterns.stopLoss / stats.totalSignals;
    const timeExitRate = stats.hitPatterns.timeExit / stats.totalSignals;

    // If too many time exits, reduce time multiplier
    if (timeExitRate > 0.4) {
      config.volatilityMultiplier.timeExit *= 0.95;
    } else if (timeExitRate < 0.1) {
      config.volatilityMultiplier.timeExit *= 1.05;
    }

    // If too many stop losses, adjust SL multiplier
    if (slHitRate > 0.5) {
      config.volatilityMultiplier.stopLoss *= 1.05;
    } else if (slHitRate < 0.2) {
      config.volatilityMultiplier.stopLoss *= 0.95;
    }

    // If too few take profits, adjust TP multiplier
    if (tpHitRate < 0.2) {
      config.volatilityMultiplier.takeProfit *= 0.95;
    } else if (tpHitRate > 0.6) {
      config.volatilityMultiplier.takeProfit *= 1.05;
    }

    console.log(`🔧 Updated ${regime} barrier config: TP=${config.volatilityMultiplier.takeProfit.toFixed(2)}, SL=${config.volatilityMultiplier.stopLoss.toFixed(2)}, Time=${config.volatilityMultiplier.timeExit.toFixed(1)}h`);
  }

  // ==================== UTILITY METHODS ====================

  private initializeRegimeConfigs(): void {
    const defaultConfigs: Record<string, TripleBarrierConfig> = {
      'trending_bullish': {
        regime: 'trending_bullish',
        volatilityMultiplier: { takeProfit: 3.0, stopLoss: 1.5, timeExit: 48 },
        dynamicAdjustment: true,
        pathDependentExits: true,
        gammaScaling: true
      },
      'trending_bearish': {
        regime: 'trending_bearish',
        volatilityMultiplier: { takeProfit: 3.0, stopLoss: 1.5, timeExit: 36 },
        dynamicAdjustment: true,
        pathDependentExits: true,
        gammaScaling: true
      },
      'ranging_tight': {
        regime: 'ranging_tight',
        volatilityMultiplier: { takeProfit: 2.0, stopLoss: 1.0, timeExit: 12 },
        dynamicAdjustment: true,
        pathDependentExits: false,
        gammaScaling: false
      },
      'ranging_volatile': {
        regime: 'ranging_volatile',
        volatilityMultiplier: { takeProfit: 2.5, stopLoss: 1.2, timeExit: 8 },
        dynamicAdjustment: true,
        pathDependentExits: true,
        gammaScaling: true
      },
      'shock_up': {
        regime: 'shock_up',
        volatilityMultiplier: { takeProfit: 1.5, stopLoss: 0.8, timeExit: 2 },
        dynamicAdjustment: false,
        pathDependentExits: true,
        gammaScaling: false
      },
      'shock_down': {
        regime: 'shock_down',
        volatilityMultiplier: { takeProfit: 1.5, stopLoss: 0.8, timeExit: 2 },
        dynamicAdjustment: false,
        pathDependentExits: true,
        gammaScaling: false
      },
      'news_driven': {
        regime: 'news_driven',
        volatilityMultiplier: { takeProfit: 2.5, stopLoss: 1.0, timeExit: 4 },
        dynamicAdjustment: true,
        pathDependentExits: true,
        gammaScaling: true
      },
      'breakout': {
        regime: 'breakout',
        volatilityMultiplier: { takeProfit: 4.0, stopLoss: 1.2, timeExit: 24 },
        dynamicAdjustment: true,
        pathDependentExits: true,
        gammaScaling: true
      },
      'consolidation': {
        regime: 'consolidation',
        volatilityMultiplier: { takeProfit: 1.8, stopLoss: 0.9, timeExit: 72 },
        dynamicAdjustment: true,
        pathDependentExits: false,
        gammaScaling: false
      },
      'liquidity_crisis': {
        regime: 'liquidity_crisis',
        volatilityMultiplier: { takeProfit: 1.0, stopLoss: 0.5, timeExit: 6 },
        dynamicAdjustment: false,
        pathDependentExits: true,
        gammaScaling: false
      }
    };

    for (const [regime, config] of Object.entries(defaultConfigs)) {
      this.regimeConfigs.set(regime, config);
    }
  }

  private getRegimeConfig(regime: string): TripleBarrierConfig {
    return this.regimeConfigs.get(regime) || this.regimeConfigs.get('ranging_tight')!;
  }

  private calculateATR(candles: CandleData[], period: number): number {
    if (candles.length < period + 1) return 0.001; // Default small ATR

    const trueRanges = [];
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

    const recentTRs = trueRanges.slice(-period);
    return recentTRs.reduce((sum, tr) => sum + tr, 0) / recentTRs.length;
  }

  private calculateVolatilityAdjustment(regime: MarketRegime, candles: CandleData[]): number {
    let adjustment = 1.0;

    // Regime-based adjustments
    if (regime.type.includes('shock')) {
      adjustment *= 1.5; // Wider barriers for shock events
    } else if (regime.type.includes('ranging')) {
      adjustment *= 0.8; // Tighter barriers for ranging markets
    }

    // Volatility-based adjustments
    if (regime.volatility > 0.8) {
      adjustment *= 1.2;
    } else if (regime.volatility < 0.3) {
      adjustment *= 0.9;
    }

    // Time-of-day adjustments
    const hour = new Date().getUTCHours();
    if (hour >= 7 && hour <= 16) { // Active sessions
      adjustment *= 1.0;
    } else { // Quiet sessions
      adjustment *= 0.8;
    }

    return Math.max(0.5, Math.min(2.0, adjustment));
  }

  private getRegimeTimeMultiplier(regime: MarketRegime): number {
    // Adjust holding time based on regime characteristics
    if (regime.type.includes('shock')) {
      return 0.5; // Shorter holding periods for shock events
    } else if (regime.type.includes('trending')) {
      return 1.2; // Longer holding periods for trends
    } else if (regime.type === 'consolidation') {
      return 1.5; // Even longer for consolidation
    }
    
    return 1.0;
  }

  private checkTraditionalBarriers(
    barriers: BarrierLevels,
    currentCandle: CandleData
  ): { hit: boolean; reason?: string } {
    // Check take profit
    if ((currentCandle.high >= barriers.takeProfit && barriers.takeProfit > barriers.entryPrice) ||
        (currentCandle.low <= barriers.takeProfit && barriers.takeProfit < barriers.entryPrice)) {
      return { hit: true, reason: 'take_profit' };
    }

    // Check stop loss
    if ((currentCandle.low <= barriers.stopLoss && barriers.stopLoss < barriers.entryPrice) ||
        (currentCandle.high >= barriers.stopLoss && barriers.stopLoss > barriers.entryPrice)) {
      return { hit: true, reason: 'stop_loss' };
    }

    // Check time exit
    if (new Date() >= barriers.timeExit) {
      return { hit: true, reason: 'time_exit' };
    }

    return { hit: false };
  }

  private findNearbySupportResistance(
    takeProfit: number,
    stopLoss: number,
    candles: CandleData[]
  ): { support?: number; resistance?: number } {
    const recentCandles = candles.slice(-100);
    const highs = recentCandles.map(c => c.high);
    const lows = recentCandles.map(c => c.low);

    // Find resistance levels (recent highs)
    const resistance = this.findSignificantLevels(highs, takeProfit, 0.001);
    
    // Find support levels (recent lows)
    const support = this.findSignificantLevels(lows, stopLoss, 0.001);

    return { support, resistance };
  }

  private findSignificantLevels(prices: number[], target: number, tolerance: number): number | undefined {
    const levelCounts = new Map<number, number>();
    
    // Group prices into levels
    for (const price of prices) {
      const level = Math.round(price / tolerance) * tolerance;
      levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
    }

    // Find most significant level near target
    let bestLevel: number | undefined;
    let maxCount = 0;
    
    for (const [level, count] of levelCounts) {
      if (Math.abs(level - target) / target < 0.01 && count > maxCount) {
        bestLevel = level;
        maxCount = count;
      }
    }

    return maxCount >= 3 ? bestLevel : undefined;
  }

  private findSwingLevels(candles: CandleData[]): number[] {
    const levels: number[] = [];
    
    for (let i = 2; i < candles.length - 2; i++) {
      const current = candles[i];
      const prev2 = candles[i - 2];
      const prev1 = candles[i - 1];
      const next1 = candles[i + 1];
      const next2 = candles[i + 2];

      // Swing high
      if (current.high > prev2.high && current.high > prev1.high && 
          current.high > next1.high && current.high > next2.high) {
        levels.push(current.high);
      }

      // Swing low
      if (current.low < prev2.low && current.low < prev1.low && 
          current.low < next1.low && current.low < next2.low) {
        levels.push(current.low);
      }
    }

    return levels;
  }

  // ==================== PUBLIC API ====================

  public getBarrierStats(): Map<string, BarrierStats> {
    return new Map(this.barrierStats);
  }

  public getBarrierHistory(regime?: string): BarrierHitResult[] {
    if (regime) {
      return this.barrierHistory.get(regime) || [];
    }
    
    const allHistory: BarrierHitResult[] = [];
    for (const history of this.barrierHistory.values()) {
      allHistory.push(...history);
    }
    return allHistory;
  }

  public updateRegimeConfig(regime: string, config: Partial<TripleBarrierConfig>): void {
    const existingConfig = this.regimeConfigs.get(regime);
    if (existingConfig) {
      this.regimeConfigs.set(regime, { ...existingConfig, ...config });
    }
  }
}