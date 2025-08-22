import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Activity, AlertCircle, DollarSign, TrendingUp, TrendingDown, 
  BarChart3, Wallet, Settings, RefreshCw, RotateCcw, Signal,
  Timer, Target, Shield, Zap, PieChart, LineChart, Layers
} from 'lucide-react';
import { useShadowTradingV2 } from '@/hooks/useShadowTradingV2';
import { useToast } from '@/hooks/use-toast';
import AccountSettingsDialog from './AccountSettingsDialog';
import DepositWithdrawDialog from './DepositWithdrawDialog';
import { migrateShadowTradingData, checkMigrationStatus } from '@/utils/shadowTradingMigration';

const ShadowTradingDashboardV3: React.FC = () => {
  const {
    portfolio,
    openTrades,
    closedTrades,
    recentSignals,
    performanceMetrics,
    currentPrice,
    isLoading,
    isConnected,
    toggleAutoTrading,
    resetPortfolio
  } = useShadowTradingV2();

  const [showMigrationAlert, setShowMigrationAlert] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const migrationStatus = checkMigrationStatus();
    setShowMigrationAlert(migrationStatus.hasLocalData && !migrationStatus.isCompleted);
  }, []);

  const handleMigration = async () => {
    try {
      setIsMigrating(true);
      await migrateShadowTradingData();
      setShowMigrationAlert(false);
      toast({
        title: "Migration Successful",
        description: "Your shadow trading data has been migrated to the cloud.",
      });
    } catch (error) {
      console.error('Migration failed:', error);
      toast({
        title: "Migration Failed",
        description: "Failed to migrate your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading MetaTrader portfolio...</p>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
        <p className="text-muted-foreground">No portfolio found. Please refresh the page.</p>
      </div>
    );
  }

  // Get currency symbol
  const currencySymbol = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥',
    'CHF': 'Fr', 'CAD': 'C$', 'AUD': 'A$'
  }[portfolio.account_currency] || '$';

  // Calculate margin level color
  const getMarginLevelColor = (level: number) => {
    if (level < portfolio.stop_out_level) return 'text-red-600';
    if (level < portfolio.margin_call_level) return 'text-orange-500';
    return 'text-green-600';
  };

  // Calculate account performance
  const accountReturn = portfolio.equity - portfolio.initial_deposit;
  const accountReturnPercent = ((accountReturn / portfolio.initial_deposit) * 100);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Migration Alert */}
      {showMigrationAlert && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Local shadow trading data detected. Migrate to cloud for better reliability?</span>
            <Button 
              size="sm" 
              onClick={handleMigration}
              disabled={isMigrating}
            >
              {isMigrating ? 'Migrating...' : 'Migrate Data'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">MetaTrader Portfolio</h1>
          <p className="text-muted-foreground mt-1">
            Professional trading platform simulation • {portfolio.account_type.toUpperCase()} Account
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Account Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Equity</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencySymbol}{portfolio.equity.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Balance: {currencySymbol}{portfolio.balance.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTrades.length}</div>
            <p className="text-xs text-muted-foreground">
              Max: {portfolio.max_open_positions}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margin Level</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getMarginLevelColor(portfolio.margin_level)}`}>
              {portfolio.margin_level.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Free: {currencySymbol}{portfolio.free_margin.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Return</CardTitle>
            {accountReturn >= 0 ? 
              <TrendingUp className="h-4 w-4 text-green-600" /> : 
              <TrendingDown className="h-4 w-4 text-red-600" />
            }
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${accountReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {accountReturnPercent > 0 ? '+' : ''}{accountReturnPercent.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {currencySymbol}{accountReturn.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Leverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">1:{portfolio.leverage}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{portfolio.win_rate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Profit Factor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{portfolio.profit_factor.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Max Drawdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-red-600">
              {portfolio.max_drawdown.toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sharpe Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{portfolio.sharpe_ratio.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Market Status & Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Signal className="h-5 w-5" />
            Trading Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">EUR/USD Current Price</div>
              <div className="text-2xl font-bold">
                {currentPrice ? currentPrice.toFixed(5) : 'Loading...'}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={portfolio.auto_trading_enabled}
                  onCheckedChange={toggleAutoTrading}
                />
                <label className="text-sm font-medium">Auto Trading</label>
              </div>
              <AccountSettingsDialog 
                portfolioId={portfolio.id}
                currentSettings={{
                  account_currency: portfolio.account_currency,
                  leverage: portfolio.leverage,
                  account_type: portfolio.account_type,
                  balance: portfolio.balance,
                  daily_loss_limit: portfolio.daily_loss_limit,
                  max_drawdown_limit: portfolio.max_drawdown_limit,
                  margin_call_level: portfolio.margin_call_level,
                  stop_out_level: portfolio.stop_out_level
                }}
                onSettingsUpdate={() => window.location.reload()}
              />
              <DepositWithdrawDialog
                portfolioId={portfolio.id}
                currentBalance={portfolio.balance}
                currentEquity={portfolio.equity}
                accountCurrency={portfolio.account_currency}
                onTransactionComplete={() => window.location.reload()}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="positions">Open Positions</TabsTrigger>
          <TabsTrigger value="history">Trade History</TabsTrigger>
          <TabsTrigger value="signals">Recent Signals</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Open Positions ({openTrades.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {openTrades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No open positions</p>
                  <p className="text-sm">Enable auto-trading to start executing signals</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Lot Size</TableHead>
                        <TableHead>Entry Price</TableHead>
                        <TableHead>Current P&L</TableHead>
                        <TableHead>Margin</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openTrades.map((trade) => {
                        const currentPnL = currentPrice ? 
                          (trade.trade_type === 'buy' ? 
                            (currentPrice - trade.entry_price) * trade.position_size :
                            (trade.entry_price - currentPrice) * trade.position_size) : 0;
                        
                        return (
                          <TableRow key={trade.id}>
                            <TableCell className="font-medium">{trade.symbol}</TableCell>
                            <TableCell>
                              <Badge variant={trade.trade_type === 'buy' ? 'default' : 'destructive'}>
                                {trade.trade_type.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>{trade.lot_size.toFixed(2)}</TableCell>
                            <TableCell>{trade.entry_price.toFixed(5)}</TableCell>
                            <TableCell className={currentPnL >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {currencySymbol}{currentPnL.toFixed(2)}
                            </TableCell>
                            <TableCell>{currencySymbol}{(trade.margin_required || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(trade.entry_time).toLocaleTimeString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Trade History ({closedTrades.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {closedTrades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No completed trades yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Lot Size</TableHead>
                        <TableHead>Entry</TableHead>
                        <TableHead>Exit</TableHead>
                        <TableHead>P&L</TableHead>
                        <TableHead>Pips</TableHead>
                        <TableHead>Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {closedTrades.slice(0, 50).map((trade) => (
                        <TableRow key={trade.id}>
                          <TableCell className="font-medium">{trade.symbol}</TableCell>
                          <TableCell>
                            <Badge variant={trade.trade_type === 'buy' ? 'default' : 'destructive'}>
                              {trade.trade_type.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{trade.lot_size.toFixed(2)}</TableCell>
                          <TableCell>{trade.entry_price.toFixed(5)}</TableCell>
                          <TableCell>{trade.exit_price?.toFixed(5)}</TableCell>
                          <TableCell className={(trade.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {currencySymbol}{(trade.pnl || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className={(trade.pip_pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {(trade.pip_pnl || 0).toFixed(1)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {trade.holding_time_minutes ? `${Math.floor(trade.holding_time_minutes / 60)}h ${trade.holding_time_minutes % 60}m` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Recent Signals ({recentSignals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentSignals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No signals generated yet</p>
                  <p className="text-sm">Signals will appear here when market conditions align</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {recentSignals.map((signal) => (
                      <Card key={signal.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant={signal.signal_type === 'buy' ? 'default' : 'destructive'}>
                              {signal.signal_type.toUpperCase()}
                            </Badge>
                            <span className="font-medium">{signal.pair}</span>
                            <Badge variant="outline">Score: {signal.confluence_score}</Badge>
                            {signal.was_executed && (
                              <Badge variant="secondary">Executed</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(signal.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          Entry: {signal.entry_price.toFixed(5)} • SL: {signal.stop_loss.toFixed(5)} • TP: {signal.take_profit.toFixed(5)}
                        </div>
                        <div className="mt-1 text-sm">
                          {signal.description}
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Performance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Trades:</span>
                  <span className="font-medium">{performanceMetrics.totalTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Best Trade:</span>
                  <span className="font-medium text-green-600">
                    {currencySymbol}{performanceMetrics.bestTrade.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Worst Trade:</span>
                  <span className="font-medium text-red-600">
                    {currencySymbol}{performanceMetrics.worstTrade.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Average Hold Time:</span>
                  <span className="font-medium">
                    {Math.floor(performanceMetrics.averageHoldingTime / 60)}h {Math.floor(performanceMetrics.averageHoldingTime % 60)}m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total P&L:</span>
                  <span className={`font-medium ${performanceMetrics.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {currencySymbol}{performanceMetrics.totalPnl.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Risk Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Daily Loss Limit:</span>
                  <span className="font-medium">{currencySymbol}{portfolio.daily_loss_limit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Max Drawdown Limit:</span>
                  <span className="font-medium">{portfolio.max_drawdown_limit}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Margin Call Level:</span>
                  <span className="font-medium">{portfolio.margin_call_level}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Stop Out Level:</span>
                  <span className="font-medium">{portfolio.stop_out_level}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Daily P&L Today:</span>
                  <span className={`font-medium ${portfolio.daily_pnl_today >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {currencySymbol}{portfolio.daily_pnl_today.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Account Type:</span>
                  <span className="font-medium">{portfolio.account_type.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Currency:</span>
                  <span className="font-medium">{portfolio.account_currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Initial Deposit:</span>
                  <span className="font-medium">{currencySymbol}{portfolio.initial_deposit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total Deposits:</span>
                  <span className="font-medium">{currencySymbol}{portfolio.deposits_total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total Withdrawals:</span>
                  <span className="font-medium">{currencySymbol}{portfolio.withdrawals_total.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Portfolio Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="destructive" 
                  onClick={resetPortfolio}
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Portfolio
                </Button>
                <p className="text-xs text-muted-foreground">
                  This will close all positions and reset your portfolio to initial state.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ShadowTradingDashboardV3;