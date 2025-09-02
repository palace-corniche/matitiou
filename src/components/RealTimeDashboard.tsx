// Real-Time Trading Dashboard with Live Data Feeds
// Connected to Supabase real-time subscriptions for instant updates

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, 
  Zap, Clock, Target, BarChart3, Layers, Signal, RefreshCw,
  Database, Cpu, Network, Eye
} from 'lucide-react';
import { performanceTracker, SystemPerformance } from '@/services/performanceTracker';

interface LiveSignal {
  id: string;
  pair: string;
  signal_type: string;
  confluence_score: number;
  confidence: number;
  strength: number;
  created_at: string; // Use created_at instead of timestamp
  alert_level: 'low' | 'medium' | 'high';
  factors: any[];
  was_executed: boolean;
  description: string;
}

interface SystemStatus {
  isConnected: boolean;
  lastUpdate: Date;
  activeModules: string[];
  processingLatency: number;
  errorCount: number;
  signalsPerHour: number;
}

const RealTimeDashboard: React.FC = () => {
  const [liveSignals, setLiveSignals] = useState<LiveSignal[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    isConnected: false,
    lastUpdate: new Date(),
    activeModules: [],
    processingLatency: 0,
    errorCount: 0,
    signalsPerHour: 0
  });
  const [systemPerformance, setSystemPerformance] = useState<SystemPerformance | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  
  useEffect(() => {
    console.log('🔴 Initializing Real-Time Dashboard...');
    
    // Load initial data
    loadDashboardData();
    
    // Set up real-time subscriptions
    const signalsChannel = supabase
      .channel('live-signals')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'trading_signals' },
        (payload) => {
          console.log('📡 New signal received:', payload.new);
          handleNewSignal(payload.new as LiveSignal);
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trading_signals' },
        (payload) => {
          console.log('📡 Signal updated:', payload.new);
          handleSignalUpdate(payload.new as LiveSignal);
        }
      )
      .subscribe((status) => {
        console.log('📡 Signals subscription status:', status);
        setConnectionStatus(status === 'SUBSCRIBED' ? 'connected' : 'connecting');
      });
    
    const healthChannel = supabase
      .channel('system-health')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_health' },
        (payload) => {
          console.log('🏥 System health update:', payload.new);
          updateSystemHealth(payload.new);
        }
      )
      .subscribe();
    
    // Update performance metrics every 30 seconds
    const performanceInterval = setInterval(async () => {
      try {
        const performance = await performanceTracker.getSystemPerformance();
        setSystemPerformance(performance);
      } catch (error) {
        console.error('Failed to update performance:', error);
      }
    }, 30000);
    
    // Status heartbeat every 10 seconds
    const statusInterval = setInterval(updateSystemStatus, 10000);
    
    return () => {
      supabase.removeChannel(signalsChannel);
      supabase.removeChannel(healthChannel);
      clearInterval(performanceInterval);
      clearInterval(statusInterval);
    };
  }, []);
  
  const loadDashboardData = async () => {
    try {
      // Load recent signals
      const { data: signals } = await supabase
        .from('trading_signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (signals) {
        setLiveSignals(signals.map(signal => ({
          id: signal.id,
          pair: signal.pair,
          signal_type: signal.signal_type,
          confluence_score: signal.confluence_score,
          confidence: signal.confidence,
          strength: signal.strength,
          created_at: signal.created_at,
          alert_level: signal.alert_level as 'low' | 'medium' | 'high',
          factors: signal.factors as any[],
          was_executed: signal.was_executed,
          description: signal.description
        })));
      }
      
      // Load system performance
      const performance = await performanceTracker.getSystemPerformance();
      setSystemPerformance(performance);
      
      // Update system status
      updateSystemStatus();
      
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setConnectionStatus('disconnected');
    }
  };
  
  const handleNewSignal = (newSignal: LiveSignal) => {
    setLiveSignals(prev => [newSignal, ...prev.slice(0, 19)]); // Keep last 20
    
    // Update system status
    setSystemStatus(prev => ({
      ...prev,
      lastUpdate: new Date(),
      signalsPerHour: prev.signalsPerHour + 1
    }));
  };
  
  const handleSignalUpdate = (updatedSignal: LiveSignal) => {
    setLiveSignals(prev => 
      prev.map(signal => 
        signal.id === updatedSignal.id ? updatedSignal : signal
      )
    );
  };
  
  const updateSystemHealth = (healthData: any) => {
    setSystemStatus(prev => ({
      ...prev,
      lastUpdate: new Date(),
      processingLatency: healthData.execution_time_ms || prev.processingLatency,
      errorCount: healthData.status === 'error' ? prev.errorCount + 1 : prev.errorCount
    }));
  };
  
  const updateSystemStatus = async () => {
    try {
      // Check recent system health
      const { data: healthData } = await supabase
        .from('system_health')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      const recentErrors = healthData?.filter(h => h.status === 'error').length || 0;
      const avgLatency = healthData?.reduce((sum, h) => sum + (h.execution_time_ms || 0), 0) / (healthData?.length || 1);
      
      // Determine active modules from recent signals
      const { data: recentSignals } = await supabase
        .from('trading_signals')
        .select('factors')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .limit(10);
      
      const activeModules = new Set<string>();
      recentSignals?.forEach(signal => {
        if (signal.factors && Array.isArray(signal.factors)) {
          signal.factors.forEach((factor: any) => {
            if (factor.source) {
              const module = factor.source.split('_')[0];
              activeModules.add(module);
            }
          });
        }
      });
      
      setSystemStatus(prev => ({
        ...prev,
        isConnected: connectionStatus === 'connected',
        activeModules: Array.from(activeModules),
        processingLatency: avgLatency,
        errorCount: recentErrors
      }));
      
    } catch (error) {
      console.error('Failed to update system status:', error);
    }
  };
  
  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'buy': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'sell': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Real-Time Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="w-8 h-8 text-blue-500" />
            Live Trading Intelligence
          </h1>
          <p className="text-muted-foreground">
            Real-time signal generation and system monitoring
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(connectionStatus)} animate-pulse`} />
            <span className="text-sm font-medium capitalize">{connectionStatus}</span>
          </div>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Real-Time Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Connection</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStatus.isConnected ? 'Active' : 'Offline'}
            </div>
            <p className="text-xs text-muted-foreground">
              Last update: {systemStatus.lastUpdate.toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Modules</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStatus.activeModules.length}/6</div>
            <p className="text-xs text-muted-foreground">
              {systemStatus.activeModules.join(', ') || 'No active modules'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStatus.processingLatency.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">
              {systemStatus.processingLatency < 1000 ? 'Excellent' : systemStatus.processingLatency < 3000 ? 'Good' : 'Slow'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signal Rate</CardTitle>
            <Signal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{liveSignals.length}</div>
            <p className="text-xs text-muted-foreground">
              Signals in last hour
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* System Performance Overview */}
      {systemPerformance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              System Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="text-sm font-medium">Overall Win Rate</div>
                <div className="text-2xl font-bold">
                  {(systemPerformance.overallWinRate * 100).toFixed(1)}%
                </div>
                <Progress value={systemPerformance.overallWinRate * 100} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">System Reliability</div>
                <div className="text-2xl font-bold">
                  {(systemPerformance.systemReliability * 100).toFixed(1)}%
                </div>
                <Progress value={systemPerformance.systemReliability * 100} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">Total Signals</div>
                <div className="text-2xl font-bold">
                  {systemPerformance.totalSignalsGenerated}
                </div>
                <div className="text-sm text-muted-foreground">
                  {systemPerformance.totalSignalsExecuted} executed
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Live Signals Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Live Signal Stream
            </CardTitle>
            <CardDescription>
              Real-time trading signals as they are generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {liveSignals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Waiting for live signals...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {liveSignals.map((signal) => (
                    <div key={signal.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getSignalIcon(signal.signal_type)}
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {signal.signal_type.toUpperCase()}
                            <Badge variant={signal.was_executed ? 'default' : 'secondary'}>
                              {signal.was_executed ? 'Executed' : 'Generated'}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Score: {signal.confluence_score} | Confidence: {signal.confidence}%
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {new Date(signal.created_at).toLocaleTimeString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {signal.factors?.length || 0} factors
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* Module Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Module Performance
            </CardTitle>
            <CardDescription>
              Real-time performance tracking by analysis module
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {systemPerformance?.modulePerformances.map((module) => (
                <div key={module.moduleId} className="flex items-center justify-between p-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      module.status === 'excellent' ? 'bg-green-500' :
                      module.status === 'active' ? 'bg-blue-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <div className="font-medium capitalize">{module.moduleId}</div>
                      <div className="text-sm text-muted-foreground">
                        {module.signalsGenerated} signals | {(module.winRate * 100).toFixed(1)}% win rate
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      module.trend === 'improving' ? 'default' :
                      module.trend === 'declining' ? 'destructive' : 'secondary'
                    }>
                      {module.trend}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-1">
                      {(module.reliability * 100).toFixed(0)}% reliable
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No performance data available</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      
      {/* System Alerts */}
      {systemStatus.errorCount > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {systemStatus.errorCount} system errors detected in the last hour. 
            Check system health for details.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default RealTimeDashboard;