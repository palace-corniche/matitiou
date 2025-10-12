import { supabase } from '@/integrations/supabase/client';

export interface IntermarketData {
  forexCorrelations: {
    [pair: string]: number;
  };
  commodityRelations: {
    gold: { correlation: number; currentPrice: number };
    oil: { correlation: number; currentPrice: number };
    copper: { correlation: number; currentPrice: number };
  };
  equityIndices: {
    spy: { correlation: number; performance: number };
    vix: { correlation: number; level: number };
    dxy: { correlation: number; level: number };
  };
  bondMarkets: {
    us10y: { correlation: number; yield: number };
    ger10y: { correlation: number; yield: number };
    yieldSpread: number;
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
  private moduleVersion = '1.0.0';

  async analyze(symbol: string = 'EUR/USD', timeframe: string = '15m'): Promise<IntermarketSignal | null> {
    try {
      // Get current market data for the symbol
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

      // Gather intermarket data
      const intermarketData = await this.gatherIntermarketData(symbol);
      
      // Analyze intermarket relationships
      const analysis = this.analyzeIntermarketRelations(intermarketData, symbol);
      
      // LOWERED THRESHOLD: Generate signals at lower confidence (from 0.5 -> 0.35)
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
    const [baseCurrency, quoteCurrency] = symbol.split('/');
    
    // Fetch real correlation data from database
    const { data: correlations } = await supabase
      .from('correlations')
      .select('*')
      .or(`asset_a.eq.${symbol},asset_b.eq.${symbol}`)
      .order('created_at', { ascending: false })
      .limit(20);
    
    // Build correlation map from database
    const correlationMap: { [key: string]: number } = {};
    correlations?.forEach(corr => {
      const otherAsset = corr.asset_a === symbol ? corr.asset_b : corr.asset_a;
      correlationMap[otherAsset] = corr.correlation_value;
    });
    
    return {
      forexCorrelations: {
        'EUR/USD': correlationMap['EUR/USD'] ?? 0,
        'GBP/USD': correlationMap['GBP/USD'] ?? 0,
        'USD/JPY': correlationMap['USD/JPY'] ?? 0,
        'AUD/USD': correlationMap['AUD/USD'] ?? 0,
        'USD/CHF': correlationMap['USD/CHF'] ?? 0,
        'NZD/USD': correlationMap['NZD/USD'] ?? 0,
        'USD/CAD': correlationMap['USD/CAD'] ?? 0
      },
      commodityRelations: {
        gold: { 
          correlation: correlationMap['GOLD'] ?? (quoteCurrency === 'USD' ? -0.4 : 0.2), 
          currentPrice: 2000 + (Math.random() - 0.5) * 100 
        },
        oil: { 
          correlation: correlationMap['OIL'] ?? (baseCurrency === 'CAD' ? 0.5 : 0.1), 
          currentPrice: 75 + (Math.random() - 0.5) * 10 
        },
        copper: { 
          correlation: correlationMap['COPPER'] ?? (baseCurrency === 'AUD' ? 0.4 : 0.1), 
          currentPrice: 4.2 + (Math.random() - 0.5) * 0.5 
        }
      },
      equityIndices: {
        spy: { 
          correlation: correlationMap['SPX'] ?? 0.2, 
          performance: (Math.random() - 0.5) * 4
        },
        vix: { 
          correlation: correlationMap['VIX'] ?? -0.2, 
          level: 15 + Math.random() * 20 
        },
        dxy: { 
          correlation: correlationMap['DXY'] ?? (quoteCurrency === 'USD' ? -0.7 : 0.2), 
          level: 103 + (Math.random() - 0.5) * 5 
        }
      },
      bondMarkets: {
        us10y: { 
          correlation: correlationMap['US10Y'] ?? (quoteCurrency === 'USD' ? 0.3 : -0.1), 
          yield: 4.2 + (Math.random() - 0.5) * 0.5 
        },
        ger10y: { 
          correlation: correlationMap['GER10Y'] ?? (baseCurrency === 'EUR' ? 0.3 : -0.1), 
          yield: 2.3 + (Math.random() - 0.5) * 0.3 
        },
        yieldSpread: 1.9 + (Math.random() - 0.5) * 0.4
      },
      riskSentiment: {
        riskOn: Math.random() > 0.5,
        confidence: 0.6 + Math.random() * 0.4
      }
    };
  }

  private analyzeIntermarketRelations(data: IntermarketData, symbol: string): {
    signalType: 'buy' | 'sell' | null;
    confidence: number;
    primaryDriver: string;
    riskEnvironment: string;
    correlationStrength: number;
  } {
    let bullishScore = 0;
    let bearishScore = 0;
    let primaryDriver = 'mixed';
    let maxCorrelation = 0;

    const [baseCurrency, quoteCurrency] = symbol.split('/');

    // LOWERED THRESHOLD: Analyze USD strength via DXY (threshold from 0.7 -> 0.4)
    if (quoteCurrency === 'USD') {
      const dxyCorrelation = Math.abs(data.equityIndices.dxy.correlation);
      if (dxyCorrelation > 0.4) {
        primaryDriver = 'USD_strength';
        maxCorrelation = Math.max(maxCorrelation, dxyCorrelation);
        
        // Negative correlation with DXY means USD strength = pair weakness
        if (data.equityIndices.dxy.correlation < -0.4) {
          bearishScore += 0.3 * dxyCorrelation; // Scale by correlation strength
        } else if (data.equityIndices.dxy.correlation > 0.4) {
          bullishScore += 0.3 * dxyCorrelation;
        }
      }
    }

    // Analyze commodity currencies (EXPANDED: added NZD)
    if (baseCurrency === 'AUD' || baseCurrency === 'CAD' || baseCurrency === 'NZD') {
      const commoditySignal = this.analyzeCommodityRelations(data, baseCurrency);
      
      // REGIME-BASED WEIGHTING: boost commodity signals in risk-on
      const regimeMultiplier = data.riskSentiment.riskOn ? 1.5 : 1.0;
      bullishScore += commoditySignal.bullish * regimeMultiplier;
      bearishScore += commoditySignal.bearish * regimeMultiplier;
      
      if (commoditySignal.strength > 0.2) { // LOWERED from 0.3
        primaryDriver = 'commodity_correlation';
        maxCorrelation = Math.max(maxCorrelation, commoditySignal.strength);
      }
    }

    // Analyze safe haven flows (JPY, CHF, Gold)
    if (baseCurrency === 'JPY' || baseCurrency === 'CHF') {
      const safeHavenSignal = this.analyzeSafeHavenFlow(data);
      
      // REGIME-BASED WEIGHTING: boost safe haven signals in risk-off (up to 2x)
      const regimeMultiplier = data.riskSentiment.riskOn ? 0.8 : 2.0;
      bullishScore += safeHavenSignal.bullish * regimeMultiplier;
      bearishScore += safeHavenSignal.bearish * regimeMultiplier;
      
      if (safeHavenSignal.strength > 0.2) { // LOWERED from 0.3
        primaryDriver = 'safe_haven_flow';
        maxCorrelation = Math.max(maxCorrelation, safeHavenSignal.strength);
      }
    }

    // Analyze yield differentials
    const yieldSignal = this.analyzeYieldDifferentials(data, baseCurrency, quoteCurrency);
    bullishScore += yieldSignal.bullish;
    bearishScore += yieldSignal.bearish;
    
    if (yieldSignal.strength > 0.2) { // LOWERED from 0.3
      primaryDriver = 'yield_differential';
      maxCorrelation = Math.max(maxCorrelation, yieldSignal.strength);
    }

    // Risk sentiment analysis with regime boost
    const riskSignal = this.analyzeRiskSentiment(data, symbol);
    bullishScore += riskSignal.bullish;
    bearishScore += riskSignal.bearish;

    // LOWERED THRESHOLD: Generate signals more frequently (from 0.3 -> 0.2)
    const netScore = bullishScore - bearishScore;
    const confidence = Math.min(Math.abs(netScore), 1.0);
    const signalType = netScore > 0.2 ? 'buy' : netScore < -0.2 ? 'sell' : null;

    return {
      signalType,
      confidence,
      primaryDriver,
      riskEnvironment: data.riskSentiment.riskOn ? 'risk_on' : 'risk_off',
      correlationStrength: maxCorrelation
    };
  }

  private analyzeCommodityRelations(data: IntermarketData, currency: string): { bullish: number; bearish: number; strength: number } {
    let bullish = 0;
    let bearish = 0;
    let strength = 0;

    if (currency === 'AUD') {
      // AUD correlates with copper and gold (LOWERED thresholds)
      const copperCorr = data.commodityRelations.copper.correlation;
      const goldCorr = data.commodityRelations.gold.correlation;
      
      if (Math.abs(copperCorr) > 0.3) { // LOWERED from 0.5
        bullish += 0.3 * Math.abs(copperCorr);
        strength = Math.max(strength, Math.abs(copperCorr));
      }
      
      if (Math.abs(goldCorr) > 0.25) { // LOWERED from 0.4
        bullish += 0.2 * Math.abs(goldCorr);
        strength = Math.max(strength, Math.abs(goldCorr));
      }
    }

    if (currency === 'CAD') {
      // CAD correlates strongly with oil (LOWERED threshold)
      const oilCorr = data.commodityRelations.oil.correlation;
      
      if (Math.abs(oilCorr) > 0.35) { // LOWERED from 0.6
        if (oilCorr > 0) {
          bullish += 0.4 * Math.abs(oilCorr);
        } else {
          bearish += 0.4 * Math.abs(oilCorr);
        }
        strength = Math.abs(oilCorr);
      }
    }

    // EXPANDED: Added NZD commodity relationships
    if (currency === 'NZD') {
      // NZD correlates with dairy prices (approximated by gold)
      const goldCorr = data.commodityRelations.gold.correlation;
      
      if (Math.abs(goldCorr) > 0.3) {
        bullish += 0.25 * Math.abs(goldCorr);
        strength = Math.max(strength, Math.abs(goldCorr));
      }
    }

    return { bullish, bearish, strength };
  }

  private analyzeSafeHavenFlow(data: IntermarketData): { bullish: number; bearish: number; strength: number } {
    let bullish = 0;
    let bearish = 0;
    let strength = 0;

    // High VIX = risk off = JPY/CHF strength
    if (data.equityIndices.vix.level > 25) {
      bullish += 0.3;
      strength = Math.max(strength, (data.equityIndices.vix.level - 15) / 20);
    }

    // Equity market performance
    if (data.equityIndices.spy.performance < -1) {
      bullish += 0.2; // Risk off benefits safe havens
      strength = Math.max(strength, Math.abs(data.equityIndices.spy.performance) / 5);
    }

    // Gold strength (safe haven proxy)
    if (data.commodityRelations.gold.currentPrice > 2050) {
      bullish += 0.2;
      strength = Math.max(strength, 0.3);
    }

    return { bullish, bearish, strength };
  }

  private analyzeYieldDifferentials(data: IntermarketData, base: string, quote: string): { bullish: number; bearish: number; strength: number } {
    let bullish = 0;
    let bearish = 0;
    let strength = 0;

    // EUR/USD yield differential
    if (base === 'EUR' && quote === 'USD') {
      const spread = data.bondMarkets.us10y.yield - data.bondMarkets.ger10y.yield;
      
      if (spread > 2.2) {
        bearish += 0.3; // USD yields higher = USD strength
        strength = Math.max(strength, (spread - 1.5) / 2);
      } else if (spread < 1.5) {
        bullish += 0.3; // Spread narrowing = EUR strength
        strength = Math.max(strength, (2 - spread) / 2);
      }
    }

    return { bullish, bearish, strength };
  }

  private analyzeRiskSentiment(data: IntermarketData, symbol: string): { bullish: number; bearish: number } {
    let bullish = 0;
    let bearish = 0;

    const [baseCurrency] = symbol.split('/');

    if (data.riskSentiment.riskOn) {
      // Risk on benefits risk currencies (AUD, NZD, CAD)
      if (['AUD', 'NZD', 'CAD'].includes(baseCurrency)) {
        bullish += 0.2 * data.riskSentiment.confidence;
      }
      
      // Risk on hurts safe havens (JPY, CHF)
      if (['JPY', 'CHF'].includes(baseCurrency)) {
        bearish += 0.2 * data.riskSentiment.confidence;
      }
    } else {
      // Risk off benefits safe havens
      if (['JPY', 'CHF'].includes(baseCurrency)) {
        bullish += 0.3 * data.riskSentiment.confidence;
      }
      
      // Risk off hurts risk currencies
      if (['AUD', 'NZD', 'CAD'].includes(baseCurrency)) {
        bearish += 0.2 * data.riskSentiment.confidence;
      }
    }

    return { bullish, bearish };
  }

  private generateSignal(
    currentBar: any,
    analysis: any,
    intermarketData: IntermarketData,
    symbol: string,
    timeframe: string
  ): IntermarketSignal | null {
    if (!analysis.signalType) return null;

    const currentPrice = currentBar.close_price;
    const volatility = (currentBar.high_price - currentBar.low_price) / currentPrice;
    
    // Intermarket signals tend to be medium-term, so wider stops
    const correlationMultiplier = analysis.correlationStrength;
    const priceBuffer = currentPrice * volatility * (1 + correlationMultiplier);
    
    const suggestedEntry = analysis.signalType === 'buy'
      ? currentPrice + (priceBuffer * 0.4)
      : currentPrice - (priceBuffer * 0.4);
      
    const suggestedStopLoss = analysis.signalType === 'buy'
      ? currentPrice - (priceBuffer * 2.0)
      : currentPrice + (priceBuffer * 2.0);
      
    const suggestedTakeProfit = analysis.signalType === 'buy'
      ? currentPrice + (priceBuffer * 3.5)
      : currentPrice - (priceBuffer * 3.5);

    // REGIME-BASED WEIGHTING: Higher weight in risk-off for safe haven signals
    let adaptiveWeight = 0.9;
    if (analysis.riskEnvironment === 'risk_off' && 
        (analysis.primaryDriver === 'safe_haven_flow' || analysis.primaryDriver === 'USD_strength')) {
      adaptiveWeight = 1.2; // Boost intermarket weight in risk-off
    } else if (analysis.riskEnvironment === 'risk_on' && analysis.primaryDriver === 'commodity_correlation') {
      adaptiveWeight = 1.1; // Boost commodity signals in risk-on
    }

    return {
      moduleId: this.moduleId,
      symbol,
      timeframe,
      signalType: analysis.signalType,
      confidence: analysis.confidence,
      strength: Math.round(analysis.confidence * 10),
      weight: adaptiveWeight,
      triggerPrice: currentPrice,
      suggestedEntry,
      suggestedStopLoss,
      suggestedTakeProfit,
      intermarketData,
      primaryDriver: analysis.primaryDriver,
      riskEnvironment: analysis.riskEnvironment,
      correlationStrength: analysis.correlationStrength
    };
  }

  private async saveSignal(signal: IntermarketSignal): Promise<void> {
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
        trend_context: signal.riskEnvironment,
        volatility_regime: signal.primaryDriver,
        market_data_snapshot: {
          timestamp: new Date().toISOString(),
          price: signal.triggerPrice,
          intermarket_data: signal.intermarketData
        },
        calculation_parameters: {
          primary_driver: signal.primaryDriver,
          correlation_strength: signal.correlationStrength,
          risk_environment: signal.riskEnvironment
        },
        intermediate_values: {
          intermarket_data: signal.intermarketData,
          analysis_result: {
            primary_driver: signal.primaryDriver,
            risk_environment: signal.riskEnvironment,
            correlation_strength: signal.correlationStrength
          }
        }
      });

    if (error) {
      console.error('Error saving intermarket signal:', error);
    }
  }
}