import { untypedSupabase as supabase } from '@/integrations/supabase/untypedClient';

export interface MarketRegime {
  regime: 'risk-on' | 'risk-off' | 'neutral';
  confidence: number;
  indicators: { vix: number; usdIndex: number | null; commodities: number | null; equities: number | null };
  lastUpdated: Date;
}

export interface SentimentAggregation {
  overallSentiment: number;
  sources: { source: string; sentiment: number; weight: number; reliability: number }[];
  confidence: number;
  lastUpdated: Date;
}

export interface EconomicSurprise {
  eventName: string;
  currency: string;
  actual: number;
  forecast: number;
  previous: number;
  surprise: number;
  impact: 'high' | 'medium' | 'low';
  timestamp: Date;
}

export interface CrossCurrencyCorrelation {
  pair1: string;
  pair2: string;
  correlation: number;
  strength: 'strong' | 'moderate' | 'weak';
  timeframe: string;
  lastCalculated: Date;
}

export interface MarketIntelligence {
  regime: MarketRegime;
  sentiment: SentimentAggregation;
  surprises: EconomicSurprise[];
  correlations: CrossCurrencyCorrelation[];
  centralBankSignals: { bank: string; currency: string; signal: 'hawkish' | 'dovish' | 'neutral'; confidence: number; lastSpeech: Date }[];
}

class MarketIntelligenceEngine {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  async getMarketIntelligence(symbol: string = 'EUR/USD'): Promise<MarketIntelligence> {
    const cacheKey = `intelligence_${symbol}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) return cached.data;

    try {
      const [regime, sentiment, surprises, correlations, centralBankSignals] = await Promise.all([
        this.detectMarketRegime(symbol),
        this.aggregateSentiment(),
        this.getEconomicSurprises(),
        this.getCrossCorrelations(),
        this.getCentralBankSignals(),
      ]);

      const intelligence: MarketIntelligence = { regime, sentiment, surprises, correlations, centralBankSignals };
      this.cache.set(cacheKey, { data: intelligence, timestamp: Date.now() });
      return intelligence;
    } catch (error) {
      console.error('Error getting market intelligence:', error);
      return this.getFallbackIntelligence();
    }
  }

  private async detectMarketRegime(symbol: string): Promise<MarketRegime> {
    // Compute real volatility from candle data
    const { data: candles } = await (supabase as any)
      .from('aggregated_candles')
      .select('high_price, low_price, close_price')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: false })
      .limit(20);

    let vix = 20;
    if (candles && candles.length >= 5) {
      const atrs = candles.map((c: any) => c.high_price - c.low_price);
      const avgATR = atrs.reduce((a: number, b: number) => a + b, 0) / atrs.length;
      vix = (avgATR / candles[0].close_price) * 100 * Math.sqrt(252) * 10;
      vix = Math.max(10, Math.min(50, vix));
    }

    // Determine regime from real volatility + news sentiment
    const { data: newsData } = await (supabase as any)
      .from('news_events')
      .select('sentiment_score')
      .order('published_at', { ascending: false })
      .limit(5);

    let avgSentiment = 0;
    if (newsData && newsData.length > 0) {
      avgSentiment = newsData.reduce((a: number, n: any) => a + (n.sentiment_score || 0), 0) / newsData.length;
    }

    let regime: 'risk-on' | 'risk-off' | 'neutral' = 'neutral';
    let confidence = 0.5;

    if (vix < 20 && avgSentiment > 0) { regime = 'risk-on'; confidence = 0.75; }
    else if (vix > 30 || avgSentiment < -0.3) { regime = 'risk-off'; confidence = 0.8; }

    return {
      regime, confidence,
      indicators: { vix, usdIndex: null, commodities: null, equities: null },
      lastUpdated: new Date(),
    };
  }

  private async aggregateSentiment(): Promise<SentimentAggregation> {
    const { data: newsData } = await (supabase as any)
      .from('news_events')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(10);

    if (!newsData || newsData.length === 0) {
      return { overallSentiment: 0, sources: [], confidence: 0.3, lastUpdated: new Date() };
    }

    const sourceMap = new Map<string, { scores: number[]; weight: number; reliability: number }>();
    const weights: Record<string, number> = { 'Alpha Vantage': 0.9, 'ForexLive': 0.8, 'Reuters': 1.0, 'Bloomberg': 1.0 };
    const reliabilities: Record<string, number> = { 'Alpha Vantage': 0.85, 'ForexLive': 0.75, 'Reuters': 0.95, 'Bloomberg': 0.95 };

    for (const item of newsData) {
      const src = item.source || 'Unknown';
      if (!sourceMap.has(src)) {
        sourceMap.set(src, { scores: [], weight: weights[src] || 0.6, reliability: reliabilities[src] || 0.7 });
      }
      sourceMap.get(src)!.scores.push(item.sentiment_score || item.sentiment || 0);
    }

    const sources = Array.from(sourceMap.entries()).map(([source, data]) => ({
      source,
      sentiment: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
      weight: data.weight,
      reliability: data.reliability,
    }));

    const weighted = sources.reduce((acc, s) => acc + s.sentiment * s.weight * s.reliability, 0) /
      sources.reduce((acc, s) => acc + s.weight * s.reliability, 1);

    return {
      overallSentiment: Math.max(-100, Math.min(100, weighted * 100)),
      sources,
      confidence: newsData.length > 5 ? 0.8 : 0.5,
      lastUpdated: new Date(),
    };
  }

  private async getEconomicSurprises(): Promise<EconomicSurprise[]> {
    const { data: events } = await (supabase as any)
      .from('economic_calendar')
      .select('*')
      .not('actual_value', 'is', null)
      .not('forecast_value', 'is', null)
      .order('event_time', { ascending: false })
      .limit(10);

    if (!events || events.length === 0) return [];

    return events
      .filter((e: any) => e.actual_value != null && e.forecast_value != null && e.forecast_value !== 0)
      .map((e: any) => ({
        eventName: e.event_name,
        currency: e.currency || 'USD',
        actual: e.actual_value,
        forecast: e.forecast_value,
        previous: e.previous_value || 0,
        surprise: ((e.actual_value - e.forecast_value) / Math.abs(e.forecast_value)) * 100,
        impact: (e.impact || 'medium') as 'high' | 'medium' | 'low',
        timestamp: new Date(e.event_time),
      }))
      .slice(0, 10);
  }

  private async getCrossCorrelations(): Promise<CrossCurrencyCorrelation[]> {
    const { data: corrs } = await (supabase as any)
      .from('correlations')
      .select('*')
      .order('calculated_at', { ascending: false })
      .limit(20);

    if (!corrs || corrs.length === 0) return [];

    return corrs.map((c: any) => {
      const parts = c.symbol_pair.split('|');
      const absCorr = Math.abs(c.correlation_coefficient);
      return {
        pair1: parts[0] || '',
        pair2: parts[1] || '',
        correlation: c.correlation_coefficient,
        strength: absCorr > 0.7 ? 'strong' as const : absCorr > 0.4 ? 'moderate' as const : 'weak' as const,
        timeframe: c.timeframe || '1D',
        lastCalculated: new Date(c.calculated_at),
      };
    });
  }

  private async getCentralBankSignals() {
    // Derive from news sentiment - look for central bank related news
    const { data: newsData } = await (supabase as any)
      .from('news_events')
      .select('headline, sentiment_score, published_at')
      .order('published_at', { ascending: false })
      .limit(20);

    const banks = [
      { bank: 'ECB', currency: 'EUR', keywords: ['ecb', 'lagarde', 'eurozone rate'] },
      { bank: 'Fed', currency: 'USD', keywords: ['fed', 'powell', 'fomc', 'federal reserve'] },
      { bank: 'BoE', currency: 'GBP', keywords: ['boe', 'bank of england', 'bailey'] },
      { bank: 'BoJ', currency: 'JPY', keywords: ['boj', 'bank of japan', 'ueda'] },
    ];

    return banks.map(bankInfo => {
      let signal: 'hawkish' | 'dovish' | 'neutral' = 'neutral';
      let confidence = 0.4;
      let lastSpeech = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      if (newsData && newsData.length > 0) {
        const relevant = newsData.filter((n: any) =>
          bankInfo.keywords.some(kw => (n.headline || '').toLowerCase().includes(kw))
        );
        if (relevant.length > 0) {
          const avgSentiment = relevant.reduce((a: number, n: any) => a + (n.sentiment_score || 0), 0) / relevant.length;
          signal = avgSentiment > 0.15 ? 'hawkish' : avgSentiment < -0.15 ? 'dovish' : 'neutral';
          confidence = Math.min(0.5 + relevant.length * 0.1, 0.9);
          lastSpeech = new Date(relevant[0].published_at);
        }
      }

      return { bank: bankInfo.bank, currency: bankInfo.currency, signal, confidence, lastSpeech };
    });
  }

  private getFallbackIntelligence(): MarketIntelligence {
    return {
      regime: { regime: 'neutral', confidence: 0.3, indicators: { vix: 20, usdIndex: null, commodities: null, equities: null }, lastUpdated: new Date() },
      sentiment: { overallSentiment: 0, sources: [], confidence: 0.3, lastUpdated: new Date() },
      surprises: [], correlations: [], centralBankSignals: [],
    };
  }
}

export const marketIntelligenceEngine = new MarketIntelligenceEngine();
