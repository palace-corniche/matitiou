import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Clock, 
  Globe, 
  DollarSign,
  Calendar,
  Activity,
  Zap,
  Shield
} from 'lucide-react';
import { newsAnalysisEngine, NewsAnalysisResult, NewsItem, EconomicEvent } from '@/services/newsAnalysis';

interface NewsAnalysisDashboardProps {
  pair: string;
  onNewsImpact?: (impact: number) => void;
}

export const NewsAnalysisDashboard: React.FC<NewsAnalysisDashboardProps> = ({
  pair,
  onNewsImpact
}) => {
  const [analysis, setAnalysis] = useState<NewsAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastFetchStatus, setLastFetchStatus] = useState<'success' | 'timeout' | 'error'>('success');

  useEffect(() => {
    const fetchNewsAnalysis = async () => {
      try {
        setLoading(true);
        const result = await newsAnalysisEngine.analyzeNewsImpact(pair, 12);
        setAnalysis(result);
        setLastFetchStatus('success');
        onNewsImpact?.(result.overallSentiment);
      } catch (error) {
        console.error('Failed to fetch news analysis:', error);
        setLastFetchStatus('error');
      } finally {
        setLoading(false);
      }
    };

    fetchNewsAnalysis();

    if (autoRefresh) {
      const interval = setInterval(fetchNewsAnalysis, 5 * 60 * 1000); // Refresh every 5 minutes
      return () => clearInterval(interval);
    }
  }, [pair, autoRefresh, onNewsImpact]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            News & Fundamental Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Analyzing global news impact...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>News Analysis Unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to fetch news analysis at this time.</p>
        </CardContent>
      </Card>
    );
  }

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 25) return 'text-green-500';
    if (sentiment < -25) return 'text-red-500';
    return 'text-yellow-500';
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'extreme': return 'text-red-500 bg-red-50 border-red-200';
      case 'high': return 'text-orange-500 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-500 bg-yellow-50 border-yellow-200';
      default: return 'text-green-500 bg-green-50 border-green-200';
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

  return (
    <div className="w-full space-y-4">
      {/* Main Analytics Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Live Fundamental Analysis - {pair}
            </CardTitle>
            <div className="flex items-center gap-2">
              {lastFetchStatus === 'timeout' && (
                <span className="text-xs text-yellow-600 dark:text-yellow-400">
                  ⏱️ Last fetch timed out
                </span>
              )}
            <div className="flex items-center gap-2">
              {lastFetchStatus === 'timeout' && (
                <Badge variant="outline" className="text-yellow-600">
                  <Clock className="h-3 w-3 mr-1" />
                  Last fetch timed out
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <Activity className={`h-4 w-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
                {autoRefresh ? 'Live' : 'Paused'}
              </Button>
            </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getSentimentColor(analysis.overallSentiment)}`}>
                {analysis.overallSentiment > 0 ? '+' : ''}{analysis.overallSentiment.toFixed(0)}
              </div>
              <p className="text-sm text-muted-foreground">News Sentiment</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {analysis.sentimentStrength.toFixed(1)}/10
              </div>
              <p className="text-sm text-muted-foreground">Signal Strength</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {analysis.newsCount}
              </div>
              <p className="text-sm text-muted-foreground">News Items</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">
                {analysis.volatilityExpectation.toFixed(0)}%
              </div>
              <p className="text-sm text-muted-foreground">Volatility Risk</p>
            </div>
          </div>

          {/* Risk Assessment Alert */}
          <Alert className={getRiskColor(analysis.riskLevel)}>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Risk Level: {analysis.riskLevel.toUpperCase()}</strong>
              <br />
              {analysis.tradingRecommendation}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Currency Bias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Currency Strength Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(analysis.currencyBias).map(([currency, bias]) => (
              <div key={currency} className="flex items-center justify-between">
                <span className="font-medium">{currency}</span>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center ${bias > 0 ? 'text-green-500' : bias < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {bias > 0 ? <TrendingUp className="h-4 w-4" /> : bias < 0 ? <TrendingDown className="h-4 w-4" /> : null}
                    <span className="font-mono text-sm">
                      {bias > 0 ? '+' : ''}{bias.toFixed(1)}
                    </span>
                  </div>
                  <Badge variant={bias > 15 ? 'default' : bias < -15 ? 'destructive' : 'secondary'}>
                    {Math.abs(bias) > 15 ? 'Strong' : Math.abs(bias) > 5 ? 'Moderate' : 'Neutral'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="news" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="news">Breaking News</TabsTrigger>
              <TabsTrigger value="events">Economic Events</TabsTrigger>
              <TabsTrigger value="calendar">Upcoming</TabsTrigger>
            </TabsList>
            
            <TabsContent value="news" className="p-6">
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {analysis.topNews.length > 0 ? (
                    analysis.topNews.map((news, index) => (
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
                          <div className={`text-xs px-2 py-1 rounded ${getSentimentColor(news.sentiment)} bg-muted`}>
                            Sentiment: {news.sentiment > 0 ? '+' : ''}{news.sentiment.toFixed(0)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Relevance: {news.relevanceScore.toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No recent news available</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="events" className="p-6">
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {analysis.majorEvents.length > 0 ? (
                    analysis.majorEvents.map((event) => (
                      <div key={event.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{event.name}</h4>
                          <Badge>{event.currency}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Actual:</span>
                            <span className="ml-1 font-mono">{event.actual || 'TBD'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Forecast:</span>
                            <span className="ml-1 font-mono">{event.forecast || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Previous:</span>
                            <span className="ml-1 font-mono">{event.previous || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">{formatTimeAgo(event.time)}</span>
                          <div className={`text-xs px-2 py-1 rounded ${event.impact > 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                            Impact: {event.impact > 0 ? '+' : ''}{event.impact?.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No major events in timeframe</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="calendar" className="p-6">
              <div className="text-center">
                {analysis.nextMajorEvent ? (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <h4 className="font-medium">{analysis.nextMajorEvent.name}</h4>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {analysis.nextMajorEvent.country} • {analysis.nextMajorEvent.currency}
                    </div>
                    <div className="flex items-center justify-center gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Forecast:</span>
                        <span className="ml-1 font-mono">{analysis.nextMajorEvent.forecast}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Previous:</span>
                        <span className="ml-1 font-mono">{analysis.nextMajorEvent.previous}</span>
                      </div>
                    </div>
                    <Badge className="mt-2" variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(analysis.nextMajorEvent.time).toLocaleString()}
                    </Badge>
                  </div>
                ) : (
                  <div className="py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No major events scheduled</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};