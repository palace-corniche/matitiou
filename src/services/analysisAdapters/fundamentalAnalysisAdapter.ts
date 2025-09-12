import { supabase } from '@/integrations/supabase/client';

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

      // Get economic events (simulated data for now)
      const economicEvents = await this.getEconomicEvents(symbol);
      
      // Analyze fundamental factors
      const analysis = this.analyzeFundamentals(economicEvents, symbol);
      
      if (analysis.signalStrength > 0.3) {
        const signal = this.generateSignal(marketData[0], analysis, economicEvents, symbol, timeframe);
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

  private analyzeFundamentals(events: EconomicEvent[], symbol: string): {
    signalType: 'buy' | 'sell' | null;
    signalStrength: number;
    centralBankSentiment: string;
    inflationTrend: string;
    gdpGrowth: string;
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

    const netScore = bullishScore - bearishScore;
    const signalStrength = Math.abs(netScore);
    const signalType = netScore > 0.1 ? 'buy' : netScore < -0.1 ? 'sell' : null;

    return {
      signalType,
      signalStrength,
      centralBankSentiment,
      inflationTrend,
      gdpGrowth
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

  private generateSignal(
    currentBar: any, 
    analysis: any, 
    events: EconomicEvent[], 
    symbol: string, 
    timeframe: string
  ): FundamentalSignal | null {
    if (!analysis.signalType) return null;

    const currentPrice = currentBar.close_price;
    const volatility = (currentBar.high_price - currentBar.low_price) / currentPrice;
    
    // Calculate entry and exit levels based on fundamental strength
    const fundamentalStrength = analysis.signalStrength;
    const priceBuffer = currentPrice * volatility * fundamentalStrength;
    
    const suggestedEntry = analysis.signalType === 'buy' 
      ? currentPrice + (priceBuffer * 0.5)
      : currentPrice - (priceBuffer * 0.5);
      
    const suggestedStopLoss = analysis.signalType === 'buy'
      ? currentPrice - (priceBuffer * 2)
      : currentPrice + (priceBuffer * 2);
      
    const suggestedTakeProfit = analysis.signalType === 'buy'
      ? currentPrice + (priceBuffer * 3)
      : currentPrice - (priceBuffer * 3);

    return {
      moduleId: this.moduleId,
      symbol,
      timeframe,
      signalType: analysis.signalType,
      confidence: Math.min(analysis.signalStrength, 1.0),
      strength: Math.round(analysis.signalStrength * 10),
      weight: 1.2, // Fundamental analysis gets slightly higher weight
      triggerPrice: currentPrice,
      suggestedEntry,
      suggestedStopLoss,
      suggestedTakeProfit,
      economicEvents: events,
      centralBankSentiment: analysis.centralBankSentiment,
      inflationTrend: analysis.inflationTrend,
      gdpGrowth: analysis.gdpGrowth
    };
  }

  private async saveSignal(signal: FundamentalSignal): Promise<void> {
    const analysisId = crypto.randomUUID();
    
    const { error } = await supabase
      .from('modular_signals')
      .insert({
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