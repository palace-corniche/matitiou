// Regime-Adaptive Trading Engine - Core System
// Implements online learning, dynamic thresholds, and regime-conditioned decision making

import { RegimeDetectionEngine, type MarketRegime } from './regimeDetection';
import type { CandleData } from './technicalAnalysis';

export interface RegimeAdaptiveConfig {
  onlineLearningEnabled: boolean;
  adaptiveThresholds: boolean;
  continuousRecalibration: boolean;
  dynamicRiskManagement: boolean;
  portfolioOptimization: boolean;
}

export interface AdaptiveThreshold {
  regime: string;
  threshold: number;
  confidence: number;
  lastUpdate: Date;
  performance: {
    accuracy: number;
    profitability: number;
    sharpe: number;
    drawdown: number;
  };
}

export interface OnlineLearningState {
  regime: string;
  totalTrades: number;
  winRate: number;
  avgReturn: number;
  volatility: number;
  lastCalibration: Date;
  featureWeights: Record<string, number>;
  modelPerformance: {
    precision: number;
    recall: number;
    f1Score: number;
    crossValidationScore: number;
  };
}

export interface EdgeMetrics {
  expectedEdge: number;
  executionQualityFactor: number;
  opportunityCostFactor: number;
  spreadCost: number;
  slippageCost: number;
  marketImpactCost: number;
  netEdge: number;
  confidenceInterval: [number, number];
}

export class RegimeAdaptiveEngine {
  private regimeDetector: RegimeDetectionEngine;
  private adaptiveThresholds: Map<string, AdaptiveThreshold> = new Map();
  private onlineLearningStates: Map<string, OnlineLearningState> = new Map();
  private config: RegimeAdaptiveConfig;
  private rejectionLog: Array<{
    timestamp: Date;
    reason: string;
    regime: string;
    signalDetails: any;
    counterfactualOutcome?: number;
  }> = [];

  constructor(config: RegimeAdaptiveConfig = {
    onlineLearningEnabled: true,
    adaptiveThresholds: true,
    continuousRecalibration: true,
    dynamicRiskManagement: true,
    portfolioOptimization: true
  }) {
    this.regimeDetector = new RegimeDetectionEngine();
    this.config = config;
    this.initializeAdaptiveThresholds();
    this.initializeOnlineLearningStates();
  }

  // ==================== REGIME-ADAPTIVE SIGNAL PROCESSING ====================

  async processSignalWithRegimeAdaptation(
    signal: any,
    candles: CandleData[],
    currentPrice: number,
    portfolioState: any
  ): Promise<{
    decision: 'accept' | 'reject';
    adaptedSignal?: any;
    edge: EdgeMetrics;
    reason: string;
    regime: MarketRegime;
  }> {
    // Detect current market regime
    const regime = await this.regimeDetector.detectCurrentRegime(
      candles,
      candles.map(c => c.volume),
      [], // technical indicators
      [] // news
    );

    // Calculate comprehensive edge metrics
    const edge = await this.calculateEnhancedEdge(signal, currentPrice, regime, portfolioState);

    // Get regime-specific threshold
    const threshold = this.getAdaptiveThreshold(regime.type);

    // Apply portfolio-level optimization
    const portfolioDecision = this.shouldAcceptForPortfolio(signal, portfolioState, edge);

    // Make final decision
    let decision: 'accept' | 'reject' = 'reject';
    let reason = 'Insufficient edge';

    if (edge.netEdge >= threshold.threshold && portfolioDecision.accept) {
      decision = 'accept';
      reason = `Regime-adapted acceptance: Edge ${edge.netEdge.toFixed(3)} >= ${threshold.threshold.toFixed(3)}`;
    } else if (edge.netEdge < threshold.threshold) {
      reason = `Below adaptive threshold: ${edge.netEdge.toFixed(3)} < ${threshold.threshold.toFixed(3)}`;
    } else if (!portfolioDecision.accept) {
      reason = `Portfolio optimization rejected: ${portfolioDecision.reason}`;
    }

    // Log rejection for continuous learning
    if (decision === 'reject') {
      this.logRejection(regime.type, signal, reason);
    }

    // Adapt signal parameters based on regime
    const adaptedSignal = decision === 'accept' ? 
      this.adaptSignalToRegime(signal, regime, edge) : undefined;

    // Update online learning if enabled
    if (this.config.onlineLearningEnabled) {
      this.updateOnlineLearning(regime.type, signal, decision, edge);
    }

    return {
      decision,
      adaptedSignal,
      edge,
      reason,
      regime
    };
  }

  // ==================== ENHANCED EDGE CALCULATION ====================

  private async calculateEnhancedEdge(
    signal: any,
    currentPrice: number,
    regime: MarketRegime,
    portfolioState: any
  ): Promise<EdgeMetrics> {
    const p = signal.confidence || 0.5; // Probability of success
    const R = signal.riskRewardRatio || 2.0; // Reward ratio
    const L = 1.0; // Loss ratio (normalized)

    // Calculate cost components
    const spreadCost = this.estimateSpreadCost(currentPrice, regime);
    const slippageCost = this.estimateSlippage(signal.entry, regime);
    const marketImpactCost = this.estimateMarketImpact(signal, portfolioState, regime);

    // Execution Quality Factor (EQF) - regime-dependent
    const eqf = this.calculateExecutionQualityFactor(regime, signal);

    // Opportunity Cost Factor (OCF)
    const ocf = this.calculateOpportunityCostFactor(portfolioState, regime);

    // Base edge calculation
    const baseEdge = (p * R) - ((1 - p) * L);
    const totalCosts = spreadCost + slippageCost + marketImpactCost;
    
    // Enhanced edge formula
    const expectedEdge = (baseEdge - totalCosts) * eqf - ocf;

    // Monte Carlo simulation for confidence interval
    const confidenceInterval = this.calculateEdgeConfidenceInterval(p, R, L, totalCosts, eqf, ocf);

    return {
      expectedEdge: baseEdge,
      executionQualityFactor: eqf,
      opportunityCostFactor: ocf,
      spreadCost,
      slippageCost,
      marketImpactCost,
      netEdge: expectedEdge,
      confidenceInterval
    };
  }

  private calculateExecutionQualityFactor(regime: MarketRegime, signal: any): number {
    let eqf = 1.0;

    // Adjust based on regime characteristics
    if (regime.type.includes('shock')) {
      eqf *= 0.7; // Reduce EQF during shock events
    } else if (regime.type.includes('trending')) {
      eqf *= 1.1; // Boost EQF during trends
    } else if (regime.type.includes('ranging')) {
      eqf *= 0.9; // Slightly reduce for ranging markets
    }

    // Adjust for volatility
    if (regime.volatility > 0.8) {
      eqf *= 0.8; // High volatility reduces execution quality
    } else if (regime.volatility < 0.3) {
      eqf *= 1.05; // Low volatility improves execution
    }

    // Adjust for liquidity conditions
    if (regime.microstructure.marketDepth < 0.5) {
      eqf *= 0.75; // Poor liquidity reduces execution quality
    }

    // Time of day adjustments
    const now = new Date();
    const hour = now.getUTCHours();
    if (hour >= 7 && hour <= 16) { // London/NY overlap
      eqf *= 1.1;
    } else if (hour >= 22 || hour <= 6) { // Asian session
      eqf *= 0.9;
    }

    return Math.max(0.3, Math.min(1.5, eqf));
  }

  private calculateOpportunityCostFactor(portfolioState: any, regime: MarketRegime): number {
    let ocf = 0.0;

    // Base opportunity cost from capital allocation
    const utilizationRate = portfolioState.allocatedCapital / portfolioState.totalCapital;
    ocf += utilizationRate * 0.001; // 0.1% per full utilization

    // Regime-specific opportunity costs
    if (regime.type.includes('shock') || regime.type === 'liquidity_crisis') {
      ocf += 0.002; // Higher opportunity cost during crises
    }

    // Time-based opportunity cost
    const expectedHoldingTime = this.estimateHoldingTime(regime);
    ocf += (expectedHoldingTime / 24) * 0.0001; // Daily opportunity cost

    return Math.max(0, Math.min(0.01, ocf));
  }

  // ==================== ADAPTIVE THRESHOLD MANAGEMENT ====================

  private getAdaptiveThreshold(regimeType: string): AdaptiveThreshold {
    let threshold = this.adaptiveThresholds.get(regimeType);
    
    if (!threshold) {
      // Initialize new threshold for unseen regime
      threshold = {
        regime: regimeType,
        threshold: this.getDefaultThreshold(regimeType),
        confidence: 0.5,
        lastUpdate: new Date(),
        performance: {
          accuracy: 0.5,
          profitability: 0.0,
          sharpe: 0.0,
          drawdown: 0.0
        }
      };
      this.adaptiveThresholds.set(regimeType, threshold);
    }

    // Update threshold based on recent performance if enabled
    if (this.config.adaptiveThresholds && this.shouldUpdateThreshold(threshold)) {
      this.updateAdaptiveThreshold(threshold);
    }

    return threshold;
  }

  private updateAdaptiveThreshold(threshold: AdaptiveThreshold): void {
    const learningState = this.onlineLearningStates.get(threshold.regime);
    if (!learningState || learningState.totalTrades < 10) return;

    // Gradient-based threshold adjustment
    const performanceGradient = this.calculatePerformanceGradient(learningState);
    const adjustmentFactor = Math.tanh(performanceGradient) * 0.1; // Bounded adjustment

    // Update threshold with momentum
    const momentum = 0.9;
    const learningRate = 0.1;
    const newThreshold = threshold.threshold * momentum + 
                        (threshold.threshold + adjustmentFactor) * learningRate;

    threshold.threshold = Math.max(0.001, Math.min(0.2, newThreshold));
    threshold.confidence = Math.min(1.0, threshold.confidence + 0.05);
    threshold.lastUpdate = new Date();

    console.log(`Updated ${threshold.regime} threshold: ${threshold.threshold.toFixed(4)} (gradient: ${performanceGradient.toFixed(4)})`);
  }

  private calculatePerformanceGradient(learningState: OnlineLearningState): number {
    // Multi-objective gradient considering Sharpe, win rate, and drawdown
    const sharpeGradient = (learningState.avgReturn / Math.max(0.001, learningState.volatility)) - 1.0;
    const winRateGradient = learningState.winRate - 0.55; // Target 55% win rate
    const drawdownPenalty = -Math.max(0, learningState.totalTrades > 20 ? 0.1 : 0); // Drawdown penalty

    return (sharpeGradient * 0.5) + (winRateGradient * 0.3) + (drawdownPenalty * 0.2);
  }

  // ==================== PORTFOLIO-LEVEL OPTIMIZATION ====================

  private shouldAcceptForPortfolio(
    signal: any,
    portfolioState: any,
    edge: EdgeMetrics
  ): { accept: boolean; reason: string } {
    if (!this.config.portfolioOptimization) {
      return { accept: true, reason: 'Portfolio optimization disabled' };
    }

    // Check correlation with existing positions
    const correlationScore = this.calculatePortfolioCorrelation(signal, portfolioState);
    if (correlationScore > 0.7) {
      return { accept: false, reason: `High correlation with existing positions: ${correlationScore.toFixed(2)}` };
    }

    // Check if signal improves portfolio metrics
    const portfolioImprovement = this.simulatePortfolioImpact(signal, portfolioState, edge);
    if (portfolioImprovement.sharpeImprovement < -0.05) {
      return { accept: false, reason: `Negative Sharpe impact: ${portfolioImprovement.sharpeImprovement.toFixed(3)}` };
    }

    // Check risk concentration
    const riskConcentration = this.calculateRiskConcentration(signal, portfolioState);
    if (riskConcentration > 0.3) {
      return { accept: false, reason: `Risk concentration too high: ${riskConcentration.toFixed(2)}` };
    }

    return { accept: true, reason: 'Portfolio optimization passed' };
  }

  private calculatePortfolioCorrelation(signal: any, portfolioState: any): number {
    // Simplified correlation calculation
    // In practice, this would use historical correlation matrix
    let maxCorrelation = 0;
    
    for (const position of portfolioState.openPositions || []) {
      if (position.symbol === signal.pair) {
        if (position.side === signal.signal) {
          maxCorrelation = Math.max(maxCorrelation, 0.9); // Same direction, same pair
        } else {
          maxCorrelation = Math.max(maxCorrelation, -0.9); // Opposite direction, same pair
        }
      }
    }

    return Math.abs(maxCorrelation);
  }

  private simulatePortfolioImpact(signal: any, portfolioState: any, edge: EdgeMetrics) {
    // Monte Carlo simulation of portfolio impact
    const currentSharpe = portfolioState.sharpeRatio || 0;
    const signalSharpe = edge.netEdge / Math.max(0.01, edge.expectedEdge * 0.1); // Rough Sharpe estimate
    
    // Weighted impact based on position size
    const positionWeight = 0.05; // Assume 5% position size
    const newSharpe = currentSharpe * (1 - positionWeight) + signalSharpe * positionWeight;
    
    return {
      sharpeImprovement: newSharpe - currentSharpe,
      expectedReturn: edge.netEdge * positionWeight,
      riskContribution: positionWeight * Math.abs(edge.netEdge)
    };
  }

  private calculateRiskConcentration(signal: any, portfolioState: any): number {
    // Calculate how much additional risk this trade would add
    const totalRisk = portfolioState.totalRisk || 1.0;
    const signalRisk = Math.abs(signal.entry - signal.stopLoss) / signal.entry;
    
    return signalRisk / totalRisk;
  }

  // ==================== REJECTION FEEDBACK LOOP ====================

  private logRejection(regime: string, signal: any, reason: string): void {
    this.rejectionLog.push({
      timestamp: new Date(),
      reason,
      regime,
      signalDetails: {
        pair: signal.pair,
        signal: signal.signal,
        confidence: signal.confidence,
        entry: signal.entry,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit
      }
    });

    // Keep only last 1000 rejections
    if (this.rejectionLog.length > 1000) {
      this.rejectionLog.shift();
    }

    // Periodically analyze rejection patterns
    if (this.rejectionLog.length % 50 === 0) {
      this.analyzeRejectionPatterns();
    }
  }

  private analyzeRejectionPatterns(): void {
    const recentRejections = this.rejectionLog.slice(-100);
    const regimeRejections = new Map<string, number>();
    const reasonCounts = new Map<string, number>();

    for (const rejection of recentRejections) {
      regimeRejections.set(
        rejection.regime,
        (regimeRejections.get(rejection.regime) || 0) + 1
      );
      reasonCounts.set(
        rejection.reason,
        (reasonCounts.get(rejection.reason) || 0) + 1
      );
    }

    // Log insights
    console.log('🔍 Rejection Pattern Analysis:', {
      regimeRejections: Object.fromEntries(regimeRejections),
      topReasons: Array.from(reasonCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    });

    // Auto-adjust thresholds for over-rejecting regimes
    for (const [regime, count] of regimeRejections) {
      if (count > 20) { // Too many rejections
        const threshold = this.adaptiveThresholds.get(regime);
        if (threshold) {
          threshold.threshold *= 0.95; // Slightly lower threshold
          console.log(`🔧 Auto-adjusted ${regime} threshold to ${threshold.threshold.toFixed(4)} due to over-rejection`);
        }
      }
    }
  }

  // ==================== ONLINE LEARNING & CONTINUOUS CALIBRATION ====================

  private updateOnlineLearning(
    regime: string,
    signal: any,
    decision: 'accept' | 'reject',
    edge: EdgeMetrics
  ): void {
    let state = this.onlineLearningStates.get(regime);
    
    if (!state) {
      state = this.createNewLearningState(regime);
      this.onlineLearningStates.set(regime, state);
    }

    if (decision === 'accept') {
      state.totalTrades++;
      // Note: Actual outcomes would be updated when trades close
    }

    // Rolling recalibration every 20 trades or weekly
    const shouldRecalibrate = 
      state.totalTrades % 20 === 0 || 
      (Date.now() - state.lastCalibration.getTime()) > 7 * 24 * 60 * 60 * 1000;

    if (shouldRecalibrate && this.config.continuousRecalibration) {
      this.performRollingRecalibration(regime, state);
    }
  }

  private performRollingRecalibration(regime: string, state: OnlineLearningState): void {
    // Isotonic regression for probability calibration
    const calibratedWeights = this.isotonicallyCalibrate(state.featureWeights);
    
    // Update feature weights with exponential decay
    const decay = 0.95;
    for (const [feature, weight] of Object.entries(calibratedWeights)) {
      state.featureWeights[feature] = 
        (state.featureWeights[feature] || 1.0) * decay + weight * (1 - decay);
    }

    state.lastCalibration = new Date();
    
    console.log(`📊 Recalibrated ${regime} model: ${Object.keys(calibratedWeights).length} features updated`);
  }

  private isotonicallyCalibrate(weights: Record<string, number>): Record<string, number> {
    // Simplified isotonic regression implementation
    // In practice, this would use proper isotonic regression algorithms
    const calibrated: Record<string, number> = {};
    
    for (const [feature, weight] of Object.entries(weights)) {
      // Apply monotonic constraint and smooth adjustments
      calibrated[feature] = Math.max(0.1, Math.min(2.0, weight * 1.02));
    }
    
    return calibrated;
  }

  // ==================== UTILITY METHODS ====================

  private initializeAdaptiveThresholds(): void {
    const regimeTypes = [
      'trending_bullish', 'trending_bearish', 'ranging_tight', 'ranging_volatile',
      'shock_up', 'shock_down', 'liquidity_crisis', 'news_driven', 'breakout', 'consolidation'
    ];

    for (const regime of regimeTypes) {
      this.adaptiveThresholds.set(regime, {
        regime,
        threshold: this.getDefaultThreshold(regime),
        confidence: 0.5,
        lastUpdate: new Date(),
        performance: {
          accuracy: 0.5,
          profitability: 0.0,
          sharpe: 0.0,
          drawdown: 0.0
        }
      });
    }
  }

  private initializeOnlineLearningStates(): void {
    const regimeTypes = [
      'trending_bullish', 'trending_bearish', 'ranging_tight', 'ranging_volatile',
      'shock_up', 'shock_down', 'liquidity_crisis', 'news_driven', 'breakout', 'consolidation'
    ];

    for (const regime of regimeTypes) {
      this.onlineLearningStates.set(regime, this.createNewLearningState(regime));
    }
  }

  private createNewLearningState(regime: string): OnlineLearningState {
    return {
      regime,
      totalTrades: 0,
      winRate: 0.5,
      avgReturn: 0.0,
      volatility: 0.05,
      lastCalibration: new Date(),
      featureWeights: {
        technical: 1.0,
        pattern: 1.0,
        volume: 1.0,
        momentum: 1.0,
        news: 1.0,
        harmonic: 1.0,
        fibonacci: 1.0,
        timeframe: 1.0
      },
      modelPerformance: {
        precision: 0.5,
        recall: 0.5,
        f1Score: 0.5,
        crossValidationScore: 0.5
      }
    };
  }

  private getDefaultThreshold(regimeType: string): number {
    const thresholds: Record<string, number> = {
      'trending_bullish': 0.015,
      'trending_bearish': 0.015,
      'ranging_tight': 0.008,
      'ranging_volatile': 0.012,
      'shock_up': 0.025,
      'shock_down': 0.025,
      'liquidity_crisis': 0.030,
      'news_driven': 0.020,
      'breakout': 0.018,
      'consolidation': 0.006
    };
    
    return thresholds[regimeType] || 0.010;
  }

  private shouldUpdateThreshold(threshold: AdaptiveThreshold): boolean {
    const hoursSinceUpdate = (Date.now() - threshold.lastUpdate.getTime()) / (1000 * 60 * 60);
    return hoursSinceUpdate >= 6; // Update every 6 hours minimum
  }

  private adaptSignalToRegime(signal: any, regime: MarketRegime, edge: EdgeMetrics): any {
    const adapted = { ...signal };

    // Adjust position sizing based on regime risk
    adapted.positionSize = (adapted.positionSize || 1.0) * regime.riskMultiplier;

    // Adjust stop loss and take profit based on regime volatility
    const volatilityAdjustment = 1 + (regime.volatility - 0.5) * 0.5;
    const currentPrice = adapted.entry;
    
    if (adapted.stopLoss) {
      const slDistance = Math.abs(currentPrice - adapted.stopLoss);
      adapted.stopLoss = signal.signal === 'buy' 
        ? currentPrice - (slDistance * volatilityAdjustment)
        : currentPrice + (slDistance * volatilityAdjustment);
    }

    if (adapted.takeProfit) {
      const tpDistance = Math.abs(adapted.takeProfit - currentPrice);
      adapted.takeProfit = signal.signal === 'buy'
        ? currentPrice + (tpDistance * volatilityAdjustment)
        : currentPrice - (tpDistance * volatilityAdjustment);
    }

    // Add regime-specific metadata
    adapted.regimeAdaptation = {
      regime: regime.type,
      riskMultiplier: regime.riskMultiplier,
      volatilityAdjustment,
      edge: edge.netEdge,
      executionQuality: edge.executionQualityFactor
    };

    return adapted;
  }

  // ==================== COST ESTIMATION METHODS ====================

  private estimateSpreadCost(currentPrice: number, regime: MarketRegime): number {
    let baseSpreads: Record<string, number> = {
      'EUR/USD': 0.00001,
      'GBP/USD': 0.00002,
      'USD/JPY': 0.001,
      'AUD/USD': 0.00002
    };

    let baseSpread = baseSpreads['EUR/USD']; // Default
    
    // Adjust for regime conditions
    if (regime.type.includes('shock') || regime.type === 'liquidity_crisis') {
      baseSpread *= 3; // Spreads widen during stress
    } else if (regime.type.includes('ranging')) {
      baseSpread *= 0.8; // Tighter spreads in calm markets
    }

    // Adjust for time of day
    const hour = new Date().getUTCHours();
    if (hour >= 22 || hour <= 6) { // Asian session
      baseSpread *= 1.5;
    }

    return baseSpread / currentPrice; // Return as percentage
  }

  private estimateSlippage(entryPrice: number, regime: MarketRegime): number {
    let baseSlippage = 0.0001; // 1 pip base slippage

    // Regime adjustments
    if (regime.type.includes('shock')) {
      baseSlippage *= 4;
    } else if (regime.microstructure.marketDepth < 0.5) {
      baseSlippage *= 2;
    }

    return baseSlippage / entryPrice;
  }

  private estimateMarketImpact(signal: any, portfolioState: any, regime: MarketRegime): number {
    const positionSize = signal.positionSize || 0.01; // Default position size
    const marketDepth = regime.microstructure.marketDepth;
    
    // Impact increases with position size and decreases with market depth
    const impact = Math.pow(positionSize / marketDepth, 0.6) * 0.0001;
    
    return Math.min(0.001, impact); // Cap at 10 basis points
  }

  private estimateHoldingTime(regime: MarketRegime): number {
    // Estimate holding time in hours based on regime
    const baseTimes: Record<string, number> = {
      'trending_bullish': 48,
      'trending_bearish': 48,
      'ranging_tight': 12,
      'ranging_volatile': 8,
      'shock_up': 2,
      'shock_down': 2,
      'liquidity_crisis': 6,
      'news_driven': 4,
      'breakout': 24,
      'consolidation': 72
    };

    return baseTimes[regime.type] || 24;
  }

  private calculateEdgeConfidenceInterval(
    p: number, R: number, L: number, costs: number, eqf: number, ocf: number
  ): [number, number] {
    // Monte Carlo simulation for confidence interval
    const simulations = 1000;
    const results: number[] = [];
    
    for (let i = 0; i < simulations; i++) {
      // Add random noise to parameters
      const pSim = Math.max(0.1, Math.min(0.9, p + (Math.random() - 0.5) * 0.1));
      const RSim = Math.max(0.5, R + (Math.random() - 0.5) * 0.5);
      const costsSim = costs * (1 + (Math.random() - 0.5) * 0.2);
      
      const edgeSim = ((pSim * RSim) - ((1 - pSim) * L) - costsSim) * eqf - ocf;
      results.push(edgeSim);
    }
    
    results.sort((a, b) => a - b);
    const lowerBound = results[Math.floor(simulations * 0.05)]; // 5th percentile
    const upperBound = results[Math.floor(simulations * 0.95)]; // 95th percentile
    
    return [lowerBound, upperBound];
  }

  // ==================== PUBLIC API ====================

  public getAdaptiveThresholds(): Map<string, AdaptiveThreshold> {
    return new Map(this.adaptiveThresholds);
  }

  public getOnlineLearningStates(): Map<string, OnlineLearningState> {
    return new Map(this.onlineLearningStates);
  }

  public getRejectionLog(): Array<any> {
    return [...this.rejectionLog];
  }

  public forceThresholdUpdate(regime: string): void {
    const threshold = this.adaptiveThresholds.get(regime);
    if (threshold) {
      this.updateAdaptiveThreshold(threshold);
    }
  }
}
