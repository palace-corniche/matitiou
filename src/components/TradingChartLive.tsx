import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, UTCTimestamp } from 'lightweight-charts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CandleData } from '@/services/realMarketData';

interface TradingChartLiveProps {
  data: CandleData[];
  timeframe: string;
  title: string;
  isLoading: boolean;
  currentPrice?: number;
  priceChange?: number;
}

export const TradingChartLive = ({ 
  data, 
  timeframe, 
  title, 
  isLoading,
  currentPrice,
  priceChange 
}: TradingChartLiveProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const [isChartReady, setIsChartReady] = useState(false);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || isLoading) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 350,
      layout: {
        background: { color: 'hsl(var(--chart-bg))' },
        textColor: 'hsl(var(--foreground))',
      },
      grid: {
        vertLines: { color: 'hsl(var(--chart-grid))' },
        horzLines: { color: 'hsl(var(--chart-grid))' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: 'hsl(var(--muted-foreground))',
          style: 2,
        },
        horzLine: {
          width: 1,
          color: 'hsl(var(--muted-foreground))',
          style: 2,
        },
      },
      rightPriceScale: {
        borderColor: 'hsl(var(--border))',
        scaleMargins: {
          top: 0.1,
          bottom: 0.3,
        },
      },
      timeScale: {
        borderColor: 'hsl(var(--border))',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    try {
      // Try candlestick series first, fallback to line series if not available
      const candleSeries = (chart as any).addCandlestickSeries?.({
        upColor: '#22c55e',
        downColor: '#ef4444', 
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      }) || (chart as any).addLineSeries({
        color: '#2563eb',
        lineWidth: 2,
      });

      // Create volume series if available
      const volumeSeries = (chart as any).addHistogramSeries?.({
        color: 'hsl(var(--muted))',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      chartRef.current = chart;
      candleSeriesRef.current = candleSeries;
      volumeSeriesRef.current = volumeSeries;
      setIsChartReady(true);
    } catch (error) {
      console.error('Error creating chart series:', error);
      // Fallback to basic line series
      const lineSeries = (chart as any).addLineSeries({
        color: '#2563eb',
        lineWidth: 2,
      });
      
      candleSeriesRef.current = lineSeries;
      setIsChartReady(true);
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
        volumeSeriesRef.current = null;
        setIsChartReady(false);
      }
    };
  }, [isLoading]);

  // Update chart data
  useEffect(() => {
    if (!isChartReady || !candleSeriesRef.current || !data.length) return;

    try {
      // Check if we have candlestick series or line series
      const isCandlestickSeries = (candleSeriesRef.current as any).setData;
      
      if (isCandlestickSeries) {
        // For candlestick series, use OHLC data
        const candleData = data.map(item => ({
          time: (new Date(item.time).getTime() / 1000) as UTCTimestamp,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        }));
        
        candleSeriesRef.current.setData(candleData);
      } else {
        // For line series, use close price only
        const lineData = data.map(item => ({
          time: (new Date(item.time).getTime() / 1000) as UTCTimestamp,
          value: item.close,
        }));
        
        candleSeriesRef.current.setData(lineData);
      }

      // Update volume series if available
      if (volumeSeriesRef.current) {
        const volumeData = data.map(item => ({
          time: (new Date(item.time).getTime() / 1000) as UTCTimestamp,
          value: item.volume || 0,
          color: item.close >= item.open ? '#22c55e' : '#ef4444',
        }));
        
        volumeSeriesRef.current.setData(volumeData);
      }

      // Fit content to chart
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    } catch (error) {
      console.error('Error updating chart data:', error);
    }
  }, [data, isChartReady]);

  const formatPrice = (price: number) => price.toFixed(5);
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(5)}`;
  };

  const getBadgeVariant = () => {
    if (!priceChange) return 'secondary';
    return priceChange >= 0 ? 'default' : 'destructive';
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-card-foreground">EUR/USD</h3>
            <Badge variant="outline" className="text-xs">
              {title}
            </Badge>
            <Badge variant={getBadgeVariant()} className="text-xs">
              {timeframe}
            </Badge>
          </div>
          {currentPrice && (
            <div className="flex flex-col items-end">
              <span className="text-lg font-bold text-card-foreground">
                {formatPrice(currentPrice)}
              </span>
              {priceChange !== undefined && (
                <span 
                  className={`text-sm font-medium ${
                    priceChange >= 0 ? 'text-bullish' : 'text-bearish'
                  }`}
                >
                  {formatChange(priceChange)} ({((priceChange / currentPrice) * 100).toFixed(2)}%)
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="h-[350px] flex items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-sm text-muted-foreground">Loading {timeframe} data...</span>
            </div>
          </div>
        ) : (
          <div 
            ref={chartContainerRef} 
            className="h-[350px] w-full bg-chart-bg rounded-md border"
          />
        )}
      </CardContent>
    </Card>
  );
};