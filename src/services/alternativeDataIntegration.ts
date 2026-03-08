// ============= PHASE C: ALTERNATIVE DATA INTEGRATION =============
// Replaced mock data with real DB queries where available, honest N/A otherwise
import { supabase } from '@/integrations/supabase/client';

interface NewsAnalysis {
  sentiment: number;
  relevance: number;
  impact: number;
  keywords: string[];
  headline: string;
  source: string;
  timestamp: Date;
}

interface SocialSentiment {
  platform: string;
  sentiment: number;
  volume: number;
  influencer_score: number;
  trending_topics: string[];
  timestamp: Date;
}

interface OptionsFlow {
  symbol: string;
  strike: number;
  expiry: Date;
  option_type: 'call' | 'put';
  volume: number;
  open_interest: number;
  implied_volatility: number;
  delta: number;
  gamma: number;
  unusual_activity: boolean;
}

interface PositioningData {
  symbol: string;
  commercial_long: number;
  commercial_short: number;
  speculative_long: number;
  speculative_short: number;
  retail_sentiment: number;
  timestamp: Date;
}

interface SentimentSignal {
  symbol: string;
  sentiment: number;
  confidence: number;
  components: {
    news: number;
    social: number;
    options: number;
    positioning: number;
  };
  timestamp: Date;
}

class AlternativeDataIntegration {
  // ============= NEWS SENTIMENT ANALYSIS (REAL DB) =============
  async analyzeNewsSentiment(symbol: string = 'EUR/USD'): Promise<NewsAnalysis[]> {
    try {
      const { data, error } = await supabase
        .from('news_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error || !data || data.length === 0) {
        console.log('📰 No news data available in database');
        return [];
      }

      return data.map((item: any) => ({
        sentiment: (item.sentiment_score ?? item.sentiment) ?? 0,
        relevance: (item.relevance_score) ?? 0.5,
        impact: item.impact === 'high' ? 0.9 : item.impact === 'medium' ? 0.6 : 0.3,
        keywords: [item.symbol, item.source].filter(Boolean) as string[],
        headline: item.headline,
        source: item.source || 'unknown',
        timestamp: new Date(item.published_at || item.created_at)
      }));
    } catch (error) {
      console.error('❌ Error analyzing news sentiment:', error);
      return [];
    }
  }

  // ============= SOCIAL MEDIA SENTIMENT (NO DATA SOURCE) =============
  async analyzeSocialSentiment(symbol: string = 'EUR/USD'): Promise<SocialSentiment[]> {
    // No real social sentiment data source available — return empty
    console.log('📱 Social sentiment: no data source connected');
    return [];
  }

  // ============= OPTIONS FLOW (NO DATA SOURCE) =============
  async analyzeOptionsFlow(symbol: string = 'EUR/USD'): Promise<OptionsFlow[]> {
    // No real options flow data source available — return empty
    console.log('📊 Options flow: no data source connected');
    return [];
  }

  // ============= POSITIONING DATA (REAL DB - COT + RETAIL) =============
  async analyzePositioningData(symbol: string = 'EUR/USD'): Promise<PositioningData> {
    try {
      // Query real COT reports
      const { data: cotData } = await supabase
        .from('cot_reports')
        .select('*')
        .eq('pair', symbol)
        .order('report_date', { ascending: false })
        .limit(1);

      // Query real retail positions
      const { data: retailData } = await supabase
        .from('retail_positions')
        .select('*')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(1);

      const cot = cotData?.[0];
      const retail = retailData?.[0];

      return {
        symbol,
        commercial_long: cot?.long_positions ?? 0,
        commercial_short: cot?.short_positions ?? 0,
        speculative_long: cot?.net_position != null && cot.net_position > 0 ? cot.net_position : 0,
        speculative_short: cot?.net_position != null && cot.net_position < 0 ? Math.abs(cot.net_position) : 0,
        retail_sentiment: retail?.long_percentage != null ? retail.long_percentage / 100 : 0.5,
        timestamp: new Date(cot?.report_date || retail?.timestamp || new Date())
      };
    } catch (error) {
      console.error('❌ Error analyzing positioning data:', error);
      return {
        symbol,
        commercial_long: 0,
        commercial_short: 0,
        speculative_long: 0,
        speculative_short: 0,
        retail_sentiment: 0.5,
        timestamp: new Date()
      };
    }
  }

  // ============= ECONOMIC SURPRISE INDEX (REAL DB) =============
  async calculateEconomicSurpriseIndex(currency: string = 'EUR'): Promise<{
    surpriseIndex: number;
    trendDirection: string;
    confidence: number;
    recentEvents: any[];
  }> {
    try {
      const { data: events, error } = await supabase
        .from('economic_calendar')
        .select('*')
        .in('currency', [currency, currency === 'EUR' ? 'USD' : 'EUR'])
        .order('event_time', { ascending: false })
        .limit(20);

      if (error || !events || events.length === 0) {
        return { surpriseIndex: 0, trendDirection: 'neutral', confidence: 0, recentEvents: [] };
      }

      // Calculate surprise from actual vs forecast
      let totalSurprise = 0;
      let count = 0;
      const recentEvents = events.map((e: any) => {
        const actual = (e.actual_value != null ? e.actual_value : parseFloat(e.actual)) || 0;
        const forecast = (e.forecast_value != null ? e.forecast_value : parseFloat(e.forecast)) || 0;
        const impactWeight = e.impact === 'high' ? 1.0 : e.impact === 'medium' ? 0.6 : 0.3;
        
        if (forecast !== 0) {
          const surprise = (actual - forecast) / Math.abs(forecast);
          totalSurprise += surprise * impactWeight;
          count++;
        }
        
        return {
          name: e.event_name,
          actual,
          forecast,
          impact_weight: impactWeight,
          currency: e.currency,
          date: new Date(e.event_time)
        };
      });

      const surpriseIndex = count > 0 ? totalSurprise / count : 0;
      const trendDirection = surpriseIndex > 0.1 ? 'positive' : surpriseIndex < -0.1 ? 'negative' : 'neutral';
      const confidence = Math.min(0.95, Math.abs(surpriseIndex) * 2);

      return { surpriseIndex, trendDirection, confidence, recentEvents };
    } catch (error) {
      console.error('❌ Error calculating economic surprise index:', error);
      return { surpriseIndex: 0, trendDirection: 'neutral', confidence: 0, recentEvents: [] };
    }
  }

  // ============= CROSS-ASSET ANALYSIS (REAL DB - CORRELATIONS) =============
  async analyzeCrossAssetSignals(symbol: string = 'EUR/USD'): Promise<{
    bondYieldSpread: number;
    equityMomentum: number;
    commodityCorrelation: number;
    volatilityRegime: string;
    overallSignal: number;
  }> {
    try {
      // Get real correlations from DB
      const { data: correlations } = await supabase
        .from('correlations')
        .select('*')
        .order('calculated_at', { ascending: false })
        .limit(10);

      // Derive signals from correlations where available
      const goldCorr = correlations?.find((c: any) => c.symbol_pair?.includes('GOLD') || c.symbol_pair?.includes('XAU'));
      const commodityCorrelation = goldCorr?.correlation_coefficient ?? 0;

      // No real bond/equity data sources — use neutral defaults
      return {
        bondYieldSpread: 0,
        equityMomentum: 0,
        commodityCorrelation,
        volatilityRegime: 'medium',
        overallSignal: commodityCorrelation * 0.2 // Only contribution from available data
      };
    } catch (error) {
      console.error('❌ Error analyzing cross-asset signals:', error);
      return { bondYieldSpread: 0, equityMomentum: 0, commodityCorrelation: 0, volatilityRegime: 'medium', overallSignal: 0 };
    }
  }

  // ============= INTERMARKET ANALYSIS (REAL DB - CORRELATIONS) =============
  async performIntermarketAnalysis(): Promise<{
    dollarIndex: number;
    goldSilverRatio: number;
    yieldCurveSlope: number;
    cryptoCorrelation: number;
    riskOnOffSentiment: number;
  }> {
    try {
      const { data: correlations } = await supabase
        .from('correlations')
        .select('*')
        .order('calculated_at', { ascending: false })
        .limit(20);

      // Extract available correlation data
      const dxyCorr = correlations?.find((c: any) => c.symbol_pair?.includes('DXY'));
      const cryptoCorr = correlations?.find((c: any) => c.symbol_pair?.includes('BTC'));

      return {
        dollarIndex: 0, // No DXY feed connected
        goldSilverRatio: 0, // No metals feed connected
        yieldCurveSlope: 0, // No yield feed connected
        cryptoCorrelation: cryptoCorr?.correlation_coefficient ?? 0,
        riskOnOffSentiment: 0 // Insufficient data
      };
    } catch (error) {
      console.error('❌ Error performing intermarket analysis:', error);
      return { dollarIndex: 0, goldSilverRatio: 0, yieldCurveSlope: 0, cryptoCorrelation: 0, riskOnOffSentiment: 0 };
    }
  }

  // ============= CONSOLIDATED SENTIMENT ANALYSIS =============
  async generateConsolidatedSentiment(symbol: string = 'EUR/USD'): Promise<SentimentSignal[]> {
    try {
      const [news, social, positioning] = await Promise.all([
        this.analyzeNewsSentiment(symbol),
        this.analyzeSocialSentiment(symbol),
        this.analyzePositioningData(symbol)
      ]);

      const newsScore = this.aggregateNewsSentiment(news);
      const socialScore = this.aggregateSocialSentiment(social);
      const optionsScore = 0; // No options data source
      const positioningScore = positioning.retail_sentiment > 0.5 
        ? (positioning.retail_sentiment - 0.5) * 2 
        : (positioning.retail_sentiment - 0.5) * 2;

      const signals: SentimentSignal[] = [
        {
          symbol,
          sentiment: (newsScore + socialScore + optionsScore + positioningScore) / 4,
          confidence: this.calculateConfidence([newsScore, socialScore, optionsScore, positioningScore]),
          components: {
            news: newsScore,
            social: socialScore,
            options: optionsScore,
            positioning: positioningScore
          },
          timestamp: new Date()
        }
      ];

      return signals;
    } catch (error) {
      console.error('❌ Error generating consolidated sentiment:', error);
      return [];
    }
  }

  private aggregateNewsSentiment(news: NewsAnalysis[]): number {
    if (news.length === 0) return 0;
    const weightedSentiment = news.reduce((acc, article) => acc + (article.sentiment * article.relevance * article.impact), 0);
    const totalWeight = news.reduce((acc, article) => acc + (article.relevance * article.impact), 0);
    return totalWeight > 0 ? weightedSentiment / totalWeight : 0;
  }

  private aggregateSocialSentiment(social: SocialSentiment[]): number {
    if (social.length === 0) return 0;
    const weightedSentiment = social.reduce((acc, platform) => {
      const weight = platform.volume * platform.influencer_score;
      return acc + (platform.sentiment * weight);
    }, 0);
    const totalWeight = social.reduce((acc, platform) => acc + (platform.volume * platform.influencer_score), 0);
    return totalWeight > 0 ? weightedSentiment / totalWeight : 0;
  }

  private calculateConfidence(scores: number[]): number {
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    return Math.max(0.1, Math.min(0.95, 1 - standardDeviation));
  }

  // ============= PUBLIC API =============
  async getComprehensiveAlternativeDataSignal(symbol: string = 'EUR/USD'): Promise<{
    sentiment: SentimentSignal[];
    economicSurprise: any;
    crossAsset: any;
    intermarket: any;
    overallRecommendation: string;
    confidence: number;
  }> {
    try {
      const [sentiment, economicSurprise, crossAsset, intermarket] = await Promise.all([
        this.generateConsolidatedSentiment(symbol),
        this.calculateEconomicSurpriseIndex(symbol.split('/')[0]),
        this.analyzeCrossAssetSignals(symbol),
        this.performIntermarketAnalysis()
      ]);

      const sentimentScore = sentiment[0]?.sentiment || 0;
      const economicScore = economicSurprise.surpriseIndex;
      const crossAssetScore = crossAsset.overallSignal;
      
      const overallScore = (sentimentScore + economicScore + crossAssetScore) / 3;
      const overallRecommendation = overallScore > 0.2 ? 'BUY' : overallScore < -0.2 ? 'SELL' : 'HOLD';
      
      const confidence = Math.min(0.95, (
        (sentiment[0]?.confidence || 0) +
        economicSurprise.confidence +
        Math.abs(crossAsset.overallSignal)
      ) / 3);

      return { sentiment, economicSurprise, crossAsset, intermarket, overallRecommendation, confidence };
    } catch (error) {
      console.error('❌ Error getting comprehensive alternative data signal:', error);
      return {
        sentiment: [],
        economicSurprise: { surpriseIndex: 0, trendDirection: 'neutral', confidence: 0, recentEvents: [] },
        crossAsset: { bondYieldSpread: 0, equityMomentum: 0, commodityCorrelation: 0, volatilityRegime: 'medium', overallSignal: 0 },
        intermarket: { dollarIndex: 0, goldSilverRatio: 0, yieldCurveSlope: 0, cryptoCorrelation: 0, riskOnOffSentiment: 0 },
        overallRecommendation: 'HOLD',
        confidence: 0
      };
    }
  }
}

export const alternativeDataIntegration = new AlternativeDataIntegration();
