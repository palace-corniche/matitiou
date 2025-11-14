import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { marketDataService, TickData } from '@/services/realTimeMarketData';
import { toast } from 'sonner';

interface Trade {
  id: string;
  symbol: string;
  trade_type: 'buy' | 'sell';
  lot_size: number;
  entry_price: number;
  current_price?: number;
  stop_loss: number;
  take_profit: number;
  unrealized_pnl?: number;
  profit_pips?: number;
  status: string;
  portfolio_id: string;
}

interface Portfolio {
  id: string;
  balance: number;
  equity: number;
  floating_pnl: number;
  free_margin: number;
  margin_level: number;
}

export const usePhase3Trading = () => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [currentTick, setCurrentTick] = useState<TickData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize portfolio
  const initializePortfolio = useCallback(async () => {
    try {
      let sessionId = localStorage.getItem('phase3_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('phase3_session_id', sessionId);
      }

      const { data, error } = await supabase.rpc('get_global_trading_account');

      if (error) throw error;
      const account = Array.isArray(data) ? data[0] : data;
      if (account) {
        setPortfolio(account as any);
        return (account as any).id;
      }
      return null;
    } catch (error) {
      console.error('Portfolio initialization error:', error);
      toast.error('Failed to initialize portfolio');
      return null;
    }
  }, []);

  // Load open trades
  const loadOpenTrades = useCallback(async (portfolioId: string) => {
    try {
      const { data, error } = await supabase
        .from('shadow_trades')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('status', 'open')
        .order('entry_time', { ascending: false });

      if (error) throw error;
      setOpenTrades((data || []) as Trade[]);
    } catch (error) {
      console.error('Error loading trades:', error);
    }
  }, []);

  // Execute market order with Phase 3 precision
  const executeMarketOrder = useCallback(async (orderData: {
    symbol: string;
    tradeType: 'buy' | 'sell';
    lotSize: number;
    stopLoss?: number;
    takeProfit?: number;
    comment?: string;
  }) => {
    if (!portfolio || !currentTick) {
      toast.error('Portfolio or market data not available');
      return false;
    }

    try {
      const entryPrice = orderData.tradeType === 'buy' ? currentTick.ask : currentTick.bid;
      
      const response = await supabase.functions.invoke('enhanced-trading', {
        body: {
          action: 'execute_market_order',
          portfolioId: portfolio.id,
          symbol: orderData.symbol,
          tradeType: orderData.tradeType,
          lotSize: orderData.lotSize,
          entryPrice: entryPrice,
          stopLoss: orderData.stopLoss,
          takeProfit: orderData.takeProfit,
          comment: orderData.comment || '',
          spreadApplied: currentTick.spread
        }
      });

      if (response.data?.success) {
        toast.success(`${orderData.tradeType.toUpperCase()} order executed at ${entryPrice.toFixed(5)}`);
        return true;
      } else {
        throw new Error(response.data?.error || 'Order execution failed');
      }
    } catch (error) {
      console.error('Order execution error:', error);
      toast.error('Failed to execute order');
      return false;
    }
  }, [portfolio, currentTick]);

  // Close trade with immediate P&L realization
  const closeTrade = useCallback(async (tradeId: string, lotSize?: number) => {
    if (!currentTick) {
      toast.error('Market data not available');
      return false;
    }

    try {
      const response = await supabase.functions.invoke('enhanced-trading', {
        body: {
          action: 'close_trade',
          tradeId: tradeId,
          closePrice: currentTick.bid, // Use bid price for closing
          lotSize: lotSize,
          reason: 'manual'
        }
      });

      if (response.data?.success) {
        const trade = response.data.trade;
        const pnl = response.data.profit || 0;
        toast.success(`Trade closed: ${pnl > 0 ? 'PROFIT' : 'LOSS'} $${Math.abs(pnl).toFixed(2)}`);
        return true;
      } else {
        throw new Error(response.data?.error || 'Trade close failed');
      }
    } catch (error) {
      console.error('Trade close error:', error);
      toast.error('Failed to close trade');
      return false;
    }
  }, [currentTick]);

  // Calculate real-time P&L
  const calculateRealtimePnL = useCallback((trade: Trade, tick: TickData) => {
    return marketDataService.calculatePnL(
      trade.trade_type,
      trade.entry_price,
      tick,
      trade.lot_size
    );
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    let mounted = true;
    let portfolioId: string | null = null;

    const initialize = async () => {
      setIsLoading(true);
      portfolioId = await initializePortfolio();
      if (portfolioId && mounted) {
        await loadOpenTrades(portfolioId);
      }
      if (mounted) {
        setIsLoading(false);
      }
    };

    initialize();

    // Subscribe to market data
    const unsubscribeMarketData = marketDataService.subscribe({
      onTick: (tick: TickData) => {
        if (mounted) {
          const startTime = Date.now();
          setCurrentTick(tick);
          setIsConnected(true);
          setLatency(Date.now() - startTime);
        }
      },
      onError: (error: Error) => {
        console.error('Market data error:', error);
        if (mounted) {
          setIsConnected(false);
        }
      }
    });

    // Subscribe to portfolio updates (global account)
    const portfolioChannel = supabase
      .channel('phase3_portfolio_updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'global_trading_account',
        filter: 'id=eq.00000000-0000-0000-0000-000000000001'
      }, (payload) => {
        console.log('💰 Balance update received:', payload);
        if (mounted) {
          setPortfolio(payload.new as Portfolio);
          toast.success('Balance updated automatically');
        }
      })
      .subscribe();

    // Subscribe to trade updates
    const tradesChannel = supabase
      .channel('phase3_trades_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shadow_trades'
      }, async (payload) => {
        if (!mounted) return;
        
        const newRecord = payload.new as any;
        const oldRecord = payload.old as any;
        
        // Auto-refresh on any trade change
        if (portfolioId) {
          await loadOpenTrades(portfolioId);
        }
        
        // Show notification for closed trades
        if (payload.eventType === 'UPDATE' && newRecord?.status === 'closed' && oldRecord?.status === 'open') {
          const pnl = newRecord.pnl || 0;
          const symbol = newRecord.symbol;
          const pips = newRecord.profit_pips || 0;
          
          if (pnl > 0) {
            toast.success(`✅ ${symbol}: +$${pnl.toFixed(2)} (${pips.toFixed(1)} pips)`);
          } else {
            toast.error(`❌ ${symbol}: -$${Math.abs(pnl).toFixed(2)} (${pips.toFixed(1)} pips)`);
          }
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      unsubscribeMarketData();
      supabase.removeChannel(portfolioChannel);
      supabase.removeChannel(tradesChannel);
    };
  }, [initializePortfolio, loadOpenTrades]);

  return {
    // State
    portfolio,
    openTrades,
    currentTick,
    isConnected,
    latency,
    isLoading,

    // Actions
    executeMarketOrder,
    closeTrade,
    calculateRealtimePnL,

    // Utilities
    refreshData: () => {
      if (portfolio) {
        loadOpenTrades(portfolio.id);
      }
    }
  };
};