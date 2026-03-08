import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { untypedSupabase as supabase } from '@/integrations/supabase/untypedClient';
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Gauge,
  Brain,
  BarChart3,
  Shuffle,
  Target,
  Percent
} from 'lucide-react';

interface QuantSignal {
  id: string;
  symbol: string;
  signal_type: string;
  confidence: number;
  suggested_entry: number | null;
  suggested_stop_loss: number | null;
  suggested_take_profit: number | null;
  created_at: string;
  calculation_parameters: any;
  market_data_snapshot: any;
}

interface ModelOutput {
  name: string;
  value: number;
  score: number;
  weight: number;
  contribution: number;
  status: 'bullish' | 'bearish' | 'neutral';
}

interface QuantMetrics {
  hurstExponent: number;
  regime: string;
  shannonEntropy: number;
  bayesianPProfit: number;
  kellyFraction: number;
  monteCarloPTP: number;
  compositeScore: number;
  zScore: number;
  ouParams: { theta: number; mu: number; sigma: number; halfLife: number };
  kalmanDeviation: number;
}

const defaultMetrics: QuantMetrics = {
  hurstExponent: 0.5,
  regime: 'unknown',
  shannonEntropy: 0.5,
  bayesianPProfit: 0.5,
  kellyFraction: 0,
  monteCarloPTP: 0.5,
  compositeScore: 0,
  zScore: 0,
  ouParams: { theta: 0, mu: 0, sigma: 0, halfLife: 0 },
  kalmanDeviation: 0
};

export default function QuantitativeAnalysisPage() {
  const [signals, setSignals] = useState<QuantSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<QuantMetrics>(defaultMetrics);
  const [modelOutputs, setModelOutputs] = useState<ModelOutput[]>([]);

  useEffect(() => {
    fetchQuantSignals();
    const interval = setInterval(fetchQuantSignals, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchQuantSignals = async () => {
    const { data, error } = await supabase
      .from('modular_signals')
      .select('*')
      .eq('module_id', 'quantitative_analysis')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setSignals(data);
      
      // Extract metrics from most recent signal
      if (data.length > 0) {
        const latest = data[0];
        const factors = latest.calculation_parameters?.factors || [];
        
        // Parse factors into metrics
        const getFactorValue = (name: string) => {
          const factor = factors.find?.((f: any) => f.name === name) || 
                        (Array.isArray(factors) ? null : factors[name]);
          return typeof factor === 'object' ? factor?.value : factor || 0;
        };

        const hurstExponent = getFactorValue('hurst_exponent') || 0.5;
        const regimeVal = getFactorValue('regime');
        const regime = regimeVal === 1 ? 'trending' : regimeVal === -1 ? 'mean_reverting' : 'random_walk';
        
        const newMetrics: QuantMetrics = {
          hurstExponent,
          regime,
          shannonEntropy: getFactorValue('shannon_entropy') || 0.5,
          bayesianPProfit: getFactorValue('bayesian_p_profit') || 0.5,
          kellyFraction: getFactorValue('kelly_fraction') || 0,
          monteCarloPTP: getFactorValue('monte_carlo_p_tp') || 0.5,
          compositeScore: getFactorValue('composite_score') || 0,
          zScore: getFactorValue('z_score') || 0,
          ouParams: {
            theta: getFactorValue('ou_theta') || 0,
            mu: getFactorValue('ou_mu') || 0,
            sigma: getFactorValue('ou_sigma') || 0,
            halfLife: getFactorValue('ou_half_life') || 0,
          },
          kalmanDeviation: getFactorValue('kalman_deviation') || 0
        };
        
        setMetrics(newMetrics);

        // Build model outputs table
        const outputs: ModelOutput[] = [
          {
            name: 'Hurst Exponent',
            value: newMetrics.hurstExponent,
            score: newMetrics.hurstExponent > 0.5 ? 0.8 : newMetrics.hurstExponent < 0.45 ? 0.8 : 0.4,
            weight: 0.15,
            contribution: (newMetrics.hurstExponent > 0.5 ? 0.8 : 0.4) * 0.15,
            status: newMetrics.hurstExponent > 0.55 ? 'bullish' : newMetrics.hurstExponent < 0.45 ? 'bearish' : 'neutral'
          },
          {
            name: 'Ornstein-Uhlenbeck',
            value: newMetrics.ouParams.halfLife,
            score: newMetrics.ouParams.halfLife < 20 ? 0.9 : 0.4,
            weight: 0.20,
            contribution: (newMetrics.ouParams.halfLife < 20 ? 0.9 : 0.4) * 0.20,
            status: newMetrics.ouParams.halfLife < 15 ? 'bullish' : 'neutral'
          },
          {
            name: 'Kalman Filter',
            value: newMetrics.kalmanDeviation,
            score: Math.min(1, Math.abs(newMetrics.kalmanDeviation) * 1000),
            weight: 0.15,
            contribution: Math.min(1, Math.abs(newMetrics.kalmanDeviation) * 500) * 0.15,
            status: newMetrics.kalmanDeviation > 0 ? 'bullish' : newMetrics.kalmanDeviation < 0 ? 'bearish' : 'neutral'
          },
          {
            name: 'Shannon Entropy',
            value: newMetrics.shannonEntropy,
            score: newMetrics.shannonEntropy < 0.4 ? 0.9 : newMetrics.shannonEntropy > 0.7 ? 0.3 : 0.6,
            weight: 0.10,
            contribution: (newMetrics.shannonEntropy < 0.4 ? 0.9 : 0.6) * 0.10,
            status: newMetrics.shannonEntropy < 0.4 ? 'bullish' : newMetrics.shannonEntropy > 0.7 ? 'bearish' : 'neutral'
          },
          {
            name: 'Bayesian P(Profit)',
            value: newMetrics.bayesianPProfit,
            score: newMetrics.bayesianPProfit,
            weight: 0.25,
            contribution: newMetrics.bayesianPProfit * 0.25,
            status: newMetrics.bayesianPProfit > 0.6 ? 'bullish' : newMetrics.bayesianPProfit < 0.4 ? 'bearish' : 'neutral'
          },
          {
            name: 'Monte Carlo P(TP)',
            value: newMetrics.monteCarloPTP,
            score: newMetrics.monteCarloPTP,
            weight: 0.15,
            contribution: newMetrics.monteCarloPTP * 0.15,
            status: newMetrics.monteCarloPTP > 0.6 ? 'bullish' : newMetrics.monteCarloPTP < 0.4 ? 'bearish' : 'neutral'
          }
        ];
        setModelOutputs(outputs);
      }
    }
    setLoading(false);
  };

  const getRegimeBadge = (regime: string) => {
    switch (regime) {
      case 'trending':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">TRENDING</Badge>;
      case 'mean_reverting':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">MEAN REVERTING</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">RANDOM WALK</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'bullish':
        return <Badge variant="outline" className="text-green-400 border-green-500/50 text-xs">↑ Bullish</Badge>;
      case 'bearish':
        return <Badge variant="outline" className="text-red-400 border-red-500/50 text-xs">↓ Bearish</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground border-muted text-xs">― Neutral</Badge>;
    }
  };

  const recentSignalStats = () => {
    const recent = signals.slice(0, 10);
    const buyCount = recent.filter(s => s.signal_type === 'buy').length;
    const sellCount = recent.filter(s => s.signal_type === 'sell').length;
    const avgConf = recent.length > 0 ? recent.reduce((s, r) => s + r.confidence, 0) / recent.length : 0;
    return { buyCount, sellCount, avgConf };
  };

  const stats = recentSignalStats();

  return (
    <>
      <PageHeader 
        title="Quantitative Analysis"
        description="Godmode statistical engine: Hurst, Ornstein-Uhlenbeck, Kalman, Entropy, Bayesian inference, Kelly criterion & Monte Carlo"
        icon={Calculator}
      />
      
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Top Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Gauge className="h-3 w-3" />
                Hurst Exponent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.hurstExponent.toFixed(3)}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.hurstExponent > 0.5 ? 'Trending' : metrics.hurstExponent < 0.5 ? 'Mean-Rev' : 'Random'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Shuffle className="h-3 w-3" />
                Regime
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getRegimeBadge(metrics.regime)}
              <p className="text-xs text-muted-foreground mt-1">Current State</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Shannon Entropy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.shannonEntropy.toFixed(3)}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.shannonEntropy < 0.4 ? 'Predictable' : metrics.shannonEntropy > 0.7 ? 'Chaotic' : 'Moderate'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Brain className="h-3 w-3" />
                Bayesian P(Profit)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{(metrics.bayesianPProfit * 100).toFixed(1)}%</div>
              <Progress value={metrics.bayesianPProfit * 100} className="h-1 mt-1" />
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Percent className="h-3 w-3" />
                Kelly Fraction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(metrics.kellyFraction * 100).toFixed(2)}%</div>
              <p className="text-xs text-muted-foreground">Optimal Position</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" />
                Monte Carlo P(TP)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(metrics.monteCarloPTP * 100).toFixed(1)}%</div>
              <Progress value={metrics.monteCarloPTP * 100} className="h-1 mt-1" />
            </CardContent>
          </Card>
        </div>

        {/* Probability & Model Breakdown Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Probability Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Probability Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-green-400">BUY Probability</span>
                  <span className="font-mono">{(metrics.bayesianPProfit * 100).toFixed(1)}%</span>
                </div>
                <Progress value={metrics.bayesianPProfit * 100} className="h-3 bg-muted" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-red-400">SELL Probability</span>
                  <span className="font-mono">{((1 - metrics.bayesianPProfit) * 100).toFixed(1)}%</span>
                </div>
                <Progress value={(1 - metrics.bayesianPProfit) * 100} className="h-3 bg-muted [&>div]:bg-red-500" />
              </div>
              <div className="pt-2 border-t border-border/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Composite Score</span>
                  <span className="font-mono font-bold text-primary">{(metrics.compositeScore * 100).toFixed(1)}%</span>
                </div>
                <Progress value={metrics.compositeScore * 100} className="h-2 mt-1" />
              </div>
            </CardContent>
          </Card>

          {/* Model Breakdown Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Model Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-5 text-xs text-muted-foreground font-medium pb-2 border-b border-border/50">
                  <span>Model</span>
                  <span className="text-right">Value</span>
                  <span className="text-right">Score</span>
                  <span className="text-right">Weight</span>
                  <span className="text-center">Status</span>
                </div>
                {modelOutputs.map((model, idx) => (
                  <div key={idx} className="grid grid-cols-5 text-sm items-center py-1.5 hover:bg-accent/30 rounded px-1">
                    <span className="text-xs font-medium truncate">{model.name}</span>
                    <span className="text-right font-mono text-xs">{model.value.toFixed(3)}</span>
                    <span className="text-right font-mono text-xs">{(model.score * 100).toFixed(0)}%</span>
                    <span className="text-right text-muted-foreground text-xs">{(model.weight * 100).toFixed(0)}%</span>
                    <span className="text-center">{getStatusBadge(model.status)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistical Metrics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Statistical Parameters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Z-Score</p>
                <p className="font-mono font-bold">{metrics.zScore.toFixed(3)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">OU θ (Mean Rev Speed)</p>
                <p className="font-mono font-bold">{metrics.ouParams.theta.toFixed(4)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">OU μ (Equilibrium)</p>
                <p className="font-mono font-bold">{metrics.ouParams.mu.toFixed(5)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">OU σ (Volatility)</p>
                <p className="font-mono font-bold">{metrics.ouParams.sigma.toFixed(5)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">OU Half-Life (bars)</p>
                <p className="font-mono font-bold">{metrics.ouParams.halfLife.toFixed(1)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Kalman Deviation</p>
                <p className="font-mono font-bold">{metrics.kalmanDeviation.toFixed(6)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signal Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Signals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{signals.length}</div>
              <p className="text-xs text-muted-foreground">Recent history</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Buy Signals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.buyCount}</div>
              <p className="text-xs text-muted-foreground">Last 10 signals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sell Signals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.sellCount}</div>
              <p className="text-xs text-muted-foreground">Last 10 signals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats.avgConf * 100).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Last 10 signals</p>
            </CardContent>
          </Card>
        </div>

        {/* Signal History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Recent Quantitative Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading signals...</p>
            ) : signals.length === 0 ? (
              <p className="text-muted-foreground">No quantitative signals generated yet. They will appear once the godmode engine runs.</p>
            ) : (
              <div className="space-y-3">
                {signals.map((signal) => {
                  const factors = signal.calculation_parameters?.factors || [];
                  const getVal = (name: string) => {
                    const f = factors.find?.((x: any) => x.name === name);
                    return f?.value ?? 0;
                  };

                  return (
                    <div key={signal.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {signal.signal_type === 'buy' ? (
                            <TrendingUp className="h-5 w-5 text-green-500" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-500" />
                          )}
                          <span className="font-semibold">{signal.symbol}</span>
                          <Badge variant={signal.signal_type === 'buy' ? 'default' : 'destructive'}>
                            {signal.signal_type?.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {(signal.confidence * 100).toFixed(0)}% conf
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(signal.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">Entry</p>
                          <p className="font-mono font-medium">{signal.suggested_entry?.toFixed(5)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Stop Loss</p>
                          <p className="font-mono font-medium">{signal.suggested_stop_loss?.toFixed(5) || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Take Profit</p>
                          <p className="font-mono font-medium">{signal.suggested_take_profit?.toFixed(5) || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Hurst</p>
                          <p className="font-mono">{getVal('hurst_exponent').toFixed(3)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Bayes P</p>
                          <p className="font-mono">{(getVal('bayesian_p_profit') * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">MC P(TP)</p>
                          <p className="font-mono">{(getVal('monte_carlo_p_tp') * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
