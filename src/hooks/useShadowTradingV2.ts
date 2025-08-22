import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ShadowPortfolio {
  id: string;
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  margin_level: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  average_win: number;
  average_loss: number;
  profit_factor: number;
  max_drawdown: number;
  sharpe_ratio: number;
  expectancy: number;
  is_active: boolean;
  auto_trading_enabled: boolean;
  max_open_positions: number;
  // MetaTrader-style fields
  account_currency: string;
  leverage: number;
  account_type: string;
  initial_deposit: number;
  deposits_total: number;
  withdrawals_total: number;
  daily_loss_limit: number;
  max_drawdown_limit: number;
  lot_size_type: string;
  custom_lot_multiplier: number;
  margin_call_level: number;
  stop_out_level: number;
  daily_pnl_today: number;
  last_daily_reset: string;
  created_at: string;
  updated_at: string;
}

export interface ShadowTrade {
  id: string;
  portfolio_id: string;
  signal_id?: string;
  symbol: string;
  trade_type: 'buy' | 'sell';
  entry_price: number;
  entry_time: string;
  stop_loss: number;
  take_profit: number;
  position_size: number;
  confluence_score: number;
  status: 'open' | 'closed';
  exit_price?: number;
  exit_time?: string;
  exit_reason?: 'tp' | 'sl' | 'time' | 'manual' | 'opposing_signal';
  pnl?: number;
  pnl_percent?: number;
  risk_reward_ratio?: number;
  holding_time_minutes?: number;
  // MetaTrader-style fields
  lot_size: number;
  pip_value?: number;
  pip_pnl?: number;
  margin_required?: number;
  contract_size: number;
  created_at: string;
  updated_at: string;
}

export interface TradingSignal {
  id: string;
  signal_id: string;
  pair: string;
  signal_type: 'buy' | 'sell' | 'neutral';
  confluence_score: number;
  strength: number;
  confidence: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  risk_reward_ratio: number;
  factors: any[];
  description: string;
  alert_level: 'low' | 'medium' | 'high' | 'extreme';
  was_executed: boolean;
  execution_reason?: string;
  created_at: string;
}

export interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  averageRR: number;
  totalPnl: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  expectancy: number;
  averageHoldingTime: number;
  bestTrade: number;
  worstTrade: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  monthlyReturns: Array<{ month: string; return: number; trades: number }>;
  strategyBreakdown: Record<string, { trades: number; winRate: number; pnl: number }>;
}

export const useShadowTradingV2 = () => {
  const [portfolio, setPortfolio] = useState<ShadowPortfolio | null>(null);
  const [openTrades, setOpenTrades] = useState<ShadowTrade[]>([]);
  const [closedTrades, setClosedTrades] = useState<ShadowTrade[]>([]);
  const [recentSignals, setRecentSignals] = useState<TradingSignal[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  // Generate or get session ID for anonymous users
  const getSessionId = useCallback(() => {
    let sessionId = localStorage.getItem('shadow_trading_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('shadow_trading_session_id', sessionId);
    }
    return sessionId;
  }, []);

  // Initialize or get portfolio
  const initializePortfolio = useCallback(async () => {
    try {
      const sessionId = getSessionId();
      
      // Try to get existing portfolio
      const { data: existingPortfolio, error: fetchError } = await supabase
        .from('shadow_portfolios')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // Not found error
        throw fetchError;
      }

      if (existingPortfolio) {
        setPortfolio(existingPortfolio as ShadowPortfolio);
        return existingPortfolio.id;
      }

      // Create new portfolio
      const { data: newPortfolio, error: createError } = await supabase
        .from('shadow_portfolios')
        .insert({
          session_id: sessionId,
          balance: 100000.00,
          equity: 100000.00
        })
        .select()
        .single();

      if (createError) throw createError;

      setPortfolio(newPortfolio);
      
      toast({
        title: "Portfolio Initialized",
        description: "New shadow trading portfolio created with $100,000 virtual balance",
      });

      return newPortfolio.id;
    } catch (error) {
      console.error('Error initializing portfolio:', error);
      toast({
        title: "Portfolio Error",
        description: "Failed to initialize shadow trading portfolio",
        variant: "destructive",
      });
      return null;
    }
  }, [getSessionId, toast]);

  // Load portfolio data
  const loadPortfolioData = useCallback(async (portfolioId: string) => {
    try {
      // Load open trades
      const { data: openTradesData, error: openTradesError } = await supabase
        .from('shadow_trades')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('status', 'open')
        .order('entry_time', { ascending: false });

      if (openTradesError) throw openTradesError;
      setOpenTrades((openTradesData || []) as ShadowTrade[]);

      // Load recent closed trades (last 100)
      const { data: closedTradesData, error: closedTradesError } = await supabase
        .from('shadow_trades')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('status', 'closed')
        .order('exit_time', { ascending: false })
        .limit(100);

      if (closedTradesError) throw closedTradesError;
      setClosedTrades((closedTradesData || []) as ShadowTrade[]);

    } catch (error) {
      console.error('Error loading portfolio data:', error);
    }
  }, []);

  // Load recent signals
  const loadRecentSignals = useCallback(async () => {
    try {
      const sessionId = getSessionId();
      const { data: signalsData, error: signalsError } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (signalsError) throw signalsError;
      setRecentSignals((signalsData || []) as TradingSignal[]);
    } catch (error) {
      console.error('Error loading signals:', error);
    }
  }, [getSessionId]);

  // Load current market price
  const loadCurrentPrice = useCallback(async () => {
    try {
      const { data: priceData, error: priceError } = await supabase
        .from('market_data_feed')
        .select('price')
        .eq('symbol', 'EUR/USD')
        .eq('timeframe', '15m')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (priceError) throw priceError;
      if (priceData) {
        setCurrentPrice(parseFloat(priceData.price.toString()));
      }
    } catch (error) {
      console.error('Error loading current price:', error);
    }
  }, []);

  // Toggle auto trading
  const toggleAutoTrading = useCallback(async () => {
    if (!portfolio) return;

    try {
      const newState = !portfolio.auto_trading_enabled;
      
      const { error } = await supabase
        .from('shadow_portfolios')
        .update({ auto_trading_enabled: newState })
        .eq('id', portfolio.id);

      if (error) throw error;

      setPortfolio(prev => prev ? { ...prev, auto_trading_enabled: newState } : null);
      
      toast({
        title: newState ? "Auto Trading Enabled" : "Auto Trading Disabled",
        description: newState 
          ? "Signals will be automatically executed in your shadow portfolio"
          : "Automatic signal execution has been paused",
      });
    } catch (error) {
      console.error('Error toggling auto trading:', error);
      toast({
        title: "Error",
        description: "Failed to toggle auto trading",
        variant: "destructive",
      });
    }
  }, [portfolio, toast]);

  // Reset portfolio
  const resetPortfolio = useCallback(async () => {
    if (!portfolio) return;

    try {
      // Close all open trades
      const { error: closeTradesError } = await supabase
        .from('shadow_trades')
        .update({ 
          status: 'closed',
          exit_reason: 'manual',
          exit_time: new Date().toISOString(),
          pnl: 0,
          pnl_percent: 0
        })
        .eq('portfolio_id', portfolio.id)
        .eq('status', 'open');

      if (closeTradesError) throw closeTradesError;

      // Reset portfolio to initial state
      const { error: resetError } = await supabase
        .from('shadow_portfolios')
        .update({
          balance: 100000.00,
          equity: 100000.00,
          margin: 0.00,
          free_margin: 100000.00,
          margin_level: 0.00,
          total_trades: 0,
          winning_trades: 0,
          losing_trades: 0,
          win_rate: 0.00,
          average_win: 0.00,
          average_loss: 0.00,
          profit_factor: 0.00,
          max_drawdown: 0.00,
          sharpe_ratio: 0.00,
          expectancy: 0.00,
        })
        .eq('id', portfolio.id);

      if (resetError) throw resetError;

      toast({
        title: "Portfolio Reset",
        description: "Shadow trading portfolio has been reset to initial state",
      });

      // Reload data
      await initializePortfolio();
      
    } catch (error) {
      console.error('Error resetting portfolio:', error);
      toast({
        title: "Reset Failed",
        description: "Failed to reset portfolio",
        variant: "destructive",
      });
    }
  }, [portfolio, toast, initializePortfolio]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!portfolio) return;

    console.log('🔔 Setting up real-time subscriptions...');

    // Subscribe to portfolio updates
    const portfolioChannel = supabase
      .channel('portfolio_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shadow_portfolios',
          filter: `id=eq.${portfolio.id}`,
        },
        (payload) => {
          console.log('📊 Portfolio updated:', payload.new);
          setPortfolio(payload.new as ShadowPortfolio);
        }
      )
      .subscribe();

    // Subscribe to trade updates
    const tradesChannel = supabase
      .channel('trades_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shadow_trades',
          filter: `portfolio_id=eq.${portfolio.id}`,
        },
        (payload) => {
          console.log('💼 Trade updated:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newTrade = payload.new as ShadowTrade;
            if (newTrade.status === 'open') {
              setOpenTrades(prev => [newTrade, ...prev]);
              toast({
                title: "Trade Executed",
                description: `${newTrade.trade_type.toUpperCase()} ${newTrade.symbol} @ ${newTrade.entry_price}`,
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedTrade = payload.new as ShadowTrade;
            
            if (updatedTrade.status === 'closed') {
              setOpenTrades(prev => prev.filter(t => t.id !== updatedTrade.id));
              setClosedTrades(prev => [updatedTrade, ...prev.slice(0, 99)]);
              
              const isWin = (updatedTrade.pnl || 0) > 0;
              toast({
                title: "Trade Closed",
                description: `${isWin ? 'WIN' : 'LOSS'} $${(updatedTrade.pnl || 0).toFixed(2)} (${updatedTrade.exit_reason?.toUpperCase()})`,
                variant: isWin ? "default" : "destructive",
              });
            } else {
              setOpenTrades(prev => prev.map(t => t.id === updatedTrade.id ? updatedTrade : t));
            }
          }
        }
      )
      .subscribe();

    // Subscribe to new signals
    const signalsChannel = supabase
      .channel('signals_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trading_signals'
        },
        (payload) => {
          console.log('🎯 New signal:', payload.new);
          const newSignal = payload.new as TradingSignal;
          setRecentSignals(prev => [newSignal, ...prev.slice(0, 19)]);
          
          if (newSignal.confluence_score >= 30) {
            toast({
              title: "High-Quality Signal",
              description: `${newSignal.signal_type.toUpperCase()} ${newSignal.pair} (Score: ${newSignal.confluence_score})`,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to market data updates
    const marketChannel = supabase
      .channel('market_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'market_data_feed',
          filter: `symbol=eq.EUR/USD`
        },
        (payload) => {
          const newData = payload.new as any;
          setCurrentPrice(parseFloat(newData.price.toString()));
        }
      )
      .subscribe();

    setIsConnected(true);

    return () => {
      console.log('🔕 Cleaning up subscriptions...');
      supabase.removeChannel(portfolioChannel);
      supabase.removeChannel(tradesChannel);
      supabase.removeChannel(signalsChannel);
      supabase.removeChannel(marketChannel);
      setIsConnected(false);
    };
  }, [portfolio?.id, toast]);

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      
      const portfolioId = await initializePortfolio();
      if (portfolioId) {
        await Promise.all([
          loadPortfolioData(portfolioId),
          loadRecentSignals(),
          loadCurrentPrice()
        ]);
      }
      
      setIsLoading(false);
    };

    initialize();
  }, [initializePortfolio, loadPortfolioData, loadRecentSignals, loadCurrentPrice]);

  // Calculate performance metrics
  const performanceMetrics: PerformanceMetrics = {
    totalTrades: closedTrades.length,
    winRate: portfolio?.win_rate || 0,
    averageRR: closedTrades.length > 0 
      ? closedTrades.reduce((sum, t) => sum + (t.risk_reward_ratio || 0), 0) / closedTrades.length 
      : 0,
    totalPnl: closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0),
    maxDrawdown: portfolio?.max_drawdown || 0,
    sharpeRatio: portfolio?.sharpe_ratio || 0,
    profitFactor: portfolio?.profit_factor || 0,
    expectancy: portfolio?.expectancy || 0,
    averageHoldingTime: closedTrades.length > 0
      ? closedTrades.reduce((sum, t) => sum + (t.holding_time_minutes || 0), 0) / closedTrades.length
      : 0,
    bestTrade: closedTrades.length > 0 ? Math.max(...closedTrades.map(t => t.pnl || 0)) : 0,
    worstTrade: closedTrades.length > 0 ? Math.min(...closedTrades.map(t => t.pnl || 0)) : 0,
    consecutiveWins: 0, // TODO: Calculate
    consecutiveLosses: 0, // TODO: Calculate
    monthlyReturns: [], // TODO: Calculate
    strategyBreakdown: {} // TODO: Calculate
  };

  return {
    portfolio,
    openTrades,
    closedTrades,
    recentSignals,
    performanceMetrics,
    currentPrice,
    isLoading,
    isConnected,
    toggleAutoTrading,
    resetPortfolio,
    refreshData: async () => {
      if (portfolio) {
        await Promise.all([
          loadPortfolioData(portfolio.id),
          loadRecentSignals(),
          loadCurrentPrice()
        ]);
      }
    }
  };
};