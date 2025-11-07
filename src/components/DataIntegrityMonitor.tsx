import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface IntegrityMetrics {
  zeroPnlTrades: number;
  lastExecutionTime: string | null;
  pendingSignals: number;
  executionRate: number;
  commonRejectionReason: string;
  orphanedTrades: number;
}

export const DataIntegrityMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<IntegrityMetrics>({
    zeroPnlTrades: 0,
    lastExecutionTime: null,
    pendingSignals: 0,
    executionRate: 0,
    commonRejectionReason: 'None',
    orphanedTrades: 0
  });
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);

  const loadIntegrityMetrics = async () => {
    try {
      // Count trades with profit_pips != 0 but pnl = 0
      const { count: zeroPnlCount } = await supabase
        .from('shadow_trades')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'closed')
        .neq('profit_pips', 0)
        .eq('pnl', 0);

      // Get last execution timestamp
      const { data: lastExec } = await supabase
        .from('trade_execution_log')
        .select('execution_timestamp')
        .order('execution_timestamp', { ascending: false })
        .limit(1);

      // Get pending signals
      const { data: signals } = await supabase
        .from('master_signals')
        .select('status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const pending = signals?.filter(s => s.status === 'pending').length || 0;
      const executed = signals?.filter(s => s.status === 'executed').length || 0;
      const executionRate = (pending + executed) > 0 ? (executed / (pending + executed)) * 100 : 0;

      // Get most common rejection reason
      const { data: rejections } = await supabase
        .from('trade_decision_log')
        .select('decision_reason')
        .eq('decision', 'rejected')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(100);

      const reasonCounts: Record<string, number> = {};
      rejections?.forEach(r => {
        reasonCounts[r.decision_reason] = (reasonCounts[r.decision_reason] || 0) + 1;
      });
      
      const commonReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

      // Count orphaned trades
      const { count: orphanedCount } = await supabase
        .from('shadow_trades')
        .select('*', { count: 'exact', head: true })
        .is('master_signal_id', null);

      setMetrics({
        zeroPnlTrades: zeroPnlCount || 0,
        lastExecutionTime: lastExec?.[0]?.execution_timestamp || null,
        pendingSignals: pending,
        executionRate,
        commonRejectionReason: commonReason,
        orphanedTrades: orphanedCount || 0
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading integrity metrics:', error);
      toast({
        title: 'Load Error',
        description: 'Failed to load integrity metrics',
        variant: 'destructive'
      });
    }
  };

  const rebuildEntryPrices = async () => {
    setRebuilding(true);
    try {
      const { data, error } = await supabase.functions.invoke('rebuild-entry-and-pnl', {
        body: {}
      });

      if (error) throw error;

      toast({
        title: 'Rebuild Complete',
        description: `${data.results.corrected} trades corrected, ${data.results.skipped} skipped`,
      });

      loadIntegrityMetrics();
    } catch (error) {
      console.error('Rebuild error:', error);
      toast({
        title: 'Rebuild Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setRebuilding(false);
    }
  };

  useEffect(() => {
    loadIntegrityMetrics();
    const interval = setInterval(loadIntegrityMetrics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getHealthStatus = () => {
    if (metrics.zeroPnlTrades > 0) return { color: 'destructive', icon: AlertTriangle, label: 'Data Issues' };
    if (metrics.executionRate < 50) return { color: 'warning', icon: AlertCircle, label: 'Low Execution' };
    return { color: 'success', icon: CheckCircle, label: 'Healthy' };
  };

  const health = getHealthStatus();
  const HealthIcon = health.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <HealthIcon className="h-5 w-5" />
            Data Integrity
          </CardTitle>
          <Badge variant={health.color as any}>{health.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Integrity Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground">Zero P&L Trades</div>
            <div className={`text-2xl font-bold ${metrics.zeroPnlTrades > 0 ? 'text-destructive' : 'text-green-600'}`}>
              {metrics.zeroPnlTrades}
            </div>
          </div>

          <div className="p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground">Pending Signals</div>
            <div className="text-2xl font-bold">{metrics.pendingSignals}</div>
          </div>

          <div className="p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground">Execution Rate</div>
            <div className={`text-2xl font-bold ${metrics.executionRate < 50 ? 'text-yellow-600' : 'text-green-600'}`}>
              {metrics.executionRate.toFixed(0)}%
            </div>
          </div>

          <div className="p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground">Orphaned Trades</div>
            <div className={`text-2xl font-bold ${metrics.orphanedTrades > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
              {metrics.orphanedTrades}
            </div>
          </div>

          <div className="p-3 border rounded-lg col-span-2">
            <div className="text-sm text-muted-foreground">Last Execution</div>
            <div className="text-sm font-medium">
              {metrics.lastExecutionTime 
                ? new Date(metrics.lastExecutionTime).toLocaleString()
                : 'No recent executions'}
            </div>
          </div>
        </div>

        {/* Common Rejection Reason */}
        <div className="p-3 border rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Most Common Rejection</div>
          <div className="text-sm font-medium">{metrics.commonRejectionReason}</div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={rebuildEntryPrices}
            disabled={rebuilding || metrics.zeroPnlTrades === 0}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${rebuilding ? 'animate-spin' : ''}`} />
            {rebuilding ? 'Rebuilding...' : 'Rebuild Entry Prices'}
          </Button>
          
          <Button
            onClick={loadIntegrityMetrics}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Status Messages */}
        {metrics.zeroPnlTrades > 0 && (
          <div className="p-3 bg-destructive/10 border border-destructive rounded-lg text-sm">
            <strong>Action Required:</strong> {metrics.zeroPnlTrades} trades have invalid P&L data. 
            Click "Rebuild Entry Prices" to fix.
          </div>
        )}

        {metrics.executionRate < 50 && metrics.pendingSignals > 5 && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500 rounded-lg text-sm">
            <strong>Low Execution:</strong> {metrics.pendingSignals} pending signals with {metrics.executionRate.toFixed(0)}% execution rate.
            Check execution logs for details.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DataIntegrityMonitor;
