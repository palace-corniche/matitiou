import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, AlertCircle, Clock, 
  Target, StopCircle, RefreshCw, Bell, Settings 
} from 'lucide-react';
import { SignalEngine, type TradingSignal, type MarketConditions } from '@/services/signalEngine';
import type { CandleData } from '@/services/technicalAnalysis';

interface SignalDashboardProps {
  data: CandleData[];
  timeframe: string;
  onSignalUpdate?: (signals: TradingSignal[]) => void;
}

const SignalDashboard: React.FC<SignalDashboardProps> = ({
  data,
  timeframe,
  onSignalUpdate
}) => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [marketConditions, setMarketConditions] = useState<MarketConditions | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [signalEngine] = useState(new SignalEngine());
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (data && data.length > 0) {
      generateSignals();
      analyzeMarketConditions();
    }
  }, [data, timeframe]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh && data && data.length > 0) {
      interval = setInterval(() => {
        generateSignals();
        analyzeMarketConditions();
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, data]);

  const generateSignals = async () => {
    setLoading(true);
    try {
      const signal = signalEngine.generateSignal(data, 'EUR/USD', timeframe);
      const activeSignals = signalEngine.getActiveSignals();
      
      if (signal) {
        setSignals([signal, ...activeSignals.filter(s => s.id !== signal.id)]);
      } else {
        setSignals(activeSignals);
      }
      
      setLastUpdate(new Date());
      onSignalUpdate?.(signals);
    } catch (error) {
      console.error('Error generating signals:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeMarketConditions = () => {
    if (data && data.length > 0) {
      const conditions = signalEngine.analyzeMarketConditions(data);
      setMarketConditions(conditions);
    }
  };

  const dismissSignal = (signalId: string) => {
    signalEngine.updateSignalStatus(signalId, false);
    setSignals(prev => prev.filter(s => s.id !== signalId));
  };

  const getSignalIcon = (signal: string, strength: number) => {
    const iconClass = `w-5 h-5 ${strength >= 7 ? 'animate-pulse' : ''}`;
    
    switch (signal) {
      case 'buy':
        return <TrendingUp className={`${iconClass} text-bullish`} />;
      case 'sell':
        return <TrendingDown className={`${iconClass} text-bearish`} />;
      default:
        return <AlertCircle className={`${iconClass} text-muted-foreground`} />;
    }
  };

  const getSignalBadgeVariant = (signal: string): "default" | "secondary" | "destructive" => {
    switch (signal) {
      case 'buy':
        return 'default';
      case 'sell':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getMarketConditionColor = (condition: string) => {
    switch (condition) {
      case 'bullish':
      case 'high':
      case 'strong':
        return 'text-bullish';
      case 'bearish':
      case 'low':
      case 'weak':
        return 'text-bearish';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Trading Signals
              <Badge variant="outline">{timeframe}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'bg-primary text-primary-foreground' : ''}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  generateSignals();
                  analyzeMarketConditions();
                }}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
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

        {/* Market Conditions */}
        {marketConditions && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Trend</div>
                <div className={`font-semibold ${getMarketConditionColor(marketConditions.trend)}`}>
                  {marketConditions.trend.toUpperCase()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Volatility</div>
                <div className={`font-semibold ${getMarketConditionColor(marketConditions.volatility)}`}>
                  {marketConditions.volatility.toUpperCase()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Volume</div>
                <div className={`font-semibold ${getMarketConditionColor(marketConditions.volume)}`}>
                  {marketConditions.volume.toUpperCase()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Momentum</div>
                <div className={`font-semibold ${getMarketConditionColor(marketConditions.momentum)}`}>
                  {marketConditions.momentum.toUpperCase()}
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Active Signals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Active Signals ({signals.length})</span>
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
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <div className="text-lg font-semibold mb-2">No Active Signals</div>
                  <div className="text-sm">
                    Signals will appear here when market conditions meet the criteria.
                  </div>
                </div>
              ) : (
                signals.map((signal) => (
                  <Card key={signal.id} className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getSignalIcon(signal.signal, signal.strength)}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getSignalBadgeVariant(signal.signal)} className="font-semibold">
                              {signal.signal.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">
                              {signal.confidence}% Confidence
                            </Badge>
                            <Badge variant="outline">
                              Strength: {signal.strength}/10
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {signal.pair} • {signal.timeframe} • {new Date(signal.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissSignal(signal.id)}
                      >
                        ×
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          Entry Price
                        </div>
                        <div className="text-lg font-mono">{signal.price.toFixed(5)}</div>
                      </div>
                      
                      {signal.stopLoss && (
                        <div className="space-y-1">
                          <div className="text-sm font-medium flex items-center gap-1">
                            <StopCircle className="w-4 h-4" />
                            Stop Loss
                          </div>
                          <div className="text-lg font-mono text-bearish">{signal.stopLoss.toFixed(5)}</div>
                        </div>
                      )}
                      
                      {signal.takeProfit && (
                        <div className="space-y-1">
                          <div className="text-sm font-medium flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            Take Profit
                          </div>
                          <div className="text-lg font-mono text-bullish">{signal.takeProfit.toFixed(5)}</div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Signal Strength</div>
                      <Progress value={signal.strength * 10} className="w-full" />
                    </div>

                    <Separator className="my-3" />

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Description</div>
                      <div className="text-sm text-muted-foreground">{signal.description}</div>
                    </div>

                    <div className="space-y-2 mt-3">
                      <div className="text-sm font-medium">Signal Sources</div>
                      <div className="flex flex-wrap gap-1">
                        {signal.sources.slice(0, 5).map((source, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {source.name} ({source.strength})
                          </Badge>
                        ))}
                        {signal.sources.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{signal.sources.length - 5} more
                          </Badge>
                        )}
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

export default SignalDashboard;