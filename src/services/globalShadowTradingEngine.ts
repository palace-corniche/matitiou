// Global Shadow Trading Engine - Simplified
import { supabase } from '@/integrations/supabase/client';
import { unifiedMarketData } from '@/services/unifiedMarketData';

// Simplified interfaces for global system
export interface GlobalShadowTrade {
  id: string;
  symbol: string;
  trade_type: 'buy' | 'sell';
  entry_price: number;
  entry_time: string;
  stop_loss: number;
  take_profit: number;
  lot_size: number;
  position_size: number;
  status: 'open' | 'closed';
  exit_price?: number;
  exit_time?: string;
  exit_reason?: string;
  pnl?: number;
  profit_pips?: number;
  current_price?: number;
  unrealized_pnl?: number;
  contract_size: number;
  commission?: number;
  swap?: number;
  created_at: string;
  updated_at: string;
}

export interface GlobalTradingAccount {
  id: string;
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  used_margin: number;
  margin_level: number;
  floating_pnl: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  average_win: number;
  average_loss: number;
  profit_factor: number;
  max_drawdown: number;
  sharpe_ratio: number;
  peak_balance: number;
  max_equity: number;
  current_drawdown: number;
  consecutive_wins: number;
  consecutive_losses: number;
  largest_win: number;
  largest_loss: number;
  total_commission: number;
  total_swap: number;
  max_open_positions: number;
  auto_trading_enabled: boolean;
  leverage: number;
  created_at: string;
  updated_at: string;
}

export interface TradeExecutionRequest {
  symbol: string;
  trade_type: 'buy' | 'sell';
  lot_size: number;
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
  comment?: string;
  magic_number?: number;
  master_signal_id?: string; // REQUIRED for market orders
}

export interface GlobalPerformanceMetrics {
  accountBalance: number;
  accountEquity: number;
  floatingPnL: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  largestWin: number;
  largestLoss: number;
  openTradesCount: number;
  totalVolume: number;
  averageTradeSize: number;
  bestDay: number;
  worstDay: number;
  tradingDays: number;
  averageTradeDuration: number;
  monthlyReturns: Array<{ month: string; return: number; trades: number }>;
  weeklyReturns: Array<{ week: string; return: number; trades: number }>;
  dailyReturns: Array<{ date: string; return: number; trades: number }>;
  hourlyBreakdown: Record<string, { trades: number; winRate: number; pnl: number }>;
  sessionBreakdown: Record<string, { trades: number; winRate: number; pnl: number }>;
}

class GlobalShadowTradingEngine {
  private currentAccount: GlobalTradingAccount | null = null;
  private readonly DEFAULT_LOT_SIZE = 0.01;
  private readonly GLOBAL_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';

  constructor() {
    this.initializeRealTimeUpdates();
  }

  private initializeRealTimeUpdates() {
    // Subscribe to market data updates
    const handleMarketUpdate = (tick: any) => {
      this.updateRealTimePnL(tick);
    };

    unifiedMarketData.subscribe({
      onTick: handleMarketUpdate,
      onConnectionChange: () => {},
      onError: (error: Error) => {
        console.error('Unified market data error:', error);
      }
    });
  }

  // Global Account Management
  async getGlobalAccount(): Promise<GlobalTradingAccount> {
    try {
      const { data, error } = await supabase.rpc('get_global_trading_account');

      if (error) {
        throw new Error(`Failed to fetch global account: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('Global trading account not found');
      }

      this.currentAccount = data[0] as GlobalTradingAccount;
      return this.currentAccount;
    } catch (error) {
      console.error('Global account error:', error);
      throw error;
    }
  }

  async refreshAccount(): Promise<GlobalTradingAccount> {
    const { data, error } = await supabase.rpc('get_global_trading_account');

    if (error) {
      throw new Error(`Failed to refresh account: ${error.message}`);
    }

    this.currentAccount = data[0] as GlobalTradingAccount;
    return this.currentAccount;
  }

  async resetAccount(): Promise<void> {
    try {
      const { error } = await supabase.rpc('reset_global_trading_account');

      if (error) {
        throw new Error(`Failed to reset account: ${error.message}`);
      }

      // Refresh account after reset
      await this.refreshAccount();
    } catch (error) {
      console.error('Account reset error:', error);
      throw error;
    }
  }

  // Trade Execution
  async executeTrade(request: TradeExecutionRequest): Promise<GlobalShadowTrade> {
    try {
      if (!this.currentAccount) {
        await this.getGlobalAccount();
      }

      // CRITICAL VALIDATION: Require master_signal_id for market orders
      if (!request.master_signal_id) {
        throw new Error('Trade execution requires master_signal_id - cannot execute orphaned trades');
      }

      // Get current market price from market_data_feed (REAL prices)
      let currentPrice = request.entry_price;
      if (!currentPrice) {
        const { data: freshPrice, error } = await supabase
          .from('market_data_feed')
          .select('price, timestamp')
          .eq('symbol', request.symbol)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();
        
        if (!freshPrice || error) {
          throw new Error(`No live price data available for ${request.symbol}`);
        }
        
        const priceAge = Date.now() - new Date(freshPrice.timestamp).getTime();
        if (priceAge > 900000) { // 15 minutes
          throw new Error(`Price data too old (${Math.round(priceAge/60000)} minutes)`);
        }
        
        const spread = 0.00015; // 1.5 pips
        currentPrice = request.trade_type === 'buy' 
          ? parseFloat(String(freshPrice.price)) + (spread / 2)  // ASK
          : parseFloat(String(freshPrice.price)) - (spread / 2); // BID
      }
      
      // Validate price is realistic
      if (request.symbol === 'EUR/USD' && (currentPrice < 0.9 || currentPrice > 2.0)) {
        throw new Error(`Invalid ${request.symbol} price: ${currentPrice}`);
      }

      const orderData = {
        symbol: request.symbol,
        trade_type: request.trade_type,
        lot_size: request.lot_size || this.DEFAULT_LOT_SIZE,
        entry_price: currentPrice,
        stop_loss: request.stop_loss || this.calculateDefaultStopLoss(currentPrice, request.trade_type),
        take_profit: request.take_profit || this.calculateDefaultTakeProfit(currentPrice, request.trade_type),
        comment: request.comment || 'Global Trading',
        magic_number: request.magic_number || 12345,
        order_type: 'market',
        master_signal_id: request.master_signal_id  // Pass signal ID to DB function
      };

      const { data, error } = await supabase.rpc('execute_advanced_order', {
        p_portfolio_id: this.GLOBAL_ACCOUNT_ID,
        p_order_data: orderData
      });

      if (error) {
        throw new Error(`Trade execution failed: ${error.message}`);
      }

      const result = data as any;
      if (!result.success) {
        throw new Error(`Trade execution rejected: ${result.error}`);
      }

      // Refresh account data
      await this.refreshAccount();

      // Return the executed trade
      const { data: tradeData } = await supabase
        .from('shadow_trades')
        .select('*')
        .eq('id', result.trade_id)
        .single();

      return tradeData as GlobalShadowTrade;
    } catch (error) {
      console.error('Trade execution error:', error);
      throw error;
    }
  }

  async closeTrade(tradeId: string, lotSize?: number, reason: string = 'manual'): Promise<boolean> {
    try {
      // Get current price from market_data_feed
      const { data: freshPrice } = await supabase
        .from('market_data_feed')
        .select('price')
        .eq('symbol', 'EUR/USD')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();
      
      const currentPrice = freshPrice ? parseFloat(String(freshPrice.price)) : 1.15661;

      // Use direct RPC call instead of edge function
      const { data, error } = await supabase.rpc('close_shadow_trade', {
        p_trade_id: tradeId,
        p_close_price: currentPrice,
        p_close_lot_size: lotSize,
        p_close_reason: reason
      });

      if (error) {
        console.error('Error closing trade:', error);
        return false;
      }

      if (!(data as any)?.success) {
        console.error('Trade close failed:', (data as any)?.error || 'Unknown error');
        return false;
      }

      // Refresh account data after successful trade closure
      await this.refreshAccount();
      return true;
    } catch (error) {
      console.error('Error in closeTrade:', error);
      return false;
    }
  }

  // Trade Data Retrieval
  async getOpenTrades(): Promise<GlobalShadowTrade[]> {
    try {
      const { data, error } = await supabase
        .from('shadow_trades')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch open trades: ${error.message}`);
      }

      return data as GlobalShadowTrade[];
    } catch (error) {
      console.error('Open trades fetch error:', error);
      throw error;
    }
  }

  async getTradeHistory(limit: number = 200): Promise<GlobalShadowTrade[]> {
    try {
      const { data, error } = await supabase
        .from('shadow_trades')
        .select('*')
        .eq('status', 'closed')
        .order('exit_time', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch trade history: ${error.message}`);
      }

      return data as GlobalShadowTrade[];
    } catch (error) {
      console.error('Trade history fetch error:', error);
      throw error;
    }
  }

  // Performance Metrics
  async getPerformanceMetrics(): Promise<GlobalPerformanceMetrics> {
    try {
      if (!this.currentAccount) {
        await this.getGlobalAccount();
      }

      const openTrades = await this.getOpenTrades();
      const tradeHistory = await this.getTradeHistory(1000);

      return {
        accountBalance: this.currentAccount!.balance,
        accountEquity: this.currentAccount!.equity,
        floatingPnL: this.currentAccount!.floating_pnl || 0,
        margin: this.currentAccount!.margin || 0,
        freeMargin: this.currentAccount!.free_margin || 0,
        marginLevel: this.currentAccount!.margin_level || 0,
        totalTrades: this.currentAccount!.total_trades || 0,
        winningTrades: this.currentAccount!.winning_trades || 0,
        losingTrades: this.currentAccount!.losing_trades || 0,
        winRate: this.currentAccount!.win_rate || 0,
        averageWin: this.currentAccount!.average_win || 0,
        averageLoss: this.currentAccount!.average_loss || 0,
        profitFactor: this.currentAccount!.profit_factor || 0,
        sharpeRatio: this.currentAccount!.sharpe_ratio || 0,
        maxDrawdown: this.currentAccount!.max_drawdown || 0,
        currentDrawdown: this.currentAccount!.current_drawdown || 0,
        consecutiveWins: this.currentAccount!.consecutive_wins || 0,
        consecutiveLosses: this.currentAccount!.consecutive_losses || 0,
        largestWin: this.currentAccount!.largest_win || 0,
        largestLoss: this.currentAccount!.largest_loss || 0,
        openTradesCount: openTrades.length,
        totalVolume: openTrades.reduce((sum, trade) => sum + trade.lot_size, 0),
        averageTradeSize: openTrades.length > 0 ? openTrades.reduce((sum, trade) => sum + trade.lot_size, 0) / openTrades.length : 0,
        bestDay: 0, // Simplified
        worstDay: 0, // Simplified
        tradingDays: 0, // Simplified
        averageTradeDuration: 0, // Simplified
        monthlyReturns: [],
        weeklyReturns: [],
        dailyReturns: [],
        hourlyBreakdown: {},
        sessionBreakdown: {}
      };
    } catch (error) {
      console.error('Performance metrics error:', error);
      throw error;
    }
  }

  // Helper methods
  private calculateDefaultStopLoss(entryPrice: number, tradeType: 'buy' | 'sell'): number {
    const stopDistance = entryPrice * 0.001; // 0.1% stop loss
    return tradeType === 'buy' ? entryPrice - stopDistance : entryPrice + stopDistance;
  }

  private calculateDefaultTakeProfit(entryPrice: number, tradeType: 'buy' | 'sell'): number {
    const tpDistance = entryPrice * 0.002; // 0.2% take profit
    return tradeType === 'buy' ? entryPrice + tpDistance : entryPrice - tpDistance;
  }

  private async updateRealTimePnL(tick: any) {
    // Note: This functionality is disabled as the edge function doesn't support update_real_time_pnl action
    // Real-time P&L updates are handled by the database function instead
    console.log('Real-time P&L update skipped - using database function instead');
  }

  // Analytics helpers
  async calculateOptimalLotSize(symbol: string, riskPercent: number, entryPrice: number, stopLoss: number): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('calculate_optimal_lot_size', {
        p_portfolio_id: this.GLOBAL_ACCOUNT_ID,
        p_symbol: symbol,
        p_risk_percentage: riskPercent,
        p_entry_price: entryPrice,
        p_stop_loss: stopLoss
      });

      if (error) throw error;
      return (data as any)?.optimal_lot_size || this.DEFAULT_LOT_SIZE;
    } catch (error) {
      console.error('Lot size calculation error:', error);
      return this.DEFAULT_LOT_SIZE;
    }
  }
}

export const globalShadowTradingEngine = new GlobalShadowTradingEngine();