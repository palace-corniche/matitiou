import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Activity, BarChart3, Waves } from 'lucide-react';

interface ElliottWave {
  id: string;
  symbol: string;
  wave_label: string;
  pattern_type: string;
  wave_degree: string;
  start_price: number;
  end_price: number;
  confidence: number;
  created_at: string;
}

interface SpecializedSignal {
  id: string;
  symbol: string;
  signal_type: string;
  confidence: number;
  intermediate_values: any;
  created_at: string;
}

export default function EnhancedSpecializedAnalysis() {
  const [elliottWaves, setElliottWaves] = useState<ElliottWave[]>([]);
  const [specializedSignals, setSpecializedSignals] = useState<SpecializedSignal[]>([]);
  const [orderFlowData, setOrderFlowData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    // Fetch Elliott Waves
    const { data: waves } = await supabase
      .from('elliott_waves')
      .select('*')
      .eq('symbol', 'EURUSD')
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch specialized signals
    const { data: signals } = await supabase
      .from('modular_signals')
      .select('*')
      .eq('module_id', 'specialized_analysis')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch tick data for order flow
    const { data: ticks } = await supabase
      .from('tick_data')
      .select('*')
      .eq('symbol', 'EUR/USD')
      .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false })
      .limit(100);

    if (waves) setElliottWaves(waves);
    if (signals) setSpecializedSignals(signals);
    if (ticks) calculateOrderFlow(ticks);
    setLoading(false);
  };

  const calculateOrderFlow = (ticks: any[]) => {
    let buyVolume = 0;
    let sellVolume = 0;
    
    for (let i = 1; i < ticks.length; i++) {
      const priceDiff = ticks[i - 1].bid - ticks[i].bid; // Reversed order
      const volume = ticks[i].tick_volume || 1;
      
      if (priceDiff > 0) buyVolume += volume;
      else if (priceDiff < 0) sellVolume += volume;
    }
    
    const total = buyVolume + sellVolume;
    const delta = total > 0 ? ((buyVolume - sellVolume) / total * 100) : 0;
    
    setOrderFlowData({
      buyVolume,
      sellVolume,
      delta,
      totalTicks: ticks.length
    });
  };

  const getWaveColor = (label: string) => {
    if (label.match(/^[135]$/)) return 'text-green-600';
    if (label.match(/^[24]$/)) return 'text-red-600';
    if (label.match(/^[ABC]$/)) return 'text-yellow-600';
    return 'text-muted-foreground';
  };

  const getWaveDescription = (label: string, pattern: string) => {
    if (pattern === 'impulse') {
      if (label === '1') return 'Early trend initiation';
      if (label === '2') return 'Correction (pullback)';
      if (label === '3') return 'Strongest impulse move';
      if (label === '4') return 'Final correction';
      if (label === '5') return 'Trend exhaustion';
    } else if (pattern === 'corrective') {
      if (label === 'A') return 'Correction begins';
      if (label === 'B') return 'Counter-trend bounce';
      if (label === 'C') return 'Final correction leg';
    }
    return 'Unknown wave';
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="elliott" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="elliott">
            <Waves className="h-4 w-4 mr-2" />
            Elliott Wave
          </TabsTrigger>
          <TabsTrigger value="orderflow">
            <Activity className="h-4 w-4 mr-2" />
            Order Flow
          </TabsTrigger>
          <TabsTrigger value="signals">
            <BarChart3 className="h-4 w-4 mr-2" />
            Signals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="elliott" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Elliott Wave Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading Elliott Wave data...</p>
              ) : elliottWaves.length === 0 ? (
                <p className="text-muted-foreground">No Elliott Wave patterns detected yet.</p>
              ) : (
                <div className="space-y-4">
                  {elliottWaves.map((wave) => (
                    <div key={wave.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={getWaveColor(wave.wave_label)}>
                            Wave {wave.wave_label}
                          </Badge>
                          <Badge variant="secondary">{wave.pattern_type}</Badge>
                          <span className="text-sm text-muted-foreground">{wave.wave_degree}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(wave.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-sm mb-3">{getWaveDescription(wave.wave_label, wave.pattern_type)}</p>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Start</p>
                          <p className="font-medium">{wave.start_price.toFixed(5)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">End</p>
                          <p className="font-medium">{wave.end_price.toFixed(5)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Confidence</p>
                          <p className="font-medium">{(wave.confidence * 100).toFixed(0)}%</p>
                        </div>
                      </div>

                      {wave.wave_label === '3' && (
                        <div className="mt-3 pt-3 border-t bg-green-50 dark:bg-green-950 p-2 rounded">
                          <p className="text-xs font-medium text-green-700 dark:text-green-300">
                            🎯 High probability trade zone - Wave 3 is typically the strongest impulse
                          </p>
                        </div>
                      )}
                      
                      {wave.wave_label === '5' && (
                        <div className="mt-3 pt-3 border-t bg-yellow-50 dark:bg-yellow-950 p-2 rounded">
                          <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                            ⚠️ Trend exhaustion expected - prepare for reversal
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orderflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-Time Order Flow</CardTitle>
            </CardHeader>
            <CardContent>
              {!orderFlowData ? (
                <p className="text-muted-foreground">Loading order flow data...</p>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-green-50 dark:bg-green-950">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium">Buy Volume</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          {orderFlowData.buyVolume.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-red-50 dark:bg-red-950">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingDown className="h-5 w-5 text-red-600" />
                          <span className="text-sm font-medium">Sell Volume</span>
                        </div>
                        <p className="text-2xl font-bold text-red-600">
                          {orderFlowData.sellVolume.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Volume Delta</h4>
                    <div className="relative h-8 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`absolute h-full ${orderFlowData.delta > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ 
                          width: `${Math.abs(orderFlowData.delta)}%`,
                          left: orderFlowData.delta > 0 ? '50%' : `${50 - Math.abs(orderFlowData.delta)}%`
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-foreground">
                        {orderFlowData.delta > 0 ? '+' : ''}{orderFlowData.delta.toFixed(1)}%
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Based on {orderFlowData.totalTicks} real ticks
                    </p>
                  </div>

                  <div className="text-sm">
                    <p className="font-medium mb-2">Interpretation:</p>
                    {Math.abs(orderFlowData.delta) > 30 ? (
                      <p className={orderFlowData.delta > 0 ? 'text-green-600' : 'text-red-600'}>
                        <strong>Strong {orderFlowData.delta > 0 ? 'Bullish' : 'Bearish'} Pressure</strong> - 
                        Aggressive {orderFlowData.delta > 0 ? 'buying' : 'selling'} detected
                      </p>
                    ) : Math.abs(orderFlowData.delta) > 15 ? (
                      <p className="text-muted-foreground">
                        <strong>Moderate Imbalance</strong> - Slight {orderFlowData.delta > 0 ? 'bullish' : 'bearish'} bias
                      </p>
                    ) : (
                      <p className="text-muted-foreground">
                        <strong>Balanced Flow</strong> - No significant directional pressure
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Specialized Analysis Signals</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading signals...</p>
              ) : specializedSignals.length === 0 ? (
                <p className="text-muted-foreground">No specialized signals available.</p>
              ) : (
                <div className="space-y-3">
                  {specializedSignals.map((signal) => {
                    const elliottData = signal.intermediate_values?.elliott_wave_count;
                    const harmonicData = signal.intermediate_values?.harmonic_pattern_type;
                    
                    return (
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
                        
                        <div className="text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Confidence</span>
                            <span className="font-medium">{(signal.confidence * 100).toFixed(0)}%</span>
                          </div>
                          {elliottData && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Elliott Wave</span>
                              <span className="font-medium">Wave {elliottData}</span>
                            </div>
                          )}
                          {harmonicData && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Harmonic Pattern</span>
                              <span className="font-medium capitalize">{harmonicData}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
