import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useGlobalShadowTrading } from '@/hooks/useGlobalShadowTrading';
import { globalShadowTradingEngine } from '@/services/globalShadowTradingEngine';
import { useMLModel } from '@/hooks/useMLModel';

import { PerformanceMetricsPanel } from '@/components/enhanced/PerformanceMetricsPanel';
import { PositionsTable } from '@/components/enhanced/PositionsTable';
import { TradeHistoryTable } from '@/components/enhanced/TradeHistoryTable';
import { TradingControlPanel } from '@/components/enhanced/TradingControlPanel';
import { ResetValidationPanel } from '@/components/enhanced/ResetValidationPanel';
import { ResetReportPanel } from '@/components/enhanced/ResetReportPanel';
import { ExitIntelligenceStatus } from '@/components/enhanced/ExitIntelligenceStatus';
import { SignalControlsPanel } from '@/components/enhanced/SignalControlsPanel';

import {
  Activity, TrendingUp, DollarSign, Target, AlertCircle, Zap, Wifi,
  RefreshCw, Settings, BarChart3, Clock, Shield, Brain
} from 'lucide-react';

const ShadowTradingDashboardUnified: React.FC = () => {
  const {
    account, openTrades, tradeHistory, performanceMetrics, marketData,
    isLoading, isExecutingTrade, isClosingTrade, isRefreshing, isResetting, error,
    executeTrade, closeTrade, resetAccount, refreshData,
    toggleAutoTrading, updateMaxOpenTrades, calculateOptimalLotSize, validateResetCompletion,
    lastResetReport,
  } = useGlobalShadowTrading();

  const { toast } = useToast();
  const { mlModelStatus, mlPerformance, mlAnalytics, isTrainingML, triggerMLTraining } = useMLModel();
  const [maxTradesInput, setMaxTradesInput] = useState(account?.max_open_positions || 50);
  const [resetReportOpen, setResetReportOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
        <Button onClick={refreshData} size="sm">Retry</Button>
      </div>
    );
  }

  const dailyPnL = account?.floating_pnl || 0;
  const totalReturn = account ? ((account.balance - 100) / 100) * 100 : 0;
  const marginLevel = account?.margin_level || 0;
  const openPositionsCount = openTrades.length;

  const getPnLColor = (value: number) => {
    if (value > 0) return "text-emerald-500";
    if (value < 0) return "text-red-500";
    return "text-muted-foreground";
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      `⚠️ RESET ACCOUNT?\n\nBalance: $${(account?.balance || 0).toFixed(2)}\nOpen: ${openTrades.length} trades\n\nThis deletes ALL trades, exec logs, exit intelligence, intelligent targets, and learning state (module_performance, learning_outcomes, adaptive_thresholds, discovered_patterns, system_learning_stats). master_signals + rejection logs are PRESERVED as audit trail. Balance resets to $100.`
    );
    if (!confirmed) return;
    try {
      const report = await resetAccount();
      if (report) setResetReportOpen(true);
    } catch {
      toast({ variant: "destructive", title: "Reset Failed" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Account Overview - Money Theme Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-primary money-card money-glow">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">💰 Balance</p>
            <div className="text-xl font-bold font-mono text-primary money-text-glow">${account?.balance?.toFixed(2) || '0.00'}</div>
            <p className="text-[10px] text-muted-foreground">Peak: ${account?.peak_balance?.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary/70 money-card">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">💎 Equity</p>
            <div className="text-xl font-bold font-mono">${account?.equity?.toFixed(2) || '0.00'}</div>
            <p className={`text-[10px] ${getPnLColor(dailyPnL)}`}>
              Floating: {dailyPnL >= 0 ? '+' : ''}${dailyPnL.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-money-green money-card">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">🎯 Win Rate</p>
            <div className="text-xl font-bold font-mono text-primary">{(account?.win_rate || 0).toFixed(1)}%</div>
            <p className="text-[10px] text-muted-foreground">
              {account?.winning_trades || 0}W / {account?.losing_trades || 0}L
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-money-gold gold-border money-card">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">🤑 Return</p>
            <div className={`text-xl font-bold font-mono ${totalReturn > 0 ? 'text-primary money-text-glow' : getPnLColor(totalReturn)}`}>
              {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(3)}%
            </div>
            <p className="text-[10px] text-muted-foreground">
              {account?.total_trades || 0} trades | PF: {(account?.profit_factor || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Bar */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <Badge variant={marketData ? "default" : "secondary"} className="text-[10px] gap-1">
          <Wifi className="h-2.5 w-2.5" />
          {marketData ? "Live" : "Offline"}
        </Badge>
        <span className="text-xs font-mono text-muted-foreground">
          EUR/USD {marketData?.price?.toFixed(5) || '—'}
        </span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground">
          {openPositionsCount} open · Margin: {marginLevel.toFixed(0)}% · Free: ${(account?.free_margin || 0).toFixed(0)}
        </span>
        <div className="ml-auto flex gap-1.5">
          <Button onClick={refreshData} variant="ghost" size="sm" disabled={isRefreshing} className="h-7 px-2 text-xs">
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={toggleAutoTrading} variant={account?.auto_trading_enabled ? "default" : "ghost"} size="sm" className="h-7 px-2 text-xs gap-1">
            <Zap className="h-3 w-3" />
            {account?.auto_trading_enabled ? "Auto ON" : "Auto OFF"}
          </Button>
        </div>
      </div>

      {/* Phase 1 Fix 10: Signal inversion toggle + module health */}
      <SignalControlsPanel />

      {/* Main Tabs */}
      <Tabs defaultValue="positions" className="space-y-4">

        <TabsList className="inline-flex h-9 gap-1 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="positions" className="text-xs px-3 gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Positions ({openPositionsCount})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs px-3 gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            History
          </TabsTrigger>
          <TabsTrigger value="trading" className="text-xs px-3 gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Trade
          </TabsTrigger>
          <TabsTrigger value="overview" className="text-xs px-3 gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="ml-analytics" className="text-xs px-3 gap-1.5">
            <Brain className="h-3.5 w-3.5" />
            ML
          </TabsTrigger>
          <TabsTrigger value="account" className="text-xs px-3 gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Positions */}
        <TabsContent value="positions">
          <PositionsTable
            openTrades={openTrades}
            isClosingTrade={isClosingTrade}
            onCloseTrade={async (tradeId) => { await closeTrade(tradeId); }}
          />
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          <TradeHistoryTable tradeHistory={tradeHistory} />
        </TabsContent>

        {/* Trading */}
        <TabsContent value="trading" className="space-y-4">
          <TradingControlPanel
            marketData={marketData}
            isExecutingTrade={isExecutingTrade}
            onExecuteTrade={async (request) => { await executeTrade(request); }}
            onCalculateOptimalLotSize={calculateOptimalLotSize}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Market Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Bid</p>
                    <p className="text-lg font-mono font-bold">{marketData?.bid?.toFixed(5) || '—'}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Ask</p>
                    <p className="text-lg font-mono font-bold">{marketData?.ask?.toFixed(5) || '—'}</p>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-3">
                  <span>Spread: {marketData?.spread?.toFixed(1) || '—'} pips</span>
                  <span>{new Date().toLocaleTimeString()}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Used Margin</p>
                    <p className="text-lg font-bold font-mono">${(account?.used_margin || 0).toFixed(0)}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Free Margin</p>
                    <p className="text-lg font-bold font-mono">${(account?.free_margin || 0).toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PerformanceMetricsPanel account={account} performanceMetrics={performanceMetrics} />
            <ExitIntelligenceStatus />
          </div>
        </TabsContent>

        {/* ML Analytics */}
        <TabsContent value="ml-analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">ML vs Traditional Exits</CardTitle>
              </CardHeader>
              <CardContent>
                {mlAnalytics.comparison.length > 0 ? (
                  <div className="space-y-3">
                    {mlAnalytics.comparison.map((row, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                        <div>
                          <p className="font-medium">{row.metric}</p>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                            <span>ML: <strong className="text-foreground">{row.ml}</strong></span>
                            <span>Trad: <strong className="text-foreground">{row.traditional}</strong></span>
                          </div>
                        </div>
                        <span className={`font-bold ${row.improvement > 0 ? 'text-emerald-500' : row.improvement < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {row.improvement > 0 ? '+' : ''}{row.improvement.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No ML exit data yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Model Versions</CardTitle>
              </CardHeader>
              <CardContent>
                {mlAnalytics.versions.length > 0 ? (
                  <ScrollArea className="h-[250px]">
                    {mlAnalytics.versions.map((v, idx) => (
                      <div key={idx} className="mb-3 p-2 border rounded-lg text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-mono text-xs">{v.version}</span>
                          <Badge variant={v.status === 'Active' ? 'default' : 'secondary'} className="text-[10px]">
                            {v.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                          <span>WR: {v.win_rate.toFixed(1)}%</span>
                          <span>Trades: {v.trades_executed}</span>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No model versions yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Account */}
        <TabsContent value="account" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Account Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Total Trades</Label>
                    <div className="text-xl font-bold">{account?.total_trades || 0}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Win Rate</Label>
                    <div className="text-xl font-bold">{account?.win_rate?.toFixed(1) || '0.0'}%</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Profit Factor</Label>
                    <div className="text-xl font-bold">{account?.profit_factor?.toFixed(2) || '0.00'}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Max Drawdown</Label>
                    <div className="text-xl font-bold">{account?.max_drawdown?.toFixed(2) || '0.00'}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Max Open Positions</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={maxTradesInput}
                      onChange={(e) => setMaxTradesInput(parseInt(e.target.value) || 50)}
                      min="1" max="200"
                      className="h-8"
                    />
                    <Button onClick={() => updateMaxOpenTrades(maxTradesInput)} size="sm" className="h-8">
                      Update
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Auto Trading</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={account?.auto_trading_enabled ? "default" : "secondary"} className="text-[10px]">
                      {account?.auto_trading_enabled ? "ON" : "OFF"}
                    </Badge>
                    <Button onClick={toggleAutoTrading} size="sm" variant="outline" className="h-7 text-xs">Toggle</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Leverage</Label>
                  <span className="text-sm font-medium">1:{account?.leverage || 100}</span>
                </div>
                <Separator />
                <Button onClick={handleReset} variant="destructive" size="sm" disabled={isResetting} className="w-full h-8 text-xs">
                  {isResetting ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                  {isResetting ? 'Resetting...' : 'Reset Account'}
                </Button>
              </CardContent>
            </Card>
          </div>
          <ResetValidationPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ShadowTradingDashboardUnified;
