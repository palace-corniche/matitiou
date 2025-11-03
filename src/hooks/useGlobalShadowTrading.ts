import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  globalShadowTradingEngine,
  GlobalShadowTrade,
  GlobalTradingAccount,
  GlobalPerformanceMetrics,
  TradeExecutionRequest
} from '@/services/globalShadowTradingEngine';
import { unifiedMarketData, UnifiedTick } from '@/services/unifiedMarketData';

export interface UseGlobalShadowTrading {
  // State
  account: GlobalTradingAccount | null;
  openTrades: GlobalShadowTrade[];
  tradeHistory: any[];
  performanceMetrics: GlobalPerformanceMetrics | null;
  marketData: UnifiedTick | null;
  
  // Loading states
  isLoading: boolean;
  isExecutingTrade: boolean;
  isClosingTrade: boolean;
  isRefreshing: boolean;
  isResetting: boolean;
  error: string | null;
  
  // Actions
  executeTrade: (request: TradeExecutionRequest) => Promise<GlobalShadowTrade | null>;
  closeTrade: (tradeId: string, lotSize?: number, reason?: string) => Promise<boolean>;
  resetAccount: () => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Settings
  toggleAutoTrading: () => Promise<void>;
  updateMaxOpenTrades: (maxTrades: number) => Promise<void>;

  // Analytics Helpers
  calculateOptimalLotSize: (symbol: string, riskPercent: number, entryPrice: number, stopLoss: number) => Promise<number>;
  
  // Phase 4: Validation helpers
  validateResetCompletion: () => Promise<{
    success: boolean;
    message: string;
    errors: string[];
    stats: {
      tradesCount: number;
      historyCount: number;
      accountBalance: number;
    };
  }>;
}

export const useGlobalShadowTrading = (): UseGlobalShadowTrading => {
  // State Management
  const [account, setAccount] = useState<GlobalTradingAccount | null>(null);
  const [openTrades, setOpenTrades] = useState<GlobalShadowTrade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<GlobalPerformanceMetrics | null>(null);
  const [marketData, setMarketData] = useState<UnifiedTick | null>(null);
  
  // Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isExecutingTrade, setIsExecutingTrade] = useState(false);
  const [isClosingTrade, setIsClosingTrade] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Utility function for timeout handling
  const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
      })
    ]);
  };

  // Core Trading Actions
  const executeTrade = useCallback(async (request: TradeExecutionRequest): Promise<GlobalShadowTrade | null> => {
    if (isExecutingTrade) return null;
    
    setIsExecutingTrade(true);
    try {
      const result = await withTimeout(
        globalShadowTradingEngine.executeTrade(request),
        10000
      );
      
      if (result) {
        toast.success(`Trade executed: ${result.trade_type.toUpperCase()} ${result.lot_size} ${result.symbol}`);
        await refreshData();
      }
      
      return result;
    } catch (error) {
      console.error('Trade execution failed:', error);
      toast.error('Trade execution failed');
      return null;
    } finally {
      setIsExecutingTrade(false);
    }
  }, [isExecutingTrade]);

  const closeTrade = useCallback(async (tradeId: string, lotSize?: number, reason: string = 'manual'): Promise<boolean> => {
    if (isClosingTrade) return false;
    
    setIsClosingTrade(true);
    try {
      const success = await withTimeout(
        globalShadowTradingEngine.closeTrade(tradeId, lotSize, reason),
        10000
      );
      
      if (success) {
        toast.success('Trade closed successfully');
        await refreshData();
      } else {
        toast.error('Failed to close trade');
      }
      
      return success;
    } catch (error) {
      console.error('Trade close failed:', error);
      toast.error('Trade close failed');
      return false;
    } finally {
      setIsClosingTrade(false);
    }
  }, [isClosingTrade]);

  // Phase 3: Enhanced reset with explicit state clearing and validation
  const resetAccount = useCallback(async (): Promise<void> => {
    if (isResetting) return;
    
    setIsResetting(true);
    setError(null);
    
    try {
      // Step 1: Call the enhanced reset function
      const result = await withTimeout(
        globalShadowTradingEngine.resetAccount(),
        15000
      );
      
      // Step 2: Phase 4 - Validate reset was successful
      const validation = await validateResetCompletion();
      
      if (!validation.success) {
        throw new Error(`Reset validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Step 3: Force complete state clearing
      setAccount(null);
      setOpenTrades([]);
      setTradeHistory([]);
      setPerformanceMetrics(null);
      setMarketData(null);
      
      // Step 4: Refresh data to get clean initial state
      await refreshData();
      
      // Step 5: Comprehensive success feedback
      toast.success(`Account reset completed successfully! ${validation.message}`);
      
    } catch (error) {
      console.error('Account reset failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Reset failed: ${errorMessage}`);
      toast.error(`Reset failed: ${errorMessage}`);
    } finally {
      setIsResetting(false);
    }
  }, [isResetting]);

  // Phase 4: Data validation helper
  const validateResetCompletion = useCallback(async (): Promise<{
    success: boolean;
    message: string;
    errors: string[];
    stats: {
      tradesCount: number;
      historyCount: number;
      accountBalance: number;
    };
  }> => {
    try {
      const [trades, history, account] = await Promise.all([
        globalShadowTradingEngine.getOpenTrades(),
        globalShadowTradingEngine.getTradeHistory(10),
        globalShadowTradingEngine.getGlobalAccount()
      ]);
      
      const errors: string[] = [];
      
      // Validation checks
      if (trades.length > 0) {
        errors.push(`${trades.length} trades still exist`);
      }
      
      if (history.length > 0) {
        errors.push(`${history.length} history records still exist`);
      }
      
      if (account?.balance !== 100) {
        errors.push(`Account balance is ${account?.balance} instead of 100`);
      }
      
      if (account?.total_trades !== 0) {
        errors.push(`Total trades counter is ${account?.total_trades} instead of 0`);
      }
      
      const success = errors.length === 0;
      
      return {
        success,
        message: success ? 
          'All data cleared and account reset to initial state ($100 balance)' : 
          'Reset incomplete - validation failed',
        errors,
        stats: {
          tradesCount: trades.length,
          historyCount: history.length,
          accountBalance: account?.balance || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Validation check failed',
        errors: ['Unable to verify reset completion'],
        stats: {
          tradesCount: -1,
          historyCount: -1,
          accountBalance: -1
        }
      };
    }
  }, []);

  const refreshData = useCallback(async (): Promise<void> => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      const [accountData, openTradesData, historyData, metricsData] = await Promise.all([
        globalShadowTradingEngine.getGlobalAccount(),
        globalShadowTradingEngine.getOpenTrades(),
        globalShadowTradingEngine.getTradeHistory(200), // Increased from 50 to 200
        globalShadowTradingEngine.getPerformanceMetrics()
      ]);

      setAccount(accountData);
      setOpenTrades(openTradesData);
      setTradeHistory(historyData);
      setPerformanceMetrics(metricsData);
    } catch (error) {
      console.error('Data refresh failed:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  // Auto-trading toggle
  const toggleAutoTrading = useCallback(async (): Promise<void> => {
    if (!account) return;
    
    try {
      const { error } = await supabase
        .from('global_trading_account')
        .update({ 
          auto_trading_enabled: !account.auto_trading_enabled 
        })
        .eq('id', account.id);

      if (error) throw error;
      
      await refreshData();
      toast.success(`Auto-trading ${!account.auto_trading_enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle auto-trading:', error);
      toast.error('Failed to toggle auto-trading');
    }
  }, [account]);

  const updateMaxOpenTrades = useCallback(async (maxTrades: number): Promise<void> => {
    if (!account) return;
    
    try {
      const { error } = await supabase
        .from('global_trading_account')
        .update({ max_open_positions: maxTrades })
        .eq('id', account.id);

      if (error) throw error;
      
      await refreshData();
      toast.success(`Max open trades updated to ${maxTrades}`);
    } catch (error) {
      console.error('Failed to update max open trades:', error);
      toast.error('Failed to update max open trades');
    }
  }, [account]);

  // Analytics helpers
  const calculateOptimalLotSize = useCallback(async (symbol: string, riskPercent: number, entryPrice: number, stopLoss: number): Promise<number> => {
    try {
      return await globalShadowTradingEngine.calculateOptimalLotSize(symbol, riskPercent, entryPrice, stopLoss);
    } catch (error) {
      console.error('Lot size calculation failed:', error);
      return 0.01; // Default fallback
    }
  }, []);

  // Initialize trading engine and load data
  useEffect(() => {
    const initializeEngine = async () => {
      setIsLoading(true);
      try {
        await globalShadowTradingEngine.getGlobalAccount();
        await refreshData();
      } catch (error) {
        console.error('Failed to initialize trading engine:', error);
        setError('Failed to initialize trading system');
        toast.error('Failed to initialize trading system');
      } finally {
        setIsLoading(false);
      }
    };

    initializeEngine();
  }, []);

  // Subscribe to market data updates
  useEffect(() => {
    const handleMarketUpdate = (tick: UnifiedTick) => {
      setMarketData(tick);
    };

    const unsubscribe = unifiedMarketData.subscribe({
      onTick: handleMarketUpdate,
      onConnectionChange: () => {},
      onError: (error: Error) => {
        console.error('Unified market data error:', error);
      }
    });

    return () => {
      try { typeof unsubscribe === 'function' && unsubscribe(); } catch {}
    };
  }, []);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isRefreshing && !isExecutingTrade && !isClosingTrade) {
        refreshData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isRefreshing, isExecutingTrade, isClosingTrade]);

  return {
    // State
    account,
    openTrades,
    tradeHistory,
    performanceMetrics,
    marketData,
    
    // Loading states
    isLoading,
    isExecutingTrade,
    isClosingTrade,
    isRefreshing,
    isResetting,
    error,
    
    // Actions
    executeTrade,
    closeTrade,
    resetAccount,
    refreshData,
    
    // Settings
    toggleAutoTrading,
    updateMaxOpenTrades,
    
    // Analytics Helpers
    calculateOptimalLotSize,
    
    // Phase 4: Validation helpers
    validateResetCompletion
  };
};