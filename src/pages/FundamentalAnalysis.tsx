import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ApiHealthMonitor } from '@/components/ApiHealthMonitor';
import { 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Newspaper, 
  Target,
  Clock,
  DollarSign,
  Calendar,
  Activity,
  Globe,
  AlertTriangle,
  Gauge
} from 'lucide-react';
import { realTimeFundamentalData, FundamentalAnalysisData } from '@/services/realTimeFundamentalData';
import { marketIntelligenceEngine, MarketIntelligence } from '@/services/marketIntelligenceEngine';
import { MarketRegimeIndicator } from '@/components/MarketRegimeIndicator';
import { SentimentGauge } from '@/components/SentimentGauge';
import { EconomicSurpriseTracker } from '@/components/EconomicSurpriseTracker';
import { CorrelationMatrix } from '@/components/CorrelationMatrix';
import { CentralBankTracker } from '@/components/CentralBankTracker';

type TimeframePeriod = 'lastHour' | 'today' | 'thisWeek' | 'thisMonth';

export default function FundamentalAnalysisPage() {
  const [fundamentalData, setFundamentalData] = useState<FundamentalAnalysisData | null>(null);
  const [marketIntelligence, setMarketIntelligence] = useState<MarketIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<TimeframePeriod>('today');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState('EUR/USD');

  useEffect(() => {
    fetchFundamentalData();
  }, [selectedSymbol]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchFundamentalData, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedSymbol]);

  const fetchFundamentalData = async () => {
    try {
      setLoading(true);
      const [fundamentalDataResult, intelligenceResult] = await Promise.all([
        realTimeFundamentalData.getFundamentalData(selectedSymbol),
        marketIntelligenceEngine.getMarketIntelligence(selectedSymbol)
      ]);
      setFundamentalData(fundamentalDataResult);
      setMarketIntelligence(intelligenceResult);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 25) return 'text-success';
    if (sentiment < -25) return 'text-destructive';
    return 'text-warning';
  };

  const getSentimentBadgeVariant = (sentiment: number) => {
    if (sentiment > 25) return 'default';
    if (sentiment < -25) return 'destructive';
    return 'secondary';
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  const renderPeriodData = () => {
    if (!fundamentalData) return null;
    
    const currentData = fundamentalData[selectedPeriod];
    
    return (
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sentiment</p>
                  <p className={`text-2xl font-bold ${getSentimentColor(currentData.sentiment)}`}>
                    {currentData.sentiment > 0 ? '+' : ''}{currentData.sentiment.toFixed(0)}
                  </p>
                </div>
                <Gauge className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">News Items</p>
                  <p className="text-2xl font-bold text-primary">{currentData.news.length}</p>
                </div>
                <Newspaper className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Economic Events</p>
                  <p className="text-2xl font-bold text-primary">{currentData.events.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">High Impact</p>
                  <p className="text-2xl font-bold text-destructive">
                    {currentData.events.filter(e => e.importance === 'high').length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* News and Events */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* News */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="h-5 w-5" />
                Latest News
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {currentData.news.length > 0 ? (
                    currentData.news.map((news, index) => (
                      <div key={news.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm line-clamp-2">{news.title}</h4>
                          <Badge variant={news.impact === 'high' ? 'destructive' : news.impact === 'medium' ? 'default' : 'secondary'}>
                            {news.impact}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{news.source}</span>
                          <span>{formatTimeAgo(news.publishedAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={getSentimentBadgeVariant(news.sentiment)}>
                            Sentiment: {news.sentiment > 0 ? '+' : ''}{news.sentiment.toFixed(0)}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No news for this period</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Economic Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Economic Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {currentData.events.length > 0 ? (
                    currentData.events.map((event, index) => (
                      <div key={event.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{event.name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge>{event.currency}</Badge>
                            <Badge variant={event.importance === 'high' ? 'destructive' : event.importance === 'medium' ? 'default' : 'secondary'}>
                              {event.importance}
                            </Badge>
                          </div>
                        </div>
                        {(event.actual !== null || event.forecast !== null || event.previous !== null) && (
                          <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                            <div>
                              <span className="text-muted-foreground">Actual:</span>
                              <span className="ml-1 font-mono">{event.actual ?? 'TBD'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Forecast:</span>
                              <span className="ml-1 font-mono">{event.forecast ?? 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Previous:</span>
                              <span className="ml-1 font-mono">{event.previous ?? 'N/A'}</span>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{formatTimeAgo(event.time)}</span>
                          {event.impact !== 0 && (
                            <Badge variant={event.impact > 0 ? 'default' : 'destructive'}>
                              Impact: {event.impact > 0 ? '+' : ''}{event.impact.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No events for this period</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };


  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-muted-foreground">Loading real-time fundamental analysis...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* API Health Monitor */}
      <div className="mb-6">
        <ApiHealthMonitor refreshInterval={30000} />
      </div>

      {/* Market Intelligence Dashboard */}
      {marketIntelligence && (
        <div className="mb-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <MarketRegimeIndicator regime={marketIntelligence.regime} />
            <SentimentGauge sentiment={marketIntelligence.sentiment} />
            <EconomicSurpriseTracker surprises={marketIntelligence.surprises} />
            <div className="md:col-span-2">
              <CorrelationMatrix correlations={marketIntelligence.correlations} />
            </div>
            <CentralBankTracker signals={marketIntelligence.centralBankSignals} />
          </div>
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              Live Fundamental Analysis
            </h1>
            <p className="text-muted-foreground">
              Real-time economic events, news sentiment, and market-moving fundamental data
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select 
              value={selectedSymbol} 
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="EUR/USD">EUR/USD</option>
              <option value="GBP/USD">GBP/USD</option>
              <option value="USD/JPY">USD/JPY</option>
              <option value="AUD/USD">AUD/USD</option>
              <option value="USD/CAD">USD/CAD</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
              {autoRefresh ? 'Live' : 'Paused'}
            </Button>
          </div>
        </div>
      </div>

      {fundamentalData && (
        <div className="mb-6">
          <Alert>
            <Globe className="h-4 w-4" />
            <AlertDescription>
              <strong>Market Overview:</strong> Monitoring {selectedSymbol} fundamental factors across {
                fundamentalData.today.news.length + fundamentalData.today.events.length
              } data points. Overall sentiment: <span className={getSentimentColor(fundamentalData.today.sentiment)}>
                {fundamentalData.today.sentiment > 0 ? 'Bullish' : fundamentalData.today.sentiment < 0 ? 'Bearish' : 'Neutral'}
              </span>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as TimeframePeriod)} className="mb-6">
        <TabsList>
          <TabsTrigger value="lastHour">Last Hour</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="thisWeek">This Week</TabsTrigger>
          <TabsTrigger value="thisMonth">This Month</TabsTrigger>
        </TabsList>
        
        <TabsContent value="lastHour">
          {renderPeriodData()}
        </TabsContent>
        <TabsContent value="today">
          {renderPeriodData()}
        </TabsContent>
        <TabsContent value="thisWeek">
          {renderPeriodData()}
        </TabsContent>
        <TabsContent value="thisMonth">
          {renderPeriodData()}
        </TabsContent>
      </Tabs>
    </div>
  );
}