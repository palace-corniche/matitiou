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
      
      // Get economic events 
      const economicEvents = await this.getEconomicEvents(symbol);
      
      // Enhanced analysis with market intelligence
      const analysis = this.analyzeWithIntelligence(economicEvents, symbol, marketIntelligence);
      
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
    // In a real implementation, this would fetch from an economic calendar API
    // For now, we'll simulate some events
    const [baseCurrency, quoteCurrency] = symbol.split('/');
    
    const events: EconomicEvent[] = [
      {
        time: new Date().toISOString(),
        currency: baseCurrency,
        event: 'CPI (Consumer Price Index)',
        importance: 'high',
        actual: 2.1,
        forecast: 2.0,
        previous: 1.9
      },
      {
        time: new Date(Date.now() - 3600000).toISOString(),
        currency: quoteCurrency,
        event: 'Federal Reserve Interest Rate Decision',
        importance: 'high',
        actual: 5.25,
        forecast: 5.25,
        previous: 5.00
      },
      {
        time: new Date(Date.now() - 7200000).toISOString(),
        currency: baseCurrency,
        event: 'GDP Growth Rate',
        importance: 'medium',
        actual: 0.4,
        forecast: 0.3,
        previous: 0.2
      }
    ];

    return events;
  }

  private analyzeWithIntelligence(events: EconomicEvent[], symbol: string, intelligence: MarketIntelligence): {
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