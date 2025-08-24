// Two-Layer Prediction System
// Base Model: Candidate trade detector
// Meta Model: Probability of hitting TP before SL with volatility/liquidity/event risk

import type { CandleData } from './technicalAnalysis';
import type { MarketRegime } from './regimeDetection';

export interface CandidateSignal {
  id: string;
  timestamp: Date;
  pair: string;
  signal: 'buy' | 'sell';
  entryPrice: number;
  confidence: number; // Base model confidence
  technicalFactors: TechnicalFactor[];
  rawStrength: number;
}

export interface TechnicalFactor {
  type: string;
  name: string;
  signal: 'buy' | 'sell' | 'neutral';
  strength: number;
  confidence: number;
  timeframe?: string;
}

export interface MetaPrediction {
  signalId: string;
  probabilityTPFirst: number; // Probability of hitting TP before SL
  volatilityRisk: number; // 0-1 scale
  liquidityRisk: number; // 0-1 scale
  eventRisk: number; // 0-1 scale
  combinedRisk: number; // 0-1 scale
  expectedOutcome: {
    expectedReturn: number;
    expectedHoldingTime: number; // hours
    riskAdjustedReturn: number;
    maxDrawdownRisk: number;
  };
  confidenceInterval: [number, number]; // 95% CI for TP probability
  regime: string;
  marketConditions: {
    volatilityRegime: 'low' | 'medium' | 'high' | 'extreme';
    liquidityCondition: 'excellent' | 'good' | 'poor' | 'very_poor';
    newsEnvironment: 'calm' | 'moderate' | 'high_impact' | 'extreme';
  };
}

export interface EnhancedSignal extends CandidateSignal {
  metaPrediction: MetaPrediction;
  finalScore: number; // Combined base + meta score
  recommendation: 'strong_buy' | 'buy' | 'weak_buy' | 'hold' | 'weak_sell' | 'sell' | 'strong_sell';
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  regime?: string;
}

export interface ModelPerformance {
  baseModel: {
    signalAccuracy: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
    totalSignals: number;
  };
  metaModel: {
    probabilityCalibration: number; // How well probabilities match outcomes
    riskPredictionAccuracy: number;
    returnPredictionMSE: number;
    totalPredictions: number;
  };
  combinedPerformance: {
    overallAccuracy: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    avgReturn: number;
  };
}

export class TwoLayerPredictionSystem {
  private baseModelHistory: CandidateSignal[] = [];
  private metaPredictionHistory: MetaPrediction[] = [];
  private enhancedSignalHistory: EnhancedSignal[] = [];
  private performance: ModelPerformance;

  constructor() {
    this.performance = this.initializePerformance();
  }

  // ==================== LAYER 1: BASE MODEL (CANDIDATE DETECTOR) ====================

  async detectCandidateSignals(
    candles: CandleData[],
    regime: MarketRegime,
    pair: string = 'EUR/USD'
  ): Promise<CandidateSignal[]> {
    const candidates: CandidateSignal[] = [];
    
    // Multi-factor candidate detection
    const technicalFactors = await this.analyzeTechnicalFactors(candles, regime);
    const patternFactors = await this.analyzePatternFactors(candles);
    const volumeFactors = await this.analyzeVolumeFactors(candles);
    const momentumFactors = await this.analyzeMomentumFactors(candles);

    // Combine all factors
    const allFactors = [
      ...technicalFactors,
      ...patternFactors,
      ...volumeFactors,
      ...momentumFactors
    ];

    // Filter factors by regime
    const regimeFilteredFactors = this.applyRegimeFiltering(allFactors, regime);

    // Detect candidate signals
    const buyFactors = regimeFilteredFactors.filter(f => f.signal === 'buy');
    const sellFactors = regimeFilteredFactors.filter(f => f.signal === 'sell');

    // Generate buy candidate if enough confluence
    if (buyFactors.length >= 3) {
      const buySignal = this.createCandidateSignal(
        'buy',
        candles[candles.length - 1].close,
        buyFactors,
        pair
      );
      if (buySignal.confidence >= 0.3) { // Low threshold for candidates
        candidates.push(buySignal);
      }
    }

    // Generate sell candidate if enough confluence
    if (sellFactors.length >= 3) {
      const sellSignal = this.createCandidateSignal(
        'sell',
        candles[candles.length - 1].close,
        sellFactors,
        pair
      );
      if (sellSignal.confidence >= 0.3) {
        candidates.push(sellSignal);
      }
    }

    // Store candidates for learning
    this.baseModelHistory.push(...candidates);
    this.trimHistory();

    return candidates;
  }

  private async analyzeTechnicalFactors(
    candles: CandleData[],
    regime: MarketRegime
  ): Promise<TechnicalFactor[]> {
    const factors: TechnicalFactor[] = [];

    try {
      // RSI Analysis
      const rsi = this.calculateRSI(candles, 14);
      if (rsi.length > 0) {
        const currentRSI = rsi[rsi.length - 1];
        if (currentRSI < 35) {
          factors.push({
            type: 'oscillator',
            name: 'RSI Oversold',
            signal: 'buy',
            strength: Math.max(1, (35 - currentRSI) / 5),
            confidence: 0.7
          });
        } else if (currentRSI > 65) {
          factors.push({
            type: 'oscillator',
            name: 'RSI Overbought',
            signal: 'sell',
            strength: Math.max(1, (currentRSI - 65) / 5),
            confidence: 0.7
          });
        }
      }

      // MACD Analysis
      const macd = this.calculateMACD(candles);
      if (macd.length > 1) {
        const current = macd[macd.length - 1];
        const previous = macd[macd.length - 2];
        
        if (current.macd > current.signal && previous.macd <= previous.signal) {
          factors.push({
            type: 'momentum',
            name: 'MACD Bullish Cross',
            signal: 'buy',
            strength: Math.min(10, Math.abs(current.macd - current.signal) * 1000),
            confidence: 0.8
          });
        } else if (current.macd < current.signal && previous.macd >= previous.signal) {
          factors.push({
            type: 'momentum',
            name: 'MACD Bearish Cross',
            signal: 'sell',
            strength: Math.min(10, Math.abs(current.macd - current.signal) * 1000),
            confidence: 0.8
          });
        }
      }

      // Moving Average Analysis
      const sma20 = this.calculateSMA(candles, 20);
      const sma50 = this.calculateSMA(candles, 50);
      const ema12 = this.calculateEMA(candles, 12);
      const ema26 = this.calculateEMA(candles, 26);

      if (sma20.length > 0 && sma50.length > 0) {
        const price = candles[candles.length - 1].close;
        const sma20Current = sma20[sma20.length - 1];
        const sma50Current = sma50[sma50.length - 1];

        // Golden/Death Cross
        if (sma20Current > sma50Current && price > sma20Current) {
          factors.push({
            type: 'trend',
            name: 'Golden Cross Above',
            signal: 'buy',
            strength: 7,
            confidence: 0.75
          });
        } else if (sma20Current < sma50Current && price < sma20Current) {
          factors.push({
            type: 'trend',
            name: 'Death Cross Below',
            signal: 'sell',
            strength: 7,
            confidence: 0.75
          });
        }
      }

      // Bollinger Bands
      const bb = this.calculateBollingerBands(candles, 20, 2);
      if (bb.length > 0) {
        const price = candles[candles.length - 1].close;
        const currentBB = bb[bb.length - 1];
        
        if (price <= currentBB.lower) {
          factors.push({
            type: 'volatility',
            name: 'BB Lower Touch',
            signal: 'buy',
            strength: 8,
            confidence: 0.65
          });
        } else if (price >= currentBB.upper) {
          factors.push({
            type: 'volatility',
            name: 'BB Upper Touch',
            signal: 'sell',
            strength: 8,
            confidence: 0.65
          });
        }
      }

      // Stochastic
      const stoch = this.calculateStochastic(candles, 14, 3, 3);
      if (stoch.length > 0) {
        const currentStoch = stoch[stoch.length - 1];
        if (currentStoch.k < 25 && currentStoch.d < 25) {
          factors.push({
            type: 'oscillator',
            name: 'Stochastic Oversold',
            signal: 'buy',
            strength: 6,
            confidence: 0.6
          });
        } else if (currentStoch.k > 75 && currentStoch.d > 75) {
          factors.push({
            type: 'oscillator',
            name: 'Stochastic Overbought',
            signal: 'sell',
            strength: 6,
            confidence: 0.6
          });
        }
      }

    } catch (error) {
      console.error('Error in technical factor analysis:', error);
    }

    return factors;
  }

  private async analyzePatternFactors(candles: CandleData[]): Promise<TechnicalFactor[]> {
    const factors: TechnicalFactor[] = [];

    if (candles.length < 3) return factors;

    // Simple candlestick pattern detection
    for (let i = Math.max(0, candles.length - 5); i < candles.length; i++) {
      const current = candles[i];
      const body = Math.abs(current.close - current.open);
      const range = current.high - current.low;
      const upperShadow = current.high - Math.max(current.open, current.close);
      const lowerShadow = Math.min(current.open, current.close) - current.low;

      // Doji
      if (body < range * 0.1) {
        factors.push({
          type: 'pattern',
          name: 'Doji',
          signal: 'neutral',
          strength: 5,
          confidence: 0.5
        });
      }

      // Hammer
      if (lowerShadow > body * 2 && upperShadow < body * 0.5) {
        factors.push({
          type: 'pattern',
          name: 'Hammer',
          signal: 'buy',
          strength: 7,
          confidence: 0.7
        });
      }

      // Shooting Star
      if (upperShadow > body * 2 && lowerShadow < body * 0.5) {
        factors.push({
          type: 'pattern',
          name: 'Shooting Star',
          signal: 'sell',
          strength: 7,
          confidence: 0.7
        });
      }
    }

    return factors;
  }

  private async analyzeVolumeFactors(candles: CandleData[]): Promise<TechnicalFactor[]> {
    const factors: TechnicalFactor[] = [];

    if (candles.length < 20) return factors;

    const recent = candles.slice(-20);
    const avgVolume = recent.reduce((sum, c) => sum + c.volume, 0) / recent.length;
    const lastCandle = candles[candles.length - 1];
    const volumeRatio = lastCandle.volume / avgVolume;

    // Volume spike with price movement
    if (volumeRatio > 1.5) {
      const priceMove = (lastCandle.close - lastCandle.open) / lastCandle.open;
      if (Math.abs(priceMove) > 0.002) { // Significant price move
        factors.push({
          type: 'volume',
          name: 'Volume Breakout',
          signal: priceMove > 0 ? 'buy' : 'sell',
          strength: Math.min(10, volumeRatio * 2),
          confidence: 0.8
        });
      }
    }

    // On-Balance Volume trend
    const obv = this.calculateOBV(candles);
    if (obv.length > 10) {
      const obvSlope = this.calculateSlope(obv.slice(-10));
      if (Math.abs(obvSlope) > 0.1) {
        factors.push({
          type: 'volume',
          name: 'OBV Trend',
          signal: obvSlope > 0 ? 'buy' : 'sell',
          strength: Math.min(8, Math.abs(obvSlope) * 10),
          confidence: 0.6
        });
      }
    }

    return factors;
  }

  private async analyzeMomentumFactors(candles: CandleData[]): Promise<TechnicalFactor[]> {
    const factors: TechnicalFactor[] = [];

    if (candles.length < 14) return factors;

    // Price momentum
    const currentPrice = candles[candles.length - 1].close;
    const priceNPeriodsAgo = candles[candles.length - 10].close;
    const momentum = (currentPrice - priceNPeriodsAgo) / priceNPeriodsAgo;

    if (Math.abs(momentum) > 0.005) {
      factors.push({
        type: 'momentum',
        name: 'Price Momentum',
        signal: momentum > 0 ? 'buy' : 'sell',
        strength: Math.min(10, Math.abs(momentum) * 100),
        confidence: 0.6
      });
    }

    // Rate of Change
    const roc = this.calculateROC(candles, 14);
    if (roc.length > 0) {
      const currentROC = roc[roc.length - 1];
      if (Math.abs(currentROC) > 2) {
        factors.push({
          type: 'momentum',
          name: 'Rate of Change',
          signal: currentROC > 0 ? 'buy' : 'sell',
          strength: Math.min(8, Math.abs(currentROC) / 2),
          confidence: 0.65
        });
      }
    }

    return factors;
  }

  // ==================== LAYER 2: META MODEL (TP-BEFORE-SL PROBABILITY) ====================

  async generateMetaPrediction(
    candidate: CandidateSignal,
    candles: CandleData[],
    regime: MarketRegime,
    newsEvents: any[] = [],
    stopLoss: number,
    takeProfit: number
  ): Promise<MetaPrediction> {
    // Analyze market conditions
    const marketConditions = this.assessMarketConditions(candles, regime, newsEvents);
    
    // Calculate risk factors
    const volatilityRisk = this.calculateVolatilityRisk(candles, regime);
    const liquidityRisk = this.calculateLiquidityRisk(regime, candles);
    const eventRisk = this.calculateEventRisk(newsEvents, candidate.timestamp);
    
    // Combined risk score
    const combinedRisk = (volatilityRisk * 0.4) + (liquidityRisk * 0.3) + (eventRisk * 0.3);

    // Calculate base probability using historical patterns
    const baseProbability = this.calculateBaseProbability(
      candidate,
      stopLoss,
      takeProfit,
      regime
    );

    // Risk-adjust the probability
    const riskAdjustment = this.calculateRiskAdjustment(
      volatilityRisk,
      liquidityRisk,
      eventRisk,
      regime
    );

    const probabilityTPFirst = Math.max(0.05, Math.min(0.95, baseProbability * riskAdjustment));

    // Calculate expected outcomes
    const expectedOutcome = this.calculateExpectedOutcome(
      candidate,
      probabilityTPFirst,
      stopLoss,
      takeProfit,
      regime
    );

    // Monte Carlo confidence interval
    const confidenceInterval = this.calculateConfidenceInterval(
      probabilityTPFirst,
      combinedRisk
    );

    const metaPrediction: MetaPrediction = {
      signalId: candidate.id,
      probabilityTPFirst,
      volatilityRisk,
      liquidityRisk,
      eventRisk,
      combinedRisk,
      expectedOutcome,
      confidenceInterval,
      regime: regime.type,
      marketConditions
    };

    // Store for learning
    this.metaPredictionHistory.push(metaPrediction);
    this.trimHistory();

    return metaPrediction;
  }

  private calculateBaseProbability(
    candidate: CandidateSignal,
    stopLoss: number,
    takeProfit: number,
    regime: MarketRegime
  ): number {
    // Base probability calculation using multiple factors
    let baseProbability = 0.5; // Neutral starting point

    // Factor 1: Technical factor strength
    const avgTechnicalStrength = candidate.technicalFactors.reduce(
      (sum, f) => sum + f.strength, 0
    ) / candidate.technicalFactors.length;
    baseProbability += (avgTechnicalStrength - 5) * 0.02; // Adjust based on strength

    // Factor 2: Confluence count
    const confluenceBonus = Math.min(0.1, candidate.technicalFactors.length * 0.015);
    baseProbability += confluenceBonus;

    // Factor 3: Risk-reward ratio
    const riskReward = Math.abs(takeProfit - candidate.entryPrice) / 
                      Math.abs(candidate.entryPrice - stopLoss);
    if (riskReward < 1.5) {
      baseProbability -= 0.05; // Penalty for poor risk-reward
    } else if (riskReward > 3) {
      baseProbability += 0.03; // Bonus for good risk-reward
    }

    // Factor 4: Regime suitability
    const regimeSuitability = this.calculateRegimeSuitability(candidate, regime);
    baseProbability += regimeSuitability;

    // Factor 5: Historical performance in similar conditions
    const historicalPerformance = this.getHistoricalPerformance(candidate, regime);
    baseProbability += historicalPerformance;

    return Math.max(0.1, Math.min(0.9, baseProbability));
  }

  private calculateVolatilityRisk(candles: CandleData[], regime: MarketRegime): number {
    // Calculate multiple volatility measures
    const atr = this.calculateATR(candles, 14);
    const price = candles[candles.length - 1].close;
    const atrPercent = atr / price;

    let volatilityRisk = 0;

    // ATR-based risk
    if (atrPercent > 0.015) { // > 1.5% ATR
      volatilityRisk += 0.3;
    } else if (atrPercent > 0.01) { // > 1% ATR
      volatilityRisk += 0.15;
    }

    // Regime volatility
    volatilityRisk += regime.volatility * 0.4;

    // Recent volatility spikes
    const recentReturns = [];
    for (let i = 1; i < Math.min(candles.length, 21); i++) {
      const ret = (candles[candles.length - i].close - candles[candles.length - i - 1].close) / 
                  candles[candles.length - i - 1].close;
      recentReturns.push(Math.abs(ret));
    }

    const avgAbsReturn = recentReturns.reduce((sum, r) => sum + r, 0) / recentReturns.length;
    if (avgAbsReturn > 0.005) { // > 0.5% average absolute return
      volatilityRisk += 0.2;
    }

    return Math.max(0, Math.min(1, volatilityRisk));
  }

  private calculateLiquidityRisk(regime: MarketRegime, candles: CandleData[]): number {
    let liquidityRisk = 0;

    // Regime-based liquidity assessment
    if (regime.type === 'liquidity_crisis') {
      liquidityRisk += 0.6;
    } else if (regime.type.includes('shock')) {
      liquidityRisk += 0.4;
    } else if (regime.microstructure.marketDepth < 0.5) {
      liquidityRisk += 0.3;
    }

    // Time-based liquidity risk
    const hour = new Date().getUTCHours();
    if (hour >= 22 || hour <= 6) { // Asian session
      liquidityRisk += 0.2;
    } else if (hour >= 7 && hour <= 16) { // London/NY overlap
      liquidityRisk -= 0.1; // Better liquidity
    }

    // Volume-based liquidity assessment
    if (candles.length >= 20) {
      const recentVolume = candles.slice(-5).reduce((sum, c) => sum + c.volume, 0) / 5;
      const avgVolume = candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20;
      
      if (recentVolume < avgVolume * 0.6) {
        liquidityRisk += 0.25; // Low recent volume
      }
    }

    return Math.max(0, Math.min(1, liquidityRisk));
  }

  private calculateEventRisk(newsEvents: any[], signalTime: Date): number {
    let eventRisk = 0;

    // Check for high-impact events within next 24 hours
    const now = signalTime.getTime();
    const next24h = now + 24 * 60 * 60 * 1000;

    for (const event of newsEvents) {
      const eventTime = new Date(event.time).getTime();
      if (eventTime >= now && eventTime <= next24h) {
        const impact = Math.abs(event.impact || 0);
        if (impact >= 8) {
          eventRisk += 0.4; // High impact event
        } else if (impact >= 5) {
          eventRisk += 0.2; // Medium impact event
        }
      }
    }

    // Check for recent high-impact events (last 6 hours)
    const last6h = now - 6 * 60 * 60 * 1000;
    for (const event of newsEvents) {
      const eventTime = new Date(event.time).getTime();
      if (eventTime >= last6h && eventTime <= now) {
        const impact = Math.abs(event.impact || 0);
        if (impact >= 8) {
          eventRisk += 0.3; // Recent high impact affects current conditions
        }
      }
    }

    return Math.max(0, Math.min(1, eventRisk));
  }

  private calculateRiskAdjustment(
    volatilityRisk: number,
    liquidityRisk: number,
    eventRisk: number,
    regime: MarketRegime
  ): number {
    // Risk adjustment factor for probability
    let adjustment = 1.0;

    // Volatility adjustment
    adjustment -= volatilityRisk * 0.15;

    // Liquidity adjustment
    adjustment -= liquidityRisk * 0.1;

    // Event risk adjustment
    adjustment -= eventRisk * 0.2;

    // Regime-specific adjustments
    if (regime.type.includes('trending')) {
      adjustment += 0.05; // Trending markets are more predictable
    } else if (regime.type.includes('shock')) {
      adjustment -= 0.15; // Shock events are unpredictable
    }

    return Math.max(0.5, Math.min(1.3, adjustment));
  }

  private calculateExpectedOutcome(
    candidate: CandidateSignal,
    probabilityTPFirst: number,
    stopLoss: number,
    takeProfit: number,
    regime: MarketRegime
  ): MetaPrediction['expectedOutcome'] {
    const entryPrice = candidate.entryPrice;
    
    // Calculate returns
    const tpReturn = (takeProfit - entryPrice) / entryPrice;
    const slReturn = (stopLoss - entryPrice) / entryPrice;
    
    // Expected return
    const expectedReturn = (probabilityTPFirst * tpReturn) + 
                          ((1 - probabilityTPFirst) * slReturn);

    // Expected holding time based on regime
    const baseHoldingTime = this.getBaseHoldingTime(regime);
    const volatilityMultiplier = 1 + (regime.volatility - 0.5);
    const expectedHoldingTime = baseHoldingTime * volatilityMultiplier;

    // Risk-adjusted return (Sharpe-like measure)
    const expectedVolatility = regime.volatility * 0.1; // Rough estimate
    const riskAdjustedReturn = expectedReturn / Math.max(0.01, expectedVolatility);

    // Maximum drawdown risk
    const maxDrawdownRisk = Math.abs(slReturn) * (1 - probabilityTPFirst) * 1.2;

    return {
      expectedReturn,
      expectedHoldingTime,
      riskAdjustedReturn,
      maxDrawdownRisk
    };
  }

  // ==================== SIGNAL ENHANCEMENT & COMBINATION ====================

  async enhanceSignal(
    candidate: CandidateSignal,
    metaPrediction: MetaPrediction
  ): Promise<EnhancedSignal> {
    // Combine base model confidence with meta model probability
    const baseWeight = 0.4;
    const metaWeight = 0.6;
    
    const finalScore = (candidate.confidence * baseWeight) + 
                      (metaPrediction.probabilityTPFirst * metaWeight);

    // Determine recommendation
    const recommendation = this.determineRecommendation(
      finalScore,
      metaPrediction.combinedRisk,
      metaPrediction.expectedOutcome.riskAdjustedReturn
    );

    // Determine risk profile
    const riskProfile = this.determineRiskProfile(metaPrediction);

    const enhancedSignal: EnhancedSignal = {
      ...candidate,
      metaPrediction,
      finalScore,
      recommendation,
      riskProfile,
      regime: metaPrediction.regime
    };

    // Store for performance tracking
    this.enhancedSignalHistory.push(enhancedSignal);
    this.trimHistory();

    return enhancedSignal;
  }

  private determineRecommendation(
    finalScore: number,
    combinedRisk: number,
    riskAdjustedReturn: number
  ): EnhancedSignal['recommendation'] {
    // Risk-adjusted recommendation logic
    const riskAdjustedScore = finalScore * (1 - combinedRisk * 0.5);

    if (riskAdjustedScore >= 0.8 && riskAdjustedReturn > 2) {
      return 'strong_buy';
    } else if (riskAdjustedScore >= 0.7 && riskAdjustedReturn > 1) {
      return 'buy';
    } else if (riskAdjustedScore >= 0.6 && riskAdjustedReturn > 0.5) {
      return 'weak_buy';
    } else if (riskAdjustedScore <= 0.2 && riskAdjustedReturn < -2) {
      return 'strong_sell';
    } else if (riskAdjustedScore <= 0.3 && riskAdjustedReturn < -1) {
      return 'sell';
    } else if (riskAdjustedScore <= 0.4 && riskAdjustedReturn < -0.5) {
      return 'weak_sell';
    } else {
      return 'hold';
    }
  }

  private determineRiskProfile(metaPrediction: MetaPrediction): 'conservative' | 'moderate' | 'aggressive' {
    const risk = metaPrediction.combinedRisk;
    const probability = metaPrediction.probabilityTPFirst;

    if (risk <= 0.3 && probability >= 0.7) {
      return 'conservative';
    } else if (risk <= 0.6 && probability >= 0.5) {
      return 'moderate';
    } else {
      return 'aggressive';
    }
  }

  // ==================== UTILITY METHODS ====================

  private createCandidateSignal(
    signal: 'buy' | 'sell',
    entryPrice: number,
    factors: TechnicalFactor[],
    pair: string
  ): CandidateSignal {
    const avgConfidence = factors.reduce((sum, f) => sum + f.confidence, 0) / factors.length;
    const rawStrength = factors.reduce((sum, f) => sum + f.strength, 0) / factors.length;

    return {
      id: `candidate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      pair,
      signal,
      entryPrice,
      confidence: avgConfidence,
      technicalFactors: factors,
      rawStrength
    };
  }

  private applyRegimeFiltering(
    factors: TechnicalFactor[],
    regime: MarketRegime
  ): TechnicalFactor[] {
    // Apply regime-specific factor weighting
    return factors.map(factor => ({
      ...factor,
      strength: factor.strength * (regime.adjustmentFactors[factor.type] || 1.0),
      confidence: factor.confidence * Math.min(1.2, regime.confidence + 0.3)
    })).filter(factor => factor.strength > 2); // Filter weak factors
  }

  private assessMarketConditions(
    candles: CandleData[],
    regime: MarketRegime,
    newsEvents: any[]
  ): MetaPrediction['marketConditions'] {
    // Volatility regime
    let volatilityRegime: 'low' | 'medium' | 'high' | 'extreme';
    if (regime.volatility < 0.3) volatilityRegime = 'low';
    else if (regime.volatility < 0.6) volatilityRegime = 'medium';
    else if (regime.volatility < 0.8) volatilityRegime = 'high';
    else volatilityRegime = 'extreme';

    // Liquidity condition
    let liquidityCondition: 'excellent' | 'good' | 'poor' | 'very_poor';
    if (regime.microstructure.marketDepth > 0.8) liquidityCondition = 'excellent';
    else if (regime.microstructure.marketDepth > 0.6) liquidityCondition = 'good';
    else if (regime.microstructure.marketDepth > 0.3) liquidityCondition = 'poor';
    else liquidityCondition = 'very_poor';

    // News environment
    const recentHighImpact = newsEvents.filter(e => 
      Math.abs(e.impact || 0) >= 8 && 
      new Date(e.time).getTime() > Date.now() - 24 * 60 * 60 * 1000
    ).length;

    let newsEnvironment: 'calm' | 'moderate' | 'high_impact' | 'extreme';
    if (recentHighImpact === 0) newsEnvironment = 'calm';
    else if (recentHighImpact <= 2) newsEnvironment = 'moderate';
    else if (recentHighImpact <= 4) newsEnvironment = 'high_impact';
    else newsEnvironment = 'extreme';

    return {
      volatilityRegime,
      liquidityCondition,
      newsEnvironment
    };
  }

  private calculateConfidenceInterval(
    probability: number,
    risk: number
  ): [number, number] {
    // Calculate confidence interval based on uncertainty
    const uncertainty = risk * 0.2; // Higher risk = more uncertainty
    const lowerBound = Math.max(0.05, probability - uncertainty);
    const upperBound = Math.min(0.95, probability + uncertainty);
    
    return [lowerBound, upperBound];
  }

  // ==================== TECHNICAL INDICATOR CALCULATIONS ====================

  private calculateRSI(candles: CandleData[], period: number): number[] {
    if (candles.length < period + 1) return [];

    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate initial gains and losses
    for (let i = 1; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate RSI
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((sum, g) => sum + g, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((sum, l) => sum + l, 0) / period;
      
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
    const ema12 = this.calculateEMA(candles, 12);
    const ema26 = this.calculateEMA(candles, 26);
    
    if (ema12.length === 0 || ema26.length === 0) return [];

    const macdLine: number[] = [];
    const minLength = Math.min(ema12.length, ema26.length);
    
    for (let i = 0; i < minLength; i++) {
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
      const sum = candles.slice(i - period + 1, i + 1).reduce((sum, c) => sum + c.close, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  private calculateEMA(candles: CandleData[], period: number): number[] {
    if (candles.length < period) return [];

    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // First EMA is SMA
    const firstSMA = candles.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period;
    ema.push(firstSMA);

    // Calculate subsequent EMAs
    for (let i = period; i < candles.length; i++) {
      const currentEMA = (candles[i].close - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
      ema.push(currentEMA);
    }

    return ema;
  }

  private calculateEMAFromArray(values: number[], period: number): number[] {
    if (values.length < period) return [];

    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // First EMA is SMA
    const firstSMA = values.slice(0, period).reduce((sum, v) => sum + v, 0) / period;
    ema.push(firstSMA);

    // Calculate subsequent EMAs
    for (let i = period; i < values.length; i++) {
      const currentEMA = (values[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
      ema.push(currentEMA);
    }

    return ema;
  }

  private calculateBollingerBands(candles: CandleData[], period: number, stdDev: number): Array<{upper: number, middle: number, lower: number}> {
    const sma = this.calculateSMA(candles, period);
    if (sma.length === 0) return [];

    const bb: Array<{upper: number, middle: number, lower: number}> = [];

    for (let i = 0; i < sma.length; i++) {
      const dataIndex = i + period - 1;
      const prices = candles.slice(dataIndex - period + 1, dataIndex + 1).map(c => c.close);
      
      // Calculate standard deviation
      const mean = sma[i];
      const squaredDiffs = prices.map(price => Math.pow(price - mean, 2));
      const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
      const standardDeviation = Math.sqrt(variance);

      bb.push({
        upper: mean + (standardDeviation * stdDev),
        middle: mean,
        lower: mean - (standardDeviation * stdDev)
      });
    }

    return bb;
  }

  private calculateStochastic(candles: CandleData[], kPeriod: number, dPeriod: number, smooth: number): Array<{k: number, d: number}> {
    if (candles.length < kPeriod) return [];

    const kValues: number[] = [];

    for (let i = kPeriod - 1; i < candles.length; i++) {
      const period = candles.slice(i - kPeriod + 1, i + 1);
      const high = Math.max(...period.map(c => c.high));
      const low = Math.min(...period.map(c => c.low));
      const close = candles[i].close;

      const k = ((close - low) / (high - low)) * 100;
      kValues.push(k);
    }

    // Smooth %K
    const smoothedK: number[] = [];
    for (let i = smooth - 1; i < kValues.length; i++) {
      const sum = kValues.slice(i - smooth + 1, i + 1).reduce((sum, v) => sum + v, 0);
      smoothedK.push(sum / smooth);
    }

    // Calculate %D
    const dValues: number[] = [];
    for (let i = dPeriod - 1; i < smoothedK.length; i++) {
      const sum = smoothedK.slice(i - dPeriod + 1, i + 1).reduce((sum, v) => sum + v, 0);
      dValues.push(sum / dPeriod);
    }

    const result: Array<{k: number, d: number}> = [];
    for (let i = 0; i < Math.min(smoothedK.length, dValues.length); i++) {
      result.push({
        k: smoothedK[i + smoothedK.length - dValues.length] || smoothedK[i],
        d: dValues[i]
      });
    }

    return result;
  }

  private calculateOBV(candles: CandleData[]): number[] {
    if (candles.length < 2) return [];

    const obv: number[] = [candles[0].volume];

    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];
      
      if (current.close > previous.close) {
        obv.push(obv[obv.length - 1] + current.volume);
      } else if (current.close < previous.close) {
        obv.push(obv[obv.length - 1] - current.volume);
      } else {
        obv.push(obv[obv.length - 1]);
      }
    }

    return obv;
  }

  private calculateROC(candles: CandleData[], period: number): number[] {
    if (candles.length < period + 1) return [];

    const roc: number[] = [];
    for (let i = period; i < candles.length; i++) {
      const current = candles[i].close;
      const nPeriodsAgo = candles[i - period].close;
      roc.push(((current - nPeriodsAgo) / nPeriodsAgo) * 100);
    }

    return roc;
  }

  private calculateATR(candles: CandleData[], period: number): number {
    if (candles.length < period + 1) return 0;

    const trueRanges: number[] = [];
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

  private calculateSlope(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  // ==================== PERFORMANCE & LEARNING METHODS ====================

  private calculateRegimeSuitability(candidate: CandidateSignal, regime: MarketRegime): number {
    // Calculate how well the signal type fits the regime
    let suitability = 0;

    const signal = candidate.signal;
    const regimeType = regime.type;

    // Trending regimes favor trend-following signals
    if ((regimeType.includes('trending_bullish') && signal === 'buy') ||
        (regimeType.includes('trending_bearish') && signal === 'sell')) {
      suitability += 0.08;
    }

    // Ranging regimes favor mean-reversion signals
    if (regimeType.includes('ranging')) {
      // Check if signal is contrarian to recent price movement
      const recentMomentum = candidate.technicalFactors.find(f => f.name.includes('Momentum'));
      if (recentMomentum && 
          ((recentMomentum.signal === 'buy' && signal === 'sell') ||
           (recentMomentum.signal === 'sell' && signal === 'buy'))) {
        suitability += 0.06;
      }
    }

    // Shock regimes penalize most signals
    if (regimeType.includes('shock')) {
      suitability -= 0.1;
    }

    return suitability;
  }

  private getHistoricalPerformance(candidate: CandidateSignal, regime: MarketRegime): number {
    // Get historical performance for similar signals in similar regimes
    const similarSignals = this.enhancedSignalHistory.filter(signal => 
      signal.signal === candidate.signal &&
      signal.regime === regime.type &&
      Math.abs(signal.confidence - candidate.confidence) < 0.2
    );

    if (similarSignals.length < 5) return 0; // Not enough data

    // Calculate success rate and average return
    const outcomes = similarSignals.map(signal => {
      // This would be filled with actual outcomes when available
      return {
        success: signal.metaPrediction.probabilityTPFirst > 0.5,
        return: signal.metaPrediction.expectedOutcome.expectedReturn
      };
    });

    const successRate = outcomes.filter(o => o.success).length / outcomes.length;
    const avgReturn = outcomes.reduce((sum, o) => sum + o.return, 0) / outcomes.length;

    // Convert to probability adjustment
    return (successRate - 0.5) * 0.1 + (avgReturn * 0.5);
  }

  private getBaseHoldingTime(regime: MarketRegime): number {
    // Base holding time in hours by regime
    const baseTimes: Record<string, number> = {
      'trending_bullish': 48,
      'trending_bearish': 36,
      'ranging_tight': 12,
      'ranging_volatile': 8,
      'shock_up': 2,
      'shock_down': 2,
      'liquidity_crisis': 6,
      'news_driven': 4,
      'breakout': 24,
      'consolidation': 72
    };

    return baseTimes[regime.type] || 24;
  }

  private initializePerformance(): ModelPerformance {
    return {
      baseModel: {
        signalAccuracy: 0.5,
        falsePositiveRate: 0.3,
        falseNegativeRate: 0.2,
        totalSignals: 0
      },
      metaModel: {
        probabilityCalibration: 0.5,
        riskPredictionAccuracy: 0.5,
        returnPredictionMSE: 0.1,
        totalPredictions: 0
      },
      combinedPerformance: {
        overallAccuracy: 0.5,
        sharpeRatio: 0.0,
        maxDrawdown: 0.0,
        winRate: 0.5,
        avgReturn: 0.0
      }
    };
  }

  private trimHistory(): void {
    // Keep only last 1000 entries for each history type
    if (this.baseModelHistory.length > 1000) {
      this.baseModelHistory = this.baseModelHistory.slice(-1000);
    }
    if (this.metaPredictionHistory.length > 1000) {
      this.metaPredictionHistory = this.metaPredictionHistory.slice(-1000);
    }
    if (this.enhancedSignalHistory.length > 1000) {
      this.enhancedSignalHistory = this.enhancedSignalHistory.slice(-1000);
    }
  }

  // ==================== PUBLIC API ====================

  public getPerformanceMetrics(): ModelPerformance {
    return { ...this.performance };
  }

  public getSignalHistory(): {
    candidates: CandidateSignal[];
    metaPredictions: MetaPrediction[];
    enhanced: EnhancedSignal[];
  } {
    return {
      candidates: [...this.baseModelHistory],
      metaPredictions: [...this.metaPredictionHistory],
      enhanced: [...this.enhancedSignalHistory]
    };
  }

  public updatePerformance(signalId: string, actualOutcome: any): void {
    // Update performance metrics when actual outcomes are available
    // This would be called when trades close with actual results
    console.log(`Performance update for signal ${signalId}:`, actualOutcome);
    // Implementation would update the performance metrics
  }
}
