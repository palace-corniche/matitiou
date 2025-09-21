// Option D: Professional Portfolio Management
// Multi-currency portfolio optimization with intelligence-based allocation

import { supabase } from '@/integrations/supabase/client';
import { AdvancedPositionSizing } from './advancedPositionSizing';
import { marketIntelligenceEngine, MarketIntelligence } from './marketIntelligenceEngine';

export interface CurrencyAllocation {
  currencyPair: string;
  targetAllocationPercent: number;
  currentAllocationPercent: number;
  intelligenceConfidence: number;
  riskBudgetAllocated: number;
  correlationAdjustment: number;
  regimeBasedScaling: number;
  lastRebalance: Date;
  performance: {
    return30d: number;
    volatility30d: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
}

export interface PortfolioAllocation {
  portfolioId: string;
  totalValue: number;
  allocations: CurrencyAllocation[];
  riskMetrics: {
    totalRisk: number;
    diversificationBenefit: number;
    concentrationRisk: number;
    correlationRisk: number;
    regimeRisk: number;
  };
  rebalanceRecommendations: RebalanceRecommendation[];
  complianceStatus: ComplianceCheck[];
  lastUpdated: Date;
}

export interface RebalanceRecommendation {
  currencyPair: string;
  currentAllocation: number;
  targetAllocation: number;
  recommendedAction: 'increase' | 'decrease' | 'hold';
  urgency: 'high' | 'medium' | 'low';
  reasoning: string[];
  expectedImpact: {
    riskReduction: number;
    returnImprovement: number;
    diversificationBenefit: number;
  };
}

export interface ComplianceCheck {
  rule: string;
  status: 'compliant' | 'warning' | 'violation';
  currentValue: number;
  limit: number;
  description: string;
  action?: string;
}

export interface PerformanceReport {
  portfolioId: string;
  period: string;
  summary: {
    totalReturn: number;
    totalReturnPercent: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    bestPerformingPair: string;
    worstPerformingPair: string;
  };
  attribution: {
    [currencyPair: string]: {
      contribution: number;
      weight: number;
      return: number;
      intelligence: {
        avgConfidence: number;
        signalAccuracy: number;
        avgStrength: number;
      };
    };
  };
  riskAnalysis: {
    var95: number;
    cvar95: number;
    correlationMatrix: number[][];
    concentrationRisk: number;
    regimeExposure: { [regime: string]: number };
  };
  recommendations: string[];
}

class PortfolioIntelligenceManager {
  private positionSizer = new AdvancedPositionSizing();
  private correlationMatrix: Map<string, Map<string, number>> = new Map();
  
  // Default currency pairs for professional portfolio
  private readonly DEFAULT_CURRENCY_PAIRS = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 
    'AUD/USD', 'USD/CAD', 'EUR/GBP', 'EUR/JPY'
  ];

  // ==================== MAIN PORTFOLIO MANAGEMENT ====================
  
  async optimizePortfolioAllocation(portfolioId: string): Promise<PortfolioAllocation> {
    console.log(`📊 Optimizing portfolio allocation for ${portfolioId}...`);
    
    try {
      // Get current portfolio state
      const portfolio = await this.getPortfolioData(portfolioId);
      
      // Get intelligence for all currency pairs
      const intelligenceData = await this.gatherMultiCurrencyIntelligence();
      
      // Calculate correlation matrix
      await this.updateCorrelationMatrix();
      
      // Get current allocations
      const currentAllocations = await this.getCurrentAllocations(portfolioId);
      
      // Calculate optimal allocations
      const optimizedAllocations = await this.calculateOptimalAllocations(
        portfolio,
        intelligenceData,
        currentAllocations
      );
      
      // Calculate risk metrics
      const riskMetrics = this.calculatePortfolioRiskMetrics(optimizedAllocations);
      
      // Generate rebalance recommendations
      const rebalanceRecommendations = this.generateRebalanceRecommendations(
        currentAllocations,
        optimizedAllocations,
        intelligenceData
      );
      
      // Check compliance
      const complianceStatus = await this.checkPortfolioCompliance(portfolioId, optimizedAllocations);
      
      const allocation: PortfolioAllocation = {
        portfolioId,
        totalValue: portfolio.balance,
        allocations: optimizedAllocations,
        riskMetrics,
        rebalanceRecommendations,
        complianceStatus,
        lastUpdated: new Date()
      };
      
      // Save allocation plan
      await this.savePortfolioAllocation(allocation);
      
      console.log(`✅ Portfolio optimization completed: ${optimizedAllocations.length} pairs allocated`);
      
      return allocation;
      
    } catch (error) {
      console.error('Error optimizing portfolio allocation:', error);
      throw error;
    }
  }

  // ==================== INTELLIGENCE-BASED ALLOCATION ====================
  
  private async gatherMultiCurrencyIntelligence(): Promise<{ [pair: string]: MarketIntelligence }> {
    const intelligence: { [pair: string]: MarketIntelligence } = {};
    
    for (const pair of this.DEFAULT_CURRENCY_PAIRS) {
      try {
        intelligence[pair] = await marketIntelligenceEngine.getMarketIntelligence(pair);
      } catch (error) {
        console.error(`Error getting intelligence for ${pair}:`, error);
        // Continue with other pairs
      }
    }
    
    return intelligence;
  }

  private async calculateOptimalAllocations(
    portfolio: any,
    intelligence: { [pair: string]: MarketIntelligence },
    currentAllocations: CurrencyAllocation[]
  ): Promise<CurrencyAllocation[]> {
    const optimizedAllocations: CurrencyAllocation[] = [];
    
    // Calculate intelligence scores for each pair
    const intelligenceScores = this.calculateIntelligenceScores(intelligence);
    
    // Apply Mean Variance Optimization with intelligence overlay
    const mvoWeights = await this.calculateMVOWeights(intelligenceScores);
    
    // Apply regime-based scaling
    const regimeAdjustedWeights = this.applyRegimeScaling(mvoWeights, intelligence);
    
    // Apply correlation constraints
    const correlationAdjustedWeights = this.applyCorrelationConstraints(regimeAdjustedWeights);
    
    // Build final allocations
    for (const pair of this.DEFAULT_CURRENCY_PAIRS) {
      const currentAllocation = currentAllocations.find(a => a.currencyPair === pair);
      const targetWeight = correlationAdjustedWeights[pair] || 0;
      
      // Skip if target allocation is too small
      if (targetWeight < 0.02) continue; // Minimum 2%
      
      const allocation: CurrencyAllocation = {
        currencyPair: pair,
        targetAllocationPercent: targetWeight,
        currentAllocationPercent: currentAllocation?.currentAllocationPercent || 0,
        intelligenceConfidence: intelligenceScores[pair]?.confidence || 0.5,
        riskBudgetAllocated: targetWeight * 0.8, // 80% of allocation as risk budget
        correlationAdjustment: this.getCorrelationAdjustment(pair, correlationAdjustedWeights),
        regimeBasedScaling: this.getRegimeScaling(pair, intelligence[pair]),
        lastRebalance: currentAllocation?.lastRebalance || new Date(),
        performance: await this.calculatePairPerformance(pair)
      };
      
      optimizedAllocations.push(allocation);
    }
    
    // Normalize allocations to 100%
    return this.normalizeAllocations(optimizedAllocations);
  }

  private calculateIntelligenceScores(intelligence: { [pair: string]: MarketIntelligence }): {
    [pair: string]: { score: number; confidence: number; direction: number }
  } {
    const scores: { [pair: string]: { score: number; confidence: number; direction: number } } = {};
    
    for (const [pair, intel] of Object.entries(intelligence)) {
      // Calculate composite intelligence score
      let score = 0;
      let confidence = 0;
      let direction = 0; // -1 to 1
      
      // Regime contribution (40% weight)
      const regimeScore = intel.regime.confidence * 0.4;
      if (intel.regime.regime === 'risk-on') {
        direction += regimeScore;
      } else if (intel.regime.regime === 'risk-off') {
        direction -= regimeScore;
      }
      score += regimeScore;
      confidence += intel.regime.confidence * 0.4;
      
      // Sentiment contribution (30% weight)
      const sentimentScore = intel.sentiment.confidence * 0.3;
      direction += (intel.sentiment.overallSentiment / 100) * sentimentScore;
      score += sentimentScore;
      confidence += intel.sentiment.confidence * 0.3;
      
      // Economic surprises (20% weight)
      if (intel.surprises.length > 0) {
        const avgSurprise = intel.surprises.reduce((sum, s) => sum + s.surprise, 0) / intel.surprises.length;
        const surpriseScore = 0.2;
        direction += Math.max(-1, Math.min(1, avgSurprise / 10)) * surpriseScore;
        score += surpriseScore;
        confidence += 0.8 * 0.2; // Assume 80% confidence for economic data
      }
      
      // Central bank signals (10% weight)
      if (intel.centralBankSignals.length > 0) {
        const avgCBConfidence = intel.centralBankSignals.reduce((sum, cb) => sum + cb.confidence, 0) / intel.centralBankSignals.length;
        const cbScore = avgCBConfidence * 0.1;
        score += cbScore;
        confidence += avgCBConfidence * 0.1;
        
        // Direction from CB signals (simplified)
        const hawkishSignals = intel.centralBankSignals.filter(cb => cb.signal === 'hawkish').length;
        const dovishSignals = intel.centralBankSignals.filter(cb => cb.signal === 'dovish').length;
        if (hawkishSignals > dovishSignals) direction += cbScore;
        else if (dovishSignals > hawkishSignals) direction -= cbScore;
      }
      
      scores[pair] = {
        score: Math.max(0, Math.min(1, score)),
        confidence: Math.max(0, Math.min(1, confidence)),
        direction: Math.max(-1, Math.min(1, direction))
      };
    }
    
    return scores;
  }

  private async calculateMVOWeights(intelligenceScores: { [pair: string]: any }): Promise<{ [pair: string]: number }> {
    // Simplified Mean Variance Optimization
    // In production, this would use historical returns and covariance matrix
    
    const weights: { [pair: string]: number } = {};
    const pairs = Object.keys(intelligenceScores);
    
    // Equal weight base allocation
    const baseWeight = 1 / pairs.length;
    
    // Adjust based on intelligence scores
    let totalAdjustedScore = 0;
    const adjustedScores: { [pair: string]: number } = {};
    
    pairs.forEach(pair => {
      const intel = intelligenceScores[pair];
      // Higher confidence and higher absolute direction get more weight
      const adjustedScore = intel.confidence * (1 + Math.abs(intel.direction));
      adjustedScores[pair] = adjustedScore;
      totalAdjustedScore += adjustedScore;
    });
    
    // Normalize to get final weights
    pairs.forEach(pair => {
      weights[pair] = adjustedScores[pair] / totalAdjustedScore;
    });
    
    return weights;
  }

  private applyRegimeScaling(
    weights: { [pair: string]: number },
    intelligence: { [pair: string]: MarketIntelligence }
  ): { [pair: string]: number } {
    const scaledWeights: { [pair: string]: number } = {};
    
    Object.entries(weights).forEach(([pair, weight]) => {
      const intel = intelligence[pair];
      let regimeScaling = 1.0;
      
      if (intel) {
        // Scale based on regime confidence and type
        if (intel.regime.regime === 'risk-on' && intel.regime.confidence > 0.7) {
          regimeScaling = 1.2; // Increase allocation in risk-on
        } else if (intel.regime.regime === 'risk-off' && intel.regime.confidence > 0.7) {
          regimeScaling = 0.8; // Decrease allocation in risk-off
        }
        
        // Safe haven currencies (JPY, CHF) get reverse scaling
        if ((pair.includes('JPY') || pair.includes('CHF')) && intel.regime.regime === 'risk-off') {
          regimeScaling = 1.3; // Increase safe haven allocation in risk-off
        }
      }
      
      scaledWeights[pair] = weight * regimeScaling;
    });
    
    return scaledWeights;
  }

  private applyCorrelationConstraints(weights: { [pair: string]: number }): { [pair: string]: number } {
    const constrainedWeights: { [pair: string]: number } = { ...weights };
    
    // Apply correlation constraints to prevent over-concentration
    // This is a simplified version - in production would use full correlation matrix
    
    // Limit USD exposure (most pairs involve USD)
    const usdPairs = Object.keys(weights).filter(pair => pair.includes('USD'));
    const totalUsdWeight = usdPairs.reduce((sum, pair) => sum + weights[pair], 0);
    
    if (totalUsdWeight > 0.7) { // Max 70% USD exposure
      const scaleFactor = 0.7 / totalUsdWeight;
      usdPairs.forEach(pair => {
        constrainedWeights[pair] *= scaleFactor;
      });
    }
    
    return constrainedWeights;
  }

  // ==================== RISK METRICS CALCULATION ====================
  
  private calculatePortfolioRiskMetrics(allocations: CurrencyAllocation[]): PortfolioAllocation['riskMetrics'] {
    // Calculate total portfolio risk
    let totalRisk = 0;
    let concentrationRisk = 0;
    let correlationRisk = 0;
    
    // Individual position risks
    allocations.forEach(allocation => {
      const positionRisk = allocation.targetAllocationPercent * 0.15; // Assume 15% annual volatility
      totalRisk += Math.pow(positionRisk, 2);
      
      // Concentration risk penalty for large positions
      if (allocation.targetAllocationPercent > 0.25) { // > 25%
        concentrationRisk += Math.pow(allocation.targetAllocationPercent - 0.25, 2);
      }
    });
    
    // Correlation risk (simplified)
    correlationRisk = this.calculateCorrelationRisk(allocations);
    
    // Diversification benefit
    const undiversifiedRisk = allocations.reduce((sum, a) => sum + Math.pow(a.targetAllocationPercent * 0.15, 2), 0);
    const diversificationBenefit = Math.max(0, undiversifiedRisk - totalRisk);
    
    return {
      totalRisk: Math.sqrt(totalRisk),
      diversificationBenefit,
      concentrationRisk,
      correlationRisk,
      regimeRisk: this.calculateRegimeRisk(allocations)
    };
  }

  private calculateCorrelationRisk(allocations: CurrencyAllocation[]): number {
    // Simplified correlation risk calculation
    let correlationRisk = 0;
    
    for (let i = 0; i < allocations.length; i++) {
      for (let j = i + 1; j < allocations.length; j++) {
        const pair1 = allocations[i].currencyPair;
        const pair2 = allocations[j].currencyPair;
        const correlation = this.getCorrelation(pair1, pair2);
        const weight1 = allocations[i].targetAllocationPercent;
        const weight2 = allocations[j].targetAllocationPercent;
        
        correlationRisk += 2 * weight1 * weight2 * correlation * 0.15 * 0.15; // Assume 15% volatility
      }
    }
    
    return Math.sqrt(Math.max(0, correlationRisk));
  }

  private calculateRegimeRisk(allocations: CurrencyAllocation[]): number {
    // Calculate risk from regime concentration
    const regimeExposure = { 'risk-on': 0, 'risk-off': 0, 'neutral': 0 };
    
    allocations.forEach(allocation => {
      // Simplified regime classification based on currency pair
      if (['EUR/USD', 'GBP/USD', 'AUD/USD'].includes(allocation.currencyPair)) {
        regimeExposure['risk-on'] += allocation.targetAllocationPercent;
      } else if (['USD/JPY', 'USD/CHF'].includes(allocation.currencyPair)) {
        regimeExposure['risk-off'] += allocation.targetAllocationPercent;
      } else {
        regimeExposure['neutral'] += allocation.targetAllocationPercent;
      }
    });
    
    // Calculate concentration penalty
    return Math.max(0, Math.max(...Object.values(regimeExposure)) - 0.6); // Penalty if > 60% in one regime
  }

  // ==================== REBALANCING RECOMMENDATIONS ====================
  
  private generateRebalanceRecommendations(
    current: CurrencyAllocation[],
    target: CurrencyAllocation[],
    intelligence: { [pair: string]: MarketIntelligence }
  ): RebalanceRecommendation[] {
    const recommendations: RebalanceRecommendation[] = [];
    
    target.forEach(targetAllocation => {
      const currentAllocation = current.find(c => c.currencyPair === targetAllocation.currencyPair);
      const currentWeight = currentAllocation?.currentAllocationPercent || 0;
      const targetWeight = targetAllocation.targetAllocationPercent;
      const difference = targetWeight - currentWeight;
      
      if (Math.abs(difference) > 0.05) { // > 5% difference
        const recommendation: RebalanceRecommendation = {
          currencyPair: targetAllocation.currencyPair,
          currentAllocation: currentWeight,
          targetAllocation: targetWeight,
          recommendedAction: difference > 0 ? 'increase' : 'decrease',
          urgency: Math.abs(difference) > 0.15 ? 'high' : Math.abs(difference) > 0.1 ? 'medium' : 'low',
          reasoning: this.generateRebalanceReasoning(targetAllocation, intelligence[targetAllocation.currencyPair], difference),
          expectedImpact: {
            riskReduction: this.calculateRiskImpact(difference, targetAllocation),
            returnImprovement: this.calculateReturnImpact(difference, targetAllocation, intelligence[targetAllocation.currencyPair]),
            diversificationBenefit: this.calculateDiversificationImpact(difference, targetAllocation)
          }
        };
        
        recommendations.push(recommendation);
      }
    });
    
    return recommendations.sort((a, b) => {
      const urgencyOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    });
  }

  private generateRebalanceReasoning(
    allocation: CurrencyAllocation,
    intelligence: MarketIntelligence,
    difference: number
  ): string[] {
    const reasoning: string[] = [];
    
    if (difference > 0) {
      reasoning.push(`Increase ${allocation.currencyPair} allocation by ${(difference * 100).toFixed(1)}%`);
      
      if (intelligence) {
        if (intelligence.regime.regime === 'risk-on' && intelligence.regime.confidence > 0.7) {
          reasoning.push(`Strong risk-on regime supports ${allocation.currencyPair}`);
        }
        
        if (intelligence.sentiment.overallSentiment > 30) {
          reasoning.push(`Positive market sentiment favors this pair`);
        }
        
        if (intelligence.surprises.some(s => s.surprise > 5)) {
          reasoning.push(`Recent positive economic surprises`);
        }
      }
      
      if (allocation.intelligenceConfidence > 0.8) {
        reasoning.push(`High intelligence confidence (${(allocation.intelligenceConfidence * 100).toFixed(0)}%)`);
      }
    } else {
      reasoning.push(`Reduce ${allocation.currencyPair} allocation by ${(Math.abs(difference) * 100).toFixed(1)}%`);
      
      if (intelligence) {
        if (intelligence.regime.regime === 'risk-off' && intelligence.regime.confidence > 0.7) {
          reasoning.push(`Risk-off regime suggests reducing exposure`);
        }
        
        if (intelligence.sentiment.overallSentiment < -30) {
          reasoning.push(`Negative sentiment requires defensive positioning`);
        }
      }
      
      if (allocation.correlationAdjustment < 0) {
        reasoning.push(`High correlation with existing positions`);
      }
    }
    
    return reasoning;
  }

  // ==================== COMPLIANCE MONITORING ====================
  
  private async checkPortfolioCompliance(
    portfolioId: string, 
    allocations: CurrencyAllocation[]
  ): Promise<ComplianceCheck[]> {
    const checks: ComplianceCheck[] = [];
    
    // Maximum single position limit (30%)
    const maxPosition = Math.max(...allocations.map(a => a.targetAllocationPercent));
    checks.push({
      rule: 'Maximum Single Position',
      status: maxPosition > 0.3 ? 'violation' : maxPosition > 0.25 ? 'warning' : 'compliant',
      currentValue: maxPosition,
      limit: 0.3,
      description: 'No single currency pair should exceed 30% of portfolio',
      action: maxPosition > 0.3 ? 'Reduce largest position' : undefined
    });
    
    // Minimum diversification (at least 3 positions)
    const activePositions = allocations.filter(a => a.targetAllocationPercent > 0.05).length;
    checks.push({
      rule: 'Minimum Diversification',
      status: activePositions < 3 ? 'violation' : activePositions < 4 ? 'warning' : 'compliant',
      currentValue: activePositions,
      limit: 3,
      description: 'Portfolio should have at least 3 significant positions (>5%)',
      action: activePositions < 3 ? 'Add more currency pairs' : undefined
    });
    
    // Maximum USD exposure (70%)
    const usdExposure = allocations
      .filter(a => a.currencyPair.includes('USD'))
      .reduce((sum, a) => sum + a.targetAllocationPercent, 0);
    
    checks.push({
      rule: 'USD Exposure Limit',
      status: usdExposure > 0.7 ? 'violation' : usdExposure > 0.6 ? 'warning' : 'compliant',
      currentValue: usdExposure,
      limit: 0.7,
      description: 'USD exposure should not exceed 70% of portfolio',
      action: usdExposure > 0.7 ? 'Reduce USD-based pairs' : undefined
    });
    
    // Intelligence confidence threshold (minimum 50% average)
    const avgConfidence = allocations.reduce((sum, a) => 
      sum + (a.intelligenceConfidence * a.targetAllocationPercent), 0
    );
    
    checks.push({
      rule: 'Intelligence Confidence',
      status: avgConfidence < 0.5 ? 'warning' : 'compliant',
      currentValue: avgConfidence,
      limit: 0.5,
      description: 'Portfolio-weighted intelligence confidence should be at least 50%',
      action: avgConfidence < 0.5 ? 'Review low-confidence positions' : undefined
    });
    
    return checks;
  }

  // ==================== PERFORMANCE REPORTING ====================
  
  async generatePerformanceReport(
    portfolioId: string,
    period: '1d' | '7d' | '30d' | '90d' = '30d'
  ): Promise<PerformanceReport> {
    try {
      // Get portfolio trades for the period
      const { data: trades } = await supabase
        .from('shadow_trades')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('status', 'closed')
        .gte('exit_time', new Date(Date.now() - this.getPeriodMilliseconds(period)).toISOString())
        .order('exit_time', { ascending: false });

      // Get current allocations
      const allocations = await this.getCurrentAllocations(portfolioId);
      
      // Calculate summary metrics
      const summary = this.calculateSummaryMetrics(trades || []);
      
      // Calculate attribution by currency pair
      const attribution = this.calculatePerformanceAttribution(trades || [], allocations);
      
      // Calculate risk analysis
      const riskAnalysis = await this.calculateRiskAnalysis(trades || [], allocations);
      
      // Generate recommendations
      const recommendations = this.generatePerformanceRecommendations(summary, attribution, riskAnalysis);
      
      return {
        portfolioId,
        period,
        summary,
        attribution,
        riskAnalysis,
        recommendations
      };
      
    } catch (error) {
      console.error('Error generating performance report:', error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================
  
  private async getPortfolioData(portfolioId: string): Promise<any> {
    const { data, error } = await supabase.rpc('get_global_trading_account');
    
    if (error || !data || data.length === 0) {
      throw new Error('Global trading account not found');
    }
    
    return data[0];
  }

  private async getCurrentAllocations(portfolioId: string): Promise<CurrencyAllocation[]> {
    const { data } = await supabase
      .from('portfolio_allocations')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('created_at', { ascending: false });
    
    return (data || []).map(item => ({
      currencyPair: item.currency_pair,
      targetAllocationPercent: item.target_allocation_percent,
      currentAllocationPercent: item.current_allocation_percent,
      intelligenceConfidence: item.intelligence_confidence,
      riskBudgetAllocated: item.risk_budget_allocated,
      correlationAdjustment: item.correlation_adjustment,
      regimeBasedScaling: item.regime_based_scaling,
      lastRebalance: new Date(item.last_rebalance),
      performance: {
        return30d: 0, // Would be calculated
        volatility30d: 0,
        sharpeRatio: 0,
        maxDrawdown: 0
      }
    }));
  }

  private async calculatePairPerformance(pair: string): Promise<CurrencyAllocation['performance']> {
    // Calculate 30-day performance metrics for the currency pair
    // This would typically use historical price data
    return {
      return30d: (Math.random() - 0.5) * 0.1, // ±5% random for demo
      volatility30d: 0.05 + Math.random() * 0.05, // 5-10% volatility
      sharpeRatio: (Math.random() - 0.5) * 2, // -1 to 1 Sharpe
      maxDrawdown: Math.random() * 0.05 // 0-5% drawdown
    };
  }

  private normalizeAllocations(allocations: CurrencyAllocation[]): CurrencyAllocation[] {
    const totalWeight = allocations.reduce((sum, a) => sum + a.targetAllocationPercent, 0);
    
    if (totalWeight === 0) return allocations;
    
    return allocations.map(allocation => ({
      ...allocation,
      targetAllocationPercent: allocation.targetAllocationPercent / totalWeight
    }));
  }

  private getCorrelationAdjustment(pair: string, weights: { [pair: string]: number }): number {
    // Calculate correlation adjustment based on other positions
    let correlationAdjustment = 0;
    
    Object.entries(weights).forEach(([otherPair, weight]) => {
      if (otherPair !== pair) {
        const correlation = this.getCorrelation(pair, otherPair);
        correlationAdjustment += correlation * weight;
      }
    });
    
    return correlationAdjustment;
  }

  private getRegimeScaling(pair: string, intelligence: MarketIntelligence): number {
    if (!intelligence) return 1.0;
    
    let scaling = 1.0;
    
    if (intelligence.regime.confidence > 0.7) {
      if (intelligence.regime.regime === 'risk-on') {
        // Risk currencies benefit in risk-on
        if (['EUR/USD', 'GBP/USD', 'AUD/USD'].includes(pair)) {
          scaling = 1.2;
        }
      } else if (intelligence.regime.regime === 'risk-off') {
        // Safe haven currencies benefit in risk-off
        if (['USD/JPY', 'USD/CHF'].includes(pair)) {
          scaling = 1.3;
        } else {
          scaling = 0.8;
        }
      }
    }
    
    return scaling;
  }

  private getCorrelation(pair1: string, pair2: string): number {
    // Get correlation from cache or calculate
    if (this.correlationMatrix.has(pair1) && this.correlationMatrix.get(pair1)!.has(pair2)) {
      return this.correlationMatrix.get(pair1)!.get(pair2)!;
    }
    
    // Default correlations (simplified)
    const defaultCorrelations: { [key: string]: number } = {
      'EUR/USD_GBP/USD': 0.7,
      'EUR/USD_AUD/USD': 0.6,
      'USD/JPY_USD/CHF': 0.5,
      'EUR/USD_USD/JPY': -0.3,
      'GBP/USD_USD/JPY': -0.2
    };
    
    const key1 = `${pair1}_${pair2}`;
    const key2 = `${pair2}_${pair1}`;
    
    return defaultCorrelations[key1] || defaultCorrelations[key2] || 0.1; // Default low correlation
  }

  private async updateCorrelationMatrix(): Promise<void> {
    // Update correlation matrix with recent data
    // This would typically use rolling correlation calculation
    for (const pair1 of this.DEFAULT_CURRENCY_PAIRS) {
      if (!this.correlationMatrix.has(pair1)) {
        this.correlationMatrix.set(pair1, new Map());
      }
      
      for (const pair2 of this.DEFAULT_CURRENCY_PAIRS) {
        if (pair1 !== pair2) {
          const correlation = this.getCorrelation(pair1, pair2);
          this.correlationMatrix.get(pair1)!.set(pair2, correlation);
        }
      }
    }
  }

  private calculateRiskImpact(difference: number, allocation: CurrencyAllocation): number {
    // Estimate risk impact of allocation change
    return Math.abs(difference) * 0.1; // Simplified
  }

  private calculateReturnImpact(
    difference: number, 
    allocation: CurrencyAllocation, 
    intelligence: MarketIntelligence
  ): number {
    // Estimate return impact based on intelligence
    const baseImpact = difference * 0.05; // 5% base return expectation
    const confidenceMultiplier = intelligence ? intelligence.sentiment.confidence : 0.5;
    return baseImpact * confidenceMultiplier;
  }

  private calculateDiversificationImpact(difference: number, allocation: CurrencyAllocation): number {
    // Estimate diversification benefit
    return Math.abs(difference) * 0.02; // 2% diversification benefit
  }

  private async savePortfolioAllocation(allocation: PortfolioAllocation): Promise<void> {
    try {
      // Save each allocation to database
      for (const alloc of allocation.allocations) {
        await supabase
          .from('portfolio_allocations')
          .upsert({
            portfolio_id: allocation.portfolioId,
            currency_pair: alloc.currencyPair,
            target_allocation_percent: alloc.targetAllocationPercent,
            current_allocation_percent: alloc.currentAllocationPercent,
            intelligence_confidence: alloc.intelligenceConfidence,
            risk_budget_allocated: alloc.riskBudgetAllocated,
            correlation_adjustment: alloc.correlationAdjustment,
            regime_based_scaling: alloc.regimeBasedScaling,
            last_rebalance: alloc.lastRebalance.toISOString()
          }, { 
            onConflict: 'portfolio_id,currency_pair' 
          });
      }
      
      console.log('💾 Portfolio allocation saved to database');
      
    } catch (error) {
      console.error('Error saving portfolio allocation:', error);
    }
  }

  private calculateSummaryMetrics(trades: any[]): PerformanceReport['summary'] {
    if (trades.length === 0) {
      return {
        totalReturn: 0,
        totalReturnPercent: 0,
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        bestPerformingPair: '',
        worstPerformingPair: ''
      };
    }

    const totalReturn = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winners = trades.filter(t => (t.pnl || 0) > 0);
    const winRate = winners.length / trades.length;
    
    // Group by symbol to find best/worst
    const symbolPnL: { [symbol: string]: number } = {};
    trades.forEach(trade => {
      if (!symbolPnL[trade.symbol]) symbolPnL[trade.symbol] = 0;
      symbolPnL[trade.symbol] += trade.pnl || 0;
    });
    
    const sortedSymbols = Object.entries(symbolPnL).sort((a, b) => b[1] - a[1]);
    
    return {
      totalReturn,
      totalReturnPercent: totalReturn / 100000, // Assume $100k base
      volatility: 0.15, // Would be calculated from returns
      sharpeRatio: 0.8, // Would be calculated
      maxDrawdown: 0.05, // Would be calculated
      winRate,
      bestPerformingPair: sortedSymbols[0]?.[0] || '',
      worstPerformingPair: sortedSymbols[sortedSymbols.length - 1]?.[0] || ''
    };
  }

  private calculatePerformanceAttribution(
    trades: any[], 
    allocations: CurrencyAllocation[]
  ): PerformanceReport['attribution'] {
    const attribution: PerformanceReport['attribution'] = {};
    
    allocations.forEach(allocation => {
      const pairTrades = trades.filter(t => t.symbol === allocation.currencyPair);
      const pairReturn = pairTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      
      attribution[allocation.currencyPair] = {
        contribution: pairReturn * allocation.currentAllocationPercent,
        weight: allocation.currentAllocationPercent,
        return: pairReturn,
        intelligence: {
          avgConfidence: allocation.intelligenceConfidence,
          signalAccuracy: pairTrades.length > 0 ? pairTrades.filter(t => (t.pnl || 0) > 0).length / pairTrades.length : 0,
          avgStrength: 7 // Would be calculated from actual signals
        }
      };
    });
    
    return attribution;
  }

  private async calculateRiskAnalysis(
    trades: any[], 
    allocations: CurrencyAllocation[]
  ): Promise<PerformanceReport['riskAnalysis']> {
    // Calculate risk metrics
    const returns = trades.map(t => (t.pnl || 0) / 100000); // Normalize to percentage
    
    // Simple VaR calculation
    returns.sort((a, b) => a - b);
    const var95Index = Math.floor(returns.length * 0.05);
    const var95 = returns.length > 0 ? returns[var95Index] || 0 : 0;
    
    // CVaR (average of worst 5%)
    const worstReturns = returns.slice(0, var95Index + 1);
    const cvar95 = worstReturns.length > 0 ? worstReturns.reduce((sum, r) => sum + r, 0) / worstReturns.length : 0;
    
    return {
      var95: Math.abs(var95),
      cvar95: Math.abs(cvar95),
      correlationMatrix: [], // Would be calculated from actual data
      concentrationRisk: Math.max(...allocations.map(a => a.currentAllocationPercent)),
      regimeExposure: {
        'risk-on': 0.4,
        'risk-off': 0.3,
        'neutral': 0.3
      }
    };
  }

  private generatePerformanceRecommendations(
    summary: PerformanceReport['summary'],
    attribution: PerformanceReport['attribution'],
    riskAnalysis: PerformanceReport['riskAnalysis']
  ): string[] {
    const recommendations: string[] = [];
    
    if (summary.winRate < 0.5) {
      recommendations.push('Consider reviewing trading strategy - win rate below 50%');
    }
    
    if (summary.sharpeRatio < 0.5) {
      recommendations.push('Risk-adjusted returns could be improved - consider reducing volatility');
    }
    
    if (riskAnalysis.concentrationRisk > 0.3) {
      recommendations.push('High concentration risk detected - consider diversifying positions');
    }
    
    if (summary.maxDrawdown > 0.1) {
      recommendations.push('Maximum drawdown exceeded 10% - review risk management');
    }
    
    // Find underperforming allocations
    Object.entries(attribution).forEach(([pair, data]) => {
      if (data.return < 0 && data.weight > 0.1) {
        recommendations.push(`Consider reducing allocation to ${pair} - negative performance with significant weight`);
      }
    });
    
    return recommendations;
  }

  private getPeriodMilliseconds(period: '1d' | '7d' | '30d' | '90d'): number {
    const periods = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };
    return periods[period];
  }

  async optimizeAllocation(assets: { symbol: string; weight: number }[], constraints: { riskTolerance: number; expectedReturn: number }): Promise<{ symbol: string; optimizedWeight: number }[]> {
    // Simulate portfolio optimization
    const totalWeight = assets.reduce((sum, asset) => sum + asset.weight, 0);
    
    return assets.map(asset => ({
      symbol: asset.symbol,
      optimizedWeight: (asset.weight / totalWeight) + (Math.random() - 0.5) * 0.1
    }));
  }

  async rebalancePortfolio(portfolioId: string, targetAllocations: { [symbol: string]: number }): Promise<void> {
    // Simulate rebalancing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate portfolio update
    console.log('Rebalancing portfolio:', portfolioId, targetAllocations);
  }
}

export const portfolioIntelligenceManager = new PortfolioIntelligenceManager();