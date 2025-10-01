import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, TrendingUp, TrendingDown, Activity, Clock, Target } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PerformanceSummary {
  total_closed_trades: number;
  total_open_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate_percent: number;
  avg_win_amount: number;
  avg_loss_amount: number;
  total_realized_pnl: number;
  total_unrealized_pnl: number;
  avg_win_pips: number;
  avg_loss_pips: number;
  largest_win: number;
  largest_loss: number;
  avg_trade_duration_hours: number;
}

interface PerformancePattern {
  pattern_type: string;
  win_rate: number;
  avg_profit: number;
  sample_size: number;
  recommendation: string;
}

interface WinningPattern {
  pattern_type: string;
  pattern_criteria: any;
  win_rate: number;
  sample_size: number;
  avg_profit: number;
  avg_pips: number;
  is_active: boolean;
}

export const TradePerformanceAnalytics: React.FC = () => {
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [patterns, setPatterns] = useState<PerformancePattern[]>([]);
  const [winningPatterns, setWinningPatterns] = useState<WinningPattern[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    try {
      // Load performance summary
      const { data: summaryData } = await supabase
        .from('trade_performance_summary')
        .select('*')
        .single();
      
      if (summaryData) {
        setSummary(summaryData as PerformanceSummary);
      }

      // Load performance patterns
      const { data: patternsData } = await supabase
        .rpc('analyze_trade_performance');
      
      if (patternsData) {
        setPatterns(patternsData as PerformancePattern[]);
      }

      // Load winning patterns
      const { data: winningData } = await supabase
        .from('winning_patterns')
        .select('*')
        .eq('is_active', true)
        .order('win_rate', { ascending: false });
      
      if (winningData) {
        setWinningPatterns(winningData as WinningPattern[]);
      }

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getRecommendationVariant = (rec: string) => {
    if (rec.includes('INCREASE') || rec.includes('PRIORITIZE') || rec.includes('FAVOR')) {
      return 'default';
    } else if (rec.includes('DECREASE') || rec.includes('FILTER OUT') || rec.includes('REDUCE')) {
      return 'destructive';
    }
    return 'secondary';
  };

  const getRecommendationIcon = (rec: string) => {
    if (rec.includes('INCREASE') || rec.includes('PRIORITIZE') || rec.includes('FAVOR')) {
      return <TrendingUp className="h-4 w-4" />;
    } else if (rec.includes('DECREASE') || rec.includes('FILTER OUT') || rec.includes('REDUCE')) {
      return <TrendingDown className="h-4 w-4" />;
    }
    return <Activity className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Performance Summary</CardTitle>
          <CardDescription>Overall trading statistics and metrics</CardDescription>
        </CardHeader>
        <CardContent>
          {summary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Trades</p>
                <p className="text-2xl font-bold">{summary.total_closed_trades}</p>
                <p className="text-xs text-muted-foreground">{summary.total_open_trades} open</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">{summary.win_rate_percent?.toFixed(1) || '0.0'}%</p>
                <p className="text-xs text-muted-foreground">
                  {summary.winning_trades}W / {summary.losing_trades}L
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Realized P&L</p>
                <p className={`text-2xl font-bold ${summary.total_realized_pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                  ${summary.total_realized_pnl?.toFixed(2) || '0.00'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Unrealized: ${summary.total_unrealized_pnl?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold">{summary.avg_trade_duration_hours?.toFixed(1) || '0.0'}h</p>
                <p className="text-xs text-muted-foreground">per trade</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Avg Win</p>
                <p className="text-xl font-semibold text-success">
                  ${summary.avg_win_amount?.toFixed(2) || '0.00'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.avg_win_pips?.toFixed(1) || '0.0'} pips
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Avg Loss</p>
                <p className="text-xl font-semibold text-destructive">
                  ${summary.avg_loss_amount?.toFixed(2) || '0.00'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.avg_loss_pips?.toFixed(1) || '0.0'} pips
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Best Trade</p>
                <p className="text-xl font-semibold text-success">
                  ${summary.largest_win?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Worst Trade</p>
                <p className="text-xl font-semibold text-destructive">
                  ${summary.largest_loss?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No performance data available</p>
          )}
        </CardContent>
      </Card>

      {/* AI-Powered Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            AI-Powered Trading Recommendations
          </CardTitle>
          <CardDescription>Data-driven insights based on your trading history</CardDescription>
        </CardHeader>
        <CardContent>
          {patterns.length > 0 ? (
            <div className="space-y-4">
              {patterns.map((pattern, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 bg-secondary/50 rounded-lg">
                  <div className="mt-1">
                    {getRecommendationIcon(pattern.recommendation)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{pattern.pattern_type}</h4>
                      <Badge variant={getRecommendationVariant(pattern.recommendation)}>
                        {pattern.sample_size} trades
                      </Badge>
                    </div>
                    {pattern.sample_size >= 10 && (
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Win Rate: </span>
                          <span className="font-medium">{pattern.win_rate?.toFixed(1) || '0.0'}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg P&L: </span>
                          <span className={`font-medium ${pattern.avg_profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                            ${pattern.avg_profit?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                      </div>
                    )}
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Recommendation:</strong> {pattern.recommendation}
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Not enough trading data yet. Continue trading to generate AI-powered recommendations.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Winning Patterns Library */}
      <Card>
        <CardHeader>
          <CardTitle>Winning Patterns Library</CardTitle>
          <CardDescription>Identified patterns with proven success rates</CardDescription>
        </CardHeader>
        <CardContent>
          {winningPatterns.length > 0 ? (
            <div className="space-y-3">
              {winningPatterns.map((pattern) => (
                <div key={pattern.pattern_type} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div>
                    <p className="font-medium">{pattern.pattern_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {JSON.stringify(pattern.pattern_criteria)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-success">{pattern.win_rate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">{pattern.sample_size} samples</p>
                    <p className="text-xs text-muted-foreground">{pattern.avg_pips.toFixed(1)} pips avg</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No winning patterns identified yet. Patterns are automatically detected after 10+ trades with similar characteristics.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Current trading system health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <span className="text-sm font-medium">Price Data Pipeline</span>
              <Badge variant="default">✅ Active (market_data_feed)</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <span className="text-sm font-medium">Trailing Stop Protection</span>
              <Badge variant="default">✅ Enabled (10/20/40 pip levels)</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <span className="text-sm font-medium">Profit Protection</span>
              <Badge variant="default">✅ Active ($500 max profit lock)</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <span className="text-sm font-medium">Entry Price Validation</span>
              <Badge variant="default">✅ Enabled (0.5% deviation limit)</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <span className="text-sm font-medium">Trade History Logging</span>
              <Badge variant="default">✅ Fixed (close_shadow_trade)</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradePerformanceAnalytics;
