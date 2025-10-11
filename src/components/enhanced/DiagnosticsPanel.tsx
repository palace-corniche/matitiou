import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, AlertTriangle, CheckCircle, Clock, Zap, 
  TrendingUp, BarChart3, Wifi, WifiOff, RefreshCw, Database, Trash2, Newspaper 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { marketDataService } from '@/services/realTimeMarketData';
import { toast } from 'sonner';

interface DiagnosticResult {
  check_name: string;
  status: string;
  value: number;
  message: string;
}

interface DiagnosticsData {
  lastUpdated: Date;
  results: DiagnosticResult[];
  connectionStatus: boolean;
  latency: number;
  activeModules: number;
  errorCount: number;
}

const DiagnosticsPanel: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData>({
    lastUpdated: new Date(),
    results: [],
    connectionStatus: false,
    latency: 0,
    activeModules: 0,
    errorCount: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    runDiagnostics();
    
    if (autoRefresh) {
      const interval = setInterval(runDiagnostics, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  useEffect(() => {
    // Monitor market data connection
    const unsubscribe = marketDataService.subscribe({
      onTick: () => {
        setDiagnostics(prev => ({
          ...prev,
          connectionStatus: true,
          latency: 0 // Would calculate actual latency in real implementation
        }));
      },
      onError: (error) => {
        console.error('Market data error:', error);
        setDiagnostics(prev => ({
          ...prev,
          connectionStatus: false
        }));
      }
    });

    return unsubscribe;
  }, []);

  const handleBackfillOrphans = async () => {
    try {
      setIsLoading(true);
      toast.info('Backfilling orphan trades...');
      
      const { data, error } = await supabase.functions.invoke('backfill-trade-history');
      
      if (error) throw error;
      
      toast.success(`Backfilled ${data?.backfilled_count || 0} trades`);
      await runDiagnostics();
    } catch (error) {
      console.error('Backfill error:', error);
      toast.error('Failed to backfill trades');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncGlobalAccount = async () => {
    try {
      setIsLoading(true);
      toast.info('Syncing global account metrics...');
      
      const { data, error } = await supabase.functions.invoke('admin-sync-global-account');
      
      if (error) throw error;
      
      toast.success('Global account synced successfully');
      await runDiagnostics();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanupDuplicates = async () => {
    try {
      setIsLoading(true);
      toast.info('Cleaning duplicate trades...');
      
      const { error } = await supabase.functions.invoke('cleanup-duplicate-trades');
      
      if (error) throw error;
      
      toast.success('Duplicates cleaned successfully');
      await runDiagnostics();
    } catch (error) {
      console.error('Cleanup error:', error);
      toast.error('Failed to cleanup duplicates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchNewsSentiment = async () => {
    try {
      setIsLoading(true);
      toast.info('Fetching latest news sentiment...');
      
      const { data, error } = await supabase.functions.invoke('fetch-news-sentiment');
      
      if (error) throw error;
      
      toast.success(`Processed ${data?.processed || 0} news articles`);
      await runDiagnostics();
    } catch (error) {
      console.error('News fetch error:', error);
      toast.error('Failed to fetch news sentiment');
    } finally {
      setIsLoading(false);
    }
  };

  const runDiagnostics = async () => {
    try {
      setIsLoading(true);
      
      const startTime = Date.now();
      const { data: results, error } = await supabase.rpc('run_trading_diagnostics');
      const endTime = Date.now();
      
      if (error) throw error;
      
      // Get additional diagnostic info
      const connectionStatus = marketDataService.getConnectionStatus();
      
      // Count active signal modules
      const { data: moduleData } = await supabase
        .from('module_performance')
        .select('module_id')
        .gt('signals_generated', 0)
        .gte('last_updated', new Date(Date.now() - 3600000).toISOString()); // Last hour
      
      // Count recent errors
      const { data: errorData } = await supabase
        .from('trading_diagnostics')
        .select('id')
        .eq('severity_level', 'error')
        .gte('timestamp', new Date(Date.now() - 3600000).toISOString()); // Last hour
      
      setDiagnostics({
        lastUpdated: new Date(),
        results: results || [],
        connectionStatus,
        latency: endTime - startTime,
        activeModules: moduleData?.length || 0,
        errorCount: errorData?.length || 0
      });
      
    } catch (error) {
      console.error('Diagnostics error:', error);
      toast.error('Failed to run diagnostics');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const overallHealth = diagnostics.results.length > 0 
    ? diagnostics.results.every(r => r.status === 'healthy') ? 'healthy' : 'warning'
    : 'unknown';

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <CardTitle className="text-sm">System Diagnostics</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={runDiagnostics}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>
        </div>
        <CardDescription>
          Real-time system health monitoring
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center space-x-2">
            {getStatusIcon(overallHealth)}
            <span className="font-medium">Overall Status</span>
          </div>
          <Badge variant={overallHealth === 'healthy' ? 'default' : 'destructive'}>
            {overallHealth.toUpperCase()}
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              {diagnostics.connectionStatus ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Connection</span>
            </div>
            <Badge variant={diagnostics.connectionStatus ? 'default' : 'destructive'}>
              {diagnostics.connectionStatus ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Latency</span>
            </div>
            <span className="text-sm font-mono">
              {diagnostics.latency}ms
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span className="text-sm">Active Modules</span>
            </div>
            <Badge variant="outline">
              {diagnostics.activeModules}/8
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Errors (1h)</span>
            </div>
            <Badge variant={diagnostics.errorCount > 0 ? 'destructive' : 'default'}>
              {diagnostics.errorCount}
            </Badge>
          </div>
        </div>

        {/* Detailed Results */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Detailed Checks</h4>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {diagnostics.results.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(result.status)}
                    <span className="text-sm font-medium">
                      {result.check_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      {result.value !== null && (
                        <span className="font-mono">
                          {typeof result.value === 'number' ? result.value.toFixed(2) : result.value}
                        </span>
                      )}
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getStatusColor(result.status)} text-white`}
                    >
                      {result.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* System Performance */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Performance</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Signal Generation</span>
              <span>{Math.min(100, (diagnostics.activeModules / 8) * 100).toFixed(0)}%</span>
            </div>
            <Progress value={Math.min(100, (diagnostics.activeModules / 8) * 100)} className="h-2" />
            
            <div className="flex justify-between text-xs">
              <span>Connection Quality</span>
              <span>{diagnostics.connectionStatus ? '100' : '0'}%</span>
            </div>
            <Progress value={diagnostics.connectionStatus ? 100 : 0} className="h-2" />
          </div>
        </div>

        {/* Admin Actions */}
        <div className="space-y-2 pt-2 border-t">
          <h4 className="text-sm font-medium">Data Management</h4>
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackfillOrphans}
              disabled={isLoading}
              className="w-full justify-start"
            >
              <Database className="h-4 w-4 mr-2" />
              Backfill Trade History
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncGlobalAccount}
              disabled={isLoading}
              className="w-full justify-start"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Account Metrics
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCleanupDuplicates}
              disabled={isLoading}
              className="w-full justify-start"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Cleanup Duplicates
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetchNewsSentiment}
              disabled={isLoading}
              className="w-full justify-start"
            >
              <Newspaper className="h-4 w-4 mr-2" />
              Fetch News Sentiment
            </Button>
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Last updated: {diagnostics.lastUpdated.toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};

export default DiagnosticsPanel;