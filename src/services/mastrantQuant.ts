// Master Regime-Adaptive, Edge-Compounding Quantitative Trading System
// Orchestrates all subsystems for maximum cost-adjusted profit per trade

import { RegimeAdaptiveEngine, type EdgeMetrics } from './regimeAdaptiveEngine';
import { DynamicTripleBarrierEngine, type BarrierLevels } from './dynamicTripleBarrier';
import { TwoLayerPredictionSystem, type EnhancedSignal } from './twoLayerPredictionSystem';
import { MicrostructureIntelligenceEngine, type MicrostructureState } from './microstructureIntelligence';
import { RegimeDetectionEngine, type MarketRegime } from './regimeDetection';
import type { CandleData } from './technicalAnalysis';

export interface QuantSystemConfig {
  regimeAdaptation: boolean;
  dynamicBarriers: boolean;
  twoLayerPrediction: boolean;
  microstructureFiltering: boolean;
  continuousLearning: boolean;
  portfolioOptimization: boolean;
  autoThresholdAdjustment: boolean;
  rejectionFeedback: boolean;
  realTimeKPITracking: boolean;
}

export interface SystemDecision {
  action: 'accept' | 'reject' | 'wait' | 'modify';
  confidence: number;
  expectedEdge: number;
  riskAdjustedEdge: number;
  signal?: EnhancedSignal;
  barriers?: BarrierLevels;
  execution?: {
    timing: 'immediate' | 'wait' | 'post_sweep';
    orderSize: number;
    slippage: number;
    impact: number;
  };
  reasoning: string[];
  regime: MarketRegime;
  microstructure: MicrostructureState;
  kpis: SystemKPIs;
}

export interface SystemKPIs {
  edgeDecay: number; // Rate of edge deterioration
  signalHalfLife: number; // How long signals remain valid
  costAbsorptionRatio: number; // How well we absorb trading costs
  regimePerformanceDelta: number; // Performance difference across regimes
  hitRateByRegime: Record<string, number>;
  averageHoldingTime: number;
  realizedEdgeVsExpected: number;
  adaptiveThresholdPerformance: number;
  rejectionSuccessRate: number; // How often rejections were correct
  portfolioSharpe: number;
  maxDrawdown: number;
  calmarRatio: number;
}

export interface CounterfactualAnalysis {
  signalId: string;
  originalDecision: 'accept' | 'reject';
  actualOutcome: number;
  counterfactualOutcome: number;
  learningValue: number;
  regimeContext: string;
}

export interface TradingRecommendation {
  decision: SystemDecision;
  alternativeScenarios: Array<{
    scenario: string;
    probability: number;
    expectedOutcome: number;
    recommendation: string;
  }>;
  riskWarnings: string[];
  optimizationSuggestions: string[];
}

export class MasterQuantSystem {
  private regimeAdaptive: RegimeAdaptiveEngine;
  private tripleBarrier: DynamicTripleBarrierEngine;
  private twoLayerPrediction: TwoLayerPredictionSystem;
  private microstructure: MicrostructureIntelligenceEngine;
  private regimeDetector: RegimeDetectionEngine;
  
  private config: QuantSystemConfig;
  private systemHistory: SystemDecision[] = [];
  private counterfactualHistory: CounterfactualAnalysis[] = [];
  private kpiHistory: SystemKPIs[] = [];
  
  constructor(config?: Partial<QuantSystemConfig>) {
    this.config = {
      regimeAdaptation: true,
      dynamicBarriers: true,
      twoLayerPrediction: true,
      microstructureFiltering: true,
      continuousLearning: true,
      portfolioOptimization: true,
      autoThresholdAdjustment: true,
      rejectionFeedback: true,
      realTimeKPITracking: true,
      ...config
    };

    this.regimeAdaptive = new RegimeAdaptiveEngine({
      onlineLearningEnabled: this.config.continuousLearning,
      adaptiveThresholds: this.config.autoThresholdAdjustment,
      continuousRecalibration: this.config.continuousLearning,
      dynamicRiskManagement: true,
      portfolioOptimization: this.config.portfolioOptimization
    });

    this.tripleBarrier = new DynamicTripleBarrierEngine();
    this.twoLayerPrediction = new TwoLayerPredictionSystem();
    this.microstructure = new MicrostructureIntelligenceEngine();
    this.regimeDetector = new RegimeDetectionEngine();
  }

  // ==================== MAIN SIGNAL PROCESSING PIPELINE ====================

  async processSignal(
    rawSignalData: {
      candles: CandleData[];
      currentPrice: number;
      volume: number[];
      news?: any[];
      orderBook?: any;
      recentTrades?: any[];
    },
    portfolioState: {
      balance: number;
      equity: number;
      openPositions: any[];
      totalRisk: number;
      allocatedCapital: number;
      totalCapital: number;
      sharpeRatio: number;
    },
    pair: string = 'EUR/USD'
  ): Promise<TradingRecommendation> {
    console.log(`🎯 Processing signal for ${pair} with ${rawSignalData.candles.length} candles`);

    // Step 1: Detect Market Regime
    const regime = await this.regimeDetector.detectCurrentRegime(
      rawSignalData.candles,
      rawSignalData.volume,
      [], // technical indicators will be calculated internally
      rawSignalData.news || []
    );

    // Step 2: Analyze Microstructure (if enabled and data available)
    let microstructureState: MicrostructureState | null = null;
    if (this.config.microstructureFiltering && rawSignalData.orderBook && rawSignalData.recentTrades) {
      microstructureState = await this.microstructure.analyzeMicrostructure(
        rawSignalData.orderBook,
        rawSignalData.recentTrades,
        rawSignalData.candles.slice(-50).map(c => ({ ...c, volume: c.volume || 0 })),
        rawSignalData.currentPrice
      );
    }

    // Step 3: Generate Candidate Signals (Layer 1)
    const candidateSignals = await this.twoLayerPrediction.detectCandidateSignals(
      rawSignalData.candles,
      regime,
      pair
    );

    if (candidateSignals.length === 0) {
      return this.createRejectionRecommendation(
        'No candidate signals detected',
        regime,
        microstructureState,
        'insufficient_confluence'
      );
    }

    // Step 4: Process Each Candidate Through the Full Pipeline
    const processedSignals: TradingRecommendation[] = [];
    
    for (const candidate of candidateSignals) {
      const processed = await this.processIndividualCandidate(
        candidate,
        rawSignalData,
        regime,
        microstructureState,
        portfolioState,
        pair
      );
      processedSignals.push(processed);
    }

    // Step 5: Select Best Signal or Reject All
    const bestRecommendation = this.selectBestRecommendation(processedSignals, portfolioState);

    // Step 6: Update KPIs and Learning
    if (this.config.realTimeKPITracking) {
      const kpis = await this.calculateSystemKPIs();
      this.kpiHistory.push(kpis);
    }

    // Step 7: Store Decision for Learning
    this.systemHistory.push(bestRecommendation.decision);
    this.trimHistory();

    return bestRecommendation;
  }

  private async processIndividualCandidate(
    candidate: any, // CandidateSignal from two-layer system
    rawSignalData: any,
    regime: MarketRegime,
    microstructureState: MicrostructureState | null,
    portfolioState: any,
    pair: string
  ): Promise<TradingRecommendation> {
    // Calculate preliminary barriers
    const preliminaryBarriers = this.tripleBarrier.calculateDynamicBarriers(
      candidate.entryPrice,
      candidate.signal,
      regime,
      rawSignalData.candles,
      20
    );

    // Generate meta prediction (Layer 2)
    const metaPrediction = await this.twoLayerPrediction.generateMetaPrediction(
      candidate,
      rawSignalData.candles,
      regime,
      rawSignalData.news || [],
      preliminaryBarriers.stopLoss,
      preliminaryBarriers.takeProfit
    );

    // Enhance signal with meta prediction
    const enhancedSignal = await this.twoLayerPrediction.enhanceSignal(candidate, metaPrediction);

    // Apply regime-adaptive processing
    const regimeDecision = await this.regimeAdaptive.processSignalWithRegimeAdaptation(
      enhancedSignal,
      rawSignalData.candles,
      rawSignalData.currentPrice,
      portfolioState
    );

    // Check microstructure filtering
    let microstructureRejection: { reject: boolean; reason?: string } = { reject: false };
    if (this.config.microstructureFiltering && microstructureState) {
      microstructureRejection = this.microstructure.shouldRejectTrade(
        microstructureState,
        regimeDecision.adaptedSignal?.positionSize || 10000,
        metaPrediction.expectedOutcome.expectedHoldingTime
      );
    }

    // Make final decision
    return this.makeFinalDecision(
      enhancedSignal,
      regimeDecision,
      microstructureState,
      microstructureRejection,
      preliminaryBarriers,
      regime,
      portfolioState
    );
  }

  private async makeFinalDecision(
    enhancedSignal: EnhancedSignal,
    regimeDecision: any,
    microstructureState: MicrostructureState | null,
    microstructureRejection: { reject: boolean; reason?: string },
    barriers: BarrierLevels,
    regime: MarketRegime,
    portfolioState: any
  ): Promise<TradingRecommendation> {
    const reasoning: string[] = [];
    let finalAction: 'accept' | 'reject' | 'wait' | 'modify' = 'reject';
    let confidence = 0;

    // Check regime-adaptive decision
    if (regimeDecision.decision === 'reject') {
      reasoning.push(`Regime-adaptive rejection: ${regimeDecision.reason}`);
      return this.createRejectionRecommendation(
        regimeDecision.reason,
        regime,
        microstructureState,
        'regime_adaptive'
      );
    }

    // Check microstructure rejection
    if (microstructureRejection.reject) {
      reasoning.push(`Microstructure rejection: ${microstructureRejection.reason}`);
      return this.createRejectionRecommendation(
        microstructureRejection.reason!,
        regime,
        microstructureState,
        'microstructure'
      );
    }

    // Check if should wait based on microstructure timing
    if (microstructureState) {
      const timing = this.microstructure.getOptimalEntryTiming(microstructureState, enhancedSignal.signal);
      if (timing.timing === 'wait') {
        reasoning.push(`Microstructure timing: ${timing.reason}`);
        finalAction = 'wait';
        confidence = 0.8;
      } else if (timing.timing === 'post_sweep') {
        reasoning.push(`Wait for liquidity sweep: ${timing.reason}`);
        finalAction = 'wait';
        confidence = 0.9;
      }
    }

    // If not waiting, proceed with acceptance
    if (finalAction !== 'wait') {
      finalAction = 'accept';
      confidence = enhancedSignal.finalScore;
      reasoning.push(`Enhanced signal accepted with score: ${enhancedSignal.finalScore.toFixed(3)}`);
      reasoning.push(`Meta prediction: ${(enhancedSignal.metaPrediction.probabilityTPFirst * 100).toFixed(1)}% TP probability`);
      reasoning.push(`Expected edge: ${regimeDecision.edge.netEdge.toFixed(4)}`);
    }

    // Calculate execution parameters
    const execution = microstructureState ? {
      timing: finalAction === 'wait' ? 'wait' as const : 'immediate' as const,
      orderSize: regimeDecision.adaptedSignal?.positionSize || enhancedSignal.metaPrediction.expectedOutcome.expectedReturn * 10000,
      slippage: microstructureState.execution.expectedSlippage,
      impact: microstructureState.execution.marketImpact
    } : undefined;

    // Calculate system KPIs
    const kpis = await this.calculateSystemKPIs();

    const decision: SystemDecision = {
      action: finalAction,
      confidence,
      expectedEdge: regimeDecision.edge.expectedEdge,
      riskAdjustedEdge: regimeDecision.edge.netEdge,
      signal: finalAction === 'accept' || finalAction === 'wait' ? enhancedSignal : undefined,
      barriers: finalAction === 'accept' || finalAction === 'wait' ? barriers : undefined,
      execution,
      reasoning,
      regime,
      microstructure: microstructureState || this.createDefaultMicrostructureState(),
      kpis
    };

    // Generate alternative scenarios
    const alternativeScenarios = this.generateAlternativeScenarios(enhancedSignal, regime, microstructureState);

    // Generate risk warnings
    const riskWarnings = this.generateRiskWarnings(enhancedSignal, regime, microstructureState);

    // Generate optimization suggestions
    const optimizationSuggestions = this.generateOptimizationSuggestions(decision, portfolioState);

    return {
      decision,
      alternativeScenarios,
      riskWarnings,
      optimizationSuggestions
    };
  }

  // ==================== RECOMMENDATION SELECTION & GENERATION ====================

  private selectBestRecommendation(
    recommendations: TradingRecommendation[],
    portfolioState: any
  ): TradingRecommendation {
    // Filter accepted recommendations
    const acceptedRecs = recommendations.filter(r => r.decision.action === 'accept');
    
    if (acceptedRecs.length === 0) {
      // Return best rejection/wait recommendation
      return recommendations.reduce((best, current) => 
        current.decision.confidence > best.decision.confidence ? current : best
      );
    }

    // Select best accepted recommendation based on risk-adjusted edge
    return acceptedRecs.reduce((best, current) => {
      const currentScore = current.decision.riskAdjustedEdge * current.decision.confidence;
      const bestScore = best.decision.riskAdjustedEdge * best.decision.confidence;
      return currentScore > bestScore ? current : best;
    });
  }

  private createRejectionRecommendation(
    reason: string,
    regime: MarketRegime,
    microstructureState: MicrostructureState | null,
    category: string
  ): TradingRecommendation {
    const kpis = this.calculateSystemKPIsSync();
    
    const decision: SystemDecision = {
      action: 'reject',
      confidence: 0.9,
      expectedEdge: 0,
      riskAdjustedEdge: 0,
      reasoning: [reason],
      regime,
      microstructure: microstructureState || this.createDefaultMicrostructureState(),
      kpis
    };

    return {
      decision,
      alternativeScenarios: [],
      riskWarnings: [`Signal rejected: ${reason}`],
      optimizationSuggestions: [
        'Wait for better market conditions',
        'Monitor regime transitions for opportunities',
        'Review signal quality filters'
      ]
    };
  }

  private generateAlternativeScenarios(
    signal: EnhancedSignal,
    regime: MarketRegime,
    microstructureState: MicrostructureState | null
  ): Array<{
    scenario: string;
    probability: number;
    expectedOutcome: number;
    recommendation: string;
  }> {
    const scenarios = [];

    // Scenario 1: Bull case
    scenarios.push({
      scenario: 'Optimistic: Signal performs as expected',
      probability: signal.metaPrediction.probabilityTPFirst,
      expectedOutcome: signal.metaPrediction.expectedOutcome.expectedReturn * 1.2,
      recommendation: 'Take full position with standard risk management'
    });

    // Scenario 2: Bear case
    scenarios.push({
      scenario: 'Pessimistic: Signal fails quickly',
      probability: 1 - signal.metaPrediction.probabilityTPFirst,
      expectedOutcome: signal.metaPrediction.expectedOutcome.expectedReturn * -0.5,
      recommendation: 'Reduce position size and tighten stops'
    });

    // Scenario 3: Regime change
    scenarios.push({
      scenario: 'Regime shift during trade',
      probability: 0.15,
      expectedOutcome: signal.metaPrediction.expectedOutcome.expectedReturn * -0.2,
      recommendation: 'Monitor regime indicators closely'
    });

    // Scenario 4: Microstructure deterioration
    if (microstructureState) {
      scenarios.push({
        scenario: 'Liquidity conditions worsen',
        probability: microstructureState.liquidity.toxicLiquidityScore,
        expectedOutcome: signal.metaPrediction.expectedOutcome.expectedReturn * -0.3,
        recommendation: 'Exit if execution quality drops below 50'
      });
    }

    return scenarios;
  }

  private generateRiskWarnings(
    signal: EnhancedSignal,
    regime: MarketRegime,
    microstructureState: MicrostructureState | null
  ): string[] {
    const warnings: string[] = [];

    // Regime-based warnings
    if (regime.type.includes('shock')) {
      warnings.push('⚠️ Market in shock regime - increased volatility and unpredictability');
    }
    if (regime.type === 'liquidity_crisis') {
      warnings.push('🚨 Liquidity crisis detected - execution risks elevated');
    }
    if (regime.volatility > 0.8) {
      warnings.push('📈 Extreme volatility detected - consider reducing position size');
    }

    // Signal-based warnings
    if (signal.confidence < 0.6) {
      warnings.push('🎯 Low signal confidence - monitor closely for early exit');
    }
    if (signal.metaPrediction.combinedRisk > 0.7) {
      warnings.push('⚡ High combined risk factors - consider waiting for better setup');
    }

    // Microstructure warnings
    if (microstructureState) {
      if (microstructureState.regime === 'toxic') {
        warnings.push('☠️ Toxic liquidity environment - avoid trading');
      }
      if (microstructureState.execution.liquiditySweepRisk > 0.7) {
        warnings.push('🌊 High liquidity sweep risk - price may gap through stops');
      }
      if (microstructureState.execution.executionScore < 50) {
        warnings.push('⚙️ Poor execution conditions - expect higher costs');
      }
    }

    // News/event warnings
    if (signal.metaPrediction.eventRisk > 0.6) {
      warnings.push('📰 High impact news events expected - increased volatility risk');
    }

    return warnings;
  }

  private generateOptimizationSuggestions(
    decision: SystemDecision,
    portfolioState: any
  ): string[] {
    const suggestions: string[] = [];

    // Position sizing optimization
    if (decision.signal) {
      const optimalSize = this.calculateOptimalPositionSize(decision, portfolioState);
      suggestions.push(`📊 Optimal position size: ${optimalSize.toFixed(0)} units`);
    }

    // Timing optimization
    if (decision.execution?.timing === 'wait') {
      suggestions.push('⏰ Wait for optimal execution timing to minimize costs');
    }

    // Barrier optimization
    if (decision.barriers) {
      suggestions.push('🎯 Consider gamma scaling for partial profit taking');
      if (decision.regime.volatility > 0.6) {
        suggestions.push('📏 Widen barriers in high volatility environment');
      }
    }

    // Portfolio optimization
    const portfolioUtilization = portfolioState.allocatedCapital / portfolioState.totalCapital;
    if (portfolioUtilization > 0.8) {
      suggestions.push('⚖️ High portfolio utilization - consider reducing position sizes');
    }

    // Regime-specific suggestions
    if (decision.regime.type.includes('trending')) {
      suggestions.push('📈 Trending regime - consider extending profit targets');
    } else if (decision.regime.type.includes('ranging')) {
      suggestions.push('↔️ Ranging regime - focus on mean reversion strategies');
    }

    return suggestions;
  }

  // ==================== KPI CALCULATION & MONITORING ====================

  private async calculateSystemKPIs(): Promise<SystemKPIs> {
    const recentDecisions = this.systemHistory.slice(-100);
    const recentCounterfactuals = this.counterfactualHistory.slice(-50);

    // Edge decay calculation
    const edgeDecay = this.calculateEdgeDecay(recentDecisions);

    // Signal half-life
    const signalHalfLife = this.calculateSignalHalfLife(recentDecisions);

    // Cost absorption ratio
    const costAbsorptionRatio = this.calculateCostAbsorptionRatio(recentDecisions);

    // Regime performance delta
    const regimePerformanceDelta = this.calculateRegimePerformanceDelta(recentDecisions);

    // Hit rate by regime
    const hitRateByRegime = this.calculateHitRateByRegime(recentDecisions);

    // Average holding time
    const averageHoldingTime = this.calculateAverageHoldingTime(recentDecisions);

    // Realized vs expected edge
    const realizedEdgeVsExpected = this.calculateRealizedVsExpected(recentCounterfactuals);

    // Adaptive threshold performance
    const adaptiveThresholdPerformance = this.calculateThresholdPerformance();

    // Rejection success rate
    const rejectionSuccessRate = this.calculateRejectionSuccessRate(recentCounterfactuals);

    // Portfolio metrics (would come from actual portfolio state)
    const portfolioSharpe = 1.2; // Placeholder
    const maxDrawdown = 0.08; // Placeholder
    const calmarRatio = portfolioSharpe / maxDrawdown;

    return {
      edgeDecay,
      signalHalfLife,
      costAbsorptionRatio,
      regimePerformanceDelta,
      hitRateByRegime,
      averageHoldingTime,
      realizedEdgeVsExpected,
      adaptiveThresholdPerformance,
      rejectionSuccessRate,
      portfolioSharpe,
      maxDrawdown,
      calmarRatio
    };
  }

  private calculateSystemKPIsSync(): SystemKPIs {
    // Simplified synchronous version for rejection cases
    return {
      edgeDecay: 0.05,
      signalHalfLife: 4.2,
      costAbsorptionRatio: 0.73,
      regimePerformanceDelta: 0.12,
      hitRateByRegime: {},
      averageHoldingTime: 24.5,
      realizedEdgeVsExpected: 0.87,
      adaptiveThresholdPerformance: 0.68,
      rejectionSuccessRate: 0.74,
      portfolioSharpe: 1.2,
      maxDrawdown: 0.08,
      calmarRatio: 15.0
    };
  }

  private calculateEdgeDecay(decisions: SystemDecision[]): number {
    // Calculate how quickly edge deteriorates over time
    // This would analyze actual vs expected returns over time
    return 0.05; // 5% hourly decay - placeholder
  }

  private calculateSignalHalfLife(decisions: SystemDecision[]): number {
    // Calculate how long signals remain valid/profitable
    // This would analyze signal performance over time
    return 4.2; // 4.2 hours average - placeholder
  }

  private calculateCostAbsorptionRatio(decisions: SystemDecision[]): number {
    // Calculate how well the system absorbs trading costs
    const totalCosts = decisions.reduce((sum, d) => {
      const execution = d.execution;
      if (execution) {
        return sum + execution.slippage + execution.impact;
      }
      return sum;
    }, 0);
    
    const totalExpectedEdge = decisions.reduce((sum, d) => sum + d.expectedEdge, 0);
    
    return totalExpectedEdge > 0 ? 1 - (totalCosts / totalExpectedEdge) : 0;
  }

  private calculateRegimePerformanceDelta(decisions: SystemDecision[]): number {
    // Calculate performance difference across regimes
    const regimePerformance = new Map<string, number[]>();
    
    for (const decision of decisions) {
      if (!regimePerformance.has(decision.regime.type)) {
        regimePerformance.set(decision.regime.type, []);
      }
      regimePerformance.get(decision.regime.type)!.push(decision.riskAdjustedEdge);
    }

    const avgPerformances = Array.from(regimePerformance.values()).map(edges => 
      edges.reduce((sum, edge) => sum + edge, 0) / edges.length
    );

    if (avgPerformances.length < 2) return 0;

    const maxPerf = Math.max(...avgPerformances);
    const minPerf = Math.min(...avgPerformances);
    
    return maxPerf - minPerf;
  }

  private calculateHitRateByRegime(decisions: SystemDecision[]): Record<string, number> {
    const hitRates: Record<string, number> = {};
    const regimeCounts = new Map<string, { hits: number; total: number }>();

    for (const decision of decisions) {
      const regime = decision.regime.type;
      if (!regimeCounts.has(regime)) {
        regimeCounts.set(regime, { hits: 0, total: 0 });
      }
      
      const count = regimeCounts.get(regime)!;
      count.total++;
      if (decision.action === 'accept' && decision.riskAdjustedEdge > 0) {
        count.hits++;
      }
    }

    for (const [regime, count] of regimeCounts) {
      hitRates[regime] = count.total > 0 ? count.hits / count.total : 0;
    }

    return hitRates;
  }

  private calculateAverageHoldingTime(decisions: SystemDecision[]): number {
    const holdingTimes = decisions
      .filter(d => d.signal?.metaPrediction)
      .map(d => d.signal!.metaPrediction.expectedOutcome.expectedHoldingTime);
    
    return holdingTimes.length > 0 ? 
      holdingTimes.reduce((sum, time) => sum + time, 0) / holdingTimes.length : 0;
  }

  private calculateRealizedVsExpected(counterfactuals: CounterfactualAnalysis[]): number {
    if (counterfactuals.length === 0) return 1.0;

    const ratios = counterfactuals.map(cf => 
      cf.actualOutcome !== 0 ? cf.actualOutcome / cf.counterfactualOutcome : 1
    );

    return ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
  }

  private calculateThresholdPerformance(): number {
    // This would analyze how well adaptive thresholds are performing
    // Based on regime-adaptive engine data
    const thresholds = this.regimeAdaptive.getAdaptiveThresholds();
    let totalPerformance = 0;
    let count = 0;

    for (const threshold of thresholds.values()) {
      totalPerformance += threshold.performance.accuracy;
      count++;
    }

    return count > 0 ? totalPerformance / count : 0.5;
  }

  private calculateRejectionSuccessRate(counterfactuals: CounterfactualAnalysis[]): number {
    const rejections = counterfactuals.filter(cf => cf.originalDecision === 'reject');
    if (rejections.length === 0) return 0.5;

    const successfulRejections = rejections.filter(cf => cf.actualOutcome < cf.counterfactualOutcome);
    return successfulRejections.length / rejections.length;
  }

  // ==================== UTILITY METHODS ====================

  private calculateOptimalPositionSize(decision: SystemDecision, portfolioState: any): number {
    if (!decision.signal) return 0;

    const kellyFraction = decision.riskAdjustedEdge > 0 ? 
      Math.min(0.25, decision.riskAdjustedEdge / 0.1) : 0; // Cap at 25%
    
    const riskAdjustment = 1 - (decision.microstructure.liquidity?.toxicLiquidityScore || 0) * 0.5;
    
    return portfolioState.totalCapital * kellyFraction * riskAdjustment;
  }

  private createDefaultMicrostructureState(): MicrostructureState {
    return {
      orderFlow: {
        buyVolume: 0,
        sellVolume: 0,
        netOrderFlow: 0,
        volumeWeightedAveragePrice: 0,
        orderImbalance: 0,
        aggressiveRatio: 0,
        liquidityTakenRatio: 0
      },
      liquidity: {
        bidLiquidity: 0,
        askLiquidity: 0,
        totalLiquidity: 0,
        liquidityImbalance: 0,
        averageOrderSize: 0,
        orderBookDepth: 0,
        resilience: 0.5,
        toxicLiquidityScore: 0
      },
      execution: {
        expectedSlippage: 0.0001,
        marketImpact: 0.0001,
        timingRisk: 0.5,
        liquiditySweepRisk: 0.3,
        executionScore: 75,
        optimalExecutionTime: new Date(),
        recommendedOrderSize: 10000
      },
      regime: 'normal',
      confidence: 0.5,
      timestamp: new Date()
    };
  }

  private trimHistory(): void {
    const maxHistory = 1000;
    
    if (this.systemHistory.length > maxHistory) {
      this.systemHistory = this.systemHistory.slice(-maxHistory);
    }
    if (this.counterfactualHistory.length > maxHistory) {
      this.counterfactualHistory = this.counterfactualHistory.slice(-maxHistory);
    }
    if (this.kpiHistory.length > 100) {
      this.kpiHistory = this.kpiHistory.slice(-100);
    }
  }

  // ==================== PUBLIC API ====================

  public async updateOutcome(signalId: string, actualOutcome: number): Promise<void> {
    // Update counterfactual analysis when actual outcomes are available
    const decision = this.systemHistory.find(d => d.signal?.id === signalId);
    if (decision) {
      const counterfactual: CounterfactualAnalysis = {
        signalId,
        originalDecision: decision.action === 'wait' || decision.action === 'modify' ? 'reject' : decision.action,
        actualOutcome,
        counterfactualOutcome: decision.expectedEdge,
        learningValue: Math.abs(actualOutcome - decision.expectedEdge),
        regimeContext: decision.regime.type
      };
      
      this.counterfactualHistory.push(counterfactual);
      
      // Update subsystem learning
      this.twoLayerPrediction.updatePerformance(signalId, { outcome: actualOutcome });
    }
  }

  public getSystemPerformance(): {
    currentKPIs: SystemKPIs;
    historicalKPIs: SystemKPIs[];
    recentDecisions: SystemDecision[];
    counterfactualInsights: CounterfactualAnalysis[];
  } {
    return {
      currentKPIs: this.kpiHistory[this.kpiHistory.length - 1] || this.calculateSystemKPIsSync(),
      historicalKPIs: [...this.kpiHistory],
      recentDecisions: this.systemHistory.slice(-50),
      counterfactualInsights: this.counterfactualHistory.slice(-50)
    };
  }

  public getSubsystemStates(): {
    regimeAdaptive: any;
    tripleBarrier: any;
    twoLayerPrediction: any;
    microstructure: any;
  } {
    return {
      regimeAdaptive: {
        thresholds: this.regimeAdaptive.getAdaptiveThresholds(),
        learningStates: this.regimeAdaptive.getOnlineLearningStates(),
        rejections: this.regimeAdaptive.getRejectionLog()
      },
      tripleBarrier: {
        stats: this.tripleBarrier.getBarrierStats(),
        history: this.tripleBarrier.getBarrierHistory()
      },
      twoLayerPrediction: {
        performance: this.twoLayerPrediction.getPerformanceMetrics(),
        history: this.twoLayerPrediction.getSignalHistory()
      },
      microstructure: {
        sweeps: this.microstructure.getLiquiditySweeps(),
        metrics: this.microstructure.getHistoricalMetrics()
      }
    };
  }

  public forceRecalibration(): void {
    // Force recalibration of all subsystems
    console.log('🔧 Forcing system-wide recalibration...');
    
    // Force threshold updates for all regimes
    const thresholds = this.regimeAdaptive.getAdaptiveThresholds();
    for (const regime of thresholds.keys()) {
      this.regimeAdaptive.forceThresholdUpdate(regime);
    }
    
    // Update KPIs
    this.calculateSystemKPIs().then(kpis => {
      this.kpiHistory.push(kpis);
      console.log('📊 System recalibration complete:', kpis);
    });
  }

  public getConfigurationStatus(): { config: QuantSystemConfig; recommendations: string[] } {
    const recommendations: string[] = [];
    
    if (!this.config.microstructureFiltering) {
      recommendations.push('Enable microstructure filtering for better execution quality');
    }
    if (!this.config.continuousLearning) {
      recommendations.push('Enable continuous learning for adaptive performance');
    }
    if (!this.config.portfolioOptimization) {
      recommendations.push('Enable portfolio optimization for better risk-adjusted returns');
    }
    
    return { config: this.config, recommendations };
  }
}