import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Zap,
  RefreshCw
} from 'lucide-react';

interface ModuleHealth {
  module_name: string;
  last_run: string;
  error_count: number;
  performance_score: number;
  signals_generated_today: number;
  status: string;
  last_error?: string;
}

export const SystemHealthMonitor: React.FC = () => {
  const [moduleHealth, setModuleHealth] = useState<ModuleHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [lastAutoRun, setLastAutoRun] = useState<Date | null>(null);

  useEffect(() => {
    fetchModuleHealth();
    
    // Subscribe to module_health changes to detect auto-runs
    const subscription = supabase
      .channel('module_health_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'module_health' },
        () => {
          setLastAutoRun(new Date());
          fetchModuleHealth();
        }
      )
      .subscribe();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchModuleHealth, 30000);
    
    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const fetchModuleHealth = async () => {
    try {
      const { data, error } = await supabase
        .from('module_health')
        .select('*')
        .order('module_name');

      if (error) throw error;
      setModuleHealth(data || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching module health:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysisPipeline = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('process-analysis-pipeline');
      
      if (error) throw error;
      
      console.log('Pipeline executed successfully:', data);
      
      // Refresh health data after pipeline run
      setTimeout(fetchModuleHealth, 2000);
    } catch (error) {
      console.error('Error running analysis pipeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string, errorCount: number) => {
    if (errorCount > 0) return 'destructive';
    if (status === 'active') return 'default';
    return 'secondary';
  };

  const getStatusIcon = (status: string, errorCount: number) => {
    if (errorCount > 0) return <AlertTriangle className="h-4 w-4" />;
    if (status === 'active') return <CheckCircle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatModuleName = (name: string) => {
    return name.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getLastRunStatus = (lastRun: string) => {
    const now = new Date();
    const lastRunDate = new Date(lastRun);
    const diffMinutes = (now.getTime() - lastRunDate.getTime()) / (1000 * 60);
    
    if (diffMinutes < 5) return { status: 'recent', text: 'Just now', color: 'text-green-600' };
    if (diffMinutes < 30) return { status: 'normal', text: `${Math.floor(diffMinutes)}m ago`, color: 'text-yellow-600' };
    return { status: 'stale', text: `${Math.floor(diffMinutes)}m ago`, color: 'text-red-600' };
  };

  if (loading && moduleHealth.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading system health...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health Monitor
            </CardTitle>
            <CardDescription>
              Real-time status of analysis modules and data pipelines
              <span className="text-green-600 dark:text-green-400 text-xs ml-2">
                ● Auto-running every 5 minutes
                {lastAutoRun && ` (Last: ${lastAutoRun.toLocaleTimeString()})`}
              </span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={runAnalysisPipeline} 
              disabled={loading}
              size="sm"
              variant="outline"
            >
              <Zap className="h-4 w-4 mr-2" />
              {loading ? 'Running...' : 'Run Pipeline'}
            </Button>
            <Button 
              onClick={fetchModuleHealth} 
              disabled={loading}
              size="sm"
              variant="ghost"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {lastUpdate && (
          <div className="text-xs text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {moduleHealth.map((module) => {
            const lastRunStatus = getLastRunStatus(module.last_run);
            
            return (
              <Card key={module.module_name} className="border-l-4 border-l-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">
                      {formatModuleName(module.module_name)}
                    </CardTitle>
                    <Badge 
                      variant={getStatusColor(module.status, module.error_count)}
                      className="text-xs"
                    >
                      {getStatusIcon(module.status, module.error_count)}
                      <span className="ml-1">
                        {module.error_count > 0 ? 'Error' : module.status}
                      </span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-muted-foreground text-xs">Last Run</div>
                        <div className={`font-medium ${lastRunStatus.color}`}>
                          {lastRunStatus.text}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Performance</div>
                        <div className={`font-medium ${getPerformanceColor(module.performance_score)}`}>
                          {(module.performance_score * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-muted-foreground text-xs">Signals Today</div>
                        <div className="font-medium">
                          {module.signals_generated_today}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Errors</div>
                        <div className={`font-medium ${module.error_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {module.error_count}
                        </div>
                      </div>
                    </div>

                    {module.last_error && (
                      <div className="p-2 bg-destructive/10 rounded text-xs">
                        <div className="text-muted-foreground">Last Error:</div>
                        <div className="text-destructive font-mono">
                          {module.last_error.substring(0, 50)}...
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {moduleHealth.length === 0 && (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Module Health Data</h3>
            <p className="text-muted-foreground mb-4">
              No analysis modules are currently reporting health status.
            </p>
            <Button onClick={runAnalysisPipeline} disabled={loading}>
              <Zap className="h-4 w-4 mr-2" />
              Initialize Analysis Pipeline
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};