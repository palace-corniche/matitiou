import { supabase } from '@/integrations/supabase/client';
import { multiApiManager } from './multiApiManager';

export interface FundamentalNewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  sentiment: number; // -100 to +100
  impact: 'high' | 'medium' | 'low';
  currencies: string[];
  relevanceScore: number; // 0-100
  tags: string[];
  timeframe: 'lastHour' | 'today' | 'thisWeek' | 'thisMonth';
}

export interface FundamentalEconomicEvent {
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
  surprise?: number;
  timeframe: 'lastHour' | 'today' | 'thisWeek' | 'thisMonth';
}

export interface FundamentalAnalysisData {
  lastHour: {
    news: FundamentalNewsItem[];
    events: FundamentalEconomicEvent[];
    sentiment: number;
    eventCount: number;
  };
  today: {
    news: FundamentalNewsItem[];
    events: FundamentalEconomicEvent[];
    sentiment: number;
    eventCount: number;
  };
  thisWeek: {
    news: FundamentalNewsItem[];
    events: FundamentalEconomicEvent[];
    sentiment: number;
    eventCount: number;
  };
  thisMonth: {
    news: FundamentalNewsItem[];
    events: FundamentalEconomicEvent[];
    sentiment: number;
    eventCount: number;
  };
}

class RealTimeFundamentalDataService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly cacheTimeout = {
    news: 1 * 60 * 1000, // 1 minute for news
    events: 5 * 60 * 1000, // 5 minutes for economic events
    calendar: 15 * 60 * 1000 // 15 minutes for calendar data
  };

  // Real economic indicators and their impacts
  private readonly highImpactIndicators = {
    USD: ['Non-Farm Payrolls', 'Federal Funds Rate', 'CPI', 'GDP', 'FOMC Statement', 'Unemployment Rate'],
    EUR: ['ECB Interest Rate', 'EU CPI', 'EU GDP', 'German IFO', 'ECB Press Conference', 'EU Unemployment'],
    GBP: ['BOE Interest Rate', 'UK CPI', 'UK GDP', 'UK Employment', 'BOE Monetary Policy', 'UK Retail Sales'],
    JPY: ['BOJ Interest Rate', 'Japan CPI', 'Japan GDP', 'BOJ Statement', 'Tankan Survey', 'Japan Trade Balance'],
    CAD: ['BOC Interest Rate', 'Canada CPI', 'Canada GDP', 'Canada Employment', 'Canada Trade Balance'],
    AUD: ['RBA Interest Rate', 'Australia CPI', 'Australia GDP', 'Australia Employment', 'RBA Statement']
  };

  async getFundamentalData(symbol: string = 'EUR/USD'): Promise<FundamentalAnalysisData> {
    const cacheKey = `fundamental_${symbol}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout.news) {
      return cached.data;
    }

    try {
      const currencies = this.extractCurrencies(symbol);
      const now = new Date();
      
      // Define time periods
      const timeRanges = {
        lastHour: new Date(now.getTime() - 60 * 60 * 1000),
        today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        thisWeek: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        thisMonth: new Date(now.getFullYear(), now.getMonth(), 1)
      };

      // Use Multi-API Manager for maximum reliability
      const [newsData, economicData] = await Promise.all([
        this.fetchMultiApiNews(currencies, timeRanges),
        this.fetchMultiApiEconomicEvents(currencies, timeRanges)
      ]);

      const fundamentalData: FundamentalAnalysisData = {
        lastHour: {
          news: newsData.lastHour,
          events: economicData.lastHour,
          sentiment: this.calculateSentiment(newsData.lastHour, economicData.lastHour),
          eventCount: economicData.lastHour.length
        },
        today: {
          news: newsData.today,
          events: economicData.today,
          sentiment: this.calculateSentiment(newsData.today, economicData.today),
          eventCount: economicData.today.length
        },
        thisWeek: {
          news: newsData.thisWeek,
          events: economicData.thisWeek,
          sentiment: this.calculateSentiment(newsData.thisWeek, economicData.thisWeek),
          eventCount: economicData.thisWeek.length
        },
        thisMonth: {
          news: newsData.thisMonth,
          events: economicData.thisMonth,
          sentiment: this.calculateSentiment(newsData.thisMonth, economicData.thisMonth),
          eventCount: economicData.thisMonth.length
        }
      };

      // Cache the result
      this.cache.set(cacheKey, { data: fundamentalData, timestamp: Date.now() });
      
      return fundamentalData;
    } catch (error) {
      console.error('Error fetching fundamental data:', error);
      return this.getEmptyData();
    }
  }

  private async fetchMultiApiNews(currencies: string[], timeRanges: any) {
    try {
      // Use Multi-API Manager for robust news fetching
      const newsItems = await multiApiManager.getFinancialNews(currencies, {
        from: timeRanges.thisMonth,
        to: new Date()
      });

      // Transform and categorize by timeframe
      const categorizedNews = {
        lastHour: [] as FundamentalNewsItem[],
        today: [] as FundamentalNewsItem[],
        thisWeek: [] as FundamentalNewsItem[],
        thisMonth: [] as FundamentalNewsItem[]
      };

      // Process news from multiple APIs
      newsItems.forEach(news => {
        const publishedAt = new Date(news.publishedAt);
        const transformedNews: FundamentalNewsItem = {
          id: news.id,
          title: news.title,
          summary: news.summary,
          source: news.source,
          publishedAt: news.publishedAt,
          url: news.url,
          sentiment: news.sentiment,
          impact: news.impact,
          currencies: news.currencies,
          relevanceScore: this.calculateRelevance(news.title, currencies),
          tags: this.extractTags(news.title + ' ' + news.summary),
          timeframe: this.categorizeTimeframe(publishedAt, timeRanges)
        };

        const timeframe = transformedNews.timeframe;
        categorizedNews[timeframe].push(transformedNews);
      });

      // Also fetch from Supabase as backup
      const { data: dbNews } = await supabase
        .from('news_events')
        .select('*')
        .gte('published_at', timeRanges.thisMonth.toISOString())
        .order('published_at', { ascending: false })
        .limit(50);

      // Add Supabase news to categorized news
      (dbNews || []).forEach(news => {
        const publishedAt = new Date(news.published_at);
        const transformedNews: FundamentalNewsItem = {
          id: news.id,
          title: news.title,
          summary: news.content || '',
          source: news.source,
          publishedAt: publishedAt.toISOString(),
          url: '',
          sentiment: news.sentiment_score || 0,
          impact: this.classifyImpact(news.title, currencies),
          currencies: currencies,
          relevanceScore: news.relevance_score || 50,
          tags: this.extractTags(news.title),
          timeframe: this.categorizeTimeframe(publishedAt, timeRanges)
        };

        const timeframe = transformedNews.timeframe;
        categorizedNews[timeframe].push(transformedNews);
      });

      return categorizedNews;
    } catch (error) {
      console.error('Error fetching multi-API news:', error);
      return this.getEmptyNewsData();
    }
  }

  private async fetchLiveFinancialNews(currencies: string[]): Promise<any[]> {
    // This would integrate with real news APIs like NewsAPI, Alpha Vantage, etc.
    // For now, return structured live-style data
    const currentEvents = [
      {
        title: "Central Bank Policy Divergence Widens as Fed Maintains Hawkish Stance",
        summary: "Federal Reserve officials signal continued restrictive monetary policy amid persistent inflation concerns",
        source: "Reuters",
        publishedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        impact: 'high'
      },
      {
        title: "European Economic Growth Slows Amid Energy Concerns",
        summary: "Latest GDP figures show eurozone expansion below expectations, raising recession fears",
        source: "Bloomberg",
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        impact: 'medium'
      },
      {
        title: "US Dollar Strength Continues on Robust Employment Data",
        summary: "Strong jobs report reinforces Fed's position, pushing USD higher against major currencies",
        source: "Financial Times",
        publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        impact: 'high'
      }
    ];

    return currentEvents;
  }

  private async fetchMultiApiEconomicEvents(currencies: string[], timeRanges: any) {
    try {
      // Use Multi-API Manager for robust economic data fetching
      const economicEvents = await multiApiManager.getEconomicEvents(currencies, {
        from: timeRanges.thisMonth,
        to: new Date()
      });

      // Transform and categorize
      const categorizedEvents = {
        lastHour: [] as FundamentalEconomicEvent[],
        today: [] as FundamentalEconomicEvent[],
        thisWeek: [] as FundamentalEconomicEvent[],
        thisMonth: [] as FundamentalEconomicEvent[]
      };

      // Process events from multiple APIs
      economicEvents.forEach(event => {
        const eventTime = new Date(event.time);
        const transformedEvent: FundamentalEconomicEvent = {
          id: event.id,
          name: event.name,
          country: event.country,
          currency: event.currency,
          importance: event.importance,
          actual: event.actual,
          forecast: event.forecast,
          previous: event.previous,
          unit: event.unit,
          time: event.time,
          impact: event.impact,
          surprise: this.calculateSurprise(event.actual, event.forecast),
          timeframe: this.categorizeTimeframe(eventTime, timeRanges)
        };

        const timeframe = transformedEvent.timeframe;
        categorizedEvents[timeframe].push(transformedEvent);
      });

      // Also fetch from Supabase as backup
      const { data: dbEvents } = await supabase
        .from('economic_calendar')
        .select('*')
        .gte('event_time', timeRanges.thisMonth.toISOString())
        .order('event_time', { ascending: false })
        .limit(30);

      // Add Supabase events to categorized events
      (dbEvents || []).forEach(event => {
        const eventTime = new Date(event.event_time);
        const transformedEvent: FundamentalEconomicEvent = {
          id: event.id,
          name: event.event_name,
          country: this.getCountryFromCurrency(event.currency),
          currency: event.currency,
          importance: event.impact_level as 'high' | 'medium' | 'low',
          actual: parseFloat(event.actual_value) || undefined,
          forecast: parseFloat(event.forecast_value) || undefined,
          previous: parseFloat(event.previous_value) || undefined,
          unit: '%',
          time: eventTime.toISOString(),
          impact: this.calculateEventImpact(event),
          surprise: this.calculateSurprise(parseFloat(event.actual_value), parseFloat(event.forecast_value)),
          timeframe: this.categorizeTimeframe(eventTime, timeRanges)
        };

        const timeframe = transformedEvent.timeframe;
        categorizedEvents[timeframe].push(transformedEvent);
      });

      return categorizedEvents;
    } catch (error) {
      console.error('Error fetching multi-API economic events:', error);
      return this.getEmptyEventsData();
    }
  }

  private generateCurrentEconomicEvents(currencies: string[], timeRanges: any): any[] {
    const events = [];
    const now = new Date();

    // Generate realistic current events
    if (currencies.includes('USD')) {
      events.push({
        name: 'US Core CPI (Month-over-Month)',
        country: 'United States',
        currency: 'USD',
        importance: 'high',
        actual: 0.3,
        forecast: 0.2,
        previous: 0.2,
        unit: '%',
        time: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
      });
    }

    if (currencies.includes('EUR')) {
      events.push({
        name: 'ECB Monetary Policy Statement',
        country: 'European Union',
        currency: 'EUR',
        importance: 'high',
        actual: null,
        forecast: null,
        previous: null,
        unit: 'statement',
        time: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString()
      });
    }

    return events;
  }

  private extractCurrencies(symbol: string): string[] {
    const matches = symbol.match(/([A-Z]{3})/g);
    return matches || ['USD', 'EUR'];
  }

  private analyzeSentiment(text: string): number {
    // Simple sentiment analysis based on keywords
    const bullishWords = ['growth', 'strong', 'positive', 'increase', 'rise', 'bullish', 'optimistic', 'robust'];
    const bearishWords = ['decline', 'weak', 'negative', 'decrease', 'fall', 'bearish', 'pessimistic', 'recession'];
    
    const lowerText = text.toLowerCase();
    let sentiment = 0;
    
    bullishWords.forEach(word => {
      const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
      sentiment += matches * 20;
    });
    
    bearishWords.forEach(word => {
      const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
      sentiment -= matches * 20;
    });
    
    return Math.max(-100, Math.min(100, sentiment));
  }

  private classifyImpact(title: string, currencies: string[]): 'high' | 'medium' | 'low' {
    const highImpactKeywords = ['central bank', 'interest rate', 'cpi', 'gdp', 'employment', 'nfp', 'fomc'];
    const mediumImpactKeywords = ['trade', 'retail', 'manufacturing', 'consumer', 'housing'];
    
    const lowerTitle = title.toLowerCase();
    
    if (highImpactKeywords.some(keyword => lowerTitle.includes(keyword))) {
      return 'high';
    }
    if (mediumImpactKeywords.some(keyword => lowerTitle.includes(keyword))) {
      return 'medium';
    }
    return 'low';
  }

  private calculateRelevance(text: string, currencies: string[]): number {
    let relevance = 50; // Base relevance
    
    currencies.forEach(currency => {
      if (text.toLowerCase().includes(currency.toLowerCase())) {
        relevance += 25;
      }
    });
    
    return Math.min(100, relevance);
  }

  private extractTags(text: string): string[] {
    const tags: string[] = [];
    const tagKeywords = {
      'monetary-policy': ['interest rate', 'central bank', 'fed', 'ecb', 'boe'],
      'inflation': ['cpi', 'inflation', 'prices'],
      'employment': ['jobs', 'unemployment', 'nfp', 'employment'],
      'growth': ['gdp', 'growth', 'economy'],
      'trade': ['trade', 'export', 'import', 'tariff']
    };
    
    const lowerText = text.toLowerCase();
    
    Object.entries(tagKeywords).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        tags.push(tag);
      }
    });
    
    return tags;
  }

  private categorizeTimeframe(date: Date, timeRanges: any): 'lastHour' | 'today' | 'thisWeek' | 'thisMonth' {
    if (date >= timeRanges.lastHour) return 'lastHour';
    if (date >= timeRanges.today) return 'today';
    if (date >= timeRanges.thisWeek) return 'thisWeek';
    return 'thisMonth';
  }

  private calculateSentiment(news: FundamentalNewsItem[], events: FundamentalEconomicEvent[]): number {
    let totalSentiment = 0;
    let totalWeight = 0;
    
    news.forEach(item => {
      const weight = item.impact === 'high' ? 3 : item.impact === 'medium' ? 2 : 1;
      totalSentiment += item.sentiment * weight;
      totalWeight += weight;
    });
    
    events.forEach(event => {
      const weight = event.importance === 'high' ? 3 : event.importance === 'medium' ? 2 : 1;
      totalSentiment += event.impact * 10 * weight; // Scale event impact
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? totalSentiment / totalWeight : 0;
  }

  private calculateEventImpact(event: any): number {
    if (!event.actual || !event.forecast) return 0;
    
    const deviation = (event.actual - event.forecast) / Math.abs(event.forecast || 1);
    return Math.max(-10, Math.min(10, deviation * 10));
  }

  private calculateSurprise(actual: number | null, forecast: number | null): number | undefined {
    if (actual === null || forecast === null || forecast === 0) return undefined;
    return ((actual - forecast) / Math.abs(forecast)) * 100;
  }

  private getCountryFromCurrency(currency: string): string {
    const countryMap: Record<string, string> = {
      USD: 'United States',
      EUR: 'European Union',
      GBP: 'United Kingdom',
      JPY: 'Japan',
      CAD: 'Canada',
      AUD: 'Australia',
      CHF: 'Switzerland',
      NZD: 'New Zealand'
    };
    return countryMap[currency] || 'Unknown';
  }

  private getEmptyData(): FundamentalAnalysisData {
    const emptyPeriod = {
      news: [],
      events: [],
      sentiment: 0,
      eventCount: 0
    };
    
    return {
      lastHour: emptyPeriod,
      today: emptyPeriod,
      thisWeek: emptyPeriod,
      thisMonth: emptyPeriod
    };
  }

  private getEmptyNewsData() {
    return {
      lastHour: [],
      today: [],
      thisWeek: [],
      thisMonth: []
    };
  }

  private getEmptyEventsData() {
    return {
      lastHour: [],
      today: [],
      thisWeek: [],
      thisMonth: []
    };
  }
}

export const realTimeFundamentalData = new RealTimeFundamentalDataService();