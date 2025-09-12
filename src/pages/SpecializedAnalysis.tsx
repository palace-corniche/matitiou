import React, { useState, useEffect } from 'react';
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
      const { data, error } = await supabase
        .from('modular_signals')
        .select('*')
        .eq('module_id', 'specialized_analysis')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSignals((data || []) as SpecializedSignal[]);
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
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Delta</div>
            <div className={`text-lg font-bold ${orderFlow.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {orderFlow.delta > 0 ? '+' : ''}{orderFlow.delta?.toFixed(0) || 'N/A'}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Cumulative Delta</div>
            <div className={`text-lg font-bold ${orderFlow.cumulativeDelta > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {orderFlow.cumulativeDelta > 0 ? '+' : ''}{orderFlow.cumulativeDelta?.toFixed(0) || 'N/A'}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Institutional Flow</div>
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
      <div className="container mx-auto p-6">
        <div className="text-center">Loading specialized analysis...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Waves className="h-8 w-8" />
          Specialized Analysis
        </h1>
        <p className="text-muted-foreground">
          Advanced pattern analysis including Elliott Wave, harmonic patterns, and order flow studies
        </p>
      </div>

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
  );
}