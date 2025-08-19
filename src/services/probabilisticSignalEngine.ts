// Probabilistic Signal Engine - Converts signals to mathematical probabilities with log-odds fusion
// Implements Bayesian inference, entropy filtering, and explicit edge calculation for profit-first trading

export interface ProbabilisticFactor {
  id: string;
  name: string;
  type: string;
  probability: number; // 0-1
  logOdds: number; // log(p / (1-p))
  weight: number;
  confidence: number; // 0-1
  errorVariance: number;
  causalUplift: number; // Expected uplift vs baseline
  regimeAdjustment: number; // Regime-specific multiplier
  description: string;
}

export interface ProbabilisticSignal {
  id: string;
  timestamp: Date;
  pair: string;
  combinedProbability: number; // Fused probability 0-1
  combinedLogOdds: number; // Combined log-odds
  entropy: number; // H(p) = -p*log(p) - (1-p)*log(1-p)
  netEdge: number; // Expected profit per dollar risked
  signalType: 'buy' | 'sell' | 'neutral';
  confidence: number;
  strength: number;
  factors: ProbabilisticFactor[];
  expectedReturn: number;
  expectedLoss: number;
  tradingCosts: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  kellyFraction: number;
  optimalPositionSize: number;
  cvarConstraint: number;
  regimeContext: string;
  calibrationScore: number; // How well-calibrated are our probabilities
}

export interface MarketRegime {
  type: 'trending' | 'ranging' | 'shock' | 'liquidity_crisis' | 'news_driven';
  strength: number; // 0-1
  volatility: number;
  volume: number;
  momentum: number;
  confidence: number;
  adjustmentFactors: Record<string, number>; // Factor type -> multiplier
  duration?: number; // Optional duration
  microstructure?: any; // Optional microstructure
  riskMultiplier?: number; // Optional risk multiplier
  expectedDuration?: number; // Optional expected duration
  transitionProbabilities?: Record<string, number>; // Optional transition probabilities
}

export interface BayesianParameters {
  covarianceMatrix: number[][]; // Error covariance between factors
  priorProbabilities: Record<string, number>; // Prior beliefs per factor type
  learningRate: number;
  adaptationSpeed: number;
  maxEntropy: number; // Only trade if entropy below this threshold
}

export class ProbabilisticSignalEngine {
  private bayesianParams: BayesianParameters;
  private regimeHistory: MarketRegime[] = [];
  private calibrationHistory: { predicted: number; actual: number; timestamp: Date }[] = [];
  private factorPerformance: Map<string, { totalTrades: number; winRate: number; avgReturn: number }> = new Map();

  constructor() {
    this.bayesianParams = {
      covarianceMatrix: [], // Will be learned from data
      priorProbabilities: {
        'technical': 0.52,
        'pattern': 0.54,
        'volume': 0.51,
        'momentum': 0.53,
        'news': 0.56,
        'fundamental': 0.55
      },
      learningRate: 0.01,
      adaptationSpeed: 0.05,
      maxEntropy: 0.6 // Only trade when uncertainty is low
    };
  }

  // ==================== CORE PROBABILISTIC CONVERSION ====================

  convertFactorToProbabilistic(factor: any, currentRegime: MarketRegime): ProbabilisticFactor {
    // Convert confluence factor confidence/strength to actual probability
    let baseProbability = this.convertStrengthToProbability(factor);
    
    // Apply prior knowledge and regime adjustment
    const prior = this.bayesianParams.priorProbabilities[factor.type] || 0.5;
    const regimeAdjustment = currentRegime.adjustmentFactors[factor.type] || 1.0;
    
    // Bayesian update: P(signal|data) = P(data|signal) * P(signal) / P(data)
    const likelihood = baseProbability;
    let posteriorProbability = (likelihood * prior) / ((likelihood * prior) + ((1 - likelihood) * (1 - prior)));
    
    // Apply regime adjustment
    posteriorProbability = this.applyRegimeAdjustment(posteriorProbability, regimeAdjustment);
    
    // Calculate log-odds: z = log(p / (1-p))
    const logOdds = Math.log(posteriorProbability / (1 - posteriorProbability));
    
    // Calculate error variance based on factor reliability
    const errorVariance = this.calculateErrorVariance(factor, posteriorProbability);
    
    // Get causal uplift from historical performance
    const causalUplift = this.getCausalUplift(factor.name, factor.type);

    return {
      id: `factor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: factor.name,
      type: factor.type,
      probability: posteriorProbability,
      logOdds,
      weight: factor.weight || 1,
      confidence: factor.confidence || 0.7,
      errorVariance,
      causalUplift,
      regimeAdjustment,
      description: factor.description || `${factor.name} signal`
    };
  }

  private convertStrengthToProbability(factor: any): number {
    // Convert factor strength (1-10) and confidence to probability
    const strength = Math.max(1, Math.min(10, factor.strength || 5));
    const confidence = Math.max(0.1, Math.min(1, factor.confidence || 0.7));
    
    // Base probability from signal type
    let baseP = 0.5; // Neutral
    
    if (factor.signal === 'buy') {
      // Map strength 1-10 to probability 0.51-0.85
      baseP = 0.51 + (strength - 1) * 0.034;
    } else if (factor.signal === 'sell') {
      // Map strength 1-10 to probability 0.49-0.15 (inverse for sell)
      baseP = 0.49 - (strength - 1) * 0.034;
    }
    
    // Adjust by confidence - low confidence moves toward 0.5
    const adjustedP = 0.5 + confidence * (baseP - 0.5);
    
    return Math.max(0.01, Math.min(0.99, adjustedP));
  }

  private applyRegimeAdjustment(probability: number, adjustment: number): number {
    // Adjust probability based on regime - but keep within bounds
    const logOdds = Math.log(probability / (1 - probability));
    const adjustedLogOdds = logOdds * adjustment;
    const adjustedProb = 1 / (1 + Math.exp(-adjustedLogOdds));
    
    return Math.max(0.01, Math.min(0.99, adjustedProb));
  }

  private calculateErrorVariance(factor: any, probability: number): number {
    // Higher variance for less reliable factors and extreme probabilities
    const reliabilityFactor = 1 - (factor.confidence || 0.7);
    const extremityFactor = 4 * probability * (1 - probability); // Max at p=0.5, min at extremes
    const baseFactor = factor.weight ? 1 / Math.sqrt(factor.weight) : 0.5;
    
    return reliabilityFactor * extremityFactor * baseFactor;
  }

  private getCausalUplift(factorName: string, factorType: string): number {
    const performance = this.factorPerformance.get(`${factorType}_${factorName}`);
    if (!performance || performance.totalTrades < 10) {
      return 0; // No uplift if insufficient data
    }
    
    // Causal uplift = (WinRate - 0.5) * AvgReturn
    // This measures how much better this factor performs vs random
    const baselineWinRate = 0.5;
    const uplift = (performance.winRate - baselineWinRate) * performance.avgReturn;
    
    return Math.max(-0.5, Math.min(0.5, uplift)); // Clamp to reasonable range
  }

  // ==================== BAYESIAN FUSION ENGINE ====================

  fuseProbabilities(factors: ProbabilisticFactor[]): { combinedProbability: number; combinedLogOdds: number; entropy: number } {
    if (factors.length === 0) {
      return { combinedProbability: 0.5, combinedLogOdds: 0, entropy: 1 };
    }

    // Filter factors with positive causal uplift only
    const validFactors = factors.filter(f => f.causalUplift >= 0);
    
    if (validFactors.length === 0) {
      return { combinedProbability: 0.5, combinedLogOdds: 0, entropy: 1 };
    }

    // Decorrelate overlapping signals using covariance matrix
    const decorrelatedLogOdds = this.decorrelateSignals(validFactors);
    
    // Weighted combination: L = w^T * z
    let weightedLogOdds = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < decorrelatedLogOdds.length; i++) {
      const factor = validFactors[i];
      const adjustedWeight = factor.weight * (1 + factor.causalUplift) * factor.regimeAdjustment;
      
      weightedLogOdds += adjustedWeight * decorrelatedLogOdds[i];
      totalWeight += adjustedWeight;
    }
    
    const combinedLogOdds = totalWeight > 0 ? weightedLogOdds / totalWeight : 0;
    
    // Convert back to probability: p = 1 / (1 + exp(-L))
    const combinedProbability = 1 / (1 + Math.exp(-combinedLogOdds));
    
    // Calculate entropy: H(p) = -p*log(p) - (1-p)*log(1-p)
    const entropy = -combinedProbability * Math.log2(combinedProbability) - 
                   (1 - combinedProbability) * Math.log2(1 - combinedProbability);

    return { combinedProbability, combinedLogOdds, entropy };
  }

  private decorrelateSignals(factors: ProbabilisticFactor[]): number[] {
    // Simplified decorrelation - in production, use full covariance matrix
    const logOdds = factors.map(f => f.logOdds);
    
    // Group similar factor types and reduce their combined weight
    const typeGroups: Record<string, number[]> = {};
    factors.forEach((f, i) => {
      if (!typeGroups[f.type]) typeGroups[f.type] = [];
      typeGroups[f.type].push(i);
    });
    
    const decorrelatedLogOdds = [...logOdds];
    
    // Reduce correlation within each type group
    Object.values(typeGroups).forEach(indices => {
      if (indices.length > 1) {
        // Apply correlation penalty - reduce magnitude by sqrt(n) for n correlated signals
        const correlationPenalty = 1 / Math.sqrt(indices.length);
        indices.forEach(i => {
          decorrelatedLogOdds[i] *= correlationPenalty;
        });
      }
    });
    
    return decorrelatedLogOdds;
  }

  // ==================== NET EDGE CALCULATION ====================

  calculateNetEdge(
    combinedProbability: number,
    expectedReturn: number,
    expectedLoss: number,
    tradingCosts: number
  ): number {
    // NetEdge = p_combined * R_avg - (1 - p_combined) * L_avg - Cost_trade
    const winProbability = combinedProbability;
    const lossProbability = 1 - combinedProbability;
    
    const expectedProfit = winProbability * expectedReturn;
    const expectedLossAmount = lossProbability * Math.abs(expectedLoss);
    
    const netEdge = expectedProfit - expectedLossAmount - tradingCosts;
    
    return netEdge;
  }

  calculateKellyFraction(
    combinedProbability: number,
    expectedReturn: number,
    expectedLoss: number
  ): number {
    // Kelly Criterion: f* = (p*R - (1-p)) / R
    // Where p = win probability, R = reward/risk ratio
    
    const winProb = combinedProbability;
    const lossProb = 1 - combinedProbability;
    const rewardRiskRatio = Math.abs(expectedReturn / expectedLoss);
    
    const kellyFraction = (winProb * rewardRiskRatio - lossProb) / rewardRiskRatio;
    
    // Clamp to reasonable range (0-25% of capital)
    return Math.max(0, Math.min(0.25, kellyFraction));
  }

  // ==================== REGIME DETECTION ====================
  // Note: This method is now deprecated in favor of the full RegimeDetectionEngine
  // Kept for backward compatibility

  detectMarketRegime(candles: any[], volume: number[], news: any[]): MarketRegime {
    console.warn('⚠️ Using deprecated simple regime detection. Use RegimeDetectionEngine for full HSMM analysis.');
    
    // Simplified regime detection - maintained for compatibility
    const recent = candles.slice(-20);
    const prices = recent.map((c: any) => c.close);
    
    // Calculate volatility
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r*r, 0) / returns.length);
    
    // Calculate trend strength
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const trendStrength = Math.abs(lastPrice - firstPrice) / firstPrice;
    
    // Calculate momentum
    const shortMA = prices.slice(-5).reduce((sum, p) => sum + p, 0) / 5;
    const longMA = prices.slice(-15).reduce((sum, p) => sum + p, 0) / 15;
    const momentum = Math.abs(shortMA - longMA) / longMA;
    
    // Determine regime type (simplified mapping)
    let regimeType: any;
    let strength: number;
    
    if (volatility > 0.002) { // High volatility threshold
      if (news && news.length > 0) {
        regimeType = 'news_driven';
        strength = Math.min(1, volatility * 500);
      } else {
        regimeType = 'shock_up'; // Default to shock_up for compatibility
        strength = Math.min(1, volatility * 300);
      }
    } else if (trendStrength > 0.01) {
      // Determine trend direction
      regimeType = lastPrice > firstPrice ? 'trending_bullish' : 'trending_bearish';
      strength = Math.min(1, trendStrength * 100);
    } else {
      regimeType = 'ranging_tight';
      strength = Math.min(1, (0.01 - trendStrength) * 100);
    }
    
    // Define adjustment factors for each regime (simplified)
    const adjustmentFactors: Record<string, number> = {};
    
    switch (regimeType) {
      case 'trending_bullish':
      case 'trending_bearish':
        adjustmentFactors.momentum = 1.3;
        adjustmentFactors.technical = 1.2;
        adjustmentFactors.pattern = 0.9;
        break;
      case 'ranging_tight':
        adjustmentFactors.pattern = 1.3;
        adjustmentFactors.technical = 1.1;
        adjustmentFactors.momentum = 0.8;
        break;
      case 'shock_up':
      case 'shock_down':
        adjustmentFactors.volume = 1.4;
        adjustmentFactors.technical = 0.7;
        adjustmentFactors.news = 1.5;
        break;
      case 'news_driven':
        adjustmentFactors.news = 1.6;
        adjustmentFactors.fundamental = 1.4;
        adjustmentFactors.technical = 0.8;
        break;
      default:
        Object.keys(this.bayesianParams.priorProbabilities).forEach(type => {
          adjustmentFactors[type] = 1.0;
        });
    }
    
    return {
      type: regimeType,
      strength,
      confidence: strength,
      duration: 60, // Default duration
      volatility,
      momentum: (shortMA - longMA) / longMA, // Directional momentum
      volume: volume.slice(-10).reduce((sum, v) => sum + v, 0) / 10,
      microstructure: {
        bidAskSpread: volatility * 0.1,
        marketDepth: Math.max(0.1, 2 - volatility),
        orderFlow: 'neutral',
        institutionalActivity: 0.5
      },
      adjustmentFactors,
      riskMultiplier: regimeType.includes('shock') ? 0.3 : regimeType.includes('news') ? 0.4 : 1.0,
      expectedDuration: 900, // 15 minutes
      transitionProbabilities: {} // Empty for compatibility
    };
  }

  // ==================== SIGNAL GENERATION ====================

  async generateProbabilisticSignal(
    factors: any[],
    candles: any[],
    currentPrice: number,
    volume: number[],
    news: any[] = []
  ): Promise<ProbabilisticSignal | null> {
    // Detect current market regime
    const currentRegime = this.detectMarketRegime(candles, volume, news);
    
    // Convert all factors to probabilistic
    const probabilisticFactors = factors.map(f => 
      this.convertFactorToProbabilistic(f, currentRegime)
    );
    
    // Fuse probabilities using Bayesian inference
    const { combinedProbability, combinedLogOdds, entropy } = this.fuseProbabilities(probabilisticFactors);
    
    // Apply entropy filter - only trade if uncertainty is low enough
    if (entropy > this.bayesianParams.maxEntropy) {
      console.log(`🚫 Signal rejected due to high entropy: ${entropy.toFixed(3)} > ${this.bayesianParams.maxEntropy}`);
      return null;
    }
    
    // Determine signal type
    const signalType: 'buy' | 'sell' | 'neutral' = 
      combinedProbability > 0.6 ? 'buy' : 
      combinedProbability < 0.4 ? 'sell' : 'neutral';
    
    if (signalType === 'neutral') {
      return null;
    }
    
    // Calculate expected returns and losses
    const expectedReturn = this.calculateExpectedReturn(combinedProbability, currentPrice);
    const expectedLoss = this.calculateExpectedLoss(combinedProbability, currentPrice);
    const tradingCosts = currentPrice * 0.0001; // 1 pip spread
    
    // Calculate net edge
    const netEdge = this.calculateNetEdge(combinedProbability, expectedReturn, expectedLoss, tradingCosts);
    
    // Only proceed if we have positive edge
    if (netEdge <= 0) {
      console.log(`🚫 Signal rejected due to negative edge: ${netEdge.toFixed(6)}`);
      return null;
    }
    
    // Calculate Kelly fraction and position sizing
    const kellyFraction = this.calculateKellyFraction(combinedProbability, expectedReturn, expectedLoss);
    
    // Calculate risk levels
    const stopLoss = signalType === 'buy' ? 
      currentPrice * (1 - 0.01) : // 1% stop loss for buy
      currentPrice * (1 + 0.01);   // 1% stop loss for sell
      
    const takeProfit = signalType === 'buy' ?
      currentPrice * (1 + 0.02) : // 2% take profit for buy  
      currentPrice * (1 - 0.02);   // 2% take profit for sell
    
    const riskRewardRatio = Math.abs(takeProfit - currentPrice) / Math.abs(currentPrice - stopLoss);
    
    return {
      id: `prob_signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      pair: 'EUR/USD',
      combinedProbability,
      combinedLogOdds,
      entropy,
      netEdge,
      signalType,
      confidence: Math.min(1, 1 - entropy), // Lower entropy = higher confidence
      strength: Math.round(Math.abs(combinedProbability - 0.5) * 20), // 0-10 scale
      factors: probabilisticFactors,
      expectedReturn,
      expectedLoss,
      tradingCosts,
      entryPrice: currentPrice,
      stopLoss,
      takeProfit,
      riskRewardRatio,
      kellyFraction,
      optimalPositionSize: kellyFraction * 0.5, // Conservative Kelly (50% of full Kelly)
      cvarConstraint: 0.05, // 5% CVaR limit
      regimeContext: currentRegime.type,
      calibrationScore: this.calculateCalibrationScore()
    };
  }

  private calculateExpectedReturn(probability: number, currentPrice: number): number {
    // Simple expected return based on probability and typical market moves
    const avgWinSize = currentPrice * 0.02; // 2% average win
    return avgWinSize;
  }

  private calculateExpectedLoss(probability: number, currentPrice: number): number {
    // Simple expected loss based on probability and risk management
    const avgLossSize = currentPrice * 0.01; // 1% average loss (due to stop loss)
    return avgLossSize;
  }

  private calculateCalibrationScore(): number {
    // Measure how well-calibrated our probabilities are
    // Perfect calibration = 1.0, random = 0.0
    if (this.calibrationHistory.length < 20) {
      return 0.5; // Neutral score with insufficient data
    }
    
    const recent = this.calibrationHistory.slice(-100); // Last 100 predictions
    
    // Group by probability buckets and check calibration
    const buckets: Record<string, { predicted: number; actual: number; count: number }> = {};
    
    recent.forEach(record => {
      const bucket = Math.floor(record.predicted * 10) / 10; // 0.1 buckets
      const key = bucket.toString();
      
      if (!buckets[key]) {
        buckets[key] = { predicted: 0, actual: 0, count: 0 };
      }
      
      buckets[key].predicted += record.predicted;
      buckets[key].actual += record.actual;
      buckets[key].count += 1;
    });
    
    // Calculate calibration error
    let totalError = 0;
    let totalCount = 0;
    
    Object.values(buckets).forEach(bucket => {
      if (bucket.count >= 5) { // Only consider buckets with sufficient samples
        const avgPredicted = bucket.predicted / bucket.count;
        const avgActual = bucket.actual / bucket.count;
        const error = Math.abs(avgPredicted - avgActual);
        
        totalError += error * bucket.count;
        totalCount += bucket.count;
      }
    });
    
    const avgError = totalCount > 0 ? totalError / totalCount : 0.5;
    const calibrationScore = Math.max(0, 1 - (avgError * 2)); // Convert to 0-1 score
    
    return calibrationScore;
  }

  // ==================== LEARNING & ADAPTATION ====================

  updateFactorPerformance(factorName: string, factorType: string, wasWin: boolean, returnAmount: number): void {
    const key = `${factorType}_${factorName}`;
    const current = this.factorPerformance.get(key) || { totalTrades: 0, winRate: 0.5, avgReturn: 0 };
    
    const newTotalTrades = current.totalTrades + 1;
    const newWinCount = wasWin ? (current.winRate * current.totalTrades + 1) : (current.winRate * current.totalTrades);
    const newWinRate = newWinCount / newTotalTrades;
    
    const newAvgReturn = (current.avgReturn * current.totalTrades + returnAmount) / newTotalTrades;
    
    this.factorPerformance.set(key, {
      totalTrades: newTotalTrades,
      winRate: newWinRate,
      avgReturn: newAvgReturn
    });
  }

  updateCalibration(predictedProbability: number, actualOutcome: number): void {
    this.calibrationHistory.push({
      predicted: predictedProbability,
      actual: actualOutcome,
      timestamp: new Date()
    });
    
    // Keep only last 500 records
    if (this.calibrationHistory.length > 500) {
      this.calibrationHistory = this.calibrationHistory.slice(-500);
    }
  }

  getSystemStats(): {
    totalFactorsTracked: number;
    avgCalibrationScore: number;
    totalPredictions: number;
    currentRegime: string;
  } {
    return {
      totalFactorsTracked: this.factorPerformance.size,
      avgCalibrationScore: this.calculateCalibrationScore(),
      totalPredictions: this.calibrationHistory.length,
      currentRegime: this.regimeHistory.length > 0 ? this.regimeHistory[this.regimeHistory.length - 1].type : 'unknown'
    };
  }
}
