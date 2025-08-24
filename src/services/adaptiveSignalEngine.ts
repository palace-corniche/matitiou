import type { CandleData } from './technicalAnalysis';

export interface AdaptiveThresholds {
  entropy: { min: number; max: number; current: number };
  probability: { buy: number; sell: number };
  confluence: { min: number; adaptive: number };
  edge: { min: number; adaptive: number };
}

export interface SignalRejectionLog {
  timestamp: string;
  reason: 'entropy' | 'probability' | 'confluence' | 'edge' | 'regime';
  value: number;
  threshold: number;
  signalType: string;
  factors: number;
}

export interface AdaptiveConfig {
  learningRate: number;
  signalDensityTarget: number; // signals per hour
  adaptationWindow: number; // hours to lookback
  regimeWeights: Record<string, number>;
  thresholdBounds: {
    entropy: { min: number; max: number };
    probability: { min: number; max: number };
    confluence: { min: number; max: number };
    edge: { min: number; max: number };
  };
}

export class AdaptiveSignalEngine {
  private thresholds: AdaptiveThresholds;
  private rejectionLog: SignalRejectionLog[] = [];
  private signalHistory: Array<{ timestamp: string; accepted: boolean; score: number }> = [];
  private config: AdaptiveConfig;
  private lastAdaptation: Date = new Date();

  constructor(config?: Partial<AdaptiveConfig>) {
    this.config = {
      learningRate: 0.1,
      signalDensityTarget: 2, // 2 signals per hour target
      adaptationWindow: 24, // 24 hours lookback
      regimeWeights: {
        trending: 1.2,
        ranging: 0.9,
        shock: 0.6,
        news_driven: 0.7
      },
      thresholdBounds: {
        entropy: { min: 0.7, max: 0.95 },
        probability: { min: 0.52, max: 0.7 },
        confluence: { min: 5, max: 50 },
        edge: { min: -0.001, max: 0.001 }
      },
      ...config
    };

    this.thresholds = this.initializeThresholds();
  }

  private initializeThresholds(): AdaptiveThresholds {
    return {
      entropy: { min: 0.7, max: 0.95, current: 0.85 },
      probability: { buy: 0.58, sell: 0.42 },
      confluence: { min: 10, adaptive: 15 },
      edge: { min: -0.0001, adaptive: 0.0001 }
    };
  }

  adaptThresholds(): void {
    const now = new Date();
    const hourssSinceLastAdaptation = (now.getTime() - this.lastAdaptation.getTime()) / (1000 * 60 * 60);
    
    if (hourssSinceLastAdaptation < 1) return; // Only adapt once per hour

    const recentSignals = this.getRecentSignals();
    const recentRejections = this.getRecentRejections();
    
    const currentDensity = recentSignals.length / this.config.adaptationWindow;
    const targetDensity = this.config.signalDensityTarget;
    
    console.log(`📊 Signal density: ${currentDensity.toFixed(2)}/h (target: ${targetDensity}/h)`);

    // Adaptive logic: if signal density is too low, relax thresholds
    if (currentDensity < targetDensity * 0.5) {
      this.relaxThresholds();
    } else if (currentDensity > targetDensity * 2) {
      this.tightenThresholds();
    }

    // Analyze rejection patterns
    this.analyzeRejectionPatterns(recentRejections);
    
    this.lastAdaptation = now;
    
    console.log(`🔧 Adapted thresholds - Entropy: ${this.thresholds.entropy.current.toFixed(3)}, Confluence: ${this.thresholds.confluence.adaptive}, Edge: ${this.thresholds.edge.adaptive.toFixed(6)}`);
  }

  private relaxThresholds(): void {
    const { learningRate } = this.config;
    const bounds = this.config.thresholdBounds;

    // Relax entropy threshold
    this.thresholds.entropy.current = Math.min(
      bounds.entropy.max,
      this.thresholds.entropy.current + (learningRate * 0.05)
    );

    // Relax probability thresholds
    this.thresholds.probability.buy = Math.max(
      bounds.probability.min,
      this.thresholds.probability.buy - (learningRate * 0.02)
    );
    this.thresholds.probability.sell = Math.min(
      1 - bounds.probability.min,
      this.thresholds.probability.sell + (learningRate * 0.02)
    );

    // Relax confluence threshold
    this.thresholds.confluence.adaptive = Math.max(
      bounds.confluence.min,
      this.thresholds.confluence.adaptive - (learningRate * 2)
    );

    // Relax edge threshold
    this.thresholds.edge.adaptive = Math.max(
      bounds.edge.min,
      this.thresholds.edge.adaptive - (learningRate * 0.0001)
    );
  }

  private tightenThresholds(): void {
    const { learningRate } = this.config;
    const bounds = this.config.thresholdBounds;

    // Tighten entropy threshold
    this.thresholds.entropy.current = Math.max(
      bounds.entropy.min,
      this.thresholds.entropy.current - (learningRate * 0.02)
    );

    // Tighten probability thresholds
    this.thresholds.probability.buy = Math.min(
      bounds.probability.max,
      this.thresholds.probability.buy + (learningRate * 0.01)
    );
    this.thresholds.probability.sell = Math.max(
      1 - bounds.probability.max,
      this.thresholds.probability.sell - (learningRate * 0.01)
    );

    // Tighten confluence threshold
    this.thresholds.confluence.adaptive = Math.min(
      bounds.confluence.max,
      this.thresholds.confluence.adaptive + (learningRate * 1)
    );

    // Tighten edge threshold
    this.thresholds.edge.adaptive = Math.min(
      bounds.edge.max,
      this.thresholds.edge.adaptive + (learningRate * 0.00005)
    );
  }

  private analyzeRejectionPatterns(rejections: SignalRejectionLog[]): void {
    const rejectionsByReason = rejections.reduce((acc, rejection) => {
      acc[rejection.reason] = (acc[rejection.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // If entropy is the main rejection reason, relax it more aggressively
    if (rejectionsByReason.entropy > rejections.length * 0.6) {
      this.thresholds.entropy.current = Math.min(
        this.config.thresholdBounds.entropy.max,
        this.thresholds.entropy.current + 0.05
      );
    }

    // If edge is the main rejection reason, relax it
    if (rejectionsByReason.edge > rejections.length * 0.4) {
      this.thresholds.edge.adaptive = Math.max(
        this.config.thresholdBounds.edge.min,
        this.thresholds.edge.adaptive - 0.0002
      );
    }

    console.log(`📈 Rejection analysis:`, rejectionsByReason);
  }

  evaluateSignal(
    probabilisticFactors: any[],
    combinedProbability: number,
    entropy: number,
    netEdge: number,
    confluenceScore: number,
    regime: string,
    signalType: 'buy' | 'sell' | 'neutral'
  ): { accepted: boolean; reason?: string } {
    
    // Apply adaptive thresholds
    this.adaptThresholds();

    const regimeMultiplier = this.config.regimeWeights[regime] || 1.0;
    const adaptedConfluenceThreshold = this.thresholds.confluence.adaptive * (1 / regimeMultiplier);

    // Entropy check with adaptive threshold
    if (entropy > this.thresholds.entropy.current) {
      this.logRejection('entropy', entropy, this.thresholds.entropy.current, signalType, probabilisticFactors.length);
      return { accepted: false, reason: `entropy_too_high_${entropy.toFixed(3)}_>${this.thresholds.entropy.current.toFixed(3)}` };
    }

    // Probability check with adaptive thresholds
    if (signalType === 'buy' && combinedProbability < this.thresholds.probability.buy) {
      this.logRejection('probability', combinedProbability, this.thresholds.probability.buy, signalType, probabilisticFactors.length);
      return { accepted: false, reason: `buy_probability_too_low_${(combinedProbability*100).toFixed(1)}%_<${(this.thresholds.probability.buy*100).toFixed(1)}%` };
    }

    if (signalType === 'sell' && combinedProbability > this.thresholds.probability.sell) {
      this.logRejection('probability', combinedProbability, this.thresholds.probability.sell, signalType, probabilisticFactors.length);
      return { accepted: false, reason: `sell_probability_too_high_${(combinedProbability*100).toFixed(1)}%_>${(this.thresholds.probability.sell*100).toFixed(1)}%` };
    }

    // Edge check with adaptive threshold
    if (netEdge <= this.thresholds.edge.adaptive) {
      this.logRejection('edge', netEdge, this.thresholds.edge.adaptive, signalType, probabilisticFactors.length);
      return { accepted: false, reason: `edge_too_low_${netEdge.toFixed(6)}_<=${this.thresholds.edge.adaptive.toFixed(6)}` };
    }

    // Confluence check with regime-adapted threshold
    if (confluenceScore < adaptedConfluenceThreshold) {
      this.logRejection('confluence', confluenceScore, adaptedConfluenceThreshold, signalType, probabilisticFactors.length);
      return { accepted: false, reason: `confluence_too_low_${confluenceScore.toFixed(1)}_<${adaptedConfluenceThreshold.toFixed(1)}_regime:${regime}` };
    }

    // Signal accepted
    this.logSignal(true, confluenceScore);
    return { accepted: true };
  }

  private logRejection(reason: SignalRejectionLog['reason'], value: number, threshold: number, signalType: string, factors: number): void {
    this.rejectionLog.push({
      timestamp: new Date().toISOString(),
      reason,
      value,
      threshold,
      signalType,
      factors
    });

    // Keep only recent rejections (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.rejectionLog = this.rejectionLog.filter(r => new Date(r.timestamp) > sevenDaysAgo);

    this.logSignal(false, value);
  }

  private logSignal(accepted: boolean, score: number): void {
    this.signalHistory.push({
      timestamp: new Date().toISOString(),
      accepted,
      score
    });

    // Keep only recent signals (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.signalHistory = this.signalHistory.filter(s => new Date(s.timestamp) > sevenDaysAgo);
  }

  private getRecentSignals(): Array<{ timestamp: string; accepted: boolean; score: number }> {
    const cutoff = new Date(Date.now() - this.config.adaptationWindow * 60 * 60 * 1000);
    return this.signalHistory.filter(s => new Date(s.timestamp) > cutoff);
  }

  private getRecentRejections(): SignalRejectionLog[] {
    const cutoff = new Date(Date.now() - this.config.adaptationWindow * 60 * 60 * 1000);
    return this.rejectionLog.filter(r => new Date(r.timestamp) > cutoff);
  }

  // Public API methods
  getCurrentThresholds(): AdaptiveThresholds {
    return { ...this.thresholds };
  }

  getRejectionAnalytics(): {
    totalRejections: number;
    rejectionsByReason: Record<string, number>;
    rejectionRate: number;
    topReasons: Array<{ reason: string; count: number; percentage: number }>;
  } {
    const recent = this.getRecentRejections();
    const recentSignals = this.getRecentSignals();
    
    const rejectionsByReason = recent.reduce((acc, r) => {
      acc[r.reason] = (acc[r.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topReasons = Object.entries(rejectionsByReason)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: (count / recent.length) * 100
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalRejections: recent.length,
      rejectionsByReason,
      rejectionRate: recentSignals.length > 0 ? (recent.length / (recentSignals.length + recent.length)) * 100 : 0,
      topReasons
    };
  }

  getSignalDensityAnalytics(): {
    currentDensity: number;
    targetDensity: number;
    acceptedSignals: number;
    rejectedSignals: number;
    totalEvaluated: number;
  } {
    const recent = this.getRecentSignals();
    const recentRejections = this.getRecentRejections();
    
    const acceptedSignals = recent.filter(s => s.accepted).length;
    const totalEvaluated = recent.length + recentRejections.length;

    return {
      currentDensity: acceptedSignals / this.config.adaptationWindow,
      targetDensity: this.config.signalDensityTarget,
      acceptedSignals,
      rejectedSignals: recentRejections.length,
      totalEvaluated
    };
  }

  forceThresholdAdjustment(type: 'relax' | 'tighten', intensity: number = 1): void {
    if (type === 'relax') {
      this.thresholds.entropy.current = Math.min(
        this.config.thresholdBounds.entropy.max,
        this.thresholds.entropy.current + (0.05 * intensity)
      );
      this.thresholds.confluence.adaptive = Math.max(
        this.config.thresholdBounds.confluence.min,
        this.thresholds.confluence.adaptive - (2 * intensity)
      );
    } else {
      this.thresholds.entropy.current = Math.max(
        this.config.thresholdBounds.entropy.min,
        this.thresholds.entropy.current - (0.02 * intensity)
      );
      this.thresholds.confluence.adaptive = Math.min(
        this.config.thresholdBounds.confluence.max,
        this.thresholds.confluence.adaptive + (1 * intensity)
      );
    }
    
    console.log(`🔧 Force ${type} thresholds (intensity: ${intensity})`);
  }
}
