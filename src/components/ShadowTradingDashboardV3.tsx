import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useShadowTradingV3 } from '@/hooks/useShadowTradingV3';
import { marketDataService } from '@/services/realTimeMarketData';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  RotateCcw,
  Square,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const ShadowTradingDashboardV3: React.FC = () => {
  const {
    portfolio,
    openTrades,
    tradeHistory,
    isLoading,
    error,
    executeTrade,
    closeTrade,
    refreshData,
    resetPortfolio
  } = useShadowTradingV3();

  const [currentPrice, setCurrentPrice] = React.useState<number>(1.17000);
  const [isExecuting, setIsExecuting] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = marketDataService.subscribe({
      onTick: (tick) => {
        setCurrentPrice((tick.bid + tick.ask) / 2);
      },
      onError: (error) => {
        console.error('❌ Market data error:', error);
      }
    });

    return unsubscribe;
  }, []);

  const handleExecuteBuyTrade = async () => {
    if (!portfolio || isExecuting) return;
    setIsExecuting(true);
    try {
      await executeTrade({
        symbol: 'EUR/USD',
        trade_type: 'buy',
        lot_size: 0.01,
        entry_price: currentPrice + 0.00010,
        stop_loss: currentPrice - 0.00290,
        take_profit: currentPrice + 0.00610
      });
      toast.success('Buy trade executed!');
    } catch (error) {
      toast.error(`Trade failed: ${error}`);
    } finally {
      setIsExecuting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Shadow Trading V3</h2>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-lg px-3 py-1">
            EUR/USD: {currentPrice.toFixed(5)}
          </Badge>
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {portfolio && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${portfolio.balance.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Equity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${portfolio.equity.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Open Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openTrades.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{portfolio.win_rate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick Trade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button 
              onClick={handleExecuteBuyTrade}
              disabled={isExecuting}
              className="bg-green-600 hover:bg-green-700"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Buy 0.01 lot
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="open" className="w-full">
        <TabsList>
          <TabsTrigger value="open">Open ({openTrades.length})</TabsTrigger>
          <TabsTrigger value="history">History ({tradeHistory.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="open">
          <Card>
            <CardContent className="pt-6">
              {openTrades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No open trades
                </div>
              ) : (
                <div className="space-y-4">
                  {openTrades.map((trade) => (
                    <div key={trade.id} className="border rounded p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <Badge variant={trade.trade_type === 'buy' ? 'default' : 'destructive'}>
                            {trade.trade_type.toUpperCase()}
                          </Badge>
                          <span className="ml-2">{trade.symbol} {trade.lot_size}</span>
                        </div>
                        <span className={trade.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ${trade.unrealized_pnl.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ShadowTradingDashboardV3;