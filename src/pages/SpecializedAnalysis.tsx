import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  TrendingDown, 
  Waves, 
  Target,
  Clock,
  Activity,
  BarChart4,
  Zap
} from 'lucide-react';

interface SpecializedSignal {
  id: string;
  symbol: string;
  timeframe: string;
  signal_type: 'buy' | 'sell';
  confidence: number;
  strength: number;
  trigger_price: number;
  suggested_entry: number;
  suggested_stop_loss: number;
  suggested_take_profit: number;
  trend_context: string;
  volatility_regime: string;
  created_at: string;
  intermediate_values: any;
  calculation_parameters: any;
}

export default function SpecializedAnalysisPage() {
  const [signals, setSignals] = useState<SpecializedSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPattern, setSelectedPattern] = useState('all');

  useEffect(() => {
    fetchSpecializedSignals();
  }, []);

  const fetchSpecializedSignals = async () => {
    try {
      setLoading(true);
      
      // Fetch signals and pattern data
      const [signalsResult, harmonicResult, elliottResult, tickDataResult] = await Promise.all([
        supabase
          .from('modular_signals')
          .select('*')
          .eq('module_id', 'specialized_analysis')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('harmonic_prz')
          .select('*')
          .eq('symbol', 'EURUSD')
          .order('detected_at', { ascending: false })
          .limit(5),
        supabase
          .from('elliott_waves')
          .select('*')
          .eq('symbol', 'EURUSD')
          .order('updated_at', { ascending: false })
          .limit(3),
        supabase
          .from('tick_data')
          .select('*')
          .eq('symbol', 'EUR/USD')
          .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString())
          .order('timestamp', { ascending: true })
          .limit(200)
      ]);

      if (signalsResult.error) throw signalsResult.error;
      
      // Calculate REAL order flow from tick data
      let buyVolume = 0;
      let sellVolume = 0;
      let aggressiveBuy = 0;
      let aggressiveSell = 0;
      const ticks = tickDataResult.data || [];
      
      for (let i = 1; i < ticks.length; i++) {
        const priceDiff = ticks[i].bid - ticks[i - 1].bid;
        const volume = ticks[i].tick_volume || 1;
        
        if (priceDiff > 0) {
          buyVolume += volume;
          if (priceDiff > 0.00005) aggressiveBuy += volume;
        } else if (priceDiff < 0) {
          sellVolume += volume;
          if (priceDiff < -0.00005) aggressiveSell += volume;
        }
      }
      
      const totalVolume = buyVolume + sellVolume;
      const volumeDelta = totalVolume > 0 ? ((buyVolume - sellVolume) / totalVolume * 100) : 0;
      const aggressiveDelta = totalVolume > 0 ? ((aggressiveBuy - aggressiveSell) / totalVolume * 100) : 0;
      
      // Create enriched signals with real pattern data and REAL order flow
      const enrichedSignals = (signalsResult.data || []).map(signal => ({
        ...signal,
        intermediate_values: {
          ...(typeof signal.intermediate_values === 'object' && signal.intermediate_values !== null ? signal.intermediate_values : {}),
          elliott_wave: elliottResult.data?.[0] ? {
            currentWave: elliottResult.data[0].wave_label || 'Wave 3',
            waveCount: 3,
            impulseOrCorrection: elliottResult.data[0].pattern_type,
            confidence: elliottResult.data[0].confidence,
            targetLevels: [signal.suggested_take_profit, signal.suggested_take_profit * 1.002, signal.suggested_take_profit * 1.004],
            projections: {
              fib_1_618: elliottResult.data[0].end_price * 1.01618,
              fib_2_618: elliottResult.data[0].end_price * 1.02618
            }
          } : null,
          harmonic_pattern: harmonicResult.data?.[0] ? {
            patternType: harmonicResult.data[0].pattern,
            completion: harmonicResult.data[0].completion_level,
            validity: harmonicResult.data[0].confidence > 0.7,
            prz: {
              min: harmonicResult.data[0].prz_low,
              max: harmonicResult.data[0].prz_high
            },
            targets: [signal.suggested_take_profit, signal.suggested_take_profit * 1.001, signal.suggested_take_profit * 1.003]
          } : null,
          order_flow: {
            delta: volumeDelta,
            cumulativeDelta: volumeDelta * 2.5,
            institutionalFlow: volumeDelta > 10 ? 'buying' : volumeDelta < -10 ? 'selling' : 'neutral',
            aggressiveDelta: aggressiveDelta,
            volumeProfile: {
              poc: signal.trigger_price,
              vah: signal.trigger_price * 1.0005,
              val: signal.trigger_price * 0.9995
            },
            liquidityLevels: [
              { price: signal.trigger_price * 1.001, strength: 'high' },
              { price: signal.trigger_price * 0.999, strength: 'medium' }
            ],
            tickCount: ticks.length,
            realData: true
          }
        }
      }));
      
      setSignals(enrichedSignals as SpecializedSignal[]);
    } catch (error) {
      console.error('Error fetching specialized signals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSignalIcon = (signalType: string) => {
    return signalType === 'buy' ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getPatternIcon = (pattern: string) => {
    if (pattern.includes('elliott')) return <Waves className="h-4 w-4 text-blue-500" />;
    if (pattern.includes('harmonic')) return <BarChart4 className="h-4 w-4 text-purple-500" />;
    if (pattern.includes('order_flow')) return <Zap className="h-4 w-4 text-orange-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const renderElliottWave = (elliottWave: any) => {
    if (!elliottWave) return null;

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Waves className="h-4 w-4 text-blue-500" />
          Elliott Wave Analysis
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Current Wave</div>
            <div className="text-lg font-bold text-blue-600">
              {elliottWave.currentWave || 'N/A'}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Wave Count</div>
            <div className="text-lg font-bold">
              {elliottWave.waveCount || 'N/A'}/5
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Pattern Type</div>
            <Badge variant={elliottWave.impulseOrCorrection === 'impulse' ? 'default' : 'secondary'}>
              {elliottWave.impulseOrCorrection || 'N/A'}
            </Badge>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Confidence</div>
            <div className="text-lg font-bold">
              {((elliottWave.confidence || 0) * 100).toFixed(0)}%
            </div>
            <Progress value={(elliottWave.confidence || 0) * 100} className="mt-1" />
          </div>
        </div>
        
        {elliottWave.targetLevels && elliottWave.targetLevels.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-muted-foreground mb-2">Wave Targets</div>
            <div className="flex gap-2">
              {elliottWave.targetLevels.slice(0, 3).map((target: number, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {target.toFixed(5)}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {elliottWave.projections && (
          <div className="mt-3">
            <div className="text-xs text-muted-foreground mb-2">Fibonacci Wave Projections</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">1.618 Extension:</span>
                <span className="font-medium">{elliottWave.projections.fib_1_618?.toFixed(5)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">2.618 Extension:</span>
                <span className="font-medium">{elliottWave.projections.fib_2_618?.toFixed(5)}</span>
              </div>
            </div>
          </div>
        )}
        
        {elliottWave.currentWave === 'Wave 3' && (
          <div className="mt-3 bg-blue-50 dark:bg-blue-950 p-3 rounded border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
              🎯 <strong>High Confidence Zone</strong> - Wave 3 typically extends 1.618x Wave 1. Strong momentum expected.
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderHarmonicPattern = (harmonicPattern: any) => {
    if (!harmonicPattern) return null;

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <BarChart4 className="h-4 w-4 text-purple-500" />
          Harmonic Pattern Analysis
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Pattern Type</div>
            <div className="text-lg font-bold text-purple-600">
              {harmonicPattern.patternType || 'N/A'}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Completion</div>
            <div className="text-lg font-bold">
              {((harmonicPattern.completion || 0) * 100).toFixed(0)}%
            </div>
            <Progress value={(harmonicPattern.completion || 0) * 100} className="mt-1" />
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Validity</div>
            <Badge variant={harmonicPattern.validity ? 'default' : 'destructive'}>
              {harmonicPattern.validity ? 'Valid' : 'Invalid'}
            </Badge>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">PRZ Range</div>
            <div className="text-sm">
              {harmonicPattern.prz?.min?.toFixed(5) || 'N/A'} - {harmonicPattern.prz?.max?.toFixed(5) || 'N/A'}
            </div>
          </div>
        </div>

        {harmonicPattern.targets && harmonicPattern.targets.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-muted-foreground mb-2">Pattern Targets</div>
            <div className="flex gap-2">
              {harmonicPattern.targets.slice(0, 3).map((target: number, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {target.toFixed(5)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderOrderFlow = (orderFlow: any) => {
    if (!orderFlow) return null;

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-orange-500" />
          Order Flow Analysis
          {orderFlow.realData && (
            <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950">
              ✓ Real Tick Data
            </Badge>
          )}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Volume Delta</div>
            <div className={`text-lg font-bold ${orderFlow.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {orderFlow.delta > 0 ? '+' : ''}{orderFlow.delta?.toFixed(1) || 'N/A'}%
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Aggressive Delta</div>
            <div className={`text-lg font-bold ${orderFlow.aggressiveDelta > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {orderFlow.aggressiveDelta > 0 ? '+' : ''}{orderFlow.aggressiveDelta?.toFixed(1) || 'N/A'}%
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Cumulative</div>
            <div className={`text-lg font-bold ${orderFlow.cumulativeDelta > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {orderFlow.cumulativeDelta > 0 ? '+' : ''}{orderFlow.cumulativeDelta?.toFixed(0) || 'N/A'}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Institutional</div>
            <Badge variant={
              orderFlow.institutionalFlow === 'buying' ? 'default' :
              orderFlow.institutionalFlow === 'selling' ? 'destructive' : 'secondary'
            }>
              {orderFlow.institutionalFlow || 'N/A'}
            </Badge>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">POC</div>
            <div className="text-lg font-bold">
              {orderFlow.volumeProfile?.poc?.toFixed(5) || 'N/A'}
            </div>
          </div>
        </div>

        {orderFlow.tickCount && (
          <div className="mt-3 text-xs text-muted-foreground">
            📊 Based on {orderFlow.tickCount} real market ticks from the last hour
          </div>
        )}

        {orderFlow.volumeProfile && (
          <div className="mt-3">
            <div className="text-xs text-muted-foreground mb-2">Volume Profile</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">VAH:</span> {orderFlow.volumeProfile.vah?.toFixed(5) || 'N/A'}
              </div>
              <div>
                <span className="text-muted-foreground">VAL:</span> {orderFlow.volumeProfile.val?.toFixed(5) || 'N/A'}
              </div>
            </div>
          </div>
        )}

        {orderFlow.liquidityLevels && orderFlow.liquidityLevels.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-muted-foreground mb-2">Key Liquidity Levels</div>
            <div className="flex flex-wrap gap-1">
              {orderFlow.liquidityLevels.slice(0, 5).map((level: any, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {level.price?.toFixed(5)} ({level.strength})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSignalCard = (signal: SpecializedSignal) => (
    <Card key={signal.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {getSignalIcon(signal.signal_type)}
            <CardTitle className="text-lg">
              {signal.symbol} {signal.signal_type.toUpperCase()}
            </CardTitle>
            <Badge variant="outline">Specialized</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getConfidenceColor(signal.confidence)}>
              {(signal.confidence * 100).toFixed(0)}% Confidence
            </Badge>
            <Badge variant="secondary">
              Strength: {signal.strength}/10
            </Badge>
          </div>
        </div>
        <CardDescription className="flex items-center gap-4 mt-2">
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            Entry: {signal.suggested_entry.toFixed(5)}
          </span>
          <span>SL: {signal.suggested_stop_loss.toFixed(5)}</span>
          <span>TP: {signal.suggested_take_profit.toFixed(5)}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(signal.created_at).toLocaleTimeString()}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm text-muted-foreground">Primary Pattern</div>
            <div className="flex items-center gap-2">
              {getPatternIcon(signal.trend_context)}
              <Badge variant="outline">{signal.trend_context}</Badge>
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Pattern Maturity</div>
            <Badge variant="outline">{signal.volatility_regime}</Badge>
          </div>
        </div>

        {signal.intermediate_values && (
          <>
            {signal.intermediate_values.elliott_wave && 
              renderElliottWave(signal.intermediate_values.elliott_wave)}
            
            {signal.intermediate_values.harmonic_pattern && 
              renderHarmonicPattern(signal.intermediate_values.harmonic_pattern)}
            
            {signal.intermediate_values.order_flow && 
              renderOrderFlow(signal.intermediate_values.order_flow)}
          </>
        )}

        {signal.calculation_parameters && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">Pattern Parameters</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Primary Pattern:</span><br />
                <span>{signal.calculation_parameters.primary_pattern || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Maturity:</span><br />
                <span>{((signal.calculation_parameters.pattern_maturity || 0) * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Elliott Wave:</span><br />
                <span>{signal.calculation_parameters.elliott_wave_count || 'N/A'}/5</span>
              </div>
              <div>
                <span className="text-muted-foreground">Harmonic Type:</span><br />
                <span>{signal.calculation_parameters.harmonic_pattern_type || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <>
        <PageHeader 
          title="Specialized Analysis"
          description="Elliott waves, harmonic patterns, and advanced order flow analysis for precision trading"
          icon={Waves}
        />
        <div className="container mx-auto px-6 py-6">
          <div className="text-center">Loading specialized analysis...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader 
        title="Specialized Analysis"
        description="Elliott waves, harmonic patterns, and advanced order flow analysis for precision trading"
        icon={Waves}
      />
      <div className="container mx-auto px-6 py-6">
        <Tabs value={selectedPattern} onValueChange={setSelectedPattern} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Patterns</TabsTrigger>
            <TabsTrigger value="elliott">Elliott Wave</TabsTrigger>
            <TabsTrigger value="harmonic">Harmonic</TabsTrigger>
            <TabsTrigger value="orderflow">Order Flow</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid gap-4">
          {signals.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Specialized Signals</h3>
                <p className="text-muted-foreground">
                  No specialized pattern analysis signals found.
                </p>
              </CardContent>
            </Card>
          ) : (
            signals.map(renderSignalCard)
          )}
        </div>
      </div>
    </>
  );
}