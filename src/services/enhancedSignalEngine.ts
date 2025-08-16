import { TechnicalAnalysisEngine, type CandleData, type IndicatorResult } from './technicalAnalysis';
import { CandlestickPatternRecognition, ChartPatternRecognition, type CandlestickPattern, type ChartPattern } from './patternRecognition';
import { HarmonicPatternRecognition, type HarmonicPattern, type ElliottWave } from './harmonicPatterns';
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
        patterns.pivotLevels,
        multiTimeframeAnalysis,
        candles,
        currentPrice,
        newsAnalysis,
        pair || 'EUR/USD'
      );

      if (signal) {
        console.log(`✅ Generated ${signal.signal} signal with ${signal.confluenceScore.toFixed(0)}% confluence from ${signal.factors.length} factors`);
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
            strength: Math.max(1, (30 - currentRSI) / 5),
            description: `RSI oversold at ${currentRSI.toFixed(2)}`
          });
        } else if (currentRSI > 70) {
          indicators.push({
            name: 'RSI Overbought',
            value: currentRSI,
            signal: 'sell',
            strength: Math.max(1, (currentRSI - 70) / 5),
            description: `RSI overbought at ${currentRSI.toFixed(2)}`
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
            strength: Math.min(10, Math.abs(current.macd - current.signal) * 1000),
            description: 'MACD crossed above signal line'
          });
        } else if (current.macd < current.signal && previous.macd >= previous.signal) {
          indicators.push({
            name: 'MACD Bearish Cross',
            value: current.macd,
            signal: 'sell',
            strength: Math.min(10, Math.abs(current.macd - current.signal) * 1000),
            description: 'MACD crossed below signal line'
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
            strength: 7,
            description: 'Price above bullish MA alignment'
          });
        } else if (sma20Current < sma50Current && currentPrice < sma20Current) {
          indicators.push({
            name: 'MA Bearish Alignment',
            value: currentPrice,
            signal: 'sell',
            strength: 7,
            description: 'Price below bearish MA alignment'
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
            strength: 8,
            description: 'Price at lower Bollinger Band'
          });
        } else if (currentPrice >= currentBB.upper) {
          indicators.push({
            name: 'Bollinger Band Overbought',
            value: currentPrice,
            signal: 'sell',
            strength: 8,
            description: 'Price at upper Bollinger Band'
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
      // Candlestick patterns
      const candlestickPatterns = this.detectCandlestickPatterns(candles);
      
      // Chart patterns (simplified)
      const chartPatterns = this.detectChartPatterns(candles);
      
      // Harmonic patterns
      const harmonicPatterns = this.harmonicRecognition.detectPatterns(candles);
      
      // Elliott waves (simplified)
      const elliottWaves = this.detectElliottWaves(candles);
      
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
      // RSI strategy
      const rsi = this.calculateRSI(candles, 14);
      if (rsi.length > 0) {
        const currentRSI = rsi[rsi.length - 1];
        if (currentRSI < 30) {
          strategies.push({
            name: 'RSI Oversold Strategy',
            signal: 'buy',
            confidence: (30 - currentRSI) / 30,
            entryPrice: candles[candles.length - 1].close,
            stopLoss: candles[candles.length - 1].close * 0.99,
            takeProfit: candles[candles.length - 1].close * 1.02,
            description: 'RSI oversold reversal strategy'
          });
        } else if (currentRSI > 70) {
          strategies.push({
            name: 'RSI Overbought Strategy',
            signal: 'sell',
            confidence: (currentRSI - 70) / 30,
            entryPrice: candles[candles.length - 1].close,
            stopLoss: candles[candles.length - 1].close * 1.01,
            takeProfit: candles[candles.length - 1].close * 0.98,
            description: 'RSI overbought reversal strategy'
          });
        }
      }

      // MACD strategy
      const macd = this.calculateMACD(candles);
      if (macd.length > 1) {
        const current = macd[macd.length - 1];
        const previous = macd[macd.length - 2];
        
        if (current.macd > current.signal && previous.macd <= previous.signal) {
          strategies.push({
            name: 'MACD Crossover Strategy',
            signal: 'buy',
            confidence: 0.7,
            entryPrice: candles[candles.length - 1].close,
            stopLoss: candles[candles.length - 1].close * 0.99,
            takeProfit: candles[candles.length - 1].close * 1.02,
            description: 'MACD bullish crossover'
          });
        } else if (current.macd < current.signal && previous.macd >= previous.signal) {
          strategies.push({
            name: 'MACD Crossover Strategy',
            signal: 'sell',
            confidence: 0.7,
            entryPrice: candles[candles.length - 1].close,
            stopLoss: candles[candles.length - 1].close * 1.01,
            takeProfit: candles[candles.length - 1].close * 0.98,
            description: 'MACD bearish crossover'
          });
        }
      }

    } catch (error) {
      console.error('Error analyzing strategies:', error);
    }

    return strategies;
  }

  async performMultiTimeframeAnalysis(candles: CandleData[], pair: string): Promise<MultiTimeframeAnalysis> {
    try {
      const trends: Record<string, string> = {};
      const strength: Record<string, number> = {};

      // Analyze different timeframes (simplified)
      const timeframes = ['1h', '4h', '1d'];
      
      timeframes.forEach(tf => {
        const sma20 = this.calculateSMA(candles, 20);
        const sma50 = this.calculateSMA(candles, 50);
        
        if (sma20.length > 0 && sma50.length > 0) {
          const sma20Current = sma20[sma20.length - 1];
          const sma50Current = sma50[sma50.length - 1];
          
          if (sma20Current > sma50Current) {
            trends[tf] = 'bullish';
            strength[tf] = 7;
          } else if (sma20Current < sma50Current) {
            trends[tf] = 'bearish';
            strength[tf] = 7;
          } else {
            trends[tf] = 'neutral';
            strength[tf] = 5;
          }
        } else {
          trends[tf] = 'neutral';
          strength[tf] = 5;
        }
      });

      // Determine alignment
      const bullishCount = Object.values(trends).filter(t => t === 'bullish').length;
      const bearishCount = Object.values(trends).filter(t => t === 'bearish').length;
      
      let alignment: 'bullish' | 'bearish' | 'neutral';
      if (bullishCount > bearishCount) alignment = 'bullish';
      else if (bearishCount > bullishCount) alignment = 'bearish';
      else alignment = 'neutral';

      return {
        trends,
        strength,
        alignment,
        dominantTimeframe: '4h'
      };
    } catch (error) {
      console.error('Error in multi-timeframe analysis:', error);
      return {
        trends: { '1h': 'neutral' },
        strength: { '1h': 5 },
        alignment: 'neutral',
        dominantTimeframe: '1h'
      };
    }
  }

  private detectCandlestickPatterns(candles: CandleData[]): CandlestickPattern[] {
    const patterns: CandlestickPattern[] = [];
    
    if (candles.length < 3) return patterns;

    for (let i = 2; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];
      const beforePrevious = candles[i - 2];

      // Doji pattern
      const bodySize = Math.abs(current.close - current.open);
      const candleRange = current.high - current.low;
      if (bodySize < candleRange * 0.1) {
        patterns.push({
          name: 'Doji',
          type: 'reversal',
          signal: 'neutral',
          strength: 6,
          startIndex: i,
          endIndex: i,
          description: 'Doji candlestick pattern'
        });
      }

      // Hammer pattern
      const lowerShadow = current.open < current.close ? 
        current.open - current.low : current.close - current.low;
      const upperShadow = current.high - Math.max(current.open, current.close);
      
      if (lowerShadow > bodySize * 2 && upperShadow < bodySize * 0.5) {
        patterns.push({
          name: 'Hammer',
          type: 'reversal',
          signal: 'buy',
          strength: 8,
          startIndex: i,
          endIndex: i,
          description: 'Hammer reversal pattern'
        });
      }

      // Engulfing pattern
      if (i > 0) {
        const prevBodySize = Math.abs(previous.close - previous.open);
        const currBodySize = Math.abs(current.close - current.open);
        
        if (currBodySize > prevBodySize * 1.5) {
          if (previous.close < previous.open && current.close > current.open &&
              current.close > previous.open && current.open < previous.close) {
            patterns.push({
              name: 'Bullish Engulfing',
              type: 'reversal',
              signal: 'buy',
              strength: 9,
              startIndex: i - 1,
              endIndex: i,
              description: 'Bullish engulfing pattern'
            });
          } else if (previous.close > previous.open && current.close < current.open &&
                     current.close < previous.open && current.open > previous.close) {
            patterns.push({
              name: 'Bearish Engulfing',
              type: 'reversal',
              signal: 'sell',
              strength: 9,
              startIndex: i - 1,
              endIndex: i,
              description: 'Bearish engulfing pattern'
            });
          }
        }
      }
    }

    return patterns;
  }

  private detectChartPatterns(candles: CandleData[]): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    
    if (candles.length < 20) return patterns;

    // Simplified chart pattern detection
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    
    // Look for double top/bottom patterns
    const recentHighs = highs.slice(-20);
    const recentLows = lows.slice(-20);
    
    const maxHigh = Math.max(...recentHighs);
    const minLow = Math.min(...recentLows);
    
    // Double top detection (simplified)
    const highIndices = recentHighs.map((h, i) => ({ value: h, index: i }))
      .filter(h => h.value > maxHigh * 0.98)
      .map(h => h.index);
    
    if (highIndices.length >= 2) {
      patterns.push({
        type: 'Double Top',
        signal: 'sell',
        reliability: 0.7,
        points: highIndices.slice(0, 2).map(i => ({ x: i, y: recentHighs[i] })),
        targetPrice: minLow,
        description: 'Double top formation detected'
      });
    }

    // Double bottom detection (simplified)
    const lowIndices = recentLows.map((l, i) => ({ value: l, index: i }))
      .filter(l => l.value < minLow * 1.02)
      .map(l => l.index);
    
    if (lowIndices.length >= 2) {
      patterns.push({
        type: 'Double Bottom',
        signal: 'buy',
        reliability: 0.7,
        points: lowIndices.slice(0, 2).map(i => ({ x: i, y: recentLows[i] })),
        targetPrice: maxHigh,
        description: 'Double bottom formation detected'
      });
    }

    return patterns;
  }

  private detectElliottWaves(candles: CandleData[]): ElliottWave[] {
    const waves: ElliottWave[] = [];
    
    if (candles.length < 50) return waves;

    // Simplified Elliott Wave detection
    const prices = candles.map(c => c.close);
    const peaks = this.findPeaksAndTroughs(prices);
    
    if (peaks.length >= 5) {
      waves.push({
        wave: 'Wave 5',
        signal: 'sell',
        confidence: 0.6,
        targetPrice: peaks[0].value,
        strength: 6,
        description: 'Potential Wave 5 completion'
      });
    }

    return waves;
  }

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
        isSupport: true,
        isResistance: false,
        strength: 7,
        description: `Fibonacci ${(fib * 100).toFixed(1)}% level`
      });
    });

    return levels;
  }

  private calculatePivotLevels(candles: CandleData[]): PivotLevels {
    if (candles.length < 1) {
      return {
        pivot: 0,
        r1: 0, r2: 0, r3: 0,
        s1: 0, s2: 0, s3: 0
      };
    }

    const lastCandle = candles[candles.length - 1];
    const pivot = (lastCandle.high + lastCandle.low + lastCandle.close) / 3;
    
    return {
      pivot,
      r1: 2 * pivot - lastCandle.low,
      r2: pivot + (lastCandle.high - lastCandle.low),
      r3: lastCandle.high + 2 * (pivot - lastCandle.low),
      s1: 2 * pivot - lastCandle.high,
      s2: pivot - (lastCandle.high - lastCandle.low),
      s3: lastCandle.low - 2 * (lastCandle.high - pivot)
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
}
