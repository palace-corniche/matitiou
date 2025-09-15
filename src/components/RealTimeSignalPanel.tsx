import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Clock, 
  Target,
  Activity,
  Signal as SignalIcon
} from 'lucide-react';
import { realTimeQuantAnalytics } from '@/services/realTimeQuantAnalytics';
import { toast } from '@/hooks/use-toast';

interface LiveSignal {
  id: string;
  symbol: string;
  signal_type: 'buy' | 'sell';
  confidence: number;
  strength: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  lot_size: number;
  timestamp: number;
  model_source: string;
  risk_metrics: any;
  live_data: any;
}

interface RealTimeSignalPanelProps {
  onSignalExecute?: (signal: LiveSignal) => void;
  className?: string;
}

export default function RealTimeSignalPanel({ onSignalExecute, className }: RealTimeSignalPanelProps) {
  const [signals, setSignals] = useState<LiveSignal[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [stats, setStats] = useState({
    totalSignals: 0,
    successRate: 0,
    avgConfidence: 0,
    lastSignalTime: null as Date | null
  });

  useEffect(() => {
    // Subscribe to real-time signals
    const unsubscribe = realTimeQuantAnalytics.onSignal((signal: LiveSignal) => {
      console.log('📊 New live signal received:', signal);
      
      setSignals(prev => {
        const newSignals = [signal, ...prev].slice(0, 20); // Keep last 20 signals
        return newSignals;
      });
      
      setStats(prev => ({
        ...prev,
        totalSignals: prev.totalSignals + 1,
        avgConfidence: signals.length > 0 
          ? (signals.reduce((sum, s) => sum + s.confidence, 0) + signal.confidence) / (signals.length + 1)
          : signal.confidence,
        lastSignalTime: new Date()
      }));

      toast({
        title: "🚨 New Live Signal",
        description: `${signal.signal_type.toUpperCase()} ${signal.symbol} - Confidence: ${(signal.confidence * 100).toFixed(1)}%`
      });
    });

    return unsubscribe;
  }, [signals.length]);

  const startAnalytics = () => {
    realTimeQuantAnalytics.start();
    setIsActive(true);
    toast({
      title: "Analytics Started",
      description: "Real-time quantitative signal generation is now active"
    });
  };

  const stopAnalytics = () => {
    realTimeQuantAnalytics.stop();
    setIsActive(false);
    toast({
      title: "Analytics Stopped",
      description: "Real-time signal generation has been paused"
    });
  };

  const getSignalColor = (signalType: string) => {
    return signalType === 'buy' ? 'text-green-600' : 'text-red-600';
  };

  const getSignalIcon = (signalType: string) => {
    return signalType === 'buy' ? TrendingUp : TrendingDown;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const calculateRiskReward = (signal: LiveSignal) => {
    const risk = Math.abs(signal.entry_price - signal.stop_loss);
    const reward = Math.abs(signal.take_profit - signal.entry_price);
    return risk > 0 ? (reward / risk).toFixed(2) : 'N/A';
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <SignalIcon className="h-5 w-5" />
                Real-Time Signal Analytics
              </CardTitle>
              <CardDescription>Live quantitative signals from ensemble models</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={isActive ? stopAnalytics : startAnalytics}
                variant={isActive ? "destructive" : "default"}
                size="sm"
              >
                {isActive ? (
                  <>
                    <Activity className="h-4 w-4 mr-2 animate-pulse" />
                    Stop
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Start
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Statistics Panel */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Total Signals</div>
              <div className="text-lg font-bold">{stats.totalSignals}</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Avg Confidence</div>
              <div className="text-lg font-bold">
                {(stats.avgConfidence * 100).toFixed(1)}%
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Status</div>
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Last Signal</div>
              <div className="text-sm font-bold">
                {stats.lastSignalTime 
                  ? stats.lastSignalTime.toLocaleTimeString() 
                  : 'None'
                }
              </div>
            </div>
          </div>

          {/* Live Signals List */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-semibold">Live Signals</h3>
              <Badge variant="outline">{signals.length} signals</Badge>
            </div>
            
            {signals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <SignalIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No signals generated yet</p>
                <p className="text-sm">Start analytics to begin receiving live signals</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {signals.map((signal) => {
                  const SignalIcon = getSignalIcon(signal.signal_type);
                  
                  return (
                    <Card key={signal.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <SignalIcon className={`h-5 w-5 ${getSignalColor(signal.signal_type)}`} />
                          <div>
                            <div className="font-semibold">
                              {signal.signal_type.toUpperCase()} {signal.symbol}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatTimestamp(signal.timestamp)} • {signal.model_source}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Confidence</div>
                            <div className="font-bold">{(signal.confidence * 100).toFixed(1)}%</div>
                            <Progress value={signal.confidence * 100} className="w-16 h-2 mt-1" />
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Entry</div>
                            <div className="font-bold">{signal.entry_price.toFixed(5)}</div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">R:R</div>
                            <div className="font-bold">{calculateRiskReward(signal)}</div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Lot Size</div>
                            <div className="font-bold">{signal.lot_size}</div>
                          </div>
                          
                          {onSignalExecute && (
                            <Button
                              size="sm"
                              onClick={() => onSignalExecute(signal)}
                              className="ml-2"
                            >
                              <Target className="h-3 w-3 mr-1" />
                              Execute
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Additional signal details */}
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-muted-foreground">SL: </span>
                            <span className="font-mono">{signal.stop_loss.toFixed(5)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">TP: </span>
                            <span className="font-mono">{signal.take_profit.toFixed(5)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Strength: </span>
                            <span className="font-bold">{signal.strength}/10</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}