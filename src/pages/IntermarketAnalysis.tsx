import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { untypedSupabase as supabase } from '@/integrations/supabase/untypedClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  Network,
  Shield,
  ShieldAlert,
  Minus,
  Activity,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

interface CalcParams {
  correlation_alignment: number;
  dxy_divergence: number;
  dxy_divergence_direction: string;
  risk_appetite: number;
  risk_regime: string;
  commodity_flow: number;
  commodity_direction: string;
  cross_currency: number;
  cross_direction: string;
  composite_score: number;
  computed_volatility: number;
  avg_news_sentiment: number;
  correlation_map: Record<string, number>;
  strong_correlations: number;
  factors: Array<{ name: string; value: number; weight: number; contribution: number }>;
}

export default function IntermarketAnalysisPage() {
  const [latestSignal, setLatestSignal] = useState<any>(null);
  const [correlations, setCorrelations] = useState<any[]>([]);
  const [signalHistory, setSignalHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [signalRes, corrRes, historyRes] = await Promise.all([
        supabase.from('modular_signals').select('*').eq('module_id', 'intermarket_analysis').order('created_at', { ascending: false }).limit(1),
        supabase.from('correlations').select('*').order('calculated_at', { ascending: false }).limit(30),
        supabase.from('modular_signals').select('*').eq('module_id', 'intermarket_analysis').order('created_at', { ascending: false }).limit(10),
      ]);
      setLatestSignal(signalRes.data?.[0] || null);
      setCorrelations(corrRes.data || []);
      setSignalHistory(historyRes.data || []);
    } catch (e) {
      console.error('Error fetching intermarket data:', e);
    } finally {
      setLoading(false);
    }
  };

  const cp: CalcParams | null = latestSignal?.calculation_parameters || null;

  const getScoreColor = (v: number) => v >= 0.6 ? 'text-green-500' : v >= 0.4 ? 'text-yellow-500' : 'text-red-500';
  const getRiskIcon = (regime: string) => {
    if (regime === 'risk_on') return <Shield className="h-5 w-5 text-green-500" />;
    if (regime === 'risk_off') return <ShieldAlert className="h-5 w-5 text-red-500" />;
    return <Minus className="h-5 w-5 text-muted-foreground" />;
  };

  const getCorrCellColor = (v: number) => {
    const abs = Math.abs(v);
    if (abs > 0.7) return v > 0 ? 'bg-green-500/30 text-green-300' : 'bg-red-500/30 text-red-300';
    if (abs > 0.4) return v > 0 ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400';
    return 'text-muted-foreground';
  };

  const dirBadge = (d: string) => {
    if (d === 'buy') return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">BUY</Badge>;
    if (d === 'sell') return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">SELL</Badge>;
    return <Badge variant="outline">HOLD</Badge>;
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Intermarket Analysis" description="5-model cross-asset correlation engine" icon={Network} />
        <div className="container mx-auto px-6 py-6 text-center text-muted-foreground">Loading...</div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Intermarket Analysis" description="Godmode 5-model cross-asset correlation engine" icon={Network} />
      <div className="container mx-auto px-6 py-6 space-y-6">

        {/* Top Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricCard title="Correlation Alignment" value={cp?.correlation_alignment} icon={<Network className="h-4 w-4" />} subtitle={`${cp?.strong_correlations ?? 0} strong pairs`} />
          <MetricCard title="DXY Divergence" value={cp?.dxy_divergence} icon={<BarChart3 className="h-4 w-4" />} subtitle={cp?.dxy_divergence_direction ?? 'N/A'} />
          <Card className="border-border/50">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Risk Appetite</span>
                {getRiskIcon(cp?.risk_regime || 'neutral')}
              </div>
              <div className={`text-2xl font-bold ${getScoreColor(cp?.risk_appetite ?? 0.5)}`}>{((cp?.risk_appetite ?? 0.5) * 100).toFixed(0)}%</div>
              <Badge variant="outline" className="mt-1 text-xs">{cp?.risk_regime ?? 'neutral'}</Badge>
            </CardContent>
          </Card>
          <MetricCard title="Commodity Flow" value={cp?.commodity_flow} icon={<Activity className="h-4 w-4" />} subtitle={cp?.commodity_direction ?? 'N/A'} />
          <MetricCard title="Cross-Currency" value={cp?.cross_currency} icon={<RefreshCw className="h-4 w-4" />} subtitle={cp?.cross_direction ?? 'N/A'} />
        </div>

        {/* Composite Score & Signal */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Composite Signal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div>
                <div className={`text-4xl font-bold ${getScoreColor(cp?.composite_score ?? 0)}`}>
                  {((cp?.composite_score ?? 0) * 100).toFixed(1)}%
                </div>
                <span className="text-xs text-muted-foreground">Composite Score</span>
              </div>
              <div className="flex items-center gap-2">
                {latestSignal?.signal_type === 'buy' && <TrendingUp className="h-6 w-6 text-green-500" />}
                {latestSignal?.signal_type === 'sell' && <TrendingDown className="h-6 w-6 text-red-500" />}
                {dirBadge(latestSignal?.signal_type || 'hold')}
              </div>
              <div className="text-xs text-muted-foreground ml-auto">
                Vol: {cp?.computed_volatility?.toFixed(1) ?? 'N/A'} | News: {cp?.avg_news_sentiment?.toFixed(2) ?? 'N/A'}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Model Breakdown */}
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Model Breakdown</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="text-right">Contribution</TableHead>
                    <TableHead>Direction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(Array.isArray(cp?.factors) ? cp.factors : []).map((f) => (
                    <TableRow key={f.name}>
                      <TableCell className="font-medium text-xs">{f.name.replace(/_/g, ' ')}</TableCell>
                      <TableCell className={`text-right ${getScoreColor(f.value)}`}>{(f.value * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right text-muted-foreground">{(f.weight * 100).toFixed(0)}%</TableCell>
                      <TableCell className="text-right">{(f.contribution * 100).toFixed(1)}%</TableCell>
                      <TableCell>{
                        f.name === 'dxy_divergence' ? dirBadge(cp?.dxy_divergence_direction || 'hold') :
                        f.name === 'risk_appetite' ? dirBadge(cp?.risk_regime === 'risk_on' ? 'buy' : cp?.risk_regime === 'risk_off' ? 'sell' : 'hold') :
                        f.name === 'commodity_flow' ? dirBadge(cp?.commodity_direction || 'hold') :
                        f.name === 'cross_currency' ? dirBadge(cp?.cross_direction || 'hold') :
                        <Badge variant="outline">—</Badge>
                      }</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Correlation Heatmap */}
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Correlation Heatmap</CardTitle></CardHeader>
            <CardContent>
              {cp?.correlation_map ? (
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(cp.correlation_map).map(([key, val]) => (
                    <div key={key} className={`rounded-md p-3 text-center ${getCorrCellColor(val)}`}>
                      <div className="text-xs uppercase font-medium mb-1">{key}</div>
                      <div className="text-lg font-bold">{val > 0 ? '+' : ''}{val.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {correlations.slice(0, 9).map((c) => (
                    <div key={c.id} className={`rounded-md p-3 text-center ${getCorrCellColor(c.correlation_coefficient || 0)}`}>
                      <div className="text-xs font-medium mb-1 truncate">{c.symbol_pair}</div>
                      <div className="text-lg font-bold">{(c.correlation_coefficient || 0).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Signal History */}
        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Signal History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Signal</TableHead>
                  <TableHead className="text-right">Composite</TableHead>
                  <TableHead>Risk Regime</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Array.isArray(signalHistory) ? signalHistory : []).map((s) => {
                  const sp = s.calculation_parameters;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</TableCell>
                      <TableCell>{dirBadge(s.signal_type || 'hold')}</TableCell>
                      <TableCell className={`text-right ${getScoreColor(sp?.composite_score ?? s.confidence ?? 0)}`}>
                        {((sp?.composite_score ?? s.confidence ?? 0) * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell><Badge variant="outline">{sp?.risk_regime ?? s.trend_context ?? '—'}</Badge></TableCell>
                      <TableCell className="text-right">{s.trigger_price?.toFixed(5) ?? '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function MetricCard({ title, value, icon, subtitle }: { title: string; value?: number; icon: React.ReactNode; subtitle?: string }) {
  const v = value ?? 0;
  const color = v >= 0.6 ? 'text-green-500' : v >= 0.4 ? 'text-yellow-500' : 'text-red-500';
  return (
    <Card className="border-border/50">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{title}</span>
          {icon}
        </div>
        <div className={`text-2xl font-bold ${color}`}>{(v * 100).toFixed(1)}%</div>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </CardContent>
    </Card>
  );
}
