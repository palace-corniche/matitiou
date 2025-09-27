import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Target, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface ModulePerformance {
  module_id: string;
  signals_generated: number;
  last_updated: string;
  reliability: number;
  average_confidence: number;
  average_strength: number;
  successful_signals: number;
  failed_signals: number;
  win_rate: number;
  average_return: number;
  max_drawdown: number;
  sharpe_ratio: number;
  information_ratio: number;
  created_at: string;
}

interface ModuleHealth {
  module_name: string;
  status: string;
  last_run: string;
  performance_score: number;
  signals_generated_today: number;
  error_count: number;
  last_error?: string;
}

const ModulePerformanceTracker: React.FC = () => {
  const [modulePerformance, setModulePerformance] = useState<ModulePerformance[]>([]);
  const [moduleHealth, setModuleHealth] = useState<ModuleHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModuleData();
    updateModulePerformance();

    // Set up real-time subscriptions
    const performanceChannel = supabase
      .channel('module-performance-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'module_performance'
      }, () => {
        fetchModuleData();
      })
      .subscribe();

    const healthChannel = supabase
      .channel('module-health-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'module_health'
      }, () => {
        fetchModuleData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(performanceChannel);
      supabase.removeChannel(healthChannel);
    };
  }, []);

  const fetchModuleData = async () => {
    try {
      // Fetch module performance data
      const { data: performanceData, error: perfError } = await supabase
        .from('module_performance')
        .select('*')
        .order('last_updated', { ascending: false });

      if (perfError) throw perfError;

      // Fetch module health data
      const { data: healthData, error: healthError } = await supabase
        .from('module_health')
        .select('*')
        .order('updated_at', { ascending: false });

      if (healthError) throw healthError;

      setModulePerformance(performanceData || []);
      setModuleHealth(healthData || []);
    } catch (error) {
      console.error('Failed to fetch module data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateModulePerformance = async () => {
    try {
      // Calculate updated performance metrics for each module
      const modules = [
        'technical_analysis',
        'fundamental_analysis',
        'sentiment_analysis',
        'multi_timeframe_analysis',
        'pattern_recognition',
        'market_structure',
        'volatility_analysis',
        'correlation_analysis'
      ];

      for (const moduleId of modules) {
        // Get signals from this module
        const { data: signals } = await supabase
          .from('modular_signals')
          .select('confidence, strength, created_at')
          .eq('module_id', moduleId)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        // Get execution data for this module's signals
        const { data: executions } = await supabase
          .from('trading_signals')
          .select('was_executed, confluence_score')
          .eq('was_executed', true);

        const signalCount = signals?.length || 0;
        const avgConfidence = signals?.reduce((sum, s) => sum + s.confidence, 0) / signalCount || 0;
        const avgStrength = signals?.reduce((sum, s) => sum + s.strength, 0) / signalCount || 0;
        const reliability = signalCount > 0 ? Math.min(1, signalCount / 10) : 0;

        // Update or insert module performance
        await supabase
          .from('module_performance')
          .upsert({
            module_id: moduleId,
            signals_generated: signalCount,
            last_updated: new Date().toISOString(),
            reliability,
            average_confidence: avgConfidence,
            average_strength: avgStrength,
            successful_signals: executions?.length || 0,
            failed_signals: Math.max(0, signalCount - (executions?.length || 0)),
            win_rate: executions?.length > 0 ? (executions.length / signalCount) : 0,
            average_return: 0.02, // placeholder
            max_drawdown: 0.05, // placeholder  
            sharpe_ratio: 0.8, // placeholder
            information_ratio: 0.6 // placeholder
          });

        // Update module health
        await supabase
          .from('module_health')
          .upsert({
            module_name: moduleId,
            status: signalCount > 0 ? 'active' : 'idle',
            last_run: new Date().toISOString(),
            performance_score: reliability,
            signals_generated_today: signalCount,
            error_count: 0,
            updated_at: new Date().toISOString()
          });
      }

      console.log('✅ Module performance updated successfully');
    } catch (error) {
      console.error('Failed to update module performance:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'text-green-500';
      case 'idle': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return <Badge className="bg-green-500">Active</Badge>;
      case 'idle': return <Badge variant="outline">Idle</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-500';
    if (score >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalModules = moduleHealth.length;
  const activeModules = moduleHealth.filter(m => m.status === 'active').length;
  const errorModules = moduleHealth.filter(m => m.status === 'error').length;
  const avgPerformance = moduleHealth.reduce((sum, m) => sum + m.performance_score, 0) / totalModules || 0;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Modules</p>
                <p className="text-2xl font-bold">{totalModules}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Modules</p>
                <p className="text-2xl font-bold text-green-500">{activeModules}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Error Modules</p>
                <p className="text-2xl font-bold text-red-500">{errorModules}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Performance</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(avgPerformance)}`}>
                  {(avgPerformance * 100).toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Module Health Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {moduleHealth.map((module) => (
              <div key={module.module_name} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{module.module_name.replace(/_/g, ' ').toUpperCase()}</h4>
                  {getStatusBadge(module.status)}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Performance</span>
                    <span className={getPerformanceColor(module.performance_score)}>
                      {(module.performance_score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={module.performance_score * 100} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Signals Today</p>
                    <p className="font-medium">{module.signals_generated_today}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Errors</p>
                    <p className="font-medium">{module.error_count}</p>
                  </div>
                </div>

                {module.last_error && (
                  <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
                    {module.last_error}
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Last run: {module.last_run ? new Date(module.last_run).toLocaleString() : 'Never'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Module Performance Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Module Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {modulePerformance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No performance data available.</p>
                <p className="text-sm mt-2">Performance tracking will populate as modules generate signals.</p>
              </div>
            ) : (
              modulePerformance.map((performance) => (
                <div key={performance.module_id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">
                      {performance.module_id.replace(/_/g, ' ').toUpperCase()}
                    </h4>
                    <Badge variant="outline">
                      Reliability: {(performance.reliability * 100).toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Signals Generated</p>
                      <p className="font-medium">{performance.signals_generated}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Confidence</p>
                      <p className="font-medium">{(performance.average_confidence * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Strength</p>
                      <p className="font-medium">{performance.average_strength.toFixed(1)}/10</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Win Rate</p>
                      <p className="font-medium">{(performance.win_rate * 100).toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Last updated: {new Date(performance.last_updated).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModulePerformanceTracker;