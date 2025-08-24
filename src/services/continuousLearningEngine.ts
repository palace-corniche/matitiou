interface LearningMetrics {
  signalAccuracy: number; // % of signals that were profitable
  averageReturn: number; // Average return per signal
  sharpeRatio: number; // Risk-adjusted return
  maxDrawdown: number; // Maximum consecutive loss
  winRate: number; // % of winning signals
  averageWin: number; // Average winning signal return
  averageLoss: number; // Average losing signal return
  profitFactor: number; // Gross profit / Gross loss
}

interface ModelPerformance {
  timeframe: string;
  totalSignals: number;
  lastUpdated: string;
  metrics: LearningMetrics;
  parameterDrift: Record<string, number>; // How much parameters have drifted
  adaptationHistory: Array<{
    timestamp: string;
    parameter: string;
    oldValue: number;
    newValue: number;
    reason: string;
  }>;
}

interface OutcomeData {
  signalId: string;
  entryPrice: number;
  exitPrice?: number;
  entryTime: string;
  exitTime?: string;
  actualReturn: number;
  predictedReturn: number;
  signalStrength: number;
  confluenceScore: number;
  regime: string;
  factors: any[];
  wasCorrectDirection: boolean;
  holdingTimeMinutes?: number;
}

interface ParameterOptimization {
  parameter: string;
  currentValue: number;
  suggestedValue: number;
  confidence: number; // 0-1
  expectedImprovement: number; // Expected % improvement in performance
  backtestResults: {
    currentPerformance: number;
    optimizedPerformance: number;
    sampleSize: number;
  };
}

export class ContinuousLearningEngine {
  private outcomeHistory: OutcomeData[] = [];
  private performanceMetrics: ModelPerformance;
  private parameterHistory: Map<string, Array<{ timestamp: string; value: number; performance: number }>> = new Map();
  private learningConfig: {
    minSampleSize: number;
    performanceWindow: number; // hours
    recalibrationThreshold: number; // performance drop % to trigger recalibration
    maxParameterDrift: number; // maximum allowed parameter change per update
  };

  constructor() {
    this.learningConfig = {
      minSampleSize: 50,
      performanceWindow: 168, // 7 days
      recalibrationThreshold: 0.1, // 10% performance drop
      maxParameterDrift: 0.2 // 20% max change
    };

    this.performanceMetrics = this.initializePerformance();
  }

  private initializePerformance(): ModelPerformance {
    return {
      timeframe: '15m',
      totalSignals: 0,
      lastUpdated: new Date().toISOString(),
      metrics: {
        signalAccuracy: 0,
        averageReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        averageWin: 0,
        averageLoss: 0,
        profitFactor: 0
      },
      parameterDrift: {},
      adaptationHistory: []
    };
  }

  addOutcome(outcome: OutcomeData): void {
    this.outcomeHistory.push(outcome);
    
    // Keep only recent outcomes (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.outcomeHistory = this.outcomeHistory.filter(o => new Date(o.entryTime) > thirtyDaysAgo);
    
    // Update metrics if we have enough data
    if (this.outcomeHistory.length >= this.learningConfig.minSampleSize) {
      this.updatePerformanceMetrics();
      this.checkForRecalibration();
    }
  }

  private updatePerformanceMetrics(): void {
    const recent = this.getRecentOutcomes();
    if (recent.length === 0) return;

    const returns = recent.map(o => o.actualReturn);
    const wins = recent.filter(o => o.actualReturn > 0);
    const losses = recent.filter(o => o.actualReturn <= 0);
    
    const totalReturn = returns.reduce((sum, r) => sum + r, 0);
    const avgReturn = totalReturn / recent.length;
    
    // Calculate Sharpe ratio (simplified - using return std dev)
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
    
    // Calculate maximum drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let runningReturn = 0;
    
    for (const ret of returns) {
      runningReturn += ret;
      peak = Math.max(peak, runningReturn);
      const drawdown = peak - runningReturn;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    // Calculate signal accuracy (predicted direction vs actual)
    const correctDirections = recent.filter(o => o.wasCorrectDirection).length;
    const signalAccuracy = (correctDirections / recent.length) * 100;
    
    this.performanceMetrics = {
      ...this.performanceMetrics,
      totalSignals: recent.length,
      lastUpdated: new Date().toISOString(),
      metrics: {
        signalAccuracy,
        averageReturn: avgReturn,
        sharpeRatio,
        maxDrawdown: maxDrawdown * 100, // Convert to percentage
        winRate: (wins.length / recent.length) * 100,
        averageWin: wins.length > 0 ? wins.reduce((sum, w) => sum + w.actualReturn, 0) / wins.length : 0,
        averageLoss: losses.length > 0 ? Math.abs(losses.reduce((sum, l) => sum + l.actualReturn, 0) / losses.length) : 0,
        profitFactor: losses.length > 0 ? 
          Math.abs(wins.reduce((sum, w) => sum + w.actualReturn, 0) / losses.reduce((sum, l) => sum + l.actualReturn, 0)) : 
          wins.length > 0 ? Infinity : 0
      }
    };

    console.log(`📊 Updated performance metrics: ${signalAccuracy.toFixed(1)}% accuracy, ${(avgReturn * 100).toFixed(2)}% avg return, ${sharpeRatio.toFixed(2)} Sharpe`);
  }

  private checkForRecalibration(): void {
    const current = this.performanceMetrics.metrics;
    
    // Trigger recalibration if performance has degraded significantly
    const performanceScore = (current.signalAccuracy / 100) * 0.4 + 
                            Math.max(0, current.sharpeRatio) * 0.3 + 
                            (current.winRate / 100) * 0.3;
    
    // Store historical performance
    const now = new Date().toISOString();
    if (!this.parameterHistory.has('performance_score')) {
      this.parameterHistory.set('performance_score', []);
    }
    
    const perfHistory = this.parameterHistory.get('performance_score')!;
    perfHistory.push({ timestamp: now, value: performanceScore, performance: performanceScore });
    
    // Keep only recent history
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.parameterHistory.set('performance_score', 
      perfHistory.filter(p => new Date(p.timestamp) > sevenDaysAgo)
    );
    
    // Check if recalibration is needed
    if (perfHistory.length >= 10) {
      const recentAvg = perfHistory.slice(-5).reduce((sum, p) => sum + p.value, 0) / 5;
      const historicalAvg = perfHistory.slice(0, -5).reduce((sum, p) => sum + p.value, 0) / (perfHistory.length - 5);
      
      const performanceDrop = (historicalAvg - recentAvg) / historicalAvg;
      
      if (performanceDrop > this.learningConfig.recalibrationThreshold) {
        console.log(`🔄 Performance drop detected: ${(performanceDrop * 100).toFixed(1)}% - triggering recalibration`);
        this.performRecalibration();
      }
    }
  }

  private performRecalibration(): void {
    const optimizations = this.identifyParameterOptimizations();
    
    for (const opt of optimizations) {
      if (opt.confidence > 0.7 && opt.expectedImprovement > 0.05) {
        console.log(`🎯 Applying optimization: ${opt.parameter} ${opt.currentValue} → ${opt.suggestedValue} (expected +${(opt.expectedImprovement * 100).toFixed(1)}%)`);
        
        // Record the adaptation
        this.performanceMetrics.adaptationHistory.push({
          timestamp: new Date().toISOString(),
          parameter: opt.parameter,
          oldValue: opt.currentValue,
          newValue: opt.suggestedValue,
          reason: `Performance optimization (+${(opt.expectedImprovement * 100).toFixed(1)}%)`
        });
        
        // Update parameter drift tracking
        const drift = Math.abs(opt.suggestedValue - opt.currentValue) / opt.currentValue;
        this.performanceMetrics.parameterDrift[opt.parameter] = drift;
      }
    }
  }

  private identifyParameterOptimizations(): ParameterOptimization[] {
    const optimizations: ParameterOptimization[] = [];
    const recent = this.getRecentOutcomes();
    
    if (recent.length < this.learningConfig.minSampleSize) {
      return optimizations;
    }

    // Analyze optimal confluence score thresholds
    optimizations.push(...this.optimizeConfluenceThresholds(recent));
    
    // Analyze optimal strength requirements
    optimizations.push(...this.optimizeStrengthThresholds(recent));
    
    // Analyze regime-specific performance
    optimizations.push(...this.optimizeRegimeWeights(recent));
    
    return optimizations;
  }

  private optimizeConfluenceThresholds(outcomes: OutcomeData[]): ParameterOptimization[] {
    const optimizations: ParameterOptimization[] = [];
    
    // Test different confluence score thresholds
    const thresholds = [5, 10, 15, 20, 25, 30, 35, 40];
    const currentThreshold = 15; // Current default
    
    let bestThreshold = currentThreshold;
    let bestPerformance = 0;
    
    for (const threshold of thresholds) {
      const filtered = outcomes.filter(o => o.confluenceScore >= threshold);
      if (filtered.length < 10) continue; // Need minimum sample size
      
      const performance = this.calculatePerformanceScore(filtered);
      if (performance > bestPerformance) {
        bestPerformance = performance;
        bestThreshold = threshold;
      }
    }
    
    if (bestThreshold !== currentThreshold && Math.abs(bestThreshold - currentThreshold) / currentThreshold <= this.learningConfig.maxParameterDrift) {
      const improvement = (bestPerformance - this.calculatePerformanceScore(outcomes.filter(o => o.confluenceScore >= currentThreshold))) / bestPerformance;
      
      optimizations.push({
        parameter: 'confluence_threshold',
        currentValue: currentThreshold,
        suggestedValue: bestThreshold,
        confidence: Math.min(1, outcomes.length / 100), // More confidence with more data
        expectedImprovement: improvement,
        backtestResults: {
          currentPerformance: this.calculatePerformanceScore(outcomes.filter(o => o.confluenceScore >= currentThreshold)),
          optimizedPerformance: bestPerformance,
          sampleSize: outcomes.filter(o => o.confluenceScore >= bestThreshold).length
        }
      });
    }
    
    return optimizations;
  }

  private optimizeStrengthThresholds(outcomes: OutcomeData[]): ParameterOptimization[] {
    const optimizations: ParameterOptimization[] = [];
    
    // Test different strength thresholds
    const strengthThresholds = [3, 4, 5, 6, 7, 8];
    const currentThreshold = 5;
    
    let bestThreshold = currentThreshold;
    let bestPerformance = 0;
    
    for (const threshold of strengthThresholds) {
      const filtered = outcomes.filter(o => o.signalStrength >= threshold);
      if (filtered.length < 10) continue;
      
      const performance = this.calculatePerformanceScore(filtered);
      if (performance > bestPerformance) {
        bestPerformance = performance;
        bestThreshold = threshold;
      }
    }
    
    if (bestThreshold !== currentThreshold) {
      const currentPerf = this.calculatePerformanceScore(outcomes.filter(o => o.signalStrength >= currentThreshold));
      const improvement = (bestPerformance - currentPerf) / Math.max(currentPerf, 0.001);
      
      optimizations.push({
        parameter: 'strength_threshold',
        currentValue: currentThreshold,
        suggestedValue: bestThreshold,
        confidence: Math.min(1, outcomes.length / 75),
        expectedImprovement: improvement,
        backtestResults: {
          currentPerformance: currentPerf,
          optimizedPerformance: bestPerformance,
          sampleSize: outcomes.filter(o => o.signalStrength >= bestThreshold).length
        }
      });
    }
    
    return optimizations;
  }

  private optimizeRegimeWeights(outcomes: OutcomeData[]): ParameterOptimization[] {
    const optimizations: ParameterOptimization[] = [];
    
    // Analyze performance by regime
    const regimePerformance: Record<string, { returns: number[]; count: number }> = {};
    
    for (const outcome of outcomes) {
      if (!regimePerformance[outcome.regime]) {
        regimePerformance[outcome.regime] = { returns: [], count: 0 };
      }
      regimePerformance[outcome.regime].returns.push(outcome.actualReturn);
      regimePerformance[outcome.regime].count++;
    }
    
    // Current weights
    const currentWeights = {
      trending: 1.2,
      ranging: 0.9,
      shock: 0.6,
      news_driven: 0.7
    };
    
    for (const [regime, data] of Object.entries(regimePerformance)) {
      if (data.count < 5) continue; // Need minimum sample size
      
      const avgReturn = data.returns.reduce((sum, r) => sum + r, 0) / data.returns.length;
      const winRate = data.returns.filter(r => r > 0).length / data.returns.length;
      const performanceScore = avgReturn * winRate;
      
      // Suggest weight based on performance
      const baseWeight = currentWeights[regime as keyof typeof currentWeights] || 1.0;
      const suggestedWeight = Math.max(0.3, Math.min(1.5, baseWeight * (1 + performanceScore * 2)));
      
      if (Math.abs(suggestedWeight - baseWeight) / baseWeight > 0.1) { // Significant change
        optimizations.push({
          parameter: `regime_weight_${regime}`,
          currentValue: baseWeight,
          suggestedValue: suggestedWeight,
          confidence: Math.min(1, data.count / 20),
          expectedImprovement: Math.abs(performanceScore) * 0.1, // Estimated improvement
          backtestResults: {
            currentPerformance: performanceScore,
            optimizedPerformance: performanceScore * 1.1, // Estimated
            sampleSize: data.count
          }
        });
      }
    }
    
    return optimizations;
  }

  private calculatePerformanceScore(outcomes: OutcomeData[]): number {
    if (outcomes.length === 0) return 0;
    
    const returns = outcomes.map(o => o.actualReturn);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const winRate = returns.filter(r => r > 0).length / returns.length;
    const profitFactor = this.calculateProfitFactor(returns);
    
    // Composite score
    return avgReturn * 0.4 + winRate * 0.3 + Math.min(profitFactor / 2, 0.5) * 0.3;
  }

  private calculateProfitFactor(returns: number[]): number {
    const wins = returns.filter(r => r > 0);
    const losses = returns.filter(r => r <= 0);
    
    if (losses.length === 0) return wins.length > 0 ? Infinity : 0;
    
    const grossProfit = wins.reduce((sum, w) => sum + w, 0);
    const grossLoss = Math.abs(losses.reduce((sum, l) => sum + l, 0));
    
    return grossLoss > 0 ? grossProfit / grossLoss : 0;
  }

  private getRecentOutcomes(): OutcomeData[] {
    const cutoff = new Date(Date.now() - this.learningConfig.performanceWindow * 60 * 60 * 1000);
    return this.outcomeHistory.filter(o => new Date(o.entryTime) > cutoff);
  }

  // Public API methods
  getPerformanceMetrics(): ModelPerformance {
    return { ...this.performanceMetrics };
  }

  getOptimizationRecommendations(): ParameterOptimization[] {
    return this.identifyParameterOptimizations();
  }

  getCounterfactualAnalysis(): Array<{
    period: string;
    acceptedSignals: number;
    rejectedSignals: number;
    missedOpportunities: number;
    estimatedMissedProfit: number;
  }> {
    // Analyze signals that were rejected but would have been profitable
    const analysis = [];
    const recent = this.getRecentOutcomes();
    
    // This would require storing rejected signals too, which we'd implement separately
    // For now, return basic structure
    analysis.push({
      period: 'last_7_days',
      acceptedSignals: recent.length,
      rejectedSignals: 0, // Would need to track this
      missedOpportunities: 0, // Would calculate from rejected profitable signals
      estimatedMissedProfit: 0
    });
    
    return analysis;
  }

  getAdaptationHistory(): Array<{
    timestamp: string;
    parameter: string;
    oldValue: number;
    newValue: number;
    reason: string;
  }> {
    return [...this.performanceMetrics.adaptationHistory];
  }

  forceRecalibration(): void {
    console.log('🔄 Forcing system recalibration...');
    this.performRecalibration();
  }

  getSystemHealth(): {
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
    issues: string[];
    recommendations: string[];
    lastUpdate: string;
  } {
    const metrics = this.performanceMetrics.metrics;
    const issues = [];
    const recommendations = [];
    
    // Assess health
    let healthScore = 0;
    
    if (metrics.signalAccuracy > 60) healthScore += 25;
    else if (metrics.signalAccuracy > 50) healthScore += 15;
    else issues.push('Signal accuracy below 50%');
    
    if (metrics.sharpeRatio > 1) healthScore += 25;
    else if (metrics.sharpeRatio > 0.5) healthScore += 15;
    else issues.push('Poor risk-adjusted returns');
    
    if (metrics.winRate > 55) healthScore += 25;
    else if (metrics.winRate > 45) healthScore += 15;
    else issues.push('Win rate below 45%');
    
    if (metrics.profitFactor > 1.5) healthScore += 25;
    else if (metrics.profitFactor > 1.0) healthScore += 15;
    else issues.push('Profit factor below 1.0');
    
    // Generate recommendations
    if (metrics.signalAccuracy < 55) {
      recommendations.push('Increase confluence score threshold to filter low-quality signals');
    }
    if (metrics.maxDrawdown > 20) {
      recommendations.push('Implement tighter risk management controls');
    }
    if (this.outcomeHistory.length < 100) {
      recommendations.push('Collect more performance data for better optimization');
    }
    
    const overallHealth = healthScore >= 80 ? 'excellent' : 
                         healthScore >= 60 ? 'good' : 
                         healthScore >= 40 ? 'fair' : 'poor';
    
    return {
      overallHealth,
      issues,
      recommendations,
      lastUpdate: this.performanceMetrics.lastUpdated
    };
  }
}
