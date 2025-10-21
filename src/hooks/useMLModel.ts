import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MLModelStatus {
  version: string | null;
  lastTrainedDays: number | null;
  trainingStatus: 'idle' | 'training' | 'error';
  isActive: boolean;
  closedTradesCount: number;
  autoTrainingEnabled: boolean;
}

interface MLPerformanceMetrics {
  exitAccuracy: number;
  profitImprovement: number;
}

interface MLAnalytics {
  comparison: Array<{
    metric: string;
    ml: string;
    traditional: string;
    improvement: number;
  }>;
  versions: Array<{
    version: string;
    trained_date: string;
    win_rate: number;
    trades_executed: number;
    avg_profit: number;
    status: string;
  }>;
  exitTiming: Array<{
    scenario: string;
    avg_profit: number;
    trade_count: number;
    win_rate: number;
  }>;
}

export const useMLModel = () => {
  const [mlModelStatus, setMLModelStatus] = useState<MLModelStatus>({
    version: null,
    lastTrainedDays: null,
    trainingStatus: 'idle',
    isActive: false,
    closedTradesCount: 0,
    autoTrainingEnabled: true
  });
  
  const [mlPerformance, setMLPerformance] = useState<MLPerformanceMetrics>({
    exitAccuracy: 0,
    profitImprovement: 0
  });
  
  const [mlAnalytics, setMLAnalytics] = useState<MLAnalytics>({
    comparison: [],
    versions: [],
    exitTiming: []
  });
  
  const [isTrainingML, setIsTrainingML] = useState(false);

  // Fetch ML model status
  const fetchMLModelStatus = async () => {
    try {
      // Get active model
      const { data: activeModel } = await supabase
        .from('ml_exit_models')
        .select('model_version, created_at, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // Count closed trades
      const { count: closedCount } = await supabase
        .from('shadow_trades')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'closed');
      
      const lastTrainedDays = activeModel 
        ? Math.floor((Date.now() - new Date(activeModel.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      
      setMLModelStatus({
        version: activeModel?.model_version || null,
        lastTrainedDays,
        trainingStatus: 'idle',
        isActive: activeModel?.is_active || false,
        closedTradesCount: closedCount || 0,
        autoTrainingEnabled: true
      });
    } catch (error) {
      console.error('Error fetching ML model status:', error);
    }
  };

  // Fetch ML performance metrics
  const fetchMLPerformance = async () => {
    try {
      const { data: perfData } = await supabase
        .rpc('get_ml_performance_analytics', { p_days_back: 30 });
      
      if (perfData && perfData.length > 0) {
        const avgProfitRow = perfData.find((r: any) => r.metric_name === 'Average Profit (pips)');
        const winRateRow = perfData.find((r: any) => r.metric_name === 'Win Rate (%)');
        
        setMLPerformance({
          exitAccuracy: winRateRow?.ml_exits || 0,
          profitImprovement: avgProfitRow?.improvement_percent || 0
        });
      }
    } catch (error) {
      console.error('Error fetching ML performance:', error);
    }
  };

  // Fetch ML analytics
  const fetchMLAnalytics = async () => {
    try {
      // Comparison data
      const { data: compData } = await supabase
        .rpc('get_ml_performance_analytics', { p_days_back: 30 });
      
      const comparison = (compData || []).map((row: any) => ({
        metric: row.metric_name,
        ml: row.ml_exits?.toFixed(2) || '0',
        traditional: row.traditional_exits?.toFixed(2) || '0',
        improvement: row.improvement_percent || 0
      }));
      
      // Version performance data
      const { data: versionsData } = await supabase
        .rpc('get_ml_model_versions_performance');
      
      const versions = (versionsData || []).map((v: any) => ({
        version: v.model_version,
        trained_date: new Date(v.trained_date).toLocaleDateString(),
        win_rate: v.actual_win_rate || 0,
        trades_executed: v.trades_executed || 0,
        avg_profit: v.avg_profit_pips || 0,
        status: v.status
      }));
      
      // Exit timing data
      const { data: timingData } = await supabase
        .rpc('analyze_ml_exit_timing', { p_days_back: 30 });
      
      const exitTiming = (timingData || []).map((t: any) => ({
        scenario: t.exit_scenario,
        avg_profit: t.avg_profit_pips || 0,
        trade_count: t.trade_count || 0,
        win_rate: t.win_rate || 0
      }));
      
      setMLAnalytics({
        comparison,
        versions,
        exitTiming
      });
    } catch (error) {
      console.error('Error fetching ML analytics:', error);
    }
  };

  // Trigger ML training
  const triggerMLTraining = async () => {
    if (isTrainingML) return;
    
    setIsTrainingML(true);
    setMLModelStatus(prev => ({ ...prev, trainingStatus: 'training' }));
    
    try {
      const { data, error } = await supabase.functions.invoke('train-exit-model', {
        body: { auto_triggered: false, trigger_reason: 'manual' }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        console.log('✅ ML Model trained successfully:', data.modelVersion);
        await fetchMLModelStatus();
        await fetchMLPerformance();
        await fetchMLAnalytics();
        setMLModelStatus(prev => ({ ...prev, trainingStatus: 'idle' }));
      } else if (data?.skipped) {
        console.log('ℹ️ Training skipped:', data.reason);
        setMLModelStatus(prev => ({ ...prev, trainingStatus: 'idle' }));
      } else {
        throw new Error(data?.error || 'Training failed');
      }
    } catch (error) {
      console.error('❌ ML Training failed:', error);
      setMLModelStatus(prev => ({ ...prev, trainingStatus: 'error' }));
    } finally {
      setIsTrainingML(false);
    }
  };

  // Auto-training logic
  useEffect(() => {
    if (!mlModelStatus.autoTrainingEnabled) return;
    
    const { closedTradesCount, lastTrainedDays, trainingStatus } = mlModelStatus;
    
    // Milestone trigger: Every 20 trades after first 20
    if (
      closedTradesCount >= 20 && 
      closedTradesCount % 20 === 0 &&
      trainingStatus === 'idle' &&
      !isTrainingML
    ) {
      console.log(`🤖 Auto-triggering ML training after ${closedTradesCount} closed trades`);
      triggerMLTraining();
    }
    
    // Staleness trigger: Model >10 days old
    if (
      lastTrainedDays !== null &&
      lastTrainedDays > 10 &&
      closedTradesCount >= 20 &&
      trainingStatus === 'idle' &&
      !isTrainingML
    ) {
      console.log(`🤖 Auto-triggering ML training due to model age (${lastTrainedDays} days)`);
      triggerMLTraining();
    }
  }, [mlModelStatus.closedTradesCount, mlModelStatus.lastTrainedDays]);

  // Initial load and periodic refresh
  useEffect(() => {
    fetchMLModelStatus();
    fetchMLPerformance();
    fetchMLAnalytics();
    
    const interval = setInterval(() => {
      fetchMLModelStatus();
      fetchMLPerformance();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  return {
    mlModelStatus,
    mlPerformance,
    mlAnalytics,
    isTrainingML,
    triggerMLTraining,
    refreshMLData: () => {
      fetchMLModelStatus();
      fetchMLPerformance();
      fetchMLAnalytics();
    }
  };
};