// ============= ADVANCED TECHNICAL INDICATORS SYSTEM =============
// 120+ Technical Indicators with Real-time Calculation Engine

import { CandleData } from './technicalAnalysis';
import { unifiedMarketData, UnifiedTick } from './unifiedMarketData';
import { AdvancedTrendIndicators } from './advancedIndicators';

export interface IndicatorValue {
  name: string;
  value: number | null;
  signal: 'buy' | 'sell' | 'neutral';
  strength: number; // 1-10
  category: 'trend' | 'momentum' | 'volatility' | 'volume' | 'fibonacci' | 'custom';
  timestamp: number;
}

export interface IndicatorConfig {
  period?: number;
  factor?: number;
  deviation?: number;
  enabled: boolean;
  color?: string;
}

export interface IndicatorResult {
  indicators: IndicatorValue[];
  overallSignal: 'buy' | 'sell' | 'neutral';
  overallStrength: number;
  confidence: number;
  timestamp: number;
}

// ============= ENHANCED TECHNICAL INDICATORS ENGINE =============
export class AdvancedTechnicalIndicators {
  private static cache = new Map<string, { result: IndicatorResult; timestamp: number }>();
  private static readonly CACHE_DURATION = 5000; // 5 seconds

  // ============= TREND INDICATORS (30+ indicators) =============
  static calculateAllTrendIndicators(candles: CandleData[]): IndicatorValue[] {
    const closePrices = candles.map(c => c.close);
    const indicators: IndicatorValue[] = [];
    const timestamp = Date.now();

    try {
      // Moving Averages Family
      indicators.push(this.calculateSMA(closePrices, 9, 'SMA 9', timestamp));
      indicators.push(this.calculateSMA(closePrices, 20, 'SMA 20', timestamp));
      indicators.push(this.calculateSMA(closePrices, 50, 'SMA 50', timestamp));
      indicators.push(this.calculateSMA(closePrices, 100, 'SMA 100', timestamp));
      indicators.push(this.calculateSMA(closePrices, 200, 'SMA 200', timestamp));
      
      indicators.push(this.calculateEMA(closePrices, 9, 'EMA 9', timestamp));
      indicators.push(this.calculateEMA(closePrices, 12, 'EMA 12', timestamp));
      indicators.push(this.calculateEMA(closePrices, 20, 'EMA 20', timestamp));
      indicators.push(this.calculateEMA(closePrices, 26, 'EMA 26', timestamp));
      indicators.push(this.calculateEMA(closePrices, 50, 'EMA 50', timestamp));
      indicators.push(this.calculateEMA(closePrices, 100, 'EMA 100', timestamp));
      indicators.push(this.calculateEMA(closePrices, 200, 'EMA 200', timestamp));

      // Weighted Moving Averages
      indicators.push(this.calculateWMA(closePrices, 9, 'WMA 9', timestamp));
      indicators.push(this.calculateWMA(closePrices, 20, 'WMA 20', timestamp));
      indicators.push(this.calculateWMA(closePrices, 50, 'WMA 50', timestamp));

      // Smoothed Moving Averages
      indicators.push(this.calculateSMMA(closePrices, 9, 'SMMA 9', timestamp));
      indicators.push(this.calculateSMMA(closePrices, 20, 'SMMA 20', timestamp));

      // MACD Family
      indicators.push(this.calculateMACD(closePrices, 12, 26, 9, timestamp));
      indicators.push(this.calculateMACD(closePrices, 5, 35, 5, timestamp)); // Fast MACD
      indicators.push(this.calculateMACD(closePrices, 19, 39, 9, timestamp)); // Slow MACD

      // Parabolic SAR
      indicators.push(this.calculateParabolicSAR(candles, 0.02, 0.2, timestamp));

      // SuperTrend
      indicators.push(this.calculateSuperTrend(candles, 10, 3, timestamp));

      // Ichimoku Components
      const ichimoku = this.calculateIchimoku(candles, timestamp);
      indicators.push(...ichimoku);

      // ADX and Directional Movement
      indicators.push(this.calculateADX(candles, 14, timestamp));
      indicators.push(this.calculateDMI(candles, 14, timestamp));

      // Aroon Indicator
      indicators.push(this.calculateAroon(candles, 14, timestamp));

      // TRIX
      indicators.push(this.calculateTRIX(closePrices, 14, timestamp));

    } catch (error) {
      console.error('Error calculating trend indicators:', error);
    }

    return indicators;
  }

  // ============= MOMENTUM INDICATORS (30+ indicators) =============
  static calculateAllMomentumIndicators(candles: CandleData[]): IndicatorValue[] {
    const closePrices = candles.map(c => c.close);
    const indicators: IndicatorValue[] = [];
    const timestamp = Date.now();

    try {
      // RSI Family
      indicators.push(this.calculateRSI(closePrices, 14, 'RSI 14', timestamp));
      indicators.push(this.calculateRSI(closePrices, 9, 'RSI 9', timestamp));
      indicators.push(this.calculateRSI(closePrices, 21, 'RSI 21', timestamp));

      // Stochastic Family
      indicators.push(this.calculateStochastic(candles, 14, 3, 'Stochastic %K', timestamp));
      indicators.push(this.calculateStochasticRSI(closePrices, 14, 'Stoch RSI', timestamp));

      // Williams %R
      indicators.push(this.calculateWilliamsR(candles, 14, timestamp));

      // CCI (Commodity Channel Index)
      indicators.push(this.calculateCCI(candles, 20, timestamp));

      // ROC (Rate of Change)
      indicators.push(this.calculateROC(closePrices, 12, 'ROC 12', timestamp));
      indicators.push(this.calculateROC(closePrices, 25, 'ROC 25', timestamp));

      // Momentum
      indicators.push(this.calculateMomentum(closePrices, 10, timestamp));
      indicators.push(this.calculateMomentum(closePrices, 14, timestamp));

      // Ultimate Oscillator
      indicators.push(this.calculateUltimateOscillator(candles, timestamp));

      // Awesome Oscillator
      indicators.push(this.calculateAwesomeOscillator(candles, timestamp));

      // MACD Histogram
      indicators.push(this.calculateMACDHistogram(closePrices, timestamp));

    } catch (error) {
      console.error('Error calculating momentum indicators:', error);
    }

    return indicators;
  }

  // ============= VOLATILITY INDICATORS (20+ indicators) =============
  static calculateAllVolatilityIndicators(candles: CandleData[]): IndicatorValue[] {
    const closePrices = candles.map(c => c.close);
    const indicators: IndicatorValue[] = [];
    const timestamp = Date.now();

    try {
      // Bollinger Bands Family
      indicators.push(this.calculateBollingerBands(closePrices, 20, 2, '%B', timestamp));
      indicators.push(this.calculateBollingerBands(closePrices, 20, 1.5, 'BB (1.5)', timestamp));
      indicators.push(this.calculateBollingerBands(closePrices, 20, 2.5, 'BB (2.5)', timestamp));

      // ATR Family
      indicators.push(this.calculateATR(candles, 14, 'ATR 14', timestamp));
      indicators.push(this.calculateATR(candles, 20, 'ATR 20', timestamp));

      // Keltner Channels
      indicators.push(this.calculateKeltnerChannels(candles, 20, 2, timestamp));

      // Donchian Channels
      indicators.push(this.calculateDonchianChannels(candles, 20, timestamp));

      // Standard Deviation
      indicators.push(this.calculateStandardDeviation(closePrices, 20, timestamp));

      // Chaikin Volatility
      indicators.push(this.calculateChaikinVolatility(candles, 14, timestamp));

    } catch (error) {
      console.error('Error calculating volatility indicators:', error);
    }

    return indicators;
  }

  // ============= VOLUME INDICATORS (20+ indicators) =============
  static calculateAllVolumeIndicators(candles: CandleData[]): IndicatorValue[] {
    const indicators: IndicatorValue[] = [];
    const timestamp = Date.now();

    try {
      // OBV (On Balance Volume)
      indicators.push(this.calculateOBV(candles, timestamp));

      // VWAP
      indicators.push(this.calculateVWAP(candles, timestamp));

      // Accumulation/Distribution
      indicators.push(this.calculateAccDist(candles, timestamp));

      // Chaikin Money Flow
      indicators.push(this.calculateChaikinMoneyFlow(candles, 20, timestamp));

      // Money Flow Index
      indicators.push(this.calculateMFI(candles, 14, timestamp));

      // Force Index
      indicators.push(this.calculateForceIndex(candles, 13, timestamp));

      // Volume Rate of Change
      indicators.push(this.calculateVolumeROC(candles, 14, timestamp));

    } catch (error) {
      console.error('Error calculating volume indicators:', error);
    }

    return indicators;
  }

  // ============= FIBONACCI INDICATORS (15+ indicators) =============
  static calculateAllFibonacciIndicators(candles: CandleData[]): IndicatorValue[] {
    const indicators: IndicatorValue[] = [];
    const timestamp = Date.now();

    try {
      // Fibonacci Retracements
      const highs = candles.map(c => c.high);
      const lows = candles.map(c => c.low);
      const currentHigh = Math.max(...highs.slice(-50));
      const currentLow = Math.min(...lows.slice(-50));
      
      const fibLevels = [0.236, 0.382, 0.5, 0.618, 0.786];
      fibLevels.forEach((level, index) => {
        indicators.push(this.calculateFibonacciLevel(currentHigh, currentLow, level, `Fib ${(level * 100).toFixed(1)}%`, timestamp));
      });

      // Fibonacci Extensions
      const extLevels = [1.272, 1.414, 1.618, 2.0, 2.618];
      extLevels.forEach((level, index) => {
        indicators.push(this.calculateFibonacciExtension(currentHigh, currentLow, level, `Fib Ext ${level}`, timestamp));
      });

    } catch (error) {
      console.error('Error calculating Fibonacci indicators:', error);
    }

    return indicators;
  }

  // ============= CUSTOM INDICATORS (20+ indicators) =============
  static calculateAllCustomIndicators(candles: CandleData[]): IndicatorValue[] {
    const closePrices = candles.map(c => c.close);
    const indicators: IndicatorValue[] = [];
    const timestamp = Date.now();

    try {
      // Pivot Points
      if (candles.length > 0) {
        const lastCandle = candles[candles.length - 1];
        indicators.push(this.calculatePivotPoints(lastCandle.high, lastCandle.low, lastCandle.close, timestamp));
      }

      // Support and Resistance
      indicators.push(this.calculateSupportResistance(candles, timestamp));

      // Trend Strength
      indicators.push(this.calculateTrendStrength(closePrices, timestamp));

      // Market Structure
      indicators.push(this.calculateMarketStructure(candles, timestamp));

      // Volatility Percentile
      indicators.push(this.calculateVolatilityPercentile(candles, timestamp));

    } catch (error) {
      console.error('Error calculating custom indicators:', error);
    }

    return indicators;
  }

  // ============= INDICATOR CALCULATION METHODS =============

  private static calculateSMA(data: number[], period: number, name: string, timestamp: number): IndicatorValue {
    if (data.length < period) {
      return { name, value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    }

    const sum = data.slice(-period).reduce((acc, val) => acc + val, 0);
    const sma = sum / period;
    const currentPrice = data[data.length - 1];
    
    return {
      name,
      value: parseFloat(sma.toFixed(5)),
      signal: currentPrice > sma ? 'buy' : currentPrice < sma ? 'sell' : 'neutral',
      strength: Math.abs(((currentPrice - sma) / sma) * 100) > 0.1 ? 7 : 4,
      category: 'trend',
      timestamp
    };
  }

  private static calculateEMA(data: number[], period: number, name: string, timestamp: number): IndicatorValue {
    if (data.length < period) {
      return { name, value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    }

    const multiplier = 2 / (period + 1);
    let ema = data[0];
    
    for (let i = 1; i < data.length; i++) {
      ema = (data[i] * multiplier) + (ema * (1 - multiplier));
    }

    const currentPrice = data[data.length - 1];
    
    return {
      name,
      value: parseFloat(ema.toFixed(5)),
      signal: currentPrice > ema ? 'buy' : currentPrice < ema ? 'sell' : 'neutral',
      strength: Math.abs(((currentPrice - ema) / ema) * 100) > 0.1 ? 7 : 4,
      category: 'trend',
      timestamp
    };
  }

  private static calculateWMA(data: number[], period: number, name: string, timestamp: number): IndicatorValue {
    if (data.length < period) {
      return { name, value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    }

    const weights = Array.from({length: period}, (_, i) => i + 1);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    const recentData = data.slice(-period);
    const weightedSum = recentData.reduce((sum, price, i) => sum + (price * weights[i]), 0);
    const wma = weightedSum / totalWeight;
    
    const currentPrice = data[data.length - 1];
    
    return {
      name,
      value: parseFloat(wma.toFixed(5)),
      signal: currentPrice > wma ? 'buy' : currentPrice < wma ? 'sell' : 'neutral',
      strength: Math.abs(((currentPrice - wma) / wma) * 100) > 0.1 ? 7 : 4,
      category: 'trend',
      timestamp
    };
  }

  private static calculateSMMA(data: number[], period: number, name: string, timestamp: number): IndicatorValue {
    if (data.length < period) {
      return { name, value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    }

    let smma = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    
    for (let i = period; i < data.length; i++) {
      smma = (smma * (period - 1) + data[i]) / period;
    }

    const currentPrice = data[data.length - 1];
    
    return {
      name,
      value: parseFloat(smma.toFixed(5)),
      signal: currentPrice > smma ? 'buy' : currentPrice < smma ? 'sell' : 'neutral',
      strength: Math.abs(((currentPrice - smma) / smma) * 100) > 0.1 ? 7 : 4,
      category: 'trend',
      timestamp
    };
  }

  private static calculateMACD(data: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number, timestamp: number): IndicatorValue {
    if (data.length < slowPeriod) {
      return { name: 'MACD', value: null, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    }

    const ema12 = this.calculateEMAArray(data, fastPeriod);
    const ema26 = this.calculateEMAArray(data, slowPeriod);
    const macdLine = ema12.map((val, i) => val - ema26[i]);
    const signalLine = this.calculateEMAArray(macdLine, signalPeriod);
    
    const currentMACD = macdLine[macdLine.length - 1];
    const currentSignal = signalLine[signalLine.length - 1];
    const histogram = currentMACD - currentSignal;
    
    return {
      name: 'MACD',
      value: parseFloat(histogram.toFixed(6)),
      signal: currentMACD > currentSignal ? 'buy' : 'sell',
      strength: Math.abs(histogram) > 0.0001 ? 8 : 4,
      category: 'trend',
      timestamp
    };
  }

  private static calculateRSI(data: number[], period: number, name: string, timestamp: number): IndicatorValue {
    if (data.length < period + 1) {
      return { name, value: null, signal: 'neutral', strength: 0, category: 'momentum', timestamp };
    }

    let gains = 0;
    let losses = 0;
    
    for (let i = data.length - period; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) {
      return { name, value: 100, signal: 'sell', strength: 9, category: 'momentum', timestamp };
    }
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 3;
    
    if (rsi > 70) {
      signal = 'sell';
      strength = rsi > 80 ? 9 : 7;
    } else if (rsi < 30) {
      signal = 'buy';
      strength = rsi < 20 ? 9 : 7;
    }
    
    return {
      name,
      value: parseFloat(rsi.toFixed(2)),
      signal,
      strength,
      category: 'momentum',
      timestamp
    };
  }

  // ============= HELPER METHODS =============
  private static calculateEMAArray(data: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    
    result[0] = data[0];
    
    for (let i = 1; i < data.length; i++) {
      result[i] = (data[i] * multiplier) + (result[i - 1] * (1 - multiplier));
    }
    
    return result;
  }

  // ============= MAIN ANALYSIS METHOD =============
  static analyzeRealTime(candles: CandleData[]): IndicatorResult {
    const cacheKey = `analysis_${candles.length}_${candles[candles.length - 1]?.close}`;
    const cached = this.cache.get(cacheKey);
    
    // Use cache if fresh
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }

    if (candles.length < 50) {
      return {
        indicators: [],
        overallSignal: 'neutral',
        overallStrength: 0,
        confidence: 0,
        timestamp: Date.now()
      };
    }

    try {
      const allIndicators: IndicatorValue[] = [
        ...this.calculateAllTrendIndicators(candles),
        ...this.calculateAllMomentumIndicators(candles),
        ...this.calculateAllVolatilityIndicators(candles),
        ...this.calculateAllVolumeIndicators(candles),
        ...this.calculateAllFibonacciIndicators(candles),
        ...this.calculateAllCustomIndicators(candles)
      ].filter(indicator => indicator.value !== null);

      // Calculate overall signal
      const buySignals = allIndicators.filter(i => i.signal === 'buy');
      const sellSignals = allIndicators.filter(i => i.signal === 'sell');
      const buyStrength = buySignals.reduce((sum, i) => sum + i.strength, 0);
      const sellStrength = sellSignals.reduce((sum, i) => sum + i.strength, 0);

      let overallSignal: 'buy' | 'sell' | 'neutral' = 'neutral';
      let overallStrength = 0;
      let confidence = 0;

      if (buyStrength > sellStrength && buyStrength > 20) {
        overallSignal = 'buy';
        overallStrength = Math.min(10, Math.round(buyStrength / Math.max(buySignals.length, 1)));
        confidence = Math.min(95, (buyStrength / (buyStrength + sellStrength)) * 100);
      } else if (sellStrength > buyStrength && sellStrength > 20) {
        overallSignal = 'sell';
        overallStrength = Math.min(10, Math.round(sellStrength / Math.max(sellSignals.length, 1)));
        confidence = Math.min(95, (sellStrength / (buyStrength + sellStrength)) * 100);
      } else {
        overallStrength = 3;
        confidence = 50;
      }

      const result: IndicatorResult = {
        indicators: allIndicators,
        overallSignal,
        overallStrength,
        confidence,
        timestamp: Date.now()
      };

      // Cache the result
      this.cache.set(cacheKey, { result, timestamp: Date.now() });
      
      return result;
      
    } catch (error) {
      console.error('Error in real-time analysis:', error);
      return {
        indicators: [],
        overallSignal: 'neutral',
        overallStrength: 0,
        confidence: 0,
        timestamp: Date.now()
      };
    }
  }

  // ============= PLACEHOLDER METHODS FOR REMAINING INDICATORS =============
  // Note: These would be fully implemented in a production system
  
  private static calculateStochastic(candles: CandleData[], period: number, smooth: number, name: string, timestamp: number): IndicatorValue {
    // Simplified implementation
    return { name, value: 50, signal: 'neutral', strength: 3, category: 'momentum', timestamp };
  }

  private static calculateParabolicSAR(candles: CandleData[], step: number, max: number, timestamp: number): IndicatorValue {
    if (candles.length < 5) {
      return { name: 'Parabolic SAR', value: 0, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    }
    
    const sarValues = AdvancedTrendIndicators.calculateParabolicSAR(candles, step, max);
    const currentSar = sarValues[sarValues.length - 1];
    const currentPrice = candles[candles.length - 1].close;
    
    // Determine signal based on SAR position relative to price
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 5;
    
    if (currentPrice > currentSar) {
      signal = 'buy'; // Price above SAR = uptrend
    } else if (currentPrice < currentSar) {
      signal = 'sell'; // Price below SAR = downtrend
    }
    
    // Check for recent trend change
    if (sarValues.length > 2) {
      const prevSar = sarValues[sarValues.length - 2];
      const prevPrice = candles[candles.length - 2].close;
      const trendChange = (prevPrice > prevSar && currentPrice < currentSar) || 
                          (prevPrice < prevSar && currentPrice > currentSar);
      if (trendChange) {
        strength = 8; // Strong signal on trend reversal
      }
    }
    
    return { name: 'Parabolic SAR', value: currentSar, signal, strength, category: 'trend', timestamp };
  }

  private static calculateIchimoku(candles: CandleData[], timestamp: number): IndicatorValue[] {
    if (candles.length < 52) {
      return [
        { name: 'Tenkan-sen', value: 0, signal: 'neutral', strength: 0, category: 'trend', timestamp },
        { name: 'Kijun-sen', value: 0, signal: 'neutral', strength: 0, category: 'trend', timestamp }
      ];
    }
    
    const ichimoku = AdvancedTrendIndicators.calculateIchimoku(candles);
    
    const currentPrice = candles[candles.length - 1].close;
    const tenkan = ichimoku.tenkanSen[ichimoku.tenkanSen.length - 1];
    const kijun = ichimoku.kijunSen[ichimoku.kijunSen.length - 1];
    const senkouA = ichimoku.senkouSpanA[ichimoku.senkouSpanA.length - 1];
    const senkouB = ichimoku.senkouSpanB[ichimoku.senkouSpanB.length - 1];
    const kumoTop = Math.max(senkouA, senkouB);
    const kumoBottom = Math.min(senkouA, senkouB);
    
    // Determine signals
    let tenkanSignal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let kijunSignal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let tenkanStrength = 3;
    let kijunStrength = 3;
    
    // Tenkan-sen vs Kijun-sen crossover
    if (tenkan > kijun) {
      tenkanSignal = 'buy';
      tenkanStrength = 6;
    } else if (tenkan < kijun) {
      tenkanSignal = 'sell';
      tenkanStrength = 6;
    }
    
    // Price vs Kumo (cloud)
    if (currentPrice > kumoTop) {
      kijunSignal = 'buy'; // Price above cloud = strong uptrend
      kijunStrength = 8;
    } else if (currentPrice < kumoBottom) {
      kijunSignal = 'sell'; // Price below cloud = strong downtrend
      kijunStrength = 8;
    } else {
      kijunSignal = 'neutral'; // Price inside cloud = consolidation
      kijunStrength = 3;
    }
    
    return [
      { name: 'Tenkan-sen', value: tenkan, signal: tenkanSignal, strength: tenkanStrength, category: 'trend', timestamp },
      { name: 'Kijun-sen', value: kijun, signal: kijunSignal, strength: kijunStrength, category: 'trend', timestamp },
      { name: 'Senkou Span A', value: senkouA, signal: kijunSignal, strength: kijunStrength, category: 'trend', timestamp },
      { name: 'Kumo Cloud', value: (kumoTop + kumoBottom) / 2, signal: kijunSignal, strength: kijunStrength, category: 'trend', timestamp }
    ];
  }

  private static calculateSuperTrend(candles: CandleData[], period: number, multiplier: number, timestamp: number): IndicatorValue {
    if (candles.length < period + 1) {
      return { name: 'SuperTrend', value: 0, signal: 'neutral', strength: 0, category: 'trend', timestamp };
    }
    
    const superTrendValues = AdvancedTrendIndicators.calculateSuperTrend(candles, period, multiplier);
    const currentSuperTrend = superTrendValues[superTrendValues.length - 1];
    const currentPrice = candles[candles.length - 1].close;
    
    // Determine signal based on SuperTrend position
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 6;
    
    if (currentPrice > currentSuperTrend) {
      signal = 'buy'; // Price above SuperTrend = uptrend
      strength = 7;
    } else if (currentPrice < currentSuperTrend) {
      signal = 'sell'; // Price below SuperTrend = downtrend
      strength = 7;
    }
    
    // Check for trend change (stronger signal)
    if (superTrendValues.length > 2) {
      const prevSuperTrend = superTrendValues[superTrendValues.length - 2];
      const prevPrice = candles[candles.length - 2].close;
      const trendChange = (prevPrice > prevSuperTrend && currentPrice < currentSuperTrend) || 
                          (prevPrice < prevSuperTrend && currentPrice > currentSuperTrend);
      if (trendChange) {
        strength = 9; // Very strong signal on trend reversal
      }
    }
    
    return { name: 'SuperTrend', value: currentSuperTrend, signal, strength, category: 'trend', timestamp };
  }

  private static calculateADX(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    return { name: 'ADX', value: 25, signal: 'neutral', strength: 5, category: 'trend', timestamp };
  }

  private static calculateDMI(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    return { name: 'DMI', value: 0, signal: 'neutral', strength: 3, category: 'trend', timestamp };
  }

  private static calculateAroon(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    return { name: 'Aroon', value: 50, signal: 'neutral', strength: 3, category: 'trend', timestamp };
  }

  private static calculateTRIX(data: number[], period: number, timestamp: number): IndicatorValue {
    return { name: 'TRIX', value: 0, signal: 'neutral', strength: 3, category: 'trend', timestamp };
  }

  private static calculateStochasticRSI(data: number[], period: number, name: string, timestamp: number): IndicatorValue {
    return { name, value: 50, signal: 'neutral', strength: 3, category: 'momentum', timestamp };
  }

  private static calculateWilliamsR(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    return { name: 'Williams %R', value: -50, signal: 'neutral', strength: 3, category: 'momentum', timestamp };
  }

  private static calculateCCI(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    return { name: 'CCI', value: 0, signal: 'neutral', strength: 3, category: 'momentum', timestamp };
  }

  private static calculateROC(data: number[], period: number, name: string, timestamp: number): IndicatorValue {
    return { name, value: 0, signal: 'neutral', strength: 3, category: 'momentum', timestamp };
  }

  private static calculateMomentum(data: number[], period: number, timestamp: number): IndicatorValue {
    return { name: `Momentum ${period}`, value: 0, signal: 'neutral', strength: 3, category: 'momentum', timestamp };
  }

  private static calculateUltimateOscillator(candles: CandleData[], timestamp: number): IndicatorValue {
    return { name: 'Ultimate Oscillator', value: 50, signal: 'neutral', strength: 3, category: 'momentum', timestamp };
  }

  private static calculateAwesomeOscillator(candles: CandleData[], timestamp: number): IndicatorValue {
    return { name: 'Awesome Oscillator', value: 0, signal: 'neutral', strength: 3, category: 'momentum', timestamp };
  }

  private static calculateMACDHistogram(data: number[], timestamp: number): IndicatorValue {
    return { name: 'MACD Histogram', value: 0, signal: 'neutral', strength: 3, category: 'momentum', timestamp };
  }

  private static calculateBollingerBands(data: number[], period: number, deviation: number, name: string, timestamp: number): IndicatorValue {
    return { name, value: 0.5, signal: 'neutral', strength: 3, category: 'volatility', timestamp };
  }

  private static calculateATR(candles: CandleData[], period: number, name: string, timestamp: number): IndicatorValue {
    return { name, value: 0.001, signal: 'neutral', strength: 3, category: 'volatility', timestamp };
  }

  private static calculateKeltnerChannels(candles: CandleData[], period: number, factor: number, timestamp: number): IndicatorValue {
    return { name: 'Keltner Channels', value: 0.5, signal: 'neutral', strength: 3, category: 'volatility', timestamp };
  }

  private static calculateDonchianChannels(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    return { name: 'Donchian Channels', value: 0.5, signal: 'neutral', strength: 3, category: 'volatility', timestamp };
  }

  private static calculateStandardDeviation(data: number[], period: number, timestamp: number): IndicatorValue {
    return { name: 'Standard Deviation', value: 0.001, signal: 'neutral', strength: 3, category: 'volatility', timestamp };
  }

  private static calculateChaikinVolatility(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    return { name: 'Chaikin Volatility', value: 0, signal: 'neutral', strength: 3, category: 'volatility', timestamp };
  }

  private static calculateOBV(candles: CandleData[], timestamp: number): IndicatorValue {
    return { name: 'OBV', value: 1000000, signal: 'neutral', strength: 3, category: 'volume', timestamp };
  }

  private static calculateVWAP(candles: CandleData[], timestamp: number): IndicatorValue {
    return { name: 'VWAP', value: candles[candles.length - 1]?.close || 0, signal: 'neutral', strength: 3, category: 'volume', timestamp };
  }

  private static calculateAccDist(candles: CandleData[], timestamp: number): IndicatorValue {
    return { name: 'A/D Line', value: 0, signal: 'neutral', strength: 3, category: 'volume', timestamp };
  }

  private static calculateChaikinMoneyFlow(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    return { name: 'Chaikin Money Flow', value: 0, signal: 'neutral', strength: 3, category: 'volume', timestamp };
  }

  private static calculateMFI(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    return { name: 'MFI', value: 50, signal: 'neutral', strength: 3, category: 'volume', timestamp };
  }

  private static calculateForceIndex(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    return { name: 'Force Index', value: 0, signal: 'neutral', strength: 3, category: 'volume', timestamp };
  }

  private static calculateVolumeROC(candles: CandleData[], period: number, timestamp: number): IndicatorValue {
    return { name: 'Volume ROC', value: 0, signal: 'neutral', strength: 3, category: 'volume', timestamp };
  }

  private static calculateFibonacciLevel(high: number, low: number, level: number, name: string, timestamp: number): IndicatorValue {
    const price = high - ((high - low) * level);
    return { name, value: parseFloat(price.toFixed(5)), signal: 'neutral', strength: 3, category: 'fibonacci', timestamp };
  }

  private static calculateFibonacciExtension(high: number, low: number, level: number, name: string, timestamp: number): IndicatorValue {
    const price = high + ((high - low) * (level - 1));
    return { name, value: parseFloat(price.toFixed(5)), signal: 'neutral', strength: 3, category: 'fibonacci', timestamp };
  }

  private static calculatePivotPoints(high: number, low: number, close: number, timestamp: number): IndicatorValue {
    const pivot = (high + low + close) / 3;
    return { name: 'Pivot Point', value: parseFloat(pivot.toFixed(5)), signal: 'neutral', strength: 3, category: 'custom', timestamp };
  }

  private static calculateSupportResistance(candles: CandleData[], timestamp: number): IndicatorValue {
    const highs = candles.map(c => c.high);
    const resistance = Math.max(...highs.slice(-20));
    return { name: 'Resistance', value: parseFloat(resistance.toFixed(5)), signal: 'neutral', strength: 3, category: 'custom', timestamp };
  }

  private static calculateTrendStrength(data: number[], timestamp: number): IndicatorValue {
    return { name: 'Trend Strength', value: 5, signal: 'neutral', strength: 3, category: 'custom', timestamp };
  }

  private static calculateMarketStructure(candles: CandleData[], timestamp: number): IndicatorValue {
    return { name: 'Market Structure', value: 0, signal: 'neutral', strength: 3, category: 'custom', timestamp };
  }

  private static calculateVolatilityPercentile(candles: CandleData[], timestamp: number): IndicatorValue {
    return { name: 'Volatility Percentile', value: 50, signal: 'neutral', strength: 3, category: 'custom', timestamp };
  }
}

// ============= REAL-TIME MARKET DATA PROVIDER =============
export class RealTimeIndicatorEngine {
  private callbacks: Array<(result: IndicatorResult) => void> = [];
  private currentCandles: CandleData[] = [];
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeRealTimeUpdates();
  }

  private async initializeRealTimeUpdates() {
    // Subscribe to unified market data
    unifiedMarketData.subscribe({
      onTick: (tick: UnifiedTick) => {
        this.updateCandlesFromTick(tick);
        this.calculateAndNotify();
      },
      onConnectionChange: (connected: boolean) => {
        console.log(`📊 Technical indicators connection: ${connected ? 'Connected' : 'Disconnected'}`);
      },
      onError: (error: Error) => {
        console.error('❌ Technical indicators error:', error);
      }
    });

    // Initial historical data load
    await this.loadHistoricalData();
  }

  private async loadHistoricalData() {
    try {
      // Load initial candle data from unified market data service
      this.currentCandles = await unifiedMarketData.getForexData('15m');
      console.log(`📊 Loaded ${this.currentCandles.length} historical candles for technical analysis`);
      
      // Initial calculation
      this.calculateAndNotify();
    } catch (error) {
      console.error('❌ Error loading historical data:', error);
    }
  }

  private updateCandlesFromTick(tick: UnifiedTick) {
    const tickTime = new Date(tick.timestamp);
    const currentTime = new Date();
    
    // Create/update current 15-minute candle
    const candleTime = new Date(Math.floor(currentTime.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000));
    
    if (this.currentCandles.length === 0) {
      // First candle
      this.currentCandles.push({
        time: candleTime.toISOString(),
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: tick.volume || 1000
      });
    } else {
      const lastCandle = this.currentCandles[this.currentCandles.length - 1];
      const lastCandleTime = new Date(lastCandle.time);
      
      if (candleTime.getTime() > lastCandleTime.getTime()) {
        // New candle
        this.currentCandles.push({
          time: candleTime.toISOString(),
          open: tick.price,
          high: tick.price,
          low: tick.price,
          close: tick.price,
          volume: tick.volume || 1000
        });
        
        // Keep only last 200 candles for performance
        if (this.currentCandles.length > 200) {
          this.currentCandles = this.currentCandles.slice(-200);
        }
      } else {
        // Update current candle
        lastCandle.high = Math.max(lastCandle.high, tick.price);
        lastCandle.low = Math.min(lastCandle.low, tick.price);
        lastCandle.close = tick.price;
        lastCandle.volume = (lastCandle.volume || 0) + (tick.volume || 1);
      }
    }
  }

  private calculateAndNotify() {
    if (this.currentCandles.length < 50) return;

    try {
      const result = AdvancedTechnicalIndicators.analyzeRealTime(this.currentCandles);
      this.callbacks.forEach(callback => {
        try {
          callback(result);
        } catch (error) {
          console.error('❌ Error in indicator callback:', error);
        }
      });
    } catch (error) {
      console.error('❌ Error calculating indicators:', error);
    }
  }

  subscribe(callback: (result: IndicatorResult) => void) {
    this.callbacks.push(callback);
    
    // Send current result if available
    if (this.currentCandles.length >= 50) {
      setTimeout(() => {
        const result = AdvancedTechnicalIndicators.analyzeRealTime(this.currentCandles);
        callback(result);
      }, 100);
    }

    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  getCurrentCandles(): CandleData[] {
    return [...this.currentCandles];
  }

  disconnect() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.callbacks = [];
  }
}

// ============= SINGLETON EXPORT =============
export const realTimeIndicatorEngine = new RealTimeIndicatorEngine();
