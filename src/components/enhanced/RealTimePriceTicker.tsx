import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TickData {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  timestamp: string;
  change?: number;
  changePercent?: number;
}

interface RealTimePriceTickerProps {
  symbols?: string[];
  onPriceUpdate?: (tick: TickData) => void;
}

export const RealTimePriceTicker: React.FC<RealTimePriceTickerProps> = ({
  symbols = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF'],
  onPriceUpdate
}) => {
  const [ticks, setTicks] = useState<Record<string, TickData>>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchLatestTicks = async () => {
      try {
        // Fetch latest price from market_data_feed (REAL market prices)
        const { data: marketPrices, error } = await supabase
          .from('market_data_feed')
          .select('symbol, price, timestamp')
          .in('symbol', symbols)
          .order('timestamp', { ascending: false })
          .limit(symbols.length * 2);

        if (error) {
          console.error('Error fetching market prices:', error);
          setIsConnected(false);
          return;
        }

        if (!marketPrices || marketPrices.length === 0) {
          setIsConnected(false);
          return;
        }

        // Calculate bid/ask from mid price with spread
        const spread = 0.00015; // 1.5 pips for EUR/USD
        
        for (const symbol of symbols) {
          const symbolPrices = marketPrices.filter(p => p.symbol === symbol);
          if (symbolPrices.length === 0) continue;

          const latest = symbolPrices[0];
          const previous = symbolPrices[1] || latest;

          const currentPrice = parseFloat(String(latest.price));
          const previousPrice = parseFloat(String(previous.price));
          const change = currentPrice - previousPrice;
          const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;

          const tickData: TickData = {
            symbol: latest.symbol,
            bid: currentPrice - (spread / 2),
            ask: currentPrice + (spread / 2),
            spread: spread * 10000, // in pips
            timestamp: latest.timestamp,
            change,
            changePercent
          };

          setTicks(prev => ({
            ...prev,
            [symbol]: tickData
          }));

          onPriceUpdate?.(tickData);
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Error fetching tick data:', error);
        setIsConnected(false);
      }
    };

    // Initial fetch
    fetchLatestTicks();

    // Set up real-time updates
    intervalId = setInterval(fetchLatestTicks, 1000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [symbols, onPriceUpdate]);

  const formatPrice = (price: number, symbol: string) => {
    // JPY pairs typically have 3 decimal places, others have 5
    const decimals = symbol.includes('JPY') ? 3 : 5;
    return price.toFixed(decimals);
  };

  const formatSpread = (spread: number) => {
    return (spread * 10000).toFixed(1); // Convert to pips
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-bullish';
    if (change < 0) return 'text-bearish';
    return 'text-muted-foreground';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-3 w-3" />;
    if (change < 0) return <TrendingDown className="h-3 w-3" />;
    return null;
  };

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="text-sm font-medium">Live Prices</span>
          </div>
          <Badge 
            variant={isConnected ? "default" : "destructive"}
            className="text-xs"
          >
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </Badge>
        </div>

        <div className="space-y-2">
          {symbols.map(symbol => {
            const tick = ticks[symbol];
            if (!tick) return null;

            return (
              <div key={symbol} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs">{symbol}</span>
                    <div className={`flex items-center gap-1 ${getChangeColor(tick.change || 0)}`}>
                      {getChangeIcon(tick.change || 0)}
                      <span className="text-xs">
                        {tick.changePercent ? `${tick.changePercent > 0 ? '+' : ''}${tick.changePercent.toFixed(2)}%` : '0.00%'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="text-center">
                    <div className="text-bearish font-mono">
                      {formatPrice(tick.bid, symbol)}
                    </div>
                    <div className="text-muted-foreground text-xs">BID</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-bullish font-mono">
                      {formatPrice(tick.ask, symbol)}
                    </div>
                    <div className="text-muted-foreground text-xs">ASK</div>
                  </div>

                  <div className="text-center">
                    <div className="font-mono">
                      {formatSpread(tick.spread)}
                    </div>
                    <div className="text-muted-foreground text-xs">SPREAD</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 pt-2 border-t border-border text-xs text-muted-foreground text-center">
          Last update: {Object.values(ticks)[0] ? new Date(Object.values(ticks)[0].timestamp).toLocaleTimeString() : 'Never'}
        </div>
      </CardContent>
    </Card>
  );
};