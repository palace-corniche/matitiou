import { useState, useEffect, useCallback } from 'react';
import { shadowTradingEngineV2, type ShadowTrade, type ShadowPortfolio } from '@/services/shadowTradingEngineV2';
import { marketDataService } from '@/services/realTimeMarketData';

interface UseShadowTradingV3 {
  portfolio: ShadowPortfolio | null;
  openTrades: ShadowTrade[];
  tradeHistory: ShadowTrade[];
  isLoading: boolean;
  error: string | null;
  executeTrade: (tradeData: {
    symbol: string;
    trade_type: 'buy' | 'sell';
    lot_size: number;
    entry_price: number;
    stop_loss: number;
    take_profit: number;
  }) => Promise<void>;
  closeTrade: (tradeId: string, reason?: string) => Promise<void>;
  refreshData: () => Promise<void>;
  resetPortfolio: () => Promise<void>;
}

export const useShadowTradingV3 = (): UseShadowTradingV3 => {
  const [portfolio, setPortfolio] = useState<ShadowPortfolio | null>(null);
  const [openTrades, setOpenTrades] = useState<ShadowTrade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<ShadowTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get or create portfolio for anonymous user (using session)
      const sessionId = 'demo-session-' + Date.now();
      const portfolioData = await shadowTradingEngineV2.getOrCreatePortfolio(undefined, sessionId);
      setPortfolio(portfolioData);

      // Get open trades and history
      const [openTradesData, historyData] = await Promise.all([
        shadowTradingEngineV2.getOpenTrades(),
        shadowTradingEngineV2.getTradeHistory(50)
      ]);

      setOpenTrades(openTradesData);
      setTradeHistory(historyData);
    } catch (err) {
      console.error('❌ Error refreshing shadow trading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const executeTrade = useCallback(async (tradeData: {
    symbol: string;
    trade_type: 'buy' | 'sell';
    lot_size: number;
    entry_price: number;
    stop_loss: number;
    take_profit: number;
  }) => {
    try {
      setError(null);
      await shadowTradingEngineV2.executeTrade(tradeData);
      await refreshData(); // Refresh to get updated data
    } catch (err) {
      console.error('❌ Error executing trade:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute trade');
      throw err;
    }
  }, [refreshData]);

  const closeTrade = useCallback(async (tradeId: string, reason: string = 'manual') => {
    try {
      setError(null);
      await shadowTradingEngineV2.closeTrade(tradeId, undefined, reason);
      await refreshData(); // Refresh to get updated data
    } catch (err) {
      console.error('❌ Error closing trade:', err);
      setError(err instanceof Error ? err.message : 'Failed to close trade');
      throw err;
    }
  }, [refreshData]);

  const resetPortfolio = useCallback(async () => {
    try {
      setError(null);
      await shadowTradingEngineV2.resetPortfolio();
      await refreshData(); // Refresh to get reset data
    } catch (err) {
      console.error('❌ Error resetting portfolio:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset portfolio');
      throw err;
    }
  }, [refreshData]);

  // Initial data load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Set up real-time tick subscription for P&L updates
  useEffect(() => {
    const unsubscribe = marketDataService.subscribe({
      onTick: (tick) => {
        // Real-time P&L updates are handled by the database function
        // We just need to refresh portfolio data periodically
        if (openTrades.length > 0) {
          refreshData();
        }
      },
      onError: (error) => {
        console.error('❌ Market data error:', error);
        setError('Market data connection error');
      }
    });

    return unsubscribe;
  }, [openTrades.length, refreshData]);

  // Auto-refresh every 30 seconds to keep data current
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        refreshData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isLoading, refreshData]);

  return {
    portfolio,
    openTrades,
    tradeHistory,
    isLoading,
    error,
    executeTrade,
    closeTrade,
    refreshData,
    resetPortfolio
  };
};
