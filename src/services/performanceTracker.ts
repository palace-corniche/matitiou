// Advanced Performance Tracking System
// Real-time module performance analytics with ML-ready features

import { supabase } from '@/integrations/supabase/client';

export interface PerformanceMetrics {
  moduleId: string;
  signalsGenerated: number;
  successfulSignals: number;
  failedSignals: number;
  winRate: number;
  averageReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  reliability: number;
  informationRatio: number;
  averageConfidence: number;
  averageStrength: number;
  recentPerformance: number[]; // Last 10 trades
  lastUpdated: Date;
  trend: 'improving' | 'declining' | 'stable';
  status: 'active' | 'underperforming' | 'excellent';
}

export interface SystemPerformance {
  totalSignalsGenerated: number;
  totalSignalsExecuted: number;
  overallWinRate: number;
  systemReliability: number;
  averageProcessingTime: number;
  modulePerformances: PerformanceMetrics[];
  correlationMatrix: Record<string, Record<string, number>>;
  adaptiveThresholds: {
    entropyMin: number;
    entropyMax: number;
    confluenceMin: number;
    edgeMin: number;
  };
  lastSystemUpdate: Date;
}

export class PerformanceTracker {
  private performanceCache: Map<string, PerformanceMetrics> = new Map();
  private correlationCache: Record<string, Record<string, number>> = {};
  
  // Track real-time performance updates
  async trackSignalOutcome(
    signalId: string,
    moduleId: string,
    outcome: {
      success: boolean;
      return: number;
      confidence: number;
      strength: number;
      executionTime: number;
    }
  ): Promise<void> {
    console.log(`📊 Tracking performance for ${moduleId}: ${outcome.success ? 'WIN' : 'LOSS'} (${(outcome.return * 100).toFixed(2)}%)`);
    
    try {
      // Check if module performance record exists
      const { data: existing } = await supabase
        .from('module_performance')
        .select('*')
        .eq('module_id', moduleId)
        .maybeSingle();

      if (existing) {
        await this.updateExistingPerformance(existing, outcome);
      } else {
        await this.createNewPerformanceRecord(moduleId, outcome);
      }

      // Update cache
      await this.refreshPerformanceCache(moduleId);
      
    } catch (error) {
      console.error('Failed to track performance:', error);
      // Store in local cache as fallback
      this.performanceCache.set(moduleId, {
        moduleId,
        signalsGenerated: (this.performanceCache.get(moduleId)?.signalsGenerated || 0) + 1,
        successfulSignals: (this.performanceCache.get(moduleId)?.successfulSignals || 0) + (outcome.success ? 1 : 0),
        failedSignals: (this.performanceCache.get(moduleId)?.failedSignals || 0) + (outcome.success ? 0 : 1),
        winRate: outcome.success ? 1 : 0,
        averageReturn: outcome.return,
        sharpeRatio: 0,
        maxDrawdown: outcome.return < 0 ? Math.abs(outcome.return) : 0,
        reliability: 0.7,
        informationRatio: 0,
        averageConfidence: outcome.confidence,
        averageStrength: outcome.strength,
        recentPerformance: [outcome.return],
        lastUpdated: new Date(),
        trend: 'stable' as const,
        status: 'active' as const
      });
    }
  }
  
  private async updateExistingPerformance(existing: any, outcome: any): Promise<void> {
    const newSignalsCount = existing.signals_generated + 1;
    const newSuccessCount = existing.successful_signals + (outcome.success ? 1 : 0);
    const newWinRate = newSuccessCount / newSignalsCount;
    
    // Exponential moving average for returns
    const alpha = Math.min(0.1, 2 / (newSignalsCount + 1));
    const newAvgReturn = existing.average_return * (1 - alpha) + outcome.return * alpha;
    
    // Update max drawdown
    let newMaxDrawdown = existing.max_drawdown;
    if (outcome.return < 0) {
      newMaxDrawdown = Math.max(newMaxDrawdown, Math.abs(outcome.return));
    }
    
    // Calculate Sharpe ratio approximation
    const returnVariance = Math.abs(outcome.return - newAvgReturn);
    const newSharpeRatio = returnVariance > 0 ? newAvgReturn / returnVariance : 0;
    
    // Update reliability score
    const newReliability = Math.min(1, Math.max(0.1,
      newWinRate * 0.6 + (newSharpeRatio > 0 ? 0.3 : 0) + 0.1
    ));
    
    // Update recent performance array (last 10 trades)
    const recentPerf = existing.recent_performance || [];
    recentPerf.push(outcome.return);
    if (recentPerf.length > 10) recentPerf.shift();
    
    await supabase
      .from('module_performance')
      .update({
        signals_generated: newSignalsCount,
        successful_signals: newSuccessCount,
        failed_signals: newSignalsCount - newSuccessCount,
        win_rate: newWinRate,
        average_return: newAvgReturn,
        sharpe_ratio: newSharpeRatio,
        max_drawdown: newMaxDrawdown,
        reliability: newReliability,
        average_confidence: (existing.average_confidence + outcome.confidence) / 2,
        average_strength: (existing.average_strength + outcome.strength) / 2,
        recent_performance: recentPerf,
        last_updated: new Date().toISOString()
      })
      .eq('module_id', existing.module_id);
  }
  
  private async createNewPerformanceRecord(moduleId: string, outcome: any): Promise<void> {
    await supabase
      .from('module_performance')
      .insert({
        module_id: moduleId,
        signals_generated: 1,
        successful_signals: outcome.success ? 1 : 0,
        failed_signals: outcome.success ? 0 : 1,
        win_rate: outcome.success ? 1 : 0,
        average_return: outcome.return,
        sharpe_ratio: 0,
        max_drawdown: outcome.return < 0 ? Math.abs(outcome.return) : 0,
        reliability: 0.7,
        information_ratio: 0,
        average_confidence: outcome.confidence,
        average_strength: outcome.strength,
        recent_performance: [outcome.return],
        last_updated: new Date().toISOString(),
        trend: 'stable',
        status: 'active'
      });
  }
  
  // Get comprehensive system performance with mock data until types are ready
  async getSystemPerformance(): Promise<SystemPerformance> {
    try {
      // Get system health metrics (this table exists)
      const { data: systemHealth } = await supabase
        .from('system_health')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      // Get adaptive thresholds (this table exists)
      const { data: thresholds } = await supabase
        .from('adaptive_thresholds')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);
      
      // Use cached performance data
      const modulePerformances: PerformanceMetrics[] = Array.from(this.performanceCache.values());
      
      const totalSignals = modulePerformances.reduce((sum, m) => sum + m.signalsGenerated, 0);
      const totalSuccessful = modulePerformances.reduce((sum, m) => sum + m.successfulSignals, 0);
      const overallWinRate = totalSignals > 0 ? totalSuccessful / totalSignals : 0;
      const systemReliability = modulePerformances.length > 0 
        ? modulePerformances.reduce((sum, m) => sum + m.reliability, 0) / modulePerformances.length 
        : 0;
      
      const avgProcessingTime = systemHealth?.length > 0
        ? systemHealth.reduce((sum, h) => sum + (h.execution_time_ms || 0), 0) / systemHealth.length
        : 0;
      
      const currentThresholds = thresholds?.[0] || {};
      
      return {
        totalSignalsGenerated: totalSignals,
        totalSignalsExecuted: totalSuccessful,
        overallWinRate,
        systemReliability,
        averageProcessingTime: avgProcessingTime,
        modulePerformances,
        correlationMatrix: this.correlationCache,
        adaptiveThresholds: {
          entropyMin: (currentThresholds as any).entropy_min || 0.7,
          entropyMax: (currentThresholds as any).entropy_max || 0.95,
          confluenceMin: (currentThresholds as any).confluence_min || 15,
          edgeMin: (currentThresholds as any).edge_min || 0.0001
        },
        lastSystemUpdate: new Date()
      };
      
    } catch (error) {
      console.error('Failed to get system performance:', error);
      throw error;
    }
  }
  
  private calculateTrend(recentPerformance: number[]): 'improving' | 'declining' | 'stable' {
    if (recentPerformance.length < 3) return 'stable';
    
    const recent = recentPerformance.slice(-3);
    const early = recentPerformance.slice(0, 3);
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const earlyAvg = early.reduce((sum, val) => sum + val, 0) / early.length;
    
    const improvement = recentAvg - earlyAvg;
    
    if (improvement > 0.02) return 'improving';
    if (improvement < -0.02) return 'declining';
    return 'stable';
  }
  
  private calculateStatus(reliability: number, winRate: number): 'active' | 'underperforming' | 'excellent' {
    if (reliability > 0.8 && winRate > 0.65) return 'excellent';
    if (reliability < 0.5 || winRate < 0.4) return 'underperforming';
    return 'active';
  }
  
  private async refreshPerformanceCache(moduleId: string): Promise<void> {
    try {
      const { data } = await supabase
        .from('module_performance')
        .select('*')
        .eq('module_id', moduleId)
        .maybeSingle();

      if (data) {
        this.performanceCache.set(moduleId, {
          moduleId: data.module_id,
          signalsGenerated: data.signals_generated || 0,
          successfulSignals: data.successful_signals || 0,
          failedSignals: data.failed_signals || 0,
          winRate: data.win_rate || 0,
          averageReturn: data.average_return || 0,
          sharpeRatio: data.sharpe_ratio || 0,
          maxDrawdown: data.max_drawdown || 0,
          reliability: data.reliability || 0.7,
          informationRatio: data.information_ratio || 0,
          averageConfidence: data.average_confidence || 0.5,
          averageStrength: data.average_strength || 5,
          recentPerformance: (data.recent_performance as number[]) || [],
          lastUpdated: new Date(data.last_updated || new Date()),
          trend: (data.trend as 'improving' | 'declining' | 'stable') || 'stable',
          status: (data.status as 'active' | 'underperforming' | 'excellent') || 'active'
        });
      }
    } catch (error) {
      console.error(`Failed to refresh cache for ${moduleId}:`, error);
    }
  }
  
  // Update correlation between modules based on signal co-occurrence
  async updateCorrelation(moduleA: string, moduleB: string, correlation: number): Promise<void> {
    if (!this.correlationCache[moduleA]) {
      this.correlationCache[moduleA] = {};
    }
    
    // Exponential moving average
    const alpha = 0.05;
    const currentCorr = this.correlationCache[moduleA][moduleB] || 0;
    this.correlationCache[moduleA][moduleB] = currentCorr * (1 - alpha) + correlation * alpha;
    
    console.log(`Updated correlation ${moduleA}-${moduleB}: ${this.correlationCache[moduleA][moduleB].toFixed(3)}`);
  }
  
  // Get performance for specific module
  getModulePerformance(moduleId: string): PerformanceMetrics | null {
    return this.performanceCache.get(moduleId) || null;
  }
  
  // Clear performance data (for testing/reset)
  async clearPerformanceData(): Promise<void> {
    this.performanceCache.clear();
    this.correlationCache = {};
    console.log('Performance data cleared from cache');
  }
}

export const performanceTracker = new PerformanceTracker();