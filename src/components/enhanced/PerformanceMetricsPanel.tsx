import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  AlertTriangle,
  Zap,
  BarChart3,
  Percent,
  DollarSign,
  Clock,
  Shield
} from 'lucide-react';
import { GlobalTradingAccount, GlobalPerformanceMetrics } from '@/services/globalShadowTradingEngine';

interface PerformanceMetricsPanelProps {
  account: GlobalTradingAccount | null;
  performanceMetrics: GlobalPerformanceMetrics | null;
  className?: string;
}

export const PerformanceMetricsPanel: React.FC<PerformanceMetricsPanelProps> = ({
  account,
  performanceMetrics,
  className = ""
}) => {
  if (!account) return null;

  const getPerformanceColor = (value: number, isPositive: boolean = true) => {
    if (value === 0) return "text-muted-foreground";
    return (isPositive ? value > 0 : value < 0) ? "text-green-500" : "text-red-500";
  };

  // Phase 4: Enhanced Risk Level Calculation
  const getRiskLevel = (drawdown: number, marginLevel: number) => {
    // Critical risk: High drawdown OR low margin
    if (drawdown > 20 || marginLevel < 100) {
      return { level: "Critical", color: "bg-red-600", variant: "destructive" as const };
    }
    // High risk: Moderate drawdown OR concerning margin
    if (drawdown > 10 || marginLevel < 200) {
      return { level: "High", color: "bg-red-500", variant: "destructive" as const };
    }
    // Medium risk: Some drawdown OR moderate margin pressure
    if (drawdown > 5 || marginLevel < 500) {
      return { level: "Medium", color: "bg-yellow-500", variant: "secondary" as const };
    }
    // Low risk: Healthy metrics
    return { level: "Low", color: "bg-green-500", variant: "default" as const };
  };

  const riskLevel = getRiskLevel(
    account.current_drawdown || account.max_drawdown || 0,
    account.margin_level || 0
  );
  const dailyPnL = account.floating_pnl || 0;
  const totalReturn = ((account.balance - 100) / 100) * 100;
  const marginUtilization = ((account.used_margin || 0) / (account.balance || 1)) * 100;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Return</p>
                <div className={`text-2xl font-bold ${getPerformanceColor(totalReturn)}`}>
                  {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
                </div>
              </div>
              <div className={`p-2 rounded-full ${totalReturn >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {totalReturn >= 0 ? 
                  <TrendingUp className="h-4 w-4 text-green-600" /> : 
                  <TrendingDown className="h-4 w-4 text-red-600" />
                }
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Daily P&L</p>
                <div className={`text-2xl font-bold ${getPerformanceColor(dailyPnL)}`}>
                  ${dailyPnL >= 0 ? '+' : ''}{dailyPnL.toFixed(2)}
                </div>
              </div>
              <div className="p-2 rounded-full bg-blue-100">
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                <div className="text-2xl font-bold text-primary">
                  {(account.win_rate || 0).toFixed(1)}%
                </div>
              </div>
              <div className="p-2 rounded-full bg-purple-100">
                <Target className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 border-l-${riskLevel.color.replace('bg-', '')}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Risk Level</p>
                <div className="flex items-center gap-2">
                  <Badge variant={riskLevel.variant}>{riskLevel.level}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {(account.max_drawdown || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="p-2 rounded-full bg-yellow-100">
                <Shield className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trading Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Trading Performance
            </CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Trades</p>
                <p className="text-2xl font-bold">{account.total_trades || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold text-primary">{(account.win_rate || 0).toFixed(1)}%</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Winning Trades</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{account.winning_trades || 0}</span>
                  <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ 
                        width: `${((account.winning_trades || 0) / Math.max(account.total_trades || 1, 1)) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Losing Trades</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{account.losing_trades || 0}</span>
                  <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 transition-all duration-300"
                      style={{ 
                        width: `${((account.losing_trades || 0) / Math.max(account.total_trades || 1, 1)) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Profit Factor</p>
                <p className="font-semibold">{(account.profit_factor || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Sharpe Ratio</p>
                <p className="font-semibold">{(account.sharpe_ratio || 0).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Risk Management
            </CardTitle>
            <CardDescription>Risk metrics and exposure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Margin Utilization</span>
                  <span className="text-sm font-medium">{marginUtilization.toFixed(1)}%</span>
                </div>
                <Progress value={Math.min(marginUtilization, 100)} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Max Drawdown</span>
                  <span className="text-sm font-medium">{(account.max_drawdown || 0).toFixed(2)}%</span>
                </div>
                <Progress 
                  value={Math.min(account.max_drawdown || 0, 50)} 
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Current Drawdown</span>
                  <span className="text-sm font-medium">{(account.current_drawdown || 0).toFixed(2)}%</span>
                </div>
                <Progress 
                  value={Math.min(account.current_drawdown || 0, 50)} 
                  className="h-2"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Peak Balance</span>
                <span className="font-semibold">${(account.peak_balance || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Max Equity</span>
                <span className="font-semibold">${(account.max_equity || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Free Margin</span>
                <span className="font-semibold">${(account.free_margin || 0).toFixed(2)}</span>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Largest Win</p>
                <p className="font-semibold text-green-600">${(account.largest_win || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Largest Loss</p>
                <p className="font-semibold text-red-600">-${(account.largest_loss || 0).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};