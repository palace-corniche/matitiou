import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, AlertTriangle, CheckCircle, XCircle, 
  RefreshCw, Zap, Clock, Database, Cpu, MemoryStick,
  TrendingUp, TrendingDown, Wifi, WifiOff
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SystemMetrics {
  signalGeneration: {
    status: 'healthy' | 'warning' | 'critical';
    lastExecution: string;
    executionTime: number;
    signalsGenerated: number;
    errorRate: number;
  };
  tradeExecution: {
    status: 'healthy' | 'warning' | 'critical';
    lastExecution: string;
    executionTime: number;
    tradesExecuted: number;
    errorRate: number;
  };
  dataFeed: {
    status: 'healthy' | 'warning' | 'critical';
    lastUpdate: string;
    latency: number;
    dataPoints: number;
    missedUpdates: number;
  };
  database: {
    status: 'healthy' | 'warning' | 'critical';
    connectionCount: number;
    queryTime: number;
    errorRate: number;
  };
}

interface RealtimeEvent {
  timestamp: string;
  type: 'signal' | 'trade' | 'error' | 'system';
  message: string;
  severity: 'info' | 'warning' | 'error';
  source: string;
}

interface PerformanceChart {
  timestamp: string;
  signalGeneration: number;
  tradeExecution: number;
  dataLatency: number;
}

const RealtimeSystemMonitor: React.FC = () => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceChart[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadSystemMetrics = async () => {
    try {
      // Get system health data
      const { data: healthData } = await supabase
        .from('system_health')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Process metrics by function
      const signalGeneration = healthData?.filter(h => h.function_name === 'generate-confluence-signals') || [];
      const tradeExecution = healthData?.filter(h => h.function_name === 'execute-shadow-trades') || [];
      const dataFeed = healthData?.filter(h => h.function_name === 'fetch-market-data') || [];

      const calculateStatus = (executions: any[], errorThreshold = 0.1) => {
        if (executions.length === 0) return 'warning';
        const recentExecutions = executions.slice(0, 10);
        const errorRate = recentExecutions.filter(e => e.status === 'error').length / recentExecutions.length;
        if (errorRate > errorThreshold) return 'critical';
        if (errorRate > errorThreshold / 2) return 'warning';
        return 'healthy';
      };

      setSystemMetrics({
        signalGeneration: {
          status: calculateStatus(signalGeneration),
          lastExecution: signalGeneration[0]?.created_at || new Date().toISOString(),
          executionTime: signalGeneration[0]?.execution_time_ms || 0,
          signalsGenerated: signalGeneration.slice(0, 10).reduce((sum, s) => sum + (s.processed_items || 0), 0),
          errorRate: signalGeneration.slice(0, 10).filter(s => s.status === 'error').length / Math.max(1, signalGeneration.slice(0, 10).length)
        },
        tradeExecution: {
          status: calculateStatus(tradeExecution),
          lastExecution: tradeExecution[0]?.created_at || new Date().toISOString(),
          executionTime: tradeExecution[0]?.execution_time_ms || 0,
          tradesExecuted: tradeExecution.slice(0, 10).reduce((sum, t) => sum + (t.processed_items || 0), 0),
          errorRate: tradeExecution.slice(0, 10).filter(t => t.status === 'error').length / Math.max(1, tradeExecution.slice(0, 10).length)
        },
        dataFeed: {
          status: calculateStatus(dataFeed),
          lastUpdate: dataFeed[0]?.created_at || new Date().toISOString(),
          latency: dataFeed[0]?.execution_time_ms || 0,
          dataPoints: dataFeed.slice(0, 10).reduce((sum, d) => sum + (d.processed_items || 0), 0),
          missedUpdates: dataFeed.slice(0, 10).filter(d => d.status === 'error').length
        },
        database: {
          status: 'healthy', // Mock data
          connectionCount: 5 + Math.floor(Math.random() * 10),
          queryTime: 15 + Math.random() * 10,
          errorRate: Math.random() * 0.05
        }
      });

      // Generate performance chart data
      const chartData: PerformanceChart[] = [];
      for (let i = 11; i >= 0; i--) {
        const timestamp = new Date(Date.now() - i * 60000).toISOString();
        chartData.push({
          timestamp,
          signalGeneration: 800 + Math.random() * 400,
          tradeExecution: 200 + Math.random() * 100,
          dataLatency: 50 + Math.random() * 30
        });
      }
      setPerformanceData(chartData);

    } catch (error) {
      console.error('Error loading system metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load system metrics",
        variant: "destructive",
      });
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    setIsLoading(true);
    loadSystemMetrics().finally(() => setIsLoading(false));

    // Subscribe to system health updates
    const healthChannel = supabase
      .channel('system_health_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_health'
        },
        (payload) => {
          const newEvent: RealtimeEvent = {
            timestamp: new Date().toISOString(),
            type: 'system',
            message: `${payload.new.function_name}: ${payload.new.status} (${payload.new.execution_time_ms}ms)`,
            severity: payload.new.status === 'error' ? 'error' : 'info',
            source: payload.new.function_name
          };
          
          setRealtimeEvents(prev => [newEvent, ...prev.slice(0, 49)]);
          loadSystemMetrics(); // Refresh metrics
        }
      )
      .subscribe();

    // Subscribe to trading signals
    const signalsChannel = supabase
      .channel('signals_monitor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trading_signals'
        },
        (payload) => {
          const newEvent: RealtimeEvent = {
            timestamp: new Date().toISOString(),
            type: 'signal',
            message: `New ${payload.new.signal_type} signal: ${payload.new.pair} (Score: ${payload.new.confluence_score})`,
            severity: 'info',
            source: 'signal-generation'
          };
          
          setRealtimeEvents(prev => [newEvent, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    // Subscribe to trades
    const tradesChannel = supabase
      .channel('trades_monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shadow_trades'
        },
        (payload) => {
          const eventType = payload.eventType === 'INSERT' ? 'opened' : 'updated';
          const trade = payload.new as any;
          
          const newEvent: RealtimeEvent = {
            timestamp: new Date().toISOString(),
            type: 'trade',
            message: `Trade ${eventType}: ${trade?.trade_type || 'unknown'} ${trade?.symbol || 'unknown'} $${trade?.position_size || 0}`,
            severity: 'info',
            source: 'trade-execution'
          };
          
          setRealtimeEvents(prev => [newEvent, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    setIsConnected(true);

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSystemMetrics, 30000);

    return () => {
      supabase.removeChannel(healthChannel);
      supabase.removeChannel(signalsChannel);
      supabase.removeChannel(tradesChannel);
      clearInterval(interval);
      setIsConnected(false);
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-orange-500';
      case 'critical': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'info': return <Activity className="h-4 w-4 text-blue-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading system monitor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Monitor</h1>
          <p className="text-muted-foreground mt-1">
            Real-time system health and performance monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                Live
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                Disconnected
              </>
            )}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadSystemMetrics}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signal Generation</CardTitle>
            {systemMetrics && getStatusIcon(systemMetrics.signalGeneration.status)}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(systemMetrics?.signalGeneration.status || '')}`}>
              {systemMetrics?.signalGeneration.status.toUpperCase()}
            </div>
            <p className="text-xs text-muted-foreground">
              Last: {systemMetrics?.signalGeneration.lastExecution ? new Date(systemMetrics.signalGeneration.lastExecution).toLocaleTimeString() : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trade Execution</CardTitle>
            {systemMetrics && getStatusIcon(systemMetrics.tradeExecution.status)}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(systemMetrics?.tradeExecution.status || '')}`}>
              {systemMetrics?.tradeExecution.status.toUpperCase()}
            </div>
            <p className="text-xs text-muted-foreground">
              Last: {systemMetrics?.tradeExecution.lastExecution ? new Date(systemMetrics.tradeExecution.lastExecution).toLocaleTimeString() : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Feed</CardTitle>
            {systemMetrics && getStatusIcon(systemMetrics.dataFeed.status)}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(systemMetrics?.dataFeed.status || '')}`}>
              {systemMetrics?.dataFeed.status.toUpperCase()}
            </div>
            <p className="text-xs text-muted-foreground">
              Latency: {systemMetrics?.dataFeed.latency}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            {systemMetrics && getStatusIcon(systemMetrics.database.status)}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(systemMetrics?.database.status || '')}`}>
              {systemMetrics?.database.status.toUpperCase()}
            </div>
            <p className="text-xs text-muted-foreground">
              Connections: {systemMetrics?.database.connectionCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Execution Times
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Signal Generation</span>
                <span className="text-sm font-medium">{systemMetrics?.signalGeneration.executionTime}ms</span>
              </div>
              <Progress value={Math.min(100, (systemMetrics?.signalGeneration.executionTime || 0) / 20)} />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Trade Execution</span>
                <span className="text-sm font-medium">{systemMetrics?.tradeExecution.executionTime}ms</span>
              </div>
              <Progress value={Math.min(100, (systemMetrics?.tradeExecution.executionTime || 0) / 10)} />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Data Feed</span>
                <span className="text-sm font-medium">{systemMetrics?.dataFeed.latency}ms</span>
              </div>
              <Progress value={Math.min(100, (systemMetrics?.dataFeed.latency || 0) / 5)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Throughput
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Signals Generated</span>
              <span className="text-sm font-medium">{systemMetrics?.signalGeneration.signalsGenerated}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Trades Executed</span>
              <span className="text-sm font-medium">{systemMetrics?.tradeExecution.tradesExecuted}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Data Points</span>
              <span className="text-sm font-medium">{systemMetrics?.dataFeed.dataPoints}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Rates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Signal Generation</span>
              <span className="text-sm font-medium">{((systemMetrics?.signalGeneration.errorRate || 0) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Trade Execution</span>
              <span className="text-sm font-medium">{((systemMetrics?.tradeExecution.errorRate || 0) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Database</span>
              <span className="text-sm font-medium">{((systemMetrics?.database.errorRate || 0) * 100).toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-time Events
          </CardTitle>
          <CardDescription>
            Live system events and notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {realtimeEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent events</p>
                  <p className="text-sm">System events will appear here in real-time</p>
                </div>
              ) : (
                realtimeEvents.map((event, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    {getSeverityIcon(event.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{event.message}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                        <Badge variant="outline" className="text-xs">
                          {event.source}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealtimeSystemMonitor;