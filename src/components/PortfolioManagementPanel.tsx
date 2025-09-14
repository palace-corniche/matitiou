import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { portfolioIntelligenceManager } from '@/services/portfolioIntelligenceManager';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';
import { Briefcase, TrendingUp, DollarSign, Target, Settings, AlertTriangle, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Portfolio {
  id: string;
  name: string;
  balance: number;
  allocation: number;
  performance: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export const PortfolioManagementPanel = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([
    { id: '1', name: 'Conservative', balance: 150000, allocation: 40, performance: 8.5, riskLevel: 'low' },
    { id: '2', name: 'Growth', balance: 200000, allocation: 45, performance: 15.2, riskLevel: 'medium' },
    { id: '3', name: 'Aggressive', balance: 100000, allocation: 15, performance: -3.1, riskLevel: 'high' },
  ]);
  
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(portfolios[0]);
  const [rebalancing, setRebalancing] = useState(false);
  const [newAllocation, setNewAllocation] = useState<{ [key: string]: number }>({});
  const { toast } = useToast();

  // Portfolio allocation data for pie chart
  const allocationData = portfolios.map(p => ({
    name: p.name,
    value: p.allocation,
    balance: p.balance
  }));

  // Performance data for charts
  const performanceData = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    conservative: 100000 + i * 150 + Math.random() * 1000,
    growth: 100000 + i * 200 + Math.random() * 2000,
    aggressive: 100000 + i * 100 + Math.random() * 3000 - 1500
  }));

  const riskMetrics = [
    { metric: 'Value at Risk (95%)', value: '$15,000', status: 'good' },
    { metric: 'Maximum Drawdown', value: '8.5%', status: 'warning' },
    { metric: 'Sharpe Ratio', value: '1.85', status: 'good' },
    { metric: 'Beta', value: '0.92', status: 'good' }
  ];

  const runOptimization = async () => {
    setRebalancing(true);
    try {
      // Simulate optimization
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const optimizedAllocations = await portfolioIntelligenceManager.optimizeAllocation(
        portfolios.map(p => ({ symbol: p.name, weight: p.allocation / 100 })),
        { riskTolerance: 0.15, expectedReturn: 0.12 }
      );
      
      toast({
        title: "Optimization Complete",
        description: "Portfolio allocation has been optimized",
      });
    } catch (error) {
      toast({
        title: "Optimization Failed",
        description: "Failed to optimize portfolio allocation",
        variant: "destructive",
      });
    } finally {
      setRebalancing(false);
    }
  };

  const executeRebalance = async () => {
    setRebalancing(true);
    try {
      await portfolioIntelligenceManager.rebalancePortfolio('main-portfolio', newAllocation);
      
      // Update local state
      const updatedPortfolios = portfolios.map(p => ({
        ...p,
        allocation: newAllocation[p.id] || p.allocation
      }));
      setPortfolios(updatedPortfolios);
      
      toast({
        title: "Rebalancing Complete",
        description: "Portfolio has been successfully rebalanced",
      });
    } catch (error) {
      toast({
        title: "Rebalancing Failed",
        description: "Failed to rebalance portfolio",
        variant: "destructive",
      });
    } finally {
      setRebalancing(false);
    }
  };

  const totalBalance = portfolios.reduce((sum, p) => sum + p.balance, 0);
  const weightedPerformance = portfolios.reduce((sum, p) => sum + (p.performance * p.allocation / 100), 0);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8'];

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Portfolio Intelligence Manager
              </CardTitle>
              <CardDescription>
                AI-driven portfolio optimization and management
              </CardDescription>
            </div>
            <Button onClick={runOptimization} disabled={rebalancing}>
              {rebalancing ? "Optimizing..." : "Optimize Portfolio"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                ${totalBalance.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total AUM</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {weightedPerformance.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Weighted Return</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                1.85
              </div>
              <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                8.5%
              </div>
              <div className="text-sm text-muted-foreground">Max Drawdown</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="allocation" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="allocation" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Portfolio Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {portfolios.map((portfolio) => (
                    <div key={portfolio.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{portfolio.name}</span>
                          <Badge variant={
                            portfolio.riskLevel === 'low' ? 'secondary' :
                            portfolio.riskLevel === 'medium' ? 'default' : 'destructive'
                          }>
                            {portfolio.riskLevel} risk
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${portfolio.balance.toLocaleString()}</div>
                          <div className={`text-sm ${portfolio.performance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {portfolio.performance > 0 ? '+' : ''}{portfolio.performance.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <Progress value={portfolio.allocation} className="h-2" />
                      <div className="text-sm text-muted-foreground">
                        {portfolio.allocation}% allocation
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Comparison</CardTitle>
              <CardDescription>
                30-day performance across different portfolio strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="conservative" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="growth" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="aggressive" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {portfolios.map((portfolio) => (
              <Card key={portfolio.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{portfolio.name}</span>
                    <Badge variant={portfolio.performance > 0 ? 'default' : 'destructive'}>
                      {portfolio.performance > 0 ? '+' : ''}{portfolio.performance.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    ${portfolio.balance.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {portfolio.allocation}% of total portfolio
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Risk Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {riskMetrics.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{metric.metric}</div>
                      <div className="text-sm text-muted-foreground">Current value</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{metric.value}</div>
                      <Badge variant={metric.status === 'good' ? 'default' : 'destructive'}>
                        {metric.status === 'good' ? 'Good' : 'Warning'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={portfolios}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="allocation" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Portfolio Optimization
              </CardTitle>
              <CardDescription>
                AI-driven optimization for risk-adjusted returns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="font-medium mb-2">Optimization Objectives</div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Maximize risk-adjusted returns (Sharpe ratio)</li>
                  <li>• Maintain diversification across strategies</li>
                  <li>• Control maximum drawdown below 10%</li>
                  <li>• Adapt to changing market regimes</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="font-medium">Suggested Reallocation</div>
                {portfolios.map((portfolio) => (
                  <div key={portfolio.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{portfolio.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {portfolio.allocation}% → 
                        </span>
                        <Input
                          type="number"
                          className="w-20"
                          value={newAllocation[portfolio.id] || portfolio.allocation}
                          onChange={(e) => setNewAllocation(prev => ({
                            ...prev,
                            [portfolio.id]: parseInt(e.target.value) || 0
                          }))}
                        />
                        <span className="text-sm">%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button onClick={executeRebalance} disabled={rebalancing}>
                  {rebalancing ? "Rebalancing..." : "Execute Rebalance"}
                </Button>
                <Button variant="outline" onClick={runOptimization}>
                  <Settings className="h-4 w-4 mr-2" />
                  Recalculate
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};