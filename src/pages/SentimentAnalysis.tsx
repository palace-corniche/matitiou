import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Brain, 
  Target,
  Clock,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

interface SentimentSignal {
  id: string;
  symbol: string;
  timeframe: string;
  signal_type: 'buy' | 'sell';
  confidence: number;
  strength: number;
  trigger_price: number;
  suggested_entry: number;
  suggested_stop_loss: number;
  suggested_take_profit: number;
  trend_context: string;
  volatility_regime: string;
  created_at: string;
  intermediate_values: any;
  calculation_parameters: any;
}

export default function SentimentAnalysisPage() {
  const [signals, setSignals] = useState<SentimentSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState('signals');

  useEffect(() => {
    fetchSentimentSignals();
  }, []);

  const fetchSentimentSignals = async () => {
    try {
      setLoading(true);
      
      // Fetch modular signals for sentiment analysis
      const { data: modularData, error: modularError } = await supabase
        .from('modular_signals')
        .select('*')
        .eq('module_id', 'sentiment_analysis')
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch COT data for sentiment context
      const { data: cotData, error: cotError } = await supabase
        .from('cot_reports')
        .select('*')
        .eq('pair', 'EUR/USD')
        .order('report_date', { ascending: false })
        .limit(3);

      // Fetch retail positioning data
      const { data: retailData, error: retailError } = await supabase
        .from('retail_positions')
        .select('*')
        .eq('symbol', 'EUR/USD')
        .order('as_of', { ascending: false })
        .limit(5);

      // Fetch news events for sentiment
      const { data: newsData, error: newsError } = await supabase
        .from('news_events')
        .select('*')
        .eq('symbol', 'EUR/USD')
        .order('published_at', { ascending: false })
        .limit(5);

      if (modularError) throw modularError;
      
      // Transform and combine data
      const sentimentSignals = (modularData || []).map(signal => {
        const baseValues = signal.intermediate_values && typeof signal.intermediate_values === 'object' 
          ? signal.intermediate_values as Record<string, any>
          : {};
        
        return {
          ...signal,
          intermediate_values: {
            ...baseValues,
            cot_data: cotData || [],
            retail_positioning: retailData || [],
            recent_news: newsData || []
          }
        };
      });

      setSignals(sentimentSignals as SentimentSignal[]);
    } catch (error) {
      console.error('Error fetching sentiment signals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSignalIcon = (signalType: string) => {
    return signalType === 'buy' ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getSentimentIcon = (sentiment: string) => {
    if (sentiment.includes('bullish') || sentiment.includes('positive')) {
      return <ThumbsUp className="h-4 w-4 text-green-500" />;
    } else if (sentiment.includes('bearish') || sentiment.includes('negative')) {
      return <ThumbsDown className="h-4 w-4 text-red-500" />;
    }
    return <Brain className="h-4 w-4 text-gray-500" />;
  };

  const renderCOTData = (cotReport: any) => {
    if (!cotReport) return null;

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-3">COT Report (Commitment of Traders)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Commercial Long</div>
            <div className="text-lg font-bold">{cotReport.commercialLong?.toFixed(1) || 'N/A'}%</div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Commercial Short</div>
            <div className="text-lg font-bold">{cotReport.commercialShort?.toFixed(1) || 'N/A'}%</div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Non-Commercial Long</div>
            <div className="text-lg font-bold">{cotReport.nonCommercialLong?.toFixed(1) || 'N/A'}%</div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Retail Sentiment</div>
            <div className="text-lg font-bold">{cotReport.retailSentiment?.toFixed(1) || 'N/A'}%</div>
            <Progress value={cotReport.retailSentiment || 0} className="mt-2" />
          </div>
        </div>
      </div>
    );
  };

  const renderNewsSentiment = (newsSentiment: any) => {
    if (!newsSentiment) return null;

    const sentimentScore = (newsSentiment.score + 1) * 50; // Convert -1 to 1 scale to 0-100

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-3">News Sentiment Analysis</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Sentiment</span>
              {getSentimentIcon(newsSentiment.score > 0.3 ? 'bullish' : newsSentiment.score < -0.3 ? 'bearish' : 'neutral')}
            </div>
            <div className="text-2xl font-bold">
              {sentimentScore.toFixed(0)}/100
            </div>
            <Progress value={sentimentScore} className="mt-2" />
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-2">News Sources</div>
            <div className="flex flex-wrap gap-1">
              {newsSentiment.sources?.map((source: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {source}
                </Badge>
              ))}
            </div>
            <div className="text-sm font-medium mt-2 mb-1">Key Topics</div>
            <div className="flex flex-wrap gap-1">
              {newsSentiment.keyWords?.map((word: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {word}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMarketSentiment = (marketSentiment: any) => {
    if (!marketSentiment) return null;

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-3">Market Sentiment Indicators</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">Fear & Greed Index</div>
            <div className="text-2xl font-bold">{marketSentiment.fearGreedIndex?.toFixed(0) || 'N/A'}</div>
            <Progress value={marketSentiment.fearGreedIndex || 0} className="mt-2" />
            <div className="text-xs text-muted-foreground mt-1">
              {marketSentiment.fearGreedIndex > 75 ? 'Extreme Greed' :
               marketSentiment.fearGreedIndex > 55 ? 'Greed' :
               marketSentiment.fearGreedIndex > 45 ? 'Neutral' :
               marketSentiment.fearGreedIndex > 25 ? 'Fear' : 'Extreme Fear'}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">Volatility Index</div>
            <div className="text-2xl font-bold">{marketSentiment.volatilityIndex?.toFixed(1) || 'N/A'}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {marketSentiment.volatilityIndex > 30 ? 'High Volatility' :
               marketSentiment.volatilityIndex > 20 ? 'Normal' : 'Low Volatility'}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">Put/Call Ratio</div>
            <div className="text-2xl font-bold">{marketSentiment.putCallRatio?.toFixed(2) || 'N/A'}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {marketSentiment.putCallRatio > 1.1 ? 'Bearish' :
               marketSentiment.putCallRatio < 0.8 ? 'Bullish' : 'Neutral'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSignalCard = (signal: SentimentSignal) => (
    <Card key={signal.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {getSignalIcon(signal.signal_type)}
            <CardTitle className="text-lg">
              {signal.symbol} {signal.signal_type.toUpperCase()}
            </CardTitle>
            <Badge variant="outline">Sentiment</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getConfidenceColor(signal.confidence)}>
              {(signal.confidence * 100).toFixed(0)}% Confidence
            </Badge>
            <Badge variant="secondary">
              Strength: {signal.strength}/10
            </Badge>
          </div>
        </div>
        <CardDescription className="flex items-center gap-4 mt-2">
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            Entry: {signal.suggested_entry.toFixed(5)}
          </span>
          <span>SL: {signal.suggested_stop_loss.toFixed(5)}</span>
          <span>TP: {signal.suggested_take_profit.toFixed(5)}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(signal.created_at).toLocaleTimeString()}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm text-muted-foreground">Overall Sentiment</div>
            <div className="flex items-center gap-2">
              {getSentimentIcon(signal.trend_context)}
              <Badge variant="outline">{signal.trend_context}</Badge>
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Smart Money</div>
            <Badge variant="outline">{signal.volatility_regime}</Badge>
          </div>
        </div>

        {signal.intermediate_values?.sentiment_data && (
          <>
            {renderCOTData(signal.intermediate_values.sentiment_data.cotReport)}
            {renderNewsSentiment(signal.intermediate_values.sentiment_data.newsSentiment)}
            {renderMarketSentiment(signal.intermediate_values.sentiment_data.marketSentiment)}
          </>
        )}

        {/* Display Real COT Data */}
        {signal.intermediate_values?.cot_data && signal.intermediate_values.cot_data.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Live COT Data</h4>
            <div className="space-y-2">
              {signal.intermediate_values.cot_data.slice(0, 2).map((cot: any, index: number) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Report Date: {new Date(cot.report_date).toLocaleDateString()}</span>
                    <Badge variant="outline">
                      Net: {cot.net_long > 0 ? '+' : ''}{(cot.net_long / 1000).toFixed(0)}K
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Commercial</div>
                      <div className="font-mono">
                        L: {(cot.commercial_long / 1000).toFixed(0)}K | S: {(cot.commercial_short / 1000).toFixed(0)}K
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Large Traders</div>
                      <div className="font-mono">
                        L: {(cot.large_traders_long / 1000).toFixed(0)}K | S: {(cot.large_traders_short / 1000).toFixed(0)}K
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Retail</div>
                      <div className="font-mono">
                        L: {(cot.retail_long / 1000).toFixed(0)}K | S: {(cot.retail_short / 1000).toFixed(0)}K
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Display Real Retail Positioning */}
        {signal.intermediate_values?.retail_positioning && signal.intermediate_values.retail_positioning.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Live Retail Positioning</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {signal.intermediate_values.retail_positioning.slice(0, 4).map((pos: any, index: number) => (
                <div key={index} className="p-2 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{pos.broker}</span>
                    <Badge variant="outline">{new Date(pos.as_of).toLocaleTimeString()}</Badge>
                  </div>
                  <div className="mt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-green-600">Long: {pos.long_percentage?.toFixed(1)}%</span>
                      <span className="text-red-600">Short: {pos.short_percentage?.toFixed(1)}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Traders: {(pos.long_traders_count + pos.short_traders_count).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Display Recent News */}
        {signal.intermediate_values?.recent_news && signal.intermediate_values.recent_news.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Live Market News</h4>
            <div className="space-y-2">
              {signal.intermediate_values.recent_news.slice(0, 3).map((news: any, index: number) => (
                <div key={index} className="p-2 bg-muted rounded-lg">
                  <div className="font-medium text-sm line-clamp-2">{news.title}</div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-muted-foreground">{news.source}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${
                        news.sentiment_score > 0 ? 'text-green-600' : news.sentiment_score < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {news.sentiment_score > 0 ? '+' : ''}{news.sentiment_score?.toFixed(0) || '0'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(news.published_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {signal.calculation_parameters && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">Analysis Parameters</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">COT Analysis:</span><br />
                <span>{signal.calculation_parameters.cot_analysis ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">News Sentiment:</span><br />
                <span>{signal.calculation_parameters.news_sentiment ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Fear & Greed:</span><br />
                <span>{signal.calculation_parameters.market_fear_greed ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Retail Position:</span><br />
                <span>{signal.calculation_parameters.retail_positioning || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading sentiment analysis...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Users className="h-8 w-8" />
          Sentiment Analysis
        </h1>
        <p className="text-muted-foreground">
          Market positioning and bias metrics from COT reports, retail sentiment, and news analysis
        </p>
      </div>

      <Tabs value={selectedView} onValueChange={setSelectedView} className="mb-6">
        <TabsList>
          <TabsTrigger value="signals">Sentiment Signals</TabsTrigger>
          <TabsTrigger value="positioning">Market Positioning</TabsTrigger>
          <TabsTrigger value="news">News Sentiment</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4">
        {signals.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Sentiment Signals</h3>
              <p className="text-muted-foreground">
                No sentiment analysis signals found.
              </p>
            </CardContent>
          </Card>
        ) : (
          signals.map(renderSignalCard)
        )}
      </div>
    </div>
  );
}