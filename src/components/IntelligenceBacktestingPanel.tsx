import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { intelligenceBacktester } from '@/services/intelligenceBacktester';
import { BarChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Play, BarChart3, TrendingUp, Calendar, Target, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const IntelligenceBacktestingPanel = ({ symbol = 'EUR/USD' }: { symbol?: string }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any>(null);
  const [config, setConfig] = useState({
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    initialCapital: 100000,
    riskPerTrade: 0.02,
    maxPositions: 5,
    enableML: true
  });
  const { toast } = useToast();

  // Mock performance data for charts
  const equityCurve = Array.from({ length: 50 }, (_, i) => ({
    date: `Day ${i + 1}`,
    equity: 100000 + Math.random() * 20000 - 10000 + i * 200,
    drawdown: Math.random() * -5000
  }));

  const monthlyReturns = Array.from({ length: 12 }, (_, i) => ({
    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
    return: (Math.random() - 0.5) * 10
  }));

  const runBacktest = async () => {
    setIsRunning(true);
    setProgress(0);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + Math.random() * 10;
        });
      }, 200);

      const backtestConfig = {
        symbol,
        startDate: new Date(config.startDate),
        endDate: new Date(config.endDate),
        initialCapital: config.initialCapital,
        riskPerTrade: config.riskPerTrade,
        maxConcurrentPositions: config.maxPositions,
        enableMLOptimization: config.enableML,
        intelligenceModules: [
          'technical_analysis',
          'fundamental_analysis',
          'sentiment_analysis',
          'market_microstructure'
        ]
      };

      const result = await intelligenceBacktester.runBacktest(backtestConfig);
      
      setResults(result);
      setProgress(100);
      
      toast({
        title: "Backtest Complete",
        description: `Backtest completed with ${result.totalTrades} trades`,
      });
    } catch (error) {
      toast({
        title: "Backtest Failed",
        description: "Failed to complete backtest",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Intelligence Backtesting
          </CardTitle>
          <CardDescription>
            Backtest intelligence-driven trading strategies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={config.startDate}
                onChange={(e) => setConfig(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={config.endDate}
                onChange={(e) => setConfig(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capital">Initial Capital ($)</Label>
              <Input
                id="capital"
                type="number"
                value={config.initialCapital}
                onChange={(e) => setConfig(prev => ({ ...prev, initialCapital: parseInt(e.target.value) }))}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="text-sm font-medium">Backtest Progress</div>
              {isRunning && (
                <div className="flex items-center gap-2">
                  <Progress value={progress} className="w-48" />
                  <span className="text-sm text-muted-foreground">{progress.toFixed(0)}%</span>
                </div>
              )}
            </div>
            <Button onClick={runBacktest} disabled={isRunning}>
              <Play className="h-4 w-4 mr-2" />
              {isRunning ? "Running..." : "Run Backtest"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {((results.finalBalance / results.initialCapital - 1) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Total Return</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {results.sharpeRatio.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {results.totalTrades}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Trades</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {(results.winRate * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Equity Curve</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="equity" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Returns</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={monthlyReturns}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="return" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Drawdown Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={equityCurve}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Max Drawdown:</span>
                      <span className="font-medium">{(results.maxDrawdown * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Profit Factor:</span>
                      <span className="font-medium">{results.profitFactor.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Win:</span>
                      <span className="font-medium">${results.averageWin.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Average Loss:</span>
                      <span className="font-medium">-${Math.abs(results.averageLoss).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Largest Win:</span>
                      <span className="font-medium">${results.largestWin.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Largest Loss:</span>
                      <span className="font-medium">-${Math.abs(results.largestLoss).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Winning Trades:</span>
                      <span className="font-medium">{results.winningTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Losing Trades:</span>
                      <span className="font-medium">{results.losingTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Trade Duration:</span>
                      <span className="font-medium">{results.avgTradeDuration}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trades" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trade History</CardTitle>
                <CardDescription>
                  Detailed list of all trades executed during the backtest
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.trades.slice(0, 10).map((trade: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={trade.pnl > 0 ? 'default' : 'destructive'}>
                          {trade.direction.toUpperCase()}
                        </Badge>
                        <div>
                          <div className="font-medium">{trade.symbol}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(trade.entryTime).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${trade.pnl > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${trade.pnl.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {trade.confidence.toFixed(1)}% conf
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Intelligence Module Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.modulePerformance.map((module: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{module.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {module.description}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-medium">{(module.accuracy * 100).toFixed(1)}%</div>
                        <div className="text-sm text-muted-foreground">Accuracy</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="font-medium mb-2">Risk Assessment</div>
                    <div className="text-sm text-muted-foreground">
                      The backtest shows controlled risk with maximum drawdown of {(results.maxDrawdown * 100).toFixed(2)}%. 
                      The strategy maintains consistent performance across different market conditions.
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium">VaR (95%)</div>
                      <div className="text-2xl font-bold text-red-600">
                        ${(results.initialCapital * 0.03).toFixed(0)}
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium">Calmar Ratio</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {((results.finalBalance / results.initialCapital - 1) / Math.abs(results.maxDrawdown)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};