import { useEffect, useRef } from 'react';
import { 
  createChart, 
  UTCTimestamp, 
  IChartApi, 
  ISeriesApi 
} from 'lightweight-charts';
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

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || isLoading) return;

    // Wait for container to be ready
    const container = chartContainerRef.current;
    if (!container.offsetWidth || !container.offsetHeight) {
      console.warn('Chart container not ready, dimensions:', { 
        width: container.offsetWidth, 
        height: container.offsetHeight 
      });
      return;
    }

    try {
      console.log('Creating chart with container dimensions:', {
        width: container.clientWidth,
        height: container.clientHeight
      });

      // Detect dark mode
      const isDark = document.documentElement.classList.contains('dark');
      
      const chart = createChart(container, {
        width: container.clientWidth,
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

      console.log('Chart created successfully');

      // Create candlestick series using the correct method
      const candlestickSeries = (chart as any).addCandlestickSeries({
        upColor: '#16a34a',
        downColor: '#dc2626',
        borderUpColor: '#16a34a',
        borderDownColor: '#dc2626',
        wickUpColor: '#16a34a',
        wickDownColor: '#dc2626',
      });
      console.log('Candlestick series created');

      // Create volume series as histogram using the correct method
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
      console.log('Volume series created');

      // Store references
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
        console.log('Cleaning up chart');
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
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
    }
  }, [isLoading]);

  // Update chart data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !data.length) {
      console.log('Chart data update skipped:', {
        candleSeriesExists: !!candleSeriesRef.current,
        volumeSeriesExists: !!volumeSeriesRef.current,
        dataLength: data.length
      });
      return;
    }

    try {
      console.log('Updating chart data with', data.length, 'candles');

      // Validate and process candlestick data
      const validData = data.filter(item => 
        item && 
        item.time && 
        typeof item.open === 'number' &&
        typeof item.high === 'number' &&
        typeof item.low === 'number' &&
        typeof item.close === 'number'
      );

      if (validData.length === 0) {
        console.warn('No valid candle data found');
        return;
      }

      const candleData = validData.map(item => ({
        time: (new Date(item.time).getTime() / 1000) as UTCTimestamp,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }));

      // Sort data by time to ensure proper ordering
      candleData.sort((a, b) => a.time - b.time);

      console.log('Setting candle data:', candleData.length, 'items');
      candleSeriesRef.current.setData(candleData);

      // Process volume data
      const volumeData = validData.map(item => ({
        time: (new Date(item.time).getTime() / 1000) as UTCTimestamp,
        value: item.volume || 0,
        color: item.close >= item.open ? '#16a34a80' : '#dc262680',
      }));

      // Sort volume data by time
      volumeData.sort((a, b) => a.time - b.time);

      console.log('Setting volume data:', volumeData.length, 'items');
      volumeSeriesRef.current.setData(volumeData);

      // Fit content to chart after a short delay to ensure data is processed
      setTimeout(() => {
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
          console.log('Chart content fitted');
        }
      }, 100);

    } catch (error) {
      console.error('Error updating chart data:', error);
      console.error('Data sample:', data.slice(0, 2));
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