import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useShadowTradingV2 } from '@/hooks/useShadowTradingV2';
import { migrateShadowTradingData, checkMigrationStatus } from '@/utils/shadowTradingMigration';
import { useToast } from '@/hooks/use-toast';
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
  Clock
} from 'lucide-react';

const ShadowTradingDashboardV2: React.FC = () => {
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
    resetPortfolio,
    refreshData
  } = useShadowTradingV2();

  const [showMigrationAlert, setShowMigrationAlert] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const { toast } = useToast();

  // Check migration status on mount
  useEffect(() => {
    const migrationStatus = checkMigrationStatus();
    if (migrationStatus.hasLocalData && !migrationStatus.isCompleted) {
      setShowMigrationAlert(true);
    }
  }, []);

  const handleMigration = async () => {
    setIsMigrating(true);
    try {
      const result = await migrateShadowTradingData();
      
      if (result.success) {
        toast({
          title: "Migration Successful",
          description: `Portfolio and ${result.tradesMigrated} trades migrated to cloud`,
        });
        setShowMigrationAlert(false);
      } else {
        toast({
          title: "Migration Issues",
          description: result.errors.join(', '),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Migration Failed",
        description: "Failed to migrate data to cloud",
        variant: "destructive",
      });
    }
    setIsMigrating(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading 24/7 Shadow Trading System...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Migration Alert */}
      {showMigrationAlert && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Local shadow trading data detected. Migrate to the cloud-based 24/7 system?</span>
            <Button 
              size="sm" 
              onClick={handleMigration}
              disabled={isMigrating}
              className="ml-4"
            >
              {isMigrating ? 'Migrating...' : 'Migrate Now'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">24/7 Shadow Trading System</h1>
          <p className="text-muted-foreground mt-1">
            Automated confluence-based virtual trading with real-time execution
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Portfolio Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${portfolio?.equity?.toFixed(2) || '0.00'}
            </div>
            <p className="text-sm text-muted-foreground">
              Balance: ${portfolio?.balance?.toFixed(2) || '0.00'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Open Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {openTrades.length}
            </div>
            <p className="text-sm text-muted-foreground">
              Max: {portfolio?.max_open_positions || 5}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {portfolio?.win_rate?.toFixed(1) || '0.0'}%
            </div>
            <p className="text-sm text-muted-foreground">
              {portfolio?.winning_trades || 0}W / {portfolio?.losing_trades || 0}L
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Total P&L
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              performanceMetrics.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              ${performanceMetrics.totalPnl.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">
              {performanceMetrics.totalTrades} trades
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Market Price & Auto Trading Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Market Status</CardTitle>
              <CardDescription>Real-time EUR/USD price and trading status</CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {currentPrice > 0 ? currentPrice.toFixed(5) : '-.-----'}
                </div>
                <div className="text-sm text-muted-foreground">EUR/USD</div>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4" />
                <span className="text-sm">Auto Trading</span>
                <Switch
                  checked={portfolio?.auto_trading_enabled || false}
                  onCheckedChange={toggleAutoTrading}
                />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="trades" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trades">Open Trades</TabsTrigger>
          <TabsTrigger value="history">Trade History</TabsTrigger>
          <TabsTrigger value="signals">Recent Signals</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="trades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Open Trades ({openTrades.length})</CardTitle>
              <CardDescription>Currently active shadow trades</CardDescription>
            </CardHeader>
            <CardContent>
              {openTrades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No open trades. The system will execute qualifying confluence signals automatically.
                </div>
              ) : (
                <div className="space-y-4">
                  {openTrades.map((trade) => (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <Badge variant={trade.trade_type === 'buy' ? 'default' : 'destructive'}>
                          {trade.trade_type.toUpperCase()}
                        </Badge>
                        <div>
                          <div className="font-medium">{trade.symbol}</div>
                          <div className="text-sm text-muted-foreground">
                            Entry: {trade.entry_price} | Size: ${trade.position_size}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-medium">
                          Score: {trade.confluence_score}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          SL: {trade.stop_loss} | TP: {trade.take_profit}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trade History ({closedTrades.length})</CardTitle>
              <CardDescription>Recently closed shadow trades</CardDescription>
            </CardHeader>
            <CardContent>
              {closedTrades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No closed trades yet
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {closedTrades.slice(0, 20).map((trade) => (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <Badge variant={trade.trade_type === 'buy' ? 'default' : 'destructive'}>
                          {trade.trade_type.toUpperCase()}
                        </Badge>
                        <div>
                          <div className="font-medium">{trade.symbol}</div>
                          <div className="text-sm text-muted-foreground">
                            {trade.entry_price} → {trade.exit_price} | {trade.exit_reason?.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`font-medium ${
                          (trade.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${(trade.pnl || 0).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {trade.holding_time_minutes || 0}min
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Signals ({recentSignals.length})</CardTitle>
              <CardDescription>Latest confluence signals generated by the system</CardDescription>
            </CardHeader>
            <CardContent>
              {recentSignals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No signals generated yet. The system runs every 15 minutes.
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {recentSignals.map((signal) => (
                    <div
                      key={signal.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <Badge 
                          variant={signal.signal_type === 'buy' ? 'default' : 'destructive'}
                        >
                          {signal.signal_type.toUpperCase()}
                        </Badge>
                        <div>
                          <div className="font-medium">{signal.pair}</div>
                          <div className="text-sm text-muted-foreground">
                            {signal.description}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-medium">
                          Score: {signal.confluence_score}%
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          {signal.was_executed ? (
                            <>
                              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                              Executed
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1 text-yellow-500" />
                              Pending
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {portfolio?.profit_factor?.toFixed(2) || '0.00'}
                </div>
                <p className="text-sm text-muted-foreground">
                  Avg Win: ${portfolio?.average_win?.toFixed(2) || '0.00'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {portfolio?.max_drawdown?.toFixed(2) || '0.00'}%
                </div>
                <p className="text-sm text-muted-foreground">
                  Risk per trade: 2.0%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Expectancy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  (portfolio?.expectancy || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${portfolio?.expectancy?.toFixed(2) || '0.00'}
                </div>
                <p className="text-sm text-muted-foreground">
                  Per trade average
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Portfolio Actions</CardTitle>
                  <CardDescription>Reset or configure your shadow trading portfolio</CardDescription>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={resetPortfolio}
                  disabled={isLoading}
                >
                  Reset Portfolio
                </Button>
              </div>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ShadowTradingDashboardV2;