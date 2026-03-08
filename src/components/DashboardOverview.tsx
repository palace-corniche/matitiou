import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGlobalShadowTrading } from '@/hooks/useGlobalShadowTrading';
import { untypedSupabase as supabase } from '@/integrations/supabase/untypedClient';
import {
  DollarSign, TrendingUp, TrendingDown, Target, Clock, Activity,
  ArrowUpRight, ArrowDownRight, BarChart3
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface RecentSignal {
  id: string;
  symbol: string;
  signal_type: string;
  final_confidence: number;
  confluence_score: number;
  contributing_modules: string[];
  created_at: string;
  status: string;
}

export const DashboardOverview: React.FC = () => {
  const { account, openTrades, tradeHistory, isLoading } = useGlobalShadowTrading();
  const [signals, setSignals] = useState<RecentSignal[]>([]);
  const [loadingSignals, setLoadingSignals] = useState(true);

  useEffect(() => {
    const fetchSignals = async () => {
      const { data } = await supabase
        .from('master_signals')
        .select('id, symbol, signal_type, final_confidence, confluence_score, contributing_modules, created_at, status')
        .order('created_at', { ascending: false })
        .limit(8);
      setSignals(data || []);
      setLoadingSignals(false);
    };
    fetchSignals();
  }, []);

  const recentTrades = (tradeHistory || []).slice(0, 6);

  // Build equity curve from trade history
  const equityCurve = React.useMemo(() => {
    if (!tradeHistory?.length) return [];
    const sorted = [...tradeHistory].sort((a, b) => 
      new Date(a.exit_time || a.created_at).getTime() - new Date(b.exit_time || b.created_at).getTime()
    );
    let runningPnl = 0;
    return sorted.map((t, i) => {
      runningPnl += (t.pnl || 0);
      return { trade: i + 1, pnl: +runningPnl.toFixed(2) };
    });
  }, [tradeHistory]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  const totalPnl = (account?.balance || 10000) - 10000; // derived from balance vs initial

  const stats = [
    {
      label: 'Balance',
      value: `$${(account?.balance || 10000).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      change: totalPnl,
    },
    {
      label: 'Total P&L',
      value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`,
      icon: totalPnl >= 0 ? TrendingUp : TrendingDown,
      positive: totalPnl >= 0,
    },
    {
      label: 'Win Rate',
      value: `${(account?.win_rate || 0).toFixed(1)}%`,
      icon: Target,
      sub: `${account?.winning_trades || 0}W / ${account?.losing_trades || 0}L`,
    },
    {
      label: 'Profit Factor',
      value: (account?.profit_factor || 0).toFixed(2),
      icon: BarChart3,
      sub: `${account?.total_trades || 0} trades`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="relative overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl lg:text-3xl font-bold tracking-tight">{stat.value}</div>
              {stat.sub && (
                <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
              )}
              {'positive' in stat && (
                <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${stat.positive ? 'text-bullish' : 'text-bearish'}`}>
                  {stat.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {stat.positive ? 'Profitable' : 'In drawdown'}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-column: Signals + Equity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Latest Signals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Latest Signals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingSignals ? (
              [1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)
            ) : signals.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No signals generated yet</p>
            ) : (
              signals.slice(0, 5).map((signal) => (
                <div key={signal.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${signal.signal_type === 'BUY' ? 'bg-bullish' : signal.signal_type === 'SELL' ? 'bg-bearish' : 'bg-muted-foreground'}`} />
                    <div>
                      <div className="text-sm font-medium">
                        {signal.signal_type} {signal.symbol}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(signal.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={signal.status === 'executed' ? 'default' : 'secondary'} className="text-xs">
                      {(signal.confluence_score || 0).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Equity Curve */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Equity Curve
            </CardTitle>
          </CardHeader>
          <CardContent>
            {equityCurve.length < 2 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                Not enough trade history for chart
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={equityCurve}>
                  <XAxis dataKey="trade" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pnl" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2} 
                    dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Open Positions + Recent Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Open Positions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Open Positions
              {openTrades && openTrades.length > 0 && (
                <Badge variant="secondary" className="text-xs">{openTrades.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!openTrades || openTrades.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No open positions</p>
            ) : (
              <div className="space-y-2">
                {openTrades.slice(0, 5).map((trade: any) => (
                  <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-0.5 rounded text-xs font-semibold ${trade.trade_type === 'BUY' ? 'bg-bullish/15 text-bullish' : 'bg-bearish/15 text-bearish'}`}>
                        {trade.trade_type}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{trade.symbol}</div>
                        <div className="text-xs text-muted-foreground">{trade.lot_size} lots @ {trade.entry_price?.toFixed(5)}</div>
                      </div>
                    </div>
                    <div className={`text-sm font-semibold ${(trade.unrealized_pnl || 0) >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {(trade.unrealized_pnl || 0) >= 0 ? '+' : ''}${(trade.unrealized_pnl || 0).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Closed Trades */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Recent Trades
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTrades.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No trade history yet</p>
            ) : (
              <div className="space-y-2">
                {recentTrades.map((trade: any) => (
                  <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-0.5 rounded text-xs font-semibold ${trade.trade_type === 'BUY' ? 'bg-bullish/15 text-bullish' : 'bg-bearish/15 text-bearish'}`}>
                        {trade.trade_type}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{trade.symbol}</div>
                        <div className="text-xs text-muted-foreground">
                          {trade.exit_time ? new Date(trade.exit_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-semibold ${(trade.pnl || 0) >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {(trade.pnl || 0) >= 0 ? '+' : ''}${(trade.pnl || 0).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
