import { TechnicalAnalysisEngine, type CandleData, type IndicatorResult } from './technicalAnalysis';
import { CandlestickPatternRecognition, ChartPatternRecognition, type CandlestickPattern, type ChartPattern } from './patternRecognition';
import { HarmonicPatternRecognition, ElliottWaveAnalysis, type HarmonicPattern, type ElliottWave } from './harmonicPatterns';
import { 
  ScalpingStrategies, 
  DayTradingStrategies, 
  SwingTradingStrategies, 
  MultiTimeframeEngine,
  type StrategySignal,
  type MultiTimeframeAnalysis 
} from './tradingStrategies';
import { 
  AdvancedTrendIndicators, 
  FibonacciTools, 
  GannAnalysis, 
  PivotPoints,
  AdvancedVolumeIndicators,
  MarketStructure,
  type FibonacciLevel,
  type PivotLevels
} from './advancedIndicators';
import { ConfluenceEngine, type ConfluenceSignal } from './confluenceEngine';
import { newsAnalysisEngine } from './newsAnalysis';
import { globalShadowTradingEngine } from './globalShadowTradingEngine';

export class EnhancedSignalEngine {
  private confluenceEngine = new ConfluenceEngine();
  private harmonicRecognition = new HarmonicPatternRecognition();

  async generateComprehensiveSignal(candles: CandleData[], pair?: string, timeframe?: string): Promise<ConfluenceSignal | null> {
    try {
      if (candles.length < 50) {
        console.warn('Insufficient data for comprehensive analysis');
        return null;
      }

      console.log(`🎯 Starting comprehensive analysis for ${pair || 'Unknown Pair'} (${timeframe || '1h'}) with ${candles.length} candles`);
      
      const currentPrice = candles[candles.length - 1].close;
      
      // Perform all analyses in parallel for maximum efficiency
      const [
        indicators,
        patterns,
        strategies,
        multiTimeframeAnalysis,
        newsAnalysis
      ] = await Promise.all([
        this.calculateAdvancedIndicators(candles),
        this.analyzeAllPatterns(candles),
        this.analyzeAllStrategies(candles, timeframe || '1h'),
        this.performMultiTimeframeAnalysis(candles, pair || 'EUR/USD'),
        newsAnalysisEngine.analyzeNewsImpact(pair || 'EUR/USD', 6)
      ]);

      // Generate confluence signal using all available data
      const signal = await this.confluenceEngine.analyzeConfluence(
        indicators,
        patterns.candlestickPatterns,
        patterns.chartPatterns, 
        patterns.harmonicPatterns,
        patterns.elliottWaves,
        strategies,
        patterns.fibonacciLevels,
        [patterns.pivotLevels],
        multiTimeframeAnalysis,
        candles,
        currentPrice,
        newsAnalysis,
        pair || 'EUR/USD'
      );

      if (signal) {
        console.log(`✅ Generated ${signal.signal} signal with ${signal.confluenceScore.toFixed(0)}% confluence from ${signal.factors.length} factors`);
        
        // Note: Trade execution is now handled by the backend edge function (execute-shadow-trades)
        // The frontend just displays the signal analysis
      } else {
        console.log('❌ Insufficient confluence for signal generation');
      }

      return signal;
    } catch (error) {
      console.error('Enhanced signal generation failed:', error);
      return null;
    }
  }

  async calculateAdvancedIndicators(candles: CandleData[]): Promise<IndicatorResult[]> {
    const indicators: IndicatorResult[] = [];
    
    try {
      // RSI with divergence detection
      const rsi = this.calculateRSI(candles, 14);
      if (rsi.length > 0) {
        const currentRSI = rsi[rsi.length - 1];
        if (currentRSI < 30) {
          indicators.push({
            name: 'RSI Oversold',
            value: currentRSI,
            signal: 'buy',
            strength: Math.max(1, (30 - currentRSI) / 5)
          });
        } else if (currentRSI > 70) {
          indicators.push({
            name: 'RSI Overbought',
            value: currentRSI,
            signal: 'sell',
            strength: Math.max(1, (currentRSI - 70) / 5)
          });
        }
      }

      // MACD analysis
      const macd = this.calculateMACD(candles);
      if (macd.length > 1) {
        const current = macd[macd.length - 1];
        const previous = macd[macd.length - 2];
        
        if (current.macd > current.signal && previous.macd <= previous.signal) {
          indicators.push({
            name: 'MACD Bullish Cross',
            value: current.macd,
            signal: 'buy',
            strength: Math.min(10, Math.abs(current.macd - current.signal) * 1000)
          });
        } else if (current.macd < current.signal && previous.macd >= previous.signal) {
          indicators.push({
            name: 'MACD Bearish Cross',
            value: current.macd,
            signal: 'sell',
            strength: Math.min(10, Math.abs(current.macd - current.signal) * 1000)
          });
        }
      }

      // Moving Average analysis
      const sma20 = this.calculateSMA(candles, 20);
      const sma50 = this.calculateSMA(candles, 50);
      
      if (sma20.length > 0 && sma50.length > 0) {
        const currentPrice = candles[candles.length - 1].close;
        const sma20Current = sma20[sma20.length - 1];
        const sma50Current = sma50[sma50.length - 1];
        
        if (sma20Current > sma50Current && currentPrice > sma20Current) {
          indicators.push({
            name: 'MA Bullish Alignment',
            value: currentPrice,
            signal: 'buy',
            strength: 7
          });
        } else if (sma20Current < sma50Current && currentPrice < sma20Current) {
          indicators.push({
            name: 'MA Bearish Alignment',
            value: currentPrice,
            signal: 'sell',
            strength: 7
          });
        }
      }

      // Bollinger Bands
      const bb = this.calculateBollingerBands(candles, 20, 2);
      if (bb.length > 0) {
        const currentPrice = candles[candles.length - 1].close;
        const currentBB = bb[bb.length - 1];
        
        if (currentPrice <= currentBB.lower) {
          indicators.push({
            name: 'Bollinger Band Oversold',
            value: currentPrice,
            signal: 'buy',
            strength: 8
          });
        } else if (currentPrice >= currentBB.upper) {
          indicators.push({
            name: 'Bollinger Band Overbought',
            value: currentPrice,
            signal: 'sell',
            strength: 8
          });
        }
      }

    } catch (error) {
      console.error('Error calculating advanced indicators:', error);
    }

    return indicators;
  }

  async analyzeAllPatterns(candles: CandleData[]) {
    try {
      // Real candlestick patterns from patternRecognition.ts (28 patterns)
      const candlestickPatterns = CandlestickPatternRecognition.detectPatterns(candles);
      
      // Real chart patterns (H&S, triangles, wedges, flags, double top/bottom)
      const chartPatterns = ChartPatternRecognition.analyzePatterns(candles);
      
      // Real harmonic patterns (ABCD, Gartley, Butterfly, Bat, Crab, Shark, Cypher, Three Drives)
      const harmonicPatterns = HarmonicPatternRecognition.detectAllPatterns(candles);
      
      // Real Elliott Wave analysis (impulse + corrective: zigzag, flat, triangle)
      const elliottWaves = ElliottWaveAnalysis.analyzeWaves(candles);
      
      // Fibonacci levels
      const fibonacciLevels = this.calculateFibonacciLevels(candles);
      
      // Pivot levels
      const pivotLevels = this.calculatePivotLevels(candles);

      return {
        candlestickPatterns,
        chartPatterns,
        harmonicPatterns,
        elliottWaves,
        fibonacciLevels,
        pivotLevels
      };
    } catch (error) {
      console.error('Error analyzing patterns:', error);
      return {
        candlestickPatterns: [],
        chartPatterns: [],
        harmonicPatterns: [],
        elliottWaves: [],
        fibonacciLevels: [],
        pivotLevels: []
      };
    }
  }

  async analyzeAllStrategies(candles: CandleData[], timeframe: string): Promise<StrategySignal[]> {
    const strategies: StrategySignal[] = [];
    
    try {
      // Run all real strategy engines from tradingStrategies.ts (1 arg each)
      const scalpingSignals = [
        ScalpingStrategies.rsiDivergenceScalp(candles),
        ScalpingStrategies.stochasticCrossover(candles),
        ScalpingStrategies.macdHistogramScalp(candles),
      ];

      const dayTradingSignals = [
        DayTradingStrategies.pivotPointBounce(candles),
        DayTradingStrategies.keltnerChannelBreakout(candles),
        DayTradingStrategies.tripleEmaCrossover(candles),
        DayTradingStrategies.macdHistogramReversal(candles),
      ];

      const swingSignals = [
        SwingTradingStrategies.superTrendFollowing(candles),
        SwingTradingStrategies.doubleTopBottomEntry(candles),
        SwingTradingStrategies.adxTrendStrength(candles),
      ];

      // Collect all non-null, non-neutral signals
      const allSignals = [
        ...scalpingSignals,
        ...dayTradingSignals,
        ...swingSignals,
      ];

      for (const sig of allSignals) {
        if (sig && sig.signal !== 'neutral') {
          strategies.push(sig);
        }
      }

      // Multi-timeframe analysis using single candle set (simulated timeframes)
      const mtfData: { [key: string]: CandleData[] } = { [timeframe]: candles };
      const mtf = MultiTimeframeEngine.analyzeMultipleTimeframes(mtfData);
      if (mtf.overallBias !== 'neutral') {
        strategies.push({
          name: 'Multi-Timeframe Alignment',
          type: 'swing_trading',
          signal: mtf.overallBias === 'bullish' ? 'buy' : 'sell',
          confidence: mtf.alignment / 100,
          strength: mtf.alignment / 100 * 8,
          entry: candles[candles.length - 1].close,
          stopLoss: candles[candles.length - 1].close * (mtf.overallBias === 'bullish' ? 0.99 : 1.01),
          takeProfit: candles[candles.length - 1].close * (mtf.overallBias === 'bullish' ? 1.02 : 0.98),
          riskReward: 2.0,
          timeframe,
          conditions: [`MTF alignment: ${mtf.alignment.toFixed(0)}%`],
          description: `Multi-timeframe ${mtf.overallBias} alignment`
        });
      }
    } catch (error) {
      console.error('Error analyzing strategies:', error);
    }

    return strategies;
  }

  async performMultiTimeframeAnalysis(candles: CandleData[], pair: string): Promise<MultiTimeframeAnalysis> {
    try {
      const timeframes: Record<string, { trend: 'bullish' | 'bearish' | 'neutral'; strength: number; signals: StrategySignal[] }> = {};

      // Analyze different timeframes (simplified)
      const timeframeList = ['1h', '4h', '1d'];
      
      for (const tf of timeframeList) {
        const sma20 = this.calculateSMA(candles, 20);
        const sma50 = this.calculateSMA(candles, 50);
        
        let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
        let strength = 5;
        
        if (sma20.length > 0 && sma50.length > 0) {
          const sma20Current = sma20[sma20.length - 1];
          const sma50Current = sma50[sma50.length - 1];
          
          if (sma20Current > sma50Current) {
            trend = 'bullish';
            strength = 7;
          } else if (sma20Current < sma50Current) {
            trend = 'bearish';
            strength = 7;
          }
        }
        
        timeframes[tf] = {
          trend,
          strength,
          signals: []
        };
      }

      // Calculate alignment (0-100%)
      const trends = Object.values(timeframes).map(tf => tf.trend);
      const bullishCount = trends.filter(t => t === 'bullish').length;
      const bearishCount = trends.filter(t => t === 'bearish').length;
      const totalCount = trends.length;
      
      const alignmentPercent = Math.max(bullishCount, bearishCount) / totalCount * 100;
      
      // Determine overall bias
      let overallBias: 'bullish' | 'bearish' | 'neutral';
      if (bullishCount > bearishCount) overallBias = 'bullish';
      else if (bearishCount > bullishCount) overallBias = 'bearish';
      else overallBias = 'neutral';

      return {
        timeframes,
        alignment: alignmentPercent,
        overallBias
      };
    } catch (error) {
      console.error('Error in multi-timeframe analysis:', error);
      return {
        timeframes: { 
          '1h': { trend: 'neutral', strength: 5, signals: [] }
        },
        alignment: 33,
        overallBias: 'neutral'
      };
    }
  }

  // Old inline methods removed — now using CandlestickPatternRecognition, ChartPatternRecognition, ElliottWaveAnalysis from imported modules

  private calculateFibonacciLevels(candles: CandleData[]): FibonacciLevel[] {
    const levels: FibonacciLevel[] = [];
    
    if (candles.length < 20) return levels;

    const recent = candles.slice(-20);
    const high = Math.max(...recent.map(c => c.high));
    const low = Math.min(...recent.map(c => c.low));
    const range = high - low;

    const fibLevels = [0.236, 0.382, 0.5, 0.618, 0.786];
    
    fibLevels.forEach(fib => {
      const price = low + (range * fib);
      levels.push({
        level: fib,
        price,
        type: 'retracement'
      });
    });

    return levels;
  }

  private calculatePivotLevels(candles: CandleData[]): PivotLevels {
    if (candles.length < 1) {
      return {
        type: 'standard',
        pivot: 0,
        support1: 0, support2: 0, support3: 0,
        resistance1: 0, resistance2: 0, resistance3: 0
      };
    }

    const lastCandle = candles[candles.length - 1];
    const pivot = (lastCandle.high + lastCandle.low + lastCandle.close) / 3;
    
    return {
      type: 'standard',
      pivot,
      resistance1: 2 * pivot - lastCandle.low,
      resistance2: pivot + (lastCandle.high - lastCandle.low),
      resistance3: lastCandle.high + 2 * (pivot - lastCandle.low),
      support1: 2 * pivot - lastCandle.high,
      support2: pivot - (lastCandle.high - lastCandle.low),
      support3: lastCandle.low - 2 * (lastCandle.high - pivot)
    };
  }

  // Technical indicator calculations
  private calculateRSI(candles: CandleData[], period: number): number[] {
    if (candles.length < period + 1) return [];

    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }

    return rsi;
  }

  private calculateMACD(candles: CandleData[]): Array<{macd: number, signal: number, histogram: number}> {
    if (candles.length < 26) return [];

    const ema12 = this.calculateEMA(candles, 12);
    const ema26 = this.calculateEMA(candles, 26);
    
    const macdLine: number[] = [];
    for (let i = 0; i < Math.min(ema12.length, ema26.length); i++) {
      macdLine.push(ema12[i] - ema26[i]);
    }

    const signalLine = this.calculateEMAFromArray(macdLine, 9);
    
    const result: Array<{macd: number, signal: number, histogram: number}> = [];
    for (let i = 0; i < Math.min(macdLine.length, signalLine.length); i++) {
      result.push({
        macd: macdLine[i],
        signal: signalLine[i],
        histogram: macdLine[i] - signalLine[i]
      });
    }

    return result;
  }

  private calculateSMA(candles: CandleData[], period: number): number[] {
    if (candles.length < period) return [];

    const sma: number[] = [];
    for (let i = period - 1; i < candles.length; i++) {
      const sum = candles.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + candle.close, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  private calculateEMA(candles: CandleData[], period: number): number[] {
    if (candles.length < period) return [];

    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA for first value
    const firstSMA = candles.slice(0, period).reduce((acc, candle) => acc + candle.close, 0) / period;
    ema.push(firstSMA);

    for (let i = period; i < candles.length; i++) {
      const currentEMA = (candles[i].close * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
      ema.push(currentEMA);
    }

    return ema;
  }

  private calculateEMAFromArray(values: number[], period: number): number[] {
    if (values.length < period) return [];

    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA for first value
    const firstSMA = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    ema.push(firstSMA);

    for (let i = period; i < values.length; i++) {
      const currentEMA = (values[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
      ema.push(currentEMA);
    }

    return ema;
  }

  private calculateBollingerBands(candles: CandleData[], period: number, stdDev: number): Array<{upper: number, middle: number, lower: number}> {
    if (candles.length < period) return [];

    const sma = this.calculateSMA(candles, period);
    const bands: Array<{upper: number, middle: number, lower: number}> = [];

    for (let i = period - 1; i < candles.length; i++) {
      const slice = candles.slice(i - period + 1, i + 1);
      const mean = sma[i - period + 1];
      
      const variance = slice.reduce((acc, candle) => acc + Math.pow(candle.close - mean, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);

      bands.push({
        upper: mean + (standardDeviation * stdDev),
        middle: mean,
        lower: mean - (standardDeviation * stdDev)
      });
    }

    return bands;
  }

  private findPeaksAndTroughs(prices: number[]): Array<{index: number, value: number, type: 'peak' | 'trough'}> {
    const peaks: Array<{index: number, value: number, type: 'peak' | 'trough'}> = [];
    
    for (let i = 1; i < prices.length - 1; i++) {
      if (prices[i] > prices[i - 1] && prices[i] > prices[i + 1]) {
        peaks.push({ index: i, value: prices[i], type: 'peak' });
      } else if (prices[i] < prices[i - 1] && prices[i] < prices[i + 1]) {
        peaks.push({ index: i, value: prices[i], type: 'trough' });
      }
    }

    return peaks;
  }

  // Add missing methods required by ComprehensiveTradingDashboard
  async analyzeMarketSentiment(candles: CandleData[]): Promise<any> {
    const indicators = await this.calculateAdvancedIndicators(candles);
    const patterns = await this.analyzeAllPatterns(candles);
    const strategies = await this.analyzeAllStrategies(candles, '1h');
    const mtfAnalysis = await this.performMultiTimeframeAnalysis(candles, 'EUR/USD');
    
    return this.confluenceEngine.analyzeMarketSentiment(
      indicators,
      patterns.candlestickPatterns,
      strategies,
      mtfAnalysis
    );
  }

  async assessRisk(candles: CandleData[], signal: any): Promise<any> {
    const sentiment = await this.analyzeMarketSentiment(candles);
    return this.confluenceEngine.assessRisk(sentiment, signal);
  }
}
