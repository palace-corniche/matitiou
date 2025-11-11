import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, Calculator } from 'lucide-react';

interface QuantSignal {
  id: string;
  symbol: string;
  signal_type: string;
  confidence: number;
  suggested_entry: number | null;
  suggested_stop_loss: number | null;
  suggested_take_profit: number | null;
  created_at: string;
  intermediate_values: any;
}

export default function QuantitativeAnalysisPage() {
  const [signals, setSignals] = useState<QuantSignal[]>([]);
  const [loading, setLoading] = useState(true);

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
    }
    setLoading(false);
  };

  const getStrategyMetrics = () => {
    const recentSignals = signals.slice(0, 10);
    const buySignals = recentSignals.filter(s => s.signal_type === 'buy').length;
    const sellSignals = recentSignals.filter(s => s.signal_type === 'sell').length;
    const avgConfidence = recentSignals.reduce((sum, s) => sum + s.confidence, 0) / recentSignals.length || 0;
    
    return { buySignals, sellSignals, avgConfidence };
  };

  const metrics = getStrategyMetrics();

  return (
    <>
      <PageHeader 
        title="Quantitative Analysis"
        description="Statistical arbitrage, mean reversion, and momentum strategies with quantitative metrics"
        icon={Calculator}
      />
      <div className="container mx-auto px-6 py-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{signals.length}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Buy Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.buySignals}</div>
            <p className="text-xs text-muted-foreground">Recent 10 signals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sell Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.sellSignals}</div>
            <p className="text-xs text-muted-foreground">Recent 10 signals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.avgConfidence * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Recent 10 signals</p>
          </CardContent>
        </Card>
      </div>

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
            <p className="text-muted-foreground">No quantitative signals generated yet. They will appear here once the pipeline runs.</p>
          ) : (
            <div className="space-y-3">
              {signals.map((signal) => (
                <div key={signal.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {signal.signal_type === 'buy' ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-semibold">{signal.symbol}</span>
                      <Badge variant={signal.signal_type === 'buy' ? 'default' : 'destructive'}>
                        {signal.signal_type.toUpperCase()}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(signal.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Entry</p>
                      <p className="font-medium">{signal.suggested_entry?.toFixed(5)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stop Loss</p>
                      <p className="font-medium">{signal.suggested_stop_loss?.toFixed(5) || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Take Profit</p>
                      <p className="font-medium">{signal.suggested_take_profit?.toFixed(5) || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Confidence</p>
                      <div className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        <p className="font-medium">{(signal.confidence * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>

                  {signal.intermediate_values && (
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                      <p>Strategy: {signal.intermediate_values.strategy || 'Mean Reversion'}</p>
                      {signal.intermediate_values.volatility && (
                        <p>Volatility: {(signal.intermediate_values.volatility * 100).toFixed(2)}%</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
}