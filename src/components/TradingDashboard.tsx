import { useState, useEffect } from 'react';
import { TradingChart } from './TradingChart';
import { getForexData, CandleData } from '@/services/marketData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'sonner';

const timeframes = [
  { key: '15m', label: '15 Minutes', title: '15M' },
  { key: '1h', label: '1 Hour', title: '1H' },
  { key: '4h', label: '4 Hours', title: '4H' },
  { key: '1d', label: '1 Day', title: '1D' },
];

export const TradingDashboard = () => {
  const [chartData, setChartData] = useState<Record<string, CandleData[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadData = async (timeframe?: string) => {
    const timeframesToLoad = timeframe ? [timeframe] : timeframes.map(tf => tf.key);
    
    setLoading(prev => {
      const newLoading = { ...prev };
      timeframesToLoad.forEach(tf => {
        newLoading[tf] = true;
      });
      return newLoading;
    });

    try {
      const dataPromises = timeframesToLoad.map(async (tf) => {
        const data = await getForexData(tf);
        return { timeframe: tf, data };
      });

      const results = await Promise.all(dataPromises);
      
      setChartData(prev => {
        const newData = { ...prev };
        results.forEach(({ timeframe, data }) => {
          newData[timeframe] = data;
        });
        return newData;
      });

      setLastUpdate(new Date());
      
      if (!timeframe) {
        toast.success('All charts updated successfully');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load market data');
    } finally {
      setLoading(prev => {
        const newLoading = { ...prev };
        timeframesToLoad.forEach(tf => {
          newLoading[tf] = false;
        });
        return newLoading;
      });
    }
  };

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getOverallTrend = () => {
    const dailyData = chartData['1d'];
    if (!dailyData || dailyData.length < 2) return 'neutral';
    
    const current = dailyData[dailyData.length - 1];
    const previous = dailyData[dailyData.length - 2];
    
    if (current.close > previous.close) return 'bullish';
    if (current.close < previous.close) return 'bearish';
    return 'neutral';
  };

  const trend = getOverallTrend();
  const TrendIcon = trend === 'bullish' ? TrendingUp : trend === 'bearish' ? TrendingDown : Minus;
  const trendColor = trend === 'bullish' ? 'text-green-500' : trend === 'bearish' ? 'text-red-500' : 'text-muted-foreground';

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">EUR/USD Trading Dashboard</h1>
            <div className="flex items-center gap-2">
              <TrendIcon className={`h-5 w-5 ${trendColor}`} />
              <Badge variant={trend === 'bullish' ? 'default' : trend === 'bearish' ? 'destructive' : 'secondary'}>
                {trend.toUpperCase()}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
            <Button
              onClick={() => loadData()}
              disabled={Object.values(loading).some(Boolean)}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${Object.values(loading).some(Boolean) ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>
          </div>
        </div>

        {/* Market Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Market Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {timeframes.map((tf) => {
                const data = chartData[tf.key];
                const isLoading = loading[tf.key];
                
                if (!data || data.length === 0) {
                  return (
                    <div key={tf.key} className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">{tf.title}</div>
                      <div className="text-lg font-bold">
                        {isLoading ? '...' : 'No Data'}
                      </div>
                    </div>
                  );
                }

                const current = data[data.length - 1];
                const previous = data[data.length - 2];
                const change = previous ? current.close - previous.close : 0;
                const changePercent = previous ? (change / previous.close) * 100 : 0;

                return (
                  <div key={tf.key} className="text-center">
                    <div className="text-sm font-medium text-muted-foreground">{tf.title}</div>
                    <div className="text-lg font-bold">{current.close.toFixed(5)}</div>
                    <div className={`text-sm ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {change >= 0 ? '+' : ''}{change.toFixed(5)} ({changePercent.toFixed(2)}%)
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {timeframes.map((timeframe) => (
          <TradingChart
            key={timeframe.key}
            timeframe={timeframe.key}
            title={timeframe.title}
            data={chartData[timeframe.key] || []}
            isLoading={loading[timeframe.key]}
          />
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>* Demo data is being used. In production, this would connect to real market data providers.</p>
        <p>Charts auto-refresh every 30 seconds</p>
      </div>
    </div>
  );
};