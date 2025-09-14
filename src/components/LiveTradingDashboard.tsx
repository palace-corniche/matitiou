import { useState, useEffect } from 'react';
import { TradingChart } from './TradingChart';
import TechnicalAnalysisPanel from './TechnicalAnalysisPanel';
import SignalDashboard from './SignalDashboard';
import { getForexData, getLiveTickData, getMarketStatus, CandleData, TickData } from '@/services/realMarketData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Activity, Clock, TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChartData {
  [key: string]: CandleData[];
}

interface LoadingStates {
  [key: string]: boolean;
}

const timeframes = [
  { key: '15m', label: '15M', title: '15 Minutes', timeframe: '15m' },
  { key: '1h', label: '1H', title: '1 Hour', timeframe: '1h' },
  { key: '4h', label: '4H', title: '4 Hours', timeframe: '4h' },
  { key: '1d', label: '1D', title: '1 Day', timeframe: '1d' },
];

export const LiveTradingDashboard = () => {
  const [chartData, setChartData] = useState<ChartData>({});
  const [loading, setLoading] = useState<LoadingStates>({});
  const [liveData, setLiveData] = useState<TickData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [marketStatus, setMarketStatus] = useState(getMarketStatus());
  const { toast } = useToast();

  const loadData = async (timeframe?: string) => {
    const framesToLoad = timeframe ? [timeframe] : timeframes.map(tf => tf.key);
    
    // Set loading states
    const newLoading = { ...loading };
    framesToLoad.forEach(tf => {
      newLoading[tf] = true;
    });
    setLoading(newLoading);

    try {
      const promises = framesToLoad.map(async (tf) => {
        const data = await getForexData(tf);
        return { timeframe: tf, data };
      });

      const results = await Promise.all(promises);
      
      const newChartData = { ...chartData };
      results.forEach(({ timeframe: tf, data }) => {
        newChartData[tf] = data;
        newLoading[tf] = false;
      });
      
      setChartData(newChartData);
      setLoading(newLoading);
      setLastUpdate(new Date());
      
      // Load live tick data
      const tickData = await getLiveTickData();
      setLiveData(tickData);
      
      // Update market status
      setMarketStatus(getMarketStatus());
      
      if (!timeframe) {
        toast({
          title: "Data Updated",
          description: "All charts have been refreshed with latest data",
        });
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      
      // Clear loading states
      framesToLoad.forEach(tf => {
        newLoading[tf] = false;
      });
      setLoading(newLoading);
      
      toast({
        title: "Update Failed",
        description: "Failed to fetch latest market data. Using cached data.",
        variant: "destructive",
      });
    }
  };

  // Initial data load
  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh every 5 minutes for better responsiveness
  useEffect(() => {
    const interval = setInterval(() => {
      if (marketStatus.isOpen) {
        console.log('🔄 Auto-refresh triggered (5min interval) - market is open');
        loadData();
      }
    }, 300000);

    return () => clearInterval(interval);
  }, [marketStatus.isOpen]);

  const getCurrentPrice = (timeframe: string): number | undefined => {
    const data = chartData[timeframe];
    if (!data || data.length === 0) return undefined;
    return data[data.length - 1].close;
  };

  const getPriceChange = (timeframe: string): number | undefined => {
    const data = chartData[timeframe];
    if (!data || data.length < 2) return undefined;
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];
    return latest.close - previous.close;
  };

  const getOverallTrend = () => {
    if (liveData) {
      return liveData.change >= 0 ? 'bullish' : 'bearish';
    }
    
    const dailyData = chartData['1d'];
    if (!dailyData || dailyData.length < 2) return 'neutral';
    
    const latest = dailyData[dailyData.length - 1];
    const previous = dailyData[dailyData.length - 2];
    
    if (latest.close > previous.close) return 'bullish';
    if (latest.close < previous.close) return 'bearish';
    return 'neutral';
  };

  const trend = getOverallTrend();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-foreground">EUR/USD Live Trading</h1>
            <div className="flex items-center gap-2">
              {trend === 'bullish' && <TrendingUp className="h-5 w-5 text-bullish" />}
              {trend === 'bearish' && <TrendingDown className="h-5 w-5 text-bearish" />}
              {trend === 'neutral' && <Activity className="h-5 w-5 text-muted-foreground" />}
              <Badge variant={trend === 'bullish' ? 'default' : trend === 'bearish' ? 'destructive' : 'secondary'}>
                {trend.toUpperCase()}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {lastUpdate ? (
                <span>Updated {lastUpdate.toLocaleTimeString()}</span>
              ) : (
                <span>Loading...</span>
              )}
            </div>
            <Button
              onClick={() => loadData()}
              disabled={Object.values(loading).some(Boolean)}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${Object.values(loading).some(Boolean) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Market Status & Live Price */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Market Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${marketStatus.isOpen ? 'bg-bullish' : 'bg-bearish'}`}></div>
                <span className="text-lg font-semibold">
                  {marketStatus.isOpen ? marketStatus.session : 'Closed'}
                </span>
              </div>
              {!marketStatus.isOpen && marketStatus.nextOpen && (
                <p className="text-xs text-muted-foreground mt-1">{marketStatus.nextOpen}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Live Price</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold">
                  {liveData ? liveData.price.toFixed(5) : getCurrentPrice('1h')?.toFixed(5) || '--'}
                </div>
                {liveData && (
                  <div className={`text-sm font-medium ${liveData.change >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {liveData.change >= 0 ? '+' : ''}{liveData.change.toFixed(5)} ({liveData.changePercent.toFixed(2)}%)
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick stats for each timeframe */}
          {timeframes.slice(0, 2).map((tf) => {
            const currentPrice = getCurrentPrice(tf.key);
            const priceChange = getPriceChange(tf.key);
            
            return (
              <Card key={tf.key}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">{tf.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="text-lg font-semibold">
                      {currentPrice?.toFixed(5) || '--'}
                    </div>
                    {priceChange !== undefined && (
                      <div className={`text-sm font-medium ${priceChange >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                        {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(5)} ({((priceChange / currentPrice!) * 100).toFixed(2)}%)
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="charts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Charts
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Technical Analysis
            </TabsTrigger>
            <TabsTrigger value="signals" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Trading Signals
            </TabsTrigger>
          </TabsList>

          {/* Charts Tab */}
          <TabsContent value="charts" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {timeframes.map((tf) => (
                <TradingChart
                  key={tf.key}
                  data={chartData[tf.key] || []}
                  timeframe={tf.key}
                  title={tf.title}
                />
              ))}
            </div>
          </TabsContent>

          {/* Technical Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {timeframes.map((tf) => {
                const data = chartData[tf.key] || [];
                
                if (data.length === 0) {
                  return (
                    <Card key={tf.key}>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Loading {tf.title} analysis...</p>
                      </CardContent>
                    </Card>
                  );
                }
                
                return (
                  <TechnicalAnalysisPanel
                    key={tf.key}
                    data={data}
                    timeframe={tf.label}
                  />
                );
              })}
            </div>
          </TabsContent>

          {/* Trading Signals Tab */}
          <TabsContent value="signals" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {timeframes.map((tf) => {
                const data = chartData[tf.key] || [];
                
                if (data.length === 0) {
                  return (
                    <Card key={tf.key}>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Loading {tf.title} signals...</p>
                      </CardContent>
                    </Card>
                  );
                }
                
                return (
                  <SignalDashboard
                    key={tf.key}
                    data={data}
                    timeframe={tf.label}
                  />
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>Real-time EUR/USD market data with comprehensive technical analysis</p>
          <p>Updates every 5 minutes when market is open • Using Twelve Data API</p>
        </div>
      </div>
    </div>
  );
};