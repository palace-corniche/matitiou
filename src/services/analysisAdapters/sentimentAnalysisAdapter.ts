import { untypedSupabase as supabase } from '@/integrations/supabase/untypedClient';

export interface SentimentData {
  cotReport: {
    commercialLong: number;
    commercialShort: number;
    nonCommercialLong: number;
    nonCommercialShort: number;
    retailSentiment: number;
  };
  newsSentiment: {
    score: number;
    sources: string[];
    keyWords: string[];
  };
  marketSentiment: {
    fearGreedIndex: number;
    volatilityIndex: number;
    putCallRatio: number;
  };
  dataAvailability: {
    hasCotData: boolean;
    hasNewsData: boolean;
    hasVolatilityData: boolean;
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

  async analyze(symbol: string = 'EUR/USD', timeframe: string = '15m'): Promise<SentimentSignal | null> {
    try {
      const { data: marketData } = await supabase
        .from('market_data_enhanced')
        .select('*')
        .eq('symbol', symbol)
        .eq('timeframe', timeframe)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (!marketData || marketData.length === 0) return null;

      const sentimentData = await this.gatherSentimentData(symbol);
      const analysis = this.analyzeSentiment(sentimentData);

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
    const [baseCurrency] = symbol.split('/');

    // 1. Query real COT data from cot_reports table
    const { data: cotData } = await supabase
      .from('cot_reports')
      .select('*')
      .eq('pair', symbol)
      .order('report_date', { ascending: false })
      .limit(1);

    // 2. Query real news sentiment from news_events table
    const { data: newsData } = await supabase
      .from('news_events')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(10);

    // 3. Query real retail positions
    const { data: retailData } = await supabase
      .from('retail_positions')
      .select('*')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: false })
      .limit(1);

    // 4. Compute real volatility from aggregated_candles
    const { data: candles } = await supabase
      .from('aggregated_candles')
      .select('high_price, low_price, close_price')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: false })
      .limit(20);

    const hasCotData = cotData && cotData.length > 0;
    const hasNewsData = newsData && newsData.length > 0;
    const hasVolatilityData = candles && candles.length >= 5;

    // Build COT report from real data or mark as unavailable
    const cotReport = hasCotData ? {
      commercialLong: cotData[0].long_positions || 0,
      commercialShort: cotData[0].short_positions || 0,
      nonCommercialLong: cotData[0].net_position > 0 ? cotData[0].net_position : 0,
      nonCommercialShort: cotData[0].net_position < 0 ? Math.abs(cotData[0].net_position) : 0,
      retailSentiment: retailData?.[0]?.long_percentage || 50,
    } : {
      commercialLong: 50, commercialShort: 50,
      nonCommercialLong: 50, nonCommercialShort: 50,
      retailSentiment: retailData?.[0]?.long_percentage || 50,
    };

    // Build news sentiment from real data
    let newsScore = 0;
    const newsSources: string[] = [];
    const keyWords: string[] = [];
    if (hasNewsData) {
      const scores = newsData.map((n: any) => n.sentiment_score || n.sentiment || 0);
      newsScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      newsData.forEach((n: any) => {
        if (n.source && !newsSources.includes(n.source)) newsSources.push(n.source);
      });
    }

    // Compute real volatility index from candle data (ATR-based)
    let volatilityIndex = 20; // default
    if (hasVolatilityData) {
      const atrs = candles!.map((c: any) => c.high_price - c.low_price);
      const avgATR = atrs.reduce((a: number, b: number) => a + b, 0) / atrs.length;
      const avgPrice = candles![0].close_price;
      // Convert ATR to annualized volatility percentage, scale to VIX-like range
      volatilityIndex = (avgATR / avgPrice) * 100 * Math.sqrt(252) * 10;
      volatilityIndex = Math.max(10, Math.min(50, volatilityIndex));
    }

    return {
      cotReport,
      newsSentiment: {
        score: newsScore,
        sources: newsSources.length > 0 ? newsSources : ['No news data'],
        keyWords: keyWords.length > 0 ? keyWords : ['awaiting data'],
      },
      marketSentiment: {
        fearGreedIndex: hasNewsData ? Math.max(0, Math.min(100, 50 + newsScore * 50)) : 50,
        volatilityIndex,
        putCallRatio: 1.0, // Not available for free
      },
      dataAvailability: {
        hasCotData: !!hasCotData,
        hasNewsData: !!hasNewsData,
        hasVolatilityData: !!hasVolatilityData,
      },
    };
  }

  private analyzeSentiment(sentimentData: SentimentData): {
    signalType: 'buy' | 'sell' | null;
    signalStrength: number;
    overallSentiment: string;
    retailPositioning: string;
    smartMoneySentiment: string;
  } {
    let bullishScore = 0;
    let bearishScore = 0;

    const cotAnalysis = this.analyzeCOT(sentimentData.cotReport);
    bullishScore += cotAnalysis.bullishSignal;
    bearishScore += cotAnalysis.bearishSignal;

    const newsScore = sentimentData.newsSentiment.score;
    if (newsScore > 0.3) bullishScore += newsScore * 0.6;
    else if (newsScore < -0.3) bearishScore += Math.abs(newsScore) * 0.6;

    const fearGreed = sentimentData.marketSentiment.fearGreedIndex;
    if (fearGreed < 25) bullishScore += 0.4;
    else if (fearGreed > 75) bearishScore += 0.4;

    const vix = sentimentData.marketSentiment.volatilityIndex;
    if (vix > 30) bullishScore += 0.2;

    const netScore = bullishScore - bearishScore;
    return {
      signalType: netScore > 0.2 ? 'buy' : netScore < -0.2 ? 'sell' : null,
      signalStrength: Math.abs(netScore),
      overallSentiment: this.determineSentiment(netScore),
      retailPositioning: this.determineRetailPositioning(sentimentData.cotReport.retailSentiment),
      smartMoneySentiment: this.determineSmartMoney(cotAnalysis.commercialNet),
    };
  }

  private analyzeCOT(cotData: any) {
    const commercialNet = cotData.commercialLong - cotData.commercialShort;
    const nonCommercialNet = cotData.nonCommercialLong - cotData.nonCommercialShort;
    let bullishSignal = 0, bearishSignal = 0;

    if (commercialNet > 20) bullishSignal += 0.4;
    else if (commercialNet < -20) bearishSignal += 0.4;

    if (nonCommercialNet > 60) bearishSignal += 0.3;
    else if (nonCommercialNet < -60) bullishSignal += 0.3;

    if (cotData.retailSentiment > 80) bearishSignal += 0.2;
    else if (cotData.retailSentiment < 20) bullishSignal += 0.2;

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

  private generateSignal(currentBar: any, analysis: any, sentimentData: SentimentData, symbol: string, timeframe: string): SentimentSignal | null {
    if (!analysis.signalType) return null;
    const currentPrice = currentBar.close_price || currentBar.close;
    const high = currentBar.high_price || currentBar.high;
    const low = currentBar.low_price || currentBar.low;
    const volatility = (high - low) / currentPrice;
    const priceBuffer = currentPrice * volatility * (0.5 + analysis.signalStrength);

    return {
      moduleId: this.moduleId,
      symbol, timeframe,
      signalType: analysis.signalType,
      confidence: Math.min(analysis.signalStrength, 1.0),
      strength: Math.round(analysis.signalStrength * 10),
      weight: 0.8,
      triggerPrice: currentPrice,
      suggestedEntry: analysis.signalType === 'buy' ? currentPrice + priceBuffer * 0.3 : currentPrice - priceBuffer * 0.3,
      suggestedStopLoss: analysis.signalType === 'buy' ? currentPrice - priceBuffer * 1.8 : currentPrice + priceBuffer * 1.8,
      suggestedTakeProfit: analysis.signalType === 'buy' ? currentPrice + priceBuffer * 2.5 : currentPrice - priceBuffer * 2.5,
      sentimentData,
      overallSentiment: analysis.overallSentiment,
      retailPositioning: analysis.retailPositioning,
      smartMoneySentiment: analysis.smartMoneySentiment,
    };
  }

  private async saveSignal(signal: SentimentSignal): Promise<void> {
    const { error } = await (supabase as any)
      .from('modular_signals')
      .insert({
        analysis_id: crypto.randomUUID(),
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
          data_availability: signal.sentimentData.dataAvailability,
        },
        calculation_parameters: {
          cot_analysis: signal.sentimentData.dataAvailability.hasCotData,
          news_sentiment: signal.sentimentData.dataAvailability.hasNewsData,
          volatility_data: signal.sentimentData.dataAvailability.hasVolatilityData,
          retail_positioning: signal.retailPositioning,
        },
      });

    if (error) console.error('Error saving sentiment signal:', error);
  }
}
