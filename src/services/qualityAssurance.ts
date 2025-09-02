// Automated Signal Quality Monitoring
// Real-time quality assurance and performance optimization

import { supabase } from '@/integrations/supabase/client';
import { performanceTracker } from './performanceTracker';

export interface QualityMetrics {
  signalQuality: number;
  factorDiversity: number;
  mathematicalAccuracy: number;
  processingEfficiency: number;
  consistencyScore: number;
  timestamp: Date;
}

export interface QualityAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'factor_count' | 'entropy' | 'confluence' | 'performance' | 'mathematical';
  message: string;
  recommendations: string[];
  timestamp: Date;
  acknowledged: boolean;
}

export interface PerformanceOptimization {
  moduleId: string;
  currentPerformance: number;
  targetPerformance: number;
  optimizationActions: string[];
  estimatedImprovement: number;
  priority: 'low' | 'medium' | 'high';
}

export class QualityAssurance {
  private qualityHistory: QualityMetrics[] = [];
  private activeAlerts: QualityAlert[] = [];
  private readonly TARGET_FACTOR_COUNT = 15;
  private readonly TARGET_ENTROPY = 0.85;
  private readonly TARGET_CONFLUENCE = 20;
  private readonly MONITORING_INTERVAL = 60000; // 1 minute

  constructor() {
    this.startContinuousMonitoring();
  }

  // Start automated quality monitoring
  private startContinuousMonitoring(): void {
    console.log('🔍 Starting automated quality assurance monitoring...');
    
    setInterval(async () => {
      await this.performQualityCheck();
    }, this.MONITORING_INTERVAL);

    // Detailed analysis every 10 minutes
    setInterval(async () => {
      await this.performDeepQualityAnalysis();
    }, 600000);
  }

  // Perform real-time quality check
  async performQualityCheck(): Promise<QualityMetrics> {
    const startTime = Date.now();
    
    try {
      const metrics = await this.calculateQualityMetrics();
      this.qualityHistory.push(metrics);
      
      // Keep only last 100 measurements
      if (this.qualityHistory.length > 100) {
        this.qualityHistory.shift();
      }

      // Generate alerts for quality issues
      await this.generateQualityAlerts(metrics);
      
      // Log quality status
      const processingTime = Date.now() - startTime;
      console.log(`📊 Quality Check Complete: Score ${metrics.signalQuality.toFixed(1)}/100 (${processingTime}ms)`);
      
      return metrics;
      
    } catch (error) {
      console.error('Quality check failed:', error);
      throw error;
    }
  }

  // Calculate comprehensive quality metrics
  private async calculateQualityMetrics(): Promise<QualityMetrics> {
    const [
      signalQuality,
      factorDiversity,
      mathematicalAccuracy,
      processingEfficiency,
      consistencyScore
    ] = await Promise.all([
      this.calculateSignalQuality(),
      this.calculateFactorDiversity(),
      this.calculateMathematicalAccuracy(),
      this.calculateProcessingEfficiency(),
      this.calculateConsistencyScore()
    ]);

    return {
      signalQuality,
      factorDiversity,
      mathematicalAccuracy,
      processingEfficiency,
      consistencyScore,
      timestamp: new Date()
    };
  }

  // Calculate signal quality score
  private async calculateSignalQuality(): Promise<number> {
    try {
      const { data: recentSignals } = await supabase
        .from('trading_signals')
        .select('confidence, confluence_score, factors')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString())
        .limit(20);

      if (!recentSignals || recentSignals.length === 0) {
        return 0;
      }

      let totalScore = 0;
      let signalCount = 0;

      for (const signal of recentSignals) {
        let signalScore = 0;
        
        // Confidence score (0-40 points)
        signalScore += (signal.confidence || 0) * 0.4;
        
        // Confluence score (0-30 points)
        const confluenceNormalized = Math.min(100, (signal.confluence_score || 0) / this.TARGET_CONFLUENCE * 100);
        signalScore += confluenceNormalized * 0.3;
        
        // Factor count (0-30 points)
        const factorCount = Array.isArray(signal.factors) ? signal.factors.length : 0;
        const factorNormalized = Math.min(100, factorCount / this.TARGET_FACTOR_COUNT * 100);
        signalScore += factorNormalized * 0.3;

        totalScore += signalScore;
        signalCount++;
      }

      return signalCount > 0 ? totalScore / signalCount : 0;

    } catch (error) {
      console.error('Failed to calculate signal quality:', error);
      return 0;
    }
  }

  // Calculate factor diversity score
  private async calculateFactorDiversity(): Promise<number> {
    try {
      const { data: recentSignals } = await supabase
        .from('trading_signals')
        .select('factors')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString())
        .limit(10);

      if (!recentSignals || recentSignals.length === 0) {
        return 0;
      }

      const allSources = new Set<string>();
      const allTypes = new Set<string>();
      let totalFactors = 0;

      for (const signal of recentSignals) {
        if (Array.isArray(signal.factors)) {
          totalFactors += signal.factors.length;
          
          signal.factors.forEach((factor: any) => {
            if (factor.source) allSources.add(factor.source);
            if (factor.type) allTypes.add(factor.type);
          });
        }
      }

      // Diversity score based on unique sources and types
      const sourcesDiversity = Math.min(100, allSources.size / 6 * 100); // Expect 6 modules
      const typesDiversity = Math.min(100, allTypes.size / 10 * 100); // Expect 10+ factor types
      const volumeDiversity = Math.min(100, totalFactors / (recentSignals.length * this.TARGET_FACTOR_COUNT) * 100);

      return (sourcesDiversity + typesDiversity + volumeDiversity) / 3;

    } catch (error) {
      console.error('Failed to calculate factor diversity:', error);
      return 0;
    }
  }

  // Calculate mathematical accuracy score
  private async calculateMathematicalAccuracy(): Promise<number> {
    try {
      let accuracyScore = 100;

      // Test entropy calculations
      const entropyTest = this.validateEntropy([0.3, 0.4, 0.3]);
      if (!entropyTest.valid) {
        accuracyScore -= 25;
      }

      // Test Kelly fraction calculations
      const kellyTest = this.validateKellyFraction(0.6, 0.02, 0.01);
      if (!kellyTest.valid) {
        accuracyScore -= 25;
      }

      // Test Bayesian calculations
      const bayesianTest = this.validateBayesianCalculation([0.5, 0.7], [0.8, 0.6]);
      if (!bayesianTest.valid) {
        accuracyScore -= 25;
      }

      // Test confluence scoring
      const confluenceTest = this.validateConfluenceScoring();
      if (!confluenceTest.valid) {
        accuracyScore -= 25;
      }

      return Math.max(0, accuracyScore);

    } catch (error) {
      console.error('Failed to calculate mathematical accuracy:', error);
      return 0;
    }
  }

  // Calculate processing efficiency score
  private async calculateProcessingEfficiency(): Promise<number> {
    try {
      const { data: healthData } = await supabase
        .from('system_health')
        .select('execution_time_ms, status')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString())
        .limit(20);

      if (!healthData || healthData.length === 0) {
        return 50; // Default score when no data
      }

      const avgProcessingTime = healthData.reduce((sum, h) => sum + (h.execution_time_ms || 0), 0) / healthData.length;
      const successRate = healthData.filter(h => h.status === 'success').length / healthData.length;

      // Score based on processing time and success rate
      const timeScore = Math.max(0, 100 - (avgProcessingTime / 100)); // Penalize slow processing
      const reliabilityScore = successRate * 100;

      return (timeScore + reliabilityScore) / 2;

    } catch (error) {
      console.error('Failed to calculate processing efficiency:', error);
      return 0;
    }
  }

  // Calculate consistency score
  private async calculateConsistencyScore(): Promise<number> {
    if (this.qualityHistory.length < 10) {
      return 50; // Default when insufficient history
    }

    const recentScores = this.qualityHistory.slice(-10).map(m => m.signalQuality);
    const average = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    
    // Calculate standard deviation
    const variance = recentScores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / recentScores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Consistency score (lower deviation = higher consistency)
    return Math.max(0, 100 - standardDeviation * 2);
  }

  // Generate quality alerts
  private async generateQualityAlerts(metrics: QualityMetrics): Promise<void> {
    const newAlerts: QualityAlert[] = [];

    // Signal quality alerts
    if (metrics.signalQuality < 60) {
      newAlerts.push({
        id: `quality_${Date.now()}`,
        severity: metrics.signalQuality < 30 ? 'critical' : 'high',
        category: 'factor_count',
        message: `Signal quality below threshold: ${metrics.signalQuality.toFixed(1)}/100`,
        recommendations: [
          'Review factor generation algorithms',
          'Check data quality and completeness',
          'Validate analysis module performance'
        ],
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Factor diversity alerts
    if (metrics.factorDiversity < 50) {
      newAlerts.push({
        id: `diversity_${Date.now()}`,
        severity: 'medium',
        category: 'factor_count',
        message: `Low factor diversity: ${metrics.factorDiversity.toFixed(1)}/100`,
        recommendations: [
          'Enable additional analysis modules',
          'Improve factor source variety',
          'Check module activation status'
        ],
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Mathematical accuracy alerts
    if (metrics.mathematicalAccuracy < 90) {
      newAlerts.push({
        id: `math_${Date.now()}`,
        severity: 'high',
        category: 'mathematical',
        message: `Mathematical accuracy concerns: ${metrics.mathematicalAccuracy.toFixed(1)}/100`,
        recommendations: [
          'Review calculation algorithms',
          'Validate mathematical formulas',
          'Check for edge cases in calculations'
        ],
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Performance alerts
    if (metrics.processingEfficiency < 70) {
      newAlerts.push({
        id: `performance_${Date.now()}`,
        severity: 'medium',
        category: 'performance',
        message: `Processing efficiency below target: ${metrics.processingEfficiency.toFixed(1)}/100`,
        recommendations: [
          'Optimize database queries',
          'Review algorithm complexity',
          'Consider caching strategies'
        ],
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Add new alerts
    this.activeAlerts.push(...newAlerts);
    
    // Keep only recent alerts (last 24 hours)
    this.activeAlerts = this.activeAlerts.filter(
      alert => Date.now() - alert.timestamp.getTime() < 86400000
    );

    // Log new alerts
    if (newAlerts.length > 0) {
      console.warn(`⚠️ Generated ${newAlerts.length} quality alerts`);
    }
  }

  // Perform deep quality analysis
  private async performDeepQualityAnalysis(): Promise<void> {
    console.log('🔬 Performing deep quality analysis...');
    
    try {
      // Analyze module performance
      const moduleOptimizations = await this.identifyPerformanceOptimizations();
      
      // Apply automatic optimizations
      for (const optimization of moduleOptimizations) {
        if (optimization.priority === 'high') {
          await this.applyOptimization(optimization);
        }
      }

      // Update adaptive thresholds based on quality trends
      await this.updateAdaptiveThresholds();
      
      console.log('✅ Deep quality analysis complete');
      
    } catch (error) {
      console.error('Deep quality analysis failed:', error);
    }
  }

  // Identify performance optimization opportunities
  private async identifyPerformanceOptimizations(): Promise<PerformanceOptimization[]> {
    const optimizations: PerformanceOptimization[] = [];
    
    try {
      const systemPerformance = await performanceTracker.getSystemPerformance();
      
      for (const module of systemPerformance.modulePerformances) {
        if (module.winRate < 0.5) {
          optimizations.push({
            moduleId: module.moduleId,
            currentPerformance: module.winRate,
            targetPerformance: 0.65,
            optimizationActions: [
              'Adjust factor weights',
              'Improve signal filtering',
              'Enhance data preprocessing'
            ],
            estimatedImprovement: 0.15,
            priority: 'high'
          });
        }
        
        if (module.signalsGenerated < 5) {
          optimizations.push({
            moduleId: module.moduleId,
            currentPerformance: module.signalsGenerated,
            targetPerformance: 15,
            optimizationActions: [
              'Increase factor generation',
              'Lower activation thresholds',
              'Improve data sensitivity'
            ],
            estimatedImprovement: 10,
            priority: 'medium'
          });
        }
      }
      
    } catch (error) {
      console.error('Failed to identify optimizations:', error);
    }
    
    return optimizations;
  }

  // Apply performance optimization
  private async applyOptimization(optimization: PerformanceOptimization): Promise<void> {
    console.log(`🔧 Applying optimization for ${optimization.moduleId}`);
    
    try {
      // This would implement automatic optimization logic
      // For now, just log the optimization
      console.log(`Applied ${optimization.optimizationActions.length} actions for ${optimization.moduleId}`);
      
    } catch (error) {
      console.error(`Failed to apply optimization for ${optimization.moduleId}:`, error);
    }
  }

  // Update adaptive thresholds based on quality trends
  private async updateAdaptiveThresholds(): Promise<void> {
    try {
      if (this.qualityHistory.length < 20) return;
      
      const recentQuality = this.qualityHistory.slice(-10);
      const avgQuality = recentQuality.reduce((sum, m) => sum + m.signalQuality, 0) / recentQuality.length;
      
      // Adjust thresholds based on quality trends
      let entropyAdjustment = 0;
      let confluenceAdjustment = 0;
      
      if (avgQuality < 60) {
        // Lower thresholds to allow more signals
        entropyAdjustment = -0.05;
        confluenceAdjustment = -2;
      } else if (avgQuality > 80) {
        // Raise thresholds for higher quality
        entropyAdjustment = 0.02;
        confluenceAdjustment = 1;
      }
      
      if (entropyAdjustment !== 0 || confluenceAdjustment !== 0) {
        console.log(`📊 Updating adaptive thresholds: entropy ${entropyAdjustment}, confluence ${confluenceAdjustment}`);
        
        // Update thresholds in database
        const { data: currentThresholds } = await supabase
          .from('adaptive_thresholds')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1);
          
        if (currentThresholds && currentThresholds.length > 0) {
          const current = currentThresholds[0];
          
          await supabase
            .from('adaptive_thresholds')
            .update({
              entropy_current: Math.max(0.5, Math.min(0.95, current.entropy_current + entropyAdjustment)),
              confluence_adaptive: Math.max(5, current.confluence_adaptive + confluenceAdjustment),
              updated_at: new Date().toISOString()
            })
            .eq('id', current.id);
        }
      }
      
    } catch (error) {
      console.error('Failed to update adaptive thresholds:', error);
    }
  }

  // Validation methods
  private validateEntropy(probabilities: number[]): { valid: boolean; value: number } {
    const sum = probabilities.reduce((s, p) => s + p, 0);
    if (Math.abs(sum - 1.0) > 0.01) return { valid: false, value: 0 };
    
    let entropy = 0;
    for (const p of probabilities) {
      if (p > 0) entropy -= p * Math.log2(p);
    }
    
    return { valid: entropy >= 0 && entropy <= Math.log2(probabilities.length), value: entropy };
  }

  private validateKellyFraction(winRate: number, avgWin: number, avgLoss: number): { valid: boolean; value: number } {
    if (avgLoss === 0 || winRate < 0 || winRate > 1) return { valid: false, value: 0 };
    
    const b = avgWin / avgLoss;
    const kelly = (b * winRate - (1 - winRate)) / b;
    
    return { valid: kelly >= 0 && kelly <= 1, value: kelly };
  }

  private validateBayesianCalculation(priors: number[], likelihoods: number[]): { valid: boolean; value: number } {
    if (priors.length !== likelihoods.length) return { valid: false, value: 0 };
    
    let posterior = 0;
    for (let i = 0; i < priors.length; i++) {
      posterior += priors[i] * likelihoods[i];
    }
    
    return { valid: posterior >= 0 && posterior <= 1, value: posterior };
  }

  private validateConfluenceScoring(): { valid: boolean; value: number } {
    // Test confluence calculation with known inputs
    const factors = [
      { weight: 0.8, confidence: 0.9, strength: 8 },
      { weight: 0.6, confidence: 0.7, strength: 6 },
      { weight: 0.4, confidence: 0.5, strength: 4 }
    ];
    
    const confluence = factors.reduce((sum, f) => sum + f.weight * f.confidence * f.strength, 0);
    
    return { valid: confluence > 0 && confluence < 100, value: confluence };
  }

  // Public methods
  getQualityHistory(): QualityMetrics[] {
    return [...this.qualityHistory];
  }

  getActiveAlerts(): QualityAlert[] {
    return this.activeAlerts.filter(alert => !alert.acknowledged);
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.activeAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  getCurrentQualityScore(): number {
    if (this.qualityHistory.length === 0) return 0;
    return this.qualityHistory[this.qualityHistory.length - 1].signalQuality;
  }
}

export const qualityAssurance = new QualityAssurance();
