import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Zap,
  Target
} from 'lucide-react';

interface RealTimeSignal {
  id: string;
  timestamp: string;
  signal_type: 'buy' | 'sell' | 'hold';
  confluence_score: number;
  confidence: number;
  strength: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  risk_reward_ratio: number;
  description: string;
  factors: any[];
}

interface SystemHealth {
  function_name: string;
  status: string;
  execution_time_ms: number;
  processed_items: number;
  created_at: string;
  error_message?: string;
}

const RealTimeSignalMonitor: React.FC = () => {
  const [latestSignal, setLatestSignal] = useState<RealTimeSignal | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    // Initial data load
    loadLatestData();

    // Set up real-time subscriptions
    const signalChannel = supabase
      .channel('trading_signals_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trading_signals'
        },
        (payload) => {
          console.log('New signal received:', payload);
          setLatestSignal({
            ...payload.new,
            timestamp: payload.new.created_at
          } as RealTimeSignal);
          setLastUpdate(new Date());
        }
      )
      .subscribe();

    const healthChannel = supabase
      .channel('system_health_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_health'
        },
        (payload) => {
          console.log('System health update:', payload);
          setSystemHealth(prev => [payload.new as SystemHealth, ...prev.slice(0, 4)]);
          setLastUpdate(new Date());
        }
      )
      .subscribe();

    setIsConnected(true);

    // Cleanup on unmount
    return () => {
      signalChannel.unsubscribe();
      healthChannel.unsubscribe();
      setIsConnected(false);
    };
  }, []);

  const loadLatestData = async () => {
    try {
      // Load latest signal
      const { data: signals } = await supabase
        .from('trading_signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (signals && signals.length > 0) {
        const signal = signals[0];
        setLatestSignal({
          id: signal.id,
          timestamp: signal.created_at,
          signal_type: signal.signal_type as 'buy' | 'sell' | 'hold',
          confluence_score: signal.confluence_score,
          confidence: signal.confidence,
          strength: signal.strength,
          entry_price: signal.entry_price,
          stop_loss: signal.stop_loss,
          take_profit: signal.take_profit,
          risk_reward_ratio: signal.risk_reward_ratio,
          description: signal.description,
          factors: Array.isArray(signal.factors) ? signal.factors : []
        });
      }

      // Load recent system health
      const { data: health } = await supabase
        .from('system_health')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (health) {
        setSystemHealth(health);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading real-time data:', error);
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'buy': return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'sell': return <TrendingDown className="w-5 h-5 text-red-500" />;
      default: return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-yellow-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Real-Time Signal Monitor
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Last update: {lastUpdate.toLocaleTimeString()}
          </p>
        </CardHeader>
      </Card>

      {/* Latest Signal */}
      {latestSignal && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getSignalIcon(latestSignal.signal_type)}
                Latest Signal
              </div>
              <Badge variant={latestSignal.signal_type === 'buy' ? 'default' : 'destructive'}>
                {latestSignal.signal_type.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-sm text-muted-foreground">Confluence</div>
                <div className="text-2xl font-bold">{latestSignal.confluence_score}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Confidence</div>
                <div className="text-2xl font-bold">{latestSignal.confidence}%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Strength</div>
                <div className="text-2xl font-bold">{latestSignal.strength}/10</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">R:R Ratio</div>
                <div className="text-2xl font-bold">{latestSignal.risk_reward_ratio.toFixed(2)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="space-y-1">
                <div className="text-sm font-medium flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  Entry Price
                </div>
                <div className="text-lg font-mono">{latestSignal.entry_price.toFixed(5)}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm font-medium">Stop Loss</div>
                <div className="text-lg font-mono text-red-600">{latestSignal.stop_loss.toFixed(5)}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm font-medium">Take Profit</div>
                <div className="text-lg font-mono text-green-600">{latestSignal.take_profit.toFixed(5)}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Signal Strength</div>
              <Progress value={latestSignal.strength * 10} className="w-full" />
            </div>

            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Description</div>
              <p className="text-sm text-muted-foreground">{latestSignal.description}</p>
            </div>

            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Contributing Factors</div>
              <div className="flex flex-wrap gap-1">
                {latestSignal.factors?.slice(0, 5).map((factor, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {factor.name} ({factor.weight?.toFixed(2) || '0.0'})
                  </Badge>
                )) || (
                  <Badge variant="outline" className="text-xs">
                    Confluence Score: {latestSignal.confluence_score}
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-4 text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Generated {formatTimeAgo(latestSignal.timestamp)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {systemHealth.slice(0, 5).map((health, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getHealthStatusIcon(health.status)}
                  <div>
                    <div className="font-medium text-sm">{health.function_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimeAgo(health.created_at)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {health.execution_time_ms}ms
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {health.processed_items} items
                  </div>
                </div>
              </div>
            ))}
            
            {systemHealth.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <div className="text-sm">No recent system activity</div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <Button 
              onClick={loadLatestData} 
              variant="outline" 
              size="sm" 
              className="w-full"
            >
              <Activity className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeSignalMonitor;