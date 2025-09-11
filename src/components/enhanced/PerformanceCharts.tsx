import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Target, Calendar, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceData {
  date: string;
  balance: number;
  equity: number;
  dailyPnL: number;
  trades: number;
  winRate: number;
  drawdown: number;
}

interface TradeAnalytics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
  expectancy: number;
  sharpeRatio: number;
  maxDrawdown: number;
  tradingDays: number;
}

interface PerformanceChartsProps {
  portfolioId?: string;
}

export const PerformanceCharts: React.FC<PerformanceChartsProps> = ({ portfolioId }) => {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [analytics, setAnalytics] = useState<TradeAnalytics | null>(null);

  useEffect(() => {
    if (portfolioId) {
      loadPerformanceData();
      loadTradeAnalytics();
    }
  }, [portfolioId, timeframe]);

  const loadPerformanceData = async () => {
    if (!portfolioId) return;

    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
      startDate.setDate(endDate.getDate() - days);

      const { data, error } = await supabase
        .from('performance_snapshots')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .gte('snapshot_date', startDate.toISOString().split('T')[0])
        .lte('snapshot_date', endDate.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });

      if (error) throw error;

      const formattedData: PerformanceData[] = (data || []).map(item => ({
        date: new Date(item.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        balance: item.balance,
        equity: item.equity,
        dailyPnL: item.daily_pnl,
        trades: item.trades_today,
        winRate: item.win_rate_today,
        drawdown: item.drawdown_percent
      }));

      setPerformanceData(formattedData);
    } catch (error) {
      console.error('Error loading performance data:', error);
      setPerformanceData([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTradeAnalytics = async () => {
    if (!portfolioId) return;

    try {
      // Get portfolio analytics
      const { data: portfolio, error: portfolioError } = await supabase
        .from('shadow_portfolios')
        .select('*')
        .eq('id', portfolioId)
        .single();

      if (portfolioError) throw portfolioError;

      // Get trade history for detailed analytics
      const { data: trades, error: tradesError } = await supabase
        .from('trade_history')
        .select('profit, profit_pips, action_type')
        .eq('portfolio_id', portfolioId)
        .eq('action_type', 'close');

      if (tradesError) throw tradesError;

      const closedTrades = trades || [];
      const profits = closedTrades.map(t => t.profit).filter(p => p !== null);
      const wins = profits.filter(p => p > 0);
      const losses = profits.filter(p => p <= 0);

      const analytics: TradeAnalytics = {
        totalTrades: portfolio.total_trades || 0,
        winningTrades: portfolio.winning_trades || 0,
        losingTrades: portfolio.losing_trades || 0,
        avgWin: portfolio.average_win || 0,
        avgLoss: Math.abs(portfolio.average_loss || 0),
        largestWin: portfolio.largest_win || 0,
        largestLoss: Math.abs(portfolio.largest_loss || 0),
        profitFactor: portfolio.profit_factor || 0,
        expectancy: portfolio.expectancy || 0,
        sharpeRatio: portfolio.sharpe_ratio || 0,
        maxDrawdown: portfolio.max_drawdown || 0,
        tradingDays: portfolio.trading_days || 0
      };

      setAnalytics(analytics);
    } catch (error) {
      console.error('Error loading trade analytics:', error);
      setAnalytics(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getPerformanceColor = (value: number) => {
    return value >= 0 ? 'hsl(var(--bullish))' : 'hsl(var(--bearish))';
  };

  const pieData = analytics ? [
    { name: 'Winning Trades', value: analytics.winningTrades, color: 'hsl(var(--bullish))' },
    { name: 'Losing Trades', value: analytics.losingTrades, color: 'hsl(var(--bearish))' }
  ] : [];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with timeframe selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Performance Analytics</h3>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={timeframe} onValueChange={setTimeframe}>
            <TabsList>
              <TabsTrigger value="7d">7D</TabsTrigger>
              <TabsTrigger value="30d">30D</TabsTrigger>
              <TabsTrigger value="90d">90D</TabsTrigger>
              <TabsTrigger value="1y">1Y</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                  <p className="text-2xl font-bold">{analytics.totalTrades}</p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold">
                    {analytics.totalTrades > 0 ? formatPercentage((analytics.winningTrades / analytics.totalTrades) * 100) : '0%'}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-bullish" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Profit Factor</p>
                  <p className="text-2xl font-bold">{analytics.profitFactor.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Max Drawdown</p>
                  <p className="text-2xl font-bold text-bearish">
                    {formatPercentage(analytics.maxDrawdown)}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-bearish" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <Tabs defaultValue="equity" className="w-full">
        <TabsList>
          <TabsTrigger value="equity">Equity Curve</TabsTrigger>
          <TabsTrigger value="daily-pnl">Daily P&L</TabsTrigger>
          <TabsTrigger value="drawdown">Drawdown</TabsTrigger>
          <TabsTrigger value="trade-distribution">Trade Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="equity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Account Balance & Equity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Balance"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="equity" 
                    stroke="hsl(var(--bullish))" 
                    strokeWidth={2}
                    name="Equity"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily-pnl" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Daily Profit & Loss</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Daily P&L']}
                  />
                  <Bar 
                    dataKey="dailyPnL" 
                    fill="hsl(var(--primary))"
                    name="Daily P&L"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drawdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Drawdown Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value: number) => [formatPercentage(value), 'Drawdown']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="drawdown" 
                    stroke="hsl(var(--bearish))" 
                    fill="hsl(var(--bearish-light))"
                    name="Drawdown"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trade-distribution" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Win/Loss Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Trade Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Average Win:</span>
                      <span className="font-medium text-bullish">{formatCurrency(analytics.avgWin)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Average Loss:</span>
                      <span className="font-medium text-bearish">{formatCurrency(analytics.avgLoss)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Largest Win:</span>
                      <span className="font-medium text-bullish">{formatCurrency(analytics.largestWin)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Largest Loss:</span>
                      <span className="font-medium text-bearish">{formatCurrency(analytics.largestLoss)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Expectancy:</span>
                      <span className="font-medium">{formatCurrency(analytics.expectancy)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Sharpe Ratio:</span>
                      <span className="font-medium">{analytics.sharpeRatio.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};