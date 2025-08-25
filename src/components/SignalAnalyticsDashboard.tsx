import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, AlertTriangle, Brain, 
  Signal, BarChart3, Activity, Target, Zap, Settings,
  RefreshCw, Timer, Shield, LineChart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdaptiveThresholds {
  entropy: { min: number; max: number; current: number };
  probability: { buy: number; sell: number };
  confluence: { min: number; adaptive: number };
  edge: { min: number; adaptive: number };
}

interface RejectionAnalytics {
  totalRejections: number;
  rejectionsByReason: Record<string, number>;
  rejectionRate: number;
  recentRejections: Array<{
    timestamp: string;
    reason: string;
    value: number;
    threshold: number;
  }>;
}

interface SignalDensityAnalytics {
  signalsPerHour: number;
  targetSignalsPerHour: number;
  currentDensity: 'too_low' | 'optimal' | 'too_high';
  adaptationNeeded: boolean;
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
  metrics: {
    accuracy: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    avgHoldingTime: number;
    signalCount: number;
    lastUpdate: string;
  };
}

const SignalAnalyticsDashboard: React.FC = () => {
  const [adaptiveThresholds, setAdaptiveThresholds] = useState<AdaptiveThresholds | null>(null);
  const [rejectionAnalytics, setRejectionAnalytics] = useState<RejectionAnalytics | null>(null);
  const [signalDensity, setSignalDensity] = useState<SignalDensityAnalytics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const { toast } = useToast();

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);

      // Get recent signals and rejections data
      const { data: signals } = await supabase
        .from('trading_signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const { data: systemLogs } = await supabase
        .from('system_health')
        .select('*')
        .eq('function_name', 'generate-confluence-signals')
        .order('created_at', { ascending: false })
        .limit(50);

      // Mock adaptive thresholds (in production, these would come from the adaptive engine)
      setAdaptiveThresholds({
        entropy: { min: 0.7, max: 0.95, current: 0.85 },
        probability: { buy: 0.58, sell: 0.42 },
        confluence: { min: 10, adaptive: 15 },
        edge: { min: -0.0001, adaptive: 0.0001 }
      });

      // Calculate rejection analytics
      const totalSignalsAttempted = (signals?.length || 0) + 200; // Estimated rejected signals
      const totalRejections = 200; // Mock data
      const rejectionRate = totalRejections / totalSignalsAttempted;

      setRejectionAnalytics({
        totalRejections,
        rejectionsByReason: {
          'entropy_too_high': 85,
          'probability_too_low': 45,
          'edge_too_low': 35,
          'confluence_too_low': 25,
          'volatility_too_high': 10
        },
        rejectionRate,
        recentRejections: [
          { timestamp: new Date(Date.now() - 5 * 60000).toISOString(), reason: 'entropy_too_high', value: 0.92, threshold: 0.85 },
          { timestamp: new Date(Date.now() - 8 * 60000).toISOString(), reason: 'edge_too_low', value: -0.0002, threshold: 0.0001 },
          { timestamp: new Date(Date.now() - 12 * 60000).toISOString(), reason: 'probability_too_low', value: 0.55, threshold: 0.58 },
        ]
      });

      // Calculate signal density
      const recentSignals = signals?.filter(s => 
        new Date(s.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
      ) || [];
      const signalsPerHour = recentSignals.length / 24;
      const targetSignalsPerHour = 2;

      setSignalDensity({
        signalsPerHour,
        targetSignalsPerHour,
        currentDensity: signalsPerHour < 1 ? 'too_low' : signalsPerHour > 4 ? 'too_high' : 'optimal',
        adaptationNeeded: Math.abs(signalsPerHour - targetSignalsPerHour) > 0.5
      });

      // Mock system health (in production, this would come from the continuous learning engine)
      setSystemHealth({
        status: 'warning',
        issues: ['Signal generation rate too low', 'High entropy threshold rejecting quality signals'],
        recommendations: ['Lower entropy threshold to 0.80', 'Relax confluence requirements temporarily'],
        metrics: {
          accuracy: 68.5,
          sharpeRatio: 1.42,
          maxDrawdown: 8.3,
          winRate: 68.5,
          profitFactor: 2.1,
          avgHoldingTime: 145,
          signalCount: 47,
          lastUpdate: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load signal analytics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const adjustThresholds = async (adjustment: 'relax' | 'tighten') => {
    try {
      setIsAdjusting(true);
      
      // In production, this would call the adaptive engine API
      toast({
        title: "Thresholds Adjusted",
        description: `Signal generation thresholds have been ${adjustment === 'relax' ? 'relaxed' : 'tightened'}`,
      });
      
      // Reload analytics after adjustment
      setTimeout(loadAnalytics, 1000);
      
    } catch (error) {
      console.error('Error adjusting thresholds:', error);
      toast({
        title: "Error",
        description: "Failed to adjust thresholds",
        variant: "destructive",
      });
    } finally {
      setIsAdjusting(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading signal analytics...</p>
        </div>
      </div>
    );
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-orange-500';
      case 'critical': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getDensityColor = (density: string) => {
    switch (density) {
      case 'optimal': return 'text-green-600';
      case 'too_low': return 'text-orange-500';
      case 'too_high': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Signal Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Advanced signal generation monitoring and optimization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={systemHealth?.status === 'healthy' ? "default" : systemHealth?.status === 'warning' ? "secondary" : "destructive"}>
            {systemHealth?.status?.toUpperCase()}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadAnalytics}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Alert */}
      {systemHealth && systemHealth.status !== 'healthy' && (
        <Alert variant={systemHealth.status === 'critical' ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>System Health {systemHealth.status === 'critical' ? 'Critical' : 'Warning'}: </strong>
                {systemHealth.issues.join(', ')}
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => adjustThresholds('relax')}
                  disabled={isAdjusting}
                >
                  Auto-Fix
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signal Density</CardTitle>
            <Signal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getDensityColor(signalDensity?.currentDensity || '')}`}>
              {signalDensity?.signalsPerHour.toFixed(1)}/hr
            </div>
            <p className="text-xs text-muted-foreground">
              Target: {signalDensity?.targetSignalsPerHour}/hr
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejection Rate</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((rejectionAnalytics?.rejectionRate || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {rejectionAnalytics?.totalRejections} rejected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {systemHealth?.metrics.winRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {systemHealth?.metrics.signalCount} signals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth?.metrics.sharpeRatio.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Risk-adjusted returns
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="thresholds" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="thresholds">Adaptive Thresholds</TabsTrigger>
          <TabsTrigger value="rejections">Rejection Analysis</TabsTrigger>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="thresholds" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Current Thresholds
                </CardTitle>
                <CardDescription>
                  Adaptive thresholds that evolve based on market conditions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {adaptiveThresholds && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Entropy Threshold</span>
                        <span className="text-sm">{adaptiveThresholds.entropy.current.toFixed(2)}</span>
                      </div>
                      <Progress value={((adaptiveThresholds.entropy.current - adaptiveThresholds.entropy.min) / (adaptiveThresholds.entropy.max - adaptiveThresholds.entropy.min)) * 100} />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Min: {adaptiveThresholds.entropy.min}</span>
                        <span>Max: {adaptiveThresholds.entropy.max}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Buy Probability</span>
                        <span className="text-sm">{(adaptiveThresholds.probability.buy * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={adaptiveThresholds.probability.buy * 100} />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Confluence Score</span>
                        <span className="text-sm">{adaptiveThresholds.confluence.adaptive.toFixed(1)}</span>
                      </div>
                      <Progress value={(adaptiveThresholds.confluence.adaptive / 50) * 100} />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Edge Threshold</span>
                        <span className="text-sm">{adaptiveThresholds.edge.adaptive.toFixed(6)}</span>
                      </div>
                      <Progress value={Math.max(0, (adaptiveThresholds.edge.adaptive + 0.001) / 0.002 * 100)} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Threshold Controls
                </CardTitle>
                <CardDescription>
                  Manual threshold adjustments for optimization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button 
                    onClick={() => adjustThresholds('relax')} 
                    disabled={isAdjusting}
                    className="flex-1"
                  >
                    <TrendingDown className="h-4 w-4 mr-2" />
                    Relax Thresholds
                  </Button>
                  <Button 
                    onClick={() => adjustThresholds('tighten')} 
                    disabled={isAdjusting}
                    variant="outline"
                    className="flex-1"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Tighten Thresholds
                  </Button>
                </div>
                
                <Alert>
                  <Activity className="h-4 w-4" />
                  <AlertDescription>
                    Relaxing thresholds will increase signal generation but may reduce quality. 
                    Tightening will improve quality but reduce frequency.
                  </AlertDescription>
                </Alert>

                {signalDensity?.adaptationNeeded && (
                  <Alert variant="default">
                    <Zap className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Adaptation Needed:</strong> Current signal density ({signalDensity.signalsPerHour.toFixed(1)}/hr) 
                      deviates significantly from target ({signalDensity.targetSignalsPerHour}/hr).
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rejections" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Rejection Breakdown</CardTitle>
                <CardDescription>Reasons why signals are being rejected</CardDescription>
              </CardHeader>
              <CardContent>
                {rejectionAnalytics && (
                  <div className="space-y-3">
                    {Object.entries(rejectionAnalytics.rejectionsByReason).map(([reason, count]) => (
                      <div key={reason} className="flex justify-between items-center">
                        <span className="text-sm capitalize">{reason.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${(count / rejectionAnalytics.totalRejections) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Rejections</CardTitle>
                <CardDescription>Latest signals that were filtered out</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {rejectionAnalytics?.recentRejections.map((rejection, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-muted rounded-lg">
                        <div>
                          <div className="text-sm font-medium">{rejection.reason.replace(/_/g, ' ')}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(rejection.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">{rejection.value.toFixed(4)}</div>
                          <div className="text-xs text-muted-foreground">vs {rejection.threshold.toFixed(4)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Trading Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Accuracy</span>
                    <span className="text-sm font-medium">{systemHealth?.metrics.accuracy.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Profit Factor</span>
                    <span className="text-sm font-medium">{systemHealth?.metrics.profitFactor.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Max Drawdown</span>
                    <span className="text-sm font-medium text-red-600">{systemHealth?.metrics.maxDrawdown.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Signal Quality</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Holding Time</span>
                    <span className="text-sm font-medium">{systemHealth?.metrics.avgHoldingTime.toFixed(0)}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Signal Count</span>
                    <span className="text-sm font-medium">{systemHealth?.metrics.signalCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Last Update</span>
                    <span className="text-xs text-muted-foreground">
                      {systemHealth?.metrics.lastUpdate ? new Date(systemHealth.metrics.lastUpdate).toLocaleTimeString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Sharpe Ratio</span>
                    <span className="text-sm font-medium">{systemHealth?.metrics.sharpeRatio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Win Rate</span>
                    <span className="text-sm font-medium">{systemHealth?.metrics.winRate.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Recommendations</CardTitle>
              <CardDescription>AI-generated optimization suggestions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {systemHealth?.recommendations.map((recommendation, index) => (
                <Alert key={index}>
                  <Target className="h-4 w-4" />
                  <AlertDescription>{recommendation}</AlertDescription>
                </Alert>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SignalAnalyticsDashboard;