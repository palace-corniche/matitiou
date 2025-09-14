import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, TrendingDown, AlertTriangle, Clock, Target, 
  StopCircle, Brain, Zap, Activity, Eye, Settings
} from 'lucide-react';
import { FundamentalAnalysisAdapter, type FundamentalSignal } from '@/services/analysisAdapters/fundamentalAnalysisAdapter';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IntelligenceSignalsDashboardProps {
  symbol?: string;
  timeframe?: string;
  onSignalSelect?: (signal: FundamentalSignal) => void;
}

const IntelligenceSignalsDashboard: React.FC<IntelligenceSignalsDashboardProps> = ({
  symbol = 'EUR/USD',
  timeframe = '15m',
  onSignalSelect
}) => {
  const [signals, setSignals] = useState<FundamentalSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [adapter] = useState(new FundamentalAnalysisAdapter());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    generateIntelligenceSignals();
  }, [symbol, timeframe]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh) {
      interval = setInterval(() => {
        generateIntelligenceSignals();
      }, 45000); // Refresh every 45 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, symbol, timeframe]);

  const generateIntelligenceSignals = async () => {
    setLoading(true);
    try {
      const signal = await adapter.analyze(symbol, timeframe);
      
      if (signal) {
        setSignals(prev => {
          // Keep only the latest 5 signals and add new one
          const filtered = prev.filter(s => s.symbol === signal.symbol).slice(0, 4);
          return [signal, ...filtered];
        });
        toast.success(`New ${signal.signalType.toUpperCase()} signal generated for ${signal.symbol}`);
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error generating intelligence signals:', error);
      toast.error('Failed to generate intelligence signals');
    } finally {
      setLoading(false);
    }
  };

  const executeSignal = async (signal: FundamentalSignal) => {
    try {
      // Get current portfolio
      const sessionId = localStorage.getItem('session_id');
      if (!sessionId) {
        toast.error('No active trading session found');
        return;
      }

      const { data: portfolio } = await supabase
        .from('shadow_portfolios')
        .select('id')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .single();

      if (!portfolio) {
        toast.error('No active portfolio found');
        return;
      }

      // Calculate lot size based on risk
      const riskPercent = Math.max(1, 3 - (signal.riskScore * 2)); // 1-3% based on risk
      const { data: lotSizeData } = await supabase.functions.invoke('enhanced-trading', {
        body: {
          action: 'calculate_position_size',
          portfolioId: portfolio.id,
          symbol: signal.symbol,
          riskPercentage: riskPercent,
          entryPrice: signal.suggestedEntry,
          stopLoss: signal.suggestedStopLoss
        }
      });

      if (!lotSizeData?.success) {
        throw new Error('Failed to calculate position size');
      }

      // Execute the trade
      const { data: executeData } = await supabase.functions.invoke('enhanced-trading', {
        body: {
          action: 'execute_market_order',
          portfolioId: portfolio.id,
          symbol: signal.symbol,
          trade_type: signal.signalType,
          lot_size: lotSizeData.optimal_lot_size,
          stop_loss: signal.suggestedStopLoss,
          take_profit: signal.suggestedTakeProfit,
          comment: `Intelligence Signal - ${signal.centralBankSentiment} regime`
        }
      });

      if (executeData?.success) {
        toast.success(`${signal.signalType.toUpperCase()} order executed successfully!`);
        onSignalSelect?.(signal);
      } else {
        throw new Error(executeData?.error || 'Failed to execute order');
      }
    } catch (error) {
      console.error('Error executing signal:', error);
      toast.error('Failed to execute signal');
    }
  };

  const getSignalIcon = (signalType: string, strength: number) => {
    const baseClass = "w-5 h-5";
    const animateClass = strength >= 8 ? "animate-pulse" : "";
    
    if (signalType === 'buy') {
      return <TrendingUp className={`${baseClass} ${animateClass} text-bullish`} />;
    } else {
      return <TrendingDown className={`${baseClass} ${animateClass} text-bearish`} />;
    }
  };

  const getRegimeColor = (sentiment: string) => {
    switch (sentiment) {
      case 'risk-on': return 'text-bullish';
      case 'risk-off': return 'text-bearish';
      default: return 'text-muted-foreground';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Intelligence Signals
              <Badge variant="outline">{symbol}</Badge>
              <Badge variant="secondary">{timeframe}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'bg-primary text-primary-foreground' : ''}
              >
                <Activity className={`w-4 h-4 mr-1 ${autoRefresh ? 'animate-pulse' : ''}`} />
                Auto
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={generateIntelligenceSignals}
                disabled={loading}
              >
                <Zap className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Generate
              </Button>
            </div>
          </div>
          
          {lastUpdate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              Last updated: {formatTimeAgo(lastUpdate)}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Intelligence Signals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Active Intelligence Signals ({signals.length})</span>
            {signals.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSignals([])}
              >
                Clear All
              </Button>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {signals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <div className="text-lg font-semibold mb-2">No Intelligence Signals</div>
                  <div className="text-sm">
                    AI-powered signals will appear here based on market intelligence analysis.
                  </div>
                </div>
              ) : (
                signals.map((signal, index) => (
                  <Card key={index} className="p-4 bg-gradient-to-r from-card via-card to-card/50">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getSignalIcon(signal.signalType, signal.strength)}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant={signal.signalType === 'buy' ? 'default' : 'destructive'} 
                              className="font-semibold"
                            >
                              {signal.signalType.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">
                              {signal.confidence}% Confidence
                            </Badge>
                            <Badge variant="outline">
                              Strength: {signal.strength}/10
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {signal.symbol} • {signal.timeframe} • Enhanced with Market Intelligence
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSignalSelect?.(signal)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => executeSignal(signal)}
                        >
                          Execute
                        </Button>
                      </div>
                    </div>

                    {/* Market Intelligence Info */}
                    {signal.marketIntelligence && (
                      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Regime:</span>
                            <span className={`ml-1 font-medium ${getRegimeColor(signal.marketIntelligence.regime.regime)}`}>
                              {signal.marketIntelligence.regime.regime.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Sentiment:</span>
                            <span className="ml-1 font-medium">
                              {signal.marketIntelligence.sentiment.overallSentiment > 0 ? 'Bullish' : 'Bearish'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Risk Score:</span>
                            <span className="ml-1 font-medium">
                              {(signal.riskScore * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Expected Move:</span>
                            <span className="ml-1 font-medium">
                              {(signal.expectedMove * 10000).toFixed(0)} pips
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Trade Levels */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          Entry Price
                        </div>
                        <div className="text-lg font-mono">{signal.suggestedEntry.toFixed(5)}</div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-sm font-medium flex items-center gap-1">
                          <StopCircle className="w-4 h-4" />
                          Stop Loss
                        </div>
                        <div className="text-lg font-mono text-bearish">{signal.suggestedStopLoss.toFixed(5)}</div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-sm font-medium flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          Take Profit
                        </div>
                        <div className="text-lg font-mono text-bullish">{signal.suggestedTakeProfit.toFixed(5)}</div>
                      </div>
                    </div>

                    {/* Strength & Confidence */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span>Signal Strength</span>
                        <span>{signal.strength}/10</span>
                      </div>
                      <Progress value={signal.strength * 10} className="w-full" />
                    </div>

                    <Separator className="my-3" />

                    {/* Fundamental Analysis */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Fundamental Analysis</div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Central Bank:</span>
                          <div className="font-medium">{signal.centralBankSentiment}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Inflation:</span>
                          <div className="font-medium">{signal.inflationTrend}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">GDP Growth:</span>
                          <div className="font-medium">{signal.gdpGrowth}</div>
                        </div>
                      </div>
                    </div>

                    {/* Economic Events */}
                    <div className="space-y-2 mt-3">
                      <div className="text-sm font-medium">Key Economic Events</div>
                      <div className="flex flex-wrap gap-1">
                        {signal.economicEvents.slice(0, 3).map((event, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {event.event} ({event.importance})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntelligenceSignalsDashboard;
