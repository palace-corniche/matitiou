import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, AlertCircle, Calendar, DollarSign } from 'lucide-react';

interface FundamentalSignal {
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

export default function FundamentalSignalsPanel() {
  const [signals, setSignals] = useState<FundamentalSignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFundamentalSignals();
    const interval = setInterval(fetchFundamentalSignals, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchFundamentalSignals = async () => {
    const { data, error } = await supabase
      .from('modular_signals')
      .select('*')
      .eq('module_id', 'fundamental_analysis')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(15);

    if (!error && data) {
      setSignals(data);
    }
    setLoading(false);
  };

  const getSignalIcon = (type: string) => {
    if (type === 'buy') return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (type === 'sell') return <TrendingDown className="h-5 w-5 text-red-600" />;
    return <AlertCircle className="h-5 w-5 text-yellow-600" />;
  };

  const getSignalBadge = (type: string) => {
    if (type === 'buy') return <Badge className="bg-green-600">BUY</Badge>;
    if (type === 'sell') return <Badge className="bg-red-600">SELL</Badge>;
    return <Badge variant="outline">HOLD</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Fundamental Analysis Signals
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading signals...</p>
        ) : signals.length === 0 ? (
          <p className="text-muted-foreground">No fundamental signals available. Signals generate based on economic calendar events and COT data.</p>
        ) : (
          <div className="space-y-4">
            {signals.map((signal) => {
              const economicEvents = signal.intermediate_values?.economic_events || [];
              const cotData = signal.intermediate_values?.cot_data || {};
              
              return (
                <div key={signal.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getSignalIcon(signal.signal_type)}
                      <span className="font-semibold">{signal.symbol}</span>
                      {getSignalBadge(signal.signal_type)}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(signal.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Confidence</p>
                      <p className="font-medium">{(signal.confidence * 100).toFixed(0)}%</p>
                    </div>
                    {signal.suggested_entry && (
                      <div>
                        <p className="text-muted-foreground">Entry</p>
                        <p className="font-medium">{signal.suggested_entry.toFixed(5)}</p>
                      </div>
                    )}
                    {signal.suggested_stop_loss && (
                      <div>
                        <p className="text-muted-foreground">Stop Loss</p>
                        <p className="font-medium">{signal.suggested_stop_loss.toFixed(5)}</p>
                      </div>
                    )}
                    {signal.suggested_take_profit && (
                      <div>
                        <p className="text-muted-foreground">Take Profit</p>
                        <p className="font-medium">{signal.suggested_take_profit.toFixed(5)}</p>
                      </div>
                    )}
                  </div>

                  {(economicEvents.length > 0 || Object.keys(cotData).length > 0) && (
                    <div className="pt-3 border-t space-y-2 text-xs">
                      {economicEvents.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {economicEvents.length} economic event{economicEvents.length > 1 ? 's' : ''} factored
                          </span>
                        </div>
                      )}
                      {cotData.commercial_net && (
                        <div className="text-muted-foreground">
                          COT Positioning: Commercial Net = {cotData.commercial_net > 0 ? '+' : ''}{(cotData.commercial_net / 1000).toFixed(1)}K
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
