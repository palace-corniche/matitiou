import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
export const PriceIntegrityMonitor = () => {
  const [metrics, setMetrics] = useState({
    marketDataFeedPrice: 0,
    marketDataFeedAge: 0,
    tickDataPrice: 0,
    tickDataIsLive: false,
    lastTradePrice: 0,
    lastTradeSource: 'unknown',
    lastTradeTime: ''
  });
  useEffect(() => {
    const fetchMetrics = async () => {
      // Get market_data_feed price (SOURCE OF TRUTH)
      const {
        data: feedData
      } = await supabase.from('market_data_feed').select('price, timestamp').eq('symbol', 'EUR/USD').order('timestamp', {
        ascending: false
      }).limit(1).single();

      // Get tick_data price (for comparison)
      const {
        data: tickData
      } = await supabase.from('tick_data').select('bid, is_live, timestamp, data_source').eq('symbol', 'EUR/USD').order('timestamp', {
        ascending: false
      }).limit(1).single();

      // Get last trade
      const {
        data: lastTrade
      } = await supabase.from('shadow_trades').select('entry_price, price_source, price_timestamp, entry_time').order('entry_time', {
        ascending: false
      }).limit(1).single();
      setMetrics({
        marketDataFeedPrice: feedData ? parseFloat(String(feedData.price)) : 0,
        marketDataFeedAge: feedData ? Date.now() - new Date(feedData.timestamp).getTime() : 0,
        tickDataPrice: tickData?.bid || 0,
        tickDataIsLive: tickData?.is_live || false,
        lastTradePrice: lastTrade?.entry_price || 0,
        lastTradeSource: lastTrade?.price_source || 'unknown',
        lastTradeTime: lastTrade?.entry_time || ''
      });
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);
  const priceDiff = Math.abs(metrics.marketDataFeedPrice - metrics.lastTradePrice);
  const isDifferent = priceDiff > 0.001; // More than 10 pips
  const ageMinutes = Math.round(metrics.marketDataFeedAge / 60000);
  return <Card className="mx-[39px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>💰</span>
          <span>Price Source Monitor</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm">✅ market_data_feed (TRUTH):</span>
            <Badge variant="default" className="font-mono">
              {metrics.marketDataFeedPrice.toFixed(5)}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm">⏰ Data age:</span>
            <Badge variant={ageMinutes < 15 ? 'default' : 'destructive'}>
              {ageMinutes} min
            </Badge>
          </div>
          
          <Separator />
          
          <div className="flex justify-between items-center">
            <span className="text-sm">❌ tick_data (simulation):</span>
            <Badge variant="secondary" className="font-mono">
              {metrics.tickDataPrice.toFixed(5)}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm">Is Live:</span>
            <Badge variant={metrics.tickDataIsLive ? 'default' : 'destructive'}>
              {metrics.tickDataIsLive ? 'Yes' : 'No (Sim)'}
            </Badge>
          </div>
          
          <Separator />
          
          <div className="flex justify-between items-center">
            <span className="text-sm">Last Trade Entry:</span>
            <Badge variant={isDifferent ? 'destructive' : 'default'} className="font-mono">
              {metrics.lastTradePrice.toFixed(5)}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm">Last Trade Source:</span>
            <Badge variant={metrics.lastTradeSource === 'market_data_feed' ? 'default' : metrics.lastTradeSource === 'legacy' ? 'secondary' : 'destructive'}>
              {metrics.lastTradeSource}
            </Badge>
          </div>
          
          {metrics.lastTradeTime && <div className="flex justify-between items-center">
              <span className="text-sm">Last Trade Time:</span>
              <span className="text-xs text-muted-foreground">
                {new Date(metrics.lastTradeTime).toLocaleString()}
              </span>
            </div>}
          
          {isDifferent && <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm text-destructive">
                ⚠️ Warning: Last trade price differs by {(priceDiff * 10000).toFixed(1)} pips from current market!
              </p>
            </div>}
        </div>
      </CardContent>
    </Card>;
};