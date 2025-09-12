import { supabase } from '@/integrations/supabase/client';
import { calibrationEngine } from './calibrationEngine';
import { Decimal } from 'decimal.js';

export interface MasterSignal {
  id: string;
  analysis_id: string;
  fusion_decision: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence_score: number;
  contributing_signals: any[];
  weighted_score: number;
  signal_weights: Record<string, number>;
  fusion_reasoning: string;
  symbol: string;
  timeframe: string;
  recommended_entry: number;
  recommended_stop_loss: number;
  recommended_take_profit: number;
  recommended_lot_size: number;
  risk_assessment: {
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    max_risk_percent: number;
    volatility_factor: number;
    correlation_risk: number;
  };
  market_conditions: {
    trend: string;
    volatility: string;
    session: string;
    news_impact: string;
  };
  created_at: string;
  status: 'pending' | 'executed' | 'expired' | 'cancelled';
}

export interface FusionParameters {
  min_contributing_signals: number;
  min_weighted_score: number;
  max_confidence_threshold: number;
  min_confidence_threshold: number;
  technical_weight: number;
  fundamental_weight: number;
  sentiment_weight: number;
  quantitative_weight: number;
  intermarket_weight: number;
  specialized_weight: number;
  risk_factor_multiplier: number;
  observe_only: boolean;
}

class FusionEngine {
  private fusionParameters: FusionParameters = {
    min_contributing_signals: 3,
    min_weighted_score: 0.65,
    max_confidence_threshold: 0.9,
    min_confidence_threshold: 0.6,
    technical_weight: 0.25,
    fundamental_weight: 0.20,
    sentiment_weight: 0.15,
    quantitative_weight: 0.15,
    intermarket_weight: 0.15,
    specialized_weight: 0.10,
    risk_factor_multiplier: 1.0,
    observe_only: true // Phase 7: Observe-only mode
  };

  async generateMasterSignal(symbol: string = 'EURUSD', timeframe: string = 'M15'): Promise<MasterSignal | null> {
    console.log(`🔮 Starting fusion engine for ${symbol} ${timeframe}...`);
    
    try {
      // Fetch recent modular signals
      const contributingSignals = await this.fetchContributingSignals(symbol, timeframe);
      
      if (contributingSignals.length < this.fusionParameters.min_contributing_signals) {
        console.log(`⚠️ Insufficient signals: ${contributingSignals.length} < ${this.fusionParameters.min_contributing_signals}`);
        return null;
      }

      // Calculate weighted scores
      const weightedScores = this.calculateWeightedScores(contributingSignals);
      
      // Determine fusion decision
      const fusionDecision = this.determineFusionDecision(weightedScores, contributingSignals);
      
      if (fusionDecision.decision === 'NEUTRAL') {
        console.log('🤖 Fusion decision: NEUTRAL - No clear signal');
        return null;
      }

      // Generate master signal
      const masterSignal = await this.createMasterSignal(
        fusionDecision,
        contributingSignals,
        weightedScores,
        symbol,
        timeframe
      );

      // Log to audit trail (Phase 7 requirement)
      await this.logFusionAudit(masterSignal, contributingSignals, weightedScores);

      // In observe-only mode, don't execute trades
      if (this.fusionParameters.observe_only) {
        console.log('👁️ OBSERVE-ONLY MODE: Master signal generated but not executed');
        masterSignal.status = 'pending';
      }

      console.log(`✅ Master signal generated: ${fusionDecision.decision} (confidence: ${fusionDecision.confidence.toFixed(3)})`);
      
      return masterSignal;

    } catch (error) {
      console.error('❌ Fusion engine error:', error);
      return null;
    }
  }

  private async fetchContributingSignals(symbol: string, timeframe: string) {
    try {
      const { data, error } = await supabase
        .from('modular_signals')
        .select('*')
        .eq('symbol', symbol)
        .eq('timeframe', timeframe)
        .gte('timestamp', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
        .eq('is_active', true)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching contributing signals:', error);
      return [];
    }
  }

  private calculateWeightedScores(signals: any[]): Record<string, number> {
    const weights = {
      'technical_analysis': this.fusionParameters.technical_weight,
      'fundamental_analysis': this.fusionParameters.fundamental_weight,
      'sentiment_analysis': this.fusionParameters.sentiment_weight,
      'quantitative_analysis': this.fusionParameters.quantitative_weight,
      'intermarket_analysis': this.fusionParameters.intermarket_weight,
      'specialized_analysis': this.fusionParameters.specialized_weight
    };

    const scores: Record<string, number> = {};
    
    signals.forEach(signal => {
      const moduleWeight = weights[signal.module_id] || 0;
      const calibrationBoost = this.getCalibrationBoost(signal.module_id, signal.timeframe);
      const confidenceScore = signal.confidence * signal.strength / 10;
      
      scores[signal.module_id] = confidenceScore * moduleWeight * calibrationBoost;
    });

    return scores;
  }

  private getCalibrationBoost(module_id: string, timeframe: string): number {
    // Simulate calibration boost based on historical performance
    // In real implementation, this would fetch from calibration_results
    const boostFactors: Record<string, number> = {
      'technical_analysis': 1.15,
      'fundamental_analysis': 1.08,
      'sentiment_analysis': 0.95,
      'quantitative_analysis': 1.12,
      'intermarket_analysis': 1.05,
      'specialized_analysis': 0.98
    };

    return boostFactors[module_id] || 1.0;
  }

  private determineFusionDecision(weightedScores: Record<string, number>, signals: any[]): {
    decision: 'BUY' | 'SELL' | 'NEUTRAL';
    confidence: number;
    reasoning: string;
  } {
    const totalWeightedScore = Object.values(weightedScores).reduce((sum, score) => sum + score, 0);
    
    // Calculate signal distribution
    const buySignals = signals.filter(s => s.signal_type === 'buy');
    const sellSignals = signals.filter(s => s.signal_type === 'sell');
    
    const buyScore = buySignals.reduce((sum, s) => sum + (weightedScores[s.module_id] || 0), 0);
    const sellScore = sellSignals.reduce((sum, s) => sum + (weightedScores[s.module_id] || 0), 0);
    
    const netScore = buyScore - sellScore;
    const maxPossibleScore = Math.max(buyScore + sellScore, 1);
    const normalizedScore = Math.abs(netScore) / maxPossibleScore;

    let decision: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
    let reasoning = 'Insufficient signal strength for clear direction';

    if (normalizedScore >= this.fusionParameters.min_weighted_score) {
      if (netScore > 0) {
        decision = 'BUY';
        reasoning = `Strong BUY consensus: ${buySignals.length} buy vs ${sellSignals.length} sell signals, net score: ${netScore.toFixed(3)}`;
      } else {
        decision = 'SELL';
        reasoning = `Strong SELL consensus: ${sellSignals.length} sell vs ${buySignals.length} buy signals, net score: ${Math.abs(netScore).toFixed(3)}`;
      }
    }

    const confidence = Math.min(normalizedScore, 1.0);

    return { decision, confidence, reasoning };
  }

  private async createMasterSignal(
    fusionDecision: any,
    contributingSignals: any[],
    weightedScores: Record<string, number>,
    symbol: string,
    timeframe: string
  ): Promise<MasterSignal> {
    const analysisId = crypto.randomUUID();
    
    // Calculate recommended trading parameters
    const avgEntry = contributingSignals.reduce((sum, s) => sum + (s.suggested_entry || s.trigger_price), 0) / contributingSignals.length;
    const avgStopLoss = contributingSignals.reduce((sum, s) => sum + (s.suggested_stop_loss || 0), 0) / contributingSignals.length;
    const avgTakeProfit = contributingSignals.reduce((sum, s) => sum + (s.suggested_take_profit || 0), 0) / contributingSignals.length;

    // Risk assessment
    const riskAssessment = this.calculateRiskAssessment(fusionDecision.confidence, contributingSignals);
    
    // Market conditions assessment
    const marketConditions = this.assessMarketConditions(contributingSignals);

    const masterSignal: MasterSignal = {
      id: crypto.randomUUID(),
      analysis_id: analysisId,
      fusion_decision: fusionDecision.decision,
      confidence_score: fusionDecision.confidence,
      contributing_signals: contributingSignals.map(s => ({
        module_id: s.module_id,
        signal_type: s.signal_type,
        confidence: s.confidence,
        timestamp: s.timestamp
      })),
      weighted_score: Object.values(weightedScores).reduce((sum, score) => sum + score, 0),
      signal_weights: weightedScores,
      fusion_reasoning: fusionDecision.reasoning,
      symbol,
      timeframe,
      recommended_entry: avgEntry,
      recommended_stop_loss: avgStopLoss,
      recommended_take_profit: avgTakeProfit,
      recommended_lot_size: this.calculateOptimalLotSize(riskAssessment),
      risk_assessment: riskAssessment,
      market_conditions: marketConditions,
      created_at: new Date().toISOString(),
      status: 'pending'
    };

    // Save to database (mock for now)
    await this.saveMasterSignal(masterSignal);

    return masterSignal;
  }

  private calculateRiskAssessment(confidence: number, signals: any[]): any {
    const volatilitySignals = signals.filter(s => s.volatility_regime === 'high').length;
    const totalSignals = signals.length;
    const volatilityFactor = volatilitySignals / totalSignals;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    let maxRiskPercent = 2.0;

    if (confidence > 0.8 && volatilityFactor < 0.3) {
      riskLevel = 'LOW';
      maxRiskPercent = 1.5;
    } else if (confidence < 0.65 || volatilityFactor > 0.6) {
      riskLevel = 'HIGH';
      maxRiskPercent = 3.0;
    }

    return {
      risk_level: riskLevel,
      max_risk_percent: maxRiskPercent,
      volatility_factor: volatilityFactor,
      correlation_risk: Math.random() * 0.3 // Simplified correlation risk
    };
  }

  private assessMarketConditions(signals: any[]): any {
    const trendSignals = signals.map(s => s.trend_context);
    const dominantTrend = this.getMostFrequent(trendSignals) || 'unknown';
    
    const volatilitySignals = signals.map(s => s.volatility_regime);
    const dominantVolatility = this.getMostFrequent(volatilitySignals) || 'normal';

    return {
      trend: dominantTrend,
      volatility: dominantVolatility,
      session: this.getCurrentSession(),
      news_impact: this.assessNewsImpact()
    };
  }

  private getMostFrequent(arr: string[]): string {
    const frequency: Record<string, number> = {};
    arr.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });
    return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
  }

  private getCurrentSession(): string {
    const hour = new Date().getUTCHours();
    if (hour >= 0 && hour < 8) return 'asian';
    if (hour >= 8 && hour < 16) return 'london';
    return 'new_york';
  }

  private assessNewsImpact(): string {
    // Simplified news impact assessment
    const impacts = ['low', 'medium', 'high'];
    return impacts[Math.floor(Math.random() * impacts.length)];
  }

  private calculateOptimalLotSize(riskAssessment: any): number {
    const baseLotSize = 0.01;
    const riskMultipliers = {
      'LOW': 1.5,
      'MEDIUM': 1.0,
      'HIGH': 0.5
    };
    
    return baseLotSize * (riskMultipliers[riskAssessment.risk_level] || 1.0);
  }

  private async saveMasterSignal(masterSignal: MasterSignal): Promise<void> {
    try {
      // Mock implementation - will be replaced when database types are updated
      console.log(`💾 Mock: Master signal would be saved`);
      console.log('Signal:', {
        decision: masterSignal.fusion_decision,
        confidence: masterSignal.confidence_score,
        contributing_signals: masterSignal.contributing_signals.length
      });
    } catch (error) {
      console.error('Error saving master signal:', error);
    }
  }

  private async logFusionAudit(
    masterSignal: MasterSignal, 
    contributingSignals: any[], 
    weightedScores: Record<string, number>
  ): Promise<void> {
    try {
      // Mock implementation for audit logging
      console.log(`📝 FUSION AUDIT LOG:`);
      console.log(`Timestamp: ${new Date().toISOString()}`);
      console.log(`Decision: ${masterSignal.fusion_decision}`);
      console.log(`Confidence: ${masterSignal.confidence_score.toFixed(3)}`);
      console.log(`Contributing Signals: ${contributingSignals.length}`);
      console.log(`Weighted Scores:`, weightedScores);
      console.log(`Reasoning: ${masterSignal.fusion_reasoning}`);
      console.log(`Risk Level: ${masterSignal.risk_assessment.risk_level}`);
      console.log(`---`);
    } catch (error) {
      console.error('Error logging fusion audit:', error);
    }
  }

  // Method to fetch recent master signals for UI
  async getRecentMasterSignals(limit: number = 10): Promise<MasterSignal[]> {
    // Mock implementation - return sample master signals
    const mockSignals: MasterSignal[] = [
      {
        id: crypto.randomUUID(),
        analysis_id: crypto.randomUUID(),
        fusion_decision: 'BUY',
        confidence_score: 0.78,
        contributing_signals: [
          { module_id: 'technical_analysis', signal_type: 'buy', confidence: 0.82 },
          { module_id: 'sentiment_analysis', signal_type: 'buy', confidence: 0.74 },
          { module_id: 'quantitative_analysis', signal_type: 'buy', confidence: 0.68 }
        ],
        weighted_score: 0.76,
        signal_weights: {
          'technical_analysis': 0.25,
          'sentiment_analysis': 0.15,
          'quantitative_analysis': 0.15
        },
        fusion_reasoning: 'Strong BUY consensus: 3 buy vs 0 sell signals, net score: 0.76',
        symbol: 'EURUSD',
        timeframe: 'M15',
        recommended_entry: 1.17080,
        recommended_stop_loss: 1.16950,
        recommended_take_profit: 1.17250,
        recommended_lot_size: 0.015,
        risk_assessment: {
          risk_level: 'LOW',
          max_risk_percent: 1.5,
          volatility_factor: 0.2,
          correlation_risk: 0.15
        },
        market_conditions: {
          trend: 'uptrend',
          volatility: 'normal',
          session: 'london',
          news_impact: 'low'
        },
        created_at: new Date().toISOString(),
        status: 'pending'
      }
    ];

    return mockSignals;
  }

  // Update fusion parameters
  updateFusionParameters(newParameters: Partial<FusionParameters>): void {
    this.fusionParameters = { ...this.fusionParameters, ...newParameters };
    console.log('🔧 Fusion parameters updated:', this.fusionParameters);
  }

  // Get current fusion parameters
  getFusionParameters(): FusionParameters {
    return { ...this.fusionParameters };
  }

  // Enable/disable observe-only mode
  setObserveOnlyMode(enabled: boolean): void {
    this.fusionParameters.observe_only = enabled;
    console.log(`👁️ Observe-only mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }
}

export const fusionEngine = new FusionEngine();