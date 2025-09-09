import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, Clock, Zap, Activity,
  Wifi, WifiOff, BarChart3, Target
} from 'lucide-react';
import { marketDataService, TickData } from '@/services/realTimeMarketData';
import { toast } from 'sonner';

interface PnLCalculation {
  pnl: number;
  pips: number;
  pipValue: number;
}

interface TickDisplayProps {
  trades?: any[];
  onTickUpdate?: (tick: TickData) => void;
}

const EnhancedTickDisplay: React.FC<TickDisplayProps> = ({ trades = [], onTickUpdate }) => {
  const [currentTick, setCurrentTick] = useState<TickData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [tickHistory, setTickHistory] = useState<TickData[]>([]);
  const [pnlCalculations, setPnlCalculations] = useState<Record<string, PnLCalculation>>({});
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [sessionInfo, setSessionInfo] = useState({
    session: 'Unknown',
    color: 'text-gray-500',
    activity: 'Low'
  });

  // Calculate session info based on current time
  const updateSessionInfo = useCallback(() => {
    const hour = new Date().getUTCHours();
    let session = 'Unknown';
    let color = 'text-gray-500';
    let activity = 'Low';

    if (hour >= 0 && hour < 7) {
      session = 'Sydney';
      color = 'text-blue-500';
      activity = 'Medium';
    } else if (hour >= 1 && hour < 10) {
      session = 'Tokyo';
      color = 'text-red-500';
      activity = 'High';
    } else if (hour >= 8 && hour < 17) {
      session = 'London';
      color = 'text-green-500';
      activity = 'Very High';
    } else if (hour >= 13 && hour < 22) {
      session = 'New York';
      color = 'text-yellow-500';
      activity = 'Very High';
    }

    setSessionInfo({ session, color, activity });
  }, []);

  // Update P&L calculations for all trades
  const updatePnLCalculations = useCallback((tick: TickData) => {
    if (!trades || trades.length === 0) return;

    const newCalculations: Record<string, PnLCalculation> = {};
    
    trades.forEach(trade => {
      if (trade.status === 'open' && trade.symbol === 'EUR/USD') {
        const calculation = marketDataService.calculatePnL(
          trade.trade_type,
          trade.entry_price,
          tick,
          trade.lot_size
        );
        newCalculations[trade.id] = calculation;
      }
    });

    setPnlCalculations(newCalculations);
  }, [trades]);

  useEffect(() => {
    updateSessionInfo();
    const sessionInterval = setInterval(updateSessionInfo, 60000); // Update every minute

    // Load initial data
    marketDataService.getLatestTick().then(tick => {
      if (tick) {
        setCurrentTick(tick);
        updatePnLCalculations(tick);
        if (onTickUpdate) onTickUpdate(tick);
      }
    });

    // Subscribe to real-time updates
    const unsubscribe = marketDataService.subscribe({
      onTick: (tick: TickData) => {
        console.log('📊 New tick received in component:', tick);
        setCurrentTick(tick);
        setIsConnected(true);
        setLastUpdateTime(new Date());
        updatePnLCalculations(tick);
        
        // Update tick history (keep last 50 ticks)
        setTickHistory(prev => [tick, ...prev.slice(0, 49)]);
        
        if (onTickUpdate) onTickUpdate(tick);
      },
      onError: (error: Error) => {
        console.error('❌ Market data error:', error);
        setIsConnected(false);
        toast.error('Market data connection lost');
      }
    });

    return () => {
      clearInterval(sessionInterval);
      unsubscribe();
    };
  }, [updatePnLCalculations, onTickUpdate, updateSessionInfo]);

  const formatPrice = (price: number) => price.toFixed(5);
  const formatPips = (pips: number) => pips > 0 ? `+${pips.toFixed(1)}` : pips.toFixed(1);
  const formatPnL = (pnl: number) => pnl > 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;

  const getPriceDirection = (currentPrice: number, previousPrice: number) => {
    if (currentPrice > previousPrice) return 'up';
    if (currentPrice < previousPrice) return 'down';
    return 'neutral';
  };

  const previousTick = tickHistory[1];
  const bidDirection = previousTick ? getPriceDirection(currentTick?.bid || 0, previousTick.bid) : 'neutral';
  const askDirection = previousTick ? getPriceDirection(currentTick?.ask || 0, previousTick.ask) : 'neutral';

  const totalPnL = Object.values(pnlCalculations).reduce((sum, calc) => sum + calc.pnl, 0);
  const totalPips = Object.values(pnlCalculations).reduce((sum, calc) => sum + calc.pips, 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            <CardTitle className="text-sm">EUR/USD Live Rates</CardTitle>
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span className="text-xs text-muted-foreground">
              {lastUpdateTime.toLocaleTimeString()}
            </span>
          </div>
        </div>
        <CardDescription>
          Real-time tick data with MT4-style precision
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Prices */}
        {currentTick ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">BID</span>
                {bidDirection === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                {bidDirection === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
              </div>
              <div className={`text-2xl font-mono font-bold ${
                bidDirection === 'up' ? 'text-green-500' : 
                bidDirection === 'down' ? 'text-red-500' : 'text-foreground'
              }`}>
                {formatPrice(currentTick.bid)}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">ASK</span>
                {askDirection === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                {askDirection === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
              </div>
              <div className={`text-2xl font-mono font-bold ${
                askDirection === 'up' ? 'text-green-500' : 
                askDirection === 'down' ? 'text-red-500' : 'text-foreground'
              }`}>
                {formatPrice(currentTick.ask)}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="animate-pulse text-muted-foreground">
              Loading market data...
            </div>
          </div>
        )}

        {/* Spread & Session Info */}
        {currentTick && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">SPREAD</span>
              <div className="text-lg font-mono">
                {(currentTick.spread * 10000).toFixed(1)} pips
              </div>
            </div>
            
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">SESSION</span>
              <div className={`text-lg font-medium ${sessionInfo.color}`}>
                {sessionInfo.session}
              </div>
              <Badge variant="outline" className="text-xs">
                {sessionInfo.activity}
              </Badge>
            </div>
          </div>
        )}

        {/* P&L Summary for Open Trades */}
        {trades.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-medium flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Open Positions P&L</span>
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">TOTAL P&L</span>
                <div className={`text-lg font-mono font-bold ${
                  totalPnL > 0 ? 'text-green-500' : totalPnL < 0 ? 'text-red-500' : 'text-foreground'
                }`}>
                  {formatPnL(totalPnL)}
                </div>
              </div>
              
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">TOTAL PIPS</span>
                <div className={`text-lg font-mono font-bold ${
                  totalPips > 0 ? 'text-green-500' : totalPips < 0 ? 'text-red-500' : 'text-foreground'
                }`}>
                  {formatPips(totalPips)}
                </div>
              </div>
            </div>

            {/* Individual Trade P&L */}
            {Object.keys(pnlCalculations).length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {trades.filter(trade => trade.status === 'open' && pnlCalculations[trade.id]).map(trade => {
                  const calc = pnlCalculations[trade.id];
                  return (
                    <div key={trade.id} className="flex justify-between items-center text-xs p-2 bg-muted rounded">
                      <span>{trade.trade_type.toUpperCase()} {trade.lot_size}</span>
                      <div className="flex space-x-2">
                        <span className={calc.pnl > 0 ? 'text-green-500' : 'text-red-500'}>
                          {formatPnL(calc.pnl)}
                        </span>
                        <span className={calc.pips > 0 ? 'text-green-500' : 'text-red-500'}>
                          {formatPips(calc.pips)}p
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Market Activity Indicator */}
        <div className="space-y-2 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">MARKET ACTIVITY</span>
            <span className="text-xs">{currentTick?.tick_volume || 0} ticks/min</span>
          </div>
          <Progress 
            value={Math.min(100, ((currentTick?.tick_volume || 0) / 100) * 100)} 
            className="h-2" 
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedTickDisplay;
