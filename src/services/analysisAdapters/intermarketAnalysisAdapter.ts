import { untypedSupabase as supabase } from '@/integrations/supabase/untypedClient';

export interface IntermarketData {
  forexCorrelations: { [pair: string]: number };
  commodityRelations: {
    gold: { correlation: number; currentPrice: number | null; available: boolean };
    oil: { correlation: number; currentPrice: number | null; available: boolean };
    copper: { correlation: number; currentPrice: number | null; available: boolean };
  };
  equityIndices: {
    spy: { correlation: number; performance: number | null; available: boolean };
    vix: { correlation: number; level: number | null; available: boolean };
    dxy: { correlation: number; level: number | null; available: boolean };
  };
  bondMarkets: {
    us10y: { correlation: number; yield: number | null; available: boolean };
    ger10y: { correlation: number; yield: number | null; available: boolean };
    yieldSpread: number | null;
  };
  riskSentiment: {
    riskOn: boolean;
    confidence: number;
  };
}

export interface IntermarketSignal {
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
  intermarketData: IntermarketData;
  primaryDriver: string;
  riskEnvironment: string;
  correlationStrength: number;
}

export class IntermarketAnalysisAdapter {
  private moduleId = 'intermarket_analysis';

  async analyze(symbol: string = 'EUR/USD', timeframe: string = '15m'): Promise<IntermarketSignal | null> {
    try {
      const { data: marketData } = await supabase
        .from('market_data_enhanced')
        .select('*')
        .eq('symbol', symbol)
        .eq('timeframe', timeframe)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (!marketData || marketData.length === 0) return null;

      const intermarketData = await this.gatherIntermarketData(symbol);
      const analysis = this.analyzeIntermarketRelations(intermarketData, symbol);

      if (analysis.confidence > 0.35) {
        const signal = this.generateSignal(marketData[0], analysis, intermarketData, symbol, timeframe);
        if (signal) {
          await this.saveSignal(signal);
          return signal;
        }
      }

      return null;
    } catch (error) {
      console.error('Intermarket analysis error:', error);
      return null;
    }
  }

  private async gatherIntermarketData(symbol: string): Promise<IntermarketData> {
    const [, quoteCurrency] = symbol.split('/');

    // Fetch REAL correlations from DB using correct column: symbol_pair
    const { data: correlations } = await supabase
      .from('correlations')
      .select('*')
      .like('symbol_pair', `%${symbol}%`)
      .order('calculated_at', { ascending: false })
      .limit(20);

    // Build correlation map from real DB data
    const correlationMap: Record<string, number> = {};
    correlations?.forEach((corr: any) => {
      const parts = corr.symbol_pair.split('|');
      const other = parts[0] === symbol ? parts[1] : parts[0];
      correlationMap[other] = corr.correlation_coefficient;
    });

    // Compute real volatility from candle data as VIX proxy
    const { data: candles } = await supabase
      .from('aggregated_candles')
      .select('high_price, low_price, close_price')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: false })
      .limit(20);

    let computedVolatility: number | null = null;
    let riskOn = true;
    if (candles && candles.length >= 5) {
      const atrs = candles.map((c: any) => c.high_price - c.low_price);
      const avgATR = atrs.reduce((a: number, b: number) => a + b, 0) / atrs.length;
      const avgPrice = candles[0].close_price;
      computedVolatility = (avgATR / avgPrice) * 100 * Math.sqrt(252) * 10;
      computedVolatility = Math.max(10, Math.min(50, computedVolatility));
      riskOn = computedVolatility < 25;
    }

    // Get news sentiment to assess risk
    const { data: newsData } = await supabase
      .from('news_events')
      .select('sentiment_score')
      .order('published_at', { ascending: false })
      .limit(5);

    let avgNewsSentiment = 0;
    if (newsData && newsData.length > 0) {
      avgNewsSentiment = newsData.reduce((a: number, n: any) => a + (n.sentiment_score || 0), 0) / newsData.length;
      // Positive news = risk-on
      if (avgNewsSentiment > 0.2) riskOn = true;
      else if (avgNewsSentiment < -0.2) riskOn = false;
    }

    return {
      forexCorrelations: {
        'EUR/USD': correlationMap['EUR/USD'] ?? 0,
        'GBP/USD': correlationMap['GBP/USD'] ?? 0,
        'USD/JPY': correlationMap['USD/JPY'] ?? 0,
        'AUD/USD': correlationMap['AUD/USD'] ?? 0,
        'USD/CHF': correlationMap['USD/CHF'] ?? 0,
        'NZD/USD': correlationMap['NZD/USD'] ?? 0,
        'USD/CAD': correlationMap['USD/CAD'] ?? 0,
      },
      commodityRelations: {
        gold: { correlation: correlationMap['GOLD'] ?? (quoteCurrency === 'USD' ? -0.4 : 0.2), currentPrice: null, available: false },
        oil: { correlation: correlationMap['OIL'] ?? 0.1, currentPrice: null, available: false },
        copper: { correlation: correlationMap['COPPER'] ?? 0.1, currentPrice: null, available: false },
      },
      equityIndices: {
        spy: { correlation: correlationMap['SPX'] ?? 0.2, performance: null, available: false },
        vix: { correlation: correlationMap['VIX'] ?? -0.2, level: computedVolatility, available: computedVolatility !== null },
        dxy: { correlation: correlationMap['DXY'] ?? (quoteCurrency === 'USD' ? -0.7 : 0.2), level: null, available: false },
      },
      bondMarkets: {
        us10y: { correlation: correlationMap['US10Y'] ?? 0.3, yield: null, available: false },
        ger10y: { correlation: correlationMap['GER10Y'] ?? 0.3, yield: null, available: false },
        yieldSpread: null,
      },
      riskSentiment: {
        riskOn,
        confidence: (correlations && correlations.length > 5) ? 0.8 : 0.5,
      },
    };
  }

  private analyzeIntermarketRelations(data: IntermarketData, symbol: string) {
    let bullishScore = 0;
    let bearishScore = 0;
    let primaryDriver = 'mixed';
    let maxCorrelation = 0;
    const [baseCurrency, quoteCurrency] = symbol.split('/');

    // DXY analysis (use real correlation)
    if (quoteCurrency === 'USD') {
      const dxyCorr = Math.abs(data.equityIndices.dxy.correlation);
      if (dxyCorr > 0.4) {
        primaryDriver = 'USD_strength';
        maxCorrelation = Math.max(maxCorrelation, dxyCorr);
        if (data.equityIndices.dxy.correlation < -0.4) bearishScore += 0.3 * dxyCorr;
        else if (data.equityIndices.dxy.correlation > 0.4) bullishScore += 0.3 * dxyCorr;
      }
    }

    // Commodity currencies
    if (['AUD', 'NZD', 'CAD'].includes(baseCurrency)) {
      const commoditySig = this.analyzeCommodityRelations(data, baseCurrency);
      const mult = data.riskSentiment.riskOn ? 1.5 : 1.0;
      bullishScore += commoditySig.bullish * mult;
      bearishScore += commoditySig.bearish * mult;
      if (commoditySig.strength > 0.2) {
        primaryDriver = 'commodity_correlation';
        maxCorrelation = Math.max(maxCorrelation, commoditySig.strength);
      }
    }

    // Safe haven
    if (['JPY', 'CHF'].includes(baseCurrency)) {
      const shSig = this.analyzeSafeHavenFlow(data);
      const mult = data.riskSentiment.riskOn ? 0.8 : 2.0;
      bullishScore += shSig.bullish * mult;
      bearishScore += shSig.bearish * mult;
      if (shSig.strength > 0.2) {
        primaryDriver = 'safe_haven_flow';
        maxCorrelation = Math.max(maxCorrelation, shSig.strength);
      }
    }

    // Yield differentials
    const yieldSig = this.analyzeYieldDifferentials(data, baseCurrency, quoteCurrency);
    bullishScore += yieldSig.bullish;
    bearishScore += yieldSig.bearish;
    if (yieldSig.strength > 0.2) {
      primaryDriver = 'yield_differential';
      maxCorrelation = Math.max(maxCorrelation, yieldSig.strength);
    }

    // Risk sentiment
    const riskSig = this.analyzeRiskSentiment(data, symbol);
    bullishScore += riskSig.bullish;
    bearishScore += riskSig.bearish;

    const netScore = bullishScore - bearishScore;
    return {
      signalType: (netScore > 0.2 ? 'buy' : netScore < -0.2 ? 'sell' : null) as 'buy' | 'sell' | null,
      confidence: Math.min(Math.abs(netScore), 1.0),
      primaryDriver,
      riskEnvironment: data.riskSentiment.riskOn ? 'risk_on' : 'risk_off',
      correlationStrength: maxCorrelation,
    };
  }

  private analyzeCommodityRelations(data: IntermarketData, currency: string) {
    let bullish = 0, bearish = 0, strength = 0;
    if (currency === 'AUD') {
      const cc = Math.abs(data.commodityRelations.copper.correlation);
      const gc = Math.abs(data.commodityRelations.gold.correlation);
      if (cc > 0.3) { bullish += 0.3 * cc; strength = Math.max(strength, cc); }
      if (gc > 0.25) { bullish += 0.2 * gc; strength = Math.max(strength, gc); }
    }
    if (currency === 'CAD') {
      const oc = data.commodityRelations.oil.correlation;
      if (Math.abs(oc) > 0.35) {
        if (oc > 0) bullish += 0.4 * Math.abs(oc); else bearish += 0.4 * Math.abs(oc);
        strength = Math.abs(oc);
      }
    }
    if (currency === 'NZD') {
      const gc = Math.abs(data.commodityRelations.gold.correlation);
      if (gc > 0.3) { bullish += 0.25 * gc; strength = Math.max(strength, gc); }
    }
    return { bullish, bearish, strength };
  }

  private analyzeSafeHavenFlow(data: IntermarketData) {
    let bullish = 0, bearish = 0, strength = 0;
    // Use real computed volatility
    if (data.equityIndices.vix.available && data.equityIndices.vix.level !== null) {
      if (data.equityIndices.vix.level > 25) {
        bullish += 0.3;
        strength = Math.max(strength, (data.equityIndices.vix.level - 15) / 20);
      }
    }
    return { bullish, bearish, strength };
  }

  private analyzeYieldDifferentials(data: IntermarketData, base: string, quote: string) {
    let bullish = 0, bearish = 0, strength = 0;
    // Use correlation-based signals since actual yields aren't available
    if (base === 'EUR' && quote === 'USD') {
      const us10yCorr = data.bondMarkets.us10y.correlation;
      if (us10yCorr > 0.4) { bullish += 0.2; strength = us10yCorr; }
      else if (us10yCorr < -0.4) { bearish += 0.2; strength = Math.abs(us10yCorr); }
    }
    return { bullish, bearish, strength };
  }

  private analyzeRiskSentiment(data: IntermarketData, symbol: string) {
    let bullish = 0, bearish = 0;
    const [baseCurrency] = symbol.split('/');
    if (data.riskSentiment.riskOn) {
      if (['AUD', 'NZD', 'CAD'].includes(baseCurrency)) bullish += 0.2 * data.riskSentiment.confidence;
      if (['JPY', 'CHF'].includes(baseCurrency)) bearish += 0.2 * data.riskSentiment.confidence;
    } else {
      if (['JPY', 'CHF'].includes(baseCurrency)) bullish += 0.3 * data.riskSentiment.confidence;
      if (['AUD', 'NZD', 'CAD'].includes(baseCurrency)) bearish += 0.2 * data.riskSentiment.confidence;
    }
    return { bullish, bearish };
  }

  private generateSignal(currentBar: any, analysis: any, intermarketData: IntermarketData, symbol: string, timeframe: string): IntermarketSignal | null {
    if (!analysis.signalType) return null;
    const currentPrice = currentBar.close_price || currentBar.close;
    const high = currentBar.high_price || currentBar.high;
    const low = currentBar.low_price || currentBar.low;
    const volatility = (high - low) / currentPrice;
    const priceBuffer = currentPrice * volatility * (1 + analysis.correlationStrength);

    let adaptiveWeight = 0.9;
    if (analysis.riskEnvironment === 'risk_off' && ['safe_haven_flow', 'USD_strength'].includes(analysis.primaryDriver)) adaptiveWeight = 1.2;
    else if (analysis.riskEnvironment === 'risk_on' && analysis.primaryDriver === 'commodity_correlation') adaptiveWeight = 1.1;

    return {
      moduleId: this.moduleId, symbol, timeframe,
      signalType: analysis.signalType,
      confidence: analysis.confidence,
      strength: Math.round(analysis.confidence * 10),
      weight: adaptiveWeight,
      triggerPrice: currentPrice,
      suggestedEntry: analysis.signalType === 'buy' ? currentPrice + priceBuffer * 0.4 : currentPrice - priceBuffer * 0.4,
      suggestedStopLoss: analysis.signalType === 'buy' ? currentPrice - priceBuffer * 2.0 : currentPrice + priceBuffer * 2.0,
      suggestedTakeProfit: analysis.signalType === 'buy' ? currentPrice + priceBuffer * 3.5 : currentPrice - priceBuffer * 3.5,
      intermarketData, primaryDriver: analysis.primaryDriver,
      riskEnvironment: analysis.riskEnvironment,
      correlationStrength: analysis.correlationStrength,
    };
  }

  private async saveSignal(signal: IntermarketSignal): Promise<void> {
    const { error } = await (supabase as any)
      .from('modular_signals')
      .insert({
        analysis_id: crypto.randomUUID(),
        module_id: signal.moduleId,
        symbol: signal.symbol, timeframe: signal.timeframe,
        signal_type: signal.signalType,
        confidence: signal.confidence,
        strength: signal.strength, weight: signal.weight,
        trigger_price: signal.triggerPrice,
        suggested_entry: signal.suggestedEntry,
        suggested_stop_loss: signal.suggestedStopLoss,
        suggested_take_profit: signal.suggestedTakeProfit,
        trend_context: signal.riskEnvironment,
        volatility_regime: signal.primaryDriver,
        market_data_snapshot: {
          timestamp: new Date().toISOString(),
          price: signal.triggerPrice,
        },
        calculation_parameters: {
          primary_driver: signal.primaryDriver,
          correlation_strength: signal.correlationStrength,
          risk_environment: signal.riskEnvironment,
        },
      });
    if (error) console.error('Error saving intermarket signal:', error);
  }
}
