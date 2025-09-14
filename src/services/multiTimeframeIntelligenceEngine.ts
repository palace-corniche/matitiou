// Option B: Multi-Timeframe Intelligence Fusion
// Cross-timeframe analysis with confluence scoring

import { marketIntelligenceEngine, MarketIntelligence } from './marketIntelligenceEngine';
import { supabase } from '@/integrations/supabase/client';

export interface TimeframeIntelligence {
  timeframe: string;
  intelligence: MarketIntelligence;
  weight: number; // Higher timeframes get higher weights
  signalStrength: number;
  trendDirection: 'bullish' | 'bearish' | 'neutral';
  momentum: number;
}

export interface MultiTimeframeSignal {
  id?: string;
  symbol: string;
  analysisId: string;
  timeframes: string[];
  signalType: 'buy' | 'sell' | 'neutral';
  confluenceScore: number;
  timeframeAgreementCount: number;
  cascadeStrength: number;
  divergenceDetected: boolean;
  primaryTimeframe: string;
  signalData: {
    [timeframe: string]: {
      intelligence: MarketIntelligence;
      localStrength: number;
      trendAlignment: boolean;
      momentum: number;
    };
  };
  reasoning: string[];
  createdAt: Date;
}

export interface TimeframeDivergence {
  shortTerm: string;
  longTerm: string;
  divergenceType: 'bullish' | 'bearish' | 'momentum';
  strength: number;
  description: string;
}

class MultiTimeframeIntelligenceEngine {
  private readonly TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'];
  private readonly TIMEFRAME_WEIGHTS = {
    '1m': 0.05,
    '5m': 0.1,
    '15m': 0.15,
    '1h': 0.2,
    '4h': 0.25,
    '1d': 0.25
  };

  // ==================== MAIN ANALYSIS ENGINE ====================
  
  async generateMultiTimeframeSignal(
    symbol: string = 'EUR/USD',
    primaryTimeframe: string = '15m'
  ): Promise<MultiTimeframeSignal> {
    console.log(`🔍 Generating multi-timeframe intelligence for ${symbol}...`);
    
    try {
      // Get intelligence for all timeframes
      const timeframeIntelligences = await this.gatherTimeframeIntelligence(symbol);
      
      // Analyze confluence across timeframes
      const confluence = this.calculateTimeframeConfluence(timeframeIntelligences);
      
      // Detect divergences
      const divergences = this.detectTimeframeDivergences(timeframeIntelligences);
      
      // Calculate cascade strength from higher timeframes
      const cascadeStrength = this.calculateCascadeStrength(timeframeIntelligences, primaryTimeframe);
      
      // Build signal data object
      const signalData = this.buildSignalData(timeframeIntelligences);
      
      // Generate reasoning
      const reasoning = this.generateSignalReasoning(
        timeframeIntelligences, 
        confluence, 
        divergences, 
        cascadeStrength
      );

      const analysisId = `mtf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const signal: MultiTimeframeSignal = {
        symbol,
        analysisId,
        timeframes: this.TIMEFRAMES,
        signalType: confluence.overallDirection,
        confluenceScore: confluence.score,
        timeframeAgreementCount: confluence.agreementCount,
        cascadeStrength,
        divergenceDetected: divergences.length > 0,
        primaryTimeframe,
        signalData,
        reasoning,
        createdAt: new Date()
      };

      // Save to database
      await this.saveMultiTimeframeSignal(signal);
      
      console.log(`✅ Multi-timeframe signal generated: ${signal.signalType.toUpperCase()} (${(signal.confluenceScore * 100).toFixed(1)}% confluence)`);
      
      return signal;
      
    } catch (error) {
      console.error('Error generating multi-timeframe signal:', error);
      throw error;
    }
  }

  // ==================== INTELLIGENCE GATHERING ====================
  
  private async gatherTimeframeIntelligence(symbol: string): Promise<TimeframeIntelligence[]> {
    const intelligences: TimeframeIntelligence[] = [];
    
    // In a real implementation, we would fetch different timeframe data
    // For this demo, we'll simulate different timeframe perspectives
    
    for (const timeframe of this.TIMEFRAMES) {
      try {
        // Get base intelligence (same source but we'll modify for timeframe perspective)
        const baseIntelligence = await marketIntelligenceEngine.getMarketIntelligence(symbol);
        
        // Simulate timeframe-specific adjustments
        const timeframeIntelligence = this.adjustIntelligenceForTimeframe(baseIntelligence, timeframe);
        
        const { strength, direction, momentum } = this.analyzeTimeframeSignal(timeframeIntelligence, timeframe);
        
        intelligences.push({
          timeframe,
          intelligence: timeframeIntelligence,
          weight: this.TIMEFRAME_WEIGHTS[timeframe as keyof typeof this.TIMEFRAME_WEIGHTS] || 0.1,
          signalStrength: strength,
          trendDirection: direction,
          momentum
        });
        
      } catch (error) {
        console.error(`Error getting intelligence for ${timeframe}:`, error);
        // Continue with other timeframes
      }
    }
    
    return intelligences;
  }

  private adjustIntelligenceForTimeframe(
    baseIntelligence: MarketIntelligence, 
    timeframe: string
  ): MarketIntelligence {
    // Simulate timeframe-specific adjustments
    const timeframeMultiplier = this.getTimeframeVolatilityMultiplier(timeframe);
    
    return {
      ...baseIntelligence,
      regime: {
        ...baseIntelligence.regime,
        confidence: Math.min(1, baseIntelligence.regime.confidence * timeframeMultiplier.regime)
      },
      sentiment: {
        ...baseIntelligence.sentiment,
        confidence: Math.min(1, baseIntelligence.sentiment.confidence * timeframeMultiplier.sentiment),
        overallSentiment: baseIntelligence.sentiment.overallSentiment * timeframeMultiplier.sentiment
      }
    };
  }

  private getTimeframeVolatilityMultiplier(timeframe: string): { regime: number; sentiment: number } {
    const multipliers = {
      '1m': { regime: 0.3, sentiment: 1.2 }, // Short-term noise
      '5m': { regime: 0.5, sentiment: 1.1 },
      '15m': { regime: 0.8, sentiment: 1.0 },
      '1h': { regime: 1.0, sentiment: 0.9 },
      '4h': { regime: 1.2, sentiment: 0.8 },
      '1d': { regime: 1.5, sentiment: 0.7 }  // Long-term stability
    };
    
    return multipliers[timeframe as keyof typeof multipliers] || { regime: 1.0, sentiment: 1.0 };
  }

  // ==================== SIGNAL ANALYSIS ====================
  
  private analyzeTimeframeSignal(intelligence: MarketIntelligence, timeframe: string): {
    strength: number;
    direction: 'bullish' | 'bearish' | 'neutral';
    momentum: number;
  } {
    let bullishScore = 0;
    let bearishScore = 0;
    let totalWeight = 0;

    // Regime contribution
    const regimeWeight = 0.4;
    if (intelligence.regime.regime === 'risk-on') {
      bullishScore += intelligence.regime.confidence * regimeWeight;
    } else if (intelligence.regime.regime === 'risk-off') {
      bearishScore += intelligence.regime.confidence * regimeWeight;
    }
    totalWeight += regimeWeight;

    // Sentiment contribution
    const sentimentWeight = 0.3;
    if (intelligence.sentiment.overallSentiment > 0) {
      bullishScore += (intelligence.sentiment.overallSentiment / 100) * intelligence.sentiment.confidence * sentimentWeight;
    } else {
      bearishScore += (Math.abs(intelligence.sentiment.overallSentiment) / 100) * intelligence.sentiment.confidence * sentimentWeight;
    }
    totalWeight += sentimentWeight;

    // Economic surprise contribution
    const surpriseWeight = 0.3;
    const avgSurprise = intelligence.surprises.length > 0
      ? intelligence.surprises.reduce((sum, s) => sum + s.surprise, 0) / intelligence.surprises.length
      : 0;
    
    if (avgSurprise > 0) {
      bullishScore += Math.min(avgSurprise / 10, 1) * surpriseWeight;
    } else {
      bearishScore += Math.min(Math.abs(avgSurprise) / 10, 1) * surpriseWeight;
    }
    totalWeight += surpriseWeight;

    // Determine direction and strength
    const netScore = bullishScore - bearishScore;
    const strength = Math.max(bullishScore, bearishScore) / totalWeight;
    
    let direction: 'bullish' | 'bearish' | 'neutral';
    if (Math.abs(netScore) < 0.1) {
      direction = 'neutral';
    } else {
      direction = netScore > 0 ? 'bullish' : 'bearish';
    }

    // Calculate momentum (simplified)
    const momentum = Math.abs(netScore) * strength;

    return { strength, direction, momentum };
  }

  // ==================== CONFLUENCE CALCULATION ====================
  
  private calculateTimeframeConfluence(timeframeIntelligences: TimeframeIntelligence[]): {
    score: number;
    overallDirection: 'buy' | 'sell' | 'neutral';
    agreementCount: number;
  } {
    let weightedBullishScore = 0;
    let weightedBearishScore = 0;
    let totalWeight = 0;
    let agreementCount = 0;

    // Calculate weighted scores
    timeframeIntelligences.forEach(tf => {
      if (tf.trendDirection === 'bullish') {
        weightedBullishScore += tf.signalStrength * tf.weight;
        agreementCount++;
      } else if (tf.trendDirection === 'bearish') {
        weightedBearishScore += tf.signalStrength * tf.weight;
        agreementCount++;
      }
      totalWeight += tf.weight;
    });

    // Normalize scores
    const normalizedBullish = weightedBullishScore / totalWeight;
    const normalizedBearish = weightedBearishScore / totalWeight;
    
    // Calculate confluence score (how much timeframes agree)
    const maxScore = Math.max(normalizedBullish, normalizedBearish);
    const minScore = Math.min(normalizedBullish, normalizedBearish);
    const confluenceScore = (maxScore - minScore) / maxScore || 0;

    // Determine overall direction
    let overallDirection: 'buy' | 'sell' | 'neutral';
    if (Math.abs(normalizedBullish - normalizedBearish) < 0.1) {
      overallDirection = 'neutral';
    } else {
      overallDirection = normalizedBullish > normalizedBearish ? 'buy' : 'sell';
    }

    return {
      score: confluenceScore,
      overallDirection,
      agreementCount
    };
  }

  // ==================== DIVERGENCE DETECTION ====================
  
  private detectTimeframeDivergences(timeframeIntelligences: TimeframeIntelligence[]): TimeframeDivergence[] {
    const divergences: TimeframeDivergence[] = [];
    
    // Compare short-term vs long-term timeframes
    const shortTerm = timeframeIntelligences.filter(tf => ['1m', '5m', '15m'].includes(tf.timeframe));
    const longTerm = timeframeIntelligences.filter(tf => ['1h', '4h', '1d'].includes(tf.timeframe));

    if (shortTerm.length === 0 || longTerm.length === 0) return divergences;

    // Calculate average directions
    const shortTermBullish = shortTerm.filter(tf => tf.trendDirection === 'bullish').length;
    const longTermBullish = longTerm.filter(tf => tf.trendDirection === 'bullish').length;
    
    const shortTermBias = shortTermBullish / shortTerm.length;
    const longTermBias = longTermBullish / longTerm.length;

    // Detect significant divergence (>50% difference in bias)
    if (Math.abs(shortTermBias - longTermBias) > 0.5) {
      const divergenceType = shortTermBias > longTermBias ? 'bullish' : 'bearish';
      const strength = Math.abs(shortTermBias - longTermBias);
      
      divergences.push({
        shortTerm: 'ST',
        longTerm: 'LT',
        divergenceType,
        strength,
        description: `${divergenceType} divergence: short-term ${(shortTermBias * 100).toFixed(0)}% vs long-term ${(longTermBias * 100).toFixed(0)}%`
      });
    }

    return divergences;
  }

  // ==================== CASCADE STRENGTH ====================
  
  private calculateCascadeStrength(
    timeframeIntelligences: TimeframeIntelligence[], 
    primaryTimeframe: string
  ): number {
    // Get higher timeframes than primary
    const timeframeOrder = ['1m', '5m', '15m', '1h', '4h', '1d'];
    const primaryIndex = timeframeOrder.indexOf(primaryTimeframe);
    
    if (primaryIndex === -1) return 0;

    const higherTimeframes = timeframeIntelligences.filter(tf => 
      timeframeOrder.indexOf(tf.timeframe) > primaryIndex
    );

    if (higherTimeframes.length === 0) return 0;

    // Calculate weighted cascade strength
    let cascadeStrength = 0;
    let totalWeight = 0;

    higherTimeframes.forEach(tf => {
      cascadeStrength += tf.signalStrength * tf.weight;
      totalWeight += tf.weight;
    });

    return totalWeight > 0 ? cascadeStrength / totalWeight : 0;
  }

  // ==================== DATA BUILDING ====================
  
  private buildSignalData(timeframeIntelligences: TimeframeIntelligence[]): MultiTimeframeSignal['signalData'] {
    const signalData: MultiTimeframeSignal['signalData'] = {};
    
    timeframeIntelligences.forEach(tf => {
      signalData[tf.timeframe] = {
        intelligence: tf.intelligence,
        localStrength: tf.signalStrength,
        trendAlignment: tf.trendDirection !== 'neutral',
        momentum: tf.momentum
      };
    });
    
    return signalData;
  }

  private generateSignalReasoning(
    timeframeIntelligences: TimeframeIntelligence[],
    confluence: any,
    divergences: TimeframeDivergence[],
    cascadeStrength: number
  ): string[] {
    const reasoning: string[] = [];
    
    // Overall confluence
    reasoning.push(`Multi-timeframe confluence: ${(confluence.score * 100).toFixed(1)}% (${confluence.agreementCount}/${timeframeIntelligences.length} timeframes agree)`);
    
    // Cascade strength
    reasoning.push(`Higher timeframe cascade strength: ${(cascadeStrength * 100).toFixed(1)}%`);
    
    // Individual timeframe analysis
    const strongTimeframes = timeframeIntelligences
      .filter(tf => tf.signalStrength > 0.6)
      .map(tf => `${tf.timeframe}(${tf.trendDirection}, ${(tf.signalStrength * 100).toFixed(0)}%)`);
    
    if (strongTimeframes.length > 0) {
      reasoning.push(`Strong signals from: ${strongTimeframes.join(', ')}`);
    }
    
    // Divergences
    if (divergences.length > 0) {
      reasoning.push(`Divergences detected: ${divergences.map(d => d.description).join('; ')}`);
    }
    
    return reasoning;
  }

  // ==================== DATABASE OPERATIONS ====================
  
  private async saveMultiTimeframeSignal(signal: MultiTimeframeSignal): Promise<void> {
    try {
      await supabase
        .from('multi_timeframe_signals')
        .insert({
          analysis_id: signal.analysisId,
          symbol: signal.symbol,
          timeframes: signal.timeframes,
          signal_type: signal.signalType,
          confluence_score: signal.confluenceScore,
          timeframe_agreement_count: signal.timeframeAgreementCount,
          cascade_strength: signal.cascadeStrength,
          divergence_detected: signal.divergenceDetected,
          primary_timeframe: signal.primaryTimeframe,
          signal_data: signal.signalData as any
        });
      
      console.log(`💾 Saved multi-timeframe signal: ${signal.analysisId}`);
      
    } catch (error) {
      console.error('Error saving multi-timeframe signal:', error);
    }
  }

  // ==================== PUBLIC GETTERS ====================
  
  async getRecentMultiTimeframeSignals(symbol: string = 'EUR/USD', limit: number = 10): Promise<MultiTimeframeSignal[]> {
    try {
      const { data, error } = await supabase
        .from('multi_timeframe_signals')
        .select('*')
        .eq('symbol', symbol)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        symbol: item.symbol,
        analysisId: item.analysis_id,
        timeframes: item.timeframes,
        signalType: item.signal_type as 'buy' | 'sell' | 'neutral',
        confluenceScore: item.confluence_score,
        timeframeAgreementCount: item.timeframe_agreement_count,
        cascadeStrength: item.cascade_strength,
        divergenceDetected: item.divergence_detected,
        primaryTimeframe: item.primary_timeframe,
        signalData: item.signal_data as any,
        reasoning: [], // Would be reconstructed or stored separately
        createdAt: new Date(item.created_at)
      }));

    } catch (error) {
      console.error('Error fetching multi-timeframe signals:', error);
      return [];
    }
  }

  getTimeframeWeights(): typeof this.TIMEFRAME_WEIGHTS {
    return this.TIMEFRAME_WEIGHTS;
  }

  getSupportedTimeframes(): string[] {
    return this.TIMEFRAMES;
  }

  async analyzeMultiTimeframe(symbol: string, timeframes: string[]): Promise<MultiTimeframeSignal> {
    const analysisId = `analysis_${Date.now()}`;
    
    // Simulate multi-timeframe analysis
    const confluenceScore = Math.random() * 50 + 50; // 50-100% confluence
    const agreementCount = Math.floor((confluenceScore / 100) * timeframes.length);
    
    const signal: MultiTimeframeSignal = {
      analysisId,
      symbol,
      timeframes,
      primaryTimeframe: timeframes[Math.floor(timeframes.length / 2)],
      confluenceScore,
      timeframeAgreementCount: agreementCount,
      cascadeStrength: Math.random() * 40 + 60,
      divergenceDetected: Math.random() > 0.7,
      signalType: Math.random() > 0.5 ? 'buy' : 'sell',
      signalData: {} as any,
      reasoning: [`Multi-timeframe analysis for ${symbol}`, `Confluence: ${confluenceScore.toFixed(1)}%`],
      createdAt: new Date()
    };

    // Store signal (simplified)
    return signal;
  }
}

export const multiTimeframeIntelligenceEngine = new MultiTimeframeIntelligenceEngine();