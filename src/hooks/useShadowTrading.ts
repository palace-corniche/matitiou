import { useEffect, useState } from 'react';
import { shadowTradingEngine, VirtualPortfolio, PerformanceMetrics } from '@/services/shadowTradingEngine';
import { ConfluenceSignal } from '@/services/confluenceEngine';
import { useToast } from '@/hooks/use-toast';

export interface ShadowTradingHook {
  portfolio: VirtualPortfolio;
  metrics: PerformanceMetrics;
  isAutoTrading: boolean;
  executeSignal: (signal: ConfluenceSignal, currentPrice: number) => void;
  toggleAutoTrading: () => void;
  resetPortfolio: () => void;
  refreshData: () => void;
}

export const useShadowTrading = (marketData: Record<string, number> = {}): ShadowTradingHook => {
  const [portfolio, setPortfolio] = useState<VirtualPortfolio>(shadowTradingEngine.getPortfolio());
  const [metrics, setMetrics] = useState<PerformanceMetrics>(shadowTradingEngine.getPerformanceMetrics());
  const [isAutoTrading, setIsAutoTrading] = useState(true);
  const { toast } = useToast();

  const refreshData = () => {
    setPortfolio(shadowTradingEngine.getPortfolio());
    setMetrics(shadowTradingEngine.getPerformanceMetrics());
  };

  const executeSignal = (signal: ConfluenceSignal, currentPrice: number) => {
    if (!isAutoTrading) return;

    const trade = shadowTradingEngine.executeSignal(signal, currentPrice);
    if (trade) {
      toast({
        title: "Shadow Trade Executed",
        description: `${trade.type.toUpperCase()} ${trade.symbol} @ ${trade.entryPrice.toFixed(5)}`,
      });
      refreshData();
    }
  };

  const toggleAutoTrading = () => {
    setIsAutoTrading(prev => {
      const newState = !prev;
      toast({
        title: newState ? "Shadow Trading Enabled" : "Shadow Trading Disabled",
        description: newState 
          ? "Signals will now be automatically executed in shadow portfolio"
          : "Automatic signal execution paused",
      });
      return newState;
    });
  };

  const resetPortfolio = () => {
    shadowTradingEngine.resetPortfolio();
    refreshData();
    toast({
      title: "Portfolio Reset",
      description: "Shadow trading portfolio has been reset to initial state",
    });
  };

  // Auto-update trades with market data
  useEffect(() => {
    const updateTrades = () => {
      shadowTradingEngine.updateTrades(marketData);
      refreshData();
    };

    updateTrades();
    
    // Update every 30 seconds
    const interval = setInterval(updateTrades, 30000);
    return () => clearInterval(interval);
  }, [marketData]);

  return {
    portfolio,
    metrics,
    isAutoTrading,
    executeSignal,
    toggleAutoTrading,
    resetPortfolio,
    refreshData
  };
};