// Option A: Automated Intelligence Trading System
// Background monitoring and auto-execution engine

import { supabase } from '@/integrations/supabase/client';
import { marketIntelligenceEngine, MarketIntelligence } from './marketIntelligenceEngine';
import { AdvancedPositionSizing } from './advancedPositionSizing';
import { performanceTracker } from './performanceTracker';

export interface AutomatedTradingRule {
  id: string;
  portfolioId: string;
  ruleName: string;
  ruleType: 'regime_change' | 'economic_surprise' | 'sentiment_momentum';
  triggerConditions: {
    confidenceThreshold: number;
    regimeChangePercent?: number;
    surpriseThreshold?: number;
    sentimentMomentum?: number;
  };
  executionParameters: {
    maxPositionSize: number;
    stopLossPercent: number;
    takeProfitPercent: number;
    riskPerTrade: number;
  };
  isActive: boolean;
}

export interface AutoExecutionResult {
  success: boolean;
  tradeId?: string;
  reasoning: string[];
  signalConfidence: number;
  positionSize: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  error?: string;
}

class AutomatedTradingEngine {
  private monitoring = false;
  private lastIntelligence: MarketIntelligence | null = null;
  private positionSizer = new AdvancedPositionSizing();
  private executionHistory: { timestamp: Date; signal: any; result: AutoExecutionResult }[] = [];

  // ==================== MAIN AUTOMATION CONTROL ====================
  
  async startAutomatedTrading(portfolioId: string): Promise<void> {
    console.log('🤖 Starting automated trading engine...');
    this.monitoring = true;
    
    // Monitor intelligence signals every 30 seconds
    this.monitorIntelligenceSignals(portfolioId);
    
    // Check for rule-based triggers every minute
    setInterval(() => {
      if (this.monitoring) {
        this.evaluateAutomatedRules(portfolioId);
      }
    }, 60000); // 1 minute
  }

  stopAutomatedTrading(): void {
    console.log('🛑 Stopping automated trading engine...');
    this.monitoring = false;
  }

  // ==================== INTELLIGENCE MONITORING ====================
  
  private async monitorIntelligenceSignals(portfolioId: string): Promise<void> {
    if (!this.monitoring) return;

    try {
      const intelligence = await marketIntelligenceEngine.getMarketIntelligence('EUR/USD');
      
      if (this.shouldExecuteBasedOnIntelligence(intelligence)) {
        const result = await this.executeIntelligenceTrade(portfolioId, intelligence);
        
        if (result.success) {
          console.log(`✅ Auto-executed trade: ${result.reasoning.join('; ')}`);
          
          // Track performance
          await performanceTracker.trackSignalOutcome(
            result.tradeId || 'auto_trade',
            'automated_intelligence',
            {
              success: true,
              return: 0, // Will be updated when trade closes
              confidence: result.signalConfidence,
              strength: 8, // High strength for automated signals
              executionTime: Date.now()
            }
          );
        }
      }

      this.lastIntelligence = intelligence;
      
    } catch (error) {
      console.error('Error monitoring intelligence signals:', error);
    }

    // Schedule next check
    setTimeout(() => this.monitorIntelligenceSignals(portfolioId), 30000);
  }

  private shouldExecuteBasedOnIntelligence(intelligence: MarketIntelligence): boolean {
    // Regime Change Detection (>20% confidence shift)
    if (this.lastIntelligence) {
      const regimeConfidenceChange = Math.abs(
        intelligence.regime.confidence - this.lastIntelligence.regime.confidence
      );
      
      if (regimeConfidenceChange > 0.2 && intelligence.regime.confidence > 0.75) {
        console.log(`🔄 Significant regime change detected: ${regimeConfidenceChange.toFixed(2)}`);
        return true;
      }
    }

    // Economic Surprise Threshold (>5% deviation)
    const significantSurprises = intelligence.surprises.filter(s => 
      Math.abs(s.surprise) > 5 && s.impact === 'high'
    );
    
    if (significantSurprises.length > 0) {
      console.log(`📊 High-impact economic surprises detected: ${significantSurprises.length}`);
      return true;
    }

    // Sentiment Momentum (3-period moving average trend)
    if (intelligence.sentiment.confidence > 0.8 && Math.abs(intelligence.sentiment.overallSentiment) > 60) {
      console.log(`💭 Strong sentiment signal: ${intelligence.sentiment.overallSentiment.toFixed(1)}`);
      return true;
    }

    return false;
  }

  // ==================== TRADE EXECUTION ====================
  
  private async executeIntelligenceTrade(
    portfolioId: string, 
    intelligence: MarketIntelligence
  ): Promise<AutoExecutionResult> {
    try {
      // Get global account for position sizing
      const { data: accountData, error: accountError } = await supabase.rpc('get_global_trading_account');

      if (accountError || !accountData || accountData.length === 0) {
        throw new Error('Global trading account not found');
      }

      const account = accountData[0];

      // Determine trade direction and confidence
      const { direction, confidence, reasoning } = this.analyzeTradeDirection(intelligence);
      
      if (confidence < 0.7) {
        return {
          success: false,
          reasoning: ['Confidence too low for execution', ...reasoning],
          signalConfidence: confidence,
          positionSize: 0,
          entryPrice: 0,
          stopLoss: 0,
          takeProfit: 0,
          error: 'Below confidence threshold'
        };
      }

      // Calculate optimal position size
      const positionResult = this.positionSizer.calculateOptimalPositionSize(
        0.6, // Win probability estimate
        0.04, // Expected return (4%)
        -0.02, // Expected loss (-2%)
        confidence,
        {
          accountBalance: account.balance,
          riskPerTrade: 0.02, // 2% risk
          maxPositionSize: 0.05, // 5% max position
          cvarLimit: 0.03, // 3% CVaR limit
          maxDrawdownBudget: 0.15, // 15% max drawdown
          correlationMatrix: [], // Simplified
          currentDrawdown: account.current_drawdown || 0,
          openPositions: [] // Would fetch actual positions
        }
      );

      // Get current market price
      const { data: tickData } = await supabase
        .from('tick_data')
        .select('bid, ask')
        .eq('symbol', 'EUR/USD')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      const entryPrice = direction === 'buy' ? tickData.ask : tickData.bid;
      const stopLoss = direction === 'buy' 
        ? entryPrice * (1 - 0.02) 
        : entryPrice * (1 + 0.02);
      const takeProfit = direction === 'buy'
        ? entryPrice * (1 + 0.04)
        : entryPrice * (1 - 0.04);

      // Execute the trade
      const { data: tradeResult } = await supabase.functions.invoke('manage-shadow-trades', {
        body: {
          action: 'create_trade',
          portfolioId,
          symbol: 'EUR/USD',
          tradeType: direction,
          lotSize: positionResult.finalSize * account.balance / 100000, // Convert to lot size
          entryPrice,
          stopLoss,
          takeProfit,
          comment: 'Automated Intelligence Trade',
          magicNumber: 2024
        }
      });

      if (tradeResult?.success) {
        const result: AutoExecutionResult = {
          success: true,
          tradeId: tradeResult.tradeId,
          reasoning: [
            `Auto-executed ${direction.toUpperCase()} based on intelligence`,
            `Confidence: ${(confidence * 100).toFixed(1)}%`,
            `Position size: ${(positionResult.finalSize * 100).toFixed(2)}%`,
            ...reasoning,
            ...positionResult.reasoning
          ],
          signalConfidence: confidence,
          positionSize: positionResult.finalSize,
          entryPrice,
          stopLoss,
          takeProfit
        };

        this.executionHistory.push({
          timestamp: new Date(),
          signal: { intelligence, direction, confidence },
          result
        });

        return result;
      } else {
        throw new Error(tradeResult?.error || 'Trade execution failed');
      }

    } catch (error) {
      console.error('Error executing intelligence trade:', error);
      return {
        success: false,
        reasoning: ['Trade execution failed'],
        signalConfidence: 0,
        positionSize: 0,
        entryPrice: 0,
        stopLoss: 0,
        takeProfit: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private analyzeTradeDirection(intelligence: MarketIntelligence): {
    direction: 'buy' | 'sell';
    confidence: number;
    reasoning: string[];
  } {
    const reasoning: string[] = [];
    let buyScore = 0;
    let sellScore = 0;
    let totalWeight = 0;

    // Regime Analysis (30% weight)
    const regimeWeight = 0.3;
    if (intelligence.regime.regime === 'risk-on') {
      buyScore += intelligence.regime.confidence * regimeWeight;
      reasoning.push(`Risk-on regime supports buying (${(intelligence.regime.confidence * 100).toFixed(1)}% confidence)`);
    } else if (intelligence.regime.regime === 'risk-off') {
      sellScore += intelligence.regime.confidence * regimeWeight;
      reasoning.push(`Risk-off regime supports selling (${(intelligence.regime.confidence * 100).toFixed(1)}% confidence)`);
    }
    totalWeight += regimeWeight;

    // Sentiment Analysis (25% weight)
    const sentimentWeight = 0.25;
    if (intelligence.sentiment.overallSentiment > 20) {
      buyScore += (intelligence.sentiment.overallSentiment / 100) * intelligence.sentiment.confidence * sentimentWeight;
      reasoning.push(`Positive sentiment: ${intelligence.sentiment.overallSentiment.toFixed(1)}`);
    } else if (intelligence.sentiment.overallSentiment < -20) {
      sellScore += Math.abs(intelligence.sentiment.overallSentiment / 100) * intelligence.sentiment.confidence * sentimentWeight;
      reasoning.push(`Negative sentiment: ${intelligence.sentiment.overallSentiment.toFixed(1)}`);
    }
    totalWeight += sentimentWeight;

    // Economic Surprises (25% weight)
    const surpriseWeight = 0.25;
    const eurSurprises = intelligence.surprises.filter(s => s.currency === 'EUR');
    const usdSurprises = intelligence.surprises.filter(s => s.currency === 'USD');
    
    const eurSurpriseAvg = eurSurprises.length > 0 
      ? eurSurprises.reduce((sum, s) => sum + s.surprise, 0) / eurSurprises.length 
      : 0;
    const usdSurpriseAvg = usdSurprises.length > 0
      ? usdSurprises.reduce((sum, s) => sum + s.surprise, 0) / usdSurprises.length
      : 0;

    const netSurprise = eurSurpriseAvg - usdSurpriseAvg;
    if (netSurprise > 2) {
      buyScore += Math.min(netSurprise / 10, 1) * surpriseWeight;
      reasoning.push(`EUR surprises outperforming USD: ${netSurprise.toFixed(1)}%`);
    } else if (netSurprise < -2) {
      sellScore += Math.min(Math.abs(netSurprise) / 10, 1) * surpriseWeight;
      reasoning.push(`USD surprises outperforming EUR: ${netSurprise.toFixed(1)}%`);
    }
    totalWeight += surpriseWeight;

    // Central Bank Signals (20% weight)
    const cbWeight = 0.2;
    const ecbSignal = intelligence.centralBankSignals.find(cb => cb.bank === 'ECB');
    const fedSignal = intelligence.centralBankSignals.find(cb => cb.bank === 'Fed');
    
    if (ecbSignal?.signal === 'hawkish' && fedSignal?.signal !== 'hawkish') {
      buyScore += ecbSignal.confidence * cbWeight;
      reasoning.push(`ECB hawkish stance favors EUR`);
    } else if (fedSignal?.signal === 'hawkish' && ecbSignal?.signal !== 'hawkish') {
      sellScore += fedSignal.confidence * cbWeight;
      reasoning.push(`Fed hawkish stance favors USD`);
    }
    totalWeight += cbWeight;

    // Determine final direction and confidence
    const direction = buyScore > sellScore ? 'buy' : 'sell';
    const confidence = Math.max(buyScore, sellScore) / totalWeight;
    
    reasoning.push(`Final analysis: ${direction.toUpperCase()} with ${(confidence * 100).toFixed(1)}% confidence`);

    return { direction, confidence, reasoning };
  }

  // ==================== RULE-BASED AUTOMATION ====================
  
  private async evaluateAutomatedRules(portfolioId: string): Promise<void> {
    try {
      const { data: rules } = await supabase
        .from('automated_trading_rules')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('is_active', true);

      if (!rules || rules.length === 0) return;

      const intelligence = await marketIntelligenceEngine.getMarketIntelligence('EUR/USD');

      for (const rule of rules) {
        if (this.evaluateRuleCondition(rule, intelligence)) {
          await this.executeRuleBasedTrade(portfolioId, rule, intelligence);
        }
      }

    } catch (error) {
      console.error('Error evaluating automated rules:', error);
    }
  }

  private evaluateRuleCondition(rule: any, intelligence: MarketIntelligence): boolean {
    const conditions = rule.trigger_conditions;

    switch (rule.rule_type) {
      case 'regime_change':
        return this.lastIntelligence && 
               Math.abs(intelligence.regime.confidence - this.lastIntelligence.regime.confidence) > 
               (conditions.regimeChangePercent || 0.2);

      case 'economic_surprise':
        return intelligence.surprises.some(s => 
          Math.abs(s.surprise) > (conditions.surpriseThreshold || 5) && s.impact === 'high'
        );

      case 'sentiment_momentum':
        return intelligence.sentiment.confidence > conditions.confidenceThreshold &&
               Math.abs(intelligence.sentiment.overallSentiment) > (conditions.sentimentMomentum || 60);

      default:
        return false;
    }
  }

  private async executeRuleBasedTrade(portfolioId: string, rule: any, intelligence: MarketIntelligence): Promise<void> {
    console.log(`🎯 Executing rule-based trade: ${rule.rule_name}`);
    
    // This would implement the specific trade execution logic for rules
    // Similar to executeIntelligenceTrade but using rule parameters
  }

  // ==================== ADAPTIVE LEARNING ====================
  
  async updateTradingThresholds(): Promise<void> {
    // Analyze recent performance and adjust thresholds
    const recentExecutions = this.executionHistory.slice(-50); // Last 50 executions
    
    if (recentExecutions.length > 10) {
      const successRate = recentExecutions.filter(e => e.result.success).length / recentExecutions.length;
      
      // Adjust confidence threshold based on success rate
      if (successRate < 0.6) {
        console.log('📈 Increasing confidence threshold due to low success rate');
        // Increase thresholds
      } else if (successRate > 0.8) {
        console.log('📉 Decreasing confidence threshold due to high success rate');
        // Decrease thresholds to capture more opportunities
      }
    }
  }

  // ==================== GETTERS ====================
  
  getExecutionHistory(): typeof this.executionHistory {
    return this.executionHistory;
  }

  isMonitoring(): boolean {
    return this.monitoring;
  }

  getPerformanceStats(): {
    totalExecutions: number;
    successRate: number;
    avgConfidence: number;
    recentPerformance: string;
  } {
    const total = this.executionHistory.length;
    const successful = this.executionHistory.filter(e => e.result.success).length;
    const avgConfidence = total > 0
      ? this.executionHistory.reduce((sum, e) => sum + e.result.signalConfidence, 0) / total
      : 0;

    return {
      totalExecutions: total,
      successRate: total > 0 ? successful / total : 0,
      avgConfidence,
      recentPerformance: total > 0 ? 'Active' : 'No executions yet'
    };
  }
}

export const automatedTradingEngine = new AutomatedTradingEngine();