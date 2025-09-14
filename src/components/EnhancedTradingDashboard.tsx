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
  TrendingUp, TrendingDown, AlertTriangle, Brain, Zap,
  Signal, BarChart3, Activity, Target, RefreshCw, Timer, 
  Shield, LineChart, DollarSign, Layers, Eye, Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EdgeComponents {
  baseEdge: number;
  executionCosts: number;
  slippageCosts: number;
  microstructureCosts: number;
  opportunityCosts: number;
  regimeAdjustment: number;
  volatilityAdjustment: number;
  liquidityAdjustment: number;
  timingPenalty: number;
  netEdge: number;
}

interface ExecutionQuality {
  score: number;
  liquidityScore: number;
  timingScore: number;
  microstructureScore: number;
  recommendations: string[];
}

interface MarketRegime {
  type: 'trending' | 'ranging' | 'shock' | 'news_driven';
  strength: number;
  persistence: number;
  volatility: number;
  uncertainty: number;
  confidence: number;
}

interface MicrostructureIntelligence {
  orderFlowImbalance: number;
  liquidityMetrics: {
    bidAskSpread: number;
    marketDepth: number;
    orderBookPressure: number;
  };
  sweepDetection: {
    isSweepDetected: boolean;
    sweepDirection: 'buy' | 'sell' | null;
    sweepStrength: number;
  };
  timingRecommendation: 'immediate' | 'wait' | 'avoid';
}

const EnhancedTradingDashboard: React.FC = () => {
  const [openTrades, setOpenTrades] = useState<any[]>([]);
  const [edgeAnalysis, setEdgeAnalysis] = useState<Record<string, EdgeComponents>>({});
  const [executionQuality, setExecutionQuality] = useState<ExecutionQuality | null>(null);
  const [marketRegime, setMarketRegime] = useState<MarketRegime | null>(null);
  const [microstructure, setMicrostructure] = useState<MicrostructureIntelligence | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadTradingData = async () => {
    try {
      setIsLoading(true);

      // Get open trades
      const sessionId = localStorage.getItem('shadow_trading_session_id');
      if (!sessionId) return;

      const { data: portfolio } = await supabase
        .from('shadow_portfolios')
        .select('id')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .single();

      if (portfolio) {
        const { data: trades } = await supabase
          .from('shadow_trades')
          .select('*')
          .eq('portfolio_id', portfolio.id)
          .eq('status', 'open');

        setOpenTrades(trades || []);

        // Edge analysis would come from enhanced edge engine - for now show placeholder
        setEdgeAnalysis({});
      }

      // Mock execution quality data
      setExecutionQuality({
        score: 78 + Math.random() * 20,
        liquidityScore: 85 + Math.random() * 15,
        timingScore: 65 + Math.random() * 25,
        microstructureScore: 72 + Math.random() * 20,
        recommendations: [
          'Current liquidity conditions are favorable',
          'Market timing shows moderate risk',
          'Consider reducing position size in current volatility'
        ]
      });

      // Market regime and microstructure data would come from respective engines
      setMarketRegime({
        type: 'trending',
        strength: 0,
        persistence: 0,
        volatility: 0,
        uncertainty: 0,
        confidence: 0
      });

      setMicrostructure({
        orderFlowImbalance: 0,
        liquidityMetrics: {
          bidAskSpread: 0,
          marketDepth: 0,
          orderBookPressure: 0
        },
        sweepDetection: {
          isSweepDetected: false,
          sweepDirection: 'buy',
          sweepStrength: 0
        },
        timingRecommendation: 'wait'
      });

    } catch (error) {
      console.error('Error loading trading data:', error);
      toast({
        title: "Error",
        description: "Failed to load enhanced trading data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTradingData();
    const interval = setInterval(loadTradingData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getRegimeColor = (type: string) => {
    const colors = {
      trending: 'text-green-600',
      ranging: 'text-blue-600',
      shock: 'text-red-600',
      news_driven: 'text-orange-500'
    };
    return colors[type as keyof typeof colors] || 'text-muted-foreground';
  };

  const getTimingColor = (recommendation: string) => {
    const colors = {
      immediate: 'text-green-600',
      wait: 'text-orange-500',
      avoid: 'text-red-600'
    };
    return colors[recommendation as keyof typeof colors] || 'text-muted-foreground';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading enhanced trading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enhanced Trading Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Advanced execution analytics and market microstructure intelligence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={marketRegime ? "default" : "secondary"}>
            {marketRegime?.type?.toUpperCase().replace('_', ' ') || 'UNKNOWN'}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadTradingData}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Market Intelligence Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Regime</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRegimeColor(marketRegime?.type || '')}`}>
              {marketRegime?.type?.replace('_', ' ').toUpperCase()}
            </div>
            <p className="text-xs text-muted-foreground">
              Confidence: {((marketRegime?.confidence || 0) * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Execution Quality</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {executionQuality?.score.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Liquidity: {executionQuality?.liquidityScore.toFixed(0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Order Flow</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${microstructure?.orderFlowImbalance && microstructure.orderFlowImbalance > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {microstructure?.orderFlowImbalance && microstructure.orderFlowImbalance > 0 ? '+' : ''}{((microstructure?.orderFlowImbalance || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {microstructure?.orderFlowImbalance && microstructure.orderFlowImbalance > 0 ? 'Buy pressure' : 'Sell pressure'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timing Signal</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getTimingColor(microstructure?.timingRecommendation || '')}`}>
              {microstructure?.timingRecommendation?.toUpperCase()}
            </div>
            <p className="text-xs text-muted-foreground">
              Market timing assessment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="positions">Enhanced Positions</TabsTrigger>
          <TabsTrigger value="microstructure">Microstructure</TabsTrigger>
          <TabsTrigger value="regime">Regime Analysis</TabsTrigger>
          <TabsTrigger value="execution">Execution Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Enhanced Position Analysis
              </CardTitle>
              <CardDescription>
                Real-time edge calculation and execution quality for open positions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {openTrades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No open positions</p>
                  <p className="text-sm">Start trading to see enhanced analytics</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Net Edge</TableHead>
                        <TableHead>Execution Costs</TableHead>
                        <TableHead>Regime Impact</TableHead>
                        <TableHead>Quality Score</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openTrades.map((trade) => {
                        const edge = edgeAnalysis[trade.id];
                        if (!edge) return null;
                        
                        return (
                          <TableRow key={trade.id}>
                            <TableCell className="font-medium">{trade.symbol}</TableCell>
                            <TableCell>
                              <Badge variant={trade.trade_type === 'buy' ? 'default' : 'destructive'}>
                                {trade.trade_type.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>${trade.position_size.toLocaleString()}</TableCell>
                            <TableCell className={edge.netEdge >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {(edge.netEdge * 10000).toFixed(1)} pips
                            </TableCell>
                            <TableCell className="text-red-600">
                              -{(edge.executionCosts * 10000).toFixed(1)} pips
                            </TableCell>
                            <TableCell className={edge.regimeAdjustment >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {edge.regimeAdjustment >= 0 ? '+' : ''}{(edge.regimeAdjustment * 10000).toFixed(1)} pips
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-muted rounded-full h-2">
                                  <div 
                                    className="bg-primary h-2 rounded-full"
                                    style={{ width: `${Math.max(0, Math.min(100, (executionQuality?.score || 0)))}%` }}
                                  />
                                </div>
                                <span className="text-sm">{(executionQuality?.score || 0).toFixed(0)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="microstructure" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Order Flow Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Order Flow Imbalance</span>
                    <span className={`text-sm font-bold ${microstructure?.orderFlowImbalance && microstructure.orderFlowImbalance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {((microstructure?.orderFlowImbalance || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={50 + ((microstructure?.orderFlowImbalance || 0) * 50)} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Strong Sell</span>
                    <span>Neutral</span>
                    <span>Strong Buy</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Bid-Ask Spread</span>
                    <span className="text-sm">{microstructure?.liquidityMetrics.bidAskSpread.toFixed(1)} pips</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Market Depth</span>
                    <span className="text-sm">{microstructure?.liquidityMetrics.marketDepth.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Order Book Pressure</span>
                    <span className={`text-sm ${microstructure?.liquidityMetrics.orderBookPressure && microstructure.liquidityMetrics.orderBookPressure > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {((microstructure?.liquidityMetrics.orderBookPressure || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Sweep Detection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {microstructure?.sweepDetection.isSweepDetected ? (
                  <Alert>
                    <Zap className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Sweep Detected!</strong> {microstructure.sweepDetection.sweepDirection?.toUpperCase()} sweep in progress.
                      Strength: {(microstructure.sweepDetection.sweepStrength * 100).toFixed(0)}%
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="default">
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      No significant sweeps detected. Market conditions appear stable.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Timing Recommendation</span>
                    <Badge variant={microstructure?.timingRecommendation === 'immediate' ? 'default' : microstructure?.timingRecommendation === 'wait' ? 'secondary' : 'destructive'}>
                      {microstructure?.timingRecommendation?.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="regime" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Market Regime Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Regime Type</span>
                      <Badge className={getRegimeColor(marketRegime?.type || '')}>
                        {marketRegime?.type?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Strength</span>
                      <span className="text-sm">{((marketRegime?.strength || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={(marketRegime?.strength || 0) * 100} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Persistence</span>
                      <span className="text-sm">{((marketRegime?.persistence || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={(marketRegime?.persistence || 0) * 100} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Volatility</span>
                      <span className="text-sm">{((marketRegime?.volatility || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={(marketRegime?.volatility || 0) * 100} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Uncertainty</span>
                      <span className="text-sm">{((marketRegime?.uncertainty || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={(marketRegime?.uncertainty || 0) * 100} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Regime-Based Strategy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {marketRegime?.type === 'trending' && (
                    <Alert>
                      <TrendingUp className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Trending Market:</strong> Favor momentum strategies and trend-following signals.
                        Increase position sizes and extend holding periods.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {marketRegime?.type === 'ranging' && (
                    <Alert>
                      <BarChart3 className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Ranging Market:</strong> Focus on mean reversion strategies.
                        Take profits quickly and use tighter stop losses.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {marketRegime?.type === 'shock' && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Shock Regime:</strong> Reduce position sizes significantly.
                        Avoid new positions and consider closing existing trades.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {marketRegime?.type === 'news_driven' && (
                    <Alert>
                      <Signal className="h-4 w-4" />
                      <AlertDescription>
                        <strong>News-Driven Market:</strong> Monitor news events closely.
                        Be prepared for rapid price movements and volatility spikes.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="execution" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Execution Quality Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Overall Score</span>
                      <span className="text-sm font-bold">{executionQuality?.score.toFixed(0)}/100</span>
                    </div>
                    <Progress value={executionQuality?.score || 0} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Liquidity Score</span>
                      <span className="text-sm">{executionQuality?.liquidityScore.toFixed(0)}/100</span>
                    </div>
                    <Progress value={executionQuality?.liquidityScore || 0} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Timing Score</span>
                      <span className="text-sm">{executionQuality?.timingScore.toFixed(0)}/100</span>
                    </div>
                    <Progress value={executionQuality?.timingScore || 0} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Microstructure Score</span>
                      <span className="text-sm">{executionQuality?.microstructureScore.toFixed(0)}/100</span>
                    </div>
                    <Progress value={executionQuality?.microstructureScore || 0} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Execution Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {executionQuality?.recommendations.map((rec, index) => (
                    <Alert key={index}>
                      <Settings className="h-4 w-4" />
                      <AlertDescription>{rec}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedTradingDashboard;