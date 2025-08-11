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
  
  const centerX = x + width / 2;
  const bodyHeight = Math.abs(close - open) * height / (high - low);
  const bodyY = y + (high - Math.max(open, close)) * height / (high - low);
  
  const wickTop = y;
  const wickBottom = y + height;
  const bodyTop = bodyY;
  const bodyBottom = bodyY + bodyHeight;
  
  return (
    <g>
      {/* High-Low wick */}
      <line
        x1={centerX}
        y1={wickTop}
        x2={centerX}
        y2={wickBottom}
        stroke={isBullish ? 'hsl(var(--bullish))' : 'hsl(var(--bearish))'}
        strokeWidth={1}
      />
      {/* Open-Close body */}
      <rect
        x={x + width * 0.25}
        y={bodyTop}
        width={width * 0.5}
        height={Math.max(bodyHeight, 1)}
        fill={isBullish ? 'hsl(var(--bullish))' : 'hsl(var(--bearish))'}
        stroke={isBullish ? 'hsl(var(--bullish))' : 'hsl(var(--bearish))'}
        strokeWidth={1}
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
    
    return data.slice(-50).map((item, index) => ({
      ...item,
      time: new Date(item.time).toLocaleDateString(),
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
        <Skeleton className="h-64 w-full" />
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
        <div className="h-64">
          <ResponsiveContainer width="100%" height="70%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={['dataMin - 0.0001', 'dataMax + 0.0001']}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={formatPrice}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--popover-foreground))',
                }}
                formatter={(value: number, name: string) => formatTooltipValue(value, name)}
                labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
              />
              <Bar
                dataKey="high"
                shape={CandlestickBar}
                minPointSize={1}
              />
            </ComposedChart>
          </ResponsiveContainer>
          
          <ResponsiveContainer width="100%" height="30%">
            <ComposedChart
              data={chartData}
              margin={{ top: 0, right: 10, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={false}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--popover-foreground))',
                }}
                formatter={(value: number) => [value.toLocaleString(), 'Volume']}
              />
              <Bar
                dataKey="volume"
                shape={VolumeBar}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      )}
    </Card>
  );
};