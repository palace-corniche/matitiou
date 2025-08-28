// Master Signal Engine - Orchestrates the complete signal generation pipeline
// Integrates modular analysis, advanced fusion, and transparent diagnostics

import { modularSignalEngine, ModularAnalysisResult } from './modularSignalEngine';
import { advancedFusionEngine, MasterSignal } from './advancedFusionEngine';
import { signalDiagnosticsEngine, SignalDiagnosticResult } from './signalDiagnostics';

export interface CompleteSignalAnalysis {
  success: boolean;
  timestamp: Date;
  pair: string;
  timeframe: string;
  
  // Core results
  masterSignal?: MasterSignal;
  modularResults: ModularAnalysisResult;
  diagnostics: SignalDiagnosticResult;
  
  // Performance metrics
  processingTime: number;
  factorCount: number;
  moduleCount: number;
  
  // Quality indicators
  overallQuality: number; // 0-1
  reliability: number; // 0-1
  confidence: number; // 0-1
  
  // Actionable insights
  recommendation: 'TRADE' | 'WAIT' | 'REVIEW_SETUP' | 'CHECK_DATA';
  reasoning: string;
  nextAction: string;
  warnings: string[];
}

export class MasterSignalEngine {
  
  async generateCompleteAnalysis(
    candles: any[],
    pair: string = 'EUR/USD',
    timeframe: string = '15m',
    regime: string = 'ranging'
  ): Promise<CompleteSignalAnalysis> {
    
    const startTime = Date.now();
    console.log(`🎯 MASTER ENGINE: Starting complete signal analysis for ${pair} ${timeframe}`);
    
    try {
      // Phase 1: Generate modular signals from all domains
      console.log('📊 Phase 1: Modular signal generation...');
      const modularResults = await modularSignalEngine.generateModularSignals(candles, pair, timeframe);
      
      console.log(`✅ Modular analysis complete: ${modularResults.diagnostics.activeModules.length}/6 modules, ${modularResults.diagnostics.totalFactors} factors`);
      
      // Phase 2: Attempt advanced fusion
      console.log('🔬 Phase 2: Advanced mathematical fusion...');
      let masterSignal: MasterSignal | null = null;
      let rejectionReason: any = null;
      
      try {
        const currentPrice = candles[candles.length - 1].close;
        masterSignal = await advancedFusionEngine.fuseSignals(modularResults, currentPrice, regime);
        
        if (masterSignal) {
          console.log(`✅ Master signal generated: ${masterSignal.signal.toUpperCase()} with ${(masterSignal.signalQuality * 100).toFixed(0)}% quality`);
        } else {
          console.log('❌ Fusion engine rejected signal');
          rejectionReason = { reason: 'fusion_rejection', category: 'insufficient_quality' };
        }
      } catch (fusionError) {
        console.warn('🔬 Fusion engine error:', fusionError);
        rejectionReason = { reason: 'fusion_error', error: fusionError };
      }
      
      // Phase 3: Generate comprehensive diagnostics
      console.log('🔍 Phase 3: Diagnostic analysis...');
      const diagnostics = await signalDiagnosticsEngine.generateDiagnostics(
        modularResults,
        masterSignal,
        rejectionReason,
        pair
      );
      
      // Phase 4: Calculate overall metrics and recommendation
      console.log('📋 Phase 4: Quality assessment and recommendations...');
      const analysis = this.buildCompleteAnalysis(
        modularResults,
        masterSignal,
        diagnostics,
        pair,
        timeframe,
        startTime
      );
      
      console.log(`🎯 MASTER ENGINE: Analysis complete in ${analysis.processingTime}ms - ${analysis.recommendation}`);
      
      return analysis;
      
    } catch (error) {
      console.error('❌ MASTER ENGINE: Critical error in signal analysis:', error);
      
      // Return error analysis
      return this.buildErrorAnalysis(error, pair, timeframe, startTime);
    }
  }
  
  private buildCompleteAnalysis(
    modularResults: ModularAnalysisResult,
    masterSignal: MasterSignal | null,
    diagnostics: SignalDiagnosticResult,
    pair: string,
    timeframe: string,
    startTime: number
  ): CompleteSignalAnalysis {
    
    const processingTime = Date.now() - startTime;
    
    // Calculate aggregate metrics
    const factorCount = diagnostics.modulePerformance.reduce((sum, m) => sum + m.signalsGenerated, 0);
    const moduleCount = diagnostics.modulePerformance.filter(m => m.status === 'active').length;
    
    // Calculate quality indicators
    const overallQuality = diagnostics.dataQuality.reliabilityIndex;
    const reliability = diagnostics.dataQuality.overallDataQuality;
    const confidence = masterSignal ? masterSignal.confidence : 0;
    
    // Determine recommendation and reasoning
    const { recommendation, reasoning, nextAction } = this.generateRecommendation(
      masterSignal,
      diagnostics,
      overallQuality,
      moduleCount
    );
    
    // Collect warnings
    const warnings = [
      ...diagnostics.dataQuality.warnings,
      ...diagnostics.modulePerformance.flatMap(m => m.issues),
      ...(masterSignal?.warnings || [])
    ];
    
    return {
      success: !!masterSignal,
      timestamp: new Date(),
      pair,
      timeframe,
      masterSignal: masterSignal || undefined,
      modularResults,
      diagnostics,
      processingTime,
      factorCount,
      moduleCount,
      overallQuality,
      reliability,
      confidence,
      recommendation,
      reasoning,
      nextAction,
      warnings: [...new Set(warnings)] // Remove duplicates
    };
  }
  
  private generateRecommendation(
    masterSignal: MasterSignal | null,
    diagnostics: SignalDiagnosticResult,
    overallQuality: number,
    moduleCount: number
  ): { recommendation: CompleteSignalAnalysis['recommendation']; reasoning: string; nextAction: string } {
    
    // If we have a high-quality master signal
    if (masterSignal && masterSignal.signalQuality > 0.7 && overallQuality > 0.7) {
      return {
        recommendation: 'TRADE',
        reasoning: `High-quality ${masterSignal.signal.toUpperCase()} signal detected with ${(masterSignal.signalQuality * 100).toFixed(0)}% quality score. All conditions favorable for trade execution.`,
        nextAction: `Execute ${masterSignal.signal.toUpperCase()} trade with ${(masterSignal.kellyFraction * 100).toFixed(1)}% position size. Monitor for ${masterSignal.fusionMetrics.bayesianUpdateCount} contributing factors.`
      };
    }
    
    // If we have a medium-quality signal
    if (masterSignal && masterSignal.signalQuality > 0.5 && overallQuality > 0.6) {
      return {
        recommendation: 'TRADE',
        reasoning: `Moderate-quality ${masterSignal.signal.toUpperCase()} signal with ${(masterSignal.signalQuality * 100).toFixed(0)}% quality. Acceptable for cautious trading.`,
        nextAction: `Consider ${masterSignal.signal.toUpperCase()} trade with reduced position size (${Math.max(0.5, masterSignal.kellyFraction * 0.5 * 100).toFixed(1)}%). Monitor closely.`
      };
    }
    
    // If data quality is poor
    if (overallQuality < 0.5 || moduleCount < 3) {
      return {
        recommendation: 'CHECK_DATA',
        reasoning: `Insufficient data quality (${(overallQuality * 100).toFixed(0)}%) or limited module coverage (${moduleCount}/6 active). Cannot generate reliable signals.`,
        nextAction: 'Review data sources, check module connections, and ensure all analysis engines are functioning properly.'
      };
    }
    
    // If signal was rejected due to specific issues
    if (diagnostics.rejectionReason) {
      const reason = diagnostics.rejectionReason;
      
      if (reason.category === 'high_entropy' || reason.category === 'insufficient_confluence') {
        return {
          recommendation: 'WAIT',
          reasoning: `Signal rejected due to ${reason.primaryCause.toLowerCase()}. ${reason.detailedExplanation}`,
          nextAction: `Wait for market conditions to improve. ${reason.suggestedActions[0] || 'Monitor for better setups.'}`
        };
      }
      
      if (reason.category === 'poor_edge') {
        return {
          recommendation: 'REVIEW_SETUP',
          reasoning: `Expected profitability too low (${reason.actualValue.toFixed(4)} vs required ${reason.requiredThreshold.toFixed(4)}). Risk-reward not favorable.`,
          nextAction: 'Review trading parameters, reduce costs, or wait for higher probability setups.'
        };
      }
    }
    
    // Default case - wait for better conditions
    return {
      recommendation: 'WAIT',
      reasoning: 'No clear trading signal detected. Market conditions not favorable for high-probability trades.',
      nextAction: 'Continue monitoring. Wait for stronger confluence of factors or improved market clarity.'
    };
  }
  
  private buildErrorAnalysis(
    error: any,
    pair: string,
    timeframe: string,
    startTime: number
  ): CompleteSignalAnalysis {
    
    const processingTime = Date.now() - startTime;
    
    // Create minimal diagnostic structure
    const diagnostics: SignalDiagnosticResult = {
      signalGenerated: false,
      timestamp: new Date(),
      pair,
      rejectionReason: {
        category: 'data_quality',
        primaryCause: 'System error during analysis',
        detailedExplanation: `Critical error occurred during signal generation: ${error.message}`,
        requiredThreshold: 1,
        actualValue: 0,
        suggestedActions: [
          'Check system logs for detailed error information',
          'Verify data source connections',
          'Restart analysis engines if necessary',
          'Contact technical support if error persists'
        ]
      },
      modulePerformance: [],
      dataQuality: {
        overallDataQuality: 0,
        factorDiversity: 0,
        signalConsistency: 0,
        timelinessScore: 0,
        reliabilityIndex: 0,
        warnings: ['System error occurred during analysis']
      },
      marketContext: {
        regime: 'unknown',
        volatility: 'medium',
        newsImpact: 'minimal',
        technicalBias: 'neutral',
        fundamentalBias: 'neutral',
        conflictLevel: 0,
        riskEnvironment: 'elevated'
      }
    };
    
    // Create empty modular results
    const modularResults: ModularAnalysisResult = {
      technical: [],
      fundamental: [],
      sentiment: [],
      multiTimeframe: [],
      patterns: [],
      strategies: [],
      diagnostics: {
        totalFactors: 0,
        activeModules: [],
        missingModules: ['technical', 'fundamental', 'sentiment', 'multiTimeframe', 'patterns', 'strategies'],
        dataQuality: {},
        processingTime: processingTime,
        errors: [error.message],
        warnings: ['Critical system error occurred']
      }
    };
    
    return {
      success: false,
      timestamp: new Date(),
      pair,
      timeframe,
      modularResults,
      diagnostics,
      processingTime,
      factorCount: 0,
      moduleCount: 0,
      overallQuality: 0,
      reliability: 0,
      confidence: 0,
      recommendation: 'CHECK_DATA',
      reasoning: `System error prevented signal analysis: ${error.message}`,
      nextAction: 'Check system status and data connections before retrying.',
      warnings: ['Critical system error - analysis incomplete']
    };
  }
  
  // Performance tracking and optimization
  async trackPerformance(analysis: CompleteSignalAnalysis, actualOutcome?: { success: boolean; return: number }): Promise<void> {
    if (!analysis.masterSignal || !actualOutcome) return;
    
    // Track performance for each contributing module
    analysis.masterSignal.contributingSignals.forEach(signal => {
      const moduleId = `${signal.module}_${signal.id.split('_')[0]}`;
      advancedFusionEngine.updateModulePerformance(moduleId, actualOutcome);
    });
    
    console.log(`📈 Performance tracked for ${analysis.masterSignal.contributingSignals.length} signals`);
  }
  
  // Get system statistics
  getSystemStatistics(): any {
    return {
      timestamp: new Date(),
      fusionEngine: 'Advanced Bayesian Hierarchical Fusion',
      modules: ['technical', 'fundamental', 'sentiment', 'multiTimeframe', 'patterns', 'strategies'],
      features: [
        'Modular signal architecture',
        'Mathematical fusion with correlation adjustment',
        'Historical performance weighting',
        'Regime-aware analysis',
        'Transparent diagnostics',
        'Kelly criterion position sizing',
        'Real-time quality assessment'
      ]
    };
  }
}

export const masterSignalEngine = new MasterSignalEngine();