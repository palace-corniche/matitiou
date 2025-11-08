// PHASE 3: Real-time execution monitoring dashboard
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle, Clock, TrendingUp, Database } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
interface ExecutionMetrics {
  signalsPending: number;
  signalsExecuted: number;
  orphanedTrades: number;
  executionRate: number;
  avgDataFreshness: number;
  avgPriceDeviation: number;
  lastExecutionPath: string;
  recentExecutions: ExecutionLog[];
}
interface ExecutionLog {
  id: string;
  trade_id: string;
  signal_id: string;
  execution_path: string;
  data_freshness_ms: number;
  price_deviation_percent: number;
  execution_timestamp: string;
  validation_results: any; // JSONB type from database
}
export const TradeExecutionMonitor = () => {
  const [metrics, setMetrics] = useState<ExecutionMetrics>({
    signalsPending: 0,
    signalsExecuted: 0,
    orphanedTrades: 0,
    executionRate: 0,
    avgDataFreshness: 0,
    avgPriceDeviation: 0,
    lastExecutionPath: 'none',
    recentExecutions: []
  });
  const [loading, setLoading] = useState(true);
  const loadMetrics = async () => {
    try {
      // Get signal statistics
      const {
        data: signals
      } = await supabase.from('master_signals').select('status').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      const signalsPending = signals?.filter(s => s.status === 'pending').length || 0;
      const signalsExecuted = signals?.filter(s => s.status === 'executed').length || 0;

      // Get orphaned trades count
      const {
        count: orphanedCount
      } = await supabase.from('shadow_trades').select('*', {
        count: 'exact',
        head: true
      }).is('master_signal_id', null);

      // Get recent execution logs
      const {
        data: execLogs
      } = await supabase.from('trade_execution_log').select('*').order('execution_timestamp', {
        ascending: false
      }).limit(10);

      // Calculate averages
      const avgDataFreshness = execLogs?.length ? execLogs.reduce((sum, log) => sum + (log.data_freshness_ms || 0), 0) / execLogs.length : 0;
      const avgPriceDeviation = execLogs?.length ? execLogs.reduce((sum, log) => sum + (log.price_deviation_percent || 0), 0) / execLogs.length : 0;
      const executionRate = signalsPending + signalsExecuted > 0 ? signalsExecuted / (signalsPending + signalsExecuted) * 100 : 0;
      setMetrics({
        signalsPending,
        signalsExecuted,
        orphanedTrades: orphanedCount || 0,
        executionRate,
        avgDataFreshness,
        avgPriceDeviation,
        lastExecutionPath: execLogs?.[0]?.execution_path || 'none',
        recentExecutions: execLogs || []
      });
      setLoading(false);
    } catch (error) {
      console.error('Error loading execution metrics:', error);
      toast({
        title: 'Metrics Load Error',
        description: error instanceof Error ? error.message : 'Failed to load metrics',
        variant: 'destructive'
      });
    }
  };
  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);
  const getHealthStatus = () => {
    if (metrics.orphanedTrades > 0) return {
      color: 'destructive',
      label: 'Orphaned Trades Detected'
    };
    if (metrics.executionRate < 50) return {
      color: 'warning',
      label: 'Low Execution Rate'
    };
    if (metrics.avgDataFreshness > 5000) return {
      color: 'warning',
      label: 'Stale Data'
    };
    return {
      color: 'success',
      label: 'Healthy'
    };
  };
  const health = getHealthStatus();
  return <div className="space-y-4">
      <Card className="px-0 mx-0 my-0 py-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trade Execution Pipeline Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 mx-0">
          {/* Health Status */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="font-medium">Pipeline Health</span>
            <Badge variant={health.color as any}>{health.label}</Badge>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Signals Pending</div>
              <div className="text-2xl font-bold">{metrics.signalsPending}</div>
            </div>
            
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Execution Rate</div>
              <div className="text-2xl font-bold">{metrics.executionRate.toFixed(1)}%</div>
            </div>
            
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Orphaned Trades</div>
              <div className={`text-2xl font-bold ${metrics.orphanedTrades > 0 ? 'text-destructive' : 'text-success'}`}>
                {metrics.orphanedTrades}
              </div>
            </div>
            
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Data Freshness</div>
              <div className={`text-2xl font-bold ${metrics.avgDataFreshness > 5000 ? 'text-warning' : 'text-success'}`}>
                {(metrics.avgDataFreshness / 1000).toFixed(1)}s
              </div>
            </div>
          </div>

          {/* Execution Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Avg Price Deviation</div>
              <div className="text-lg font-semibold">{metrics.avgPriceDeviation.toFixed(4)}%</div>
              <div className="text-xs text-muted-foreground">Max: 0.1%</div>
            </div>
            
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Last Execution Path</div>
              <Badge variant={metrics.lastExecutionPath === 'advanced_fusion' ? 'default' : 'secondary'}>
                {metrics.lastExecutionPath}
              </Badge>
            </div>
          </div>

          {/* Recent Executions */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Recent Executions (Last 10)</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {metrics.recentExecutions.map(exec => <div key={exec.id} className="p-2 border rounded text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono">{exec.trade_id.slice(0, 8)}</span>
                    <Badge variant={exec.execution_path === 'advanced_fusion' ? 'default' : 'secondary'} className="text-xs">
                      {exec.execution_path}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {(exec.data_freshness_ms / 1000).toFixed(1)}s
                    </span>
                    <span className="flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      {exec.validation_results?.data_source || 'unknown'}
                    </span>
                    <span>{exec.price_deviation_percent?.toFixed(4)}% dev</span>
                  </div>
                  <div className="text-muted-foreground">
                    {new Date(exec.execution_timestamp).toLocaleString()}
                  </div>
                </div>)}
              {metrics.recentExecutions.length === 0 && <div className="p-4 text-center text-muted-foreground">
                  No recent executions
                </div>}
            </div>
          </div>

          {/* System Status */}
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">System Mode</span>
              <Badge variant="default">Advanced Fusion Exclusive</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default TradeExecutionMonitor;