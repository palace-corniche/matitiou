import { supabase } from '@/integrations/supabase/client';

export interface ShadowTrade {
  id: string;
  portfolio_id: string;
  symbol: string;
  trade_type: 'buy' | 'sell';
  lot_size: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  current_price?: number;
  unrealized_pnl: number;
  profit_pips: number;
  status: 'open' | 'closed';
  entry_time: string;
  exit_time?: string;
  exit_reason?: string;
  margin_required: number;
  contract_size: number;
}

export interface ShadowPortfolio {
  id: string;
  user_id?: string;
  session_id?: string;
  balance: number;
  equity: number;
  used_margin: number;
  free_margin: number;
  margin_level: number;
  floating_pnl: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  profit_factor: number;
  max_drawdown: number;
  peak_balance: number;
  created_at: string;
  updated_at: string;
}

class ShadowTradingEngineV2 {
  private currentPortfolio: ShadowPortfolio | null = null;

  async getOrCreatePortfolio(userId?: string, sessionId?: string): Promise<ShadowPortfolio> {
    try {
      // First try to get existing portfolio
      const { data: existingPortfolio, error: fetchError } = await supabase
        .from('shadow_portfolios')
        .select('*')
        .or(userId ? `user_id.eq.${userId}` : `session_id.eq.${sessionId}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingPortfolio && !fetchError) {
        this.currentPortfolio = existingPortfolio;
        return existingPortfolio;
      }

      // Create new portfolio
      const newPortfolio = {
        user_id: userId,
        session_id: sessionId,
        balance: 10000.00, // $10,000 starting balance
        equity: 10000.00,
        used_margin: 0.00,
        free_margin: 10000.00,
        margin_level: 0.00,
        floating_pnl: 0.00,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        win_rate: 0.00,
        profit_factor: 0.00,
        max_drawdown: 0.00,
        peak_balance: 10000.00,
        initial_deposit: 10000.00,
        currency: 'USD',
        leverage: 100,
        server: 'Demo-Server',
        account_type: 'demo'
      };

      const { data: createdPortfolio, error: createError } = await supabase
        .from('shadow_portfolios')
        .insert(newPortfolio)
        .select('*')
        .single();

      if (createError) throw createError;

      this.currentPortfolio = createdPortfolio;
      console.log('✅ Created new shadow portfolio:', createdPortfolio.id);
      return createdPortfolio;
    } catch (error) {
      console.error('❌ Error getting/creating portfolio:', error);
      throw error;
    }
  }

  async executeTrade(tradeData: {
    symbol: string;
    trade_type: 'buy' | 'sell';
    lot_size: number;
    entry_price: number;
    stop_loss: number;
    take_profit: number;
  }): Promise<ShadowTrade | null> {
    try {
      if (!this.currentPortfolio) {
        throw new Error('No active portfolio');
      }

      // Calculate required margin (EUR/USD: 100,000 contract size, 1:100 leverage)
      const contractSize = 100000;
      const leverageRatio = 100;
      const marginRequired = (tradeData.lot_size * contractSize * tradeData.entry_price) / leverageRatio;

      // Check if sufficient margin available
      if (marginRequired > this.currentPortfolio.free_margin) {
        throw new Error(`Insufficient margin. Required: $${marginRequired.toFixed(2)}, Available: $${this.currentPortfolio.free_margin.toFixed(2)}`);
      }

      // Create trade record using advanced order execution
      const { data: tradeResult, error: tradeError } = await supabase
        .rpc('execute_advanced_order', {
          p_portfolio_id: this.currentPortfolio.id,
          p_order_data: {
            symbol: tradeData.symbol,
            trade_type: tradeData.trade_type,
            lot_size: tradeData.lot_size,
            entry_price: tradeData.entry_price,
            stop_loss: tradeData.stop_loss,
            take_profit: tradeData.take_profit,
            order_type: 'market',
            comment: 'Shadow Trading V2'
          }
        });

      if (tradeError) {
        console.error('❌ Trade execution error:', tradeError);
        throw tradeError;
      }

      const result = tradeResult as any;
      if (!result?.success) {
        throw new Error(result?.error || 'Trade execution failed');
      }

      console.log('✅ Trade executed successfully:', result);

      // Refresh portfolio data
      await this.refreshPortfolio();

      // Get the created trade
      const { data: createdTrade, error: fetchError } = await supabase
        .from('shadow_trades')
        .select('*')
        .eq('id', result.trade_id)
        .single();

      if (fetchError) throw fetchError;

      return createdTrade as ShadowTrade;
    } catch (error) {
      console.error('❌ Error executing trade:', error);
      throw error;
    }
  }

  async closeTrade(tradeId: string, lotSize?: number, reason: string = 'manual'): Promise<boolean> {
    try {
      // Get current market price
      const { data: latestTick, error: tickError } = await supabase
        .from('tick_data')
        .select('bid, ask')
        .eq('symbol', 'EUR/USD')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (tickError || !latestTick) {
        throw new Error('Unable to get current market price');
      }

      // Get trade details
      const { data: trade, error: tradeError } = await supabase
        .from('shadow_trades')
        .select('*')
        .eq('id', tradeId)
        .single();

      if (tradeError || !trade) {
        throw new Error('Trade not found');
      }

      // Use appropriate close price based on trade type
      const closePrice = trade.trade_type === 'buy' ? latestTick.bid : latestTick.ask;

      // Close trade using database function
      const { data: closeResult, error: closeError } = await supabase
        .rpc('close_shadow_trade', {
          p_trade_id: tradeId,
          p_close_price: closePrice,
          p_close_lot_size: lotSize || trade.lot_size,
          p_close_reason: reason
        });

      if (closeError) {
        console.error('❌ Error closing trade:', closeError);
        throw closeError;
      }

      const result = closeResult as any;
      console.log('✅ Trade closed successfully:', result);

      // Refresh portfolio data
      await this.refreshPortfolio();

      return result?.success || false;
    } catch (error) {
      console.error('❌ Error closing trade:', error);
      throw error;
    }
  }

  async getOpenTrades(): Promise<ShadowTrade[]> {
    try {
      if (!this.currentPortfolio) return [];

      const { data: trades, error } = await supabase
        .from('shadow_trades')
        .select('*')
        .eq('portfolio_id', this.currentPortfolio.id)
        .eq('status', 'open')
        .order('entry_time', { ascending: false });

      if (error) throw error;
      return (trades || []) as ShadowTrade[];
    } catch (error) {
      console.error('❌ Error getting open trades:', error);
      return [];
    }
  }

  async getTradeHistory(limit: number = 50): Promise<ShadowTrade[]> {
    try {
      if (!this.currentPortfolio) return [];

      const { data: trades, error } = await supabase
        .from('shadow_trades')
        .select('*')
        .eq('portfolio_id', this.currentPortfolio.id)
        .eq('status', 'closed')
        .order('exit_time', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (trades || []) as ShadowTrade[];
    } catch (error) {
      console.error('❌ Error getting trade history:', error);
      return [];
    }
  }

  async refreshPortfolio(): Promise<ShadowPortfolio | null> {
    try {
      if (!this.currentPortfolio) return null;

      const { data: portfolio, error } = await supabase
        .from('shadow_portfolios')
        .select('*')
        .eq('id', this.currentPortfolio.id)
        .single();

      if (error) throw error;

      this.currentPortfolio = portfolio;
      return portfolio;
    } catch (error) {
      console.error('❌ Error refreshing portfolio:', error);
      return null;
    }
  }

  async resetPortfolio(): Promise<boolean> {
    try {
      if (!this.currentPortfolio) return false;

      // Close all open trades first
      const openTrades = await this.getOpenTrades();
      for (const trade of openTrades) {
        await this.closeTrade(trade.id, undefined, 'portfolio_reset');
      }

      // Reset portfolio to initial state
      const { error } = await supabase
        .from('shadow_portfolios')
        .update({
          balance: 10000.00,
          equity: 10000.00,
          used_margin: 0.00,
          free_margin: 10000.00,
          margin_level: 0.00,
          floating_pnl: 0.00,
          total_trades: 0,
          winning_trades: 0,
          losing_trades: 0,
          win_rate: 0.00,
          profit_factor: 0.00,
          max_drawdown: 0.00,
          peak_balance: 10000.00,
          updated_at: new Date().toISOString()
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

  getCurrentPortfolio(): ShadowPortfolio | null {
    return this.currentPortfolio;
  }
}

export const shadowTradingEngineV2 = new ShadowTradingEngineV2();