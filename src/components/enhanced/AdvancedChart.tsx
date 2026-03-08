// AdvancedChart Component - Enhanced charting with real candle data from database

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, LineChart, Maximize2 } from 'lucide-react';
import { untypedSupabase as supabase } from '@/integrations/supabase/untypedClient';

interface Trade {
  id: string;
  symbol: string;
  trade_type: 'buy' | 'sell';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  entry_time: string;
  status: string;
}

interface PendingOrder {
  id: string;
  symbol: string;
  order_type: string;
  trade_type: 'buy' | 'sell';
  trigger_price: number;
  status: string;
}

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface AdvancedChartProps {
  symbol: string;
  trades: Trade[];
  pendingOrders: PendingOrder[];
}

const TIMEFRAME_DB_MAP: Record<string, string> = {
  '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1w'
};

export const AdvancedChart: React.FC<AdvancedChartProps> = ({ symbol, trades, pendingOrders }) => {
  const [timeframe, setTimeframe] = useState('15m');
  const [chartType, setChartType] = useState('candlestick');
  const [showTradeLines, setShowTradeLines] = useState(true);
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, [symbol, timeframe]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      const dbTimeframe = TIMEFRAME_DB_MAP[timeframe] || '15m';
      const { data, error } = await supabase
        .from('aggregated_candles')
        .select('timestamp, open_price, high_price, low_price, close_price, volume')
        .eq('symbol', symbol)
        .eq('timeframe', dbTimeframe)
        .order('timestamp', { ascending: true })
        .limit(200);

      if (!error && data && data.length > 0) {
        setChartData(data.map((c: any) => ({
          time: c.timestamp,
          open: Number(c.open_price),
          high: Number(c.high_price),
          low: Number(c.low_price),
          close: Number(c.close_price),
          volume: Number(c.volume || 0)
        })));
      } else {
        // Fallback: try other timeframes
        const { data: fallback } = await supabase
          .from('aggregated_candles')
          .select('timestamp, open_price, high_price, low_price, close_price, volume')
          .eq('symbol', symbol)
          .order('timestamp', { ascending: true })
          .limit(200);

        if (fallback && fallback.length > 0) {
          setChartData(fallback.map((c: any) => ({
            time: c.timestamp,
            open: Number(c.open_price),
            high: Number(c.high_price),
            low: Number(c.low_price),
            close: Number(c.close_price),
            volume: Number(c.volume || 0)
          })));
        }
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPrice = () => {
    if (chartData.length === 0) return 0;
    return chartData[chartData.length - 1].close;
  };

  const symbolTrades = trades.filter(t => t.symbol === symbol);
  const symbolPendingOrders = pendingOrders.filter(o => o.symbol === symbol);
  const currentPrice = getCurrentPrice();

  const timeframes = [
    { value: '1m', label: '1M' }, { value: '5m', label: '5M' },
    { value: '15m', label: '15M' }, { value: '30m', label: '30M' },
    { value: '1h', label: '1H' }, { value: '4h', label: '4H' },
    { value: '1d', label: '1D' }, { value: '1w', label: '1W' }
  ];

  const chartTypes = [
    { value: 'candlestick', label: 'Candlesticks', icon: BarChart3 },
    { value: 'line', label: 'Line Chart', icon: LineChart }
  ];

  return (
    <Card className="h-[400px]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-lg">{symbol}</CardTitle>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-mono">{currentPrice > 0 ? currentPrice.toFixed(5) : '—'}</span>
              <Badge variant="outline" className="text-xs">{timeframe.toUpperCase()}</Badge>
              {chartData.length > 0 && (
                <Badge variant="secondary" className="text-xs">{chartData.length} candles</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {timeframes.map(tf => (
                  <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {chartTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />{type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm"><Maximize2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="h-[320px] relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No candle data available for {symbol} ({timeframe})
          </div>
        ) : (
          <div className="h-full relative bg-gradient-to-b from-background to-muted/20 rounded border">
            <div className="absolute inset-4">
              <div className="h-full flex items-end gap-1">
                {chartData.slice(-50).map((candle, index) => {
                  const isGreen = candle.close > candle.open;
                  const bodyHeight = Math.abs(candle.close - candle.open) * 100000;
                  const wickTop = (candle.high - Math.max(candle.open, candle.close)) * 100000;
                  const wickBottom = (Math.min(candle.open, candle.close) - candle.low) * 100000;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center justify-end">
                      <div className={`w-0.5 ${isGreen ? 'bg-green-500' : 'bg-red-500'}`} style={{ height: `${wickTop * 2}px` }} />
                      <div className={`w-2 ${isGreen ? 'bg-green-500' : 'bg-red-500'}`} style={{ height: `${Math.max(bodyHeight * 2, 1)}px` }} />
                      <div className={`w-0.5 ${isGreen ? 'bg-green-500' : 'bg-red-500'}`} style={{ height: `${wickBottom * 2}px` }} />
                    </div>
                  );
                })}
              </div>

              {showTradeLines && (
                <div className="absolute inset-0 pointer-events-none">
                  {symbolTrades.map(trade => (
                    <div key={trade.id} className="absolute left-0 right-0 z-10">
                      <div className="border-dashed border-blue-500 border-t relative"
                        style={{ top: `${((currentPrice - trade.entry_price) / currentPrice) * 100 + 50}%` }}>
                        <span className="absolute right-0 -top-3 text-xs bg-blue-500 text-white px-1 rounded">
                          Entry: {trade.entry_price.toFixed(5)}
                        </span>
                      </div>
                      {trade.stop_loss && (
                        <div className="border-dashed border-red-500 border-t relative"
                          style={{ top: `${((currentPrice - trade.stop_loss) / currentPrice) * 100 + 50}%` }}>
                          <span className="absolute right-0 -top-3 text-xs bg-red-500 text-white px-1 rounded">
                            S/L: {trade.stop_loss.toFixed(5)}
                          </span>
                        </div>
                      )}
                      {trade.take_profit && (
                        <div className="border-dashed border-green-500 border-t relative"
                          style={{ top: `${((currentPrice - trade.take_profit) / currentPrice) * 100 + 50}%` }}>
                          <span className="absolute right-0 -top-3 text-xs bg-green-500 text-white px-1 rounded">
                            T/P: {trade.take_profit.toFixed(5)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  {symbolPendingOrders.map(order => (
                    <div key={order.id} className="absolute left-0 right-0 z-10">
                      <div className="border-dashed border-yellow-500 border-t relative"
                        style={{ top: `${((currentPrice - order.trigger_price) / currentPrice) * 100 + 50}%` }}>
                        <span className="absolute right-0 -top-3 text-xs bg-yellow-500 text-black px-1 rounded">
                          {order.order_type}: {order.trigger_price.toFixed(5)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="absolute left-0 right-0 top-1/2 border-t-2 border-primary z-20">
                <span className="absolute right-0 -top-4 text-sm bg-primary text-primary-foreground px-2 py-1 rounded">
                  {currentPrice.toFixed(5)}
                </span>
              </div>
            </div>

            <div className="absolute top-2 left-2 flex gap-2">
              <Button variant={showTradeLines ? "default" : "outline"} size="sm"
                onClick={() => setShowTradeLines(!showTradeLines)} className="h-6 px-2 text-xs">
                Trade Lines
              </Button>
            </div>
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
              Vol: {chartData.length > 0 ? chartData[chartData.length - 1].volume : 0}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
