import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGlobalShadowTrading } from '@/hooks/useGlobalShadowTrading';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  AlertCircle,
  Zap,
  Wifi,
  PlayCircle,
  Square,
  RefreshCw,
  Settings,
  BarChart3,
  PieChart,
  LineChart,
  Users
} from 'lucide-react';

const ShadowTradingDashboardUnified: React.FC = () => {
  const {
    account,
    openTrades,
    tradeHistory,
    performanceMetrics,
    marketData,
    isLoading,
    isExecutingTrade,
    isClosingTrade,
    isRefreshing,
    isResetting,
    error,
    executeTrade,
    closeTrade,
    resetAccount,
    refreshData,
    toggleAutoTrading,
    updateMaxOpenTrades,
    calculateOptimalLotSize
  } = useGlobalShadowTrading();

  // Local state for UI
  const [quickTradeData, setQuickTradeData] = useState({
    tradeType: 'buy' as 'buy' | 'sell',
    lotSize: 0.01,
    symbol: 'EUR/USD',
    comment: ''
  });

  const [maxTradesInput, setMaxTradesInput] = useState(account?.max_open_positions || 50);

  // Quick trade execution
  const handleQuickTrade = async () => {
    if (isExecutingTrade) return;
    
    try {
      await executeTrade({
        symbol: 'EUR/USD',
        trade_type: quickTradeData.tradeType,
        lot_size: quickTradeData.lotSize,
        entry_price: marketData?.price || 1.17000,
        comment: `Quick ${quickTradeData.tradeType} trade`
      });
    } catch (error) {
      console.error('Quick trade failed:', error);
    }
  };

  // Handle max trades update
  const handleMaxTradesUpdate = async () => {
    await updateMaxOpenTrades(maxTradesInput);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto" />
          <p>Loading Global Trading System...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-destructive">{error}</p>
          <Button onClick={refreshData}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header with global stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Balance</p>
                  <div className="text-2xl font-bold text-primary">
                    ${account?.balance?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Equity</p>
                  <div className="text-2xl font-bold">
                    ${account?.equity?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Floating P&L</p>
                  <div className="text-2xl font-bold text-accent">
                    ${account?.floating_pnl?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">EUR/USD</p>
                  <div className="text-2xl font-bold">
                    {marketData?.price?.toFixed(5) || '1.17000'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
          <Button 
            onClick={resetAccount}
            variant="destructive"
            disabled={isResetting}
            size="sm"
          >
            {isResetting ? 'Resetting...' : 'Reset Account'}
          </Button>
          <Button 
            onClick={toggleAutoTrading}
            variant={account?.auto_trading_enabled ? "default" : "outline"}
            size="sm"
          >
            {account?.auto_trading_enabled ? "Disable" : "Enable"} Auto Trading
          </Button>
          <Button 
            onClick={refreshData}
            variant="outline"
            disabled={isRefreshing}
            size="sm"
          >
            {isRefreshing ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        {/* Main content tabs */}
        <Tabs defaultValue="trading" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trading">Trading</TabsTrigger>
            <TabsTrigger value="positions">Positions</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="trading" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Trade Panel */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Trade</CardTitle>
                  <CardDescription>Execute trades instantly</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Trade Type</Label>
                      <Select 
                        value={quickTradeData.tradeType} 
                        onValueChange={(value: 'buy' | 'sell') => 
                          setQuickTradeData(prev => ({ ...prev, tradeType: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buy">Buy</SelectItem>
                          <SelectItem value="sell">Sell</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Lot Size</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={quickTradeData.lotSize}
                        onChange={(e) => setQuickTradeData(prev => ({ 
                          ...prev, 
                          lotSize: parseFloat(e.target.value) || 0.01 
                        }))}
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleQuickTrade}
                    disabled={isExecutingTrade}
                    className="w-full"
                    variant={quickTradeData.tradeType === 'buy' ? 'default' : 'destructive'}
                  >
                    {isExecutingTrade ? 'Executing...' : `${quickTradeData.tradeType.toUpperCase()} ${quickTradeData.lotSize} Lots`}
                  </Button>
                </CardContent>
              </Card>

              {/* Market Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Market Status</CardTitle>
                  <CardDescription>Real-time market information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>EUR/USD</span>
                      <span className="font-mono text-lg">{marketData?.price?.toFixed(5) || '1.17000'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Bid</span>
                      <span className="font-mono">{marketData?.bid?.toFixed(5) || '1.17000'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Ask</span>
                      <span className="font-mono">{marketData?.ask?.toFixed(5) || '1.17000'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Spread</span>
                      <span className="font-mono">{marketData?.spread?.toFixed(1) || '1.5'} pips</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="positions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Open Positions ({openTrades.length})</CardTitle>
                <CardDescription>Currently active trades</CardDescription>
              </CardHeader>
              <CardContent>
                {openTrades.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No open positions
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {openTrades.map((trade) => (
                        <div key={trade.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant={trade.trade_type === 'buy' ? 'default' : 'destructive'}>
                                  {trade.trade_type.toUpperCase()}
                                </Badge>
                                <span className="font-medium">{trade.symbol}</span>
                                <span className="text-sm text-muted-foreground">
                                  {trade.lot_size} lots
                                </span>
                              </div>
                              <div className="mt-2 text-sm space-y-1">
                                <div>Entry: {trade.entry_price.toFixed(5)}</div>
                                <div>Current: {trade.current_price?.toFixed(5) || 'N/A'}</div>
                                <div>P&L: ${trade.unrealized_pnl?.toFixed(2) || '0.00'}</div>
                              </div>
                            </div>
                            <Button
                              onClick={() => closeTrade(trade.id)}
                              disabled={isClosingTrade}
                              variant="outline"
                              size="sm"
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trade History</CardTitle>
                <CardDescription>Recent trading activity</CardDescription>
              </CardHeader>
              <CardContent>
                {tradeHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No trade history
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {tradeHistory.slice(0, 20).map((trade) => (
                        <div key={trade.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant={trade.action_type === 'close' ? 'secondary' : 'outline'}>
                                  {trade.action_type.toUpperCase()}
                                </Badge>
                                <span className="font-medium">{trade.symbol}</span>
                                <span className="text-sm text-muted-foreground">
                                  {trade.lot_size} lots
                                </span>
                              </div>
                              <div className="mt-2 text-sm space-y-1">
                                <div>Price: {trade.execution_price.toFixed(5)}</div>
                                <div>P&L: ${trade.profit?.toFixed(2) || '0.00'}</div>
                                <div>Time: {new Date(trade.execution_time).toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Account Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Statistics</CardTitle>
                  <CardDescription>Performance overview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Total Trades</Label>
                      <div className="text-2xl font-bold">{account?.total_trades || 0}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Win Rate</Label>
                      <div className="text-2xl font-bold">{account?.win_rate?.toFixed(1) || '0.0'}%</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Profit Factor</Label>
                      <div className="text-2xl font-bold">{account?.profit_factor?.toFixed(2) || '0.00'}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Max Drawdown</Label>
                      <div className="text-2xl font-bold">{account?.max_drawdown?.toFixed(2) || '0.00'}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Global Settings</CardTitle>
                  <CardDescription>Configure trading parameters</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Max Open Positions</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={maxTradesInput}
                        onChange={(e) => setMaxTradesInput(parseInt(e.target.value) || 50)}
                        min="1"
                        max="200"
                      />
                      <Button onClick={handleMaxTradesUpdate} size="sm">
                        Update
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Auto Trading</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant={account?.auto_trading_enabled ? "default" : "secondary"}>
                        {account?.auto_trading_enabled ? "Enabled" : "Disabled"}
                      </Badge>
                      <Button onClick={toggleAutoTrading} size="sm" variant="outline">
                        Toggle
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Account Leverage</Label>
                    <div className="text-lg font-medium">1:{account?.leverage || 100}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ShadowTradingDashboardUnified;