// Advanced Mathematical Fusion Engine
// Implements Bayesian hierarchical fusion with correlation adjustment and historical weighting

import { StandardSignal, ModularAnalysisResult } from './modularSignalEngine';

export interface FusionConfig {
  correlationMatrix: CorrelationMatrix;
  historicalWeights: Map<string, ModulePerformance>;
  regimeAdjustments: Record<string, number>;
  entropyThreshold: number;
  minimumSignals: number;
  kellyFractionLimit: number;
}

export interface CorrelationMatrix {
  [moduleA: string]: {
    [moduleB: string]: number; // -1 to 1
  };
}

export interface ModulePerformance {
  totalSignals: number;
  winRate: number;
  averageReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  reliability: number; // 0-1
  informationRatio: number;
  lastUpdated: Date;
}

export interface MasterSignal {
  id: string;
  timestamp: Date;
  pair: string;
  timeframe: string;
  
  // Fusion Results
  signal: 'buy' | 'sell' | 'hold';
  fusedProbability: number; // Bayesian fused probability
  confidence: number; // 1 - entropy
  strength: number; // 1-10
  
  // Risk Management
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  kellyFraction: number;
  positionSize: number; // As percentage of capital
  
  // Attribution & Traceability
  contributingSignals: StandardSignal[];
  moduleContributions: Record<string, number>; // How much each module contributed
  fusionMetrics: FusionMetrics;
  
  // Quality Metrics
  signalQuality: number; // 0-1 overall quality score
  diversityIndex: number; // How diverse the contributing signals are
  consensusLevel: number; // Agreement between modules 0-1
  
  reasoning: string;
  warnings: string[];
}

export interface FusionMetrics {
  entropyValue: number; // Signal uncertainty
  informationGain: number; // Information content vs baseline
  correlationPenalty: number; // How much correlation reduced signal strength
  regimeAdjustment: number; // Current regime multiplier
  bayesianUpdateCount: number; // How many signals were fused
  confidenceInterval: [number, number]; // 95% CI for probability
}

export class AdvancedFusionEngine {
  private config: FusionConfig;
  private readonly defaultCorrelations: CorrelationMatrix = {
    technical: { fundamental: 0.1, sentiment: 0.2, multiTimeframe: 0.6, patterns: 0.7, strategies: 0.5 },
    fundamental: { technical: 0.1, sentiment: 0.4, multiTimeframe: 0.2, patterns: 0.1, strategies: 0.3 },
    sentiment: { technical: 0.2, fundamental: 0.4, multiTimeframe: 0.3, patterns: 0.2, strategies: 0.3 },
    multiTimeframe: { technical: 0.6, fundamental: 0.2, sentiment: 0.3, patterns: 0.4, strategies: 0.5 },
    patterns: { technical: 0.7, fundamental: 0.1, sentiment: 0.2, multiTimeframe: 0.4, strategies: 0.4 },
    strategies: { technical: 0.5, fundamental: 0.3, sentiment: 0.3, multiTimeframe: 0.5, patterns: 0.4 }
  };

  constructor() {
    this.config = {
      correlationMatrix: this.defaultCorrelations,
      historicalWeights: new Map(),
      regimeAdjustments: {
        trending: 1.2,
        ranging: 0.8,
        shock: 0.6,
        news_driven: 1.1
      },
      entropyThreshold: 0.85,
      minimumSignals: 2,
      kellyFractionLimit: 0.25
    };

    this.initializeDefaultPerformance();
  }

  async fuseSignals(
    modularResults: ModularAnalysisResult,
    currentPrice: number,
    regime: string = 'ranging'
  ): Promise<MasterSignal | null> {
    const startTime = Date.now();
    
    console.log('🔬 Starting advanced Bayesian signal fusion...');

    // Collect all non-hold signals
    const allSignals = this.collectAllSignals(modularResults);
    
    if (allSignals.length < this.config.minimumSignals) {
      console.log(`❌ Insufficient signals for fusion: ${allSignals.length} < ${this.config.minimumSignals}`);
      return null;
    }

    console.log(`📊 Fusing ${allSignals.length} signals from ${Object.keys(this.groupSignalsByModule(allSignals)).length} modules`);

    // Step 1: Convert signals to log-odds space
    const logOddsSignals = this.convertToLogOdds(allSignals);

    // Step 2: Apply correlation adjustments
    const decorrelatedSignals = this.applyCorrelationAdjustment(logOddsSignals);

    // Step 3: Apply historical performance weighting
    const weightedSignals = this.applyHistoricalWeighting(decorrelatedSignals);

    // Step 4: Apply regime adjustments
    const regimeAdjustedSignals = this.applyRegimeAdjustment(weightedSignals, regime);

    // Step 5: Perform Bayesian fusion
    const fusionResult = this.performBayesianFusion(regimeAdjustedSignals);

    // Step 6: Calculate entropy and check threshold
    if (fusionResult.entropy > this.config.entropyThreshold) {
      console.log(`🚫 Signal rejected: entropy ${fusionResult.entropy.toFixed(3)} > ${this.config.entropyThreshold}`);
      return null;
    }

    // Step 7: Determine final signal type
    const signalType = this.determineSignalType(fusionResult.probability);
    if (signalType === 'hold') {
      console.log('🚫 Signal fusion resulted in neutral/hold signal');
      return null;
    }

    // Step 8: Calculate position sizing using Kelly Criterion
    const kellyFraction = this.calculateKellyFraction(fusionResult.probability, allSignals);

    // Step 9: Calculate risk management levels
    const riskLevels = this.calculateRiskLevels(allSignals, currentPrice, signalType);

    // Step 10: Build master signal
    const masterSignal = this.buildMasterSignal(
      allSignals,
      fusionResult,
      signalType,
      kellyFraction,
      riskLevels,
      currentPrice,
      regime,
      startTime
    );

    console.log(`✅ Master signal generated: ${masterSignal.signal.toUpperCase()} | Probability: ${(masterSignal.fusedProbability * 100).toFixed(1)}% | Kelly: ${(masterSignal.kellyFraction * 100).toFixed(1)}%`);

    return masterSignal;
  }

  private collectAllSignals(results: ModularAnalysisResult): StandardSignal[] {
    return [
      ...results.technical,
      ...results.fundamental,
      ...results.sentiment,
      ...results.multiTimeframe,
      ...results.patterns,
      ...results.strategies
    ].filter(signal => signal.signal !== 'hold');
  }

  private groupSignalsByModule(signals: StandardSignal[]): Record<string, StandardSignal[]> {
    return signals.reduce((groups, signal) => {
      if (!groups[signal.module]) groups[signal.module] = [];
      groups[signal.module].push(signal);
      return groups;
    }, {} as Record<string, StandardSignal[]>);
  }

  private convertToLogOdds(signals: StandardSignal[]): Array<StandardSignal & { logOdds: number }> {
    return signals.map(signal => ({
      ...signal,
      logOdds: Math.log(signal.probability / (1 - signal.probability))
    }));
  }

  private applyCorrelationAdjustment(signals: Array<StandardSignal & { logOdds: number }>): Array<StandardSignal & { logOdds: number; correlationAdjustment: number }> {
    const moduleGroups = this.groupSignalsByModule(signals);
    const adjustedSignals = [...signals];

    // Apply intra-module correlation penalties
    Object.values(moduleGroups).forEach(groupSignals => {
      if (groupSignals.length > 1) {
        // Reduce strength when multiple signals from same module
        const penalty = 1 / Math.sqrt(groupSignals.length);
        groupSignals.forEach(signal => {
          const index = adjustedSignals.findIndex(s => s.id === signal.id);
          if (index !== -1) {
            (adjustedSignals[index] as any).logOdds *= penalty;
            (adjustedSignals[index] as any).correlationAdjustment = penalty;
          }
        });
      }
    });

    // Apply inter-module correlation adjustments
    const modules = Object.keys(moduleGroups);
    for (let i = 0; i < modules.length; i++) {
      for (let j = i + 1; j < modules.length; j++) {
        const moduleA = modules[i];
        const moduleB = modules[j];
        const correlation = this.config.correlationMatrix[moduleA]?.[moduleB] || 0;
        
        if (correlation > 0.3) { // Significant correlation
          const signalsA = moduleGroups[moduleA];
          const signalsB = moduleGroups[moduleB];
          
          // Reduce combined weight based on correlation
          const correlationPenalty = 1 - (correlation * 0.3);
          
          [...signalsA, ...signalsB].forEach(signal => {
            const index = adjustedSignals.findIndex(s => s.id === signal.id);
            if (index !== -1) {
              (adjustedSignals[index] as any).logOdds *= correlationPenalty;
            }
          });
        }
      }
    }

    return adjustedSignals as Array<StandardSignal & { logOdds: number; correlationAdjustment: number }>;
  }

  private applyHistoricalWeighting(signals: Array<StandardSignal & { logOdds: number; correlationAdjustment: number }>): Array<StandardSignal & { logOdds: number; correlationAdjustment: number; historicalWeight: number }> {
    return signals.map(signal => {
      const moduleKey = `${signal.module}_${signal.id.split('_')[0]}`;
      const performance = this.config.historicalWeights.get(signal.module); // Use module name directly
      
      // Multi-timeframe gets 0.15 weight (significant but not dominant)
      let baseWeight = 0.10; // Default for other modules
      if (signal.module === 'multiTimeframe') {
        baseWeight = 0.15; // 15% weight for multi-timeframe
      }
      
      let historicalWeight = baseWeight; // Start with base weight
      
      if (performance && performance.totalSignals >= 10) {
        // Weight based on win rate, Sharpe ratio, and reliability
        const winRateWeight = performance.winRate;
        const sharpeWeight = Math.min(2.0, Math.max(0.1, (performance.sharpeRatio + 1) / 2));
        const reliabilityWeight = performance.reliability;
        
        historicalWeight = baseWeight * (winRateWeight * 0.4 + sharpeWeight * 0.4 + reliabilityWeight * 0.2);
      }

      return {
        ...signal,
        logOdds: signal.logOdds * historicalWeight,
        historicalWeight
      };
    });
  }

  private applyRegimeAdjustment(signals: Array<StandardSignal & { logOdds: number; correlationAdjustment: number; historicalWeight: number }>, regime: string): Array<StandardSignal & { logOdds: number; correlationAdjustment: number; historicalWeight: number; regimeAdjustment: number }> {
    const regimeMultiplier = this.config.regimeAdjustments[regime] || 1.0;
    
    return signals.map(signal => ({
      ...signal,
      logOdds: signal.logOdds * regimeMultiplier,
      regimeAdjustment: regimeMultiplier
    }));
  }

  private performBayesianFusion(signals: Array<StandardSignal & { logOdds: number; correlationAdjustment: number; historicalWeight: number; regimeAdjustment: number }>): { probability: number; entropy: number; informationGain: number } {
    if (signals.length === 0) {
      return { probability: 0.5, entropy: 1.0, informationGain: 0 };
    }

    // Weight-adjusted log-odds combination
    let totalWeight = 0;
    let weightedLogOdds = 0;

    signals.forEach(signal => {
      const weight = signal.strength * signal.confidence;
      weightedLogOdds += signal.logOdds * weight;
      totalWeight += weight;
    });

    const fusedLogOdds = totalWeight > 0 ? weightedLogOdds / totalWeight : 0;
    const fusedProbability = 1 / (1 + Math.exp(-fusedLogOdds));

    // Calculate entropy: H = -p*log2(p) - (1-p)*log2(1-p)
    const entropy = fusedProbability > 0 && fusedProbability < 1 
      ? -(fusedProbability * Math.log2(fusedProbability) + (1 - fusedProbability) * Math.log2(1 - fusedProbability))
      : 1.0;

    // Information gain vs random baseline (0.5 probability)
    const baselineEntropy = 1.0; // Maximum entropy for p=0.5
    const informationGain = baselineEntropy - entropy;

    return {
      probability: fusedProbability,
      entropy,
      informationGain
    };
  }

  private determineSignalType(probability: number): 'buy' | 'sell' | 'hold' {
    if (probability > 0.6) return 'buy';
    if (probability < 0.4) return 'sell';
    return 'hold';
  }

  private calculateKellyFraction(probability: number, signals: StandardSignal[]): number {
    // Use best risk-reward ratio from contributing signals
    const avgRiskReward = signals.reduce((sum, s) => sum + s.riskRewardRatio, 0) / signals.length;
    
    // Kelly formula: f = (p*R - (1-p)) / R
    const winProb = probability;
    const lossProb = 1 - probability;
    const kellyFraction = (winProb * avgRiskReward - lossProb) / avgRiskReward;
    
    // Apply safety factor and cap
    const safeFraction = Math.max(0, kellyFraction * 0.25); // 25% of Kelly
    return Math.min(this.config.kellyFractionLimit, safeFraction);
  }

  private calculateRiskLevels(signals: StandardSignal[], currentPrice: number, signalType: 'buy' | 'sell'): { stopLoss: number; takeProfit: number; riskReward: number } {
    // Use weighted average of contributing signals' levels
    const weights = signals.map(s => s.strength * s.confidence);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    if (totalWeight === 0) {
      // Fallback to default levels
      const stopLoss = signalType === 'buy' ? currentPrice * 0.99 : currentPrice * 1.01;
      const takeProfit = signalType === 'buy' ? currentPrice * 1.02 : currentPrice * 0.98;
      return {
        stopLoss,
        takeProfit,
        riskReward: Math.abs(takeProfit - currentPrice) / Math.abs(currentPrice - stopLoss)
      };
    }

    let weightedStopLoss = 0;
    let weightedTakeProfit = 0;

    signals.forEach((signal, i) => {
      const weight = weights[i] / totalWeight;
      weightedStopLoss += signal.stopLoss * weight;
      weightedTakeProfit += signal.takeProfit * weight;
    });

    return {
      stopLoss: weightedStopLoss,
      takeProfit: weightedTakeProfit,
      riskReward: Math.abs(weightedTakeProfit - currentPrice) / Math.abs(currentPrice - weightedStopLoss)
    };
  }

  private buildMasterSignal(
    allSignals: StandardSignal[],
    fusionResult: { probability: number; entropy: number; informationGain: number },
    signalType: 'buy' | 'sell',
    kellyFraction: number,
    riskLevels: { stopLoss: number; takeProfit: number; riskReward: number },
    currentPrice: number,
    regime: string,
    startTime: number
  ): MasterSignal {
    const moduleGroups = this.groupSignalsByModule(allSignals);
    const moduleContributions: Record<string, number> = {};
    
    // Calculate module contributions
    Object.keys(moduleGroups).forEach(module => {
      const moduleSignals = moduleGroups[module];
      const totalStrength = moduleSignals.reduce((sum, s) => sum + s.strength * s.confidence, 0);
      const allStrength = allSignals.reduce((sum, s) => sum + s.strength * s.confidence, 0);
      moduleContributions[module] = allStrength > 0 ? totalStrength / allStrength : 0;
    });

    // Calculate quality metrics
    const diversityIndex = Object.keys(moduleGroups).length / 6; // 6 total modules
    const consensusLevel = this.calculateConsensusLevel(allSignals);
    let signalQuality = (1 - fusionResult.entropy) * diversityIndex * consensusLevel;

    // **NEW: Multi-Timeframe Alignment Bonus/Penalty**
    let baseConfidence = 1 - fusionResult.entropy;
    let multiTimeframeBonus = 0;
    let multiTimeframeNote = '';

    // Find multi-timeframe signal if present
    const mtfSignal = allSignals.find(s => s.module === 'multiTimeframe');
    if (mtfSignal && (mtfSignal as any).intermediateValues) {
      const alignment = (mtfSignal as any).intermediateValues.alignment;
      
      if (alignment === 'perfect') {
        // +10% confidence bonus for perfect alignment
        multiTimeframeBonus = 0.10;
        multiTimeframeNote = 'All timeframes aligned - confidence boosted +10%';
        console.log('✨ Multi-timeframe PERFECT alignment - applying +10% confidence bonus');
      } else if (alignment === 'strong') {
        // +5% confidence bonus for strong alignment
        multiTimeframeBonus = 0.05;
        multiTimeframeNote = 'Strong timeframe alignment - confidence boosted +5%';
        console.log('✨ Multi-timeframe STRONG alignment - applying +5% confidence bonus');
      } else if (alignment === 'conflicting') {
        // -20% confidence penalty for conflicting signals
        multiTimeframeBonus = -0.20;
        multiTimeframeNote = 'Conflicting timeframes - confidence reduced -20%';
        console.log('⚠️ Multi-timeframe CONFLICTING - applying -20% confidence penalty');
      }

      // Apply bonus/penalty to confidence
      baseConfidence = Math.max(0, Math.min(1, baseConfidence + multiTimeframeBonus));
      signalQuality = Math.max(0, Math.min(1, signalQuality + multiTimeframeBonus));
    }

    // Generate reasoning
    const topContributors = Object.entries(moduleContributions)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([module, contrib]) => `${module}: ${(contrib * 100).toFixed(0)}%`);

    let reasoning = `${signalType.toUpperCase()} signal generated from ${allSignals.length} factors across ${Object.keys(moduleGroups).length} modules. ` +
      `Top contributors: ${topContributors.join(', ')}. ` +
      `Fusion probability: ${(fusionResult.probability * 100).toFixed(1)}%, Entropy: ${fusionResult.entropy.toFixed(3)}`;
    
    // Add multi-timeframe note to reasoning if applicable
    if (multiTimeframeNote) {
      reasoning += `. ${multiTimeframeNote}`;
    }

    return {
      id: `master_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      pair: allSignals[0]?.pair || 'EUR/USD',
      timeframe: allSignals[0]?.timeframe || '15m',
      signal: signalType,
      fusedProbability: fusionResult.probability,
      confidence: baseConfidence, // Use adjusted confidence
      strength: Math.round(Math.abs(fusionResult.probability - 0.5) * 20),
      entry: currentPrice,
      stopLoss: riskLevels.stopLoss,
      takeProfit: riskLevels.takeProfit,
      riskRewardRatio: riskLevels.riskReward,
      kellyFraction,
      positionSize: kellyFraction * 100, // As percentage
      contributingSignals: allSignals,
      moduleContributions,
      fusionMetrics: {
        entropyValue: fusionResult.entropy,
        informationGain: fusionResult.informationGain,
        correlationPenalty: 0, // Would be calculated in more detail
        regimeAdjustment: this.config.regimeAdjustments[regime] || 1.0,
        bayesianUpdateCount: allSignals.length,
        confidenceInterval: this.calculateConfidenceInterval(fusionResult.probability, allSignals.length)
      },
      signalQuality,
      diversityIndex,
      consensusLevel,
      reasoning,
      warnings: this.generateWarnings(fusionResult, allSignals, kellyFraction)
    };
  }

  private calculateConsensusLevel(signals: StandardSignal[]): number {
    if (signals.length <= 1) return 1.0;

    const buySignals = signals.filter(s => s.signal === 'buy').length;
    const sellSignals = signals.filter(s => s.signal === 'sell').length;
    const total = signals.length;

    // Consensus = how much agreement there is (0-1)
    const majoritySize = Math.max(buySignals, sellSignals);
    return majoritySize / total;
  }

  private calculateConfidenceInterval(probability: number, sampleSize: number): [number, number] {
    // Approximate 95% confidence interval for probability
    const z = 1.96; // 95% CI
    const standardError = Math.sqrt(probability * (1 - probability) / sampleSize);
    const margin = z * standardError;
    
    return [
      Math.max(0, probability - margin),
      Math.min(1, probability + margin)
    ];
  }

  private generateWarnings(fusionResult: { entropy: number }, signals: StandardSignal[], kellyFraction: number): string[] {
    const warnings: string[] = [];

    if (fusionResult.entropy > 0.7) {
      warnings.push('High uncertainty signal - consider smaller position size');
    }

    if (signals.length < 3) {
      warnings.push('Limited signal diversity - increased risk');
    }

    if (kellyFraction < 0.01) {
      warnings.push('Very small Kelly fraction suggests minimal edge');
    }

    const moduleCount = new Set(signals.map(s => s.module)).size;
    if (moduleCount < 3) {
      warnings.push('Signals concentrated in few modules - diversification warning');
    }

    return warnings;
  }

  private initializeDefaultPerformance(): void {
    // Initialize with default performance metrics for each module
    // Multi-timeframe gets higher initial weight (0.15 vs 0.10 for others)
    const defaultMetrics: ModulePerformance = {
      totalSignals: 0,
      winRate: 0.5,
      averageReturn: 0.0,
      sharpeRatio: 0.0,
      maxDrawdown: 0.05,
      reliability: 0.7,
      informationRatio: 0.0,
      lastUpdated: new Date()
    };

    const multiTimeframeMetrics: ModulePerformance = {
      ...defaultMetrics,
      reliability: 0.85, // Higher reliability for multi-timeframe
    };

    const modules = ['technical', 'fundamental', 'sentiment', 'patterns', 'strategies'];
    modules.forEach(module => {
      this.config.historicalWeights.set(module, { ...defaultMetrics });
    });

    // Multi-timeframe gets special treatment with 0.15 weight (15% contribution)
    this.config.historicalWeights.set('multiTimeframe', multiTimeframeMetrics);
  }

  // Performance tracking methods
  updateModulePerformance(moduleId: string, trade: { success: boolean; return: number }): void {
    const current = this.config.historicalWeights.get(moduleId);
    if (!current) return;

    const updated: ModulePerformance = {
      ...current,
      totalSignals: current.totalSignals + 1,
      winRate: (current.winRate * current.totalSignals + (trade.success ? 1 : 0)) / (current.totalSignals + 1),
      averageReturn: (current.averageReturn * current.totalSignals + trade.return) / (current.totalSignals + 1),
      lastUpdated: new Date()
    };

    // Recalculate reliability based on recent performance
    updated.reliability = Math.min(1.0, updated.winRate + 0.2);

    this.config.historicalWeights.set(moduleId, updated);
  }
}

export const advancedFusionEngine = new AdvancedFusionEngine();