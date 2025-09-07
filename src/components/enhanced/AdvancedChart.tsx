// AdvancedChart Component - Enhanced charting with trade visualization

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, BarChart3, LineChart, Maximize2 } from 'lucide-react';

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

interface AdvancedChartProps {
  symbol: string;
  trades: Trade[];
  pendingOrders: PendingOrder[];
}

export const AdvancedChart: React.FC<AdvancedChartProps> = ({
  symbol,
  trades,
  pendingOrders
}) => {
  const [timeframe, setTimeframe] = useState('15m');
  const [chartType, setChartType] = useState('candlestick');
  const [showTradeLines, setShowTradeLines] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, [symbol, timeframe]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      // Generate mock chart data for demonstration
      const data = generateMockChartData();
      setChartData(data);
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockChartData = () => {
    const data = [];
    let price = 1.17000;
    const now = new Date();
    
    for (let i = 100; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 15 * 60 * 1000); // 15 minutes intervals
      const open = price;
      const volatility = 0.0005;
      const change = (Math.random() - 0.5) * volatility;
      const high = Math.max(open, open + change) + Math.random() * volatility * 0.5;
      const low = Math.min(open, open + change) - Math.random() * volatility * 0.5;
      const close = open + change;
      
      data.push({
        time: time.toISOString(),
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 1000) + 100
      });
      
      price = close;
    }
    
    return data;
  };

  const getCurrentPrice = () => {
    if (chartData.length === 0) return 1.17000;
    return chartData[chartData.length - 1].close;
  };

  const getTradesBySymbol = () => {
    return trades.filter(trade => trade.symbol === symbol);
  };

  const getPendingOrdersBySymbol = () => {
    return pendingOrders.filter(order => order.symbol === symbol);
  };

  const timeframes = [
    { value: '1m', label: '1M' },
    { value: '5m', label: '5M' },
    { value: '15m', label: '15M' },
    { value: '30m', label: '30M' },
    { value: '1h', label: '1H' },
    { value: '4h', label: '4H' },
    { value: '1d', label: '1D' },
    { value: '1w', label: '1W' }
  ];

  const chartTypes = [
    { value: 'candlestick', label: 'Candlesticks', icon: BarChart3 },
    { value: 'line', label: 'Line Chart', icon: LineChart }
  ];

  const currentPrice = getCurrentPrice();
  const symbolTrades = getTradesBySymbol();
  const symbolPendingOrders = getPendingOrdersBySymbol();

  return (
    <Card className="h-[400px]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-lg">{symbol}</CardTitle>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-mono">{currentPrice.toFixed(5)}</span>
              <Badge variant="outline" className="text-xs">
                {timeframe.toUpperCase()}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Timeframe Selection */}
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeframes.map(tf => (
                  <SelectItem key={tf.value} value={tf.value}>
                    {tf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Chart Type Selection */}
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {chartTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="h-[320px] relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="h-full relative bg-gradient-to-b from-background to-muted/20 rounded border">
            {/* Mock Chart Display */}
            <div className="absolute inset-4">
              <div className="h-full flex items-end gap-1">
                {chartData.slice(-50).map((candle, index) => {
                  const isGreen = candle.close > candle.open;
                  const bodyHeight = Math.abs(candle.close - candle.open) * 100000;
                  const wickTop = (candle.high - Math.max(candle.open, candle.close)) * 100000;
                  const wickBottom = (Math.min(candle.open, candle.close) - candle.low) * 100000;
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center justify-end">
                      {/* Upper wick */}
                      <div 
                        className={`w-0.5 ${isGreen ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ height: `${wickTop * 2}px` }}
                      />
                      {/* Body */}
                      <div 
                        className={`w-2 ${isGreen ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ height: `${Math.max(bodyHeight * 2, 1)}px` }}
                      />
                      {/* Lower wick */}
                      <div 
                        className={`w-0.5 ${isGreen ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ height: `${wickBottom * 2}px` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Trade Lines Overlay */}
              {showTradeLines && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Open Positions */}
                  {symbolTrades.map(trade => (
                    <div key={trade.id} className="absolute left-0 right-0 z-10">
                      {/* Entry Line */}
                      <div 
                        className="border-dashed border-blue-500 border-t relative"
                        style={{ 
                          top: `${((currentPrice - trade.entry_price) / currentPrice) * 100 + 50}%`
                        }}
                      >
                        <span className="absolute right-0 -top-3 text-xs bg-blue-500 text-white px-1 rounded">
                          Entry: {trade.entry_price.toFixed(5)}
                        </span>
                      </div>
                      
                      {/* Stop Loss Line */}
                      {trade.stop_loss && (
                        <div 
                          className="border-dashed border-red-500 border-t relative"
                          style={{ 
                            top: `${((currentPrice - trade.stop_loss) / currentPrice) * 100 + 50}%`
                          }}
                        >
                          <span className="absolute right-0 -top-3 text-xs bg-red-500 text-white px-1 rounded">
                            S/L: {trade.stop_loss.toFixed(5)}
                          </span>
                        </div>
                      )}
                      
                      {/* Take Profit Line */}
                      {trade.take_profit && (
                        <div 
                          className="border-dashed border-green-500 border-t relative"
                          style={{ 
                            top: `${((currentPrice - trade.take_profit) / currentPrice) * 100 + 50}%`
                          }}
                        >
                          <span className="absolute right-0 -top-3 text-xs bg-green-500 text-white px-1 rounded">
                            T/P: {trade.take_profit.toFixed(5)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Pending Orders */}
                  {symbolPendingOrders.map(order => (
                    <div key={order.id} className="absolute left-0 right-0 z-10">
                      <div 
                        className="border-dashed border-yellow-500 border-t relative"
                        style={{ 
                          top: `${((currentPrice - order.trigger_price) / currentPrice) * 100 + 50}%`
                        }}
                      >
                        <span className="absolute right-0 -top-3 text-xs bg-yellow-500 text-black px-1 rounded">
                          {order.order_type}: {order.trigger_price.toFixed(5)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Current Price Line */}
              <div className="absolute left-0 right-0 top-1/2 border-t-2 border-primary z-20">
                <span className="absolute right-0 -top-4 text-sm bg-primary text-primary-foreground px-2 py-1 rounded">
                  {currentPrice.toFixed(5)}
                </span>
              </div>
            </div>

            {/* Chart Controls */}
            <div className="absolute top-2 left-2 flex gap-2">
              <Button
                variant={showTradeLines ? "default" : "outline"}
                size="sm"
                onClick={() => setShowTradeLines(!showTradeLines)}
                className="h-6 px-2 text-xs"
              >
                Trade Lines
              </Button>
            </div>

            {/* Volume Display */}
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
              Vol: {chartData.length > 0 ? chartData[chartData.length - 1].volume : 0}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};