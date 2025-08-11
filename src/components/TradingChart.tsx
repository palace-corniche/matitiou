import { useState, useEffect } from 'react';
import { ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TradingChartProps {
  timeframe: string;
  title: string;
  data: any[];
  isLoading?: boolean;
}

// Custom candlestick component for Recharts
const CandlestickBar = (props: any) => {
  const { payload, x, y, width, height } = props;
  
  if (!payload) return null;
  
  const { open, close, high, low } = payload;
  const isPositive = close >= open;
  const color = isPositive ? '#22c55e' : '#ef4444';
  
  const candleHeight = Math.abs(close - open);
  const candleY = Math.min(close, open);
  const wickX = x + width / 2;
  
  return (
    <g>
      {/* Wick */}
      <line
        x1={wickX}
        x2={wickX}
        y1={high}
        y2={low}
        stroke={color}
        strokeWidth={1}
      />
      {/* Candle body */}
      <rect
        x={x + width * 0.2}
        y={candleY}
        width={width * 0.6}
        height={Math.max(candleHeight, 1)}
        fill={color}
        stroke={color}
      />
    </g>
  );
};

export const TradingChart = ({ timeframe, title, data, isLoading = false }: TradingChartProps) => {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);

  useEffect(() => {
    if (data.length >= 2) {
      const latest = data[data.length - 1];
      const previous = data[data.length - 2];
      setCurrentPrice(latest.close);
      setPriceChange(latest.close - previous.close);
    }
  }, [data]);

  const formatPrice = (price: number) => price.toFixed(5);
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(5)}`;
  };

  const formatTooltipValue = (value: any, name: string) => {
    if (typeof value === 'number') {
      return [value.toFixed(5), name];
    }
    return [value, name];
  };

  // Transform data for recharts
  const chartData = data.map((item, index) => ({
    ...item,
    index,
    time: new Date(item.time).toLocaleDateString(),
  }));

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">EUR/USD</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {title}
            </Badge>
          </div>
          {currentPrice && (
            <div className="flex flex-col items-end">
              <span className="text-lg font-bold">
                {formatPrice(currentPrice)}
              </span>
              {priceChange !== null && (
                <span className={`text-sm ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatChange(priceChange)} ({((priceChange / currentPrice) * 100).toFixed(2)}%)
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--foreground))"
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis 
                  domain={['dataMin - 0.001', 'dataMax + 0.001']}
                  stroke="hsl(var(--foreground))"
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--foreground))' }}
                  tickFormatter={(value) => value.toFixed(5)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  formatter={formatTooltipValue}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar
                  dataKey="close"
                  shape={<CandlestickBar />}
                  fill="transparent"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};