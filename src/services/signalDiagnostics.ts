// Signal Diagnostics Engine - Transparent explanations for signal generation and rejection

export interface SignalDiagnosticResult {
  signalGenerated: boolean;
  timestamp: Date;
  pair: string;
  
  // If signal was generated
  masterSignal?: {
    signal: 'buy' | 'sell' | 'hold';
    probability: number;
    confidence: number;
    quality: number;
    reasoning: string;
  };
  
  // If signal was rejected
  rejectionReason?: {
    category: 'insufficient_confluence' | 'high_entropy' | 'poor_edge' | 'portfolio_limits' | 'data_quality' | 'regime_conflict';
    primaryCause: string;
    detailedExplanation: string;
    requiredThreshold: number;
    actualValue: number;
    suggestedActions: string[];
  };
  
  // Module breakdown
  modulePerformance: ModuleDiagnostic[];
  
  // Quality metrics
  dataQuality: QualityMetrics;
  
  // Market context
  marketContext: MarketContextInfo;
}

export interface ModuleDiagnostic {
  module: 'technical' | 'fundamental' | 'sentiment' | 'multiTimeframe' | 'patterns' | 'strategies';
  status: 'active' | 'inactive' | 'error' | 'insufficient_data';
  signalsGenerated: number;
  qualityScore: number; // 0-1
  contributionWeight: number; // 0-1
  lastUpdate: Date;
  issues: string[];
  recommendations: string[];
}

export interface QualityMetrics {
  overallDataQuality: number; // 0-1
  factorDiversity: number; // 0-1 
  signalConsistency: number; // 0-1
  timelinessScore: number; // 0-1
  reliabilityIndex: number; // 0-1
  warnings: string[];
}

export interface MarketContextInfo {
  regime: string;
  volatility: 'low' | 'medium' | 'high' | 'extreme';
  newsImpact: 'minimal' | 'moderate' | 'significant' | 'major';
  technicalBias: 'bullish' | 'bearish' | 'neutral';
  fundamentalBias: 'bullish' | 'bearish' | 'neutral';
  conflictLevel: number; // 0-1, higher means more conflicting signals
  riskEnvironment: 'favorable' | 'neutral' | 'elevated' | 'high';
}

export class SignalDiagnosticsEngine {
  
  async generateDiagnostics(
    modularResults: any,
    masterSignal: any | null,
    rejectionReason: any | null,
    pair: string = 'EUR/USD'
  ): Promise<SignalDiagnosticResult> {
    
    console.log('🔍 Generating comprehensive signal diagnostics...');
    
    const timestamp = new Date();
    
    // Analyze module performance
    const modulePerformance = this.analyzeModulePerformance(modularResults);
    
    // Calculate quality metrics
    const dataQuality = this.calculateQualityMetrics(modularResults, modulePerformance);
    
    // Assess market context
    const marketContext = this.assessMarketContext(modularResults);
    
    // Build diagnostic result
    const diagnostic: SignalDiagnosticResult = {
      signalGenerated: !!masterSignal,
      timestamp,
      pair,
      modulePerformance,
      dataQuality,
      marketContext
    };
    
    if (masterSignal) {
      diagnostic.masterSignal = {
        signal: masterSignal.signal,
        probability: masterSignal.fusedProbability,
        confidence: masterSignal.confidence,
        quality: masterSignal.signalQuality,
        reasoning: masterSignal.reasoning
      };
      
      console.log(`✅ Signal diagnostic: ${masterSignal.signal.toUpperCase()} signal with ${(masterSignal.signalQuality * 100).toFixed(0)}% quality`);
      
    } else if (rejectionReason) {
      diagnostic.rejectionReason = this.buildRejectionExplanation(rejectionReason, modularResults, dataQuality);
      
      console.log(`❌ Signal diagnostic: Rejected due to ${diagnostic.rejectionReason.category}`);
    }
    
    return diagnostic;
  }
  
  private analyzeModulePerformance(modularResults: any): ModuleDiagnostic[] {
    const modules = ['technical', 'fundamental', 'sentiment', 'multiTimeframe', 'patterns', 'strategies'];
    
    return modules.map(module => {
      const moduleSignals = modularResults[module] || [];
      const diagnostics = modularResults.diagnostics || {};
      
      let status: ModuleDiagnostic['status'] = 'inactive';
      let issues: string[] = [];
      let recommendations: string[] = [];
      
      if (diagnostics.activeModules?.includes(module)) {
        status = 'active';
      } else if (diagnostics.missingModules?.includes(module)) {
        status = 'inactive';
        issues.push('Module not generating signals');
        recommendations.push('Check data sources and module configuration');
      } else if (diagnostics.errors?.some((error: string) => error.includes(module))) {
        status = 'error';
        issues.push('Module experiencing errors');
        recommendations.push('Review module logs and fix configuration issues');
      }
      
      const qualityScore = diagnostics.dataQuality?.[module] || 0;
      
      if (qualityScore < 0.7) {
        issues.push('Data quality below optimal threshold');
        recommendations.push('Improve data sources or increase sample size');
      }
      
      if (moduleSignals.length === 0 && status === 'active') {
        issues.push('No signals generated despite active status');
        recommendations.push('Review signal generation thresholds');
      }
      
      return {
        module: module as ModuleDiagnostic['module'],
        status,
        signalsGenerated: moduleSignals.length,
        qualityScore,
        contributionWeight: this.calculateModuleWeight(module, moduleSignals),
        lastUpdate: new Date(),
        issues,
        recommendations
      };
    });
  }
  
  private calculateModuleWeight(module: string, signals: any[]): number {
    // Calculate how much this module should contribute based on signal quality and quantity
    if (signals.length === 0) return 0;
    
    const avgConfidence = signals.reduce((sum: number, signal: any) => sum + (signal.confidence || 0.5), 0) / signals.length;
    const avgStrength = signals.reduce((sum: number, signal: any) => sum + (signal.strength || 5), 0) / signals.length;
    
    // Normalize to 0-1 scale
    const confidenceWeight = avgConfidence;
    const strengthWeight = avgStrength / 10;
    const quantityWeight = Math.min(1, signals.length / 5); // Max weight at 5+ signals
    
    return (confidenceWeight * 0.4 + strengthWeight * 0.4 + quantityWeight * 0.2);
  }
  
  private calculateQualityMetrics(modularResults: any, modulePerformance: ModuleDiagnostic[]): QualityMetrics {
    const diagnostics = modularResults.diagnostics || {};
    
    // Overall data quality (average of module qualities)
    const moduleQualities = modulePerformance.map(m => m.qualityScore);
    const overallDataQuality = moduleQualities.reduce((sum, q) => sum + q, 0) / moduleQualities.length;
    
    // Factor diversity (how many different types of signals we have)
    const totalFactors = diagnostics.totalFactors || 0;
    const activeModules = diagnostics.activeModules?.length || 0;
    const factorDiversity = activeModules / 6; // 6 total modules
    
    // Signal consistency (how much signals agree with each other)
    const signalConsistency = this.calculateSignalConsistency(modularResults);
    
    // Timeliness (how recent is our data)
    const timelinessScore = this.calculateTimelinessScore(modularResults);
    
    // Reliability index (weighted combination of factors)
    const reliabilityIndex = (
      overallDataQuality * 0.3 +
      factorDiversity * 0.2 +
      signalConsistency * 0.3 +
      timelinessScore * 0.2
    );
    
    // Generate warnings
    const warnings: string[] = [];
    
    if (overallDataQuality < 0.7) {
      warnings.push('Data quality below optimal threshold');
    }
    
    if (factorDiversity < 0.5) {
      warnings.push('Limited signal diversity - only few modules active');
    }
    
    if (signalConsistency < 0.6) {
      warnings.push('High signal conflict - modules disagree significantly');
    }
    
    if (totalFactors < 10) {
      warnings.push('Insufficient factor coverage for reliable signals');
    }
    
    return {
      overallDataQuality,
      factorDiversity,
      signalConsistency,
      timelinessScore,
      reliabilityIndex,
      warnings
    };
  }
  
  private calculateSignalConsistency(modularResults: any): number {
    // Calculate how much the different modules agree with each other
    const allSignals: any[] = [];
    
    Object.keys(modularResults).forEach(module => {
      if (Array.isArray(modularResults[module])) {
        allSignals.push(...modularResults[module]);
      }
    });
    
    if (allSignals.length < 2) return 1.0; // Perfect consistency with 0-1 signals
    
    const buySignals = allSignals.filter(s => s.signal === 'buy').length;
    const sellSignals = allSignals.filter(s => s.signal === 'sell').length;
    const holdSignals = allSignals.filter(s => s.signal === 'hold').length;
    
    const total = allSignals.length;
    const maxAgreement = Math.max(buySignals, sellSignals, holdSignals);
    
    return maxAgreement / total;
  }
  
  private calculateTimelinessScore(modularResults: any): number {
    // Calculate how recent our data sources are
    // For now, return a default score as we'd need timestamp data from each module
    return 0.9; // Assume most data is reasonably fresh
  }
  
  private assessMarketContext(modularResults: any): MarketContextInfo {
    // Analyze the market environment to provide context for signal decisions
    
    const allSignals: any[] = [];
    Object.keys(modularResults).forEach(module => {
      if (Array.isArray(modularResults[module])) {
        allSignals.push(...modularResults[module].map((s: any) => ({ ...s, module })));
      }
    });
    
    // Determine technical bias
    const technicalSignals = allSignals.filter(s => s.module === 'technical');
    const technicalBias = this.calculateBias(technicalSignals);
    
    // Determine fundamental bias
    const fundamentalSignals = allSignals.filter(s => s.module === 'fundamental');
    const fundamentalBias = this.calculateBias(fundamentalSignals);
    
    // Calculate conflict level
    const conflictLevel = Math.abs(this.getBiasScore(technicalBias) - this.getBiasScore(fundamentalBias)) / 2;
    
    // Estimate volatility based on signal strength variation
    const strengths = allSignals.map(s => s.strength || 5);
    const avgStrength = strengths.reduce((sum, s) => sum + s, 0) / strengths.length;
    const strengthVariation = Math.sqrt(strengths.reduce((sum, s) => sum + Math.pow(s - avgStrength, 2), 0) / strengths.length);
    
    let volatility: MarketContextInfo['volatility'] = 'medium';
    if (strengthVariation > 3) volatility = 'extreme';
    else if (strengthVariation > 2) volatility = 'high';
    else if (strengthVariation < 1) volatility = 'low';
    
    // Risk environment assessment
    let riskEnvironment: MarketContextInfo['riskEnvironment'] = 'neutral';
    if (conflictLevel > 0.7) riskEnvironment = 'high';
    else if (conflictLevel > 0.4) riskEnvironment = 'elevated';
    else if (conflictLevel < 0.2 && allSignals.length > 5) riskEnvironment = 'favorable';
    
    return {
      regime: 'ranging', // Would be determined by regime detection
      volatility,
      newsImpact: 'minimal', // Would be determined by news analysis
      technicalBias,
      fundamentalBias,
      conflictLevel,
      riskEnvironment
    };
  }
  
  private calculateBias(signals: any[]): 'bullish' | 'bearish' | 'neutral' {
    if (signals.length === 0) return 'neutral';
    
    const buyCount = signals.filter(s => s.signal === 'buy').length;
    const sellCount = signals.filter(s => s.signal === 'sell').length;
    
    if (buyCount > sellCount * 1.5) return 'bullish';
    if (sellCount > buyCount * 1.5) return 'bearish';
    return 'neutral';
  }
  
  private getBiasScore(bias: 'bullish' | 'bearish' | 'neutral'): number {
    switch (bias) {
      case 'bullish': return 1;
      case 'bearish': return -1;
      case 'neutral': return 0;
    }
  }
  
  private buildRejectionExplanation(
    rejectionReason: any,
    modularResults: any,
    dataQuality: QualityMetrics
  ): SignalDiagnosticResult['rejectionReason'] {
    
    // Map specific rejection reasons to categories and explanations
    let category: SignalDiagnosticResult['rejectionReason']['category'] = 'insufficient_confluence';
    let primaryCause = 'Unknown rejection reason';
    let detailedExplanation = '';
    let requiredThreshold = 0;
    let actualValue = 0;
    let suggestedActions: string[] = [];
    
    if (rejectionReason.reason?.includes('entropy')) {
      category = 'high_entropy';
      primaryCause = 'Signal uncertainty too high';
      detailedExplanation = 'The fusion algorithm detected high uncertainty in the signal due to conflicting or weak factors. High entropy indicates the signal is not reliable enough for trading.';
      requiredThreshold = rejectionReason.threshold || 0.85;
      actualValue = rejectionReason.value || 1.0;
      suggestedActions = [
        'Wait for more decisive market conditions',
        'Increase minimum factor requirements',
        'Improve signal quality through better data sources',
        'Consider reducing position size in uncertain conditions'
      ];
    } else if (rejectionReason.reason?.includes('edge')) {
      category = 'poor_edge';
      primaryCause = 'Expected profit insufficient';
      detailedExplanation = 'The calculated net edge (expected profit after costs) is too low to justify taking the trade. This means the risk-adjusted expected return does not meet minimum profitability requirements.';
      requiredThreshold = rejectionReason.threshold || 0.001;
      actualValue = rejectionReason.value || 0;
      suggestedActions = [
        'Wait for higher probability setups',
        'Reduce trading costs (spreads, commissions)',
        'Improve signal accuracy through better analysis',
        'Adjust risk-reward ratios'
      ];
    } else if (rejectionReason.reason?.includes('confluence')) {
      category = 'insufficient_confluence';
      primaryCause = 'Not enough supporting factors';
      detailedExplanation = 'The number or strength of supporting factors is below the minimum threshold for signal generation. Multiple independent factors must align to generate a reliable trading signal.';
      requiredThreshold = rejectionReason.threshold || 15;
      actualValue = rejectionReason.value || 0;
      suggestedActions = [
        'Wait for more factors to align',
        'Lower confluence requirements (increase risk)',
        'Activate more analysis modules',
        'Improve factor detection algorithms'
      ];
    } else if (rejectionReason.reason?.includes('probability')) {
      category = 'insufficient_confluence';
      primaryCause = 'Signal probability too weak';
      detailedExplanation = 'The fused probability of success is below the minimum threshold. This means the signal is not strong enough to meet risk-adjusted return requirements.';
      requiredThreshold = rejectionReason.threshold || 0.6;
      actualValue = rejectionReason.value || 0.5;
      suggestedActions = [
        'Wait for stronger directional signals',
        'Lower probability thresholds (increase risk)',
        'Improve signal quality and accuracy',
        'Use smaller position sizes for weaker signals'
      ];
    } else if (dataQuality.overallDataQuality < 0.5) {
      category = 'data_quality';
      primaryCause = 'Insufficient data quality';
      detailedExplanation = 'The quality of input data from various modules is too low to generate reliable signals. Poor data quality leads to unreliable analysis and increased risk.';
      requiredThreshold = 0.7;
      actualValue = dataQuality.overallDataQuality;
      suggestedActions = [
        'Check data source connections',
        'Verify all analysis modules are functioning',
        'Wait for data quality to improve',
        'Review module configurations'
      ];
    }
    
    // Add general suggestions based on market context
    if (dataQuality.factorDiversity < 0.5) {
      suggestedActions.push('Activate more analysis modules for better coverage');
    }
    
    if (dataQuality.signalConsistency < 0.6) {
      suggestedActions.push('Resolve conflicting signals between modules');
    }
    
    return {
      category,
      primaryCause,
      detailedExplanation,
      requiredThreshold,
      actualValue,
      suggestedActions
    };
  }
}

export const signalDiagnosticsEngine = new SignalDiagnosticsEngine();