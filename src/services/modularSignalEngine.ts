// Modular Signal Engine - Independent analysis domains with full traceability
// Each module generates its own standardized signal with complete parameters

export interface StandardSignal {
  id: string;
  module: 'technical' | 'fundamental' | 'sentiment' | 'multiTimeframe' | 'patterns' | 'strategies';
  timestamp: Date;
  pair: string;
  timeframe: string;
  signal: 'buy' | 'sell' | 'hold';
  probability: number; // 0-1
  confidence: number; // 0-1
  strength: number; // 1-10
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  factors: SignalFactor[];
  reasoning: string;
  validity: number; // Minutes signal remains valid
  historicalAccuracy?: number; // Track performance
}

export interface SignalFactor {
  name: string;
  value: number;
  weight: number;
  contribution: number; // How much this factor contributes to final signal
  threshold?: number;
  description: string;
}

export interface ModularAnalysisResult {
  technical: StandardSignal[];
  fundamental: StandardSignal[];
  sentiment: StandardSignal[];
  multiTimeframe: StandardSignal[];
  patterns: StandardSignal[];
  strategies: StandardSignal[];
  diagnostics: SignalDiagnostics;
}

export interface SignalDiagnostics {
  totalFactors: number;
  activeModules: string[];
  missingModules: string[];
  dataQuality: Record<string, number>; // 0-1 quality score per module
  processingTime: number;
  errors: string[];
  warnings: string[];
}

export class ModularSignalEngine {
  private technicalAnalyzer = new TechnicalSignalModule();
  private fundamentalAnalyzer = new FundamentalSignalModule();
  private sentimentAnalyzer = new SentimentSignalModule();
  private timeframeAnalyzer = new MultiTimeframeSignalModule();
  private patternAnalyzer = new PatternSignalModule();
  private strategyAnalyzer = new StrategySignalModule();

  async generateModularSignals(
    candles: any[],
    pair: string = 'EUR/USD',
    timeframe: string = '15m'
  ): Promise<ModularAnalysisResult> {
    const startTime = Date.now();
    const diagnostics: SignalDiagnostics = {
      totalFactors: 0,
      activeModules: [],
      missingModules: [],
      dataQuality: {},
      processingTime: 0,
      errors: [],
      warnings: []
    };

    console.log(`🔄 Starting modular signal analysis for ${pair} ${timeframe}`);

    // Run all modules in parallel with error handling
    const [
      technicalSignals,
      fundamentalSignals,
      sentimentSignals,
      multiTimeframeSignals,
      patternSignals,
      strategySignals
    ] = await Promise.allSettled([
      this.runWithDiagnostics('technical', () => this.technicalAnalyzer.analyze(candles, pair, timeframe), diagnostics),
      this.runWithDiagnostics('fundamental', () => this.fundamentalAnalyzer.analyze(candles, pair, timeframe), diagnostics),
      this.runWithDiagnostics('sentiment', () => this.sentimentAnalyzer.analyze(candles, pair, timeframe), diagnostics),
      this.runWithDiagnostics('multiTimeframe', () => this.timeframeAnalyzer.analyze(candles, pair, timeframe), diagnostics),
      this.runWithDiagnostics('patterns', () => this.patternAnalyzer.analyze(candles, pair, timeframe), diagnostics),
      this.runWithDiagnostics('strategies', () => this.strategyAnalyzer.analyze(candles, pair, timeframe), diagnostics)
    ]);

    // Extract results with fallbacks
    const result: ModularAnalysisResult = {
      technical: this.extractSignals(technicalSignals),
      fundamental: this.extractSignals(fundamentalSignals),
      sentiment: this.extractSignals(sentimentSignals),
      multiTimeframe: this.extractSignals(multiTimeframeSignals),
      patterns: this.extractSignals(patternSignals),
      strategies: this.extractSignals(strategySignals),
      diagnostics
    };

    // Update diagnostics
    diagnostics.totalFactors = Object.values(result)
      .filter(Array.isArray)
      .flat()
      .reduce((sum, signal: any) => sum + (signal.factors?.length || 0), 0);

    diagnostics.processingTime = Date.now() - startTime;

    console.log(`✅ Modular analysis complete: ${diagnostics.activeModules.length}/6 modules active, ${diagnostics.totalFactors} factors`);

    return result;
  }

  private async runWithDiagnostics<T>(
    moduleName: string,
    fn: () => Promise<T>,
    diagnostics: SignalDiagnostics
  ): Promise<T> {
    try {
      const result = await fn();
      diagnostics.activeModules.push(moduleName);
      diagnostics.dataQuality[moduleName] = 1.0; // Success
      return result;
    } catch (error: any) {
      console.warn(`⚠️ Module ${moduleName} failed:`, error.message);
      diagnostics.missingModules.push(moduleName);
      diagnostics.dataQuality[moduleName] = 0.0; // Failed
      diagnostics.errors.push(`${moduleName}: ${error.message}`);
      throw error;
    }
  }

  private extractSignals(result: PromiseSettledResult<StandardSignal[]>): StandardSignal[] {
    return result.status === 'fulfilled' ? result.value : [];
  }
}

// Technical Analysis Signal Module
class TechnicalSignalModule {
  async analyze(candles: any[], pair: string, timeframe: string): Promise<StandardSignal[]> {
    const signals: StandardSignal[] = [];
    const currentPrice = candles[candles.length - 1].close;

    // RSI Analysis
    const rsiSignal = await this.analyzeRSI(candles, pair, timeframe, currentPrice);
    if (rsiSignal) signals.push(rsiSignal);

    // MACD Analysis  
    const macdSignal = await this.analyzeMACD(candles, pair, timeframe, currentPrice);
    if (macdSignal) signals.push(macdSignal);

    // Moving Average Analysis
    const maSignal = await this.analyzeMovingAverages(candles, pair, timeframe, currentPrice);
    if (maSignal) signals.push(maSignal);

    // Bollinger Bands Analysis
    const bbSignal = await this.analyzeBollingerBands(candles, pair, timeframe, currentPrice);
    if (bbSignal) signals.push(bbSignal);

    return signals;
  }

  private async analyzeRSI(candles: any[], pair: string, timeframe: string, currentPrice: number): Promise<StandardSignal | null> {
    const rsi = this.calculateRSI(candles, 14);
    if (rsi.length === 0) return null;

    const currentRSI = rsi[rsi.length - 1];
    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    let probability = 0.5;
    let strength = 5;
    let stopLoss = currentPrice;
    let takeProfit = currentPrice;

    if (currentRSI < 30) {
      signal = 'buy';
      probability = 0.7 + (30 - currentRSI) / 100;
      strength = Math.min(10, Math.max(6, (30 - currentRSI) / 3));
      stopLoss = currentPrice * 0.99;
      takeProfit = currentPrice * 1.02;
    } else if (currentRSI > 70) {
      signal = 'sell';
      probability = 0.7 + (currentRSI - 70) / 100;
      strength = Math.min(10, Math.max(6, (currentRSI - 70) / 3));
      stopLoss = currentPrice * 1.01;
      takeProfit = currentPrice * 0.98;
    } else {
      return null; // No clear signal
    }

    const riskReward = Math.abs(takeProfit - currentPrice) / Math.abs(currentPrice - stopLoss);

    return {
      id: `rsi_${Date.now()}`,
      module: 'technical',
      timestamp: new Date(),
      pair,
      timeframe,
      signal,
      probability,
      confidence: 0.8,
      strength,
      entry: currentPrice,
      stopLoss,
      takeProfit,
      riskRewardRatio: riskReward,
      factors: [{
        name: 'RSI',
        value: currentRSI,
        weight: 1.0,
        contribution: 1.0,
        threshold: signal === 'buy' ? 30 : 70,
        description: `RSI at ${currentRSI.toFixed(1)} indicates ${signal === 'buy' ? 'oversold' : 'overbought'} conditions`
      }],
      reasoning: `RSI (${currentRSI.toFixed(1)}) is in ${signal === 'buy' ? 'oversold' : 'overbought'} territory, suggesting potential reversal`,
      validity: 60 // Valid for 1 hour
    };
  }

  private async analyzeMACD(candles: any[], pair: string, timeframe: string, currentPrice: number): Promise<StandardSignal | null> {
    const macd = this.calculateMACD(candles);
    if (macd.length < 2) return null;

    const current = macd[macd.length - 1];
    const previous = macd[macd.length - 2];

    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    let probability = 0.5;
    let strength = 5;

    if (current.macd > current.signal && previous.macd <= previous.signal) {
      // Bullish crossover
      signal = 'buy';
      probability = 0.65;
      strength = 7;
    } else if (current.macd < current.signal && previous.macd >= previous.signal) {
      // Bearish crossover
      signal = 'sell';
      probability = 0.65;
      strength = 7;
    } else {
      return null;
    }

    const stopLoss = signal === 'buy' ? currentPrice * 0.99 : currentPrice * 1.01;
    const takeProfit = signal === 'buy' ? currentPrice * 1.02 : currentPrice * 0.98;
    const riskReward = Math.abs(takeProfit - currentPrice) / Math.abs(currentPrice - stopLoss);

    return {
      id: `macd_${Date.now()}`,
      module: 'technical',
      timestamp: new Date(),
      pair,
      timeframe,
      signal,
      probability,
      confidence: 0.75,
      strength,
      entry: currentPrice,
      stopLoss,
      takeProfit,
      riskRewardRatio: riskReward,
      factors: [{
        name: 'MACD Cross',
        value: current.macd - current.signal,
        weight: 1.0,
        contribution: 1.0,
        description: `MACD line crossed ${signal === 'buy' ? 'above' : 'below'} signal line`
      }],
      reasoning: `MACD ${signal === 'buy' ? 'bullish' : 'bearish'} crossover detected`,
      validity: 120 // Valid for 2 hours
    };
  }

  private async analyzeMovingAverages(candles: any[], pair: string, timeframe: string, currentPrice: number): Promise<StandardSignal | null> {
    const sma20 = this.calculateSMA(candles, 20);
    const sma50 = this.calculateSMA(candles, 50);
    
    if (sma20.length === 0 || sma50.length === 0) return null;

    const sma20Current = sma20[sma20.length - 1];
    const sma50Current = sma50[sma50.length - 1];

    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    let probability = 0.5;
    let strength = 5;

    if (sma20Current > sma50Current && currentPrice > sma20Current) {
      signal = 'buy';
      probability = 0.6;
      strength = 6;
    } else if (sma20Current < sma50Current && currentPrice < sma20Current) {
      signal = 'sell';
      probability = 0.6;
      strength = 6;
    } else {
      return null;
    }

    const stopLoss = signal === 'buy' ? sma20Current * 0.995 : sma20Current * 1.005;
    const takeProfit = signal === 'buy' ? currentPrice * 1.015 : currentPrice * 0.985;
    const riskReward = Math.abs(takeProfit - currentPrice) / Math.abs(currentPrice - stopLoss);

    return {
      id: `ma_${Date.now()}`,
      module: 'technical',
      timestamp: new Date(),
      pair,
      timeframe,
      signal,
      probability,
      confidence: 0.7,
      strength,
      entry: currentPrice,
      stopLoss,
      takeProfit,
      riskRewardRatio: riskReward,
      factors: [
        {
          name: 'SMA20',
          value: sma20Current,
          weight: 0.6,
          contribution: 0.6,
          description: `20-period SMA at ${sma20Current.toFixed(5)}`
        },
        {
          name: 'SMA50',
          value: sma50Current,
          weight: 0.4,
          contribution: 0.4,
          description: `50-period SMA at ${sma50Current.toFixed(5)}`
        }
      ],
      reasoning: `${signal === 'buy' ? 'Bullish' : 'Bearish'} MA alignment with price above/below SMA20`,
      validity: 180 // Valid for 3 hours
    };
  }

  private async analyzeBollingerBands(candles: any[], pair: string, timeframe: string, currentPrice: number): Promise<StandardSignal | null> {
    const bb = this.calculateBollingerBands(candles, 20, 2);
    if (bb.length === 0) return null;

    const currentBB = bb[bb.length - 1];
    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    let probability = 0.5;
    let strength = 5;

    const pctBB = (currentPrice - currentBB.lower) / (currentBB.upper - currentBB.lower);

    if (pctBB <= 0.05) { // Near lower band
      signal = 'buy';
      probability = 0.7;
      strength = 8;
    } else if (pctBB >= 0.95) { // Near upper band
      signal = 'sell';
      probability = 0.7;
      strength = 8;
    } else {
      return null;
    }

    const stopLoss = signal === 'buy' ? currentBB.lower * 0.999 : currentBB.upper * 1.001;
    const takeProfit = signal === 'buy' ? currentBB.middle : currentBB.middle;
    const riskReward = Math.abs(takeProfit - currentPrice) / Math.abs(currentPrice - stopLoss);

    return {
      id: `bb_${Date.now()}`,
      module: 'technical',
      timestamp: new Date(),
      pair,
      timeframe,
      signal,
      probability,
      confidence: 0.8,
      strength,
      entry: currentPrice,
      stopLoss,
      takeProfit,
      riskRewardRatio: riskReward,
      factors: [{
        name: 'Bollinger Bands',
        value: pctBB,
        weight: 1.0,
        contribution: 1.0,
        threshold: signal === 'buy' ? 0.05 : 0.95,
        description: `Price at ${(pctBB * 100).toFixed(1)}% of BB range`
      }],
      reasoning: `Price touching ${signal === 'buy' ? 'lower' : 'upper'} Bollinger Band, suggesting reversal`,
      validity: 90 // Valid for 1.5 hours
    };
  }

  // Technical indicator calculations (simplified for brevity)
  private calculateRSI(candles: any[], period: number): number[] {
    if (candles.length < period + 1) return [];
    
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
    }
    
    const rsi: number[] = [];
    let avgGain = gains.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    
    for (let i = period; i < gains.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
      
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
    
    return rsi;
  }

  private calculateMACD(candles: any[]): { macd: number; signal: number; histogram: number }[] {
    const ema12 = this.calculateEMA(candles.map(c => c.close), 12);
    const ema26 = this.calculateEMA(candles.map(c => c.close), 26);
    
    if (ema12.length !== ema26.length || ema12.length < 9) return [];
    
    const macdLine = ema12.map((val, i) => val - ema26[i]);
    const signalLine = this.calculateEMA(macdLine, 9);
    
    return macdLine.slice(-signalLine.length).map((macd, i) => ({
      macd,
      signal: signalLine[i],
      histogram: macd - signalLine[i]
    }));
  }

  private calculateEMA(values: number[], period: number): number[] {
    if (values.length < period) return [];
    
    const k = 2 / (period + 1);
    const ema = [values[0]];
    
    for (let i = 1; i < values.length; i++) {
      ema.push(values[i] * k + ema[i - 1] * (1 - k));
    }
    
    return ema;
  }

  private calculateSMA(candles: any[], period: number): number[] {
    if (candles.length < period) return [];
    
    const sma: number[] = [];
    for (let i = period - 1; i < candles.length; i++) {
      const sum = candles.slice(i - period + 1, i + 1).reduce((sum: number, candle: any) => sum + candle.close, 0);
      sma.push(sum / period);
    }
    
    return sma;
  }

  private calculateBollingerBands(candles: any[], period: number, deviation: number): { upper: number; middle: number; lower: number }[] {
    const sma = this.calculateSMA(candles, period);
    if (sma.length === 0) return [];
    
    const bb: { upper: number; middle: number; lower: number }[] = [];
    
    for (let i = 0; i < sma.length; i++) {
      const candleIndex = i + period - 1;
      const prices = candles.slice(candleIndex - period + 1, candleIndex + 1).map((c: any) => c.close);
      const variance = prices.reduce((sum: number, price: number) => sum + Math.pow(price - sma[i], 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      
      bb.push({
        upper: sma[i] + (stdDev * deviation),
        middle: sma[i],
        lower: sma[i] - (stdDev * deviation)
      });
    }
    
    return bb;
  }
}

// Fundamental Analysis Signal Module
class FundamentalSignalModule {
  async analyze(candles: any[], pair: string, timeframe: string): Promise<StandardSignal[]> {
    // Fundamental analysis would integrate with news API, economic calendar, etc.
    // For now, return empty array as this requires external data sources
    console.log('📰 Fundamental analysis module - requires news/economic data integration');
    return [];
  }
}

// Sentiment Analysis Signal Module  
class SentimentSignalModule {
  async analyze(candles: any[], pair: string, timeframe: string): Promise<StandardSignal[]> {
    // Sentiment analysis would integrate with news sentiment, social media, order flow
    // For now, return empty array as this requires external data sources
    console.log('😊 Sentiment analysis module - requires sentiment data integration');
    return [];
  }
}

// Multi-Timeframe Analysis Signal Module
class MultiTimeframeSignalModule {
  async analyze(candles: any[], pair: string, timeframe: string): Promise<StandardSignal[]> {
    try {
      console.log('⏰ Starting multi-timeframe analysis for', pair);
      
      // Import supabase to fetch different timeframe data
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://gmpmpbuzlybajzrapdrr.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8'
      );

      // Fetch data for H1, H4, D1 timeframes
      const timeframes = ['1h', '4h', '1d'];
      const timeframeData: { [key: string]: any[] } = {};
      
      for (const tf of timeframes) {
        const { data } = await supabase
          .from('market_data_feed')
          .select('*')
          .eq('symbol', pair)
          .eq('timeframe', tf)
          .order('timestamp', { ascending: false })
          .limit(50);
        
        if (data && data.length > 0) {
          timeframeData[tf] = data.reverse(); // Oldest to newest
        }
      }

      // Check if we have data for all timeframes
      if (!timeframeData['1h'] || !timeframeData['4h'] || !timeframeData['1d']) {
        console.log('⚠️ Insufficient multi-timeframe data');
        return [];
      }

      // Analyze trend for each timeframe
      const h1Trend = this.detectTrend(timeframeData['1h']);
      const h4Trend = this.detectTrend(timeframeData['4h']);
      const d1Trend = this.detectTrend(timeframeData['1d']);

      console.log('📊 Multi-timeframe trends:', {
        H1: h1Trend.direction,
        H4: h4Trend.direction,
        D1: d1Trend.direction
      });

      // Check alignment
      const trends = [h1Trend, h4Trend, d1Trend];
      const bullishCount = trends.filter(t => t.direction === 'uptrend').length;
      const bearishCount = trends.filter(t => t.direction === 'downtrend').length;
      
      // Determine overall alignment
      let alignment: 'perfect' | 'strong' | 'weak' | 'conflicting' = 'conflicting';
      let signal: 'buy' | 'sell' | 'hold' = 'hold';
      let confidence = 0;

      if (bullishCount === 3) {
        alignment = 'perfect';
        signal = 'buy';
        confidence = 0.95;
      } else if (bearishCount === 3) {
        alignment = 'perfect';
        signal = 'sell';
        confidence = 0.95;
      } else if (bullishCount === 2 && bearishCount === 0) {
        alignment = 'strong';
        signal = 'buy';
        confidence = 0.75;
      } else if (bearishCount === 2 && bullishCount === 0) {
        alignment = 'strong';
        signal = 'sell';
        confidence = 0.75;
      } else if (bullishCount >= 1 || bearishCount >= 1) {
        alignment = 'weak';
        signal = bullishCount > bearishCount ? 'buy' : 'sell';
        confidence = 0.5;
      }

      // Only generate signal if we have at least weak alignment
      if (alignment === 'conflicting') {
        console.log('❌ Multi-timeframe analysis: Conflicting signals - no trade');
        return [];
      }

      const currentPrice = candles[candles.length - 1].close;
      const avgStrength = (h1Trend.strength + h4Trend.strength + d1Trend.strength) / 3;
      const volatility = this.calculateVolatility(candles);

      // Calculate risk parameters
      const riskMultiplier = alignment === 'perfect' ? 1.5 : alignment === 'strong' ? 1.2 : 1.0;
      const stopDistance = currentPrice * volatility * 2 * riskMultiplier;
      const targetDistance = stopDistance * 2.5;

      const standardSignal: StandardSignal = {
        id: `mtf_${Date.now()}`,
        module: 'multiTimeframe',
        timestamp: new Date(),
        pair,
        timeframe,
        signal,
        probability: confidence,
        confidence,
        strength: Math.round(avgStrength * 10),
        entry: currentPrice,
        stopLoss: signal === 'buy' ? currentPrice - stopDistance : currentPrice + stopDistance,
        takeProfit: signal === 'buy' ? currentPrice + targetDistance : currentPrice - targetDistance,
        riskRewardRatio: 2.5,
        factors: [
          {
            name: 'H1 Trend',
            value: h1Trend.strength,
            weight: 0.3,
            contribution: h1Trend.strength * 0.3,
            description: `1-hour trend: ${h1Trend.direction}`
          },
          {
            name: 'H4 Trend',
            value: h4Trend.strength,
            weight: 0.4,
            contribution: h4Trend.strength * 0.4,
            description: `4-hour trend: ${h4Trend.direction}`
          },
          {
            name: 'D1 Trend',
            value: d1Trend.strength,
            weight: 0.3,
            contribution: d1Trend.strength * 0.3,
            description: `Daily trend: ${d1Trend.direction}`
          },
          {
            name: 'Timeframe Alignment',
            value: alignment === 'perfect' ? 1.0 : alignment === 'strong' ? 0.75 : 0.5,
            weight: 0.5,
            contribution: (alignment === 'perfect' ? 1.0 : alignment === 'strong' ? 0.75 : 0.5) * 0.5,
            description: `Alignment quality: ${alignment}`
          }
        ],
        reasoning: `Multi-timeframe analysis shows ${alignment} ${signal === 'buy' ? 'bullish' : 'bearish'} alignment. H1: ${h1Trend.direction}, H4: ${h4Trend.direction}, D1: ${d1Trend.direction}. ${alignment === 'perfect' ? 'All timeframes confirm direction.' : alignment === 'strong' ? 'Strong consensus across major timeframes.' : 'Partial alignment detected.'}`,
        validity: 240, // 4 hours validity for multi-timeframe signals
        historicalAccuracy: 0.7
      };

      // Store intermediate values for debugging
      (standardSignal as any).intermediateValues = {
        h1_trend: h1Trend.direction,
        h4_trend: h4Trend.direction,
        d1_trend: d1Trend.direction,
        alignment,
        h1_strength: h1Trend.strength,
        h4_strength: h4Trend.strength,
        d1_strength: d1Trend.strength
      };

      console.log('✅ Multi-timeframe signal generated:', alignment, signal);
      return [standardSignal];

    } catch (error) {
      console.error('❌ Multi-timeframe analysis error:', error);
      return [];
    }
  }

  private detectTrend(candles: any[]): { direction: 'uptrend' | 'downtrend' | 'ranging'; strength: number } {
    if (candles.length < 20) {
      return { direction: 'ranging', strength: 0 };
    }

    // Calculate SMAs
    const sma20 = this.calculateSMA(candles, 20);
    const sma50 = candles.length >= 50 ? this.calculateSMA(candles, 50) : null;
    
    const currentPrice = candles[candles.length - 1].close;
    const currentSMA20 = sma20[sma20.length - 1];
    const prevSMA20 = sma20[sma20.length - 2];

    // Price position relative to SMA
    const priceAboveSMA = currentPrice > currentSMA20;
    const smaSlope = (currentSMA20 - prevSMA20) / prevSMA20;

    // Determine trend direction
    let direction: 'uptrend' | 'downtrend' | 'ranging' = 'ranging';
    let strength = 0;

    if (priceAboveSMA && smaSlope > 0.0001) {
      direction = 'uptrend';
      strength = Math.min(Math.abs(smaSlope) * 10000, 1.0); // Normalize to 0-1
    } else if (!priceAboveSMA && smaSlope < -0.0001) {
      direction = 'downtrend';
      strength = Math.min(Math.abs(smaSlope) * 10000, 1.0);
    } else {
      direction = 'ranging';
      strength = 0.3;
    }

    // Boost strength if price is strongly above/below SMA
    const priceDistance = Math.abs((currentPrice - currentSMA20) / currentSMA20);
    if (priceDistance > 0.01) {
      strength = Math.min(strength + 0.2, 1.0);
    }

    // Additional confirmation from SMA50 if available
    if (sma50 && sma50.length > 0) {
      const currentSMA50 = sma50[sma50.length - 1];
      const goldenCross = currentSMA20 > currentSMA50;
      const deathCross = currentSMA20 < currentSMA50;
      
      if ((direction === 'uptrend' && goldenCross) || (direction === 'downtrend' && deathCross)) {
        strength = Math.min(strength + 0.15, 1.0);
      }
    }

    return { direction, strength };
  }

  private calculateSMA(candles: any[], period: number): number[] {
    if (candles.length < period) return [];
    
    const sma: number[] = [];
    for (let i = period - 1; i < candles.length; i++) {
      const sum = candles.slice(i - period + 1, i + 1).reduce((sum: number, candle: any) => sum + candle.price || candle.close, 0);
      sma.push(sum / period);
    }
    
    return sma;
  }

  private calculateVolatility(candles: any[]): number {
    if (candles.length < 2) return 0.01;
    
    const returns = [];
    for (let i = 1; i < candles.length; i++) {
      const ret = Math.log(candles[i].close / candles[i - 1].close);
      returns.push(ret);
    }
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }
}

// Pattern Recognition Signal Module
class PatternSignalModule {
  async analyze(candles: any[], pair: string, timeframe: string): Promise<StandardSignal[]> {
    // Would detect chart patterns, candlestick patterns, harmonic patterns
    // For now, simplified implementation
    console.log('📊 Pattern analysis module - simplified implementation');
    return [];
  }
}

// Strategy-Based Signal Module
class StrategySignalModule {
  async analyze(candles: any[], pair: string, timeframe: string): Promise<StandardSignal[]> {
    // Would implement various trading strategies
    // For now, simplified implementation  
    console.log('🎯 Strategy analysis module - simplified implementation');
    return [];
  }
}

export const modularSignalEngine = new ModularSignalEngine();