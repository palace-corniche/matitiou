import React, { useMemo, useState } from 'react';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CandleData } from '@/services/realMarketData';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SimpleChartProps {
  timeframe: string;
  title: string;
  data: CandleData[];
  isLoading?: boolean;
  currentPrice?: number;
  priceChange?: number;
}

const CandlestickBar = (props: any) => {
  const { payload, x, y, width, height } = props;
  
  if (!payload) return null;
  
  const { open, high, low, close } = payload;
  const isBullish = close >= open;
  
  // Calculate positions with proper scaling
  const priceRange = high - low;
  const scale = height / priceRange;
  
  const centerX = x + width / 2;
  const bodyWidth = width * 0.7; // Optimal body width for full-width charts
  const bodyX = x + (width - bodyWidth) / 2;
  
  // Calculate body dimensions with minimum size for small bodies
  const bodyHeight = Math.max(Math.abs(close - open) * scale, 2);
  const bodyTop = y + (high - Math.max(open, close)) * scale;
  const bodyBottom = bodyTop + bodyHeight;
  
  // Calculate wick positions - fix coordinate mapping
  const upperWickTop = y; // Top of chart area (high price)
  const upperWickBottom = bodyTop;
  const lowerWickTop = bodyBottom;
  const lowerWickBottom = y + height; // Bottom of chart area (low price)
  
  // Handle doji case (open = close)
  const isDoji = Math.abs(close - open) < 0.00001;
  
  return (
    <g>
      {/* Upper wick - from high to body top */}
      {high > Math.max(open, close) && (
        <line
          x1={centerX}
          y1={upperWickTop}
          x2={centerX}
          y2={upperWickBottom}
          stroke={isBullish ? 'hsl(var(--bullish))' : 'hsl(var(--bearish))'}
          strokeWidth={2}
        />
      )}
      
      {/* Lower wick - from body bottom to low */}
      {low < Math.min(open, close) && (
        <line
          x1={centerX}
          y1={lowerWickTop}
          x2={centerX}
          y2={lowerWickBottom}
          stroke={isBullish ? 'hsl(var(--bullish))' : 'hsl(var(--bearish))'}
          strokeWidth={2}
        />
      )}
      
      {/* Body - TradingView style: hollow green for bullish, filled red for bearish */}
      <rect
        x={bodyX}
        y={bodyTop}
        width={bodyWidth}
        height={isDoji ? 1 : bodyHeight}
        fill={isBullish ? 'transparent' : 'hsl(var(--bearish))'}
        stroke={isBullish ? 'hsl(var(--bullish))' : 'hsl(var(--bearish))'}
        strokeWidth={isBullish ? 2 : 1.5}
      />
    </g>
  );
};

const VolumeBar = (props: any) => {
  const { payload, x, y, width, height } = props;
  
  if (!payload) return null;
  
  const { open, close } = payload;
  const isBullish = close >= open;
  
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={isBullish ? 'hsl(var(--volume-up))' : 'hsl(var(--volume-down))'}
      opacity={0.6}
    />
  );
};

export const SimpleChart = ({ timeframe, title, data, isLoading = false, currentPrice, priceChange }: SimpleChartProps) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Show 50 candles for proper technical analysis visibility
    return data.slice(-50).map((item, index) => ({
      ...item,
      time: new Date(item.time).toLocaleTimeString([], { 
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      index
    }));
  }, [data]);

  const trend = useMemo(() => {
    if (!data || data.length < 2) return 'neutral';
    
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];
    
    if (latest.close > previous.close) return 'bullish';
    if (latest.close < previous.close) return 'bearish';
    return 'neutral';
  }, [data]);

  const formatPrice = (value: number) => value.toFixed(5);
  
  const formatChange = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(5)}`;
  };

  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'volume') return [value.toLocaleString(), 'Volume'];
    return [formatPrice(value), name.toUpperCase()];
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'bullish':
        return <TrendingUp className="w-4 h-4 text-bullish" />;
      case 'bearish':
        return <TrendingDown className="w-4 h-4 text-bearish" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'bullish':
        return 'text-bullish';
      case 'bearish':
        return 'text-bearish';
      default:
        return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-chart-bg border-chart-grid">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-5 w-8" />
          </div>
          <Skeleton className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-96 w-full" />
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-chart-bg border-chart-grid">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <Badge variant="outline" className="text-xs">
            {timeframe}
          </Badge>
        </div>
        {getTrendIcon()}
      </div>
      
      <div className="flex items-center gap-4 mb-6">
        <div className="text-2xl font-bold text-foreground">
          {currentPrice ? formatPrice(currentPrice) : '--'}
        </div>
        {priceChange !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}>
            <span>{formatChange(priceChange)}</span>
            <span>({((Math.abs(priceChange) / (currentPrice || 1)) * 100).toFixed(2)}%)</span>
          </div>
        )}
      </div>

      {chartData.length > 0 ? (
        <div className="h-[800px]">
          <ResponsiveContainer width="100%" height="85%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 80, left: 80, bottom: 15 }}
            >
              <CartesianGrid 
                strokeDasharray="1 1" 
                stroke="hsl(var(--chart-grid))" 
                horizontal={true}
                vertical={true}
              />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                interval={Math.floor(chartData.length / 10)}
                angle={-45}
                textAnchor="end"
                height={60}
                tickMargin={10}
              />
              <YAxis
                domain={['dataMin - 0.0002', 'dataMax + 0.0002']}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={formatPrice}
                width={85}
                tickMargin={10}
                tickCount={8}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  color: 'hsl(var(--popover-foreground))',
                  fontSize: '13px',
                  padding: '16px',
                  minWidth: '200px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload[0]) {
                    const data = payload[0].payload;
                    if (!data) return null;
                    
                    return (
                      <div className="space-y-2">
                        <p className="font-semibold text-popover-foreground mb-2">{label}</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-muted-foreground">Open:</span> <span className="font-mono">{data.open ? formatPrice(data.open) : 'N/A'}</span></div>
                          <div><span className="text-muted-foreground">High:</span> <span className="font-mono text-bullish">{data.high ? formatPrice(data.high) : 'N/A'}</span></div>
                          <div><span className="text-muted-foreground">Low:</span> <span className="font-mono text-bearish">{data.low ? formatPrice(data.low) : 'N/A'}</span></div>
                          <div><span className="text-muted-foreground">Close:</span> <span className="font-mono">{data.close ? formatPrice(data.close) : 'N/A'}</span></div>
                        </div>
                        {data.volume && (
                          <div className="pt-1 border-t border-border">
                            <span className="text-muted-foreground">Volume:</span> <span className="font-mono">{data.volume.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="high"
                shape={CandlestickBar}
                minPointSize={2}
                maxBarSize={25}
              />
            </ComposedChart>
          </ResponsiveContainer>
          
          <ResponsiveContainer width="100%" height="15%">
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 80, left: 80, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="1 1" stroke="hsl(var(--chart-grid))" />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                interval={Math.floor(chartData.length / 10)}
                angle={-45}
                textAnchor="end"
                height={50}
                tickMargin={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                width={85}
                tickMargin={10}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  color: 'hsl(var(--popover-foreground))',
                  fontSize: '13px',
                  padding: '12px',
                }}
                formatter={(value: number) => [value.toLocaleString(), 'Volume']}
              />
              <Bar
                dataKey="volume"
                shape={VolumeBar}
                maxBarSize={25}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[800px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      )}
    </Card>
  );
};