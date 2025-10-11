import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useGlobalShadowTrading } from '@/hooks/useGlobalShadowTrading';
import { globalShadowTradingEngine } from '@/services/globalShadowTradingEngine';

// Enhanced Components
import { PerformanceMetricsPanel } from '@/components/enhanced/PerformanceMetricsPanel';
import { PositionsTable } from '@/components/enhanced/PositionsTable';
import { TradeHistoryTable } from '@/components/enhanced/TradeHistoryTable';
import { TradingControlPanel } from '@/components/enhanced/TradingControlPanel';
import { ResetValidationPanel } from '@/components/enhanced/ResetValidationPanel';

// Global Shadow Trading Dashboard - Professional trading interface
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
  Users,
  Shield,
  Clock,
  Percent
} from 'lucide-react';

const ShadowTradingDashboardUnified: React.FC = () => {
  const {
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
    
    // Analytics
    calculateOptimalLotSize,
    
    // Phase 4: Validation
    validateResetCompletion
  } = useGlobalShadowTrading();

  const { toast } = useToast();

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

  const dailyPnL = account?.floating_pnl || 0;
  const totalReturn = account ? ((account.balance - 100) / 100) * 100 : 0;
  const marginLevel = account?.margin_level || 0;
  const openPositionsCount = openTrades.length;

  const getPnLColor = (value: number) => {
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  const getMarginColor = (level: number) => {
    if (level >= 200) return "text-green-600";
    if (level >= 100) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Enhanced Header with comprehensive stats */}
        <div className="space-y-6">
          {/* Main Account Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-primary shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Account Balance</p>
                    <div className="text-3xl font-bold text-primary">
                      ${account?.balance?.toFixed(2) || '0.00'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Peak: ${account?.peak_balance?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Current Equity</p>
                    <div className="text-3xl font-bold">
                      ${account?.equity?.toFixed(2) || '0.00'}
                    </div>
                    <p className={`text-xs mt-1 ${getPnLColor(dailyPnL)}`}>
                      Today: {dailyPnL >= 0 ? '+' : ''}${dailyPnL.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Return</p>
                    <div className={`text-3xl font-bold ${getPnLColor(totalReturn)}`}>
                      {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Since inception
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-100">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Margin Level</p>
                    <div className={`text-3xl font-bold ${getMarginColor(marginLevel)}`}>
                      {marginLevel.toFixed(0)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Free: ${account?.free_margin?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-orange-100">
                    <Shield className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <div className="text-lg font-bold">{openPositionsCount}</div>
                <div className="text-xs text-muted-foreground">Open Positions</div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <div className="text-lg font-bold">{account?.total_trades || 0}</div>
                <div className="text-xs text-muted-foreground">Total Trades</div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <div className="text-lg font-bold text-primary">{(account?.win_rate || 0).toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">Win Rate</div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <div className="text-lg font-bold">{(account?.profit_factor || 0).toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Profit Factor</div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <div className="text-lg font-bold text-red-600">{(account?.max_drawdown || 0).toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">Max Drawdown</div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <div className="text-lg font-bold font-mono">{marketData?.price?.toFixed(5) || '1.17000'}</div>
                <div className="text-xs text-muted-foreground">EUR/USD</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Enhanced Action buttons */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            <Button 
              onClick={refreshData}
              variant="outline"
              disabled={isRefreshing}
              size="sm"
              className="flex items-center gap-2"
            >
              {isRefreshing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh Data
            </Button>
            
            <Button 
              onClick={toggleAutoTrading}
              variant={account?.auto_trading_enabled ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-2"
            >
              {account?.auto_trading_enabled ? <Zap className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
              {account?.auto_trading_enabled ? "Auto ON" : "Auto OFF"}
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={marketData ? "default" : "secondary"} className="flex items-center gap-1">
                <Wifi className="h-3 w-3" />
                {marketData ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            
            <div className="text-muted-foreground">
              Last update: {new Date().toLocaleTimeString()}
            </div>
          </div>

          <div className="ml-auto">
            <Button 
              onClick={async () => {
                // Enhanced confirmation with current data stats
                const currentStats = {
                  trades: openTrades?.length || 0,
                  history: tradeHistory?.length || 0,
                  balance: account?.balance || 0
                };
                
                const confirmed = window.confirm(
                  `⚠️ COMPLETE ACCOUNT RESET ⚠️\n\n` +
                  `Current Status:\n` +
                  `• Open Trades: ${currentStats.trades}\n` +
                  `• Trade History: ${currentStats.history} records\n` +
                  `• Account Balance: $${currentStats.balance.toFixed(2)}\n\n` +
                  `This will:\n` +
                  `• Delete ALL open positions\n` +
                  `• Clear ALL trade history\n` +
                  `• Reset balance to $100\n` +
                  `• Reset all metrics to zero\n\n` +
                  `This action cannot be undone!\n\n` +
                  `Continue with reset?`
                );
                
                if (confirmed) {
                  try {
                    await resetAccount();
                    
                    // Phase 4: Enhanced post-reset validation and feedback
                    setTimeout(async () => {
                      try {
                        // Validate reset was successful
                        const validation = await validateResetCompletion();
                        
                        if (validation.success) {
                          toast({
                            title: "✅ Account Reset Complete",
                            description: `${validation.message}\n• Balance: $${validation.stats.accountBalance.toFixed(2)}\n• Trades: ${validation.stats.tradesCount}\n• History: ${validation.stats.historyCount}`,
                          });
                        } else {
                          toast({
                            variant: "destructive",
                            title: "⚠️ Reset Incomplete",
                            description: `Validation failed:\n${validation.errors.join('\n')}`,
                          });
                        }
                      } catch (error) {
                        console.error('Post-reset validation failed:', error);
                        toast({
                          variant: "destructive",
                          title: "Validation Error",
                          description: "Could not verify reset completion",
                        });
                      }
                    }, 2000);
                    
                  } catch (error) {
                    console.error('Reset failed:', error);
                    toast({
                      variant: "destructive",
                      title: "Reset Failed",
                      description: "Failed to reset account. Please try again or check console for details.",
                    });
                  }
                }
              }}
              variant="destructive"
              disabled={isResetting}
              size="sm"
              className="flex items-center gap-2"
            >
              {isResetting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
              {isResetting ? 'Resetting & Validating...' : 'Reset Account'}
            </Button>
          </div>
        </div>

        {/* Enhanced Main content tabs */}
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full grid-cols-5 h-12">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="trading" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Trading
            </TabsTrigger>
            <TabsTrigger value="positions" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Positions ({openPositionsCount})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <PerformanceMetricsPanel 
              account={account}
              performanceMetrics={performanceMetrics}
            />
          </TabsContent>

          <TabsContent value="trading" className="space-y-8">
            <TradingControlPanel
              marketData={marketData}
              isExecutingTrade={isExecutingTrade}
              onExecuteTrade={async (request) => {
                await executeTrade(request);
              }}
              onCalculateOptimalLotSize={calculateOptimalLotSize}
            />

            {/* Market Data Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Market Overview
                  </CardTitle>
                  <CardDescription>Real-time market information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">Bid Price</p>
                        <p className="text-2xl font-mono font-bold">{marketData?.bid?.toFixed(5) || '1.17000'}</p>
                      </div>
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">Ask Price</p>
                        <p className="text-2xl font-mono font-bold">{marketData?.ask?.toFixed(5) || '1.17005'}</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span>Spread:</span>
                        <span className="font-mono">{marketData?.spread?.toFixed(1) || '1.5'} pips</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Update:</span>
                        <span>{new Date().toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Quick Stats
                  </CardTitle>
                  <CardDescription>Current session summary</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Open Trades</p>
                      <p className="text-xl font-bold">{openPositionsCount}</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Used Margin</p>
                      <p className="text-xl font-bold">${(account?.used_margin || 0).toFixed(0)}</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Free Margin</p>
                      <p className="text-xl font-bold">${(account?.free_margin || 0).toFixed(0)}</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Margin Level</p>
                      <p className={`text-xl font-bold ${getMarginColor(marginLevel)}`}>
                        {marginLevel.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="positions" className="space-y-8">
            <PositionsTable
              openTrades={openTrades}
              isClosingTrade={isClosingTrade}
              onCloseTrade={async (tradeId) => {
                await closeTrade(tradeId);
              }}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-8">
            <TradeHistoryTable tradeHistory={tradeHistory} />
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
            
            {/* Phase 4: Reset Validation Panel */}
            <ResetValidationPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ShadowTradingDashboardUnified;