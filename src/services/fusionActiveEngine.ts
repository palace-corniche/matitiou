import { supabase } from '@/integrations/supabase/client';
import { fusionEngine, MasterSignal } from './fusionEngine';

export interface FusionActiveMode {
  enabled: boolean;
  auto_execute: boolean;
  user_confirmation_required: boolean;
  max_concurrent_trades: number;
  risk_per_trade: number;
  daily_loss_limit: number;
  stop_loss_mode: 'fixed' | 'trailing' | 'dynamic';
  take_profit_mode: 'fixed' | 'dynamic' | 'scale_out';
}

export interface ActiveSignalExecution {
  id: string;
  master_signal_id: string;
  execution_status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
  user_decision: 'execute' | 'pause' | 'stop' | null;
  execution_timestamp: string | null;
  rejection_reason: string | null;
  trade_id: string | null;
  created_at: string;
}

class FusionActiveEngine {
  private activeMode: FusionActiveMode = {
    enabled: false,
    auto_execute: false,
    user_confirmation_required: true,
    max_concurrent_trades: 3,
    risk_per_trade: 2.0,
    daily_loss_limit: 100.0,
    stop_loss_mode: 'trailing',
    take_profit_mode: 'dynamic'
  };

  private pendingExecutions: ActiveSignalExecution[] = [];
  private executedSignals: ActiveSignalExecution[] = [];

  // Enable/disable fusion active mode
  setActiveMode(enabled: boolean): void {
    this.activeMode.enabled = enabled;
    console.log(`🔥 Fusion Active Mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    
    if (enabled) {
      console.log('📊 Master Signals now visible and executable');
      console.log('⚠️  User-controlled shadow trading enabled');
    }
  }

  // Update active mode configuration
  updateActiveConfiguration(config: Partial<FusionActiveMode>): void {
    this.activeMode = { ...this.activeMode, ...config };
    console.log('🔧 Fusion active configuration updated:', this.activeMode);
  }

  // Process new master signal for execution
  async processMasterSignal(masterSignal: MasterSignal): Promise<ActiveSignalExecution> {
    console.log(`🎯 Processing master signal for execution: ${masterSignal.fusion_decision}`);
    
    if (!this.activeMode.enabled) {
      console.log('⏸️  Fusion active mode disabled - signal not processed');
      return null;
    }

    // Check concurrent trade limits
    const activeTrades = await this.getActiveTrades();
    if (activeTrades.length >= this.activeMode.max_concurrent_trades) {
      console.log(`⛔ Max concurrent trades reached (${this.activeMode.max_concurrent_trades})`);
      return null;
    }

    // Check daily loss limit
    const dailyPnL = await this.getDailyPnL();
    if (dailyPnL <= -this.activeMode.daily_loss_limit) {
      console.log(`⛔ Daily loss limit reached ($${this.activeMode.daily_loss_limit})`);
      return null;
    }

    const execution: ActiveSignalExecution = {
      id: crypto.randomUUID(),
      master_signal_id: masterSignal.id,
      execution_status: this.activeMode.user_confirmation_required ? 'pending' : 'approved',
      user_decision: null,
      execution_timestamp: null,
      rejection_reason: null,
      trade_id: null,
      created_at: new Date().toISOString()
    };

    this.pendingExecutions.push(execution);

    if (this.activeMode.auto_execute && !this.activeMode.user_confirmation_required) {
      await this.executeSignal(execution.id, 'execute');
    }

    await this.logSignalExecution(execution);
    return execution;
  }

  // Handle user decision on signal execution
  async handleUserDecision(
    executionId: string, 
    decision: 'execute' | 'pause' | 'stop',
    reason?: string
  ): Promise<boolean> {
    const execution = this.pendingExecutions.find(e => e.id === executionId);
    if (!execution) {
      console.error(`❌ Execution not found: ${executionId}`);
      return false;
    }

    execution.user_decision = decision;
    
    switch (decision) {
      case 'execute':
        return await this.executeSignal(executionId, decision);
      
      case 'pause':
        execution.execution_status = 'pending';
        console.log(`⏸️  Signal execution paused: ${executionId}`);
        return true;
      
      case 'stop':
        execution.execution_status = 'rejected';
        execution.rejection_reason = reason || 'User stopped execution';
        console.log(`🛑 Signal execution stopped: ${executionId}`);
        return true;
      
      default:
        return false;
    }
  }

  // Execute the signal as a shadow trade
  private async executeSignal(
    executionId: string, 
    decision: 'execute'
  ): Promise<boolean> {
    const execution = this.pendingExecutions.find(e => e.id === executionId);
    if (!execution) return false;

    try {
      console.log(`⚡ Executing signal: ${executionId}`);
      
      // Get the master signal
      const masterSignal = await this.getMasterSignal(execution.master_signal_id);
      if (!masterSignal) {
        execution.execution_status = 'failed';
        execution.rejection_reason = 'Master signal not found';
        return false;
      }

      // Calculate position size based on risk management
      const lotSize = this.calculatePositionSize(masterSignal);
      
      // Create shadow trade
      const tradeData = {
        symbol: masterSignal.symbol,
        trade_type: masterSignal.fusion_decision.toLowerCase(),
        lot_size: lotSize,
        entry_price: masterSignal.recommended_entry,
        stop_loss: masterSignal.recommended_stop_loss,
        take_profit: masterSignal.recommended_take_profit,
        order_type: 'market',
        comment: `Fusion Signal ${masterSignal.id}`,
        magic_number: 12345
      };

      // Mock trade execution - would call shadow trading engine
      const tradeResult = await this.executeShadowTrade(tradeData);
      
      if (tradeResult.success) {
        execution.execution_status = 'executed';
        execution.execution_timestamp = new Date().toISOString();
        execution.trade_id = tradeResult.trade_id;
        
        // Move to executed list
        this.executedSignals.push(execution);
        this.pendingExecutions = this.pendingExecutions.filter(e => e.id !== executionId);
        
        console.log(`✅ Signal executed successfully: Trade ID ${tradeResult.trade_id}`);
        return true;
      } else {
        execution.execution_status = 'failed';
        execution.rejection_reason = tradeResult.error;
        console.log(`❌ Signal execution failed: ${tradeResult.error}`);
        return false;
      }
    } catch (error) {
      console.error('Error executing signal:', error);
      execution.execution_status = 'failed';
      execution.rejection_reason = error.message;
      return false;
    }
  }

  // Calculate position size based on risk management
  private calculatePositionSize(masterSignal: MasterSignal): number {
    const accountBalance = 10000; // Mock account balance
    const riskAmount = accountBalance * (this.activeMode.risk_per_trade / 100);
    
    const entryPrice = masterSignal.recommended_entry;
    const stopLoss = masterSignal.recommended_stop_loss;
    const pipDifference = Math.abs(entryPrice - stopLoss) / 0.0001;
    
    // Calculate lot size based on risk (simplified)
    const pipValue = 10; // $10 per pip for 1 lot EUR/USD
    const maxLotSize = riskAmount / (pipDifference * pipValue);
    
    // Round to standard lot sizes
    return Math.min(Math.max(Math.round(maxLotSize * 100) / 100, 0.01), 1.0);
  }

  // Mock shadow trade execution
  private async executeShadowTrade(tradeData: any): Promise<any> {
    // Mock implementation - would integrate with shadow trading engine
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate execution delay
    
    return {
      success: true,
      trade_id: crypto.randomUUID(),
      execution_price: tradeData.entry_price,
      slip_pips: Math.random() * 0.5, // Random slippage
      timestamp: new Date().toISOString()
    };
  }

  // Get master signal by ID
  private async getMasterSignal(signalId: string): Promise<MasterSignal | null> {
    // Mock implementation - would fetch from database
    const mockSignal: MasterSignal = {
      id: signalId,
      analysis_id: crypto.randomUUID(),
      fusion_decision: 'BUY',
      confidence_score: 0.78,
      contributing_signals: [],
      weighted_score: 0.76,
      signal_weights: {},
      fusion_reasoning: 'Strong bullish consensus',
      symbol: 'EURUSD',
      timeframe: 'M15',
      recommended_entry: 1.17080,
      recommended_stop_loss: 1.16950,
      recommended_take_profit: 1.17250,
      recommended_lot_size: 0.01,
      risk_assessment: {
        risk_level: 'LOW',
        max_risk_percent: 2.0,
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
    };
    
    return mockSignal;
  }

  // Get active trades count
  private async getActiveTrades(): Promise<any[]> {
    // Mock implementation - would query shadow_trades table
    return []; // Return empty for now
  }

  // Get daily PnL
  private async getDailyPnL(): Promise<number> {
    // Mock implementation - would calculate from today's trades
    return -25.50; // Mock daily PnL
  }

  // Log signal execution for audit
  private async logSignalExecution(execution: ActiveSignalExecution): Promise<void> {
    try {
      console.log(`📝 SIGNAL EXECUTION LOG:`);
      console.log(`Execution ID: ${execution.id}`);
      console.log(`Master Signal: ${execution.master_signal_id}`);
      console.log(`Status: ${execution.execution_status}`);
      console.log(`User Decision: ${execution.user_decision || 'pending'}`);
      console.log(`Timestamp: ${execution.created_at}`);
      console.log(`---`);
    } catch (error) {
      console.error('Error logging signal execution:', error);
    }
  }

  // Get pending executions for UI
  getPendingExecutions(): ActiveSignalExecution[] {
    return [...this.pendingExecutions];
  }

  // Get executed signals for UI
  getExecutedSignals(): ActiveSignalExecution[] {
    return [...this.executedSignals];
  }

  // Get active mode configuration
  getActiveConfiguration(): FusionActiveMode {
    return { ...this.activeMode };
  }

  // System health monitoring for master signals
  async monitorMasterSignalReliability(): Promise<any> {
    const recentSignals = this.executedSignals.slice(-10);
    
    if (recentSignals.length === 0) {
      return {
        reliability_score: 0,
        execution_rate: 0,
        average_execution_time: 0,
        status: 'no_data'
      };
    }

    const successfulExecutions = recentSignals.filter(s => s.execution_status === 'executed').length;
    const executionRate = (successfulExecutions / recentSignals.length) * 100;
    
    return {
      reliability_score: executionRate,
      execution_rate: executionRate,
      average_execution_time: 250, // Mock average execution time in ms
      total_signals_processed: recentSignals.length,
      successful_executions: successfulExecutions,
      failed_executions: recentSignals.length - successfulExecutions,
      status: executionRate >= 90 ? 'healthy' : executionRate >= 70 ? 'warning' : 'critical'
    };
  }
}

export const fusionActiveEngine = new FusionActiveEngine();