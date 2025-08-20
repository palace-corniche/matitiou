// Adaptive Weight Engine - Performance-based factor weight optimization
// Implements exponential weight updates and genetic algorithm parameter tuning

export interface FactorPerformance {
  factorId: string;
  factorType: string;
  regime: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalReturn: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  lastUpdated: Date;
  confidence: number; // Statistical confidence in performance metrics
  sampleSize: number;
  recentPerformance: number[]; // Last 20 trades
}

export interface WeightUpdate {
  factorId: string;
  oldWeight: number;
  newWeight: number;
  reason: string;
  performanceScore: number;
  timestamp: Date;
  regime: string;
}

export interface GeneticParameters {
  populationSize: number;
  mutationRate: number;
  crossoverRate: number;
  eliteSize: number;
  fitnessFunction: 'sharpe' | 'return' | 'calmar' | 'multi_objective';
  generations: number;
}

export interface Individual {
  id: string;
  weights: Record<string, number>; // factorType -> weight
  riskParameters: {
    maxRisk: number;
    kellyMultiplier: number;
    volatilityTarget: number;
    drawdownLimit: number;
  };
  fitness: number;
  performance: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    trades: number;
  };
}

export class AdaptiveWeightEngine {
  private factorPerformance: Map<string, FactorPerformance> = new Map();
  private weightHistory: WeightUpdate[] = [];
  private currentWeights: Record<string, Record<string, number>> = {}; // regime -> factorType -> weight
  private learningRate: number = 0.05;
  private decayFactor: number = 0.95; // For exponential decay of old performance
  private minSampleSize: number = 10; // Minimum trades before weight adaptation
  
  // Genetic Algorithm parameters
  private population: Individual[] = [];
  private geneticParams: GeneticParameters;
  private generation: number = 0;
  
  constructor() {
    this.initializeDefaultWeights();
    this.geneticParams = {
      populationSize: 20,
      mutationRate: 0.1,
      crossoverRate: 0.7,
      eliteSize: 4,
      fitnessFunction: 'multi_objective',
      generations: 50
    };
  }

  // ==================== EXPONENTIAL WEIGHT UPDATES ====================

  updateFactorPerformance(
    factorId: string,
    factorType: string,
    regime: string,
    tradeResult: {
      isWin: boolean;
      returnAmount: number;
      holdingPeriod: number;
      entryPrice: number;
      exitPrice: number;
    }
  ): void {
    const key = `${regime}_${factorType}_${factorId}`;
    let performance = this.factorPerformance.get(key);

    if (!performance) {
      performance = this.initializeFactorPerformance(factorId, factorType, regime);
    }

    // Update trade statistics
    performance.totalTrades += 1;
    performance.totalReturn += tradeResult.returnAmount;
    
    if (tradeResult.isWin) {
      performance.winningTrades += 1;
      performance.consecutiveWins += 1;
      performance.consecutiveLosses = 0;
      performance.avgWin = (performance.avgWin * (performance.winningTrades - 1) + tradeResult.returnAmount) / performance.winningTrades;
    } else {
      performance.losingTrades += 1;
      performance.consecutiveLosses += 1;
      performance.consecutiveWins = 0;
      performance.avgLoss = (performance.avgLoss * (performance.losingTrades - 1) + Math.abs(tradeResult.returnAmount)) / performance.losingTrades;
    }

    // Update derived metrics
    performance.winRate = performance.winningTrades / performance.totalTrades;
    performance.profitFactor = performance.avgLoss > 0 ? (performance.avgWin * performance.winningTrades) / (performance.avgLoss * performance.losingTrades) : 999;
    
    // Update recent performance (rolling window)
    performance.recentPerformance.push(tradeResult.returnAmount);
    if (performance.recentPerformance.length > 20) {
      performance.recentPerformance.shift();
    }
    
    // Calculate Sharpe ratio (simplified)
    if (performance.recentPerformance.length >= 10) {
      const avgReturn = performance.recentPerformance.reduce((sum, r) => sum + r, 0) / performance.recentPerformance.length;
      const variance = performance.recentPerformance.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / performance.recentPerformance.length;
      const stdDev = Math.sqrt(variance);
      performance.sharpeRatio = stdDev > 0 ? avgReturn / stdDev * Math.sqrt(252) : 0; // Annualized
    }
    
    // Update confidence based on sample size
    performance.confidence = Math.min(1, performance.totalTrades / 30); // Full confidence after 30 trades
    performance.sampleSize = performance.totalTrades;
    performance.lastUpdated = new Date();

    this.factorPerformance.set(key, performance);

    // Trigger weight adaptation if sufficient sample size
    if (performance.totalTrades >= this.minSampleSize && performance.totalTrades % 5 === 0) {
      this.adaptWeights(regime, factorType, performance);
    }
  }

  private initializeFactorPerformance(factorId: string, factorType: string, regime: string): FactorPerformance {
    return {
      factorId,
      factorType,
      regime,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalReturn: 0,
      winRate: 0.5, // Start neutral
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 1.0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      lastUpdated: new Date(),
      confidence: 0,
      sampleSize: 0,
      recentPerformance: []
    };
  }

  private adaptWeights(regime: string, factorType: string, performance: FactorPerformance): void {
    if (!this.currentWeights[regime]) {
      this.currentWeights[regime] = {};
    }

    const currentWeight = this.currentWeights[regime][factorType] || 1.0;
    
    // Calculate performance score
    const performanceScore = this.calculatePerformanceScore(performance);
    
    // Exponential weight update: w_i ← w_i * exp(η * score_i)
    const multiplier = Math.exp(this.learningRate * performanceScore);
    let newWeight = currentWeight * multiplier;
    
    // Apply bounds and confidence scaling
    newWeight = this.applyWeightBounds(newWeight, performance.confidence);
    
    // Only update if change is significant
    if (Math.abs(newWeight - currentWeight) > 0.05) {
      this.currentWeights[regime][factorType] = newWeight;
      
      // Log weight update
      this.logWeightUpdate({
        factorId: performance.factorId,
        oldWeight: currentWeight,
        newWeight,
        reason: `Performance-based update: Score ${performanceScore.toFixed(3)}`,
        performanceScore,
        timestamp: new Date(),
        regime
      });
      
      console.log(`🔄 Weight adapted: ${regime}/${factorType} | ${currentWeight.toFixed(3)} → ${newWeight.toFixed(3)} | Score: ${performanceScore.toFixed(3)}`);
    }
    
    // Normalize weights within regime to prevent runaway growth
    this.normalizeRegimeWeights(regime);
  }

  private calculatePerformanceScore(performance: FactorPerformance): number {
    // Multi-objective performance score combining several metrics
    
    // 1. Win Rate component (centered around 0.5)
    const winRateScore = (performance.winRate - 0.5) * 2; // -1 to 1
    
    // 2. Profit Factor component
    const profitFactorScore = Math.tanh((performance.profitFactor - 1) / 2); // Normalized
    
    // 3. Sharpe Ratio component
    const sharpeScore = Math.tanh(performance.sharpeRatio / 2); // Normalized
    
    // 4. Recent performance trend
    const recentScore = this.calculateRecentTrend(performance.recentPerformance);
    
    // 5. Consistency score (lower volatility of returns)
    const consistencyScore = this.calculateConsistencyScore(performance.recentPerformance);
    
    // Weighted combination
    const compositeScore = 
      0.3 * winRateScore +
      0.25 * profitFactorScore +
      0.25 * sharpeScore +
      0.15 * recentScore +
      0.05 * consistencyScore;
    
    // Apply confidence scaling - less confident scores are dampened
    return compositeScore * performance.confidence;
  }

  private calculateRecentTrend(recentReturns: number[]): number {
    if (recentReturns.length < 5) return 0;
    
    // Calculate trend using simple linear regression slope
    const n = recentReturns.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = recentReturns;
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Normalize slope to -1 to 1 range
    return Math.tanh(slope * 100);
  }

  private calculateConsistencyScore(recentReturns: number[]): number {
    if (recentReturns.length < 3) return 0;
    
    const mean = recentReturns.reduce((sum, r) => sum + r, 0) / recentReturns.length;
    const variance = recentReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / recentReturns.length;
    const stdDev = Math.sqrt(variance);
    
    // Higher consistency (lower volatility) gets higher score
    // Use inverse relationship with bounds
    return Math.max(0, 1 - stdDev * 50); // Scale and invert
  }

  private applyWeightBounds(weight: number, confidence: number): number {
    // Conservative bounds when confidence is low
    const minWeight = 0.1 * confidence + 0.05 * (1 - confidence); // 0.05-0.1 range
    const maxWeight = 3.0 * confidence + 1.5 * (1 - confidence); // 1.5-3.0 range
    
    return Math.max(minWeight, Math.min(maxWeight, weight));
  }

  private normalizeRegimeWeights(regime: string): void {
    const weights = this.currentWeights[regime];
    if (!weights || Object.keys(weights).length === 0) return;
    
    // Calculate current total and target total
    const currentTotal = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const targetAverage = 1.0; // Target average weight
    const factorCount = Object.keys(weights).length;
    const targetTotal = targetAverage * factorCount;
    
    // Normalize if total is significantly different from target
    if (currentTotal > 0 && Math.abs(currentTotal - targetTotal) > targetTotal * 0.2) {
      const scaleFactor = targetTotal / currentTotal;
      
      Object.keys(weights).forEach(factorType => {
        weights[factorType] *= scaleFactor;
      });
      
      console.log(`🔧 Normalized weights for regime ${regime}: scale factor ${scaleFactor.toFixed(3)}`);
    }
  }

  // ==================== GENETIC ALGORITHM OPTIMIZATION ====================

  async initializePopulation(): Promise<void> {
    this.population = [];
    
    for (let i = 0; i < this.geneticParams.populationSize; i++) {
      const individual: Individual = {
        id: `ind_${i}_${Date.now()}`,
        weights: this.generateRandomWeights(),
        riskParameters: this.generateRandomRiskParameters(),
        fitness: 0,
        performance: {
          totalReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          winRate: 0.5,
          trades: 0
        }
      };
      
      this.population.push(individual);
    }
    
    console.log(`🧬 Initialized genetic algorithm population: ${this.population.length} individuals`);
  }

  private generateRandomWeights(): Record<string, number> {
    const factorTypes = ['technical', 'pattern', 'volume', 'momentum', 'news', 'fundamental'];
    const weights: Record<string, number> = {};
    
    factorTypes.forEach(type => {
      // Random weight between 0.2 and 2.0
      weights[type] = 0.2 + Math.random() * 1.8;
    });
    
    return weights;
  }

  private generateRandomRiskParameters(): Individual['riskParameters'] {
    return {
      maxRisk: 0.01 + Math.random() * 0.04, // 1-5% max risk
      kellyMultiplier: 0.1 + Math.random() * 0.4, // 10-50% of Kelly
      volatilityTarget: 0.05 + Math.random() * 0.15, // 5-20% target volatility
      drawdownLimit: 0.1 + Math.random() * 0.1 // 10-20% drawdown limit
    };
  }

  async evolvePopulation(historicalData: any[]): Promise<Individual> {
    // Evaluate fitness for all individuals
    await this.evaluateFitness(historicalData);
    
    for (let gen = 0; gen < this.geneticParams.generations; gen++) {
      this.generation = gen;
      
      // Selection, Crossover, and Mutation
      const newPopulation = await this.createNextGeneration();
      this.population = newPopulation;
      
      // Re-evaluate fitness
      await this.evaluateFitness(historicalData);
      
      if (gen % 10 === 0) {
        const best = this.getBestIndividual();
        console.log(`🧬 Generation ${gen}: Best fitness = ${best.fitness.toFixed(4)}, Return = ${(best.performance.totalReturn * 100).toFixed(2)}%`);
      }
    }
    
    return this.getBestIndividual();
  }

  private async evaluateFitness(historicalData: any[]): Promise<void> {
    // Simplified fitness evaluation using historical performance simulation
    // In production, this would run full backtests
    
    this.population.forEach(individual => {
      const performance = this.simulatePerformance(individual, historicalData);
      individual.performance = performance;
      individual.fitness = this.calculateFitness(performance);
    });
  }

  private simulatePerformance(individual: Individual, historicalData: any[]): Individual['performance'] {
    // Simplified performance simulation
    // In production, implement full backtesting with the individual's parameters
    
    let totalReturn = 0;
    let returns: number[] = [];
    let trades = 0;
    let wins = 0;
    let maxDrawdown = 0;
    let runningMax = 0;
    
    // Simulate trades based on weights and risk parameters
    for (let i = 50; i < historicalData.length - 1; i++) {
      const tradeProb = 0.1; // 10% chance of trade per period
      
      if (Math.random() < tradeProb) {
        trades++;
        
        // Simulate trade return based on individual's parameters
        const baseReturn = (Math.random() - 0.4) * 0.02; // Slightly positive bias
        const riskAdjustedReturn = baseReturn * individual.riskParameters.maxRisk * 50; // Scale by risk
        
        totalReturn += riskAdjustedReturn;
        returns.push(riskAdjustedReturn);
        
        if (riskAdjustedReturn > 0) wins++;
        
        // Track drawdown
        if (totalReturn > runningMax) {
          runningMax = totalReturn;
        } else {
          const drawdown = (runningMax - totalReturn) / Math.max(1, runningMax);
          maxDrawdown = Math.max(maxDrawdown, drawdown);
        }
      }
    }
    
    // Calculate Sharpe ratio
    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    const variance = returns.length > 1 ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1) : 0;
    const sharpeRatio = Math.sqrt(variance) > 0 ? avgReturn / Math.sqrt(variance) * Math.sqrt(252) : 0;
    
    return {
      totalReturn,
      sharpeRatio,
      maxDrawdown,
      winRate: trades > 0 ? wins / trades : 0.5,
      trades
    };
  }

  private calculateFitness(performance: Individual['performance']): number {
    // Multi-objective fitness function
    switch (this.geneticParams.fitnessFunction) {
      case 'sharpe':
        return performance.sharpeRatio;
      
      case 'return':
        return performance.totalReturn;
      
      case 'calmar':
        return performance.maxDrawdown > 0 ? performance.totalReturn / performance.maxDrawdown : 0;
      
      case 'multi_objective':
      default:
        // Weighted combination of objectives
        const returnScore = performance.totalReturn * 2; // Weight: 2
        const sharpeScore = performance.sharpeRatio * 0.5; // Weight: 0.5
        const drawdownPenalty = -performance.maxDrawdown * 3; // Weight: -3
        const winRateScore = (performance.winRate - 0.5) * 0.5; // Weight: 0.5
        
        return returnScore + sharpeScore + drawdownPenalty + winRateScore;
    }
  }

  private async createNextGeneration(): Promise<Individual[]> {
    const newPopulation: Individual[] = [];
    
    // Elitism - keep best individuals
    const sortedPop = [...this.population].sort((a, b) => b.fitness - a.fitness);
    for (let i = 0; i < this.geneticParams.eliteSize; i++) {
      newPopulation.push({ ...sortedPop[i], id: `elite_${i}_${this.generation}` });
    }
    
    // Generate rest through crossover and mutation
    while (newPopulation.length < this.geneticParams.populationSize) {
      // Selection
      const parent1 = this.tournamentSelection();
      const parent2 = this.tournamentSelection();
      
      // Crossover
      let offspring = this.crossover(parent1, parent2);
      
      // Mutation
      offspring = this.mutate(offspring);
      
      newPopulation.push(offspring);
    }
    
    return newPopulation;
  }

  private tournamentSelection(): Individual {
    // Select best from random tournament
    const tournamentSize = 3;
    const tournament = [];
    
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * this.population.length);
      tournament.push(this.population[randomIndex]);
    }
    
    return tournament.sort((a, b) => b.fitness - a.fitness)[0];
  }

  private crossover(parent1: Individual, parent2: Individual): Individual {
    if (Math.random() > this.geneticParams.crossoverRate) {
      return { ...parent1, id: `child_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` };
    }
    
    const offspring: Individual = {
      id: `crossover_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      weights: {},
      riskParameters: {} as any,
      fitness: 0,
      performance: {
        totalReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0.5,
        trades: 0
      }
    };
    
    // Uniform crossover for weights
    Object.keys(parent1.weights).forEach(key => {
      offspring.weights[key] = Math.random() < 0.5 ? parent1.weights[key] : parent2.weights[key];
    });
    
    // Uniform crossover for risk parameters
    offspring.riskParameters = {
      maxRisk: Math.random() < 0.5 ? parent1.riskParameters.maxRisk : parent2.riskParameters.maxRisk,
      kellyMultiplier: Math.random() < 0.5 ? parent1.riskParameters.kellyMultiplier : parent2.riskParameters.kellyMultiplier,
      volatilityTarget: Math.random() < 0.5 ? parent1.riskParameters.volatilityTarget : parent2.riskParameters.volatilityTarget,
      drawdownLimit: Math.random() < 0.5 ? parent1.riskParameters.drawdownLimit : parent2.riskParameters.drawdownLimit
    };
    
    return offspring;
  }

  private mutate(individual: Individual): Individual {
    const mutated = { ...individual, id: `mutated_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` };
    
    // Mutate weights
    Object.keys(mutated.weights).forEach(key => {
      if (Math.random() < this.geneticParams.mutationRate) {
        // Gaussian mutation
        const mutation = (Math.random() - 0.5) * 0.2; // ±10% mutation
        mutated.weights[key] = Math.max(0.1, Math.min(3.0, mutated.weights[key] * (1 + mutation)));
      }
    });
    
    // Mutate risk parameters
    if (Math.random() < this.geneticParams.mutationRate) {
      const mutation = (Math.random() - 0.5) * 0.1;
      mutated.riskParameters.maxRisk = Math.max(0.005, Math.min(0.05, mutated.riskParameters.maxRisk * (1 + mutation)));
    }
    
    if (Math.random() < this.geneticParams.mutationRate) {
      const mutation = (Math.random() - 0.5) * 0.1;
      mutated.riskParameters.kellyMultiplier = Math.max(0.05, Math.min(0.8, mutated.riskParameters.kellyMultiplier * (1 + mutation)));
    }
    
    return mutated;
  }

  private getBestIndividual(): Individual {
    return this.population.sort((a, b) => b.fitness - a.fitness)[0];
  }

  // ==================== UTILITY FUNCTIONS ====================

  private initializeDefaultWeights(): void {
    const regimes = ['trending_bullish', 'trending_bearish', 'ranging_tight', 'ranging_volatile', 'shock_up', 'shock_down', 'news_driven'];
    const factorTypes = ['technical', 'pattern', 'volume', 'momentum', 'news', 'fundamental'];
    
    regimes.forEach(regime => {
      this.currentWeights[regime] = {};
      factorTypes.forEach(type => {
        this.currentWeights[regime][type] = 1.0; // Start with neutral weights
      });
    });
  }

  private logWeightUpdate(update: WeightUpdate): void {
    this.weightHistory.push(update);
    
    // Keep last 1000 updates
    if (this.weightHistory.length > 1000) {
      this.weightHistory.shift();
    }
  }

  // ==================== PUBLIC INTERFACE ====================

  getWeights(regime: string): Record<string, number> {
    return this.currentWeights[regime] ? { ...this.currentWeights[regime] } : {};
  }

  getAllWeights(): Record<string, Record<string, number>> {
    return JSON.parse(JSON.stringify(this.currentWeights));
  }

  getFactorPerformance(regime: string, factorType: string): FactorPerformance | null {
    for (const [key, performance] of this.factorPerformance.entries()) {
      if (key.startsWith(`${regime}_${factorType}_`)) {
        return { ...performance };
      }
    }
    return null;
  }

  getWeightHistory(days: number = 7): WeightUpdate[] {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.weightHistory.filter(update => update.timestamp >= cutoff);
  }

  resetWeights(regime?: string): void {
    if (regime) {
      const factorTypes = Object.keys(this.currentWeights[regime] || {});
      factorTypes.forEach(type => {
        this.currentWeights[regime][type] = 1.0;
      });
      console.log(`🔄 Reset weights for regime: ${regime}`);
    } else {
      this.initializeDefaultWeights();
      console.log('🔄 Reset all weights to default');
    }
  }

  async optimizeWeights(historicalData: any[]): Promise<Record<string, number>> {
    console.log('🧬 Starting genetic algorithm optimization...');
    
    await this.initializePopulation();
    const bestIndividual = await this.evolvePopulation(historicalData);
    
    console.log(`🏆 Optimization complete! Best fitness: ${bestIndividual.fitness.toFixed(4)}`);
    console.log(`📊 Best performance: Return ${(bestIndividual.performance.totalReturn * 100).toFixed(2)}%, Sharpe ${bestIndividual.performance.sharpeRatio.toFixed(2)}`);
    
    return bestIndividual.weights;
  }
  
  getSystemStats(): {
    totalFactors: number;
    totalUpdates: number;
    avgPerformance: number;
    bestRegime: string;
    worstRegime: string;
  } {
    const totalFactors = this.factorPerformance.size;
    const totalUpdates = this.weightHistory.length;
    
    // Calculate average performance across all factors
    let totalReturn = 0;
    let factorCount = 0;
    let regimePerformance: Record<string, number> = {};
    
    for (const [key, performance] of this.factorPerformance.entries()) {
      if (performance.totalTrades >= 5) {
        totalReturn += performance.totalReturn;
        factorCount++;
        
        const regime = key.split('_')[0];
        regimePerformance[regime] = (regimePerformance[regime] || 0) + performance.totalReturn;
      }
    }
    
    const avgPerformance = factorCount > 0 ? totalReturn / factorCount : 0;
    
    const regimeEntries = Object.entries(regimePerformance);
    const bestRegime = regimeEntries.length > 0 ? 
      regimeEntries.sort((a, b) => b[1] - a[1])[0][0] : 'unknown';
    const worstRegime = regimeEntries.length > 0 ? 
      regimeEntries.sort((a, b) => a[1] - b[1])[0][0] : 'unknown';
    
    return {
      totalFactors,
      totalUpdates,
      avgPerformance,
      bestRegime,
      worstRegime
    };
  }
}
