// ============= PHASE 3: UNIFIED SHADOW TRADING DASHBOARD =============
// Advanced UI combining all features from V1, V2, and V3

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useShadowTradingUnified } from '@/hooks/useShadowTradingUnified';
import AccountSettingsDialog from '@/components/AccountSettingsDialog';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  AlertCircle,
  Zap,
  Wifi,
  WifiOff,
  RefreshCw,
  BarChart3,
  Clock,
  Settings,
  PieChart,
  LineChart,
  Shield,
  Brain,
  Gauge,
  ArrowUpDown,
  Percent,
  Calculator,
  History
} from 'lucide-react';

const ShadowTradingDashboardUnified: React.FC = () => {
  const {
    portfolio,
    openTrades,
    tradeHistory,
    performanceMetrics,
    currentPrice,
    tickData,
    isConnected,
    dataSource,
    isLoading,
    isExecuting,
    error,
    isAutoTrading,
    executeTrade,
    closeTrade,
    resetPortfolio,
    refreshData,
    toggleAutoTrading,
    partialCloseTrade,
    setBreakEven,
    enableTrailingStop,
    calculateOptimalLotSize
  } = useShadowTradingUnified();

  // ============= LOCAL STATE FOR UI =============
  const [quickTradeData, setQuickTradeData] = useState({
    tradeType: 'buy' as 'buy' | 'sell',
    lotSize: 0.01,
    stopLoss: '',
    takeProfit: '',
    riskPercent: 2
  });

  const [selectedTradeId, setSelectedTradeId] = useState<string>('');
  const [trailingStopDistance, setTrailingStopDistance] = useState(20);

  // ============= HANDLERS =============
  const handleQuickTrade = async () => {
    if (!currentPrice) return;

    const slPrice = quickTradeData.stopLoss 
      ? parseFloat(quickTradeData.stopLoss)
      : quickTradeData.tradeType === 'buy' 
        ? currentPrice - 0.0050  // 50 pips
        : currentPrice + 0.0050;

    const tpPrice = quickTradeData.takeProfit
      ? parseFloat(quickTradeData.takeProfit)
      : quickTradeData.tradeType === 'buy'
        ? currentPrice + 0.0100  // 100 pips
        : currentPrice - 0.0100;

    await executeTrade({
      symbol: 'EUR/USD',
      trade_type: quickTradeData.tradeType,
      lot_size: quickTradeData.lotSize,
      entry_price: currentPrice,
      stop_loss: slPrice,
      take_profit: tpPrice,
      strategy_name: 'Manual Entry',
      comment: 'Quick trade from dashboard'
    });
  };

  const handleOptimalLotSize = async () => {
    if (!currentPrice) return;
    
    const slPrice = quickTradeData.stopLoss 
      ? parseFloat(quickTradeData.stopLoss)
      : quickTradeData.tradeType === 'buy' 
        ? currentPrice - 0.0050
        : currentPrice + 0.0050;

    const optimalLot = await calculateOptimalLotSize('EUR/USD', quickTradeData.riskPercent, currentPrice, slPrice);
    setQuickTradeData(prev => ({ ...prev, lotSize: optimalLot }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Initializing Unified Shadow Trading System...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-destructive">System Error: {error}</p>
          <Button onClick={refreshData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ============= HEADER WITH LIVE STATUS ============= */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Unified Shadow Trading System</h1>
          <p className="text-muted-foreground mt-1">
            Advanced virtual trading with real-time execution, analytics, and risk management
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? 'Live Data' : 'Disconnected'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              FOREX.com
            </Badge>
          </div>
          
          <Badge variant="outline" className="text-lg px-3 py-1">
            EUR/USD: {currentPrice.toFixed(5)}
          </Badge>
          
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span className="text-sm">Auto Trading</span>
            <Switch
              checked={isAutoTrading}
              onCheckedChange={toggleAutoTrading}
            />
          </div>
          
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ============= MAIN PORTFOLIO STATS ============= */}
      {portfolio && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Portfolio Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ${portfolio.equity.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">
                Balance: ${portfolio.balance.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                Floating: ${portfolio.floating_pnl.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <Activity className="h-4 w-4 mr-2" />
                Open Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {openTrades.length}
              </div>
              <p className="text-sm text-muted-foreground">
                Max: {portfolio.max_open_positions}
              </p>
              <p className="text-sm text-muted-foreground">
                Used Margin: ${portfolio.margin.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {portfolio.win_rate.toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">
                {portfolio.winning_trades}W / {portfolio.losing_trades}L
              </p>
              <p className="text-sm text-muted-foreground">
                PF: {portfolio.profit_factor.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Risk Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {portfolio.max_drawdown.toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">
                Current DD: {portfolio.current_drawdown.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">
                Sharpe: {portfolio.sharpe_ratio.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <Gauge className="h-4 w-4 mr-2" />
                Margin Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                portfolio.margin_level > 200 ? 'text-green-600' : 
                portfolio.margin_level > 100 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {portfolio.margin_level.toFixed(0)}%
              </div>
              <p className="text-sm text-muted-foreground">
                Free: ${portfolio.free_margin.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                Leverage: 1:{portfolio.leverage}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============= QUICK TRADE PANEL ============= */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Intelligent Trade Execution
          </CardTitle>
          <CardDescription>
            Execute trades with advanced position sizing and risk management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Direction</Label>
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
                  <SelectItem value="buy">BUY</SelectItem>
                  <SelectItem value="sell">SELL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Risk %</Label>
              <Input
                type="number"
                step="0.1"
                min="0.5"
                max="5"
                value={quickTradeData.riskPercent}
                onChange={(e) => setQuickTradeData(prev => ({ 
                  ...prev, 
                  riskPercent: parseFloat(e.target.value) || 2 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Lot Size</Label>
              <div className="flex space-x-1">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="10"
                  value={quickTradeData.lotSize}
                  onChange={(e) => setQuickTradeData(prev => ({ 
                    ...prev, 
                    lotSize: parseFloat(e.target.value) || 0.01 
                  }))}
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleOptimalLotSize}
                  title="Calculate optimal lot size"
                >
                  <Calculator className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Stop Loss</Label>
              <Input
                type="number"
                step="0.00001"
                placeholder="Auto"
                value={quickTradeData.stopLoss}
                onChange={(e) => setQuickTradeData(prev => ({ 
                  ...prev, 
                  stopLoss: e.target.value 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Take Profit</Label>
              <Input
                type="number"
                step="0.00001"
                placeholder="Auto (2:1)"
                value={quickTradeData.takeProfit}
                onChange={(e) => setQuickTradeData(prev => ({ 
                  ...prev, 
                  takeProfit: e.target.value 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Execute</Label>
              <Button 
                onClick={handleQuickTrade}
                disabled={isExecuting || !currentPrice}
                className={`w-full ${
                  quickTradeData.tradeType === 'buy' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isExecuting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : quickTradeData.tradeType === 'buy' ? (
                  <TrendingUp className="h-4 w-4 mr-2" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-2" />
                )}
                {quickTradeData.tradeType.toUpperCase()}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============= COMPREHENSIVE TABS ============= */}
      <Tabs defaultValue="positions" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* ============= OPEN POSITIONS TAB ============= */}
        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Open Positions ({openTrades.length})</CardTitle>
              <CardDescription>
                Active trades with real-time P&L and advanced management
              </CardDescription>
            </CardHeader>
            <CardContent>
              {openTrades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No open positions</p>
                  <p className="text-sm">Use the quick trade panel above or enable auto-trading</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {openTrades.map((trade) => (
                      <div key={trade.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Badge variant={trade.trade_type === 'buy' ? 'default' : 'destructive'}>
                              {trade.trade_type.toUpperCase()}
                            </Badge>
                            <div>
                              <div className="font-medium">{trade.symbol}</div>
                              <div className="text-sm text-muted-foreground">
                                Lot: {trade.lot_size} | Entry: {trade.entry_price.toFixed(5)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className={`text-lg font-bold ${
                              (trade.unrealized_pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ${(trade.unrealized_pnl || 0).toFixed(2)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {(trade.profit_pips || 0).toFixed(1)} pips
                            </div>
                          </div>
                        </div>

                        <Separator className="my-3" />

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">SL:</span>
                            <span className="ml-1 font-medium">{trade.stop_loss.toFixed(5)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">TP:</span>
                            <span className="ml-1 font-medium">{trade.take_profit.toFixed(5)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">R:R:</span>
                            <span className="ml-1 font-medium">{(trade.risk_reward_ratio || 0).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Margin:</span>
                            <span className="ml-1 font-medium">${(trade.margin_required || 0).toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center space-x-2">
                            {trade.break_even_triggered && (
                              <Badge variant="outline">Break Even</Badge>
                            )}
                            {trade.trailing_stop_triggered && (
                              <Badge variant="outline">Trailing Stop</Badge>
                            )}
                            <Badge variant="secondary">
                              Score: {trade.confluence_score}%
                            </Badge>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setBreakEven(trade.id)}
                              disabled={trade.break_even_triggered}
                            >
                              <Shield className="h-4 w-4 mr-1" />
                              Break Even
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => partialCloseTrade(trade.id, 50)}
                            >
                              <Percent className="h-4 w-4 mr-1" />
                              50%
                            </Button>
                            
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => closeTrade(trade.id)}
                            >
                              Close
                            </Button>
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

        {/* ============= TRADE HISTORY TAB ============= */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trade History ({tradeHistory.length})</CardTitle>
              <CardDescription>
                Detailed history of all closed trades with performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tradeHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No trade history</p>
                  <p className="text-sm">Execute some trades to see performance data</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {tradeHistory.slice(0, 50).map((trade) => (
                      <div key={trade.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Badge variant={trade.trade_type === 'buy' ? 'default' : 'destructive'}>
                              {trade.trade_type.toUpperCase()}
                            </Badge>
                            <div>
                              <div className="font-medium">{trade.symbol}</div>
                              <div className="text-sm text-muted-foreground">
                                {trade.entry_price.toFixed(5)} → {trade.exit_price?.toFixed(5)} | 
                                {trade.exit_reason?.toUpperCase()}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className={`text-lg font-bold ${
                              (trade.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ${(trade.pnl || 0).toFixed(2)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {(trade.holding_time_minutes || 0).toFixed(0)} min | 
                              {(trade.profit_pips || 0).toFixed(1)} pips
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

        {/* ============= ANALYTICS TAB ============= */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Strategy Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.entries(performanceMetrics.strategyBreakdown || {}).map(([strategy, data]) => (
                  <div key={strategy} className="flex items-center justify-between py-2">
                    <span className="text-sm">{strategy}</span>
                    <div className="text-right">
                      <div className="text-sm font-medium">{data.trades} trades</div>
                      <div className={`text-xs ${data.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                        {data.winRate.toFixed(1)}% WR
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChart className="h-5 w-5 mr-2" />
                  Monthly Returns
                </CardTitle>
              </CardHeader>
              <CardContent>
                {performanceMetrics.monthlyReturns?.slice(0, 6).map((month) => (
                  <div key={month.month} className="flex items-center justify-between py-2">
                    <span className="text-sm">{month.month}</span>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        month.return >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {month.return.toFixed(2)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {month.trades} trades
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============= PERFORMANCE TAB ============= */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Total Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performanceMetrics.totalTrades || 0}</div>
                <p className="text-sm text-muted-foreground">
                  Avg Hold: {(performanceMetrics.averageHoldingTime || 0).toFixed(0)}min
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Best Trade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${(performanceMetrics.bestTrade || 0).toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Worst: ${(performanceMetrics.worstTrade || 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Consecutive</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {performanceMetrics.consecutiveWins || 0}W
                </div>
                <p className="text-sm text-muted-foreground">
                  Max Loss: {performanceMetrics.consecutiveLosses || 0}L
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Risk Adjusted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(performanceMetrics.riskAdjustedReturn || 0).toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Calmar: {(performanceMetrics.calmarRatio || 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============= RISK MANAGEMENT TAB ============= */}
        <TabsContent value="risk" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Current Drawdown</span>
                  <span className="font-medium">{portfolio?.current_drawdown.toFixed(2) || 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Margin Level</span>
                  <span className={`font-medium ${
                    (portfolio?.margin_level || 0) > 200 ? 'text-green-600' : 
                    (portfolio?.margin_level || 0) > 100 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {portfolio?.margin_level.toFixed(0) || 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Daily P&L</span>
                  <span className="font-medium">${portfolio?.daily_pnl_today.toFixed(2) || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Risk per Trade</span>
                  <span className="font-medium">2.0%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Limits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Daily Loss Limit</span>
                  <span className="font-medium">${portfolio?.daily_loss_limit.toFixed(2) || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Max Drawdown Limit</span>
                  <span className="font-medium">{((portfolio?.max_drawdown_limit || 0) / (portfolio?.initial_deposit || 1) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Margin Call Level</span>
                  <span className="font-medium">{portfolio?.margin_call_level || 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Stop Out Level</span>
                  <span className="font-medium">{portfolio?.stop_out_level || 0}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============= SETTINGS TAB ============= */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                System Settings
              </CardTitle>
              <CardDescription>
                Configure your unified shadow trading system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Trading Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Auto Trading</Label>
                      <Switch checked={isAutoTrading} onCheckedChange={toggleAutoTrading} />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Label>Account Configuration</Label>
                      <AccountSettingsDialog
                        portfolioId={portfolio?.id || ''}
                        currentSettings={{
                          account_currency: portfolio?.account_currency || 'USD',
                          leverage: portfolio?.leverage || 100,
                          account_type: 'demo', // Default to demo account
                          balance: portfolio?.balance || 100000,
                          daily_loss_limit: portfolio?.daily_loss_limit || 1000,
                          max_drawdown_limit: portfolio?.max_drawdown || 20,
                          margin_call_level: portfolio?.margin_call_level || 100,
                          stop_out_level: portfolio?.stop_out_level || 50
                        }}
                        onSettingsUpdate={refreshData}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Current Configuration</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Leverage</Label>
                      <Badge variant="outline">1:{portfolio?.leverage || 100}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Currency</Label>
                      <Badge variant="outline">{portfolio?.account_currency || 'USD'}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Daily Loss Limit</Label>
                      <Badge variant="outline">${portfolio?.daily_loss_limit?.toFixed(2) || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Margin Call Level</Label>
                      <Badge variant="outline">{portfolio?.margin_call_level || 0}%</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Stop Out Level</Label>
                      <Badge variant="outline">{portfolio?.stop_out_level || 0}%</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-destructive">Danger Zone</h4>
                  <p className="text-sm text-muted-foreground">
                    Reset portfolio to initial state with $100,000 balance
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={resetPortfolio}
                  disabled={isLoading}
                >
                  Reset Portfolio
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ShadowTradingDashboardUnified;