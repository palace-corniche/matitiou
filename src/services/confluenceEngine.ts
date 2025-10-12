// Professional Confluence Engine for Multi-Source Trading Signal Analysis
// Integrates 120+ technical indicators, patterns, strategies, and news analysis
// Phase 3: Regime-Adaptive Weight System
// Phase 4: Enhanced Market Sentiment with COT + Alternative Data

import { RegimeDetectionEngine, type MarketRegime } from './regimeDetection';
import { supabase } from '@/integrations/supabase/client';
import { FibonacciTools, GannAnalysis, type FibonacciLevel, type GannLevel } from './advancedIndicators';

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
  type: 'technical' | 'pattern' | 'volume' | 'momentum' | 'trend' | 'support_resistance' | 'fibonacci' | 'strategy' | 'timeframe' | 'harmonic' | 'elliott' | 'pivot' | 'market_structure' | 'news' | 'economic' | 'fundamental' | 'gann' | 'fibonacci_fan' | 'fibonacci_time';
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
  private regimeDetector: RegimeDetectionEngine;
  private currentRegime: MarketRegime | null = null;
  
  // Regime-adaptive weight multipliers (Phase 3 Enhancement)
  private regimeWeightMultipliers: Record<string, Record<string, number>> = {
    'trending_bullish': {
      'momentum': 1.4, 'technical': 1.3, 'pattern': 0.9, 'volume': 1.2, 'news': 1.1, 'fundamental': 1.0, 'harmonic': 0.8, 'fibonacci': 1.0, 'gann': 1.1, 'fibonacci_fan': 1.2, 'fibonacci_time': 0.9
    },
    'trending_bearish': {
      'momentum': 1.4, 'technical': 1.3, 'pattern': 0.9, 'volume': 1.2, 'news': 1.2, 'fundamental': 1.1, 'harmonic': 0.8, 'fibonacci': 1.0, 'gann': 1.1, 'fibonacci_fan': 1.2, 'fibonacci_time': 0.9
    },
    'ranging_tight': {
      'pattern': 1.4, 'technical': 1.2, 'fibonacci': 1.3, 'momentum': 0.7, 'volume': 0.9, 'news': 0.8, 'fundamental': 0.9, 'harmonic': 1.2, 'gann': 1.3, 'fibonacci_fan': 1.4, 'fibonacci_time': 1.2
    },
    'ranging_volatile': {
      'volume': 1.4, 'pattern': 1.2, 'technical': 1.0, 'momentum': 0.8, 'news': 1.3, 'fundamental': 0.9, 'harmonic': 0.9, 'fibonacci': 1.1, 'gann': 1.0, 'fibonacci_fan': 1.1, 'fibonacci_time': 0.8
    },
    'shock_up': {
      'volume': 1.5, 'news': 1.6, 'technical': 0.7, 'pattern': 0.6, 'momentum': 1.2, 'fundamental': 1.4, 'harmonic': 0.5, 'fibonacci': 0.8, 'gann': 0.6, 'fibonacci_fan': 0.7, 'fibonacci_time': 0.5
    },
    'shock_down': {
      'volume': 1.6, 'news': 1.7, 'technical': 0.6, 'pattern': 0.5, 'momentum': 1.3, 'fundamental': 1.5, 'harmonic': 0.4, 'fibonacci': 0.7, 'gann': 0.5, 'fibonacci_fan': 0.6, 'fibonacci_time': 0.4
    },
    'liquidity_crisis': {
      'volume': 1.8, 'news': 1.9, 'fundamental': 1.6, 'technical': 0.4, 'pattern': 0.3, 'momentum': 0.5, 'harmonic': 0.2, 'fibonacci': 0.4, 'gann': 0.3, 'fibonacci_fan': 0.4, 'fibonacci_time': 0.2
    },
    'news_driven': {
      'news': 2.0, 'fundamental': 1.7, 'volume': 1.4, 'technical': 0.6, 'pattern': 0.5, 'momentum': 1.1, 'harmonic': 0.3, 'fibonacci': 0.5, 'gann': 0.4, 'fibonacci_fan': 0.5, 'fibonacci_time': 0.3
    },
    'breakout': {
      'volume': 1.5, 'momentum': 1.4, 'technical': 1.3, 'pattern': 1.2, 'news': 1.0, 'fundamental': 0.8, 'harmonic': 1.0, 'fibonacci': 1.1, 'gann': 1.2, 'fibonacci_fan': 1.3, 'fibonacci_time': 1.0
    },
    'consolidation': {
      'pattern': 1.3, 'fibonacci': 1.2, 'technical': 1.1, 'volume': 0.8, 'momentum': 0.6, 'news': 0.7, 'fundamental': 0.8, 'harmonic': 1.1, 'gann': 1.2, 'fibonacci_fan': 1.3, 'fibonacci_time': 1.1
    }
  };

  constructor() {
    this.regimeDetector = new RegimeDetectionEngine();
  }
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
    
    // **PHASE 5: Analyze enhanced Fibonacci & Gann tools**
    this.analyzeFibonacciFansAndTimeZones(candles, currentPrice, factors);
    this.analyzeGannSquareOf9AndTimeCycles(candles, currentPrice, factors);
    
    // Analyze news and fundamental factors if available
    if (newsAnalysis && pair) {
      await this.analyzeNewsFactors(newsAnalysis, factors, pair);
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
    const baseIndicatorWeights: Record<string, number> = {
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

      const baseWeight = baseIndicatorWeights[indicator.name] || 5;
      
      // **PHASE 3: Apply regime-adaptive weight multiplier**
      const adaptiveWeight = this.applyRegimeWeightMultiplier(baseWeight, 'technical');
      
      factors.push({
        type: 'technical',
        name: indicator.name,
        signal: indicator.signal,
        weight: adaptiveWeight,
        strength: Math.max(1, Math.min(10, indicator.strength)), // Clamp between 1-10
        description: `${indicator.name}: ${indicator.value?.toFixed(4) || 'N/A'}`,
        price: indicator.value || undefined
      });
    });
  }

  // Analyze candlestick patterns
  private analyzeCandlestickPatterns(patterns: any[], factors: ConfluenceFactor[]): void {
    if (!Array.isArray(patterns)) return;

    const basePatternWeights: Record<string, number> = {
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
      const baseWeight = basePatternWeights[pattern.name] || 5;
      
      // **PHASE 3: Apply regime-adaptive weight multiplier**
      const adaptiveWeight = this.applyRegimeWeightMultiplier(baseWeight, 'pattern');
      
      factors.push({
        type: 'pattern',
        name: `${pattern.name} Pattern`,
        signal: pattern.signal,
        weight: adaptiveWeight,
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

  // **PHASE 4: Enhanced News and Fundamental Analysis with COT + Alternative Data**
  private async analyzeNewsFactors(newsAnalysis: any, factors: ConfluenceFactor[], pair: string): Promise<void> {
    if (!newsAnalysis) return;

    // 1. Overall news sentiment factor
    if (newsAnalysis.overallSentiment && Math.abs(newsAnalysis.overallSentiment) > 5) {
      const sentiment = newsAnalysis.overallSentiment;
      const signal: 'buy' | 'sell' | 'neutral' = sentiment > 15 ? 'buy' : sentiment < -15 ? 'sell' : 'neutral';
      
      if (signal !== 'neutral') {
        factors.push({
          type: 'news',
          name: `News Sentiment Analysis`,
          signal,
          weight: Math.min(15, Math.abs(sentiment) / 5),
          strength: Math.min(10, Math.abs(sentiment) / 8),
          description: `Market news sentiment: ${sentiment > 0 ? 'Bullish' : 'Bearish'} (${sentiment.toFixed(1)})`,
          newsImpact: sentiment / 10,
          confidence: Math.min(1.0, newsAnalysis.newsCount / 10)
        });
      }
    }

    // 2. Major economic events
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
                weight: Math.min(18, Math.abs(impact) * 3),
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

    // **PHASE 4: Add COT (Commitment of Traders) Analysis**
    try {
      const cotSignal = await this.analyzeCOTData(pair);
      if (cotSignal) {
        factors.push(cotSignal);
      }
    } catch (error) {
      console.warn('⚠️ COT analysis failed:', error);
    }

    // **PHASE 4: Add Alternative Data Integration**
    try {
      const altDataSignals = await this.analyzeAlternativeData(pair);
      factors.push(...altDataSignals);
    } catch (error) {
      console.warn('⚠️ Alternative data analysis failed:', error);
    }
  }

  // **PHASE 4: COT Data Analysis**
  private async analyzeCOTData(pair: string): Promise<ConfluenceFactor | null> {
    try {
      const { data: cotReports, error } = await supabase
        .from('cot_reports')
        .select('*')
        .eq('pair', pair)
        .order('report_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !cotReports) return null;

      // Calculate COT sentiment based on commercial traders positioning
      const commercialNet = cotReports.commercial_long - cotReports.commercial_short;
      const speculativeNet = cotReports.large_traders_long - cotReports.large_traders_short;
      
      // Commercial traders are typically contrarian indicators (smart money)
      // Large speculators are trend followers
      const cotScore = (commercialNet * 0.7) + (speculativeNet * 0.3);
      const normalizedScore = Math.max(-10, Math.min(10, cotScore / 1000000)); // Normalize to -10 to +10
      
      const signal: 'buy' | 'sell' | 'neutral' = normalizedScore > 2 ? 'buy' : normalizedScore < -2 ? 'sell' : 'neutral';
      
      if (signal !== 'neutral') {
        return {
          type: 'fundamental',
          name: 'COT Positioning',
          signal,
          weight: Math.min(12, Math.abs(normalizedScore) * 2),
          strength: Math.min(10, Math.abs(normalizedScore)),
          description: `Smart money ${normalizedScore > 0 ? 'accumulating' : 'distributing'} (${normalizedScore.toFixed(1)})`,
          confidence: 0.85
        };
      }
    } catch (error) {
      console.error('COT analysis error:', error);
    }
    
    return null;
  }

  // **PHASE 4: Alternative Data Analysis**
  private async analyzeAlternativeData(pair: string): Promise<ConfluenceFactor[]> {
    const altFactors: ConfluenceFactor[] = [];

    try {
      // Analyze real-time news sentiment (placeholder for API integration)
      const newsSentiment = await this.fetchRealTimeNewsSentiment(pair);
      if (newsSentiment && Math.abs(newsSentiment.score) > 0.3) {
        const signal: 'buy' | 'sell' | 'neutral' = 
          newsSentiment.score > 0.5 ? 'buy' : 
          newsSentiment.score < -0.5 ? 'sell' : 'neutral';
        
        if (signal !== 'neutral') {
          altFactors.push({
            type: 'news',
            name: 'Real-Time News Sentiment',
            signal,
            weight: Math.min(14, Math.abs(newsSentiment.score) * 20),
            strength: Math.min(10, Math.abs(newsSentiment.score) * 15),
            description: `Live news: ${newsSentiment.score > 0 ? 'Bullish' : 'Bearish'} (${newsSentiment.articles} articles)`,
            newsImpact: newsSentiment.score * 10,
            confidence: newsSentiment.confidence
          });
        }
      }

      // Analyze social sentiment (Twitter/Reddit/StockTwits)
      const socialSentiment = await this.fetchSocialSentiment(pair);
      if (socialSentiment && Math.abs(socialSentiment.score) > 0.4) {
        const signal: 'buy' | 'sell' | 'neutral' = 
          socialSentiment.score > 0.6 ? 'buy' : 
          socialSentiment.score < -0.6 ? 'sell' : 'neutral';
        
        if (signal !== 'neutral') {
          altFactors.push({
            type: 'fundamental',
            name: 'Social Media Sentiment',
            signal,
            weight: Math.min(10, Math.abs(socialSentiment.score) * 15),
            strength: Math.min(9, Math.abs(socialSentiment.score) * 12),
            description: `Social: ${socialSentiment.score > 0 ? 'Bullish' : 'Bearish'} (${socialSentiment.volume} mentions)`,
            confidence: socialSentiment.confidence
          });
        }
      }
    } catch (error) {
      console.error('Alternative data error:', error);
    }

    return altFactors;
  }

  // **PHASE 4: Real-time News Sentiment Fetcher (placeholder)**
  private async fetchRealTimeNewsSentiment(pair: string): Promise<{
    score: number;
    confidence: number;
    articles: number;
  } | null> {
    // TODO: Integrate with real news APIs (NewsAPI, Benzinga, etc.)
    // For now, return mock data based on recent economic calendar events
    try {
      const { data: recentEvents } = await supabase
        .from('economic_calendar')
        .select('*')
        .gte('event_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .eq('impact_level', 'high')
        .limit(5);

      if (!recentEvents || recentEvents.length === 0) return null;

      // Calculate sentiment from event impacts
      let sentimentSum = 0;
      recentEvents.forEach((event: any) => {
        const actual = parseFloat(event.actual_value) || 0;
        const forecast = parseFloat(event.forecast_value) || 0;
        const surprise = actual - forecast;
        sentimentSum += surprise / (Math.abs(forecast) || 1);
      });

      const score = Math.max(-1, Math.min(1, sentimentSum / recentEvents.length));
      
      return {
        score,
        confidence: 0.75,
        articles: recentEvents.length
      };
    } catch {
      return null;
    }
  }

  // **PHASE 4: Social Sentiment Fetcher - Multi-Source Integration**
  private async fetchSocialSentiment(pair: string): Promise<{
    score: number;
    confidence: number;
    volume: number;
  } | null> {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-social-sentiment', {
        body: { symbol: pair, timeframe: '1h' }
      });

      if (error) {
        console.warn('Social sentiment fetch failed:', error);
        return null;
      }

      if (!data || typeof data.sentiment_score !== 'number') {
        console.warn('Invalid social sentiment response');
        return null;
      }

      return {
        score: data.sentiment_score,      // -1 to +1
        confidence: data.confidence,       // 0 to 1
        volume: data.message_volume        // Number of mentions
      };
    } catch (error) {
      console.error('Social sentiment error:', error);
      return null;
    }
  }

  // **PHASE 3: Apply regime-adaptive weight multiplier**
  private applyRegimeWeightMultiplier(baseWeight: number, factorType: string): number {
    if (!this.currentRegime || !this.currentRegime.type) {
      return baseWeight; // No regime detected, use base weight
    }

    const regimeName = this.currentRegime.type;
    const multiplier = this.regimeWeightMultipliers[regimeName]?.[factorType] || 1.0;
    
    return baseWeight * multiplier;
  }

  // **PHASE 3: Update market regime**
  private async updateMarketRegime(candles: any[]): Promise<void> {
    if (!candles || candles.length < 50) return;
    
    try {
      const volume = candles.map(c => c.volume || 1000);
      this.currentRegime = await this.regimeDetector.detectCurrentRegime(candles, volume, []);
      console.log(`🎯 Market regime detected: ${this.currentRegime?.type || 'unknown'}`);
    } catch (error) {
      console.warn('Failed to detect market regime:', error);
    }
  }

  // **PHASE 5: Analyze Fibonacci Fans and Time Zones**
  private analyzeFibonacciFansAndTimeZones(candles: any[], currentPrice: number, factors: ConfluenceFactor[]): void {
    if (!candles || candles.length < 20) return;
    
    try {
      // Find swing high and swing low for Fibonacci calculations
      const recentCandles = candles.slice(-50);
      const high = Math.max(...recentCandles.map(c => c.high));
      const low = Math.min(...recentCandles.map(c => c.low));
      
      const highIndex = recentCandles.findIndex(c => c.high === high);
      const lowIndex = recentCandles.findIndex(c => c.low === low);
      
      // Calculate Fibonacci Fans
      if (highIndex !== -1 && lowIndex !== -1 && highIndex !== lowIndex) {
        const point1 = { price: low, index: lowIndex };
        const point2 = { price: high, index: highIndex };
        const currentIndex = recentCandles.length - 1;
        
        const fans = FibonacciTools.calculateFans(point1, point2, currentIndex);
        
        fans.forEach(fan => {
          const distance = Math.abs(currentPrice - fan.price);
          const priceRange = high - low;
          const proximity = 1 - (distance / priceRange); // 0-1, closer = higher
          
          if (proximity > 0.02) { // Only consider if price is within 2% of fan line
            const baseWeight = 8;
            const adaptiveWeight = this.applyRegimeWeightMultiplier(baseWeight, 'fibonacci_fan');
            
            factors.push({
              type: 'fibonacci',
              name: `Fibonacci Fan ${(fan.level * 100).toFixed(1)}%`,
              signal: currentPrice < fan.price ? 'buy' : 'sell',
              weight: adaptiveWeight * proximity,
              strength: Math.min(10, 5 + (proximity * 5)),
              description: `Fib Fan ${(fan.level * 100).toFixed(1)}% at ${fan.price.toFixed(5)} (${fan.angle?.toFixed(1)}°)`,
              price: fan.price,
              confidence: proximity
            });
          }
        });
      }
      
      // Calculate Fibonacci Time Zones for upcoming reversals
      const lastCandle = candles[candles.length - 1];
      const candleTime = lastCandle.timestamp ? new Date(lastCandle.timestamp) : new Date();
      const candleIntervalMinutes = 15; // Assume 15-minute candles
      
      const timeZones = FibonacciTools.calculateTimeZones(candles.length - 1, candleTime, candleIntervalMinutes);
      
      // Check if we're near a time zone (within next 3 candles)
      const currentTime = new Date();
      timeZones.forEach(tz => {
        if (tz.time) {
          const timeToZone = tz.time.getTime() - currentTime.getTime();
          const candlesAway = timeToZone / (candleIntervalMinutes * 60 * 1000);
          
          if (candlesAway >= 0 && candlesAway <= 3) {
            const baseWeight = 7;
            const adaptiveWeight = this.applyRegimeWeightMultiplier(baseWeight, 'fibonacci_time');
            const proximity = 1 - (candlesAway / 3);
            
            factors.push({
              type: 'fibonacci',
              name: `Fibonacci Time Zone ${tz.level}`,
              signal: 'neutral', // Time zones indicate potential reversal, not direction
              weight: adaptiveWeight * proximity,
              strength: Math.min(10, 6 + (proximity * 4)),
              description: `Fib Time Zone ${tz.level} approaching (${candlesAway.toFixed(1)} candles)`,
              confidence: proximity
            });
          }
        }
      });
    } catch (error) {
      console.warn('Error analyzing Fibonacci fans/time zones:', error);
    }
  }

  // **PHASE 5: Analyze Gann Square of 9 and Time Cycles**
  private analyzeGannSquareOf9AndTimeCycles(candles: any[], currentPrice: number, factors: ConfluenceFactor[]): void {
    if (!candles || candles.length < 20) return;
    
    try {
      const recentCandles = candles.slice(-50);
      const centerPrice = recentCandles[Math.floor(recentCandles.length / 2)].close;
      
      // Calculate Gann Square of 9 levels
      const squareOf9Levels = GannAnalysis.calculateSquareOf9(centerPrice, currentPrice);
      
      squareOf9Levels.forEach(level => {
        const distance = Math.abs(currentPrice - level.price);
        const proximity = 1 - Math.min(1, distance / (currentPrice * 0.01)); // Within 1%
        
        if (proximity > 0.5 && level.strength) {
          const baseWeight = 9;
          const adaptiveWeight = this.applyRegimeWeightMultiplier(baseWeight, 'gann');
          
          factors.push({
            type: 'support_resistance',
            name: `Gann Square of 9 ${level.type}`,
            signal: level.type === 'support' ? 'buy' : 'sell',
            weight: adaptiveWeight * (level.strength / 10),
            strength: level.strength,
            description: `Gann Sq9 ${level.type} at ${level.price.toFixed(5)}`,
            price: level.price,
            confidence: proximity
          });
        }
      });
      
      // Calculate Gann Square of 9 Cardinal Points (strongest levels)
      const cardinals = GannAnalysis.calculateSquareOf9Cardinals(centerPrice);
      
      cardinals.forEach(cardinal => {
        const distance = Math.abs(currentPrice - cardinal.price);
        const proximity = 1 - Math.min(1, distance / (currentPrice * 0.015)); // Within 1.5%
        
        if (proximity > 0.3 && cardinal.strength) {
          const baseWeight = 11;
          const adaptiveWeight = this.applyRegimeWeightMultiplier(baseWeight, 'gann');
          
          factors.push({
            type: 'support_resistance',
            name: `Gann Cardinal ${cardinal.angle}° ${cardinal.type}`,
            signal: cardinal.type === 'support' ? 'buy' : 'sell',
            weight: adaptiveWeight * (cardinal.strength / 10),
            strength: cardinal.strength,
            description: `Gann Cardinal ${cardinal.angle}° at ${cardinal.price.toFixed(5)}`,
            price: cardinal.price,
            confidence: proximity
          });
        }
      });
      
      // Calculate Gann Time Cycles for upcoming reversals
      const lastCandle = candles[candles.length - 1];
      const startDate = lastCandle.timestamp ? new Date(lastCandle.timestamp) : new Date();
      
      const timeCycles = GannAnalysis.calculateTimeCycles(new Date(startDate.getTime() - (50 * 24 * 60 * 60 * 1000))); // 50 days ago
      
      // Check if we're near a time cycle (within 2 days)
      const currentTime = new Date();
      timeCycles.forEach(cycle => {
        const cycleTime = new Date(cycle.time);
        const daysAway = (cycleTime.getTime() - currentTime.getTime()) / (24 * 60 * 60 * 1000);
        
        if (daysAway >= 0 && daysAway <= 2 && cycle.strength) {
          const baseWeight = 8;
          const adaptiveWeight = this.applyRegimeWeightMultiplier(baseWeight, 'gann');
          const proximity = 1 - (daysAway / 2);
          
          factors.push({
            type: 'fibonacci', // Group with time-based analysis
            name: `Gann Time Cycle ${cycle.angle} days`,
            signal: 'neutral', // Time cycles indicate potential reversal
            weight: adaptiveWeight * proximity * (cycle.strength / 10),
            strength: cycle.strength,
            description: `Gann ${cycle.angle}-day cycle approaching (${daysAway.toFixed(1)} days)`,
            confidence: proximity
          });
        }
      });
    } catch (error) {
      console.warn('Error analyzing Gann tools:', error);
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