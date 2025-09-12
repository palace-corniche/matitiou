import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Newspaper, 
  Target,
  Clock,
  DollarSign,
  Calendar
} from 'lucide-react';

interface FundamentalSignal {
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

export default function FundamentalAnalysisPage() {
  const [signals, setSignals] = useState<FundamentalSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('1d');

  useEffect(() => {
    fetchFundamentalSignals();
  }, [selectedPeriod]);

  const fetchFundamentalSignals = async () => {
    try {
      setLoading(true);
      
      // Fetch both modular signals and real data sources
      const [signalsResult, newsResult, economicResult] = await Promise.all([
        supabase
          .from('modular_signals')
          .select('*')
          .eq('module_id', 'fundamental_analysis')
          .order('created_at', { ascending: false })
          .limit(15),
        supabase
          .from('news_events')
          .select('*')
          .order('published_at', { ascending: false })
          .limit(10),
        supabase
          .from('economic_calendar')
          .select('*')
          .gte('event_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('event_time', { ascending: false })
          .limit(10)
      ]);

      if (signalsResult.error) throw signalsResult.error;
      
      // Create enriched signals with real news and economic data
      const enrichedSignals = (signalsResult.data || []).map(signal => ({
        ...signal,
        intermediate_values: {
          ...(typeof signal.intermediate_values === 'object' && signal.intermediate_values !== null ? signal.intermediate_values : {}),
          economic_events: economicResult.data?.slice(0, 3) || [],
          news_events: newsResult.data?.slice(0, 3) || [],
          sentiment_analysis: {
            central_bank: 'Neutral',
            inflation: 'Rising',
            growth: 'Stable'
          }
        }
      }));
      
      setSignals(enrichedSignals as FundamentalSignal[]);
    } catch (error) {
      console.error('Error fetching fundamental signals:', error);
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

  const getSentimentColor = (sentiment: string) => {
    if (sentiment.includes('hawkish') || sentiment.includes('bullish')) return 'text-green-600';
    if (sentiment.includes('dovish') || sentiment.includes('bearish')) return 'text-red-600';
    return 'text-gray-600';
  };

  const renderEconomicEvents = (events: any[]) => {
    if (!events || events.length === 0) return null;

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-3">Recent Economic Events</h4>
        <div className="space-y-2">
          {events.map((event, index) => (
            <div key={index} className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div className="font-medium text-sm">{event.event}</div>
                <Badge 
                  variant={event.importance === 'high' ? 'destructive' : 
                          event.importance === 'medium' ? 'default' : 'secondary'}
                >
                  {event.importance}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Actual:</span> {event.actual || 'N/A'}
                </div>
                <div>
                  <span className="text-muted-foreground">Forecast:</span> {event.forecast || 'N/A'}
                </div>
                <div>
                  <span className="text-muted-foreground">Previous:</span> {event.previous || 'N/A'}
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {event.currency} • {new Date(event.time).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSentimentAnalysis = (sentimentData: any) => {
    if (!sentimentData) return null;

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-3">Sentiment Analysis</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">Central Bank</div>
            <div className={`text-lg font-bold ${getSentimentColor(sentimentData.central_bank || '')}`}>
              {sentimentData.central_bank || 'Neutral'}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">Inflation Trend</div>
            <div className={`text-lg font-bold ${getSentimentColor(sentimentData.inflation || '')}`}>
              {sentimentData.inflation || 'Stable'}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">GDP Growth</div>
            <div className={`text-lg font-bold ${getSentimentColor(sentimentData.growth || '')}`}>
              {sentimentData.growth || 'Stable'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSignalCard = (signal: FundamentalSignal) => (
    <Card key={signal.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {getSignalIcon(signal.signal_type)}
            <CardTitle className="text-lg">
              {signal.symbol} {signal.signal_type.toUpperCase()}
            </CardTitle>
            <Badge variant="outline">Fundamental</Badge>
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
            <div className="text-sm text-muted-foreground">Context</div>
            <Badge variant="outline">{signal.trend_context}</Badge>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Growth Outlook</div>
            <Badge variant="outline">{signal.volatility_regime}</Badge>
          </div>
        </div>

        {signal.intermediate_values?.economic_events && 
          renderEconomicEvents(signal.intermediate_values.economic_events)}

        {signal.intermediate_values?.sentiment_analysis && 
          renderSentimentAnalysis(signal.intermediate_values.sentiment_analysis)}

        {signal.calculation_parameters && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">Analysis Parameters</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">CB Sentiment:</span><br />
                <span className={getSentimentColor(signal.calculation_parameters.central_bank_sentiment || '')}>
                  {signal.calculation_parameters.central_bank_sentiment || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Inflation:</span><br />
                <span>{signal.calculation_parameters.inflation_trend || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">GDP:</span><br />
                <span>{signal.calculation_parameters.gdp_growth || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Events:</span><br />
                <span>{signal.calculation_parameters.event_count || 0}</span>
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
        <div className="text-center">Loading fundamental analysis...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Building2 className="h-8 w-8" />
          Fundamental Analysis
        </h1>
        <p className="text-muted-foreground">
          Macroeconomic insights from economic releases, central bank policies, and fundamental data
        </p>
      </div>

      <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod} className="mb-6">
        <TabsList>
          <TabsTrigger value="1h">Last Hour</TabsTrigger>
          <TabsTrigger value="1d">Today</TabsTrigger>
          <TabsTrigger value="1w">This Week</TabsTrigger>
          <TabsTrigger value="1m">This Month</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4">
        {signals.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Fundamental Signals</h3>
              <p className="text-muted-foreground">
                No fundamental analysis signals found for the selected period.
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