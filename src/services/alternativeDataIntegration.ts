// ============= PHASE C: ALTERNATIVE DATA INTEGRATION =============
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
  private newsApiKey = 'mock_api_key';
  private twitterApiKey = 'mock_twitter_key';
  private optionsDataProvider = 'mock_options_provider';

  // ============= NEWS SENTIMENT ANALYSIS =============
  async analyzeNewsSentiment(symbol: string = 'EUR/USD'): Promise<NewsAnalysis[]> {
    try {
      // Mock news analysis - in production, integrate with news APIs
      const mockNews: NewsAnalysis[] = [
        {
          sentiment: 0.7,
          relevance: 0.9,
          impact: 0.8,
          keywords: ['ECB', 'rate hike', 'inflation', 'EUR/USD'],
          headline: 'ECB hints at aggressive rate hikes amid inflation concerns',
          source: 'Reuters',
          timestamp: new Date()
        },
        {
          sentiment: -0.3,
          relevance: 0.6,
          impact: 0.5,
          keywords: ['USD', 'employment', 'weak'],
          headline: 'US employment data disappoints expectations',
          source: 'Bloomberg',
          timestamp: new Date(Date.now() - 3600000)
        }
      ];

      // In production, apply NLP sentiment analysis
      return this.enhanceNewsWithSentiment(mockNews);
    } catch (error) {
      console.error('❌ Error analyzing news sentiment:', error);
      return [];
    }
  }

  private enhanceNewsWithSentiment(news: NewsAnalysis[]): NewsAnalysis[] {
    return news.map(article => ({
      ...article,
      sentiment: this.calculateAdvancedSentiment(article.headline, article.keywords),
      impact: this.calculateMarketImpact(article.keywords, article.sentiment)
    }));
  }

  private calculateAdvancedSentiment(headline: string, keywords: string[]): number {
    // Mock advanced sentiment calculation
    const positiveKeywords = ['hike', 'strong', 'growth', 'bullish', 'positive'];
    const negativeKeywords = ['weak', 'dovish', 'concerns', 'disappoints', 'bearish'];
    
    let score = 0;
    const text = headline.toLowerCase();
    
    positiveKeywords.forEach(word => {
      if (text.includes(word)) score += 0.2;
    });
    
    negativeKeywords.forEach(word => {
      if (text.includes(word)) score -= 0.2;
    });
    
    return Math.max(-1, Math.min(1, score));
  }

  private calculateMarketImpact(keywords: string[], sentiment: number): number {
    const highImpactKeywords = ['ecb', 'fed', 'rate', 'inflation', 'employment'];
    const keywordImpact = keywords.filter(k => 
      highImpactKeywords.includes(k.toLowerCase())
    ).length * 0.2;
    
    return Math.min(1, keywordImpact + Math.abs(sentiment) * 0.3);
  }

  // ============= SOCIAL MEDIA SENTIMENT =============
  async analyzeSocialSentiment(symbol: string = 'EUR/USD'): Promise<SocialSentiment[]> {
    try {
      // Mock social sentiment data
      const platforms = ['twitter', 'reddit', 'stocktwits', 'telegram'];
      
      return platforms.map(platform => ({
        platform,
        sentiment: (Math.random() - 0.5) * 2, // -1 to 1
        volume: Math.floor(Math.random() * 10000),
        influencer_score: Math.random(),
        trending_topics: this.generateTrendingTopics(symbol),
        timestamp: new Date()
      }));
    } catch (error) {
      console.error('❌ Error analyzing social sentiment:', error);
      return [];
    }
  }

  private generateTrendingTopics(symbol: string): string[] {
    const topics = ['#forex', '#trading', '#EUR', '#USD', '#FED', '#ECB'];
    return topics.slice(0, Math.floor(Math.random() * 4) + 2);
  }

  // ============= OPTIONS FLOW ANALYSIS =============
  async analyzeOptionsFlow(symbol: string = 'EUR/USD'): Promise<OptionsFlow[]> {
    try {
      // Mock options flow data - in production, integrate with options data providers
      const strikes = [1.08, 1.09, 1.10, 1.11, 1.12];
      const expiries = [
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      ];
      
      const optionsFlow: OptionsFlow[] = [];
      
      strikes.forEach(strike => {
        expiries.forEach(expiry => {
          ['call', 'put'].forEach(type => {
            optionsFlow.push({
              symbol,
              strike,
              expiry,
              option_type: type as 'call' | 'put',
              volume: Math.floor(Math.random() * 1000),
              open_interest: Math.floor(Math.random() * 5000),
              implied_volatility: 0.15 + Math.random() * 0.1,
              delta: type === 'call' ? Math.random() * 0.5 : -Math.random() * 0.5,
              gamma: Math.random() * 0.1,
              unusual_activity: Math.random() > 0.8
            });
          });
        });
      });
      
      return this.identifyUnusualOptionsActivity(optionsFlow);
    } catch (error) {
      console.error('❌ Error analyzing options flow:', error);
      return [];
    }
  }

  private identifyUnusualOptionsActivity(optionsFlow: OptionsFlow[]): OptionsFlow[] {
    return optionsFlow.map(option => {
      const avgVolume = optionsFlow
        .filter(o => o.strike === option.strike && o.option_type === option.option_type)
        .reduce((sum, o) => sum + o.volume, 0) / optionsFlow.length;
      
      option.unusual_activity = option.volume > avgVolume * 3;
      return option;
    });
  }

  // ============= POSITIONING DATA =============
  async analyzePositioningData(symbol: string = 'EUR/USD'): Promise<PositioningData> {
    try {
      // Mock COT (Commitment of Traders) style data
      return {
        symbol,
        commercial_long: 45000 + Math.random() * 10000,
        commercial_short: 38000 + Math.random() * 10000,
        speculative_long: 32000 + Math.random() * 8000,
        speculative_short: 41000 + Math.random() * 8000,
        retail_sentiment: 0.4 + Math.random() * 0.2, // 40-60% bullish
        timestamp: new Date()
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

  // ============= ECONOMIC SURPRISE INDEX =============
  async calculateEconomicSurpriseIndex(currency: string = 'EUR'): Promise<{
    surpriseIndex: number;
    trendDirection: string;
    confidence: number;
    recentEvents: any[];
  }> {
    try {
      // Mock economic surprise calculation
      const recentEvents = await this.getRecentEconomicEvents(currency);
      
      const surpriseIndex = recentEvents.reduce((acc, event) => {
        const surprise = (event.actual - event.forecast) / Math.abs(event.forecast || 1);
        return acc + surprise * event.impact_weight;
      }, 0) / recentEvents.length;
      
      const trendDirection = surpriseIndex > 0.1 ? 'positive' : 
                           surpriseIndex < -0.1 ? 'negative' : 'neutral';
      
      const confidence = Math.min(0.95, Math.abs(surpriseIndex) * 2);
      
      // Save to database
      await this.saveEconomicSurpriseIndex(currency, surpriseIndex, trendDirection, confidence);
      
      return {
        surpriseIndex,
        trendDirection,
        confidence,
        recentEvents
      };
    } catch (error) {
      console.error('❌ Error calculating economic surprise index:', error);
      return {
        surpriseIndex: 0,
        trendDirection: 'neutral',
        confidence: 0,
        recentEvents: []
      };
    }
  }

  private async getRecentEconomicEvents(currency: string): Promise<any[]> {
    // Mock economic events
    return [
      {
        name: 'GDP Growth',
        actual: 0.4,
        forecast: 0.3,
        impact_weight: 0.8,
        currency,
        date: new Date()
      },
      {
        name: 'Inflation Rate',
        actual: 2.1,
        forecast: 2.0,
        impact_weight: 0.9,
        currency,
        date: new Date()
      },
      {
        name: 'Employment Change',
        actual: 180000,
        forecast: 150000,
        impact_weight: 0.7,
        currency,
        date: new Date()
      }
    ];
  }

  // ============= CROSS-ASSET ANALYSIS =============
  async analyzeCrossAssetSignals(symbol: string = 'EUR/USD'): Promise<{
    bondYieldSpread: number;
    equityMomentum: number;
    commodityCorrelation: number;
    volatilityRegime: string;
    overallSignal: number;
  }> {
    try {
      // Mock cross-asset analysis
      const bondYieldSpread = await this.calculateBondYieldSpread();
      const equityMomentum = await this.calculateEquityMomentum();
      const commodityCorrelation = await this.calculateCommodityCorrelation(symbol);
      const volatilityRegime = await this.determineVolatilityRegime();
      
      // Combine signals with weights
      const weights = {
        bonds: 0.3,
        equity: 0.25,
        commodity: 0.2,
        volatility: 0.25
      };
      
      const overallSignal = 
        bondYieldSpread * weights.bonds +
        equityMomentum * weights.equity +
        commodityCorrelation * weights.commodity +
        (volatilityRegime === 'low' ? 0.5 : volatilityRegime === 'high' ? -0.5 : 0) * weights.volatility;
      
      return {
        bondYieldSpread,
        equityMomentum,
        commodityCorrelation,
        volatilityRegime,
        overallSignal
      };
    } catch (error) {
      console.error('❌ Error analyzing cross-asset signals:', error);
      return {
        bondYieldSpread: 0,
        equityMomentum: 0,
        commodityCorrelation: 0,
        volatilityRegime: 'medium',
        overallSignal: 0
      };
    }
  }

  private async calculateBondYieldSpread(): Promise<number> {
    // Mock 10Y-2Y yield spread calculation
    return (Math.random() - 0.5) * 2; // -1 to 1
  }

  private async calculateEquityMomentum(): Promise<number> {
    // Mock equity momentum (S&P 500, EuroStoxx 50 relative performance)
    return (Math.random() - 0.5) * 2;
  }

  private async calculateCommodityCorrelation(symbol: string): Promise<number> {
    // Mock commodity correlation (Oil, Gold impact on currencies)
    return (Math.random() - 0.5) * 2;
  }

  private async determineVolatilityRegime(): Promise<string> {
    const vix = 15 + Math.random() * 20; // Mock VIX level
    return vix < 20 ? 'low' : vix > 30 ? 'high' : 'medium';
  }

  // ============= INTERMARKET ANALYSIS =============
  async performIntermarketAnalysis(): Promise<{
    dollarIndex: number;
    goldSilverRatio: number;
    yieldCurveSlope: number;
    cryptoCorrelation: number;
    riskOnOffSentiment: number;
  }> {
    try {
      return {
        dollarIndex: 103.5 + (Math.random() - 0.5) * 5,
        goldSilverRatio: 75 + (Math.random() - 0.5) * 10,
        yieldCurveSlope: 1.2 + (Math.random() - 0.5) * 0.8,
        cryptoCorrelation: (Math.random() - 0.5) * 2,
        riskOnOffSentiment: (Math.random() - 0.5) * 2
      };
    } catch (error) {
      console.error('❌ Error performing intermarket analysis:', error);
      return {
        dollarIndex: 103.5,
        goldSilverRatio: 75,
        yieldCurveSlope: 1.2,
        cryptoCorrelation: 0,
        riskOnOffSentiment: 0
      };
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
      const optionsScore = await this.getOptionsSentiment(symbol);
      const positioningScore = await this.getPositioningSentiment(symbol);

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

      await this.saveSentimentSignals(signals);
      return signals;
    } catch (error) {
      console.error('❌ Error generating consolidated sentiment:', error);
      return [];
    }
  }

  private aggregateNewsSentiment(news: NewsAnalysis[]): number {
    if (news.length === 0) return 0;
    
    const weightedSentiment = news.reduce((acc, article) => {
      return acc + (article.sentiment * article.relevance * article.impact);
    }, 0);
    
    const totalWeight = news.reduce((acc, article) => {
      return acc + (article.relevance * article.impact);
    }, 0);
    
    return totalWeight > 0 ? weightedSentiment / totalWeight : 0;
  }

  private aggregateSocialSentiment(social: SocialSentiment[]): number {
    if (social.length === 0) return 0;
    
    const weightedSentiment = social.reduce((acc, platform) => {
      const weight = platform.volume * platform.influencer_score;
      return acc + (platform.sentiment * weight);
    }, 0);
    
    const totalWeight = social.reduce((acc, platform) => {
      return acc + (platform.volume * platform.influencer_score);
    }, 0);
    
    return totalWeight > 0 ? weightedSentiment / totalWeight : 0;
  }

  private async getOptionsSentiment(symbol: string): Promise<number> {
    const optionsFlow = await this.analyzeOptionsFlow(symbol);
    
    // Calculate put/call ratio and unusual activity sentiment
    const calls = optionsFlow.filter(o => o.option_type === 'call');
    const puts = optionsFlow.filter(o => o.option_type === 'put');
    
    const callVolume = calls.reduce((sum, o) => sum + o.volume, 0);
    const putVolume = puts.reduce((sum, o) => sum + o.volume, 0);
    
    const putCallRatio = putVolume / (callVolume || 1);
    
    // Lower put/call ratio = more bullish sentiment
    return Math.max(-1, Math.min(1, (1 - putCallRatio) * 2));
  }

  private async getPositioningSentiment(symbol: string): Promise<number> {
    // Mock positioning sentiment
    return (Math.random() - 0.5) * 2;
  }

  private async saveSentimentSignals(signals: SentimentSignal[]) {
    for (const signal of signals) {
      await supabase
        .from('trading_signals')
        .insert({
          signal_id: `sentiment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          pair: signal.symbol,
          signal_type: signal.sentiment > 0 ? 'buy' : 'sell',
          confidence: signal.confidence,
          strength: Math.round(Math.abs(signal.sentiment) * 10),
          entry_price: 1.1000,
          stop_loss: signal.sentiment > 0 ? 1.0950 : 1.1050,
          take_profit: signal.sentiment > 0 ? 1.1100 : 1.0900,
          risk_reward_ratio: 2.0,
          confluence_score: signal.confidence,
          factors: signal.components,
          description: `Alternative data sentiment signal`,
          alert_level: signal.confidence > 0.7 ? 'high' : 'medium'
        });
    }
  }

  private async saveEconomicSurpriseIndex(
    currency: string,
    surpriseIndex: number,
    trendDirection: string,
    confidence: number
  ) {
    await supabase
      .from('trading_signals')
      .insert({
        signal_id: `eco_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pair: `${currency}/USD`,
        signal_type: surpriseIndex > 0 ? 'buy' : 'sell',
        confidence: confidence,
        strength: Math.round(Math.abs(surpriseIndex) * 10),
        entry_price: 1.1000,
        stop_loss: surpriseIndex > 0 ? 1.0950 : 1.1050,
        take_profit: surpriseIndex > 0 ? 1.1100 : 1.0900,
        risk_reward_ratio: 2.0,
        confluence_score: Math.abs(surpriseIndex) * 10,
        factors: {
          surprise_index: surpriseIndex,
          trend_direction: trendDirection,
          data_type: 'economic_surprise'
        },
        description: `Economic surprise index signal`,
        alert_level: Math.abs(surpriseIndex) > 0.5 ? 'high' : 'medium'
      });
  }

  private calculateConfidence(scores: number[]): number {
    // Calculate confidence based on agreement between different sentiment sources
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower standard deviation = higher confidence
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

      // Combine all signals for overall recommendation
      const sentimentScore = sentiment[0]?.sentiment || 0;
      const economicScore = economicSurprise.surpriseIndex;
      const crossAssetScore = crossAsset.overallSignal;
      
      const overallScore = (sentimentScore + economicScore + crossAssetScore) / 3;
      const overallRecommendation = overallScore > 0.2 ? 'BUY' : 
                                   overallScore < -0.2 ? 'SELL' : 'HOLD';
      
      const confidence = Math.min(0.95, (
        (sentiment[0]?.confidence || 0) +
        economicSurprise.confidence +
        Math.abs(crossAsset.overallSignal)
      ) / 3);

      return {
        sentiment,
        economicSurprise,
        crossAsset,
        intermarket,
        overallRecommendation,
        confidence
      };
    } catch (error) {
      console.error('❌ Error getting comprehensive alternative data signal:', error);
      return {
        sentiment: [],
        economicSurprise: { surpriseIndex: 0, trendDirection: 'neutral', confidence: 0, recentEvents: [] },
        crossAsset: { bondYieldSpread: 0, equityMomentum: 0, commodityCorrelation: 0, volatilityRegime: 'medium', overallSignal: 0 },
        intermarket: { dollarIndex: 103.5, goldSilverRatio: 75, yieldCurveSlope: 1.2, cryptoCorrelation: 0, riskOnOffSentiment: 0 },
        overallRecommendation: 'HOLD',
        confidence: 0
      };
    }
  }
}

export const alternativeDataIntegration = new AlternativeDataIntegration();