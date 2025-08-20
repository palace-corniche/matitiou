// Hidden Semi-Markov Model (HSMM) Regime Detection Engine
// Detects market regimes and adapts strategy accordingly for maximum survivability

export interface MarketRegime {
  type: 'trending_bullish' | 'trending_bearish' | 'ranging_tight' | 'ranging_volatile' | 'shock_up' | 'shock_down' | 'liquidity_crisis' | 'news_driven' | 'breakout' | 'consolidation';
  strength: number; // 0-1
  confidence: number; // 0-1
  duration: number; // Expected duration in candles
  volatility: number; // Normalized volatility
  momentum: number; // Directional momentum
  volume: number; // Volume characteristics
  microstructure: {
    bidAskSpread: number;
    marketDepth: number;
    orderFlow: 'buying' | 'selling' | 'neutral';
    institutionalActivity: number;
  };
  adjustmentFactors: Record<string, number>; // Factor type -> weight multiplier
  riskMultiplier: number; // Overall risk scaling (0.1 = reduce risk by 90%)
  expectedDuration: number; // Expected regime duration in minutes
  transitionProbabilities: Record<string, number>; // Probability of transitioning to other regimes
}

export interface RegimeTransition {
  fromRegime: string;
  toRegime: string;
  timestamp: Date;
  triggerFactors: string[];
  confidence: number;
  marketConditions: {
    priceChange: number;
    volumeChange: number;
    volatilityChange: number;
    newsImpact: number;
  };
}

export interface RegimeStats {
  currentRegime: MarketRegime;
  regimeHistory: RegimeTransition[];
  averageRegimeDuration: Record<string, number>; // Average duration per regime type
  transitionMatrix: number[][]; // Transition probabilities between regimes
  regimePerformance: Record<string, { trades: number; winRate: number; avgReturn: number; sharpe: number }>;
  adaptiveWeights: Record<string, Record<string, number>>; // regime -> factor type -> weight
}

// HSMM State definition for regime modeling
interface HMMState {
  regime: string;
  emissionProbability: (observation: MarketObservation) => number;
  transitionProbabilities: Record<string, number>;
  durationDistribution: {
    mean: number;
    std: number;
    min: number;
    max: number;
  };
}

interface MarketObservation {
  priceMove: number; // Normalized price movement
  volatility: number; // Normalized volatility
  volume: number; // Normalized volume
  momentum: number; // Momentum indicator
  trend: number; // Trend strength
  reversal: number; // Reversal signals
  breakout: number; // Breakout signals
  news: number; // News sentiment impact
  timeOfDay: number; // Market session (0-1)
  dayOfWeek: number; // Day of week (0-6)
}

export class RegimeDetectionEngine {
  private regimeHistory: RegimeTransition[] = [];
  private currentRegime: MarketRegime;
  private hmmStates: HMMState[] = [];
  private observationWindow: MarketObservation[] = [];
  private adaptiveWeights: Record<string, Record<string, number>> = {};
  private regimePerformance: Record<string, any> = {};
  private transitionMatrix: number[][] = [];
  
  constructor() {
    this.initializeHMMStates();
    this.initializeAdaptiveWeights();
    this.currentRegime = this.getDefaultRegime();
  }

  // ==================== HSMM INITIALIZATION ====================

  private initializeHMMStates(): void {
    this.hmmStates = [
      // Trending Regimes
      {
        regime: 'trending_bullish',
        emissionProbability: this.trendingBullishEmission.bind(this),
        transitionProbabilities: {
          'trending_bullish': 0.7,
          'ranging_tight': 0.15,
          'shock_down': 0.05,
          'consolidation': 0.1
        },
        durationDistribution: { mean: 45, std: 20, min: 10, max: 200 }
      },
      {
        regime: 'trending_bearish',
        emissionProbability: this.trendingBearishEmission.bind(this),
        transitionProbabilities: {
          'trending_bearish': 0.7,
          'ranging_tight': 0.15,
          'shock_up': 0.05,
          'consolidation': 0.1
        },
        durationDistribution: { mean: 40, std: 18, min: 8, max: 180 }
      },
      
      // Ranging Regimes
      {
        regime: 'ranging_tight',
        emissionProbability: this.rangingTightEmission.bind(this),
        transitionProbabilities: {
          'ranging_tight': 0.6,
          'trending_bullish': 0.15,
          'trending_bearish': 0.15,
          'breakout': 0.1
        },
        durationDistribution: { mean: 80, std: 40, min: 20, max: 300 }
      },
      {
        regime: 'ranging_volatile',
        emissionProbability: this.rangingVolatileEmission.bind(this),
        transitionProbabilities: {
          'ranging_volatile': 0.5,
          'shock_up': 0.2,
          'shock_down': 0.2,
          'liquidity_crisis': 0.1
        },
        durationDistribution: { mean: 30, std: 15, min: 5, max: 100 }
      },
      
      // Shock Regimes
      {
        regime: 'shock_up',
        emissionProbability: this.shockUpEmission.bind(this),
        transitionProbabilities: {
          'trending_bullish': 0.4,
          'ranging_volatile': 0.3,
          'consolidation': 0.2,
          'shock_up': 0.1
        },
        durationDistribution: { mean: 8, std: 5, min: 2, max: 25 }
      },
      {
        regime: 'shock_down',
        emissionProbability: this.shockDownEmission.bind(this),
        transitionProbabilities: {
          'trending_bearish': 0.3,
          'ranging_volatile': 0.4,
          'liquidity_crisis': 0.2,
          'shock_down': 0.1
        },
        durationDistribution: { mean: 6, std: 4, min: 2, max: 20 }
      },
      
      // Special Regimes
      {
        regime: 'liquidity_crisis',
        emissionProbability: this.liquidityCrisisEmission.bind(this),
        transitionProbabilities: {
          'ranging_volatile': 0.5,
          'shock_down': 0.3,
          'consolidation': 0.15,
          'liquidity_crisis': 0.05
        },
        durationDistribution: { mean: 15, std: 8, min: 3, max: 60 }
      },
      {
        regime: 'news_driven',
        emissionProbability: this.newsDrivenEmission.bind(this),
        transitionProbabilities: {
          'shock_up': 0.25,
          'shock_down': 0.25,
          'trending_bullish': 0.2,
          'trending_bearish': 0.2,
          'ranging_volatile': 0.1
        },
        durationDistribution: { mean: 12, std: 6, min: 2, max: 45 }
      },
      {
        regime: 'breakout',
        emissionProbability: this.breakoutEmission.bind(this),
        transitionProbabilities: {
          'trending_bullish': 0.4,
          'trending_bearish': 0.4,
          'ranging_tight': 0.15,
          'breakout': 0.05
        },
        durationDistribution: { mean: 10, std: 5, min: 2, max: 30 }
      },
      {
        regime: 'consolidation',
        emissionProbability: this.consolidationEmission.bind(this),
        transitionProbabilities: {
          'ranging_tight': 0.4,
          'breakout': 0.25,
          'trending_bullish': 0.15,
          'trending_bearish': 0.15,
          'consolidation': 0.05
        },
        durationDistribution: { mean: 60, std: 30, min: 15, max: 200 }
      }
    ];
    
    this.buildTransitionMatrix();
  }

  private initializeAdaptiveWeights(): void {
    // Initialize default weights for each regime and factor type
    const factorTypes = ['technical', 'pattern', 'volume', 'momentum', 'news', 'fundamental', 'harmonic', 'fibonacci'];
    
    this.adaptiveWeights = {
      'trending_bullish': {
        'momentum': 1.4, 'technical': 1.3, 'pattern': 0.9, 'volume': 1.2, 'news': 1.1, 'fundamental': 1.0, 'harmonic': 0.8, 'fibonacci': 1.0
      },
      'trending_bearish': {
        'momentum': 1.4, 'technical': 1.3, 'pattern': 0.9, 'volume': 1.2, 'news': 1.2, 'fundamental': 1.1, 'harmonic': 0.8, 'fibonacci': 1.0
      },
      'ranging_tight': {
        'pattern': 1.4, 'technical': 1.2, 'fibonacci': 1.3, 'momentum': 0.7, 'volume': 0.9, 'news': 0.8, 'fundamental': 0.9, 'harmonic': 1.2
      },
      'ranging_volatile': {
        'volume': 1.4, 'pattern': 1.2, 'technical': 1.0, 'momentum': 0.8, 'news': 1.3, 'fundamental': 0.9, 'harmonic': 0.9, 'fibonacci': 1.1
      },
      'shock_up': {
        'volume': 1.5, 'news': 1.6, 'technical': 0.7, 'pattern': 0.6, 'momentum': 1.2, 'fundamental': 1.4, 'harmonic': 0.5, 'fibonacci': 0.8
      },
      'shock_down': {
        'volume': 1.6, 'news': 1.7, 'technical': 0.6, 'pattern': 0.5, 'momentum': 1.3, 'fundamental': 1.5, 'harmonic': 0.4, 'fibonacci': 0.7
      },
      'liquidity_crisis': {
        'volume': 1.8, 'news': 1.9, 'fundamental': 1.6, 'technical': 0.4, 'pattern': 0.3, 'momentum': 0.5, 'harmonic': 0.2, 'fibonacci': 0.4
      },
      'news_driven': {
        'news': 2.0, 'fundamental': 1.7, 'volume': 1.4, 'technical': 0.6, 'pattern': 0.5, 'momentum': 1.1, 'harmonic': 0.3, 'fibonacci': 0.5
      },
      'breakout': {
        'volume': 1.5, 'momentum': 1.4, 'technical': 1.3, 'pattern': 1.2, 'news': 1.0, 'fundamental': 0.8, 'harmonic': 1.0, 'fibonacci': 1.1
      },
      'consolidation': {
        'pattern': 1.3, 'fibonacci': 1.2, 'technical': 1.1, 'volume': 0.8, 'momentum': 0.6, 'news': 0.7, 'fundamental': 0.8, 'harmonic': 1.1
      }
    };
  }

  // ==================== EMISSION PROBABILITY FUNCTIONS ====================

  private trendingBullishEmission(obs: MarketObservation): number {
    return this.gaussianProbability(obs.priceMove, 0.002, 0.001) * 
           this.gaussianProbability(obs.momentum, 0.7, 0.2) *
           this.gaussianProbability(obs.trend, 0.8, 0.15) *
           (1 + obs.volume * 0.3); // Higher volume increases probability
  }

  private trendingBearishEmission(obs: MarketObservation): number {
    return this.gaussianProbability(obs.priceMove, -0.002, 0.001) * 
           this.gaussianProbability(obs.momentum, -0.7, 0.2) *
           this.gaussianProbability(obs.trend, -0.8, 0.15) *
           (1 + obs.volume * 0.3);
  }

  private rangingTightEmission(obs: MarketObservation): number {
    return this.gaussianProbability(obs.priceMove, 0, 0.0005) * 
           this.gaussianProbability(obs.volatility, 0.3, 0.1) *
           this.gaussianProbability(obs.momentum, 0, 0.2) *
           (1 - Math.abs(obs.trend) * 0.5); // Lower trend strength
  }

  private rangingVolatileEmission(obs: MarketObservation): number {
    return this.gaussianProbability(obs.volatility, 0.8, 0.2) *
           this.gaussianProbability(obs.momentum, 0, 0.4) *
           (1 - Math.abs(obs.trend) * 0.3) *
           Math.max(0.1, 1 - Math.abs(obs.priceMove) * 500); // High vol, low directional move
  }

  private shockUpEmission(obs: MarketObservation): number {
    return Math.max(0, obs.priceMove > 0.005 ? 1 : 0) * // Large positive move
           this.gaussianProbability(obs.volatility, 1.0, 0.3) *
           (1 + obs.volume * 0.5) *
           (1 + Math.max(0, obs.news) * 0.4);
  }

  private shockDownEmission(obs: MarketObservation): number {
    return Math.max(0, obs.priceMove < -0.005 ? 1 : 0) * // Large negative move
           this.gaussianProbability(obs.volatility, 1.0, 0.3) *
           (1 + obs.volume * 0.5) *
           (1 + Math.max(0, -obs.news) * 0.4);
  }

  private liquidityCrisisEmission(obs: MarketObservation): number {
    return this.gaussianProbability(obs.volatility, 1.2, 0.4) *
           Math.max(0.1, 1 - obs.volume) * // Low volume indicates liquidity issues
           (1 + Math.abs(obs.news) * 0.6) *
           Math.exp(-Math.abs(obs.momentum) * 2); // Erratic movement
  }

  private newsDrivenEmission(obs: MarketObservation): number {
    return Math.max(0.1, Math.abs(obs.news)) * // Strong news component
           this.gaussianProbability(obs.volatility, 0.9, 0.3) *
           (1 + obs.volume * 0.4) *
           (1 + Math.abs(obs.priceMove) * 200);
  }

  private breakoutEmission(obs: MarketObservation): number {
    return Math.max(0, obs.breakout) * // Breakout signals
           this.gaussianProbability(obs.volume, 1.2, 0.3) * // High volume
           (1 + Math.abs(obs.momentum) * 0.5) *
           Math.exp(-obs.reversal * 2); // Low reversal probability
  }

  private consolidationEmission(obs: MarketObservation): number {
    return this.gaussianProbability(obs.volatility, 0.4, 0.15) *
           this.gaussianProbability(obs.momentum, 0, 0.15) *
           this.gaussianProbability(obs.priceMove, 0, 0.0003) *
           Math.exp(-obs.breakout * 3); // Very low breakout probability
  }

  private gaussianProbability(x: number, mean: number, std: number): number {
    const variance = std * std;
    const coeff = 1 / Math.sqrt(2 * Math.PI * variance);
    const exponent = -Math.pow(x - mean, 2) / (2 * variance);
    return coeff * Math.exp(exponent);
  }

  // ==================== REGIME DETECTION ALGORITHM ====================

  async detectCurrentRegime(
    candles: any[],
    volume: number[],
    technicalIndicators: any[],
    news: any[] = []
  ): Promise<MarketRegime> {
    // Create market observation from current data
    const observation = this.createMarketObservation(candles, volume, technicalIndicators, news);
    
    // Add to observation window
    this.observationWindow.push(observation);
    if (this.observationWindow.length > 50) {
      this.observationWindow.shift(); // Keep last 50 observations
    }

    // Viterbi algorithm for HSMM state estimation
    const mostLikelyRegime = await this.runViterbiHSMM(this.observationWindow.slice(-20)); // Last 20 observations
    
    // Create regime object with all properties
    const regime = this.createRegimeObject(mostLikelyRegime, observation);
    
    // Check for regime transition
    if (regime.type !== this.currentRegime.type) {
      this.recordRegimeTransition(this.currentRegime.type, regime.type, observation);
      this.adaptWeightsOnTransition(regime.type);
    }
    
    this.currentRegime = regime;
    return regime;
  }

  private createMarketObservation(
    candles: any[],
    volume: number[],
    technicalIndicators: any[],
    news: any[]
  ): MarketObservation {
    const recent = candles.slice(-20);
    const prices = recent.map((c: any) => c.close);
    const highs = recent.map((c: any) => c.high);
    const lows = recent.map((c: any) => c.low);
    
    // Price movement (normalized)
    const priceMove = prices.length > 1 ? (prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2] : 0;
    
    // Volatility (20-period standard deviation of returns)
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    const volatility = returns.length > 0 ? Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * Math.sqrt(252) : 0;
    
    // Volume (normalized against recent average)
    const recentVolume = volume.slice(-20);
    const avgVolume = recentVolume.reduce((sum, v) => sum + v, 0) / recentVolume.length;
    const currentVolume = volume[volume.length - 1] || avgVolume;
    const normalizedVolume = avgVolume > 0 ? currentVolume / avgVolume : 1;
    
    // Momentum (price position within recent range)
    const highestHigh = Math.max(...highs);
    const lowestLow = Math.min(...lows);
    const currentPrice = prices[prices.length - 1];
    const momentum = (highestHigh - lowestLow) > 0 ? (currentPrice - lowestLow) / (highestHigh - lowestLow) - 0.5 : 0;
    
    // Trend strength (slope of linear regression)
    let trend = 0;
    if (prices.length >= 10) {
      const x = Array.from({ length: 10 }, (_, i) => i);
      const y = prices.slice(-10);
      const n = 10;
      const sumX = x.reduce((sum, val) => sum + val, 0);
      const sumY = y.reduce((sum, val) => sum + val, 0);
      const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
      const sumXX = x.reduce((sum, val) => sum + val * val, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      trend = slope / (sumY / n); // Normalize by average price
    }
    
    // Reversal signals (simplified)
    const rsi = this.calculateRSI(prices, 14);
    const reversal = (rsi > 70 || rsi < 30) ? Math.abs(rsi - 50) / 50 : 0;
    
    // Breakout signals (price vs recent range)
    const breakout = Math.max(
      0,
      currentPrice > highestHigh * 1.001 ? (currentPrice / highestHigh - 1) * 100 :
      currentPrice < lowestLow * 0.999 ? (lowestLow / currentPrice - 1) * 100 : 0
    );
    
    // News sentiment
    const newsScore = news && news.length > 0 ? 
      news.reduce((sum, n) => sum + (n.sentiment || 0), 0) / news.length / 10 : 0;
    
    // Time factors
    const now = new Date();
    const timeOfDay = (now.getHours() * 60 + now.getMinutes()) / (24 * 60); // 0-1
    const dayOfWeek = now.getDay(); // 0-6
    
    return {
      priceMove: Math.max(-0.1, Math.min(0.1, priceMove)), // Clamp extreme values
      volatility: Math.max(0, Math.min(2, volatility / 0.1)), // Normalize to 0-2 range
      volume: Math.max(0.1, Math.min(3, normalizedVolume)), // 0.1x to 3x normal volume
      momentum: Math.max(-1, Math.min(1, momentum * 2)), // -1 to 1
      trend: Math.max(-1, Math.min(1, trend * 1000)), // Scale and clamp
      reversal: Math.max(0, Math.min(1, reversal)),
      breakout: Math.max(0, Math.min(1, breakout / 5)), // 0-1 scale
      news: Math.max(-1, Math.min(1, newsScore)),
      timeOfDay,
      dayOfWeek: dayOfWeek / 6 // Normalize to 0-1
    };
  }

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50; // Neutral RSI
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = prices[prices.length - i] - prices[prices.length - i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    
    return 100 - (100 / (1 + rs));
  }

  private async runViterbiHSMM(observations: MarketObservation[]): Promise<string> {
    if (observations.length === 0) return 'ranging_tight';
    
    // Simplified Viterbi for regime detection
    // In production, implement full HSMM forward-backward algorithm
    
    const regimeProbabilities: Record<string, number> = {};
    
    this.hmmStates.forEach(state => {
      let probability = 1.0;
      
      // Calculate emission probabilities for recent observations
      const recentObs = observations.slice(-5); // Last 5 observations
      recentObs.forEach(obs => {
        probability *= state.emissionProbability(obs);
      });
      
      // Prior probability (current regime has higher probability)
      if (state.regime === this.currentRegime.type) {
        probability *= 2.0; // Regime persistence bias
      }
      
      regimeProbabilities[state.regime] = probability;
    });
    
    // Find most likely regime
    let maxProbability = 0;
    let mostLikelyRegime = 'ranging_tight';
    
    Object.entries(regimeProbabilities).forEach(([regime, prob]) => {
      if (prob > maxProbability) {
        maxProbability = prob;
        mostLikelyRegime = regime;
      }
    });
    
    return mostLikelyRegime;
  }

  private createRegimeObject(regimeType: string, observation: MarketObservation): MarketRegime {
    const state = this.hmmStates.find(s => s.regime === regimeType);
    if (!state) throw new Error(`Unknown regime type: ${regimeType}`);
    
    // Calculate regime properties
    const strength = this.calculateRegimeStrength(regimeType, observation);
    const confidence = this.calculateRegimeConfidence(regimeType, observation);
    
    return {
      type: regimeType as any,
      strength,
      confidence,
      duration: state.durationDistribution.mean,
      volatility: observation.volatility,
      momentum: observation.momentum,
      volume: observation.volume,
      microstructure: {
        bidAskSpread: observation.volatility * 0.1, // Simplified
        marketDepth: Math.max(0.1, 2 - observation.volatility), // Inverse of volatility
        orderFlow: observation.momentum > 0.1 ? 'buying' : observation.momentum < -0.1 ? 'selling' : 'neutral',
        institutionalActivity: observation.volume > 1.5 ? 0.8 : 0.3
      },
      adjustmentFactors: this.adaptiveWeights[regimeType] || {},
      riskMultiplier: this.calculateRiskMultiplier(regimeType, observation),
      expectedDuration: state.durationDistribution.mean * 15, // Convert to minutes (15min candles)
      transitionProbabilities: state.transitionProbabilities
    };
  }

  private calculateRegimeStrength(regimeType: string, observation: MarketObservation): number {
    // Calculate how strongly current conditions match the regime
    switch (regimeType) {
      case 'trending_bullish':
        return Math.min(1, Math.max(0, (observation.momentum + 1) / 2 + observation.trend + observation.volume / 3));
      case 'trending_bearish':
        return Math.min(1, Math.max(0, (1 - observation.momentum) / 2 - observation.trend + observation.volume / 3));
      case 'ranging_tight':
        return Math.min(1, Math.max(0, 1 - Math.abs(observation.momentum) - Math.abs(observation.trend) - observation.volatility / 2));
      case 'shock_up':
      case 'shock_down':
        return Math.min(1, observation.volatility + observation.volume / 2 + Math.abs(observation.priceMove) * 10);
      default:
        return 0.5;
    }
  }

  private calculateRegimeConfidence(regimeType: string, observation: MarketObservation): number {
    const state = this.hmmStates.find(s => s.regime === regimeType);
    if (!state) return 0.5;
    
    const emissionProb = state.emissionProbability(observation);
    const maxPossibleProb = 1.0; // Normalize against theoretical maximum
    
    return Math.min(1, Math.max(0.1, emissionProb / maxPossibleProb));
  }

  private calculateRiskMultiplier(regimeType: string, observation: MarketObservation): number {
    // Reduce risk during volatile or uncertain regimes
    const baseMultipliers: Record<string, number> = {
      'trending_bullish': 1.0,
      'trending_bearish': 1.0,
      'ranging_tight': 0.8,
      'ranging_volatile': 0.6,
      'shock_up': 0.3,
      'shock_down': 0.3,
      'liquidity_crisis': 0.1,
      'news_driven': 0.4,
      'breakout': 0.7,
      'consolidation': 0.9
    };
    
    const baseMultiplier = baseMultipliers[regimeType] || 0.5;
    
    // Adjust based on volatility and confidence
    const volatilityAdjustment = Math.max(0.1, 1 - observation.volatility / 2);
    const confidenceAdjustment = Math.max(0.5, this.currentRegime.confidence || 0.5);
    
    return baseMultiplier * volatilityAdjustment * confidenceAdjustment;
  }

  // ==================== ADAPTIVE WEIGHT MANAGEMENT ====================

  private recordRegimeTransition(fromRegime: string, toRegime: string, observation: MarketObservation): void {
    const transition: RegimeTransition = {
      fromRegime,
      toRegime,
      timestamp: new Date(),
      triggerFactors: this.identifyTransitionTriggers(observation),
      confidence: this.currentRegime.confidence || 0.5,
      marketConditions: {
        priceChange: observation.priceMove,
        volumeChange: observation.volume - 1, // Relative to normal
        volatilityChange: observation.volatility - 0.5, // Relative to baseline
        newsImpact: observation.news
      }
    };
    
    this.regimeHistory.push(transition);
    
    // Keep last 1000 transitions
    if (this.regimeHistory.length > 1000) {
      this.regimeHistory.shift();
    }
    
    console.log(`🔄 Regime transition: ${fromRegime} → ${toRegime} | Confidence: ${(transition.confidence * 100).toFixed(1)}%`);
  }

  private identifyTransitionTriggers(observation: MarketObservation): string[] {
    const triggers: string[] = [];
    
    if (Math.abs(observation.priceMove) > 0.01) triggers.push('large_price_move');
    if (observation.volatility > 1.5) triggers.push('volatility_spike');
    if (observation.volume > 2) triggers.push('volume_surge');
    if (Math.abs(observation.momentum) > 0.8) triggers.push('momentum_shift');
    if (Math.abs(observation.news) > 0.5) triggers.push('news_event');
    if (observation.breakout > 0.5) triggers.push('breakout');
    if (observation.reversal > 0.7) triggers.push('reversal_signal');
    
    return triggers;
  }

  private adaptWeightsOnTransition(newRegimeType: string): void {
    // Performance-based weight adaptation with exponential updates
    const learningRate = 0.1;
    
    if (this.adaptiveWeights[newRegimeType]) {
      Object.keys(this.adaptiveWeights[newRegimeType]).forEach(factorType => {
        const currentWeight = this.adaptiveWeights[newRegimeType][factorType];
        const performance = this.getFactorPerformance(factorType, newRegimeType);
        
        if (performance.sampleSize >= 5) { // Minimum sample size for adaptation
          // Exponential weight update based on performance
          // w_i ← w_i * exp(η * score_i)
          const score = (performance.winRate - 0.5) * performance.avgReturn; // Net performance score
          const multiplier = Math.exp(learningRate * score);
          
          this.adaptiveWeights[newRegimeType][factorType] = Math.max(0.1, Math.min(3.0, currentWeight * multiplier));
        }
      });
      
      // Normalize weights to prevent runaway growth
      this.normalizeWeights(newRegimeType);
    }
  }

  private normalizeWeights(regimeType: string): void {
    const weights = this.adaptiveWeights[regimeType];
    if (!weights) return;
    
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const targetTotal = Object.keys(weights).length; // Target average of 1.0
    
    if (totalWeight > 0) {
      const scaleFactor = targetTotal / totalWeight;
      Object.keys(weights).forEach(factorType => {
        weights[factorType] *= scaleFactor;
      });
    }
  }

  private getFactorPerformance(factorType: string, regimeType: string): { 
    winRate: number; 
    avgReturn: number; 
    sampleSize: number 
  } {
    // Simplified performance tracking - in production, maintain detailed statistics
    const key = `${regimeType}_${factorType}`;
    
    if (!this.regimePerformance[key]) {
      return { winRate: 0.5, avgReturn: 0, sampleSize: 0 };
    }
    
    return this.regimePerformance[key];
  }

  // ==================== UTILITY FUNCTIONS ====================

  private buildTransitionMatrix(): void {
    const regimeTypes = this.hmmStates.map(s => s.regime);
    const n = regimeTypes.length;
    
    this.transitionMatrix = Array(n).fill(0).map(() => Array(n).fill(0));
    
    this.hmmStates.forEach((state, i) => {
      regimeTypes.forEach((regime, j) => {
        this.transitionMatrix[i][j] = state.transitionProbabilities[regime] || 0.01;
      });
    });
  }

  private getDefaultRegime(): MarketRegime {
    return {
      type: 'ranging_tight',
      strength: 0.5,
      confidence: 0.5,
      duration: 60,
      volatility: 0.5,
      momentum: 0,
      volume: 1,
      microstructure: {
        bidAskSpread: 0.05,
        marketDepth: 1.0,
        orderFlow: 'neutral',
        institutionalActivity: 0.5
      },
      adjustmentFactors: this.adaptiveWeights['ranging_tight'] || {},
      riskMultiplier: 0.8,
      expectedDuration: 900, // 15 minutes
      transitionProbabilities: {
        'ranging_tight': 0.7,
        'trending_bullish': 0.1,
        'trending_bearish': 0.1,
        'breakout': 0.1
      }
    };
  }

  // ==================== PUBLIC INTERFACE ====================

  getCurrentRegime(): MarketRegime {
    return this.currentRegime;
  }

  getRegimeStats(): RegimeStats {
    const avgDurations: Record<string, number> = {};
    const performance: Record<string, any> = {};
    
    // Calculate average durations from history
    const regimeTypes = [...new Set(this.regimeHistory.map(t => t.toRegime))];
    regimeTypes.forEach(regime => {
      const transitions = this.regimeHistory.filter(t => t.fromRegime === regime);
      if (transitions.length > 0) {
        const totalDuration = transitions.reduce((sum, t, i) => {
          const nextTransition = this.regimeHistory.find((nt, ni) => ni > transitions.indexOf(t) && nt.fromRegime === regime);
          const duration = nextTransition ? 
            (nextTransition.timestamp.getTime() - t.timestamp.getTime()) / (1000 * 60) : 30; // Default 30 min
          return sum + duration;
        }, 0);
        
        avgDurations[regime] = totalDuration / transitions.length;
      }
    });
    
    return {
      currentRegime: this.currentRegime,
      regimeHistory: this.regimeHistory.slice(-100), // Last 100 transitions
      averageRegimeDuration: avgDurations,
      transitionMatrix: this.transitionMatrix,
      regimePerformance: this.regimePerformance,
      adaptiveWeights: this.adaptiveWeights
    };
  }

  updateFactorPerformance(
    factorType: string, 
    regimeType: string, 
    wasWin: boolean, 
    returnAmount: number
  ): void {
    const key = `${regimeType}_${factorType}`;
    
    if (!this.regimePerformance[key]) {
      this.regimePerformance[key] = {
        trades: 0,
        wins: 0,
        totalReturn: 0,
        winRate: 0.5,
        avgReturn: 0,
        sampleSize: 0
      };
    }
    
    const perf = this.regimePerformance[key];
    perf.trades += 1;
    if (wasWin) perf.wins += 1;
    perf.totalReturn += returnAmount;
    perf.winRate = perf.wins / perf.trades;
    perf.avgReturn = perf.totalReturn / perf.trades;
    perf.sampleSize = perf.trades;
  }

  getAdaptiveWeights(regimeType: string): Record<string, number> {
    return this.adaptiveWeights[regimeType] ? { ...this.adaptiveWeights[regimeType] } : {};
  }

  // Force regime change for testing
  forceRegimeChange(regimeType: string): void {
    const observation = this.observationWindow[this.observationWindow.length - 1] || {
      priceMove: 0, volatility: 0.5, volume: 1, momentum: 0, trend: 0, 
      reversal: 0, breakout: 0, news: 0, timeOfDay: 0.5, dayOfWeek: 0.5
    };
    
    this.currentRegime = this.createRegimeObject(regimeType, observation);
    
    console.log(`🔄 Forced regime change to: ${regimeType}`);
  }
}
