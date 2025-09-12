import { supabase } from '@/integrations/supabase/client';

export interface SentimentData {
  cotReport: {
    commercialLong: number;
    commercialShort: number;
    nonCommercialLong: number;
    nonCommercialShort: number;
    retailSentiment: number;
  };
  newsSentiment: {
    score: number; // -1 to 1
    sources: string[];
    keyWords: string[];
  };
  marketSentiment: {
    fearGreedIndex: number; // 0 to 100
    volatilityIndex: number;
    putCallRatio: number;
  };
}

export interface SentimentSignal {
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
  sentimentData: SentimentData;
  overallSentiment: string;
  retailPositioning: string;
  smartMoneySentiment: string;
}

export class SentimentAnalysisAdapter {
  private moduleId = 'sentiment_analysis';
  private moduleVersion = '1.0.0';

  async analyze(symbol: string = 'EUR/USD', timeframe: string = '15m'): Promise<SentimentSignal | null> {
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

      // Gather sentiment data
      const sentimentData = await this.gatherSentimentData(symbol);
      
      // Analyze sentiment
      const analysis = this.analyzeSentiment(sentimentData, symbol);
      
      if (analysis.signalStrength > 0.4) {
        const signal = this.generateSignal(marketData[0], analysis, sentimentData, symbol, timeframe);
        if (signal) {
          await this.saveSignal(signal);
          return signal;
        }
      }

      return null;
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      return null;
    }
  }

  private async gatherSentimentData(symbol: string): Promise<SentimentData> {
    // In a real implementation, this would fetch from multiple sentiment APIs
    // For now, we'll simulate the data with realistic values
    
    return {
      cotReport: {
        commercialLong: Math.random() * 100,
        commercialShort: Math.random() * 100,
        nonCommercialLong: Math.random() * 100,
        nonCommercialShort: Math.random() * 100,
        retailSentiment: Math.random() * 100
      },
      newsSentiment: {
        score: (Math.random() - 0.5) * 2, // -1 to 1
        sources: ['Reuters', 'Bloomberg', 'MarketWatch', 'FXStreet'],
        keyWords: ['inflation', 'interest rates', 'central bank', 'employment']
      },
      marketSentiment: {
        fearGreedIndex: Math.random() * 100,
        volatilityIndex: 15 + (Math.random() * 25), // VIX-like
        putCallRatio: 0.7 + (Math.random() * 0.6) // 0.7 to 1.3
      }
    };
  }

  private analyzeSentiment(sentimentData: SentimentData, symbol: string): {
    signalType: 'buy' | 'sell' | null;
    signalStrength: number;
    overallSentiment: string;
    retailPositioning: string;
    smartMoneySentiment: string;
  } {
    let bullishScore = 0;
    let bearishScore = 0;

    // Analyze COT Report (Commitment of Traders)
    const cotAnalysis = this.analyzeCOT(sentimentData.cotReport);
    bullishScore += cotAnalysis.bullishSignal;
    bearishScore += cotAnalysis.bearishSignal;

    // Analyze News Sentiment
    const newsScore = sentimentData.newsSentiment.score;
    if (newsScore > 0.3) {
      bullishScore += newsScore * 0.6;
    } else if (newsScore < -0.3) {
      bearishScore += Math.abs(newsScore) * 0.6;
    }

    // Analyze Market Sentiment (contrarian approach)
    const fearGreed = sentimentData.marketSentiment.fearGreedIndex;
    if (fearGreed < 25) { // Extreme fear = buying opportunity
      bullishScore += 0.4;
    } else if (fearGreed > 75) { // Extreme greed = selling opportunity
      bearishScore += 0.4;
    }

    // Volatility analysis
    const vix = sentimentData.marketSentiment.volatilityIndex;
    if (vix > 30) { // High volatility often precedes reversals
      bullishScore += 0.2;
    }

    // Put/Call ratio (contrarian)
    const putCallRatio = sentimentData.marketSentiment.putCallRatio;
    if (putCallRatio > 1.1) { // Too many puts = bullish contrarian signal
      bullishScore += 0.3;
    } else if (putCallRatio < 0.8) { // Too many calls = bearish contrarian signal
      bearishScore += 0.3;
    }

    const netScore = bullishScore - bearishScore;
    const signalStrength = Math.abs(netScore);
    const signalType = netScore > 0.2 ? 'buy' : netScore < -0.2 ? 'sell' : null;

    return {
      signalType,
      signalStrength,
      overallSentiment: this.determineSentiment(netScore),
      retailPositioning: this.determineRetailPositioning(sentimentData.cotReport.retailSentiment),
      smartMoneySentiment: this.determineSmartMoney(cotAnalysis.commercialNet)
    };
  }

  private analyzeCOT(cotData: any): { bullishSignal: number; bearishSignal: number; commercialNet: number } {
    // Commercial traders (smart money) positioning
    const commercialNet = cotData.commercialLong - cotData.commercialShort;
    const nonCommercialNet = cotData.nonCommercialLong - cotData.nonCommercialShort;
    
    let bullishSignal = 0;
    let bearishSignal = 0;

    // Follow commercial traders (they're usually right)
    if (commercialNet > 20) {
      bullishSignal += 0.4;
    } else if (commercialNet < -20) {
      bearishSignal += 0.4;
    }

    // Fade non-commercial traders when extreme (contrarian)
    if (nonCommercialNet > 60) {
      bearishSignal += 0.3; // Too many specs long = fade
    } else if (nonCommercialNet < -60) {
      bullishSignal += 0.3; // Too many specs short = fade
    }

    // Retail sentiment (contrarian)
    if (cotData.retailSentiment > 80) {
      bearishSignal += 0.2; // Everyone bullish = sell signal
    } else if (cotData.retailSentiment < 20) {
      bullishSignal += 0.2; // Everyone bearish = buy signal
    }

    return { bullishSignal, bearishSignal, commercialNet };
  }

  private determineSentiment(netScore: number): string {
    if (netScore > 0.5) return 'very_bullish';
    if (netScore > 0.2) return 'bullish';
    if (netScore < -0.5) return 'very_bearish';
    if (netScore < -0.2) return 'bearish';
    return 'neutral';
  }

  private determineRetailPositioning(retailSentiment: number): string {
    if (retailSentiment > 80) return 'extremely_bullish';
    if (retailSentiment > 60) return 'bullish';
    if (retailSentiment < 20) return 'extremely_bearish';
    if (retailSentiment < 40) return 'bearish';
    return 'neutral';
  }

  private determineSmartMoney(commercialNet: number): string {
    if (commercialNet > 30) return 'very_bullish';
    if (commercialNet > 10) return 'bullish';
    if (commercialNet < -30) return 'very_bearish';
    if (commercialNet < -10) return 'bearish';
    return 'neutral';
  }

  private generateSignal(
    currentBar: any,
    analysis: any,
    sentimentData: SentimentData,
    symbol: string,
    timeframe: string
  ): SentimentSignal | null {
    if (!analysis.signalType) return null;

    const currentPrice = currentBar.close_price;
    const volatility = (currentBar.high_price - currentBar.low_price) / currentPrice;
    
    // Sentiment-based position sizing (higher conviction = wider stops)
    const sentimentStrength = analysis.signalStrength;
    const priceBuffer = currentPrice * volatility * (0.5 + sentimentStrength);
    
    const suggestedEntry = analysis.signalType === 'buy'
      ? currentPrice + (priceBuffer * 0.3)
      : currentPrice - (priceBuffer * 0.3);
      
    const suggestedStopLoss = analysis.signalType === 'buy'
      ? currentPrice - (priceBuffer * 1.8)
      : currentPrice + (priceBuffer * 1.8);
      
    const suggestedTakeProfit = analysis.signalType === 'buy'
      ? currentPrice + (priceBuffer * 2.5)
      : currentPrice - (priceBuffer * 2.5);

    return {
      moduleId: this.moduleId,
      symbol,
      timeframe,
      signalType: analysis.signalType,
      confidence: Math.min(analysis.signalStrength, 1.0),
      strength: Math.round(analysis.signalStrength * 10),
      weight: 0.8, // Sentiment analysis gets lower weight due to contrarian nature
      triggerPrice: currentPrice,
      suggestedEntry,
      suggestedStopLoss,
      suggestedTakeProfit,
      sentimentData,
      overallSentiment: analysis.overallSentiment,
      retailPositioning: analysis.retailPositioning,
      smartMoneySentiment: analysis.smartMoneySentiment
    };
  }

  private async saveSignal(signal: SentimentSignal): Promise<void> {
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
        trend_context: signal.overallSentiment,
        volatility_regime: signal.smartMoneySentiment,
        market_data_snapshot: {
          timestamp: new Date().toISOString(),
          price: signal.triggerPrice,
          sentiment_data: signal.sentimentData
        },
        calculation_parameters: {
          cot_analysis: true,
          news_sentiment: true,
          market_fear_greed: true,
          retail_positioning: signal.retailPositioning
        },
        intermediate_values: {
          sentiment_data: signal.sentimentData,
          analysis_result: {
            overall_sentiment: signal.overallSentiment,
            retail_positioning: signal.retailPositioning,
            smart_money_sentiment: signal.smartMoneySentiment
          }
        }
      });

    if (error) {
      console.error('Error saving sentiment signal:', error);
    }
  }
}