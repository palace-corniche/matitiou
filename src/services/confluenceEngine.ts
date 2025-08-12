import { CandleData, IndicatorResult } from './technicalAnalysis';
import { CandlestickPattern, ChartPattern } from './patternRecognition';
import { HarmonicPattern, ElliottWave } from './harmonicPatterns';
import { StrategySignal, MultiTimeframeAnalysis } from './tradingStrategies';
import { FibonacciLevel, PivotLevels } from './advancedIndicators';

export interface ConfluenceSignal {
  id: string;
  timestamp: string;
  pair: string;
  signal: 'buy' | 'sell' | 'neutral';
  confluenceScore: number; // 0-100
  strength: number; // 1-10
  confidence: number; // 0-100%
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  factors: ConfluenceFactor[];
  description: string;
  timeframes: string[];
  alertLevel: 'low' | 'medium' | 'high' | 'extreme';
}

export interface ConfluenceFactor {
  type: 'technical' | 'pattern' | 'harmonic' | 'fibonacci' | 'pivot' | 'structure' | 'strategy' | 'timeframe';
  name: string;
  signal: 'buy' | 'sell' | 'neutral';
  weight: number; // 1-10
  strength: number; // 1-10
  description: string;
  price?: number;
}

export interface MarketSentiment {
  overall: 'extremely_bullish' | 'bullish' | 'neutral' | 'bearish' | 'extremely_bearish';
  score: number; // -100 to +100
  components: {
    technical: number;
    patterns: number;
    harmonic: number;
    strategies: number;
    timeframes: number;
  };
  volatility: 'low' | 'medium' | 'high' | 'extreme';
  recommendation: string;
}

export interface RiskAssessment {
  riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  score: number; // 0-100
  factors: string[];
  maxPositionSize: number; // percentage
  suggestedStopLoss: number;
  marketConditions: string;
}

export class ConfluenceEngine {
  private confluenceHistory: ConfluenceSignal[] = [];
  private alertThresholds = {
    low: 30,
    medium: 50,
    high: 70,
    extreme: 85
  };

  // Main confluence analysis method
  analyzeConfluence(
    candles: CandleData[],
    indicators: IndicatorResult[],
    candlestickPatterns: CandlestickPattern[],
    chartPatterns: ChartPattern[],
    harmonicPatterns: HarmonicPattern[],
    elliotWaves: ElliottWave[],
    strategySignals: StrategySignal[],
    fibonacciLevels: FibonacciLevel[],
    pivotLevels: PivotLevels[],
    multiTimeframeAnalysis: MultiTimeframeAnalysis,
    pair: string = 'EUR/USD'
  ): ConfluenceSignal | null {
    
    if (candles.length < 50) return null;

    const currentPrice = candles[candles.length - 1].close;
    const factors: ConfluenceFactor[] = [];

    // Analyze all confluence factors
    this.analyzeTechnicalIndicators(indicators, factors);
    this.analyzeCandlestickPatterns(candlestickPatterns, factors);
    this.analyzeChartPatterns(chartPatterns, factors);
    this.analyzeHarmonicPatterns(harmonicPatterns, factors);
    this.analyzeElliottWaves(elliotWaves, factors);
    this.analyzeStrategySignals(strategySignals, factors);
    this.analyzeFibonacciLevels(fibonacciLevels, currentPrice, factors);
    this.analyzePivotLevels(pivotLevels, currentPrice, factors);
    this.analyzeMultiTimeframes(multiTimeframeAnalysis, factors);
    this.analyzeMarketStructure(candles, factors);

    // Calculate confluence score and determine signal
    const confluenceScore = this.calculateConfluenceScore(factors);
    const signal = this.determineOverallSignal(factors);
    
    if (signal === 'neutral' || confluenceScore < 15) return null;

    // Calculate risk metrics
    const { stopLoss, takeProfit, riskReward } = this.calculateRiskMetrics(
      candles, currentPrice, signal, factors
    );

    const confluenceSignal: ConfluenceSignal = {
      id: this.generateSignalId(),
      timestamp: new Date().toISOString(),
      pair,
      signal,
      confluenceScore,
      strength: this.calculateStrength(confluenceScore, factors),
      confidence: this.calculateConfidence(factors),
      entry: currentPrice,
      stopLoss,
      takeProfit,
      riskReward,
      factors: factors.filter(f => f.signal === signal),
      description: this.generateDescription(signal, confluenceScore, factors),
      timeframes: this.extractTimeframes(factors),
      alertLevel: this.determineAlertLevel(confluenceScore)
    };

    // Store in history
    this.confluenceHistory.push(confluenceSignal);
    if (this.confluenceHistory.length > 100) {
      this.confluenceHistory.shift();
    }

    return confluenceSignal;
  }

  // Analyze technical indicators for confluence
  private analyzeTechnicalIndicators(indicators: IndicatorResult[], factors: ConfluenceFactor[]): void {
    const bullishIndicators = indicators.filter(i => i.signal === 'buy');
    const bearishIndicators = indicators.filter(i => i.signal === 'sell');

    // Group by indicator type and weight accordingly
    const indicatorWeights: { [key: string]: number } = {
      'RSI': 6,
      'MACD': 8,
      'Moving Average': 7,
      'Bollinger Bands': 6,
      'Stochastic': 5,
      'Williams %R': 4,
      'ATR': 3
    };

    [...bullishIndicators, ...bearishIndicators].forEach(indicator => {
      const weight = indicatorWeights[indicator.name] || 5;
      
      factors.push({
        type: 'technical',
        name: indicator.name,
        signal: indicator.signal,
        weight,
        strength: indicator.strength,
        description: `${indicator.name}: ${indicator.value?.toFixed(4) || 'N/A'}`,
        price: indicator.value || undefined
      });
    });

    // Add confluence factor for multiple aligned indicators
    if (bullishIndicators.length >= 3) {
      factors.push({
        type: 'technical',
        name: 'Multiple Bullish Indicators',
        signal: 'buy',
        weight: 8,
        strength: Math.min(bullishIndicators.length, 10),
        description: `${bullishIndicators.length} bullish technical indicators aligned`
      });
    }

    if (bearishIndicators.length >= 3) {
      factors.push({
        type: 'technical',
        name: 'Multiple Bearish Indicators',
        signal: 'sell',
        weight: 8,
        strength: Math.min(bearishIndicators.length, 10),
        description: `${bearishIndicators.length} bearish technical indicators aligned`
      });
    }
  }

  // Analyze candlestick patterns for confluence
  private analyzeCandlestickPatterns(patterns: CandlestickPattern[], factors: ConfluenceFactor[]): void {
    const patternWeights: { [key: string]: number } = {
      'Doji': 4,
      'Hammer': 6,
      'Shooting Star': 6,
      'Engulfing': 8,
      'Morning Star': 9,
      'Evening Star': 9,
      'Three White Soldiers': 8,
      'Three Black Crows': 8
    };

    patterns.forEach(pattern => {
      const weight = patternWeights[pattern.name] || 5;
      const signal = pattern.signal === 'bullish' ? 'buy' : 
                    pattern.signal === 'bearish' ? 'sell' : 'neutral';

      factors.push({
        type: 'pattern',
        name: pattern.name,
        signal,
        weight,
        strength: pattern.strength,
        description: `${pattern.name}: ${pattern.type} ${pattern.signal} pattern`
      });
    });
  }

  // Analyze chart patterns for confluence
  private analyzeChartPatterns(patterns: ChartPattern[], factors: ConfluenceFactor[]): void {
    const patternWeights: { [key: string]: number } = {
      'Double Top': 8,
      'Double Bottom': 8,
      'Head and Shoulders': 9,
      'Triangle': 6,
      'Flag': 7,
      'Pennant': 7,
      'Support': 6,
      'Resistance': 6
    };

    patterns.forEach(pattern => {
      const weight = patternWeights[pattern.name] || 6;
      const signal = pattern.signal === 'bullish' ? 'buy' : 
                    pattern.signal === 'bearish' ? 'sell' : 'neutral';

      factors.push({
        type: 'pattern',
        name: pattern.name,
        signal,
        weight,
        strength: pattern.strength,
        description: `${pattern.name}: ${pattern.type} pattern detected`
      });
    });
  }

  // Analyze harmonic patterns for confluence
  private analyzeHarmonicPatterns(patterns: HarmonicPattern[], factors: ConfluenceFactor[]): void {
    patterns.forEach(pattern => {
      const signal = pattern.type === 'bullish' ? 'buy' : 'sell';
      
      factors.push({
        type: 'harmonic',
        name: pattern.name,
        signal,
        weight: 9,
        strength: Math.floor(pattern.confidence / 10),
        description: `${pattern.name} harmonic pattern (${pattern.confidence.toFixed(1)}% confidence)`,
        price: pattern.points.D.price
      });
    });
  }

  // Analyze Elliott Waves for confluence
  private analyzeElliottWaves(waves: ElliottWave[], factors: ConfluenceFactor[]): void {
    waves.forEach(wave => {
      if (wave.type === 'impulse') {
        const lastWave = wave.waves[wave.waves.length - 1];
        const signal = lastWave.endPrice > lastWave.startPrice ? 'buy' : 'sell';
        
        factors.push({
          type: 'pattern',
          name: 'Elliott Wave',
          signal,
          weight: 7,
          strength: Math.floor(wave.projection.confidence / 10),
          description: `Elliott Wave ${wave.type} pattern (${wave.projection.confidence.toFixed(1)}% confidence)`
        });
      }
    });
  }

  // Analyze strategy signals for confluence
  private analyzeStrategySignals(signals: StrategySignal[], factors: ConfluenceFactor[]): void {
    const strategyWeights: { [key: string]: number } = {
      'scalping': 5,
      'day_trading': 7,
      'swing_trading': 8,
      'position_trading': 6
    };

    signals.forEach(signal => {
      const weight = strategyWeights[signal.type] || 6;
      
      factors.push({
        type: 'strategy',
        name: signal.name,
        signal: signal.signal,
        weight,
        strength: signal.strength,
        description: `${signal.name} (${signal.confidence.toFixed(1)}% confidence, RR: ${signal.riskReward.toFixed(2)})`
      });
    });
  }

  // Analyze Fibonacci levels for confluence
  private analyzeFibonacciLevels(levels: FibonacciLevel[], currentPrice: number, factors: ConfluenceFactor[]): void {
    const tolerance = currentPrice * 0.001; // 0.1% tolerance

    levels.forEach(level => {
      if (Math.abs(currentPrice - level.price) <= tolerance) {
        const isSupport = currentPrice >= level.price;
        const signal = isSupport ? 'buy' : 'sell';
        
        factors.push({
          type: 'fibonacci',
          name: `Fibonacci ${(level.level * 100).toFixed(1)}%`,
          signal,
          weight: 7,
          strength: level.level === 0.618 || level.level === 0.786 ? 8 : 6,
          description: `Price at ${(level.level * 100).toFixed(1)}% Fibonacci ${level.type}`,
          price: level.price
        });
      }
    });
  }

  // Analyze pivot levels for confluence
  private analyzePivotLevels(pivots: PivotLevels[], currentPrice: number, factors: ConfluenceFactor[]): void {
    const tolerance = currentPrice * 0.0005; // 0.05% tolerance

    pivots.forEach(pivot => {
      const levels = [
        { name: 'Pivot', price: pivot.pivot, weight: 6 },
        { name: 'Support 1', price: pivot.support1, weight: 5 },
        { name: 'Support 2', price: pivot.support2, weight: 6 },
        { name: 'Support 3', price: pivot.support3, weight: 7 },
        { name: 'Resistance 1', price: pivot.resistance1, weight: 5 },
        { name: 'Resistance 2', price: pivot.resistance2, weight: 6 },
        { name: 'Resistance 3', price: pivot.resistance3, weight: 7 }
      ];

      levels.forEach(level => {
        if (Math.abs(currentPrice - level.price) <= tolerance) {
          const isSupport = level.name.includes('Support') || level.name === 'Pivot';
          const signal = isSupport ? 'buy' : 'sell';
          
          factors.push({
            type: 'pivot',
            name: `${pivot.type} ${level.name}`,
            signal,
            weight: level.weight,
            strength: 7,
            description: `Price at ${level.name} (${pivot.type})`,
            price: level.price
          });
        }
      });
    });
  }

  // Analyze multi-timeframe alignment
  private analyzeMultiTimeframes(analysis: MultiTimeframeAnalysis, factors: ConfluenceFactor[]): void {
    if (analysis.alignment > 60) {
      const signal = analysis.overallBias === 'bullish' ? 'buy' : 
                    analysis.overallBias === 'bearish' ? 'sell' : 'neutral';
      
      if (signal !== 'neutral') {
        factors.push({
          type: 'timeframe',
          name: 'Multi-Timeframe Alignment',
          signal,
          weight: 9,
          strength: Math.floor(analysis.alignment / 10),
          description: `${analysis.alignment.toFixed(1)}% timeframe alignment (${analysis.overallBias})`
        });
      }
    }
  }

  // Analyze market structure
  private analyzeMarketStructure(candles: CandleData[], factors: ConfluenceFactor[]): void {
    if (candles.length < 50) return;

    // Analyze trend structure
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    // Higher highs and higher lows (bullish structure)
    const recentHigh = Math.max(...highs.slice(-20));
    const previousHigh = Math.max(...highs.slice(-40, -20));
    const recentLow = Math.min(...lows.slice(-20));
    const previousLow = Math.min(...lows.slice(-40, -20));

    if (recentHigh > previousHigh && recentLow > previousLow) {
      factors.push({
        type: 'structure',
        name: 'Bullish Market Structure',
        signal: 'buy',
        weight: 7,
        strength: 7,
        description: 'Higher highs and higher lows pattern'
      });
    }

    // Lower highs and lower lows (bearish structure)
    if (recentHigh < previousHigh && recentLow < previousLow) {
      factors.push({
        type: 'structure',
        name: 'Bearish Market Structure',
        signal: 'sell',
        weight: 7,
        strength: 7,
        description: 'Lower highs and lower lows pattern'
      });
    }
  }

  // Calculate overall confluence score
  private calculateConfluenceScore(factors: ConfluenceFactor[]): number {
    let bullishScore = 0;
    let bearishScore = 0;
    let totalWeight = 0;

    factors.forEach(factor => {
      const weightedScore = factor.weight * factor.strength;
      totalWeight += factor.weight;

      if (factor.signal === 'buy') {
        bullishScore += weightedScore;
      } else if (factor.signal === 'sell') {
        bearishScore += weightedScore;
      }
    });

    if (totalWeight === 0) return 0;

    const maxScore = Math.max(bullishScore, bearishScore);
    return Math.min((maxScore / totalWeight) * 10, 100);
  }

  // Determine overall signal
  private determineOverallSignal(factors: ConfluenceFactor[]): 'buy' | 'sell' | 'neutral' {
    let bullishWeight = 0;
    let bearishWeight = 0;

    factors.forEach(factor => {
      const score = factor.weight * factor.strength;
      
      if (factor.signal === 'buy') {
        bullishWeight += score;
      } else if (factor.signal === 'sell') {
        bearishWeight += score;
      }
    });

    const difference = Math.abs(bullishWeight - bearishWeight);
    const total = bullishWeight + bearishWeight;
    
    if (total === 0 || difference / total < 0.2) return 'neutral';

    return bullishWeight > bearishWeight ? 'buy' : 'sell';
  }

  // Calculate signal strength
  private calculateStrength(confluenceScore: number, factors: ConfluenceFactor[]): number {
    const baseStrength = Math.floor(confluenceScore / 10);
    const factorCount = factors.length;
    
    // Bonus for multiple factors
    const factorBonus = Math.min(factorCount / 5, 2);
    
    return Math.min(baseStrength + factorBonus, 10);
  }

  // Calculate confidence level
  private calculateConfidence(factors: ConfluenceFactor[]): number {
    const typeCount = new Set(factors.map(f => f.type)).size;
    const factorCount = factors.length;
    
    let baseConfidence = 40;
    
    // Bonus for diversity of factor types
    baseConfidence += typeCount * 8;
    
    // Bonus for number of factors
    baseConfidence += Math.min(factorCount * 3, 30);
    
    return Math.min(baseConfidence, 95);
  }

  // Calculate risk metrics
  private calculateRiskMetrics(
    candles: CandleData[], 
    currentPrice: number, 
    signal: 'buy' | 'sell', 
    factors: ConfluenceFactor[]
  ): { stopLoss: number; takeProfit: number; riskReward: number } {
    
    const atr = this.calculateATR(candles.slice(-14));
    const volatilityMultiplier = this.getVolatilityMultiplier(candles);
    
    // Base stop loss using ATR
    let stopLoss = signal === 'buy' 
      ? currentPrice - (atr * 2 * volatilityMultiplier)
      : currentPrice + (atr * 2 * volatilityMultiplier);

    // Adjust stop loss based on confluence factors
    const supportResistanceLevels = factors
      .filter(f => f.type === 'pivot' || f.type === 'fibonacci')
      .map(f => f.price)
      .filter(p => p !== undefined) as number[];

    if (supportResistanceLevels.length > 0) {
      if (signal === 'buy') {
        const nearestSupport = Math.max(...supportResistanceLevels.filter(p => p < currentPrice));
        if (nearestSupport && nearestSupport > stopLoss) {
          stopLoss = nearestSupport * 0.999; // Slightly below support
        }
      } else {
        const nearestResistance = Math.min(...supportResistanceLevels.filter(p => p > currentPrice));
        if (nearestResistance && nearestResistance < stopLoss) {
          stopLoss = nearestResistance * 1.001; // Slightly above resistance
        }
      }
    }

    // Calculate take profit (aim for 2:1 risk/reward minimum)
    const riskAmount = Math.abs(currentPrice - stopLoss);
    const takeProfit = signal === 'buy' 
      ? currentPrice + (riskAmount * 2.5)
      : currentPrice - (riskAmount * 2.5);

    const riskReward = Math.abs(takeProfit - currentPrice) / Math.abs(currentPrice - stopLoss);

    return { stopLoss, takeProfit, riskReward };
  }

  // Helper methods
  private calculateATR(candles: CandleData[]): number {
    let atr = 0;
    
    for (let i = 1; i < candles.length; i++) {
      const tr1 = candles[i].high - candles[i].low;
      const tr2 = Math.abs(candles[i].high - candles[i-1].close);
      const tr3 = Math.abs(candles[i].low - candles[i-1].close);
      const tr = Math.max(tr1, tr2, tr3);
      
      if (i === 1) {
        atr = tr;
      } else {
        atr = ((atr * 13) + tr) / 14;
      }
    }
    
    return atr;
  }

  private getVolatilityMultiplier(candles: CandleData[]): number {
    const recentCandles = candles.slice(-20);
    const volatility = recentCandles.reduce((sum, candle) => {
      return sum + ((candle.high - candle.low) / candle.close);
    }, 0) / recentCandles.length;

    if (volatility > 0.02) return 1.5; // High volatility
    if (volatility > 0.01) return 1.2; // Medium volatility
    return 1.0; // Low volatility
  }

  private generateSignalId(): string {
    return `confluence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDescription(signal: 'buy' | 'sell', score: number, factors: ConfluenceFactor[]): string {
    const signalFactors = factors.filter(f => f.signal === signal);
    const topFactors = signalFactors
      .sort((a, b) => (b.weight * b.strength) - (a.weight * a.strength))
      .slice(0, 3)
      .map(f => f.name);

    return `${signal.toUpperCase()} signal with ${score.toFixed(1)}% confluence score. Key factors: ${topFactors.join(', ')}`;
  }

  private extractTimeframes(factors: ConfluenceFactor[]): string[] {
    const timeframes = new Set<string>();
    
    factors.forEach(factor => {
      if (factor.type === 'strategy' && factor.description.includes('timeframe')) {
        // Extract timeframe from description
        const match = factor.description.match(/(\d+[mhd])/);
        if (match) timeframes.add(match[1]);
      }
    });

    return Array.from(timeframes);
  }

  private determineAlertLevel(score: number): 'low' | 'medium' | 'high' | 'extreme' {
    if (score >= this.alertThresholds.extreme) return 'extreme';
    if (score >= this.alertThresholds.high) return 'high';
    if (score >= this.alertThresholds.medium) return 'medium';
    return 'low';
  }

  // Market sentiment analysis
  analyzeMarketSentiment(
    indicators: IndicatorResult[],
    patterns: (CandlestickPattern | ChartPattern)[],
    harmonics: HarmonicPattern[],
    strategies: StrategySignal[],
    multiTimeframe: MultiTimeframeAnalysis
  ): MarketSentiment {
    
    const scores = {
      technical: this.calculateTechnicalSentiment(indicators),
      patterns: this.calculatePatternSentiment(patterns),
      harmonic: this.calculateHarmonicSentiment(harmonics),
      strategies: this.calculateStrategySentiment(strategies),
      timeframes: this.calculateTimeframeSentiment(multiTimeframe)
    };

    const overallScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / 5;
    
    let overall: MarketSentiment['overall'];
    if (overallScore > 60) overall = 'extremely_bullish';
    else if (overallScore > 20) overall = 'bullish';
    else if (overallScore > -20) overall = 'neutral';
    else if (overallScore > -60) overall = 'bearish';
    else overall = 'extremely_bearish';

    const volatility = this.assessVolatility(indicators);
    
    return {
      overall,
      score: overallScore,
      components: scores,
      volatility,
      recommendation: this.generateRecommendation(overall, volatility, overallScore)
    };
  }

  private calculateTechnicalSentiment(indicators: IndicatorResult[]): number {
    const bullish = indicators.filter(i => i.signal === 'buy').length;
    const bearish = indicators.filter(i => i.signal === 'sell').length;
    const total = bullish + bearish;
    
    if (total === 0) return 0;
    return ((bullish - bearish) / total) * 100;
  }

  private calculatePatternSentiment(patterns: (CandlestickPattern | ChartPattern)[]): number {
    let score = 0;
    let count = 0;

    patterns.forEach(pattern => {
      if ('signal' in pattern) {
        if (pattern.signal === 'bullish') {
          score += pattern.strength * 10;
          count++;
        } else if (pattern.signal === 'bearish') {
          score -= pattern.strength * 10;
          count++;
        }
      }
    });

    return count > 0 ? score / count : 0;
  }

  private calculateHarmonicSentiment(harmonics: HarmonicPattern[]): number {
    let score = 0;
    let count = 0;

    harmonics.forEach(pattern => {
      const strength = pattern.confidence / 10;
      if (pattern.type === 'bullish') {
        score += strength * 10;
      } else {
        score -= strength * 10;
      }
      count++;
    });

    return count > 0 ? score / count : 0;
  }

  private calculateStrategySentiment(strategies: StrategySignal[]): number {
    const bullish = strategies.filter(s => s.signal === 'buy').length;
    const bearish = strategies.filter(s => s.signal === 'sell').length;
    const total = bullish + bearish;
    
    if (total === 0) return 0;
    return ((bullish - bearish) / total) * 100;
  }

  private calculateTimeframeSentiment(multiTimeframe: MultiTimeframeAnalysis): number {
    if (multiTimeframe.overallBias === 'bullish') {
      return multiTimeframe.alignment;
    } else if (multiTimeframe.overallBias === 'bearish') {
      return -multiTimeframe.alignment;
    }
    return 0;
  }

  private assessVolatility(indicators: IndicatorResult[]): 'low' | 'medium' | 'high' | 'extreme' {
    const atrIndicator = indicators.find(i => i.name.includes('ATR'));
    if (!atrIndicator || !atrIndicator.value) return 'medium';

    const atrValue = atrIndicator.value;
    if (atrValue > 0.02) return 'extreme';
    if (atrValue > 0.015) return 'high';
    if (atrValue > 0.01) return 'medium';
    return 'low';
  }

  private generateRecommendation(
    sentiment: MarketSentiment['overall'], 
    volatility: MarketSentiment['volatility'],
    score: number
  ): string {
    const recommendations = {
      extremely_bullish: 'Strong buying opportunity. Consider increasing position size.',
      bullish: 'Favorable conditions for long positions. Monitor for entry points.',
      neutral: 'Wait for clearer signals. Consider range trading strategies.',
      bearish: 'Cautious outlook. Consider short positions or reducing exposure.',
      extremely_bearish: 'High risk environment. Consider defensive strategies.'
    };

    let base = recommendations[sentiment];
    
    if (volatility === 'extreme') {
      base += ' High volatility - use smaller position sizes and tighter stops.';
    } else if (volatility === 'low') {
      base += ' Low volatility - good for swing trading strategies.';
    }

    return base;
  }

  // Risk assessment
  assessRisk(confluenceSignal: ConfluenceSignal, marketSentiment: MarketSentiment): RiskAssessment {
    let riskScore = 50; // Base risk
    const factors: string[] = [];

    // Adjust based on confluence score
    riskScore -= confluenceSignal.confluenceScore * 0.3;
    
    // Adjust based on market sentiment
    if (marketSentiment.volatility === 'extreme') {
      riskScore += 30;
      factors.push('Extreme market volatility');
    } else if (marketSentiment.volatility === 'high') {
      riskScore += 20;
      factors.push('High market volatility');
    }

    // Adjust based on risk/reward ratio
    if (confluenceSignal.riskReward < 1.5) {
      riskScore += 15;
      factors.push('Poor risk/reward ratio');
    } else if (confluenceSignal.riskReward > 3) {
      riskScore -= 10;
      factors.push('Excellent risk/reward ratio');
    }

    // Adjust based on confidence
    riskScore -= confluenceSignal.confidence * 0.2;

    riskScore = Math.max(0, Math.min(100, riskScore));

    let riskLevel: RiskAssessment['riskLevel'];
    if (riskScore > 80) riskLevel = 'very_high';
    else if (riskScore > 60) riskLevel = 'high';
    else if (riskScore > 40) riskLevel = 'medium';
    else if (riskScore > 20) riskLevel = 'low';
    else riskLevel = 'very_low';

    const maxPositionSize = this.calculateMaxPositionSize(riskLevel, confluenceSignal.riskReward);
    
    return {
      riskLevel,
      score: riskScore,
      factors,
      maxPositionSize,
      suggestedStopLoss: confluenceSignal.stopLoss,
      marketConditions: this.describeMarketConditions(marketSentiment)
    };
  }

  private calculateMaxPositionSize(riskLevel: RiskAssessment['riskLevel'], riskReward: number): number {
    const baseSize = {
      very_low: 5,
      low: 3,
      medium: 2,
      high: 1,
      very_high: 0.5
    };

    let size = baseSize[riskLevel];
    
    // Adjust for risk/reward
    if (riskReward > 3) size *= 1.5;
    else if (riskReward < 1.5) size *= 0.5;

    return Math.min(size, 10); // Cap at 10%
  }

  private describeMarketConditions(sentiment: MarketSentiment): string {
    const conditions = [];
    
    if (sentiment.volatility === 'extreme') {
      conditions.push('extremely volatile');
    } else if (sentiment.volatility === 'high') {
      conditions.push('highly volatile');
    } else if (sentiment.volatility === 'low') {
      conditions.push('low volatility');
    }

    if (Math.abs(sentiment.score) > 60) {
      conditions.push(sentiment.score > 0 ? 'strongly bullish' : 'strongly bearish');
    } else if (Math.abs(sentiment.score) > 20) {
      conditions.push(sentiment.score > 0 ? 'moderately bullish' : 'moderately bearish');
    } else {
      conditions.push('neutral trending');
    }

    return conditions.join(', ');
  }

  // Get confluence history
  getConfluenceHistory(limit = 50): ConfluenceSignal[] {
    return this.confluenceHistory.slice(-limit);
  }

  // Clear confluence history
  clearHistory(): void {
    this.confluenceHistory = [];
  }
}