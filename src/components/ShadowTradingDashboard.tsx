import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  TrendingUp, TrendingDown, DollarSign, Target, Shield, 
  Activity, BarChart3, PieChart, Clock, Zap, RefreshCw,
  Trophy, AlertTriangle, TrendingUp as Profit, TrendingDown as Loss
} from 'lucide-react';
import { shadowTradingEngine, VirtualTrade, VirtualPortfolio, PerformanceMetrics } from '@/services/shadowTradingEngine';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

interface ShadowTradingDashboardProps {
  marketData?: Record<string, number>;
}

const ShadowTradingDashboard: React.FC<ShadowTradingDashboardProps> = ({ marketData = {} }) => {
  const [portfolio, setPortfolio] = useState<VirtualPortfolio>(shadowTradingEngine.getPortfolio());
  const [metrics, setMetrics] = useState<PerformanceMetrics>(shadowTradingEngine.getPerformanceMetrics());
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const updateData = () => {
      // Update trades with market data
      shadowTradingEngine.updateTrades(marketData);
      
      // Refresh data
      setPortfolio(shadowTradingEngine.getPortfolio());
      setMetrics(shadowTradingEngine.getPerformanceMetrics());
      setLastUpdate(new Date());
    };

    updateData();
    
    // Update every 30 seconds
    const interval = setInterval(updateData, 30000);
    return () => clearInterval(interval);
  }, [marketData]);

  const refreshData = () => {
    setPortfolio(shadowTradingEngine.getPortfolio());
    setMetrics(shadowTradingEngine.getPerformanceMetrics());
    setLastUpdate(new Date());
  };

  const resetPortfolio = () => {
    if (confirm('Are you sure you want to reset the shadow trading portfolio? This will clear all trades and statistics.')) {
      shadowTradingEngine.resetPortfolio();
      refreshData();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge variant="outline" className="text-blue-600">Open</Badge>;
      case 'closed': return <Badge variant="outline" className="text-gray-600">Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getExitReasonBadge = (reason?: string) => {
    if (!reason) return null;
    const variants = {
      tp: { variant: 'default' as const, color: 'text-green-600', label: 'Take Profit' },
      sl: { variant: 'destructive' as const, color: 'text-red-600', label: 'Stop Loss' },
      time: { variant: 'secondary' as const, color: 'text-yellow-600', label: 'Time Exit' },
      manual: { variant: 'outline' as const, color: 'text-blue-600', label: 'Manual' },
      opposing_signal: { variant: 'outline' as const, color: 'text-purple-600', label: 'Opposing Signal' }
    };
    const config = variants[reason as keyof typeof variants] || variants.manual;
    return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>;
  };

  const getPnlDisplay = (pnl?: number) => {
    if (pnl === undefined) return { text: '0.00', color: 'text-muted-foreground', icon: null };
    const isPositive = pnl > 0;
    return {
      text: `${isPositive ? '+' : ''}${pnl.toFixed(2)}`,
      color: isPositive ? 'text-green-600' : 'text-red-600',
      icon: isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
    };
  };

  // Prepare chart data
  const equityCurveData = portfolio.closedTrades.reduce((acc, trade, index) => {
    const prevEquity = acc.length > 0 ? acc[acc.length - 1].equity : 100000;
    acc.push({
      trade: index + 1,
      equity: prevEquity + (trade.pnl || 0),
      pnl: trade.pnl || 0,
      date: new Date(trade.exitTime || 0).toLocaleDateString()
    });
    return acc;
  }, [] as Array<{ trade: number; equity: number; pnl: number; date: string }>);

  const monthlyReturnsData = metrics.monthlyReturns.map(month => ({
    month: month.month,
    return: month.return,
    trades: month.trades,
    color: month.return > 0 ? '#22c55e' : '#ef4444'
  }));

  const strategyBreakdownData = Object.entries(metrics.strategyBreakdown).map(([strategy, data]) => ({
    name: strategy,
    value: data.trades,
    winRate: data.winRate,
    pnl: data.pnl
  }));

  const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shadow Trading Dashboard</h1>
          <p className="text-muted-foreground">
            Virtual portfolio performance • Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="destructive" onClick={resetPortfolio}>
            Reset Portfolio
          </Button>
        </div>
      </div>

      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Equity</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${portfolio.equity.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {((portfolio.equity / 100000 - 1) * 100).toFixed(2)}% total return
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolio.openTrades.length}</div>
            <p className="text-xs text-muted-foreground">
              ${portfolio.margin.toFixed(2)} margin used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolio.winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {portfolio.winningTrades}W / {portfolio.losingTrades}L
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-{portfolio.maxDrawdown.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Risk level: {portfolio.maxDrawdown < 10 ? 'Low' : portfolio.maxDrawdown < 20 ? 'Medium' : 'High'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Profit Factor</p>
                <p className="text-lg font-bold">{metrics.profitFactor.toFixed(2)}</p>
              </div>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Sharpe Ratio</p>
                <p className="text-lg font-bold">{metrics.sharpeRatio.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Expectancy</p>
                <p className="text-lg font-bold">${metrics.expectancy.toFixed(2)}</p>
              </div>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Avg Hold</p>
                <p className="text-lg font-bold">{(metrics.averageHoldingTime / 60).toFixed(1)}h</p>
              </div>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Best Trade</p>
                <p className="text-lg font-bold text-green-600">+${metrics.bestTrade.toFixed(2)}</p>
              </div>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Worst Trade</p>
                <p className="text-lg font-bold text-red-600">${metrics.worstTrade.toFixed(2)}</p>
              </div>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="portfolio" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="trades">Trade History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="strategy">Strategy Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Open Trades */}
            <Card>
              <CardHeader>
                <CardTitle>Open Positions ({portfolio.openTrades.length})</CardTitle>
                <CardDescription>Currently active shadow trades</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {portfolio.openTrades.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No open positions
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {portfolio.openTrades.map((trade) => {
                        const currentPrice = marketData[trade.symbol] || trade.entryPrice;
                        const unrealizedPnl = trade.type === 'buy' 
                          ? (currentPrice - trade.entryPrice) / trade.entryPrice * trade.positionSize
                          : (trade.entryPrice - currentPrice) / trade.entryPrice * trade.positionSize;
                        const pnlDisplay = getPnlDisplay(unrealizedPnl);

                        return (
                          <div key={trade.id} className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant={trade.type === 'buy' ? 'default' : 'destructive'}>
                                  {trade.type.toUpperCase()}
                                </Badge>
                                <span className="font-medium">{trade.symbol}</span>
                                {getStatusBadge(trade.status)}
                              </div>
                              <div className={`flex items-center gap-1 ${pnlDisplay.color}`}>
                                {pnlDisplay.icon}
                                <span className="font-medium">{pnlDisplay.text}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Entry: {trade.entryPrice.toFixed(5)}</p>
                                <p className="text-muted-foreground">Size: ${trade.positionSize.toFixed(0)}</p>
                              </div>
                              <div>
                                <p className="text-green-600">TP: {trade.takeProfit.toFixed(5)}</p>
                                <p className="text-red-600">SL: {trade.stopLoss.toFixed(5)}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>R:R {trade.riskRewardRatio?.toFixed(2)}</span>
                              <span>Confluence: {trade.confluenceScore.toFixed(0)}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Equity Curve */}
            <Card>
              <CardHeader>
                <CardTitle>Equity Curve</CardTitle>
                <CardDescription>Portfolio value over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={equityCurveData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="trade" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        typeof value === 'number' ? `$${value.toFixed(2)}` : value, 
                        name === 'equity' ? 'Account Value' : 'Trade P&L'
                      ]}
                    />
                    <Line type="monotone" dataKey="equity" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trade History ({portfolio.closedTrades.length} trades)</CardTitle>
              <CardDescription>Complete record of all closed shadow trades</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {portfolio.closedTrades.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No completed trades yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...portfolio.closedTrades].reverse().map((trade) => {
                      const pnlDisplay = getPnlDisplay(trade.pnl);
                      return (
                        <div key={trade.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant={trade.type === 'buy' ? 'default' : 'destructive'}>
                                {trade.type.toUpperCase()}
                              </Badge>
                              <span className="font-medium">{trade.symbol}</span>
                              {getExitReasonBadge(trade.exitReason)}
                            </div>
                            <div className={`flex items-center gap-1 ${pnlDisplay.color}`}>
                              {pnlDisplay.icon}
                              <span className="font-bold">{pnlDisplay.text}</span>
                              <span className="text-sm">({trade.pnlPercent?.toFixed(2)}%)</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Entry</p>
                              <p className="font-medium">{trade.entryPrice.toFixed(5)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Exit</p>
                              <p className="font-medium">{trade.exitPrice?.toFixed(5)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Duration</p>
                              <p className="font-medium">{(trade.holdingTimeMinutes! / 60).toFixed(1)}h</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Size</p>
                              <p className="font-medium">${trade.positionSize.toFixed(0)}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
                            <span>R:R {trade.riskRewardRatio?.toFixed(2)}</span>
                            <span>Confluence: {trade.confluenceScore.toFixed(0)}%</span>
                            <span>{new Date(trade.exitTime!).toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Returns */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Returns</CardTitle>
                <CardDescription>Performance breakdown by month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyReturnsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${(value as number).toFixed(2)}%`, 'Return']} />
                    <Bar dataKey="return" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Strategy Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Signal Quality Distribution</CardTitle>
                <CardDescription>Performance by confluence score range</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={strategyBreakdownData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {strategyBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Performance Overview */}
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {metrics.winRate.toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <Progress value={metrics.winRate} className="mt-2" />
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {metrics.averageRR.toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">Avg Risk:Reward</p>
                    <Progress value={(metrics.averageRR / 3) * 100} className="mt-2" />
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {metrics.profitFactor.toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">Profit Factor</p>
                    <Progress value={Math.min(metrics.profitFactor * 33, 100)} className="mt-2" />
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">
                      {metrics.sharpeRatio.toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                    <Progress value={Math.min(Math.max(metrics.sharpeRatio * 50, 0), 100)} className="mt-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Streak Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Streak Analysis</CardTitle>
                <CardDescription>Winning & losing streaks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Max Winning Streak</span>
                  <div className="flex items-center gap-2">
                    <Profit className="h-4 w-4 text-green-600" />
                    <span className="font-bold text-green-600">{metrics.consecutiveWins}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Max Losing Streak</span>
                  <div className="flex items-center gap-2">
                    <Loss className="h-4 w-4 text-red-600" />
                    <span className="font-bold text-red-600">{metrics.consecutiveLosses}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Best Trade</span>
                  <span className="font-bold text-green-600">+${metrics.bestTrade.toFixed(2)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Worst Trade</span>
                  <span className="font-bold text-red-600">${metrics.worstTrade.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Risk Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Analysis</CardTitle>
                <CardDescription>Risk management statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Max Drawdown</span>
                  <span className="font-bold text-red-600">-{metrics.maxDrawdown.toFixed(2)}%</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Risk Level</span>
                  <Badge variant={metrics.maxDrawdown < 10 ? 'default' : metrics.maxDrawdown < 20 ? 'secondary' : 'destructive'}>
                    {metrics.maxDrawdown < 10 ? 'Conservative' : metrics.maxDrawdown < 20 ? 'Moderate' : 'Aggressive'}
                  </Badge>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Avg Hold Time</span>
                  <span className="font-medium">{(metrics.averageHoldingTime / 60).toFixed(1)} hours</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Trades</span>
                  <span className="font-medium">{metrics.totalTrades}</span>
                </div>
              </CardContent>
            </Card>

            {/* P&L Summary */}
            <Card>
              <CardHeader>
                <CardTitle>P&L Summary</CardTitle>
                <CardDescription>Profit & loss breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total P&L</span>
                  <span className={`font-bold ${metrics.totalPnl > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${metrics.totalPnl.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Return %</span>
                  <span className={`font-bold ${metrics.totalPnl > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {((metrics.totalPnl / 100000) * 100).toFixed(2)}%
                  </span>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Expectancy</span>
                  <span className={`font-bold ${metrics.expectancy > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${metrics.expectancy.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Performance Score</span>
                  <Badge variant={metrics.sharpeRatio > 1 ? 'default' : metrics.sharpeRatio > 0 ? 'secondary' : 'destructive'}>
                    {metrics.sharpeRatio > 1 ? 'Excellent' : metrics.sharpeRatio > 0 ? 'Good' : 'Poor'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="strategy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Performance Analysis</CardTitle>
              <CardDescription>Performance breakdown by confluence score ranges</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(metrics.strategyBreakdown).map(([strategy, data]) => {
                  const winRateColor = data.winRate > 60 ? 'text-green-600' : data.winRate > 40 ? 'text-yellow-600' : 'text-red-600';
                  const pnlColor = data.pnl > 0 ? 'text-green-600' : 'text-red-600';
                  
                  return (
                    <div key={strategy} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">{strategy}</h3>
                        <Badge variant="outline">{data.trades} trades</Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className={`text-xl font-bold ${winRateColor}`}>
                            {data.winRate.toFixed(1)}%
                          </div>
                          <p className="text-xs text-muted-foreground">Win Rate</p>
                        </div>
                        
                        <div className="text-center">
                          <div className={`text-xl font-bold ${pnlColor}`}>
                            ${data.pnl.toFixed(2)}
                          </div>
                          <p className="text-xs text-muted-foreground">Total P&L</p>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-xl font-bold">
                            ${(data.pnl / data.trades).toFixed(2)}
                          </div>
                          <p className="text-xs text-muted-foreground">Avg per Trade</p>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <Progress value={data.winRate} className="h-2" />
                      </div>
                    </div>
                  );
                })}
                
                {Object.keys(metrics.strategyBreakdown).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No strategy data available yet. Execute some trades to see performance breakdown.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ShadowTradingDashboard;