import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Target, Award, AlertCircle } from 'lucide-react';

interface SignalOutcome {
  signal_id: string;
  signal_type: string;
  confluence_score: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  was_executed: boolean;
  outcome?: 'win' | 'loss' | 'pending';
  actual_exit_price?: number;
  pnl?: number;
  pnl_pips?: number;
  created_at: string;
}

interface PerformanceStats {
  totalSignals: number;
  executedSignals: number;
  winningSignals: number;
  losingSignals: number;
  winRate: number;
  avgPnL: number;
  totalPnL: number;
  avgPips: number;
  bestTrade: number;
  worstTrade: number;
}

const SignalOutcomeTracker: React.FC = () => {
  const [outcomes, setOutcomes] = useState<SignalOutcome[]>([]);
  const [stats, setStats] = useState<PerformanceStats>({
    totalSignals: 0,
    executedSignals: 0,
    winningSignals: 0,
    losingSignals: 0,
    winRate: 0,
    avgPnL: 0,
    totalPnL: 0,
    avgPips: 0,
    bestTrade: 0,
    worstTrade: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSignalOutcomes();
    calculateStats();

    // Real-time updates for trade outcomes
    const tradesChannel = supabase
      .channel('trade-outcomes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shadow_trades'
      }, () => {
        fetchSignalOutcomes();
        calculateStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tradesChannel);
    };
  }, []);

  const fetchSignalOutcomes = async () => {
    try {
      // Get trading signals with execution data
      const { data: signals, error } = await supabase
        .from('trading_signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get corresponding trade outcomes
      const signalOutcomes: SignalOutcome[] = [];
      
      for (const signal of signals || []) {
        const { data: trades } = await supabase
          .from('shadow_trades')
          .select('profit, profit_pips, exit_price, status')
          .ilike('comment', `%${signal.signal_id}%`);

        const trade = trades?.[0];
        const outcome: SignalOutcome = {
          signal_id: signal.signal_id,
          signal_type: signal.signal_type,
          confluence_score: signal.confluence_score,
          entry_price: signal.entry_price,
          stop_loss: signal.stop_loss,
          take_profit: signal.take_profit,
          was_executed: signal.was_executed,
          created_at: signal.created_at
        };

        if (trade) {
          if (trade.status === 'closed') {
            outcome.outcome = trade.profit > 0 ? 'win' : 'loss';
            outcome.actual_exit_price = trade.exit_price;
            outcome.pnl = trade.profit;
            outcome.pnl_pips = trade.profit_pips;
          } else {
            outcome.outcome = 'pending';
          }
        }

        signalOutcomes.push(outcome);
      }

      setOutcomes(signalOutcomes);
    } catch (error) {
      console.error('Failed to fetch signal outcomes:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = async () => {
    try {
      // Get completed trades with signal data
      const { data: completedTrades } = await supabase
        .from('shadow_trades')
        .select('profit, profit_pips, comment')
        .eq('status', 'closed')
        .not('comment', 'is', null);

      const { data: allSignals } = await supabase
        .from('trading_signals')
        .select('was_executed');

      if (completedTrades && allSignals) {
        const total = allSignals.length;
        const executed = allSignals.filter(s => s.was_executed).length;
        const winning = completedTrades.filter(t => t.profit > 0).length;
        const losing = completedTrades.filter(t => t.profit <= 0).length;
        const totalPnL = completedTrades.reduce((sum, t) => sum + t.profit, 0);
        const totalPips = completedTrades.reduce((sum, t) => sum + t.profit_pips, 0);
        const best = Math.max(...completedTrades.map(t => t.profit), 0);
        const worst = Math.min(...completedTrades.map(t => t.profit), 0);

        setStats({
          totalSignals: total,
          executedSignals: executed,
          winningSignals: winning,
          losingSignals: losing,
          winRate: executed > 0 ? (winning / executed) * 100 : 0,
          avgPnL: executed > 0 ? totalPnL / executed : 0,
          totalPnL,
          avgPips: executed > 0 ? totalPips / executed : 0,
          bestTrade: best,
          worstTrade: worst
        });
      }
    } catch (error) {
      console.error('Failed to calculate stats:', error);
    }
  };

  const getOutcomeColor = (outcome?: string) => {
    switch (outcome) {
      case 'win': return 'text-green-500';
      case 'loss': return 'text-red-500';
      case 'pending': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  const getOutcomeBadge = (outcome?: string, executed?: boolean) => {
    if (!executed) return <Badge variant="secondary">Not Executed</Badge>;
    switch (outcome) {
      case 'win': return <Badge className="bg-green-500">Win</Badge>;
      case 'loss': return <Badge variant="destructive">Loss</Badge>;
      case 'pending': return <Badge variant="outline">Pending</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className={`text-2xl font-bold ${stats.winRate >= 60 ? 'text-green-500' : stats.winRate >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {stats.winRate.toFixed(1)}%
                </p>
              </div>
              <Award className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total P&L</p>
                <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${stats.totalPnL.toFixed(0)}
                </p>
              </div>
              <Target className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg P&L</p>
                <p className={`text-2xl font-bold ${stats.avgPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${stats.avgPnL.toFixed(0)}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Best Trade</p>
                <p className="text-2xl font-bold text-green-500">
                  ${stats.bestTrade.toFixed(0)}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Worst Trade</p>
                <p className="text-2xl font-bold text-red-500">
                  ${stats.worstTrade.toFixed(0)}
                </p>
              </div>
              <TrendingDown className="h-6 w-6 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signal Outcomes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Signal Outcome Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {outcomes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No signal outcomes found.</p>
              </div>
            ) : (
              outcomes.map((outcome) => (
                <div key={outcome.signal_id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={outcome.signal_type === 'buy' ? 'default' : 'destructive'}>
                        {outcome.signal_type.toUpperCase()}
                      </Badge>
                      {getOutcomeBadge(outcome.outcome, outcome.was_executed)}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">Score: {outcome.confluence_score}</p>
                      {outcome.pnl !== undefined && (
                        <p className={`text-sm font-medium ${outcome.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ${outcome.pnl.toFixed(2)} ({outcome.pnl_pips?.toFixed(1)} pips)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Entry</p>
                      <p className="font-medium">{outcome.entry_price}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stop Loss</p>
                      <p className="font-medium">{outcome.stop_loss}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Take Profit</p>
                      <p className="font-medium">{outcome.take_profit}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Exit</p>
                      <p className="font-medium">
                        {outcome.actual_exit_price || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Signal ID: {outcome.signal_id} • {new Date(outcome.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignalOutcomeTracker;