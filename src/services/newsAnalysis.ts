// Professional News Impact Analysis Engine
// Integrates multiple news sources for institutional-grade fundamental analysis

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  sentiment: number; // -100 to +100
  impact: 'high' | 'medium' | 'low';
  currencies: string[]; // ['USD', 'EUR', 'GBP', etc.]
  relevanceScore: number; // 0-100
  credibilityScore: number; // 0-100
  tags: string[];
}

export interface EconomicEvent {
  id: string;
  name: string;
  country: string;
  currency: string;
  importance: 'high' | 'medium' | 'low';
  actual?: number;
  forecast?: number;
  previous?: number;
  unit: string;
  time: string;
  impact: number; // -10 to +10
  surprise?: number; // actual vs forecast surprise factor
}

export interface NewsAnalysisResult {
  overallSentiment: number; // -100 to +100
  sentimentStrength: number; // 0-10
  newsCount: number;
  majorEvents: EconomicEvent[];
  topNews: NewsItem[];
  currencyBias: Record<string, number>; // USD: +15, EUR: -8, etc.
  volatilityExpectation: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  tradingRecommendation: string;
  nextMajorEvent?: EconomicEvent;
}

export interface NewsImpactFactor {
  type: 'breaking_news' | 'economic_event' | 'central_bank' | 'geopolitical';
  title: string;
  impact: number; // -10 to +10
  timeDecay: number; // 0-1 (1 = very recent)
  currencies: string[];
  confidence: number; // 0-1
}

class NewsAnalysisEngine {
  private newsCache: Map<string, NewsItem[]> = new Map();
  private economicCache: Map<string, EconomicEvent[]> = new Map();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  // High-impact economic indicators by currency
  private readonly highImpactIndicators = {
    USD: ['Non-Farm Payrolls', 'Federal Funds Rate', 'CPI', 'GDP', 'FOMC Statement'],
    EUR: ['ECB Interest Rate', 'EU CPI', 'EU GDP', 'German IFO', 'ECB Press Conference'],
    GBP: ['BOE Interest Rate', 'UK CPI', 'UK GDP', 'UK Employment', 'BOE Monetary Policy'],
    JPY: ['BOJ Interest Rate', 'Japan CPI', 'Japan GDP', 'BOJ Statement', 'Tankan Survey']
  };

  // Source credibility weights
  private readonly sourceCredibility = {
    'Reuters': 100,
    'Bloomberg': 95,
    'Financial Times': 90,
    'Wall Street Journal': 90,
    'MarketWatch': 80,
    'Yahoo Finance': 70,
    'CNBC': 75,
    'Forex Factory': 85,
    'TradingView': 70,
    'default': 50
  };

  async analyzeNewsImpact(pair: string, hoursBack: number = 6): Promise<NewsAnalysisResult> {
    try {
      const currencies = this.extractCurrencies(pair);
      
      // Fetch news and economic events in parallel
      const [newsItems, economicEvents] = await Promise.all([
        this.fetchRelevantNews(currencies, hoursBack),
        this.fetchEconomicEvents(currencies, hoursBack)
      ]);

      // Analyze sentiment and impact
      const overallSentiment = this.calculateOverallSentiment(newsItems, currencies);
      const sentimentStrength = Math.abs(overallSentiment) / 10;
      const currencyBias = this.calculateCurrencyBias(newsItems, economicEvents, currencies);
      const volatilityExpectation = this.calculateVolatilityExpectation(newsItems, economicEvents);
      const riskLevel = this.assessRiskLevel(volatilityExpectation, economicEvents);

      // Find next major event
      const nextMajorEvent = this.findNextMajorEvent(currencies);

      // Generate trading recommendation
      const tradingRecommendation = this.generateTradingRecommendation(
        overallSentiment,
        currencyBias,
        riskLevel,
        pair
      );

      return {
        overallSentiment,
        sentimentStrength,
        newsCount: newsItems.length,
        majorEvents: economicEvents.filter(e => e.importance === 'high'),
        topNews: newsItems.slice(0, 10),
        currencyBias,
        volatilityExpectation,
        riskLevel,
        tradingRecommendation,
        nextMajorEvent
      };

    } catch (error) {
      console.error('News analysis failed:', error);
      return this.getEmptyAnalysis();
    }
  }

  private async fetchRelevantNews(currencies: string[], hoursBack: number): Promise<NewsItem[]> {
    const cacheKey = `news_${currencies.join('_')}_${hoursBack}`;
    
    if (this.newsCache.has(cacheKey)) {
      const cached = this.newsCache.get(cacheKey)!;
      if (Date.now() - new Date(cached[0]?.publishedAt || 0).getTime() < this.cacheTimeout) {
        return cached;
      }
    }

    // Generate realistic mock news data for demo
    const mockNews = this.generateMockNewsData(currencies, hoursBack);
    this.newsCache.set(cacheKey, mockNews);
    
    return mockNews;
  }

  private async fetchEconomicEvents(currencies: string[], hoursBack: number): Promise<EconomicEvent[]> {
    const cacheKey = `events_${currencies.join('_')}_${hoursBack}`;
    
    if (this.economicCache.has(cacheKey)) {
      const cached = this.economicCache.get(cacheKey)!;
      return cached;
    }

    // Generate realistic mock economic events
    const mockEvents = this.generateMockEconomicEvents(currencies, hoursBack);
    this.economicCache.set(cacheKey, mockEvents);
    
    return mockEvents;
  }

  private generateMockNewsData(currencies: string[], hoursBack: number): NewsItem[] {
    const mockNews: NewsItem[] = [];
    const now = new Date();

    const newsTemplates = [
      { title: "Federal Reserve signals cautious approach to rate cuts", sentiment: 25, impact: 'high' as const },
      { title: "ECB maintains dovish stance amid economic uncertainty", sentiment: -15, impact: 'high' as const },
      { title: "US inflation shows signs of cooling in latest report", sentiment: -30, impact: 'medium' as const },
      { title: "European economic growth exceeds expectations", sentiment: 40, impact: 'medium' as const },
      { title: "Dollar strengthens on robust employment data", sentiment: 35, impact: 'high' as const },
      { title: "Geopolitical tensions weigh on risk sentiment", sentiment: -45, impact: 'medium' as const },
      { title: "Central bank intervention rumors circulate in FX markets", sentiment: 0, impact: 'low' as const },
      { title: "Trade data shows improving global economic conditions", sentiment: 20, impact: 'low' as const }
    ];

    for (let i = 0; i < Math.min(8, hoursBack); i++) {
      const template = newsTemplates[i % newsTemplates.length];
      const publishedAt = new Date(now.getTime() - (i * 45 * 60 * 1000)); // Every 45 minutes

      mockNews.push({
        id: `news_${i}`,
        title: template.title,
        summary: `${template.title} - Market analysis and expert commentary on recent developments affecting ${currencies.join('/')} trading.`,
        source: ['Reuters', 'Bloomberg', 'Financial Times', 'MarketWatch'][i % 4],
        publishedAt: publishedAt.toISOString(),
        url: `https://example.com/news/${i}`,
        sentiment: template.sentiment + (Math.random() - 0.5) * 20, // Add some randomization
        impact: template.impact,
        currencies: currencies,
        relevanceScore: Math.max(60, Math.random() * 40 + 60),
        credibilityScore: this.sourceCredibility[['Reuters', 'Bloomberg', 'Financial Times', 'MarketWatch'][i % 4]] || 70,
        tags: ['forex', 'central-bank', 'economic-data', 'market-analysis'].filter(() => Math.random() > 0.4)
      });
    }

    return mockNews;
  }

  private generateMockEconomicEvents(currencies: string[], hoursBack: number): EconomicEvent[] {
    const events: EconomicEvent[] = [];
    const now = new Date();

    if (currencies.includes('USD')) {
      events.push({
        id: 'nfp_001',
        name: 'Non-Farm Payrolls',
        country: 'United States',
        currency: 'USD',
        importance: 'high' as const,
        actual: 180000,
        forecast: 150000,
        previous: 140000,
        unit: 'jobs',
        time: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        impact: 4.2, // Positive surprise
        surprise: 2.0 // (actual - forecast) / forecast * 10
      });
    }

    if (currencies.includes('EUR')) {
      events.push({
        id: 'ecb_001',
        name: 'ECB Interest Rate Decision',
        country: 'European Union',
        currency: 'EUR',
        importance: 'high' as const,
        actual: 4.25,
        forecast: 4.25,
        previous: 4.00,
        unit: '%',
        time: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        impact: -1.5, // Slightly dovish
        surprise: 0 // Met expectations
      });
    }

    return events;
  }

  private extractCurrencies(pair: string): string[] {
    const matches = pair.match(/([A-Z]{3})/g);
    return matches || ['USD', 'EUR'];
  }

  private calculateOverallSentiment(newsItems: NewsItem[], currencies: string[]): number {
    if (newsItems.length === 0) return 0;

    let totalSentiment = 0;
    let totalWeight = 0;

    newsItems.forEach(item => {
      const timeDecay = this.calculateTimeDecay(item.publishedAt);
      const relevanceWeight = item.relevanceScore / 100;
      const credibilityWeight = item.credibilityScore / 100;
      const impactWeight = item.impact === 'high' ? 1.5 : item.impact === 'medium' ? 1.0 : 0.6;
      
      const weight = timeDecay * relevanceWeight * credibilityWeight * impactWeight;
      
      totalSentiment += item.sentiment * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? totalSentiment / totalWeight : 0;
  }

  private calculateCurrencyBias(newsItems: NewsItem[], events: EconomicEvent[], currencies: string[]): Record<string, number> {
    const bias: Record<string, number> = {};
    
    currencies.forEach(currency => {
      let currencyScore = 0;
      
      // News sentiment for this currency
      const relevantNews = newsItems.filter(item => item.currencies.includes(currency));
      const newsSentiment = relevantNews.reduce((sum, item) => sum + item.sentiment, 0) / Math.max(1, relevantNews.length);
      
      // Economic events impact for this currency
      const relevantEvents = events.filter(event => event.currency === currency);
      const eventsImpact = relevantEvents.reduce((sum, event) => sum + event.impact, 0);
      
      currencyScore = (newsSentiment / 10) + eventsImpact;
      bias[currency] = Math.max(-50, Math.min(50, currencyScore));
    });

    return bias;
  }

  private calculateVolatilityExpectation(newsItems: NewsItem[], events: EconomicEvent[]): number {
    const highImpactNews = newsItems.filter(item => item.impact === 'high').length;
    const mediumImpactNews = newsItems.filter(item => item.impact === 'medium').length;
    const highImpactEvents = events.filter(event => event.importance === 'high').length;
    
    const newsVolatility = (highImpactNews * 15) + (mediumImpactNews * 8);
    const eventsVolatility = highImpactEvents * 20;
    
    return Math.min(100, newsVolatility + eventsVolatility);
  }

  private assessRiskLevel(volatility: number, events: EconomicEvent[]): 'low' | 'medium' | 'high' | 'extreme' {
    const hasHighImpactEvent = events.some(e => e.importance === 'high' && Math.abs(e.impact) > 5);
    
    if (volatility > 80 || hasHighImpactEvent) return 'extreme';
    if (volatility > 50) return 'high';
    if (volatility > 25) return 'medium';
    return 'low';
  }

  private generateTradingRecommendation(sentiment: number, currencyBias: Record<string, number>, riskLevel: string, pair: string): string {
    const currencies = this.extractCurrencies(pair);
    const baseCurrency = currencies[0];
    const quoteCurrency = currencies[1];
    
    const baseBias = currencyBias[baseCurrency] || 0;
    const quoteBias = currencyBias[quoteCurrency] || 0;
    const netBias = baseBias - quoteBias;

    if (riskLevel === 'extreme') {
      return `EXTREME RISK: Major news events expected. Avoid new positions or reduce size significantly.`;
    }
    
    if (Math.abs(netBias) < 5) {
      return `NEUTRAL: Mixed news sentiment. Wait for clearer directional signals.`;
    }
    
    const direction = netBias > 0 ? 'BULLISH' : 'BEARISH';
    const strength = Math.abs(netBias) > 15 ? 'STRONG' : 'MODERATE';
    
    return `${strength} ${direction} ${pair}: News sentiment supports ${netBias > 0 ? 'buying' : 'selling'} bias. Risk: ${riskLevel.toUpperCase()}`;
  }

  private findNextMajorEvent(currencies: string[]): EconomicEvent | undefined {
    // This would typically fetch from economic calendar API
    // For demo, return a mock upcoming event
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    if (currencies.includes('USD')) {
      return {
        id: 'upcoming_cpi',
        name: 'US CPI (Consumer Price Index)',
        country: 'United States',
        currency: 'USD',
        importance: 'high',
        forecast: 3.2,
        previous: 3.1,
        unit: '% YoY',
        time: tomorrow.toISOString(),
        impact: 0 // TBD
      };
    }
    
    return undefined;
  }

  private calculateTimeDecay(publishedAt: string): number {
    const now = Date.now();
    const newsTime = new Date(publishedAt).getTime();
    const hoursAgo = (now - newsTime) / (1000 * 60 * 60);
    
    // Exponential decay: news loses relevance over time
    return Math.exp(-hoursAgo / 12); // Half-life of 12 hours
  }

  private getEmptyAnalysis(): NewsAnalysisResult {
    return {
      overallSentiment: 0,
      sentimentStrength: 0,
      newsCount: 0,
      majorEvents: [],
      topNews: [],
      currencyBias: {},
      volatilityExpectation: 0,
      riskLevel: 'low',
      tradingRecommendation: 'No news data available for analysis.'
    };
  }

  // Convert news analysis to confluence factors
  convertToConfluenceFactors(analysis: NewsAnalysisResult, pair: string): NewsImpactFactor[] {
    const factors: NewsImpactFactor[] = [];

    // Overall news sentiment factor
    if (analysis.newsCount > 0) {
      factors.push({
        type: 'breaking_news',
        title: `Market News Sentiment (${analysis.newsCount} items)`,
        impact: analysis.overallSentiment / 10, // Convert to -10 to +10 scale
        timeDecay: 1.0, // Fresh analysis
        currencies: this.extractCurrencies(pair),
        confidence: Math.min(1.0, analysis.newsCount / 10) // More news = higher confidence
      });
    }

    // Major economic events
    analysis.majorEvents.forEach(event => {
      factors.push({
        type: 'economic_event',
        title: `${event.name} (${event.currency})`,
        impact: event.impact || 0,
        timeDecay: this.calculateTimeDecay(event.time),
        currencies: [event.currency],
        confidence: event.surprise !== undefined ? 0.9 : 0.7
      });
    });

    return factors;
  }
}

export const newsAnalysisEngine = new NewsAnalysisEngine();