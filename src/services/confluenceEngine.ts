// Professional Confluence Engine for Multi-Source Trading Signal Analysis
// Integrates 120+ technical indicators, patterns, strategies, and news analysis

export interface ConfluenceSignal {
  id: string;
  timestamp: Date;
  pair: string;
  signal: 'buy' | 'sell' | 'neutral';
  confluenceScore: number; // 0-100
  strength: number; // 1-10
  confidence: number; // 0-1
  entryPrice: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  riskReward: number;
  factors: ConfluenceFactor[];
  description: string;
  alertLevel: 'low' | 'medium' | 'high' | 'extreme';
}

export interface ConfluenceFactor {
  type: 'technical' | 'pattern' | 'volume' | 'momentum' | 'trend' | 'support_resistance' | 'fibonacci' | 'strategy' | 'timeframe' | 'harmonic' | 'elliott' | 'pivot' | 'market_structure' | 'news' | 'economic' | 'fundamental';
  name: string;
  signal: 'buy' | 'sell' | 'neutral';
  weight: number; // 1-20 scale
  strength: number; // 1-10 scale  
  description: string;
  price?: number;
  newsImpact?: number; // -10 to +10 for news factors
  confidence?: number; // 0-1 for news reliability
}

export interface MarketSentiment {
  overallBias: 'bullish' | 'bearish' | 'neutral';
  overall: string;
  score: number; // -100 to +100
  components: {
    technical: number;
    patterns: number;
    strategies: number;
    timeframes: number;
    news?: number;
    harmonic?: number;
  };
  volatility: number; // 0-100
  recommendation: string;
}

export interface RiskAssessment {
  riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'extreme';
  riskScore: number; // 0-100
  factors: string[];
  maxPositionSize: number; // percentage
  suggestedStopLoss: number;
  marketConditions: string;
}

export class ConfluenceEngine {
  private signalHistory: ConfluenceSignal[] = [];

  async analyzeConfluence(
    technicalIndicators: any[],
    candlestickPatterns: any[],
    chartPatterns: any[],
    harmonicPatterns: any[],
    elliottWaves: any[],
    strategySignals: any[],
    fibonacciLevels: any[],
    pivotLevels: any[],
    multiTimeframeAnalysis: any,
    candles: any[],
    currentPrice: number,
    newsAnalysis?: any,
    pair?: string
  ): Promise<ConfluenceSignal | null> {
    const factors: ConfluenceFactor[] = [];
    
    // Analyze all components
    this.analyzeTechnicalIndicators(technicalIndicators, factors);
    this.analyzeCandlestickPatterns(candlestickPatterns, factors);
    this.analyzeChartPatterns(chartPatterns, factors);
    this.analyzeHarmonicPatterns(harmonicPatterns, factors);
    this.analyzeElliottWaves(elliottWaves, factors);
    this.analyzeStrategySignals(strategySignals, factors);
    this.analyzeFibonacciLevels(fibonacciLevels, factors);
    this.analyzePivotLevels(pivotLevels, factors);
    this.analyzeMultiTimeframes(multiTimeframeAnalysis, factors);
    this.analyzeMarketStructure(candles, factors);
    
    // Analyze news and fundamental factors if available
    if (newsAnalysis && pair) {
      this.analyzeNewsFactors(newsAnalysis, factors, pair);
    }

    // Filter out factors with NaN values
    const validFactors = factors.filter(factor => 
      !isNaN(factor.weight) && !isNaN(factor.strength) && 
      isFinite(factor.weight) && isFinite(factor.strength) &&
      factor.weight > 0 && factor.strength > 0
    );

    console.log(`Filtered ${factors.length - validFactors.length} invalid factors out of ${factors.length} total factors`);

    // Calculate confluence score and determine signal
    const confluenceScore = this.calculateConfluenceScore(validFactors);
    const signal = this.determineOverallSignal(validFactors);
    
    if (signal === 'neutral' || confluenceScore < 3) return null;

    // Calculate risk metrics
    const riskMetrics = this.calculateRiskMetrics(currentPrice, signal, validFactors);
    
    const confluenceSignal: ConfluenceSignal = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      pair: pair || 'EUR/USD',
      signal,
      confluenceScore,
      strength: this.calculateStrength(validFactors, signal),
      confidence: this.calculateConfidence(validFactors),
      entryPrice: currentPrice,
      entry: currentPrice,
      stopLoss: riskMetrics.stopLoss,
      takeProfit: riskMetrics.takeProfit,
      riskRewardRatio: riskMetrics.riskReward,
      riskReward: riskMetrics.riskReward,
      factors: validFactors,
      description: this.generateDescription(signal, confluenceScore, validFactors.length),
      alertLevel: confluenceScore > 70 ? 'high' : confluenceScore > 40 ? 'medium' : 'low'
    };

    this.signalHistory.push(confluenceSignal);
    if (this.signalHistory.length > 100) {
      this.signalHistory.shift();
    }

    return confluenceSignal;
  }

  // Analyze technical indicators
  private analyzeTechnicalIndicators(indicators: any[], factors: ConfluenceFactor[]): void {
    if (!Array.isArray(indicators)) return;

    // Enhanced indicator weights based on reliability and market conditions
    const indicatorWeights: Record<string, number> = {
      'RSI Divergence': 12,
      'MACD Signal Cross': 10,
      'Bollinger Squeeze': 8,
      'Volume Confirmation': 9,
      'Support/Resistance': 11,
      'Trend Alignment': 10,
      'Momentum Convergence': 8,
      'Moving Average Cross': 7,
      'Volatility Breakout': 8,
      'Price Action': 9
    };

    const bullishIndicators = indicators.filter(i => i.signal === 'buy');
    const bearishIndicators = indicators.filter(i => i.signal === 'sell');

    // Combine all indicators for processing
    [...bullishIndicators, ...bearishIndicators].forEach(indicator => {
      // Validate indicator values
      if (isNaN(indicator.strength) || !isFinite(indicator.strength) || indicator.strength <= 0) {
        console.warn(`Invalid indicator strength for ${indicator.name}:`, indicator.strength);
        return;
      }

      const weight = indicatorWeights[indicator.name] || 5;
      
      factors.push({
        type: 'technical',
        name: indicator.name,
        signal: indicator.signal,
        weight,
        strength: Math.max(1, Math.min(10, indicator.strength)), // Clamp between 1-10
        description: `${indicator.name}: ${indicator.value?.toFixed(4) || 'N/A'}`,
        price: indicator.value || undefined
      });
    });
  }

  // Analyze candlestick patterns
  private analyzeCandlestickPatterns(patterns: any[], factors: ConfluenceFactor[]): void {
    if (!Array.isArray(patterns)) return;

    const patternWeights: Record<string, number> = {
      'Doji': 6,
      'Hammer': 8,
      'Shooting Star': 8,
      'Engulfing': 10,
      'Harami': 7,
      'Three White Soldiers': 9,
      'Three Black Crows': 9,
      'Morning Star': 10,
      'Evening Star': 10,
      'Piercing Line': 7,
      'Dark Cloud Cover': 7
    };

    patterns.forEach(pattern => {
      const weight = patternWeights[pattern.name] || 5;
      factors.push({
        type: 'pattern',
        name: `${pattern.name} Pattern`,
        signal: pattern.signal,
        weight,
        strength: pattern.strength || 6,
        description: `${pattern.name} detected at ${pattern.price?.toFixed(4)}`,
        price: pattern.price
      });
    });
  }

  // Analyze chart patterns
  private analyzeChartPatterns(patterns: any[], factors: ConfluenceFactor[]): void {
    if (!Array.isArray(patterns)) return;

    const chartPatternWeights: Record<string, number> = {
      'Head and Shoulders': 12,
      'Double Top': 10,
      'Double Bottom': 10,
      'Triangle': 8,
      'Flag': 9,
      'Pennant': 8,
      'Wedge': 9,
      'Rectangle': 7,
      'Channel': 8
    };

    patterns.forEach(pattern => {
      const weight = chartPatternWeights[pattern.type] || 6;
      factors.push({
        type: 'pattern',
        name: `${pattern.type}`,
        signal: pattern.signal,
        weight,
        strength: pattern.reliability || 7,
        description: `${pattern.type} pattern formation`,
        price: pattern.targetPrice
      });
    });
  }

  // Analyze harmonic patterns
  private analyzeHarmonicPatterns(patterns: any[], factors: ConfluenceFactor[]): void {
    if (!Array.isArray(patterns)) return;

    const harmonicWeights: Record<string, number> = {
      'Gartley': 11,
      'Butterfly': 10,
      'Bat': 9,
      'Crab': 8,
      'Cypher': 7,
      'Shark': 6
    };

    patterns.forEach(pattern => {
      const weight = harmonicWeights[pattern.name] || 7;
      factors.push({
        type: 'harmonic',
        name: `${pattern.name} Harmonic`,
        signal: pattern.signal,
        weight,
        strength: pattern.accuracy || 7,
        description: `${pattern.name} harmonic pattern completion`,
        price: pattern.completionPrice
      });
    });
  }

  // Analyze Elliott Wave patterns
  private analyzeElliottWaves(waves: any[], factors: ConfluenceFactor[]): void {
    if (!Array.isArray(waves)) return;

    waves.forEach(wave => {
      factors.push({
        type: 'elliott',
        name: `Elliott Wave ${wave.wave}`,
        signal: wave.signal,
        weight: wave.confidence * 8,
        strength: wave.strength || 6,
        description: `Elliott Wave ${wave.wave} projection`,
        price: wave.targetPrice
      });
    });
  }

  // Analyze strategy signals
  private analyzeStrategySignals(strategies: any[], factors: ConfluenceFactor[]): void {
    if (!Array.isArray(strategies)) return;

    const strategyWeights: Record<string, number> = {
      'Scalping RSI': 6,
      'MACD Crossover': 8,
      'Moving Average Ribbon': 7,
      'Volume Breakout': 9,
      'Trend Following': 8,
      'Mean Reversion': 7,
      'Momentum': 8,
      'Swing Trading': 9
    };

    strategies.forEach(strategy => {
      const weight = strategyWeights[strategy.name] || 6;
      factors.push({
        type: 'strategy',
        name: strategy.name,
        signal: strategy.signal,
        weight,
        strength: strategy.confidence || 6,
        description: `${strategy.name} strategy signal`,
        price: strategy.entryPrice
      });
    });
  }

  // Analyze Fibonacci levels
  private analyzeFibonacciLevels(levels: any[], factors: ConfluenceFactor[]): void {
    if (!Array.isArray(levels)) return;

    levels.forEach(level => {
      if (level.isSupport || level.isResistance) {
        factors.push({
          type: 'fibonacci',
          name: `Fibonacci ${level.level}`,
          signal: level.isSupport ? 'buy' : 'sell',
          weight: 8,
          strength: level.strength || 7,
          description: `Fibonacci ${level.level} level at ${level.price?.toFixed(4)}`,
          price: level.price
        });
      }
    });
  }

  // Analyze pivot levels
  private analyzePivotLevels(pivots: any[], factors: ConfluenceFactor[]): void {
    if (!Array.isArray(pivots)) return;

    pivots.forEach(pivot => {
      if (pivot.isActive) {
        factors.push({
          type: 'pivot',
          name: `${pivot.type} Pivot`,
          signal: pivot.type.includes('Support') ? 'buy' : 'sell',
          weight: 7,
          strength: pivot.strength || 6,
          description: `${pivot.type} at ${pivot.price?.toFixed(4)}`,
          price: pivot.price
        });
      }
    });
  }

  // Analyze multi-timeframe data
  private analyzeMultiTimeframes(mtfAnalysis: any, factors: ConfluenceFactor[]): void {
    if (!mtfAnalysis) return;

    Object.entries(mtfAnalysis.trends || {}).forEach(([timeframe, trend]: [string, any]) => {
      if (trend && trend !== 'neutral') {
        factors.push({
          type: 'timeframe',
          name: `${timeframe} Trend`,
          signal: trend === 'bullish' ? 'buy' : 'sell',
          weight: timeframe === '4h' || timeframe === '1d' ? 9 : 6,
          strength: mtfAnalysis.strength?.[timeframe] || 6,
          description: `${timeframe} timeframe shows ${trend} trend`
        });
      }
    });
  }

  // Analyze market structure
  private analyzeMarketStructure(candles: any[], factors: ConfluenceFactor[]): void {
    if (!Array.isArray(candles) || candles.length < 20) return;

    const recent = candles.slice(-10);
    const previous = candles.slice(-20, -10);

    const recentHigh = Math.max(...recent.map(c => c.high));
    const recentLow = Math.min(...recent.map(c => c.low));
    const previousHigh = Math.max(...previous.map(c => c.high));
    const previousLow = Math.min(...previous.map(c => c.low));

    // Higher highs and higher lows = bullish structure
    if (recentHigh > previousHigh && recentLow > previousLow) {
      factors.push({
        type: 'market_structure',
        name: 'Bullish Market Structure',
        signal: 'buy',
        weight: 7,
        strength: 7,
        description: 'Higher highs and higher lows pattern'
      });
    }

    // Lower highs and lower lows = bearish structure
    if (recentHigh < previousHigh && recentLow < previousLow) {
      factors.push({
        type: 'market_structure',
        name: 'Bearish Market Structure',
        signal: 'sell',
        weight: 7,
        strength: 7,
        description: 'Lower highs and lower lows pattern'
      });
    }
  }

  // Analyze news and fundamental factors
  private analyzeNewsFactors(newsAnalysis: any, factors: ConfluenceFactor[], pair: string): void {
    if (!newsAnalysis) return;

    // Overall news sentiment factor
    if (newsAnalysis.overallSentiment && Math.abs(newsAnalysis.overallSentiment) > 5) {
      const sentiment = newsAnalysis.overallSentiment;
      const signal: 'buy' | 'sell' | 'neutral' = sentiment > 15 ? 'buy' : sentiment < -15 ? 'sell' : 'neutral';
      
      if (signal !== 'neutral') {
        factors.push({
          type: 'news',
          name: `News Sentiment Analysis`,
          signal,
          weight: Math.min(15, Math.abs(sentiment) / 5), // High weight for news
          strength: Math.min(10, Math.abs(sentiment) / 8),
          description: `Market news sentiment: ${sentiment > 0 ? 'Bullish' : 'Bearish'} (${sentiment.toFixed(1)})`,
          newsImpact: sentiment / 10,
          confidence: Math.min(1.0, newsAnalysis.newsCount / 10)
        });
      }
    }

    // Major economic events
    if (newsAnalysis.majorEvents && newsAnalysis.majorEvents.length > 0) {
      newsAnalysis.majorEvents.forEach((event: any) => {
        if (Math.abs(event.impact || 0) > 2) {
          const impact = event.impact || 0;
          const signal: 'buy' | 'sell' | 'neutral' = impact > 3 ? 'buy' : impact < -3 ? 'sell' : 'neutral';
          
          if (signal !== 'neutral') {
            const currencies = pair.match(/([A-Z]{3})/g) || [];
            const isRelevant = currencies.length > 0 && event.currency && currencies.some(c => c === event.currency);
            
            if (isRelevant) {
              factors.push({
                type: 'economic',
                name: `${event.name} (${event.currency})`,
                signal,
                weight: Math.min(18, Math.abs(impact) * 3), // Very high weight for economic events
                strength: Math.min(10, Math.abs(impact)),
                description: `${event.name}: Impact ${impact > 0 ? '+' : ''}${impact.toFixed(1)}`,
                newsImpact: impact,
                confidence: event.surprise !== undefined ? 0.9 : 0.7
              });
            }
          }
        }
      });
    }

    // Currency bias factors
    if (newsAnalysis.currencyBias) {
      const currencies = pair.match(/([A-Z]{3})/g) || [];
      const baseCurrency = currencies[0];
      const quoteCurrency = currencies[1];
      
      if (baseCurrency && quoteCurrency) {
        const baseBias = newsAnalysis.currencyBias[baseCurrency] || 0;
        const quoteBias = newsAnalysis.currencyBias[quoteCurrency] || 0;
        const netBias = baseBias - quoteBias;
        
        if (Math.abs(netBias) > 8) {
          const signal: 'buy' | 'sell' | 'neutral' = netBias > 12 ? 'buy' : netBias < -12 ? 'sell' : 'neutral';
          
          if (signal !== 'neutral') {
            factors.push({
              type: 'fundamental',
              name: `Currency Strength Analysis`,
              signal,
              weight: Math.min(12, Math.abs(netBias) / 2),
              strength: Math.min(10, Math.abs(netBias) / 4),
              description: `${baseCurrency} vs ${quoteCurrency} bias: ${netBias > 0 ? 'Bullish' : 'Bearish'} (${netBias.toFixed(1)})`,
              newsImpact: netBias / 5,
              confidence: 0.8
            });
          }
        }
      }
    }

    // High volatility warning factor
    if (newsAnalysis.volatilityExpectation > 60 || newsAnalysis.riskLevel === 'extreme') {
      factors.push({
        type: 'news',
        name: `High Volatility Risk`,
        signal: 'neutral',
        weight: 8, // Moderate weight but important for risk management
        strength: Math.min(10, newsAnalysis.volatilityExpectation / 10),
        description: `Expected volatility: ${newsAnalysis.volatilityExpectation}% (${newsAnalysis.riskLevel} risk)`,
        newsImpact: 0,
        confidence: 0.7
      });
    }
  }

  // Calculate confluence score
  private calculateConfluenceScore(factors: ConfluenceFactor[]): number {
    let bullishScore = 0;
    let bearishScore = 0;
    let totalWeight = 0;

    factors.forEach(factor => {
      // Additional validation for NaN values
      if (isNaN(factor.weight) || isNaN(factor.strength) || 
          !isFinite(factor.weight) || !isFinite(factor.strength)) {
        console.warn(`Invalid factor detected:`, factor);
        return;
      }

      const weightedScore = factor.weight * factor.strength;
      totalWeight += factor.weight;

      if (factor.signal === 'buy') {
        bullishScore += weightedScore;
      } else if (factor.signal === 'sell') {
        bearishScore += weightedScore;
      }
    });

    if (totalWeight === 0) {
      console.warn('No valid factors found, returning 0 confluence score');
      return 0;
    }

    const maxScore = Math.max(bullishScore, bearishScore);
    // More permissive confluence calculation - use percentage of factors in agreement
    const signalDirection = bullishScore > bearishScore ? 'bullish' : 'bearish';
    const dominantScore = maxScore;
    const opposingScore = signalDirection === 'bullish' ? bearishScore : bullishScore;
    
    // Calculate score based on dominance ratio with boosted scaling
    const dominanceRatio = dominantScore / (dominantScore + opposingScore);
    const factorCount = factors.length;
    const scoreMultiplier = Math.min(30, 10 + factorCount * 0.5); // Higher multiplier for more factors
    
    const score = Math.min(dominanceRatio * scoreMultiplier, 100);
    
    // Final validation
    if (isNaN(score) || !isFinite(score)) {
      console.error('Calculated score is invalid:', { bullishScore, bearishScore, totalWeight, maxScore, score });
      return 0;
    }

    console.log(`Confluence calculation: bullish=${bullishScore.toFixed(2)}, bearish=${bearishScore.toFixed(2)}, totalWeight=${totalWeight.toFixed(2)}, dominance=${dominanceRatio.toFixed(3)}, factors=${factorCount}, score=${score.toFixed(2)}`);
    return score;
  }

  // Determine overall signal
  private determineOverallSignal(factors: ConfluenceFactor[]): 'buy' | 'sell' | 'neutral' {
    let bullishWeight = 0;
    let bearishWeight = 0;

    factors.forEach(factor => {
      const weight = factor.weight * factor.strength;
      if (factor.signal === 'buy') {
        bullishWeight += weight;
      } else if (factor.signal === 'sell') {
        bearishWeight += weight;
      }
    });

    const threshold = Math.max(bullishWeight, bearishWeight) * 0.3;
    
    if (bullishWeight > bearishWeight + threshold) return 'buy';
    if (bearishWeight > bullishWeight + threshold) return 'sell';
    return 'neutral';
  }

  // Calculate signal strength
  private calculateStrength(factors: ConfluenceFactor[], signal: 'buy' | 'sell' | 'neutral'): number {
    const relevantFactors = factors.filter(f => f.signal === signal);
    if (relevantFactors.length === 0) return 3;

    const avgStrength = relevantFactors.reduce((sum, f) => sum + f.strength, 0) / relevantFactors.length;
    const factorCount = relevantFactors.length;
    
    // More factors = higher confidence in strength
    return Math.min(10, avgStrength * (1 + factorCount * 0.1));
  }

  // Calculate confidence
  private calculateConfidence(factors: ConfluenceFactor[]): number {
    if (factors.length === 0) return 0;
    
    const avgConfidence = factors.reduce((sum, f) => sum + (f.confidence || 0.7), 0) / factors.length;
    const diversityBonus = Math.min(0.3, new Set(factors.map(f => f.type)).size * 0.05);
    
    return Math.min(1.0, avgConfidence + diversityBonus);
  }

  // Calculate risk metrics
  private calculateRiskMetrics(currentPrice: number, signal: 'buy' | 'sell' | 'neutral', factors: ConfluenceFactor[]) {
    const atr = 0.001; // Simplified ATR calculation
    
    let stopLossDistance = atr * 2;
    let takeProfitDistance = atr * 4;

    // Adjust based on signal strength
    const signalFactors = factors.filter(f => f.signal === signal);
    if (signalFactors.length > 5) {
      stopLossDistance *= 0.8;
      takeProfitDistance *= 1.2;
    }

    const stopLoss = signal === 'buy' 
      ? currentPrice - stopLossDistance 
      : currentPrice + stopLossDistance;
      
    const takeProfit = signal === 'buy' 
      ? currentPrice + takeProfitDistance 
      : currentPrice - takeProfitDistance;

    const riskReward = takeProfitDistance / stopLossDistance;

    return { stopLoss, takeProfit, riskReward };
  }

  // Generate signal description
  private generateDescription(signal: 'buy' | 'sell' | 'neutral', confluenceScore: number, factorCount: number): string {
    const strength = confluenceScore > 70 ? 'Strong' : confluenceScore > 40 ? 'Moderate' : 'Weak';
    return `${strength} ${signal.toUpperCase()} signal with ${confluenceScore.toFixed(0)}% confluence from ${factorCount} factors`;
  }

  // Analyze market sentiment
  analyzeMarketSentiment(
    technicalIndicators: any[],
    patterns: any[],
    strategies: any[],
    timeframes: any,
    newsAnalysis?: any
  ): MarketSentiment {
    let technicalScore = 0;
    let patternScore = 0;
    let strategyScore = 0;
    let timeframeScore = 0;
    let newsScore = 0;

    // Technical sentiment
    if (Array.isArray(technicalIndicators)) {
      const bullish = technicalIndicators.filter(i => i.signal === 'buy').length;
      const bearish = technicalIndicators.filter(i => i.signal === 'sell').length;
      technicalScore = ((bullish - bearish) / Math.max(1, technicalIndicators.length)) * 100;
    }

    // Pattern sentiment
    if (Array.isArray(patterns)) {
      const bullishPatterns = patterns.filter(p => p.signal === 'buy').length;
      const bearishPatterns = patterns.filter(p => p.signal === 'sell').length;
      patternScore = ((bullishPatterns - bearishPatterns) / Math.max(1, patterns.length)) * 100;
    }

    // Strategy sentiment
    if (Array.isArray(strategies)) {
      const bullishStrategies = strategies.filter(s => s.signal === 'buy').length;
      const bearishStrategies = strategies.filter(s => s.signal === 'sell').length;
      strategyScore = ((bullishStrategies - bearishStrategies) / Math.max(1, strategies.length)) * 100;
    }

    // Timeframe sentiment
    if (timeframes && timeframes.trends) {
      const trends = Object.values(timeframes.trends);
      const bullishTrends = trends.filter(t => t === 'bullish').length;
      const bearishTrends = trends.filter(t => t === 'bearish').length;
      timeframeScore = ((bullishTrends - bearishTrends) / Math.max(1, trends.length)) * 100;
    }

    // News sentiment
    if (newsAnalysis && newsAnalysis.overallSentiment) {
      newsScore = newsAnalysis.overallSentiment;
    }

    // Overall sentiment calculation
    const weights = { technical: 0.25, patterns: 0.2, strategies: 0.2, timeframes: 0.25, news: 0.1 };
    const overallScore = 
      (technicalScore * weights.technical) +
      (patternScore * weights.patterns) +
      (strategyScore * weights.strategies) +
      (timeframeScore * weights.timeframes) +
      (newsScore * weights.news);

    const overallBias = overallScore > 15 ? 'bullish' : overallScore < -15 ? 'bearish' : 'neutral';

    return {
      overallBias,
      overall: overallBias,
      score: overallScore,
      components: {
        technical: technicalScore,
        patterns: patternScore,
        strategies: strategyScore,
        timeframes: timeframeScore,
        news: newsScore,
        harmonic: patternScore // Add harmonic component
      },
      volatility: Math.abs(overallScore),
      recommendation: this.generateMarketRecommendation(overallBias, Math.abs(overallScore))
    };
  }

  // Assess risk
  assessRisk(
    marketSentiment: MarketSentiment,
    signal: ConfluenceSignal | null,
    newsAnalysis?: any
  ): RiskAssessment {
    let riskScore = 0;
    const riskFactors: string[] = [];

    // Market sentiment risk
    if (Math.abs(marketSentiment.score) < 20) {
      riskScore += 25;
      riskFactors.push('Unclear market direction');
    }

    // Volatility risk
    if (marketSentiment.volatility > 60) {
      riskScore += 30;
      riskFactors.push('High market volatility');
    }

    // Confluence risk
    if (signal && signal.confluenceScore < 40) {
      riskScore += 20;
      riskFactors.push('Low signal confluence');
    }

    // News risk
    if (newsAnalysis) {
      if (newsAnalysis.riskLevel === 'extreme') {
        riskScore += 40;
        riskFactors.push('Extreme news risk - major events expected');
      } else if (newsAnalysis.volatilityExpectation > 70) {
        riskScore += 25;
        riskFactors.push('High volatility expected from news');
      }
    }

    // Determine risk level
    let riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'extreme';
    if (riskScore > 80) riskLevel = 'extreme';
    else if (riskScore > 60) riskLevel = 'high';
    else if (riskScore > 35) riskLevel = 'medium';
    else if (riskScore > 15) riskLevel = 'low';
    else riskLevel = 'very_low';

    // Calculate position size
    const basePositionSize = 100; // 100% base
    let maxPositionSize = Math.max(10, basePositionSize - riskScore);

    if (newsAnalysis && newsAnalysis.riskLevel === 'extreme') {
      maxPositionSize = Math.min(maxPositionSize, 25); // Cap at 25% for extreme news risk
    }

    return {
      riskLevel,
      riskScore,
      factors: riskFactors,
      maxPositionSize,
      suggestedStopLoss: signal ? signal.stopLoss : 0,
      marketConditions: this.describeMarketConditions(marketSentiment, riskLevel, newsAnalysis)
    };
  }

  private generateMarketRecommendation(bias: string, strength: number): string {
    if (strength < 20) return 'Market conditions are unclear. Consider waiting for better signals.';
    if (bias === 'bullish') return `${strength > 40 ? 'Strong' : 'Moderate'} bullish sentiment detected. Consider buy positions.`;
    if (bias === 'bearish') return `${strength > 40 ? 'Strong' : 'Moderate'} bearish sentiment detected. Consider sell positions.`;
    return 'Neutral market conditions. Range trading strategies may be appropriate.';
  }

  private describeMarketConditions(sentiment: MarketSentiment, riskLevel: string, newsAnalysis?: any): string {
    let description = `Market sentiment is ${sentiment.overallBias} with ${riskLevel} risk. `;
    
    if (newsAnalysis) {
      description += `News sentiment is ${newsAnalysis.overallSentiment > 10 ? 'positive' : newsAnalysis.overallSentiment < -10 ? 'negative' : 'neutral'}. `;
      if (newsAnalysis.majorEvents?.length > 0) {
        description += `${newsAnalysis.majorEvents.length} major economic event(s) affecting markets. `;
      }
    }
    
    return description;
  }

  // Get confluence history
  getConfluenceHistory(): ConfluenceSignal[] {
    return [...this.signalHistory];
  }

  // Clear history
  clearHistory(): void {
    this.signalHistory = [];
  }
}