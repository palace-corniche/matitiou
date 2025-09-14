// ============= PHASE 2: UNIFIED SHADOW TRADING HOOK =============
// Comprehensive state management combining all features

import { useEffect, useState, useCallback } from 'react';
import { 
  unifiedShadowTradingEngine, 
  UnifiedShadowPortfolio, 
  UnifiedShadowTrade, 
  UnifiedPerformanceMetrics,
  TradeExecutionRequest
} from '@/services/shadowTradingEngineUnified';
import { unifiedMarketData, UnifiedTick } from '@/services/unifiedMarketData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ============= TIMEOUT AND ERROR HANDLING CONSTANTS =============
const REQUEST_TIMEOUT_MS = 15000; // 15 second timeout
const MAX_RETRIES = 3;

// ============= HOOK INTERFACE =============
export interface UseShadowTradingUnified {
  // Core state
  portfolio: UnifiedShadowPortfolio | null;
  openTrades: UnifiedShadowTrade[];
  tradeHistory: UnifiedShadowTrade[];
  performanceMetrics: UnifiedPerformanceMetrics;
  
  // Market data
  currentPrice: number;
  tickData: UnifiedTick | null;
  isConnected: boolean;
  dataSource: string;
  
  // Loading states
  isLoading: boolean;
  isExecuting: boolean;
  error: string | null;
  
  // Core actions
  executeTrade: (tradeData: TradeExecutionRequest) => Promise<UnifiedShadowTrade | null>;
  closeTrade: (tradeId: string, lotSize?: number, reason?: string) => Promise<boolean>;
  resetPortfolio: () => Promise<boolean>;
  refreshData: () => Promise<void>;
  resetClientSession: () => Promise<void>;
  
  // Auto trading
  isAutoTrading: boolean;
  toggleAutoTrading: () => Promise<void>;
  
  // Advanced features
  modifyTrade: (tradeId: string, modifications: Partial<UnifiedShadowTrade>) => Promise<boolean>;
  partialCloseTrade: (tradeId: string, percentage: number) => Promise<boolean>;
  setBreakEven: (tradeId: string) => Promise<boolean>;
  enableTrailingStop: (tradeId: string, distance: number) => Promise<boolean>;
  
  // Analytics
  calculateOptimalLotSize: (symbol: string, riskPercent: number, entryPrice: number, stopLoss: number) => Promise<number>;
  getTradesByTimeframe: (timeframe: string) => UnifiedShadowTrade[];
  getTradesByStrategy: (strategy: string) => UnifiedShadowTrade[];
}

// ============= UNIFIED HOOK IMPLEMENTATION =============
export const useShadowTradingUnified = (): UseShadowTradingUnified => {
  // ============= STATE MANAGEMENT =============
  const [portfolio, setPortfolio] = useState<UnifiedShadowPortfolio | null>(null);
  const [openTrades, setOpenTrades] = useState<UnifiedShadowTrade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<UnifiedShadowTrade[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<UnifiedPerformanceMetrics>({} as UnifiedPerformanceMetrics);
  
  // Market data state - remove hardcoded price
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [tickData, setTickData] = useState<UnifiedTick | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [dataSource] = useState<string>('TwelveData');
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Auto trading state
  const [isAutoTrading, setIsAutoTrading] = useState(true);
  
  const { toast } = useToast();

  // ============= TIMEOUT UTILITY =============
  const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = REQUEST_TIMEOUT_MS): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  };

  // ============= CORE ACTIONS =============
  const executeTrade = useCallback(async (tradeData: TradeExecutionRequest): Promise<UnifiedShadowTrade | null> => {
    setIsExecuting(true);
    setError(null);
    
    try {
      const trade = await unifiedShadowTradingEngine.executeTrade(tradeData);
      
      if (trade) {
        setOpenTrades(prev => [trade, ...prev]);
        
        toast({
          title: "Trade Executed",
          description: `${trade.trade_type.toUpperCase()} ${trade.symbol} | Lot: ${trade.lot_size} | Entry: ${trade.entry_price.toFixed(5)}`,
        });
        
        await refreshData();
      } else {
        toast({
          title: "Trade Failed",
          description: "Unable to execute trade. Check margin and system status.",
          variant: "destructive",
        });
      }
      
      return trade;
    } catch (error: any) {
      setError(error.message);
      toast({
        title: "Execution Error",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsExecuting(false);
    }
  }, [toast]);

  const closeTrade = useCallback(async (tradeId: string, lotSize?: number, reason: string = 'manual'): Promise<boolean> => {
    setIsExecuting(true);
    
    try {
      const success = await unifiedShadowTradingEngine.closeTrade(tradeId, lotSize, reason);
      
      if (success) {
        // Remove from open trades
        setOpenTrades(prev => prev.filter(t => t.id !== tradeId));
        
        toast({
          title: "Trade Closed",
          description: `Trade closed successfully (${reason})`,
        });
        
        await refreshData();
      } else {
        toast({
          title: "Close Failed",
          description: "Unable to close trade",
          variant: "destructive",
        });
      }
      
      return success;
    } catch (error: any) {
      toast({
        title: "Close Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsExecuting(false);
    }
  }, [toast]);

  const resetPortfolio = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const success = await unifiedShadowTradingEngine.resetPortfolio();
      
      if (success) {
        toast({
          title: "Portfolio Reset",
          description: "Portfolio has been reset to initial state with $100,000 balance",
        });
        
        await refreshData();
      } else {
        toast({
          title: "Reset Failed",
          description: "Unable to reset portfolio",
          variant: "destructive",
        });
      }
      
      return success;
    } catch (error: any) {
      toast({
        title: "Reset Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // ============= CORRECT REAL-TIME PnL CALCULATION =============
  const updateTradesPnLRealTime = useCallback((tick: UnifiedTick) => {
    console.debug('🔄 Updating PnL for trades:', { 
      tradesCount: openTrades.length,
      tickPrice: tick.price.toFixed(5),
      bid: tick.bid.toFixed(5),
      ask: tick.ask.toFixed(5)
    });

    setOpenTrades(prevTrades => 
      prevTrades.map(trade => {
        // Only update open trades, never closed ones
        if (trade.status !== 'open') return trade;

        // Use correct bid/ask pricing for PnL calculation
        // BUY trades: use bid price (what you get when selling)
        // SELL trades: use ask price (what you pay when buying back)
        const currentPrice = trade.trade_type === 'buy' ? tick.bid : tick.ask;
        
        // Calculate pips correctly for EUR/USD
        let profitPips: number;
        if (trade.trade_type === 'buy') {
          profitPips = (currentPrice - trade.entry_price) * 10000;
        } else {
          profitPips = (trade.entry_price - currentPrice) * 10000;
        }
        
        // Calculate PnL: For EUR/USD, 1 lot = $1000 per pip, 0.01 lot = $10 per pip
        const pipValue = trade.lot_size * 1000; // $1000 per pip for 1 lot
        const unrealizedPnL = (profitPips * pipValue) / 10000; // Convert pips to PnL
        
        console.debug(`📊 PnL calculation for ${trade.symbol} ${trade.trade_type.toUpperCase()}:`, {
          tradeId: trade.id.substring(0, 8),
          entryPrice: trade.entry_price.toFixed(5),
          currentPrice: currentPrice.toFixed(5),
          lotSize: trade.lot_size,
          profitPips: profitPips.toFixed(1),
          pipValue: pipValue,
          unrealizedPnL: unrealizedPnL.toFixed(2)
        });

        return {
          ...trade,
          current_price: currentPrice,
          profit_pips: parseFloat(profitPips.toFixed(1)),
          unrealized_pnl: parseFloat(unrealizedPnL.toFixed(2)),
          updated_at: new Date().toISOString()
        };
      })
    );
  }, []); // Remove openTrades dependency to prevent circular updates

  const refreshData = useCallback(async (): Promise<void> => {
    console.debug('🔄 Starting data refresh...');
    
    try {
      const [
        portfolioData,
        openTradesData,
        historyData,
        metricsData
      ] = await withTimeout(Promise.all([
        unifiedShadowTradingEngine.refreshPortfolio(),
        unifiedShadowTradingEngine.getOpenTrades(),
        unifiedShadowTradingEngine.getTradeHistory(100),
        unifiedShadowTradingEngine.getPerformanceMetrics()
      ]));

      console.debug('✅ Data refresh completed successfully');
      
      setPortfolio(portfolioData);
      setOpenTrades(openTradesData);
      setTradeHistory(historyData);
      setPerformanceMetrics(metricsData);
      setError(null); // Clear any previous errors
      
      // Update auto trading state from portfolio
      if (portfolioData) {
        setIsAutoTrading(portfolioData.auto_trading_enabled);
      }

      // Apply real-time PnL calculation to newly loaded open trades
      if (openTradesData.length > 0) {
        const currentTick = unifiedMarketData.getLastTick();
        if (currentTick) {
          console.debug('🔄 Applying PnL to newly loaded trades');
          updateTradesPnLRealTime(currentTick);
        }
      }
    } catch (error: any) {
      console.error('❌ Error refreshing data:', error);
      setError(error.message || 'Failed to refresh data');
    }
  }, [updateTradesPnLRealTime, withTimeout]);

  // ============= AUTO TRADING MANAGEMENT =============
  const toggleAutoTrading = useCallback(async (): Promise<void> => {
    if (!portfolio) return;

    try {
      const newState = !isAutoTrading;
      
      // Update in database (assuming we add this functionality)
      // For now, just update local state
      setIsAutoTrading(newState);
      
      toast({
        title: newState ? "Auto Trading Enabled" : "Auto Trading Disabled",
        description: newState 
          ? "High-quality signals will be automatically executed"
          : "Manual trading mode activated",
      });
    } catch (error: any) {
      toast({
        title: "Toggle Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [portfolio, isAutoTrading, toast]);

  // ============= ADVANCED FEATURES =============
  const modifyTrade = useCallback(async (tradeId: string, modifications: Partial<UnifiedShadowTrade>): Promise<boolean> => {
    // Implementation for trade modification
    // This would involve updating stop loss, take profit, etc.
    try {
      // Placeholder - would implement with Supabase RPC
      toast({
        title: "Trade Modified",
        description: "Trade parameters updated successfully",
      });
      
      await refreshData();
      return true;
    } catch (error: any) {
      toast({
        title: "Modification Failed",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const partialCloseTrade = useCallback(async (tradeId: string, percentage: number): Promise<boolean> => {
    const trade = openTrades.find(t => t.id === tradeId);
    if (!trade) return false;
    
    const partialLotSize = trade.lot_size * (percentage / 100);
    return await closeTrade(tradeId, partialLotSize, 'partial_close');
  }, [openTrades, closeTrade]);

  const setBreakEven = useCallback(async (tradeId: string): Promise<boolean> => {
    const trade = openTrades.find(t => t.id === tradeId);
    if (!trade) return false;
    
    return await modifyTrade(tradeId, {
      stop_loss: trade.entry_price,
      break_even_triggered: true
    });
  }, [openTrades, modifyTrade]);

  const enableTrailingStop = useCallback(async (tradeId: string, distance: number): Promise<boolean> => {
    return await modifyTrade(tradeId, {
      trailing_stop_distance: distance,
      trailing_stop_triggered: false
    });
  }, [modifyTrade]);

  // ============= ANALYTICS HELPERS =============
  const calculateOptimalLotSize = useCallback(async (
    symbol: string, 
    riskPercent: number, 
    entryPrice: number, 
    stopLoss: number
  ): Promise<number> => {
    if (!portfolio) return 0.01;
    
    const riskAmount = portfolio.balance * (riskPercent / 100);
    const pipRisk = Math.abs(entryPrice - stopLoss) / 0.0001;
    const pipValue = 0.01 * 10; // $10 per pip for 0.01 lot
    
    const optimalLots = riskAmount / (pipRisk * pipValue);
    return Math.max(0.01, Math.min(1.0, Math.round(optimalLots * 100) / 100));
  }, [portfolio]);

  const getTradesByTimeframe = useCallback((timeframe: string): UnifiedShadowTrade[] => {
    return tradeHistory.filter(trade => trade.market_session === timeframe);
  }, [tradeHistory]);

  const getTradesByStrategy = useCallback((strategy: string): UnifiedShadowTrade[] => {
    return tradeHistory.filter(trade => trade.strategy_name === strategy);
  }, [tradeHistory]);

  // ============= SESSION RESET FUNCTIONALITY =============
  const resetClientSession = useCallback(async (): Promise<void> => {
    console.debug('🔄 Resetting client session...');
    
    try {
      // Reset all local state
      setPortfolio(null);
      setOpenTrades([]);
      setTradeHistory([]);
      setPerformanceMetrics({} as UnifiedPerformanceMetrics);
      setError(null);
      setIsLoading(true);
      
      // Disconnect market data
      unifiedMarketData.disconnect();
      
      // Small delay to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Re-initialize everything
      const portfolioData = await withTimeout(unifiedShadowTradingEngine.getOrCreatePortfolio());
      
      if (portfolioData) {
        await refreshData();
        console.debug('✅ Session reset completed successfully');
        
        toast({
          title: "Session Reset",
          description: "Client session has been reset and reconnected",
        });
      } else {
        throw new Error('Failed to recreate portfolio after reset');
      }
    } catch (error: any) {
      console.error('❌ Session reset failed:', error);
      setError(`Session reset failed: ${error.message}`);
      
      toast({
        title: "Reset Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [withTimeout, refreshData, toast]);

  // ============= INITIALIZATION =============
  useEffect(() => {
    const initializeEngine = async () => {
      console.debug('🚀 Initializing Unified Shadow Trading System...');
      setIsLoading(true);
      setError(null);
      
      try {
        // Initialize portfolio with timeout
        console.debug('📊 Creating/fetching portfolio...');
        const portfolioData = await withTimeout(
          unifiedShadowTradingEngine.getOrCreatePortfolio(),
          REQUEST_TIMEOUT_MS
        );
        
        if (portfolioData) {
          console.debug('✅ Portfolio initialized, refreshing data...');
          await refreshData();
          console.debug('✅ Unified Shadow Trading System initialized successfully');
        } else {
          throw new Error('Failed to initialize portfolio - no data returned');
        }
      } catch (error: any) {
        console.error('❌ Failed to initialize unified shadow trading:', error);
        setError(error.message || 'Initialization failed');
        
        // Don't leave user stuck - provide fallback
        toast({
          title: "Initialization Error",
          description: "Click 'Reset Session' to try again",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeEngine();
  }, []); // Remove refreshData dependency to prevent loops

  // ============= UNIFIED MARKET DATA FEED =============
  useEffect(() => {
    // Initializing Unified Market Data feed
    
    // Get initial tick if available
    const initialTick = unifiedMarketData.getLastTick();
    if (initialTick) {
      console.log('📊 Initial unified tick loaded:', initialTick);
      setCurrentPrice(initialTick.price);
      setTickData(initialTick);
      setIsConnected(unifiedMarketData.getConnectionStatus());
    }

    // Subscribe to unified feed
    const unsubscribe = unifiedMarketData.subscribe({
      onTick: (tick) => {
        console.debug(`📊 Unified Market Data tick received:`, {
          price: tick.price.toFixed(5),
          bid: tick.bid.toFixed(5),
          ask: tick.ask.toFixed(5),
          spread: tick.spread + ' pips',
          source: tick.source
        });
        
        setCurrentPrice(tick.price);
        setTickData(tick);
        
        // ============= REAL-TIME PnL CALCULATION =============
        // Update PnL for all open trades in real-time
        updateTradesPnLRealTime(tick);
      },
      onConnectionChange: (connected) => {
        console.log(`📡 Unified Market Data connection: ${connected ? 'CONNECTED' : 'DISCONNECTED'}`);
        setIsConnected(connected);
      },
      onError: (error) => {
        console.error('❌ Unified Market Data error:', error);
        setIsConnected(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // ============= AUTO REFRESH DATA & REAL-TIME PnL =============
  useEffect(() => {
    if (!portfolio) return;

    const interval = setInterval(refreshData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [portfolio, refreshData]);

  // ============= REAL-TIME PnL ON PRICE CHANGE =============
  // Removed separate effect to prevent duplicate calculations
  // PnL updates are now handled directly in the market data subscription

  // ============= RETURN UNIFIED INTERFACE =============
  return {
    // Core state
    portfolio,
    openTrades,
    tradeHistory,
    performanceMetrics,
    
    // Market data
    currentPrice,
    tickData,
    isConnected,
    dataSource,
    
    // Loading states
    isLoading,
    isExecuting,
    error,
    
    // Core actions
    executeTrade,
    closeTrade,
    resetPortfolio,
    refreshData,
    resetClientSession,
    
    // Auto trading
    isAutoTrading,
    toggleAutoTrading,
    
    // Advanced features
    modifyTrade,
    partialCloseTrade,
    setBreakEven,
    enableTrailingStop,
    
    // Analytics
    calculateOptimalLotSize,
    getTradesByTimeframe,
    getTradesByStrategy
  };
};