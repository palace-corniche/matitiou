import { multiApiManager } from './multiApiManager';

export interface MarketRegime {
  regime: 'risk-on' | 'risk-off' | 'neutral';
  confidence: number;
  indicators: {
    vix: number;
    usdIndex: number;
    commodities: number;
    equities: number;
  };
  lastUpdated: Date;
}

export interface SentimentAggregation {
  overallSentiment: number; // -100 to 100
  sources: {
    source: string;
    sentiment: number;
    weight: number;
    reliability: number;
  }[];
  confidence: number;
  lastUpdated: Date;
}

export interface EconomicSurprise {
  eventName: string;
  currency: string;
  actual: number;
  forecast: number;
  previous: number;
  surprise: number; // (actual - forecast) / forecast * 100
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
  centralBankSignals: {
    bank: string;
    currency: string;
    signal: 'hawkish' | 'dovish' | 'neutral';
    confidence: number;
    lastSpeech: Date;
  }[];
}

class MarketIntelligenceEngine {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getMarketIntelligence(symbol: string = 'EUR/USD'): Promise<MarketIntelligence> {
    const cacheKey = `intelligence_${symbol}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const [regime, sentiment, surprises, correlations, centralBankSignals] = await Promise.all([
        this.detectMarketRegime(),
        this.aggregateSentiment(symbol),
        this.calculateEconomicSurprises(symbol),
        this.calculateCrossCorrelations(symbol),
        this.analyzeCentralBankSignals(symbol)
      ]);

      const intelligence: MarketIntelligence = {
        regime,
        sentiment,
        surprises,
        correlations,
        centralBankSignals
      };

      this.cache.set(cacheKey, { data: intelligence, timestamp: Date.now() });
      return intelligence;
    } catch (error) {
      console.error('Error getting market intelligence:', error);
      return this.getFallbackIntelligence();
    }
  }

  private async detectMarketRegime(): Promise<MarketRegime> {
    try {
      // Simulate VIX and risk indicators (would be fetched from APIs)
      const vix = 18 + Math.random() * 10; // 18-28 range
      const usdIndex = 103 + Math.random() * 4; // 103-107 range
      const commodities = Math.random() * 100;
      const equities = Math.random() * 100;

      let regime: 'risk-on' | 'risk-off' | 'neutral' = 'neutral';
      let confidence = 0.5;

      if (vix < 20 && equities > 60) {
        regime = 'risk-on';
        confidence = 0.8;
      } else if (vix > 25 && equities < 40) {
        regime = 'risk-off';
        confidence = 0.8;
      }

      return {
        regime,
        confidence,
        indicators: { vix, usdIndex, commodities, equities },
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error detecting market regime:', error);
      return {
        regime: 'neutral',
        confidence: 0.5,
        indicators: { vix: 20, usdIndex: 105, commodities: 50, equities: 50 },
        lastUpdated: new Date()
      };
    }
  }

  private async aggregateSentiment(symbol: string): Promise<SentimentAggregation> {
    try {
      const currencies = symbol.split('/');
      const timeRange = { from: new Date(Date.now() - 24 * 60 * 60 * 1000), to: new Date() };
      const news = await multiApiManager.getFinancialNews(currencies, timeRange);
      
      const sources = news.slice(0, 10).map((item, index) => ({
        source: item.source,
        sentiment: item.sentiment || 0,
        weight: this.getSourceWeight(item.source),
        reliability: this.getSourceReliability(item.source)
      }));

      const weightedSentiment = sources.reduce((acc, source) => 
        acc + (source.sentiment * source.weight * source.reliability), 0
      ) / sources.reduce((acc, source) => acc + (source.weight * source.reliability), 1);

      const confidence = sources.length > 5 ? 0.8 : 0.5;

      return {
        overallSentiment: Math.max(-100, Math.min(100, weightedSentiment)),
        sources,
        confidence,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error aggregating sentiment:', error);
      return {
        overallSentiment: 0,
        sources: [],
        confidence: 0.3,
        lastUpdated: new Date()
      };
    }
  }

  private async calculateEconomicSurprises(symbol: string): Promise<EconomicSurprise[]> {
    try {
      const currencies = symbol.split('/');
      const timeRange = { from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), to: new Date() };
      const events = await multiApiManager.getEconomicEvents(currencies, timeRange);
      
      return events.filter(event => 
        event.actual && event.forecast
      ).map(event => {
        const actual = typeof event.actual === 'number' ? event.actual : parseFloat(String(event.actual));
        const forecast = typeof event.forecast === 'number' ? event.forecast : parseFloat(String(event.forecast));
        const previous = typeof event.previous === 'number' ? event.previous : parseFloat(String(event.previous || '0'));
        
        const surprise = forecast !== 0 ? ((actual - forecast) / Math.abs(forecast)) * 100 : 0;
        
        return {
          eventName: event.name,
          currency: event.currency,
          actual,
          forecast,
          previous,
          surprise,
          impact: event.importance as 'high' | 'medium' | 'low',
          timestamp: new Date(event.time)
        };
      }).slice(0, 10);
    } catch (error) {
      console.error('Error calculating economic surprises:', error);
      return [];
    }
  }

  private async calculateCrossCorrelations(symbol: string): Promise<CrossCurrencyCorrelation[]> {
    const pairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF'];
    const correlations: CrossCurrencyCorrelation[] = [];

    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const correlation = -1 + Math.random() * 2; // -1 to 1
        const strength = Math.abs(correlation) > 0.7 ? 'strong' : 
                        Math.abs(correlation) > 0.4 ? 'moderate' : 'weak';

        correlations.push({
          pair1: pairs[i],
          pair2: pairs[j],
          correlation,
          strength,
          timeframe: '1D',
          lastCalculated: new Date()
        });
      }
    }

    return correlations;
  }

  private async analyzeCentralBankSignals(symbol: string): Promise<any[]> {
    const banks = [
      { bank: 'ECB', currency: 'EUR' },
      { bank: 'Fed', currency: 'USD' },
      { bank: 'BoE', currency: 'GBP' },
      { bank: 'BoJ', currency: 'JPY' }
    ];

    return banks.map(bank => ({
      bank: bank.bank,
      currency: bank.currency,
      signal: Math.random() > 0.6 ? 'hawkish' : Math.random() > 0.3 ? 'dovish' : 'neutral',
      confidence: 0.6 + Math.random() * 0.3,
      lastSpeech: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Last 7 days
    }));
  }

  private getSourceWeight(source: string): number {
    const weights = {
      'Reuters': 1.0,
      'Bloomberg': 1.0,
      'Wall Street Journal': 0.95,
      'Financial Times': 0.9,
      'CNBC': 0.8,
      'MarketWatch': 0.7
    };
    return weights[source as keyof typeof weights] || 0.6;
  }

  private getSourceReliability(source: string): number {
    const reliability = {
      'Reuters': 0.95,
      'Bloomberg': 0.95,
      'Wall Street Journal': 0.9,
      'Financial Times': 0.9,
      'CNBC': 0.8,
      'MarketWatch': 0.75
    };
    return reliability[source as keyof typeof reliability] || 0.7;
  }

  private getFallbackIntelligence(): MarketIntelligence {
    return {
      regime: {
        regime: 'neutral',
        confidence: 0.5,
        indicators: { vix: 20, usdIndex: 105, commodities: 50, equities: 50 },
        lastUpdated: new Date()
      },
      sentiment: {
        overallSentiment: 0,
        sources: [],
        confidence: 0.3,
        lastUpdated: new Date()
      },
      surprises: [],
      correlations: [],
      centralBankSignals: []
    };
  }
}

export const marketIntelligenceEngine = new MarketIntelligenceEngine();