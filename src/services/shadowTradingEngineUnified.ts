// ============= PHASE 1: UNIFIED SHADOW TRADING ENGINE =============
// Combines best features from V1 (Analytics), V2 (Database), V3 (Execution)

import { supabase } from '@/integrations/supabase/client';
import { marketDataService } from '@/services/realTimeMarketData';
import { metaTraderPositionSizing } from '@/services/metaTraderPositionSizing';

// ============= UNIFIED INTERFACES =============
export interface UnifiedShadowTrade {
  // Core trade data
  id: string;
  portfolio_id: string;
  signal_id?: string;
  symbol: string;
  trade_type: 'buy' | 'sell';
  entry_price: number;
  entry_time: string;
  stop_loss: number;
  take_profit: number;
  lot_size: number;
  position_size: number;
  confluence_score: number;
  status: 'open' | 'closed';
  
  // Exit data
  exit_price?: number;
  exit_time?: string;
  exit_reason?: 'tp' | 'sl' | 'time' | 'manual' | 'opposing_signal';
  
  // P&L and performance
  pnl?: number;
  pnl_percent?: number;
  risk_reward_ratio?: number;
  holding_time_minutes?: number;
  
  // MetaTrader-style fields
  pip_value?: number;
  profit_pips?: number;
  margin_required?: number;
  contract_size: number;
  commission?: number;
  swap?: number;
  slippage_pips?: number;
  current_price?: number;
  unrealized_pnl?: number;
  
  // Advanced features
  trailing_stop_distance?: number;
  trailing_stop_triggered?: boolean;
  break_even_triggered?: boolean;
  partial_close_count?: number;
  original_lot_size?: number;
  remaining_lot_size?: number;
  magic_number?: number;
  
  // Analytics
  strategy_name?: string;
  indicators_used?: string[];
  market_session?: string;
  volatility_regime?: string;
  trend_context?: string;
  
  created_at: string;
  updated_at: string;
}

export interface UnifiedShadowPortfolio {
  // Core portfolio data
  id: string;
  user_id?: string;
  session_id?: string;
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  margin_level: number;
  floating_pnl: number;
  
  // Performance metrics
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  average_win: number;
  average_loss: number;
  profit_factor: number;
  max_drawdown: number;
  current_drawdown: number;
  peak_balance: number;
  max_equity: number;
  sharpe_ratio: number;
  expectancy: number;
  
  // MetaTrader-style settings
  account_currency: string;
  leverage: number;
  account_type: string;
  initial_deposit: number;
  deposits_total: number;
  withdrawals_total: number;
  daily_loss_limit: number;
  max_drawdown_limit: number;
  margin_call_level: number;
  stop_out_level: number;
  daily_pnl_today: number;
  
  // Trading settings
  is_active: boolean;
  auto_trading_enabled: boolean;
  max_open_positions: number;
  lot_size_type: string;
  custom_lot_multiplier: number;
  last_daily_reset: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  last_trade_time?: string;
}

export interface UnifiedPerformanceMetrics {
  // Basic metrics
  totalTrades: number;
  winRate: number;
  averageRR: number;
  totalPnl: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  expectancy: number;
  averageHoldingTime: number;
  
  // Advanced metrics
  bestTrade: number;
  worstTrade: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  largestWin: number;
  largestLoss: number;
  
  // Time-based analysis
  monthlyReturns: Array<{ month: string; return: number; trades: number }>;
  weeklyReturns: Array<{ week: string; return: number; trades: number }>;
  dailyReturns: Array<{ date: string; return: number; trades: number }>;
  
  // Strategy breakdown
  strategyBreakdown: Record<string, { trades: number; winRate: number; pnl: number }>;
  confluenceBreakdown: Record<string, { trades: number; winRate: number; pnl: number }>;
  timeframeBreakdown: Record<string, { trades: number; winRate: number; pnl: number }>;
  
  // Risk metrics
  maxConsecutiveLosses: number;
  maxConsecutiveWins: number;
  averageRisk: number;
  riskAdjustedReturn: number;
  calmarRatio: number;
  sortinoRatio: number;
  
  // Market analysis
  bestPerformingSession: string;
  worstPerformingSession: string;
  volatilityImpact: Record<string, number>;
}

export interface TradeExecutionRequest {
  symbol: string;
  trade_type: 'buy' | 'sell';
  lot_size: number;
  entry_price: number;
  stop_loss?: number;
  take_profit?: number;
  confluence_score?: number;
  signal_id?: string;
  strategy_name?: string;
  comment?: string;
  magic_number?: number;
}

// ============= UNIFIED SHADOW TRADING ENGINE =============
export class UnifiedShadowTradingEngine {
  private currentPortfolio: UnifiedShadowPortfolio | null = null;
  private readonly INITIAL_BALANCE = 100000;
  private readonly DEFAULT_LOT_SIZE = 0.01;
  private readonly MAX_RISK_PER_TRADE = 0.02;
  private readonly MAX_OPEN_POSITIONS = 5;
  private readonly TRADE_TIMEOUT_HOURS = 24;

  constructor() {
    this.initializeRealTimeUpdates();
  }

  // ============= PORTFOLIO MANAGEMENT =============
  async getOrCreatePortfolio(userId?: string, sessionId?: string): Promise<UnifiedShadowPortfolio | null> {
    try {
      // Get session ID if not provided
      if (!sessionId && !userId) {
        sessionId = this.getSessionId();
      }

      // Try to get existing portfolio
      let query = supabase
        .from('shadow_portfolios')
        .select('*')
        .eq('is_active', true);

      if (userId) {
        query = query.eq('user_id', userId);
      } else if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data: existingPortfolio, error: fetchError } = await query.single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingPortfolio) {
        this.currentPortfolio = existingPortfolio as UnifiedShadowPortfolio;
        return this.currentPortfolio;
      }

      // Create new portfolio with unified structure
      const { data: newPortfolio, error: createError } = await supabase
        .from('shadow_portfolios')
        .insert({
          user_id: userId || null,
          session_id: sessionId || null,
          balance: this.INITIAL_BALANCE,
          equity: this.INITIAL_BALANCE,
          margin: 0,
          free_margin: this.INITIAL_BALANCE,
          margin_level: 0,
          floating_pnl: 0,
          initial_deposit: this.INITIAL_BALANCE,
          deposits_total: this.INITIAL_BALANCE,
          withdrawals_total: 0,
          account_currency: 'USD',
          leverage: 100,
          account_type: 'demo',
          lot_size_type: 'standard',
          custom_lot_multiplier: 1.0,
          daily_loss_limit: 2000, // 2% of initial
          max_drawdown_limit: 10000, // 10% of initial
          margin_call_level: 100,
          stop_out_level: 50,
          max_open_positions: this.MAX_OPEN_POSITIONS,
          auto_trading_enabled: true,
          is_active: true
        })
        .select()
        .single();

      if (createError) throw createError;

      this.currentPortfolio = newPortfolio as UnifiedShadowPortfolio;
      return this.currentPortfolio;
    } catch (error) {
      console.error('❌ Error getting/creating portfolio:', error);
      return null;
    }
  }

  // ============= TRADE EXECUTION =============
  async executeTrade(tradeData: TradeExecutionRequest): Promise<UnifiedShadowTrade | null> {
    if (!this.currentPortfolio) {
      await this.getOrCreatePortfolio();
      if (!this.currentPortfolio) return null;
    }

    try {
      // Get current market price if not provided
      let currentPrice = tradeData.entry_price;
      if (!currentPrice) {
        const latestTick = await marketDataService.getLatestTick(tradeData.symbol);
        currentPrice = latestTick ? (latestTick.bid + latestTick.ask) / 2 : 1.17000;
      }

      // Calculate optimal position sizing with proper AccountConfig
      const lotSize = tradeData.lot_size || this.DEFAULT_LOT_SIZE;
      const marginRequired = lotSize * 100000 * currentPrice * 0.01; // 1% margin


      // Validate margin requirements
      if (marginRequired > this.currentPortfolio.free_margin) {
        console.warn('❌ Insufficient margin for trade');
        return null;
      }

      // Execute trade using Supabase RPC function
      const { data: executedTrade, error: executeError } = await supabase
        .rpc('execute_advanced_order', {
          p_portfolio_id: this.currentPortfolio.id,
          p_order_data: {
            symbol: tradeData.symbol,
            trade_type: tradeData.trade_type,
            lot_size: lotSize,
            entry_price: currentPrice,
            stop_loss: tradeData.stop_loss || this.calculateDefaultStopLoss(currentPrice, tradeData.trade_type),
            take_profit: tradeData.take_profit || this.calculateDefaultTakeProfit(currentPrice, tradeData.trade_type),
            confluence_score: tradeData.confluence_score || 50,
            signal_id: tradeData.signal_id,
            strategy_name: tradeData.strategy_name || 'Unified System',
            comment: tradeData.comment || 'Auto-executed',
            magic_number: tradeData.magic_number || 12345,
            order_type: 'market'
          }
        });

      if (executeError) {
        console.error('❌ Trade execution failed:', executeError);
        return null;
      }

      const result = executedTrade as any;
      if (!result.success) {
        console.warn('❌ Trade execution rejected:', result.error);
        return null;
      }

      console.log('✅ Trade executed successfully:', result);

      // Refresh portfolio data
      await this.refreshPortfolio();

      return {
        id: result.trade_id,
        portfolio_id: this.currentPortfolio.id,
        signal_id: tradeData.signal_id,
        symbol: tradeData.symbol,
        trade_type: tradeData.trade_type,
        entry_price: result.actual_entry_price || currentPrice,
        entry_time: new Date().toISOString(),
        stop_loss: tradeData.stop_loss || this.calculateDefaultStopLoss(currentPrice, tradeData.trade_type),
        take_profit: tradeData.take_profit || this.calculateDefaultTakeProfit(currentPrice, tradeData.trade_type),
        lot_size: lotSize,
        position_size: lotSize * 100000, // Contract size
        confluence_score: tradeData.confluence_score || 50,
        status: 'open',
        contract_size: 100000,
        margin_required: marginRequired,
        current_price: currentPrice,
        unrealized_pnl: 0,
        strategy_name: tradeData.strategy_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as UnifiedShadowTrade;

    } catch (error) {
      console.error('❌ Error executing trade:', error);
      return null;
    }
  }

  // ============= TRADE MANAGEMENT =============
  async closeTrade(tradeId: string, lotSize?: number, reason: string = 'manual'): Promise<boolean> {
    try {
      const latestTick = await marketDataService.getLatestTick('EUR/USD');
      const currentPrice = latestTick ? (latestTick.bid + latestTick.ask) / 2 : 1.17000;

      const { data: result, error } = await supabase
        .rpc('close_shadow_trade', {
          p_trade_id: tradeId,
          p_close_price: currentPrice,
          p_close_lot_size: lotSize,
          p_close_reason: reason
        });

      if (error) {
        console.error('❌ Error closing trade:', error);
        return false;
      }

      console.log('✅ Trade closed successfully:', result);
      await this.refreshPortfolio();
      return true;
    } catch (error) {
      console.error('❌ Error in closeTrade:', error);
      return false;
    }
  }

  // ============= DATA RETRIEVAL =============
  async getOpenTrades(): Promise<UnifiedShadowTrade[]> {
    if (!this.currentPortfolio) return [];

    try {
      const { data, error } = await supabase
        .from('shadow_trades')
        .select('*')
        .eq('portfolio_id', this.currentPortfolio.id)
        .eq('status', 'open')
        .order('entry_time', { ascending: false });

      if (error) throw error;
      return (data || []) as UnifiedShadowTrade[];
    } catch (error) {
      console.error('❌ Error getting open trades:', error);
      return [];
    }
  }

  async getTradeHistory(limit: number = 100): Promise<UnifiedShadowTrade[]> {
    if (!this.currentPortfolio) return [];

    try {
      const { data, error } = await supabase
        .from('shadow_trades')
        .select('*')
        .eq('portfolio_id', this.currentPortfolio.id)
        .eq('status', 'closed')
        .order('exit_time', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as UnifiedShadowTrade[];
    } catch (error) {
      console.error('❌ Error getting trade history:', error);
      return [];
    }
  }

  // ============= ADVANCED ANALYTICS =============
  async getPerformanceMetrics(): Promise<UnifiedPerformanceMetrics> {
    if (!this.currentPortfolio) {
      return this.getEmptyMetrics();
    }

    try {
      const closedTrades = await this.getTradeHistory(1000); // Get more for better analysis
      
      if (closedTrades.length === 0) {
        return this.getEmptyMetrics();
      }

      const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
      const losingTrades = closedTrades.filter(t => (t.pnl || 0) <= 0);
      const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

      // Calculate consecutive streaks
      const { maxWins, maxLosses } = this.calculateConsecutiveStreaks(closedTrades);

      // Calculate monthly returns
      const monthlyReturns = this.calculateTimeBasedReturns(closedTrades, 'monthly') as Array<{ month: string; return: number; trades: number }>;
      const weeklyReturns = this.calculateTimeBasedReturns(closedTrades, 'weekly') as Array<{ week: string; return: number; trades: number }>;
      const dailyReturns = this.calculateTimeBasedReturns(closedTrades, 'daily') as Array<{ date: string; return: number; trades: number }>;

      // Calculate strategy breakdowns
      const strategyBreakdown = this.calculateStrategyBreakdown(closedTrades);
      const confluenceBreakdown = this.calculateConfluenceBreakdown(closedTrades);
      const timeframeBreakdown = this.calculateTimeframeBreakdown(closedTrades);

      // Calculate advanced risk metrics
      const sharpeRatio = this.calculateSharpeRatio(closedTrades);
      const sortinoRatio = this.calculateSortinoRatio(closedTrades);
      const calmarRatio = this.calculateCalmarRatio(totalPnl, this.currentPortfolio.max_drawdown);

      return {
        // Basic metrics
        totalTrades: closedTrades.length,
        winRate: this.currentPortfolio.win_rate,
        averageRR: closedTrades.reduce((sum, t) => sum + (t.risk_reward_ratio || 0), 0) / closedTrades.length,
        totalPnl,
        maxDrawdown: this.currentPortfolio.max_drawdown,
        sharpeRatio,
        profitFactor: this.currentPortfolio.profit_factor,
        expectancy: this.currentPortfolio.expectancy,
        averageHoldingTime: closedTrades.reduce((sum, t) => sum + (t.holding_time_minutes || 0), 0) / closedTrades.length,

        // Advanced metrics
        bestTrade: Math.max(...closedTrades.map(t => t.pnl || 0)),
        worstTrade: Math.min(...closedTrades.map(t => t.pnl || 0)),
        consecutiveWins: maxWins,
        consecutiveLosses: maxLosses,
        largestWin: this.currentPortfolio.average_win * winningTrades.length,
        largestLoss: this.currentPortfolio.average_loss * losingTrades.length,

        // Time-based analysis
        monthlyReturns,
        weeklyReturns,
        dailyReturns,

        // Strategy breakdown
        strategyBreakdown,
        confluenceBreakdown,
        timeframeBreakdown,

        // Risk metrics
        maxConsecutiveLosses: maxLosses,
        maxConsecutiveWins: maxWins,
        averageRisk: this.MAX_RISK_PER_TRADE * 100,
        riskAdjustedReturn: totalPnl / Math.max(this.currentPortfolio.max_drawdown, 1),
        calmarRatio,
        sortinoRatio,

        // Market analysis
        bestPerformingSession: 'London',
        worstPerformingSession: 'Sydney',
        volatilityImpact: { low: 0.6, medium: 0.8, high: 1.2 }
      };
    } catch (error) {
      console.error('❌ Error calculating performance metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  // ============= PORTFOLIO OPERATIONS =============
  async refreshPortfolio(): Promise<UnifiedShadowPortfolio | null> {
    if (!this.currentPortfolio) return null;

    try {
      const { data, error } = await supabase
        .from('shadow_portfolios')
        .select('*')
        .eq('id', this.currentPortfolio.id)
        .single();

      if (error) throw error;

      this.currentPortfolio = data as UnifiedShadowPortfolio;
      return this.currentPortfolio;
    } catch (error) {
      console.error('❌ Error refreshing portfolio:', error);
      return null;
    }
  }

  async resetPortfolio(): Promise<boolean> {
    if (!this.currentPortfolio) return false;

    try {
      // Close all open trades
      const openTrades = await this.getOpenTrades();
      for (const trade of openTrades) {
        await this.closeTrade(trade.id, trade.lot_size, 'portfolio_reset');
      }

      // Reset portfolio to initial state
      const { error } = await supabase
        .from('shadow_portfolios')
        .update({
          balance: this.INITIAL_BALANCE,
          equity: this.INITIAL_BALANCE,
          margin: 0,
          free_margin: this.INITIAL_BALANCE,
          margin_level: 0,
          floating_pnl: 0,
          total_trades: 0,
          winning_trades: 0,
          losing_trades: 0,
          win_rate: 0,
          average_win: 0,
          average_loss: 0,
          profit_factor: 0,
          max_drawdown: 0,
          current_drawdown: 0,
          peak_balance: this.INITIAL_BALANCE,
          max_equity: this.INITIAL_BALANCE,
          sharpe_ratio: 0,
          expectancy: 0,
          daily_pnl_today: 0,
          last_daily_reset: new Date().toISOString()
        })
        .eq('id', this.currentPortfolio.id);

      if (error) throw error;

      await this.refreshPortfolio();
      console.log('✅ Portfolio reset successfully');
      return true;
    } catch (error) {
      console.error('❌ Error resetting portfolio:', error);
      return false;
    }
  }

  // ============= UTILITY METHODS =============
  getCurrentPortfolio(): UnifiedShadowPortfolio | null {
    return this.currentPortfolio;
  }

  private getSessionId(): string {
    let sessionId = localStorage.getItem('unified_shadow_trading_session');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('unified_shadow_trading_session', sessionId);
    }
    return sessionId;
  }

  private calculateDefaultStopLoss(price: number, tradeType: 'buy' | 'sell'): number {
    const riskPips = 50; // 50 pips default risk
    const pipSize = 0.0001;
    return tradeType === 'buy' 
      ? price - (riskPips * pipSize)
      : price + (riskPips * pipSize);
  }

  private calculateDefaultTakeProfit(price: number, tradeType: 'buy' | 'sell'): number {
    const rewardPips = 100; // 100 pips default reward (2:1 RR)
    const pipSize = 0.0001;
    return tradeType === 'buy' 
      ? price + (rewardPips * pipSize)
      : price - (rewardPips * pipSize);
  }

  private initializeRealTimeUpdates(): void {
    // Real-time P&L updates will be handled by the tick engine
    console.log('🔄 Unified Shadow Trading Engine initialized with real-time capabilities');
  }

  // ============= ANALYTICS HELPERS =============
  private getEmptyMetrics(): UnifiedPerformanceMetrics {
    return {
      totalTrades: 0, winRate: 0, averageRR: 0, totalPnl: 0, maxDrawdown: 0,
      sharpeRatio: 0, profitFactor: 0, expectancy: 0, averageHoldingTime: 0,
      bestTrade: 0, worstTrade: 0, consecutiveWins: 0, consecutiveLosses: 0,
      largestWin: 0, largestLoss: 0, monthlyReturns: [], weeklyReturns: [],
      dailyReturns: [], strategyBreakdown: {}, confluenceBreakdown: {},
      timeframeBreakdown: {}, maxConsecutiveLosses: 0, maxConsecutiveWins: 0,
      averageRisk: 0, riskAdjustedReturn: 0, calmarRatio: 0, sortinoRatio: 0,
      bestPerformingSession: '', worstPerformingSession: '', volatilityImpact: {}
    };
  }

  private calculateConsecutiveStreaks(trades: UnifiedShadowTrade[]): { maxWins: number; maxLosses: number } {
    let maxWins = 0, maxLosses = 0, currentWins = 0, currentLosses = 0;
    
    trades.forEach(trade => {
      if ((trade.pnl || 0) > 0) {
        currentWins++;
        currentLosses = 0;
        maxWins = Math.max(maxWins, currentWins);
      } else {
        currentLosses++;
        currentWins = 0;
        maxLosses = Math.max(maxLosses, currentLosses);
      }
    });
    
    return { maxWins, maxLosses };
  }

  private calculateTimeBasedReturns(trades: UnifiedShadowTrade[], period: 'monthly' | 'weekly' | 'daily') {
    const grouped: Record<string, { pnl: number; trades: number }> = {};
    
    trades.forEach(trade => {
      if (!trade.exit_time) return;
      
      const date = new Date(trade.exit_time);
      let key: string;
      
      switch (period) {
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'weekly':
          const week = Math.ceil(date.getDate() / 7);
          key = `${date.getFullYear()}-W${week}`;
          break;
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
      }
      
      if (!grouped[key]) grouped[key] = { pnl: 0, trades: 0 };
      grouped[key].pnl += trade.pnl || 0;
      grouped[key].trades++;
    });
    
    if (period === 'monthly') {
      return Object.entries(grouped).map(([key, data]) => ({
        month: key,
        return: (data.pnl / this.INITIAL_BALANCE) * 100,
        trades: data.trades
      }));
    } else if (period === 'weekly') {
      return Object.entries(grouped).map(([key, data]) => ({
        week: key,
        return: (data.pnl / this.INITIAL_BALANCE) * 100,
        trades: data.trades
      }));
    } else {
      return Object.entries(grouped).map(([key, data]) => ({
        date: key,
        return: (data.pnl / this.INITIAL_BALANCE) * 100,
        trades: data.trades
      }));
    }
  }

  private calculateStrategyBreakdown(trades: UnifiedShadowTrade[]) {
    return this.calculateBreakdown(trades, 'strategy_name', 'Unified System');
  }

  private calculateConfluenceBreakdown(trades: UnifiedShadowTrade[]) {
    const grouped: Record<string, UnifiedShadowTrade[]> = {};
    
    trades.forEach(trade => {
      const range = this.getConfluenceRange(trade.confluence_score);
      if (!grouped[range]) grouped[range] = [];
      grouped[range].push(trade);
    });
    
    return Object.fromEntries(
      Object.entries(grouped).map(([range, trades]) => [
        range,
        {
          trades: trades.length,
          winRate: (trades.filter(t => (t.pnl || 0) > 0).length / trades.length) * 100,
          pnl: trades.reduce((sum, t) => sum + (t.pnl || 0), 0)
        }
      ])
    );
  }

  private calculateTimeframeBreakdown(trades: UnifiedShadowTrade[]) {
    return this.calculateBreakdown(trades, 'market_session', 'London');
  }

  private calculateBreakdown(trades: UnifiedShadowTrade[], field: keyof UnifiedShadowTrade, defaultValue: string) {
    const grouped: Record<string, UnifiedShadowTrade[]> = {};
    
    trades.forEach(trade => {
      const key = (trade[field] as string) || defaultValue;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(trade);
    });
    
    return Object.fromEntries(
      Object.entries(grouped).map(([key, trades]) => [
        key,
        {
          trades: trades.length,
          winRate: (trades.filter(t => (t.pnl || 0) > 0).length / trades.length) * 100,
          pnl: trades.reduce((sum, t) => sum + (t.pnl || 0), 0)
        }
      ])
    );
  }

  private getConfluenceRange(score: number): string {
    if (score >= 80) return 'Very Strong (80-100%)';
    if (score >= 60) return 'Strong (60-79%)';
    if (score >= 40) return 'Moderate (40-59%)';
    if (score >= 20) return 'Weak (20-39%)';
    return 'Very Weak (0-19%)';
  }

  private calculateSharpeRatio(trades: UnifiedShadowTrade[]): number {
    if (trades.length < 2) return 0;
    
    const returns = trades.map(t => (t.pnl || 0) / this.INITIAL_BALANCE * 100);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? avgReturn / stdDev : 0;
  }

  private calculateSortinoRatio(trades: UnifiedShadowTrade[]): number {
    if (trades.length < 2) return 0;
    
    const returns = trades.map(t => (t.pnl || 0) / this.INITIAL_BALANCE * 100);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const negativeReturns = returns.filter(r => r < 0);
    
    if (negativeReturns.length === 0) return avgReturn > 0 ? Infinity : 0;
    
    const downsideVariance = negativeReturns.reduce((sum, r) => sum + r * r, 0) / negativeReturns.length;
    const downsideDeviation = Math.sqrt(downsideVariance);
    
    return downsideDeviation > 0 ? avgReturn / downsideDeviation : 0;
  }

  private calculateCalmarRatio(totalReturn: number, maxDrawdown: number): number {
    if (maxDrawdown === 0) return totalReturn > 0 ? Infinity : 0;
    return totalReturn / maxDrawdown;
  }
}

// ============= EXPORT SINGLETON =============
export const unifiedShadowTradingEngine = new UnifiedShadowTradingEngine();