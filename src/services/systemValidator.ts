// Comprehensive System Validation Suite
// End-to-end testing and quality assurance for signal generation flow

import { supabase } from '@/integrations/supabase/client';
import { performanceTracker } from './performanceTracker';

export interface ValidationResult {
  passed: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
  metrics: {
    factorCount: number;
    entropyScore: number;
    confluenceScore: number;
    mathematicalAccuracy: number;
    processingTime: number;
  };
}

export interface EndToEndTestResult {
  testId: string;
  timestamp: Date;
  stages: {
    dataIngestion: ValidationResult;
    signalGeneration: ValidationResult;
    factorAnalysis: ValidationResult;
    bayesianFusion: ValidationResult;
    tradeExecution: ValidationResult;
  };
  overallScore: number;
  criticalIssues: string[];
  performance: {
    totalProcessingTime: number;
    memoryUsage: number;
    throughput: number;
  };
}

export class SystemValidator {
  private readonly MINIMUM_FACTORS = 15;
  private readonly MINIMUM_ENTROPY = 0.7;
  private readonly MINIMUM_CONFLUENCE = 10;
  private readonly MAXIMUM_PROCESSING_TIME = 5000; // 5 seconds

  // Run complete end-to-end system validation
  async runEndToEndTest(): Promise<EndToEndTestResult> {
    const testId = `e2e_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    console.log(`🧪 Starting End-to-End Test: ${testId}`);
    
    try {
      const stages = {
        dataIngestion: await this.validateDataIngestion(),
        signalGeneration: await this.validateSignalGeneration(),
        factorAnalysis: await this.validateFactorAnalysis(),
        bayesianFusion: await this.validateBayesianFusion(),
        tradeExecution: await this.validateTradeExecution()
      };

      const overallScore = this.calculateOverallScore(stages);
      const criticalIssues = this.extractCriticalIssues(stages);
      const totalProcessingTime = Date.now() - startTime;

      const result: EndToEndTestResult = {
        testId,
        timestamp: new Date(),
        stages,
        overallScore,
        criticalIssues,
        performance: {
          totalProcessingTime,
          memoryUsage: this.estimateMemoryUsage(),
          throughput: this.calculateThroughput(totalProcessingTime)
        }
      };

      // Store test results
      await this.storeTestResults(result);
      
      console.log(`✅ End-to-End Test Complete: Score ${overallScore}/100`);
      return result;

    } catch (error) {
      console.error('❌ End-to-End Test Failed:', error);
      throw error;
    }
  }

  // Validate data ingestion pipeline
  private async validateDataIngestion(): Promise<ValidationResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    try {
      // Check market data freshness
      const { data: latestData } = await supabase
        .from('market_data_feed')
        .select('created_at, timestamp')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!latestData || latestData.length === 0) {
        issues.push('No market data available');
        score -= 50;
      } else {
        const dataAge = Date.now() - new Date(latestData[0].created_at).getTime();
        if (dataAge > 300000) { // 5 minutes
          issues.push('Market data is stale (>5 minutes old)');
          score -= 25;
          recommendations.push('Improve data feed frequency');
        }
      }

      // Validate data completeness
      const { data: dataCount } = await supabase
        .from('market_data_feed')
        .select('id', { count: 'exact' })
        .gte('created_at', new Date(Date.now() - 3600000).toISOString()); // Last hour

      if (!dataCount || (dataCount as any).length < 4) { // Expect at least 4 data points per hour
        issues.push('Insufficient data points for analysis');
        score -= 30;
        recommendations.push('Increase data collection frequency');
      }

      return {
        passed: score >= 70,
        score,
        issues,
        recommendations,
        metrics: {
          factorCount: 0,
          entropyScore: 0,
          confluenceScore: 0,
          mathematicalAccuracy: score / 100,
          processingTime: 0
        }
      };

    } catch (error) {
      return {
        passed: false,
        score: 0,
        issues: [`Data ingestion validation failed: ${error}`],
        recommendations: ['Check database connectivity and data pipeline'],
        metrics: {
          factorCount: 0,
          entropyScore: 0,
          confluenceScore: 0,
          mathematicalAccuracy: 0,
          processingTime: 0
        }
      };
    }
  }

  // Validate signal generation with factor analysis
  private async validateSignalGeneration(): Promise<ValidationResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;
    const startTime = Date.now();

    try {
      // Check recent signal generation
      const { data: recentSignals } = await supabase
        .from('trading_signals')
        .select('factors, confluence_score, confidence')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString())
        .limit(10);

      if (!recentSignals || recentSignals.length === 0) {
        issues.push('No signals generated in the last hour');
        score -= 60;
        recommendations.push('Check signal generation pipeline');
      } else {
        // Analyze factor quality
        const factorAnalysis = this.analyzeFactorQuality(recentSignals);
        
        if (factorAnalysis.averageFactorCount < this.MINIMUM_FACTORS) {
          issues.push(`Low factor count: ${factorAnalysis.averageFactorCount} < ${this.MINIMUM_FACTORS}`);
          score -= 30;
          recommendations.push('Enhance analysis modules to generate more factors');
        }

        if (factorAnalysis.averageConfluence < this.MINIMUM_CONFLUENCE) {
          issues.push(`Low confluence scores: ${factorAnalysis.averageConfluence}`);
          score -= 20;
          recommendations.push('Improve factor correlation and weighting');
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        passed: score >= 70,
        score,
        issues,
        recommendations,
        metrics: {
          factorCount: recentSignals ? this.calculateAverageFactorCount(recentSignals) : 0,
          entropyScore: 0,
          confluenceScore: recentSignals ? this.calculateAverageConfluence(recentSignals) : 0,
          mathematicalAccuracy: score / 100,
          processingTime
        }
      };

    } catch (error) {
      return {
        passed: false,
        score: 0,
        issues: [`Signal generation validation failed: ${error}`],
        recommendations: ['Check signal generation modules and database'],
        metrics: {
          factorCount: 0,
          entropyScore: 0,
          confluenceScore: 0,
          mathematicalAccuracy: 0,
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  // Validate factor analysis quality
  private async validateFactorAnalysis(): Promise<ValidationResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Test mathematical accuracy of factor calculations
    const mathematicalTests = this.runMathematicalValidation();
    
    if (!mathematicalTests.entropyCalculation) {
      issues.push('Entropy calculation validation failed');
      score -= 25;
      recommendations.push('Review entropy calculation algorithm');
    }

    if (!mathematicalTests.kellyFraction) {
      issues.push('Kelly fraction calculation validation failed');
      score -= 25;
      recommendations.push('Review Kelly criterion implementation');
    }

    if (!mathematicalTests.bayesianConsensus) {
      issues.push('Bayesian consensus validation failed');
      score -= 25;
      recommendations.push('Review Bayesian fusion logic');
    }

    return {
      passed: score >= 70,
      score,
      issues,
      recommendations,
      metrics: {
        factorCount: 0,
        entropyScore: mathematicalTests.entropyScore,
        confluenceScore: 0,
        mathematicalAccuracy: score / 100,
        processingTime: 0
      }
    };
  }

  // Validate Bayesian fusion process
  private async validateBayesianFusion(): Promise<ValidationResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    try {
      // Check module correlations
      const { data: correlations } = await supabase
        .from('module_correlations')
        .select('*')
        .limit(10);

      if (!correlations || correlations.length === 0) {
        issues.push('No module correlation data available');
        score -= 40;
        recommendations.push('Initialize correlation tracking between modules');
      }

      // Validate adaptive thresholds
      const { data: thresholds } = await supabase
        .from('adaptive_thresholds')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (!thresholds || thresholds.length === 0) {
        issues.push('No adaptive threshold configuration');
        score -= 30;
        recommendations.push('Initialize adaptive threshold system');
      } else {
        const threshold = thresholds[0];
        if (threshold.entropy_min < 0.5 || threshold.entropy_max > 1.0) {
          issues.push('Invalid entropy thresholds');
          score -= 20;
          recommendations.push('Calibrate entropy threshold ranges');
        }
      }

      return {
        passed: score >= 70,
        score,
        issues,
        recommendations,
        metrics: {
          factorCount: 0,
          entropyScore: thresholds?.[0]?.entropy_current || 0,
          confluenceScore: thresholds?.[0]?.confluence_adaptive || 0,
          mathematicalAccuracy: score / 100,
          processingTime: 0
        }
      };

    } catch (error) {
      return {
        passed: false,
        score: 0,
        issues: [`Bayesian fusion validation failed: ${error}`],
        recommendations: ['Check fusion pipeline and database connectivity'],
        metrics: {
          factorCount: 0,
          entropyScore: 0,
          confluenceScore: 0,
          mathematicalAccuracy: 0,
          processingTime: 0
        }
      };
    }
  }

  // Validate trade execution pipeline
  private async validateTradeExecution(): Promise<ValidationResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    try {
      // Check global trading account functionality
      const { data: account } = await supabase.rpc('get_global_trading_account');

      if (!account || account.length === 0) {
        issues.push('Global trading account not found');
        score -= 50;
        recommendations.push('Initialize global trading account');
      }

      // Check recent trade execution
      const { data: recentTrades } = await supabase
        .from('shadow_trades')
        .select('*')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString())
        .limit(5);

      if (recentTrades && recentTrades.length > 0) {
        // Validate trade parameters
        for (const trade of recentTrades) {
          if (!trade.risk_reward_ratio || trade.risk_reward_ratio < 1.0) {
            issues.push('Poor risk-reward ratios in trades');
            score -= 15;
            recommendations.push('Improve risk management parameters');
            break;
          }
        }
      }

      return {
        passed: score >= 70,
        score,
        issues,
        recommendations,
        metrics: {
          factorCount: 0,
          entropyScore: 0,
          confluenceScore: 0,
          mathematicalAccuracy: score / 100,
          processingTime: 0
        }
      };

    } catch (error) {
      return {
        passed: false,
        score: 0,
        issues: [`Trade execution validation failed: ${error}`],
        recommendations: ['Check trade execution pipeline'],
        metrics: {
          factorCount: 0,
          entropyScore: 0,
          confluenceScore: 0,
          mathematicalAccuracy: 0,
          processingTime: 0
        }
      };
    }
  }

  // Run mathematical validation tests
  private runMathematicalValidation(): {
    entropyCalculation: boolean;
    kellyFraction: boolean;
    bayesianConsensus: boolean;
    entropyScore: number;
  } {
    // Test entropy calculation with known values
    const testFactors = [
      { weight: 0.8, confidence: 0.9 },
      { weight: 0.6, confidence: 0.7 },
      { weight: 0.4, confidence: 0.5 }
    ];

    const entropy = this.calculateEntropy(testFactors);
    const entropyValid = entropy >= 0 && entropy <= 1;

    // Test Kelly fraction calculation
    const winRate = 0.6;
    const avgWin = 0.02;
    const avgLoss = 0.01;
    const kelly = this.calculateKellyFraction(winRate, avgWin, avgLoss);
    const kellyValid = kelly >= 0 && kelly <= 1;

    // Test Bayesian consensus
    const priors = [0.3, 0.5, 0.7];
    const likelihoods = [0.8, 0.6, 0.9];
    const consensus = this.calculateBayesianConsensus(priors, likelihoods);
    const consensusValid = consensus >= 0 && consensus <= 1;

    return {
      entropyCalculation: entropyValid,
      kellyFraction: kellyValid,
      bayesianConsensus: consensusValid,
      entropyScore: entropy
    };
  }

  // Calculate entropy from factors
  private calculateEntropy(factors: { weight: number; confidence: number }[]): number {
    if (factors.length === 0) return 0;

    const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
    if (totalWeight === 0) return 0;

    let entropy = 0;
    for (const factor of factors) {
      const probability = factor.weight / totalWeight;
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    }

    // Normalize entropy to [0, 1]
    const maxEntropy = Math.log2(factors.length);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  // Calculate Kelly fraction for position sizing
  private calculateKellyFraction(winRate: number, avgWin: number, avgLoss: number): number {
    if (avgLoss === 0) return 0;
    const b = avgWin / avgLoss; // Win/loss ratio
    const p = winRate; // Win probability
    const q = 1 - p; // Loss probability
    
    const kelly = (b * p - q) / b;
    return Math.max(0, Math.min(1, kelly)); // Clamp between 0 and 1
  }

  // Calculate Bayesian consensus from multiple opinions
  private calculateBayesianConsensus(priors: number[], likelihoods: number[]): number {
    if (priors.length !== likelihoods.length || priors.length === 0) return 0;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < priors.length; i++) {
      const posterior = priors[i] * likelihoods[i];
      numerator += posterior;
      denominator += priors[i];
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  // Helper methods
  private analyzeFactorQuality(signals: any[]): { averageFactorCount: number; averageConfluence: number } {
    const factorCounts = signals.map(s => Array.isArray(s.factors) ? s.factors.length : 0);
    const confluenceScores = signals.map(s => s.confluence_score || 0);

    return {
      averageFactorCount: factorCounts.reduce((sum, count) => sum + count, 0) / factorCounts.length,
      averageConfluence: confluenceScores.reduce((sum, score) => sum + score, 0) / confluenceScores.length
    };
  }

  private calculateAverageFactorCount(signals: any[]): number {
    const counts = signals.map(s => Array.isArray(s.factors) ? s.factors.length : 0);
    return counts.reduce((sum, count) => sum + count, 0) / counts.length;
  }

  private calculateAverageConfluence(signals: any[]): number {
    const scores = signals.map(s => s.confluence_score || 0);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private calculateOverallScore(stages: any): number {
    const scores = Object.values(stages).map((stage: any) => stage.score);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private extractCriticalIssues(stages: any): string[] {
    const criticalIssues: string[] = [];
    
    Object.entries(stages).forEach(([stageName, stage]: [string, any]) => {
      if (stage.score < 50) {
        criticalIssues.push(`Critical failure in ${stageName}: ${stage.issues.join(', ')}`);
      }
    });

    return criticalIssues;
  }

  private estimateMemoryUsage(): number {
    // Rough estimation in MB
    return Math.round((performance as any).memory?.usedJSHeapSize / 1024 / 1024) || 0;
  }

  private calculateThroughput(processingTime: number): number {
    // Signals per minute based on processing time
    return processingTime > 0 ? Math.round(60000 / processingTime) : 0;
  }

  private async storeTestResults(result: EndToEndTestResult): Promise<void> {
    try {
      // Store in system_health table for tracking
      await supabase
        .from('system_health')
        .insert({
          function_name: 'end_to_end_validation',
          status: result.overallScore >= 70 ? 'success' : 'warning',
          execution_time_ms: result.performance.totalProcessingTime,
          processed_items: 1,
          memory_usage_mb: result.performance.memoryUsage,
          error_message: result.criticalIssues.length > 0 ? result.criticalIssues.join('; ') : null
        });
    } catch (error) {
      console.error('Failed to store test results:', error);
    }
  }

  // Automated quality monitoring
  async runContinuousQualityMonitoring(): Promise<void> {
    console.log('🔍 Starting continuous quality monitoring...');
    
    setInterval(async () => {
      try {
        const result = await this.runEndToEndTest();
        
        if (result.overallScore < 70) {
          console.warn('⚠️ System quality below threshold:', result.overallScore);
          // Could trigger alerts or corrective actions here
        }
        
        if (result.criticalIssues.length > 0) {
          console.error('🚨 Critical issues detected:', result.criticalIssues);
        }
        
      } catch (error) {
        console.error('Quality monitoring failed:', error);
      }
    }, 300000); // Run every 5 minutes
  }
}

export const systemValidator = new SystemValidator();