import { TechnicalAnalysisEngine, type TechnicalAnalysisResult } from './technicalAnalysis';
import { CandlestickPatternRecognition, ChartPatternRecognition, type CandlestickPattern, type ChartPattern } from './patternRecognition';
import type { CandleData } from './technicalAnalysis';

export interface TradingSignal {
  id: string;
  timestamp: string;
  pair: string;
  timeframe: string;
  signal: 'buy' | 'sell' | 'neutral';
  strength: number; // 1-10
  confidence: number; // 0-100%
  sources: SignalSource[];
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  description: string;
  isActive: boolean;
}

export interface SignalSource {
  type: 'indicator' | 'candlestick' | 'chart_pattern' | 'volume';
  name: string;
  signal: 'buy' | 'sell' | 'neutral';
  strength: number;
  description: string;
}

export interface MarketConditions {
  trend: 'bullish' | 'bearish' | 'sideways';
  volatility: 'low' | 'medium' | 'high';
  volume: 'low' | 'medium' | 'high';
  momentum: 'strong' | 'weak' | 'neutral';
}

export class SignalEngine {
  private activeSignals: Map<string, TradingSignal> = new Map();
  private signalHistory: TradingSignal[] = [];

  generateSignal(
    candles: CandleData[], 
    pair: string = 'EUR/USD', 
    timeframe: string = '1h'
  ): TradingSignal | null {
    
    if (candles.length < 50) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const currentPrice = candles[candles.length - 1].close;
    const sources: SignalSource[] = [];

    // 1. Technical Analysis
    const technicalAnalysis = TechnicalAnalysisEngine.analyzeCandles(candles);
    
    technicalAnalysis.indicators.forEach(indicator => {
      if (indicator.signal !== 'neutral') {
        sources.push({
          type: 'indicator',
          name: indicator.name,
          signal: indicator.signal,
          strength: indicator.strength,
          description: `${indicator.name}: ${indicator.value?.toFixed(4) || 'N/A'} (${indicator.signal})`
        });
      }
    });

    // 2. Candlestick Patterns
    const candlestickPatterns = CandlestickPatternRecognition.detectPatterns(candles);
    const recentPatterns = candlestickPatterns.filter(p => 
      p.position >= candles.length - 5 // Only recent patterns
    );

    recentPatterns.forEach(pattern => {
      if (pattern.signal !== 'neutral') {
        sources.push({
          type: 'candlestick',
          name: pattern.name,
          signal: pattern.signal === 'bullish' ? 'buy' : pattern.signal === 'bearish' ? 'sell' : 'neutral',
          strength: pattern.strength,
          description: `${pattern.name}: ${pattern.description}`
        });
      }
    });

    // 3. Chart Patterns
    const chartPatterns = ChartPatternRecognition.analyzePatterns(candles);
    const activeChartPatterns = chartPatterns.filter(p => 
      p.endIndex >= candles.length - 10 // Recent or ongoing patterns
    );

    activeChartPatterns.forEach(pattern => {
      if (pattern.signal !== 'neutral') {
        sources.push({
          type: 'chart_pattern',
          name: pattern.name,
          signal: pattern.signal === 'bullish' ? 'buy' : pattern.signal === 'bearish' ? 'sell' : 'neutral',
          strength: pattern.strength,
          description: `${pattern.name}: ${pattern.description}`
        });
      }
    });

    // 4. Volume Analysis
    const volumeSignal = this.analyzeVolume(candles);
    if (volumeSignal) {
      sources.push(volumeSignal);
    }

    // 5. Calculate Overall Signal
    if (sources.length === 0) {
      return null;
    }

    const buySources = sources.filter(s => s.signal === 'buy');
    const sellSources = sources.filter(s => s.signal === 'sell');
    
    const buyStrength = buySources.reduce((sum, s) => sum + s.strength, 0);
    const sellStrength = sellSources.reduce((sum, s) => sum + s.strength, 0);
    
    let overallSignal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let overallStrength = 0;
    let confidence = 0;

    // Determine signal direction and strength
    if (buyStrength > sellStrength && buyStrength >= 10) {
      overallSignal = 'buy';
      overallStrength = Math.min(10, Math.round(buyStrength / buySources.length));
      confidence = Math.min(100, (buyStrength / (buyStrength + sellStrength)) * 100);
    } else if (sellStrength > buyStrength && sellStrength >= 10) {
      overallSignal = 'sell';
      overallStrength = Math.min(10, Math.round(sellStrength / sellSources.length));
      confidence = Math.min(100, (sellStrength / (buyStrength + sellStrength)) * 100);
    } else {
      // Not enough conviction for a signal
      return null;
    }

    // Calculate risk management levels
    const atr = this.calculateATR(candles);
    const stopLoss = overallSignal === 'buy' 
      ? currentPrice - (atr * 2)
      : currentPrice + (atr * 2);
    
    const takeProfit = overallSignal === 'buy'
      ? currentPrice + (atr * 3)
      : currentPrice - (atr * 3);

    // Create signal
    const signal: TradingSignal = {
      id: `${pair}_${timeframe}_${timestamp}`,
      timestamp,
      pair,
      timeframe,
      signal: overallSignal,
      strength: overallStrength,
      confidence: Math.round(confidence),
      sources,
      price: currentPrice,
      stopLoss,
      takeProfit,
      description: this.generateSignalDescription(overallSignal, overallStrength, sources),
      isActive: true
    };

    // Store signal
    this.activeSignals.set(signal.id, signal);
    this.signalHistory.push(signal);

    return signal;
  }

  private analyzeVolume(candles: CandleData[]): SignalSource | null {
    if (candles.length < 20) return null;

    const recentCandles = candles.slice(-20);
    const avgVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;
    const lastVolume = candles[candles.length - 1].volume;
    const lastCandle = candles[candles.length - 1];
    
    const volumeRatio = lastVolume / avgVolume;
    const isBullishCandle = lastCandle.close > lastCandle.open;
    
    if (volumeRatio > 1.5) {
      return {
        type: 'volume',
        name: 'Volume Spike',
        signal: isBullishCandle ? 'buy' : 'sell',
        strength: Math.min(8, Math.round(volumeRatio * 2)),
        description: `High volume ${isBullishCandle ? 'buying' : 'selling'} pressure (${(volumeRatio * 100).toFixed(0)}% above average)`
      };
    }
    
    return null;
  }

  private calculateATR(candles: CandleData[], period: number = 14): number {
    if (candles.length < period + 1) return 0;

    const trueRanges = [];
    
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];
      
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      );
      
      trueRanges.push(tr);
    }

    const recentTRs = trueRanges.slice(-period);
    return recentTRs.reduce((sum, tr) => sum + tr, 0) / recentTRs.length;
  }

  private generateSignalDescription(
    signal: 'buy' | 'sell' | 'neutral', 
    strength: number, 
    sources: SignalSource[]
  ): string {
    const signalType = signal.toUpperCase();
    const strengthText = strength >= 8 ? 'Strong' : strength >= 6 ? 'Moderate' : 'Weak';
    
    const topSources = sources
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 3)
      .map(s => s.name)
      .join(', ');

    return `${strengthText} ${signalType} signal based on: ${topSources}`;
  }

  getActiveSignals(): TradingSignal[] {
    return Array.from(this.activeSignals.values()).filter(s => s.isActive);
  }

  getSignalHistory(limit: number = 50): TradingSignal[] {
    return this.signalHistory
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  updateSignalStatus(signalId: string, isActive: boolean): void {
    const signal = this.activeSignals.get(signalId);
    if (signal) {
      signal.isActive = isActive;
    }
  }

  analyzeMarketConditions(candles: CandleData[]): MarketConditions {
    if (candles.length < 50) {
      return {
        trend: 'sideways',
        volatility: 'medium',
        volume: 'medium',
        momentum: 'neutral'
      };
    }

    // Analyze trend (using 20 and 50 period averages)
    const closes = candles.map(c => c.close);
    const sma20 = closes.slice(-20).reduce((sum, p) => sum + p, 0) / 20;
    const sma50 = closes.slice(-50).reduce((sum, p) => sum + p, 0) / 50;
    
    let trend: 'bullish' | 'bearish' | 'sideways';
    const trendDiff = (sma20 - sma50) / sma50;
    
    if (trendDiff > 0.005) trend = 'bullish';
    else if (trendDiff < -0.005) trend = 'bearish';
    else trend = 'sideways';

    // Analyze volatility (using ATR)
    const atr = this.calculateATR(candles);
    const avgPrice = closes[closes.length - 1];
    const volatilityPercent = (atr / avgPrice) * 100;
    
    let volatility: 'low' | 'medium' | 'high';
    if (volatilityPercent > 1.5) volatility = 'high';
    else if (volatilityPercent > 0.5) volatility = 'medium';
    else volatility = 'low';

    // Analyze volume
    const recentVolume = candles.slice(-10).reduce((sum, c) => sum + c.volume, 0) / 10;
    const historicalVolume = candles.slice(-50).reduce((sum, c) => sum + c.volume, 0) / 50;
    const volumeRatio = recentVolume / historicalVolume;
    
    let volume: 'low' | 'medium' | 'high';
    if (volumeRatio > 1.3) volume = 'high';
    else if (volumeRatio > 0.8) volume = 'medium';
    else volume = 'low';

    // Analyze momentum
    const technicalAnalysis = TechnicalAnalysisEngine.analyzeCandles(candles);
    const momentumIndicators = technicalAnalysis.indicators.filter(i => 
      ['RSI', 'MACD', 'Stochastic'].includes(i.name)
    );
    
    const strongSignals = momentumIndicators.filter(i => i.strength >= 7).length;
    let momentum: 'strong' | 'weak' | 'neutral';
    
    if (strongSignals >= 2) momentum = 'strong';
    else if (strongSignals >= 1) momentum = 'neutral';
    else momentum = 'weak';

    return { trend, volatility, volume, momentum };
  }

  // Backtesting functionality
  backtest(historicalCandles: CandleData[], lookbackPeriods: number = 100): BacktestResult {
    const trades: BacktestTrade[] = [];
    let totalReturn = 0;
    let winningTrades = 0;
    let losingTrades = 0;

    for (let i = 50; i < historicalCandles.length - lookbackPeriods; i += 10) {
      const testData = historicalCandles.slice(0, i + 50);
      const futureData = historicalCandles.slice(i + 50, i + 50 + lookbackPeriods);
      
      if (futureData.length < lookbackPeriods) break;

      const signal = this.generateSignal(testData);
      if (!signal || signal.signal === 'neutral') continue;

      // Simulate trade execution
      const entryPrice = signal.price;
      const exitCandle = futureData.find(candle => {
        if (signal.signal === 'buy') {
          return candle.low <= (signal.stopLoss || 0) || candle.high >= (signal.takeProfit || Infinity);
        } else {
          return candle.high >= (signal.stopLoss || Infinity) || candle.low <= (signal.takeProfit || 0);
        }
      }) || futureData[futureData.length - 1];

      const exitPrice = signal.signal === 'buy' 
        ? (exitCandle.low <= (signal.stopLoss || 0) ? signal.stopLoss! : 
           exitCandle.high >= (signal.takeProfit || Infinity) ? signal.takeProfit! : exitCandle.close)
        : (exitCandle.high >= (signal.stopLoss || Infinity) ? signal.stopLoss! :
           exitCandle.low <= (signal.takeProfit || 0) ? signal.takeProfit! : exitCandle.close);

      const returnPercent = signal.signal === 'buy' 
        ? ((exitPrice - entryPrice) / entryPrice) * 100
        : ((entryPrice - exitPrice) / entryPrice) * 100;

      totalReturn += returnPercent;
      
      if (returnPercent > 0) winningTrades++;
      else losingTrades++;

      trades.push({
        signal,
        entryPrice,
        exitPrice,
        returnPercent,
        entryTime: signal.timestamp,
        exitTime: exitCandle.time
      });
    }

    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgReturn = totalTrades > 0 ? totalReturn / totalTrades : 0;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalReturn,
      avgReturn,
      trades
    };
  }
}

interface BacktestTrade {
  signal: TradingSignal;
  entryPrice: number;
  exitPrice: number;
  returnPercent: number;
  entryTime: string;
  exitTime: string;
}

interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number;
  avgReturn: number;
  trades: BacktestTrade[];
}

export default SignalEngine;