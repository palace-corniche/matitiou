import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useShadowTradingUnified } from '@/hooks/useShadowTradingUnified';

const ShadowTradingDashboardUnified: React.FC = () => {
  const { toast } = useToast();
  const {
    portfolio,
    openTrades,
    performanceMetrics,
    currentPrice,
    isConnected,
    isLoading,
    executeTrade,
    closeTrade,
    resetPortfolio,
    refreshData,
    isAutoTrading,
    toggleAutoTrading
  } = useShadowTradingUnified();

  const handleExecuteTrade = async (type: 'BUY' | 'SELL') => {
    try {
      await executeTrade({
        symbol: 'EURUSD',
        trade_type: type.toLowerCase() as 'buy' | 'sell',
        lot_size: 0.1,
        entry_price: currentPrice,
        stop_loss: type === 'BUY' ? currentPrice - 0.001 : currentPrice + 0.001,
        take_profit: type === 'BUY' ? currentPrice + 0.002 : currentPrice - 0.002
      });
      toast({
        title: "Trade Executed",
        description: `${type} trade placed successfully`,
      });
    } catch (error) {
      toast({
        title: "Trade Failed",
        description: "Failed to execute trade",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Shadow Trading Dashboard</h1>
        <div className="flex items-center gap-4">
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
          <Button
            onClick={toggleAutoTrading}
            variant={isAutoTrading ? "destructive" : "default"}
          >
            {isAutoTrading ? "Stop Auto Trading" : "Start Auto Trading"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Balance:</span>
                <span className="font-mono">${portfolio?.balance?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span>Equity:</span>
                <span className="font-mono">${portfolio?.equity?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span>P&L:</span>
                <span className={`font-mono ${(portfolio?.floating_pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${(portfolio?.floating_pnl || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Market Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>EUR/USD:</span>
                <span className="font-mono">{currentPrice.toFixed(5)}</span>
              </div>
              <div className="flex justify-between">
                <span>Source:</span>
                <span className="text-sm">FOREX.com</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Trades:</span>
                <span>{performanceMetrics?.totalTrades || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Win Rate:</span>
                <span>{((performanceMetrics?.winRate || 0) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Total P&L:</span>
                <span className={(performanceMetrics?.totalPnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ${(performanceMetrics?.totalPnl || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button onClick={() => handleExecuteTrade('BUY')} disabled={isLoading}>
                Buy EUR/USD
              </Button>
              <Button onClick={() => handleExecuteTrade('SELL')} disabled={isLoading}>
                Sell EUR/USD
              </Button>
              <Button onClick={refreshData} variant="outline" disabled={isLoading}>
                Refresh
              </Button>
              <Button onClick={resetPortfolio} variant="destructive">
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open Trades</CardTitle>
          </CardHeader>
          <CardContent>
            {openTrades.length === 0 ? (
              <p className="text-muted-foreground">No open trades</p>
            ) : (
              <div className="space-y-2">
                {openTrades.map((trade) => (
                  <div key={trade.id} className="flex justify-between items-center p-2 border rounded">
                    <div>
                      <span className="font-semibold">{trade.symbol}</span>
                      <span className={`ml-2 ${trade.trade_type === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                        {trade.trade_type.toUpperCase()}
                      </span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        {trade.lot_size} lots
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${(trade.unrealized_pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${(trade.unrealized_pnl || 0).toFixed(2)}
                      </span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => closeTrade(trade.id)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShadowTradingDashboardUnified;