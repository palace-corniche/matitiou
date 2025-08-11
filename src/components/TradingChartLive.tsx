import { useEffect, useRef } from 'react';
import { createChart, UTCTimestamp } from 'lightweight-charts';
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
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || isLoading) return;

    try {
      // Detect dark mode
      const isDark = document.documentElement.classList.contains('dark');
      
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 350,
        layout: {
          background: { color: isDark ? '#0f172a' : '#ffffff' },
          textColor: isDark ? '#e2e8f0' : '#1e293b',
        },
        grid: {
          vertLines: { color: isDark ? '#1e293b' : '#f1f5f9' },
          horzLines: { color: isDark ? '#1e293b' : '#f1f5f9' },
        },
        crosshair: {
          mode: 1,
        },
        rightPriceScale: {
          borderColor: isDark ? '#334155' : '#cbd5e1',
          scaleMargins: {
            top: 0.1,
            bottom: 0.3,
          },
        },
        timeScale: {
          borderColor: isDark ? '#334155' : '#cbd5e1',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      // Create candlestick series
      const candlestickSeries = (chart as any).addCandlestickSeries({
        upColor: '#16a34a',
        downColor: '#dc2626',
        borderUpColor: '#16a34a',
        borderDownColor: '#dc2626',
        wickUpColor: '#16a34a',
        wickDownColor: '#dc2626',
      });

      // Create volume series
      const volumeSeries = (chart as any).addHistogramSeries({
        color: '#64748b',
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
      candleSeriesRef.current = candlestickSeries;
      volumeSeriesRef.current = volumeSeries;

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chart) {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      // Cleanup function
      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
          candleSeriesRef.current = null;
          volumeSeriesRef.current = null;
        }
      };

    } catch (error) {
      console.error('Error creating chart:', error);
    }
  }, [isLoading]);

  // Update chart data
  useEffect(() => {
    if (!candleSeriesRef.current || !data.length) return;

    try {
      // Process candlestick data
      const candleData = data.map(item => ({
        time: (new Date(item.time).getTime() / 1000) as UTCTimestamp,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }));

      candleSeriesRef.current.setData(candleData);

      // Process volume data
      if (volumeSeriesRef.current) {
        const volumeData = data.map(item => ({
          time: (new Date(item.time).getTime() / 1000) as UTCTimestamp,
          value: item.volume || 0,
          color: item.close >= item.open ? '#16a34a80' : '#dc262680',
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
  }, [data]);

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