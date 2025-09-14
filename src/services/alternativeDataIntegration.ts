// ============= PHASE C: ALTERNATIVE DATA INTEGRATION =============
import { supabase } from '@/integrations/supabase/client';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  source: string;
  publishedAt: Date;
  sentiment: number; // -1 to 1
  impact: 'high' | 'medium' | 'low';
  relevance: number; // 0 to 1
  entities: string[];
  keywords: string[];
}

interface EconomicEvent {
  id: string;
  name: string;
  country: string;
  currency: string;
  impact: 'high' | 'medium' | 'low';
  previousValue: number | null;
  forecastValue: number | null;
  actualValue: number | null;
  releaseTime: Date;
  surprise: number; // (actual - forecast) / |forecast|
  marketImpact: number;
}

interface OptionsFlow {
  symbol: string;
  optionType: 'call' | 'put';
  strike: number;
  expiry: Date;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  timestamp: Date;
  flowType: 'unusual' | 'sweep' | 'large_block';
}

interface PositioningData {
  symbol: string;
  assetClass: string;
  longPositions: number;
  shortPositions: number;
  netPositioning: number;
  leverageRatio: number;
  concentrationRisk: number;
  timestamp: Date;
  dataSource: string;
}

interface SentimentSignal {
  symbol: string;
  sentiment: number; // -1 to 1
  confidence: number; // 0 to 1
  sources: string[];
  timestamp: Date;
  components: {
    news: number;
    social: number;
    options: number;
    positioning: number;
  };
}

class AlternativeDataIntegration {
  private newsCache: Map<string, NewsItem[]> = new Map();
  private economicCache: Map<string, EconomicEvent[]> = new Map();
  private sentimentCache: Map<string, number> = new Map();

  // ============= NEWS SENTIMENT ANALYSIS =============
  async analyzeNewsSentiment(
    symbols: string[] = ['EUR/USD'],
    timeframe: number = 24, // hours
    sources: string[] = ['reuters', 'bloomberg', 'forexlive']
  ): Promise<SentimentSignal[]> {
    
    const sentimentSignals: SentimentSignal[] = [];
    
    for (const symbol of symbols) {
      try {
        // Fetch recent news
        const newsItems = await this.fetchNewsData(symbol, timeframe, sources);
        
        if (newsItems.length === 0) {
          continue;
        }

        // Analyze sentiment
        const sentimentScores = await Promise.all(
          newsItems.map(item => this.analyzeSentimentScore(item))
        );

        // Calculate weighted sentiment
        const totalWeight = newsItems.reduce((sum, item) => sum + item.relevance, 0);
        const weightedSentiment = sentimentScores.reduce((sum, score, index) => {
          return sum + (score * newsItems[index].relevance);
        }, 0) / totalWeight;

        // Calculate confidence based on volume and agreement
        const sentimentVariance = this.calculateSentimentVariance(sentimentScores);
        const confidence = Math.max(0, 1 - sentimentVariance) * Math.min(1, newsItems.length / 10);

        sentimentSignals.push({
          symbol,
          sentiment: weightedSentiment,
          confidence,
          sources: [...new Set(newsItems.map(item => item.source))],
          timestamp: new Date(),
          components: {
            news: weightedSentiment,
            social: await this.getSocialSentiment(symbol),
            options: await this.getOptionsSentiment(symbol),
            positioning: await this.getPositioningSentiment(symbol)
          }
        });

      } catch (error) {
        console.error(`❌ Error analyzing sentiment for ${symbol}:`, error);
      }
    }

    // Save sentiment signals
    await this.saveSentimentSignals(sentimentSignals);

    return sentimentSignals;
  }

  private async fetchNewsData(symbol: string, timeframe: number, sources: string[]): Promise<NewsItem[]> {
    // Check cache first
    const cacheKey = `${symbol}_${timeframe}_${sources.join(',')}`;
    if (this.newsCache.has(cacheKey)) {
      const cached = this.newsCache.get(cacheKey)!;
      const cacheAge = Date.now() - cached[0]?.publishedAt.getTime();
      if (cacheAge < 30 * 60 * 1000) { // 30 minutes
        return cached;
      }
    }

    // Mock news data (in production, integrate with real news APIs)
    const mockNews: NewsItem[] = [
      {
        id: `news_${Date.now()}_1`,
        title: "ECB Signals Potential Rate Adjustment Amid Economic Uncertainty",
        content: "The European Central Bank indicated today that monetary policy adjustments may be necessary...",
        source: "reuters",
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        sentiment: -0.3,
        impact: 'high',
        relevance: 0.9,
        entities: ['ECB', 'EUR', 'monetary policy'],
        keywords: ['rates', 'policy', 'economic uncertainty']
      },
      {
        id: `news_${Date.now()}_2`,
        title: "US Dollar Strengthens on Strong Employment Data",
        content: "The US dollar gained against major currencies following better-than-expected jobs report...",
        source: "bloomberg",
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        sentiment: 0.5,
        impact: 'medium',
        relevance: 0.7,
        entities: ['USD', 'employment', 'jobs report'],
        keywords: ['dollar', 'employment', 'strengthens']
      }
    ];

    // Cache the results
    this.newsCache.set(cacheKey, mockNews);

    return mockNews;
  }

  private async analyzeSentimentScore(newsItem: NewsItem): Promise<number> {
    // Simple keyword-based sentiment analysis (in production, use NLP APIs)
    const positiveKeywords = ['strengthen', 'rise', 'gain', 'bullish', 'positive', 'growth', 'improve'];
    const negativeKeywords = ['weaken', 'fall', 'decline', 'bearish', 'negative', 'recession', 'concern'];
    
    const content = (newsItem.title + ' ' + newsItem.content).toLowerCase();
    
    let score = 0;
    positiveKeywords.forEach(word => {
      const matches = (content.match(new RegExp(word, 'g')) || []).length;
      score += matches * 0.1;
    });
    
    negativeKeywords.forEach(word => {
      const matches = (content.match(new RegExp(word, 'g')) || []).length;
      score -= matches * 0.1;
    });
    
    // Normalize to -1 to 1 range
    return Math.max(-1, Math.min(1, score));
  }

  // ============= ECONOMIC CALENDAR & SURPRISE INDEX =============
  async calculateEconomicSurpriseIndex(
    currency: string = 'EUR',
    period: number = 30 // days
  ): Promise<{
    surpriseIndex: number;
    events: EconomicEvent[];
    trendDirection: 'improving' | 'deteriorating' | 'stable';
    confidence: number;
  }> {
    
    const events = await this.fetchEconomicEvents(currency, period);
    
    if (events.length === 0) {
      return {
        surpriseIndex: 0,
        events: [],
        trendDirection: 'stable',
        confidence: 0
      };
    }

    // Calculate weighted surprise index
    const weightedSurprises = events.map(event => {
      const impactWeight = event.impact === 'high' ? 1.0 : event.impact === 'medium' ? 0.6 : 0.3;
      return event.surprise * impactWeight;
    });

    const surpriseIndex = weightedSurprises.reduce((sum, surprise) => sum + surprise, 0) / events.length;

    // Calculate trend direction
    const recentEvents = events.slice(0, Math.floor(events.length / 2));
    const olderEvents = events.slice(Math.floor(events.length / 2));
    
    const recentAvg = recentEvents.reduce((sum, e) => sum + e.surprise, 0) / recentEvents.length;
    const olderAvg = olderEvents.reduce((sum, e) => sum + e.surprise, 0) / olderEvents.length;
    
    const trendDifference = recentAvg - olderAvg;
    let trendDirection: 'improving' | 'deteriorating' | 'stable';
    
    if (trendDifference > 0.1) trendDirection = 'improving';
    else if (trendDifference < -0.1) trendDirection = 'deteriorating';
    else trendDirection = 'stable';

    const confidence = Math.min(1, events.length / 20); // More events = higher confidence

    // Save to database
    await this.saveEconomicSurpriseIndex(currency, surpriseIndex, trendDirection, confidence);

    return {
      surpriseIndex,
      events,
      trendDirection,
      confidence
    };
  }

  private async fetchEconomicEvents(currency: string, period: number): Promise<EconomicEvent[]> {
    const cacheKey = `economic_${currency}_${period}`;
    if (this.economicCache.has(cacheKey)) {
      return this.economicCache.get(cacheKey)!;
    }

    // Fetch from database
    const { data } = await supabase
      .from('economic_calendar')
      .select('*')
      .eq('currency', currency)
      .gte('event_time', new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString())
      .order('event_time', { ascending: false });

    const events: EconomicEvent[] = (data || []).map(event => ({
      id: event.id,
      name: event.event_name,
      country: 'EUR', // Simplified
      currency: event.currency,
      impact: event.impact_level as 'high' | 'medium' | 'low',
      previousValue: parseFloat(event.previous_value) || null,
      forecastValue: parseFloat(event.forecast_value) || null,
      actualValue: parseFloat(event.actual_value) || null,
      releaseTime: new Date(event.event_time),
      surprise: this.calculateSurprise(
        parseFloat(event.actual_value) || 0,
        parseFloat(event.forecast_value) || 0
      ),
      marketImpact: 0 // Would be calculated based on price movement
    }));

    this.economicCache.set(cacheKey, events);
    return events;
  }

  private calculateSurprise(actual: number, forecast: number): number {
    if (forecast === 0) return 0;
    return (actual - forecast) / Math.abs(forecast);
  }

  // ============= OPTIONS FLOW ANALYSIS =============
  async analyzeOptionsFlow(
    symbol: string = 'EUR/USD',
    timeframe: number = 24 // hours
  ): Promise<{
    flowSentiment: number;
    unusualActivity: OptionsFlow[];
    impliedVolatilitySkew: number;
    putCallRatio: number;
    largestFlows: OptionsFlow[];
  }> {
    
    // Mock options data (in production, integrate with options data providers)
    const mockOptionsFlow: OptionsFlow[] = [
      {
        symbol,
        optionType: 'call',
        strike: 1.1750,
        expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        volume: 5000,
        openInterest: 12000,
        impliedVolatility: 0.12,
        delta: 0.45,
        gamma: 0.02,
        theta: -0.005,
        vega: 0.03,
        timestamp: new Date(),
        flowType: 'unusual'
      },
      {
        symbol,
        optionType: 'put',
        strike: 1.1650,
        expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        volume: 3000,
        openInterest: 8000,
        impliedVolatility: 0.15,
        delta: -0.35,
        gamma: 0.015,
        theta: -0.003,
        vega: 0.025,
        timestamp: new Date(),
        flowType: 'sweep'
      }
    ];

    // Calculate flow sentiment
    const callVolume = mockOptionsFlow.filter(f => f.optionType === 'call').reduce((sum, f) => sum + f.volume, 0);
    const putVolume = mockOptionsFlow.filter(f => f.optionType === 'put').reduce((sum, f) => sum + f.volume, 0);
    const putCallRatio = callVolume > 0 ? putVolume / callVolume : 0;
    const flowSentiment = putCallRatio > 1 ? -0.5 : 0.5; // Simplified

    // Calculate IV skew
    const callIVs = mockOptionsFlow.filter(f => f.optionType === 'call').map(f => f.impliedVolatility);
    const putIVs = mockOptionsFlow.filter(f => f.optionType === 'put').map(f => f.impliedVolatility);
    
    const avgCallIV = callIVs.reduce((sum, iv) => sum + iv, 0) / callIVs.length;
    const avgPutIV = putIVs.reduce((sum, iv) => sum + iv, 0) / putIVs.length;
    const impliedVolatilitySkew = avgPutIV - avgCallIV;

    const unusualActivity = mockOptionsFlow.filter(f => f.flowType === 'unusual');
    const largestFlows = mockOptionsFlow.sort((a, b) => b.volume - a.volume).slice(0, 5);

    return {
      flowSentiment,
      unusualActivity,
      impliedVolatilitySkew,
      putCallRatio,
      largestFlows
    };
  }

  // ============= CROSS-ASSET MOMENTUM & CORRELATION =============
  async analyzeCrossAssetSignals(): Promise<{
    momentum: { [asset: string]: number };
    correlations: { [pair: string]: number };
    divergences: string[];
    regimeChanges: string[];
  }> {
    
    const assets = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'DXY', 'SPX', 'VIX', 'GOLD'];
    const momentum: { [asset: string]: number } = {};
    const correlations: { [pair: string]: number } = {};
    const divergences: string[] = [];
    const regimeChanges: string[] = [];

    // Calculate momentum for each asset
    for (const asset of assets) {
      momentum[asset] = await this.calculateAssetMomentum(asset);
    }

    // Calculate correlations between asset pairs
    for (let i = 0; i < assets.length; i++) {
      for (let j = i + 1; j < assets.length; j++) {
        const pair = `${assets[i]}/${assets[j]}`;
        correlations[pair] = await this.calculateCorrelation(assets[i], assets[j]);
        
        // Detect divergences
        if (Math.abs(correlations[pair]) < 0.3 && 
            Math.sign(momentum[assets[i]]) !== Math.sign(momentum[assets[j]])) {
          divergences.push(pair);
        }
      }
    }

    // Detect regime changes
    for (const asset of assets) {
      const recentCorrelations = await this.getRecentCorrelations(asset);
      if (this.detectRegimeChange(recentCorrelations)) {
        regimeChanges.push(asset);
      }
    }

    return {
      momentum,
      correlations,
      divergences,
      regimeChanges
    };
  }

  private async calculateAssetMomentum(asset: string, period: number = 20): Promise<number> {
    // Mock momentum calculation (in production, use real price data)
    const returns = [];
    for (let i = 0; i < period; i++) {
      returns.push((Math.random() - 0.5) * 0.02); // Random returns
    }
    
    return returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  }

  private async calculateCorrelation(asset1: string, asset2: string, period: number = 60): Promise<number> {
    // Fetch correlation from database
    const { data } = await supabase
      .from('correlations')
      .select('correlation_value')
      .eq('asset_a', asset1)
      .eq('asset_b', asset2)
      .order('calculation_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data?.correlation_value || Math.random() * 2 - 1; // Fallback to random
  }

  private async getRecentCorrelations(asset: string): Promise<number[]> {
    const { data } = await supabase
      .from('correlations')
      .select('correlation_value')
      .or(`asset_a.eq.${asset},asset_b.eq.${asset}`)
      .order('calculation_date', { ascending: false })
      .limit(30);

    return (data || []).map(d => d.correlation_value);
  }

  private detectRegimeChange(correlations: number[]): boolean {
    if (correlations.length < 20) return false;
    
    const recent = correlations.slice(0, 10);
    const older = correlations.slice(10, 20);
    
    const recentAvg = recent.reduce((sum, c) => sum + c, 0) / recent.length;
    const olderAvg = older.reduce((sum, c) => sum + c, 0) / older.length;
    
    return Math.abs(recentAvg - olderAvg) > 0.3; // Significant change
  }

  // ============= HELPER METHODS =============
  private calculateSentimentVariance(scores: number[]): number {
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    return Math.sqrt(variance);
  }

  private async getSocialSentiment(symbol: string): Promise<number> {
    // Mock social sentiment (in production, integrate with social media APIs)
    return (Math.random() - 0.5) * 2;
  }

  private async getOptionsSentiment(symbol: string): Promise<number> {
    const optionsData = await this.analyzeOptionsFlow(symbol);
    return optionsData.flowSentiment;
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
          entry_price: 0, // Would be filled with current market price
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
    // Save to a dedicated table or add to existing signals
    await supabase
      .from('trading_signals')
      .insert({
        pair: `${currency}/USD`,
        signal_type: surpriseIndex > 0 ? 'buy' : 'sell',
        confidence: confidence,
        strength: Math.round(Math.abs(surpriseIndex) * 10),
        entry_price: 0,
        stop_loss: 0,
        take_profit: 0,
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

  // ============= PUBLIC API =============
  async generateComprehensiveSignal(symbol: string = 'EUR/USD'): Promise<{
    overallSentiment: number;
    confidence: number;
    components: {
      news: number;
      economic: number;
      options: number;
      crossAsset: number;
    };
    riskFactors: string[];
    recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  }> {
    
    // Gather all alternative data signals
    const [
      sentimentSignals,
      economicSurprise,
      optionsFlow,
      crossAssetData
    ] = await Promise.all([
      this.analyzeNewsSentiment([symbol]),
      this.calculateEconomicSurpriseIndex(),
      this.analyzeOptionsFlow(symbol),
      this.analyzeCrossAssetSignals()
    ]);

    // Extract component scores
    const newsScore = sentimentSignals[0]?.sentiment || 0;
    const economicScore = economicSurprise.surpriseIndex;
    const optionsScore = optionsFlow.flowSentiment;
    const crossAssetScore = crossAssetData.momentum[symbol] || 0;

    // Calculate weighted overall sentiment
    const weights = { news: 0.3, economic: 0.3, options: 0.2, crossAsset: 0.2 };
    const overallSentiment = 
      weights.news * newsScore +
      weights.economic * economicScore +
      weights.options * optionsScore +
      weights.crossAsset * crossAssetScore;

    // Calculate confidence
    const sentimentConfidence = sentimentSignals[0]?.confidence || 0;
    const economicConfidence = economicSurprise.confidence;
    const confidence = (sentimentConfidence + economicConfidence) / 2;

    // Identify risk factors
    const riskFactors: string[] = [];
    if (crossAssetData.divergences.some(d => d.includes(symbol))) {
      riskFactors.push('Cross-asset divergence detected');
    }
    if (crossAssetData.regimeChanges.includes(symbol)) {
      riskFactors.push('Market regime change in progress');
    }
    if (Math.abs(optionsFlow.impliedVolatilitySkew) > 0.05) {
      riskFactors.push('Elevated volatility skew');
    }

    // Generate recommendation
    let recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
    if (overallSentiment > 0.5 && confidence > 0.7) recommendation = 'strong_buy';
    else if (overallSentiment > 0.2) recommendation = 'buy';
    else if (overallSentiment > -0.2) recommendation = 'hold';
    else if (overallSentiment > -0.5) recommendation = 'sell';
    else recommendation = 'strong_sell';

    return {
      overallSentiment,
      confidence,
      components: {
        news: newsScore,
        economic: economicScore,
        options: optionsScore,
        crossAsset: crossAssetScore
      },
      riskFactors,
      recommendation
    };
  }
}

export const alternativeDataIntegration = new AlternativeDataIntegration();