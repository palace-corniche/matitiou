import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

// FIX (CASE 2): This panel previously read from the legacy `tick_data` table which
// is empty (0 rows), causing it to show "Sim/No" while the real feed was live.
// It now reads exclusively from `market_data_feed` — the same source the rest of
// the app uses for prices and that drives trade execution.
export const PriceIntegrityMonitor = () => {
  const [metrics, setMetrics] = useState({
    marketDataFeedPrice: 0,
    marketDataFeedAge: 0,
    feedRowsLast15m: 0,
    lastTradePrice: 0,
    lastTradeSource: 'unknown',
    lastTradeTime: ''
  });
  useEffect(() => {
    const fetchMetrics = async () => {
      const { data: feedData } = await supabase
        .from('market_data_feed')
        .select('price, timestamp')
        .eq('symbol', 'EUR/USD')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count: recentCount } = await supabase
        .from('market_data_feed')
        .select('*', { count: 'exact', head: true })
        .eq('symbol', 'EUR/USD')
        .gte('timestamp', fifteenMinAgo);

      const { data: lastTrade } = await supabase
        .from('shadow_trades')
        .select('entry_price, price_source, price_timestamp, entry_time')
        .order('entry_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      setMetrics({
        marketDataFeedPrice: feedData ? parseFloat(String(feedData.price)) : 0,
        marketDataFeedAge: feedData ? Date.now() - new Date(feedData.timestamp).getTime() : 0,
        feedRowsLast15m: recentCount ?? 0,
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
  const isDifferent = priceDiff > 0.001;
  const ageMinutes = Math.round(metrics.marketDataFeedAge / 60000);
  const feedIsLive = ageMinutes < 15 && metrics.feedRowsLast15m > 0;

  return (
    <Card className="mx-[39px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>💰</span>
          <span>Price Source Monitor</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm">Live source (market_data_feed):</span>
            <Badge variant="default" className="font-mono">
              {metrics.marketDataFeedPrice.toFixed(5)}
            </Badge>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm">Latest tick age:</span>
            <Badge variant={ageMinutes < 15 ? 'default' : 'destructive'}>
              {ageMinutes} min
            </Badge>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm">Ticks (last 15 min):</span>
            <Badge variant={metrics.feedRowsLast15m > 0 ? 'default' : 'destructive'}>
              {metrics.feedRowsLast15m}
            </Badge>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm">Is Live:</span>
            <Badge variant={feedIsLive ? 'default' : 'destructive'}>
              {feedIsLive ? 'Yes' : 'No'}
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
            <Badge variant={metrics.lastTradeSource === 'market_data_feed' ? 'default' : 'secondary'}>
              {metrics.lastTradeSource}
            </Badge>
          </div>

          {metrics.lastTradeTime && (
            <div className="flex justify-between items-center">
              <span className="text-sm">Last Trade Time:</span>
              <span className="text-xs text-muted-foreground">
                {new Date(metrics.lastTradeTime).toLocaleString()}
              </span>
            </div>
          )}

          {isDifferent && metrics.lastTradePrice > 0 && (
            <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm text-destructive">
                ⚠️ Last trade price differs by {(priceDiff * 10000).toFixed(1)} pips from current market.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};