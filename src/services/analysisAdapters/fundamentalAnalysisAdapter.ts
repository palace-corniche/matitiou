import { supabase } from '@/integrations/supabase/client';
import { marketIntelligenceEngine } from '@/services/marketIntelligenceEngine';
import type { MarketIntelligence } from '@/services/marketIntelligenceEngine';

export interface EconomicEvent {
  time: string;
  currency: string;
  event: string;
  importance: 'low' | 'medium' | 'high';
  actual?: number;
  forecast?: number;
  previous?: number;
}

export interface FundamentalSignal {
  moduleId: string;
  symbol: string;
  timeframe: string;
  signalType: 'buy' | 'sell';
  confidence: number;
  strength: number;
  weight: number;
  triggerPrice: number;
  suggestedEntry: number;
  suggestedStopLoss: number;
  suggestedTakeProfit: number;
  economicEvents: EconomicEvent[];
  centralBankSentiment: string;
  inflationTrend: string;
  gdpGrowth: string;
  marketIntelligence?: MarketIntelligence;
  riskScore: number;
  expectedMove: number;
  regimeScore: number;
}

export class FundamentalAnalysisAdapter {
  private moduleId = 'fundamental_analysis';
  private moduleVersion = '1.0.0';

  async analyze(symbol: string = 'EUR/USD', timeframe: string = '15m'): Promise<FundamentalSignal | null> {
    try {
      // Get current market data for pricing
      const { data: marketData } = await supabase
        .from('market_data_enhanced')
        .select('*')
        .eq('symbol', symbol)
        .eq('timeframe', timeframe)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (!marketData || marketData.length === 0) {
        return null;
      }

      // Get market intelligence data
      const marketIntelligence = await marketIntelligenceEngine.getMarketIntelligence(symbol);
      
      // Get economic events and real news sentiment
      const economicEvents = await this.getEconomicEvents(symbol);
      const newsSentiment = await this.getNewsSentiment(symbol);
      
      // Enhanced analysis with market intelligence and news sentiment
      const analysis = this.analyzeWithIntelligence(economicEvents, symbol, marketIntelligence, newsSentiment);
      
      if (analysis.signalStrength > 0.25) { // Lower threshold with intelligence
        const signal = this.generateEnhancedSignal(marketData[0], analysis, economicEvents, symbol, timeframe, marketIntelligence);
        if (signal) {
          await this.saveSignal(signal);
          return signal;
        }
      }

      return null;
    } catch (error) {
      console.error('Fundamental analysis error:', error);
      return null;
    }
  }

  private async getEconomicEvents(symbol: string): Promise<EconomicEvent[]> {
    // Fetch real economic events from database
    const { data: calendarEvents } = await supabase
      .from('economic_calendar')
      .select('*')
      .contains('affected_instruments', [symbol])
      .gte('event_time', new Date(Date.now() - 86400000).toISOString()) // Last 24 hours
      .order('event_time', { ascending: false })
      .limit(10);

    if (!calendarEvents || calendarEvents.length === 0) {
      return [];
    }

    return calendarEvents.map(event => ({
      time: event.event_time,
      currency: event.currency,
      event: event.event_name,
      importance: event.impact_level as 'low' | 'medium' | 'high',
      actual: event.actual_value ? parseFloat(event.actual_value) : undefined,
      forecast: event.forecast_value ? parseFloat(event.forecast_value) : undefined,
      previous: event.previous_value ? parseFloat(event.previous_value) : undefined
    }));
  }

  private async getNewsSentiment(symbol: string): Promise<{
    overallSentiment: number;
    recentNews: any[];
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
  }> {
    // Fetch real news sentiment from database
    const { data: newsData } = await supabase
      .from('news_sentiment')
      .select('*')
      .eq('symbol', symbol)
      .gte('published_at', new Date(Date.now() - 86400000 * 2).toISOString()) // Last 48 hours
      .order('published_at', { ascending: false })
      .limit(50);

    if (!newsData || newsData.length === 0) {
      return {
        overallSentiment: 0,
        recentNews: [],
        bullishCount: 0,
        bearishCount: 0,
        neutralCount: 0
      };
    }

    // Calculate weighted sentiment (more recent = higher weight)
    let weightedSum = 0;
    let totalWeight = 0;
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;

    const now = Date.now();
    for (const news of newsData) {
      const ageHours = (now - new Date(news.published_at).getTime()) / (1000 * 60 * 60);
      const timeWeight = Math.exp(-ageHours / 24); // Exponential decay over 24 hours
      const relevanceWeight = news.relevance_score || 0.5;
      const weight = timeWeight * relevanceWeight;

      weightedSum += news.sentiment_score * weight;
      totalWeight += weight;

      // Count sentiment categories
      if (news.sentiment_label === 'Bullish') bullishCount++;
      else if (news.sentiment_label === 'Bearish') bearishCount++;
      else neutralCount++;
    }

    const overallSentiment = totalWeight > 0 ? weightedSum / totalWeight : 0;

    return {
      overallSentiment,
      recentNews: newsData.slice(0, 10),
      bullishCount,
      bearishCount,
      neutralCount
    };
  }

  private analyzeWithIntelligence(
    events: EconomicEvent[], 
    symbol: string, 
    intelligence: MarketIntelligence,
    newsSentiment: {
      overallSentiment: number;
      recentNews: any[];
      bullishCount: number;
      bearishCount: number;
      neutralCount: number;
    }
  ): {
    signalType: 'buy' | 'sell' | null;
    signalStrength: number;
    centralBankSentiment: string;
    inflationTrend: string;
    gdpGrowth: string;
    riskScore: number;
    expectedMove: number;
    regimeScore: number;
  } {
    let bullishScore = 0;
    let bearishScore = 0;
    let centralBankSentiment = 'neutral';
    let inflationTrend = 'stable';
    let gdpGrowth = 'stable';

    const [baseCurrency] = symbol.split('/');

    // **NEW: Apply real news sentiment boost**
    // News sentiment ranges from -1 (bearish) to +1 (bullish)
    const newsSentimentBoost = newsSentiment.overallSentiment * 0.4; // 40% weight on news
    if (newsSentimentBoost > 0) {
      bullishScore += newsSentimentBoost;
    } else {
      bearishScore += Math.abs(newsSentimentBoost);
    }

    // Log news sentiment for visibility
    if (newsSentiment.recentNews.length > 0) {
      console.log(`📰 News sentiment for ${symbol}:`, {
        overall: newsSentiment.overallSentiment.toFixed(3),
        bullish: newsSentiment.bullishCount,
        bearish: newsSentiment.bearishCount,
        neutral: newsSentiment.neutralCount,
        newsCount: newsSentiment.recentNews.length
      });
    }

    for (const event of events) {
      if (event.currency === baseCurrency) {
        const impact = this.calculateEventImpact(event);
        
        if (impact > 0) {
          bullishScore += impact * this.getImportanceWeight(event.importance);
        } else {
          bearishScore += Math.abs(impact) * this.getImportanceWeight(event.importance);
        }

        // Analyze specific event types
        if (event.event.toLowerCase().includes('interest rate')) {
          if (event.actual && event.previous && event.actual > event.previous) {
            centralBankSentiment = 'hawkish';
            bullishScore += 0.3;
          } else if (event.actual && event.previous && event.actual < event.previous) {
            centralBankSentiment = 'dovish';
            bearishScore += 0.3;
          }
        }

        if (event.event.toLowerCase().includes('cpi') || event.event.toLowerCase().includes('inflation')) {
          if (event.actual && event.forecast && event.actual > event.forecast) {
            inflationTrend = 'rising';
            bullishScore += 0.2;
          } else if (event.actual && event.forecast && event.actual < event.forecast) {
            inflationTrend = 'falling';
            bearishScore += 0.2;
          }
        }

        if (event.event.toLowerCase().includes('gdp')) {
          if (event.actual && event.forecast && event.actual > event.forecast) {
            gdpGrowth = 'strong';
            bullishScore += 0.25;
          } else if (event.actual && event.forecast && event.actual < event.forecast) {
            gdpGrowth = 'weak';
            bearishScore += 0.25;
          }
        }
      }
    }

    // Enhanced analysis with market intelligence
    const regimeMultiplier = intelligence.regime.regime === 'risk-on' ? 1.2 : 
                           intelligence.regime.regime === 'risk-off' ? 0.8 : 1.0;
    
    const sentimentScore = intelligence.sentiment.overallSentiment / 100;
    const sentimentMultiplier = Math.abs(sentimentScore) > 0.5 ? 1.3 : 1.0;
    
    // Apply intelligence modifiers
    bullishScore *= regimeMultiplier * (sentimentScore > 0 ? sentimentMultiplier : 1.0);
    bearishScore *= regimeMultiplier * (sentimentScore < 0 ? sentimentMultiplier : 1.0);
    
    const netScore = bullishScore - bearishScore;
    const signalStrength = Math.min(Math.abs(netScore) * 1.5, 1.0); // Boost with intelligence
    const signalType = netScore > 0.08 ? 'buy' : netScore < -0.08 ? 'sell' : null;
    
    // Calculate risk and regime scores
    const riskScore = intelligence.regime.confidence * (intelligence.regime.regime === 'risk-off' ? 0.8 : 0.2);
    const regimeScore = intelligence.regime.confidence;
    
    // Expected move based on economic surprises and volatility
    const avgSurpriseImpact = intelligence.surprises.reduce((sum, surprise) => 
      sum + Math.abs(surprise.surprise), 0) / (intelligence.surprises.length || 1);
    const expectedMove = avgSurpriseImpact * 0.001; // Convert to price movement

    return {
      signalType,
      signalStrength,
      centralBankSentiment,
      inflationTrend,
      gdpGrowth,
      riskScore,
      expectedMove,
      regimeScore
    };
  }

  private calculateEventImpact(event: EconomicEvent): number {
    if (!event.actual || !event.forecast) return 0;
    
    // Calculate deviation from forecast as percentage
    const deviation = (event.actual - event.forecast) / Math.abs(event.forecast);
    
    // Return normalized impact (-1 to 1)
    return Math.max(-1, Math.min(1, deviation));
  }

  private getImportanceWeight(importance: 'low' | 'medium' | 'high'): number {
    switch (importance) {
      case 'high': return 1.0;
      case 'medium': return 0.6;
      case 'low': return 0.3;
      default: return 0.5;
    }
  }

  private generateEnhancedSignal(
    currentBar: any, 
    analysis: any, 
    events: EconomicEvent[], 
    symbol: string, 
    timeframe: string,
    intelligence: MarketIntelligence
  ): FundamentalSignal | null {
    if (!analysis.signalType) return null;

    const currentPrice = currentBar.close_price;
    const volatility = (currentBar.high_price - currentBar.low_price) / currentPrice;
    
    // Enhanced calculation with intelligence and expected move
    const fundamentalStrength = analysis.signalStrength;
    const intelligenceBoost = intelligence.regime.confidence * 0.5;
    const totalStrength = Math.min(fundamentalStrength + intelligenceBoost, 1.0);
    
    // Risk-adjusted pricing using expected move
    const baseMove = analysis.expectedMove || (currentPrice * volatility * totalStrength);
    const riskAdjustment = 1 - (analysis.riskScore * 0.3); // Reduce position size in high risk
    
    const suggestedEntry = analysis.signalType === 'buy' 
      ? currentPrice + (baseMove * 0.3)
      : currentPrice - (baseMove * 0.3);
      
    const suggestedStopLoss = analysis.signalType === 'buy'
      ? currentPrice - (baseMove * 1.5 * riskAdjustment)
      : currentPrice + (baseMove * 1.5 * riskAdjustment);
      
    const suggestedTakeProfit = analysis.signalType === 'buy'
      ? currentPrice + (baseMove * 2.5)
      : currentPrice - (baseMove * 2.5);

    return {
      moduleId: this.moduleId,
      symbol,
      timeframe,
      signalType: analysis.signalType,
      confidence: Math.min(totalStrength * 100, 95),
      strength: Math.round(totalStrength * 10),
      weight: 1.3, // Higher weight with intelligence
      triggerPrice: currentPrice,
      suggestedEntry,
      suggestedStopLoss,
      suggestedTakeProfit,
      economicEvents: events,
      centralBankSentiment: analysis.centralBankSentiment,
      inflationTrend: analysis.inflationTrend,
      gdpGrowth: analysis.gdpGrowth,
      marketIntelligence: intelligence,
      riskScore: analysis.riskScore,
      expectedMove: analysis.expectedMove,
      regimeScore: analysis.regimeScore
    };
  }

  private async saveSignal(signal: FundamentalSignal): Promise<void> {
    const analysisId = crypto.randomUUID();
    
    const { error } = await (supabase as any)
      .from('modular_signals')
      .insert({
        analysis_id: analysisId,
        module_id: signal.moduleId,
        symbol: signal.symbol,
        timeframe: signal.timeframe,
        signal_type: signal.signalType,
        confidence: signal.confidence,
        strength: signal.strength,
        weight: signal.weight,
        trigger_price: signal.triggerPrice,
        suggested_entry: signal.suggestedEntry,
        suggested_stop_loss: signal.suggestedStopLoss,
        suggested_take_profit: signal.suggestedTakeProfit,
        trend_context: `${signal.centralBankSentiment}_${signal.inflationTrend}`,
        volatility_regime: signal.gdpGrowth,
        market_data_snapshot: {
          timestamp: new Date().toISOString(),
          price: signal.triggerPrice,
          economic_events: signal.economicEvents
        },
        calculation_parameters: {
          central_bank_sentiment: signal.centralBankSentiment,
          inflation_trend: signal.inflationTrend,
          gdp_growth: signal.gdpGrowth,
          event_count: signal.economicEvents.length
        },
        intermediate_values: {
          economic_events: signal.economicEvents,
          sentiment_analysis: {
            central_bank: signal.centralBankSentiment,
            inflation: signal.inflationTrend,
            growth: signal.gdpGrowth
          }
        }
      });

    if (error) {
      console.error('Error saving fundamental signal:', error);
    }
  }
}