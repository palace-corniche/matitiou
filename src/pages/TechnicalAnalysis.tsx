import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3, 
  Target,
  Clock,
  Zap,
  ExternalLink
} from 'lucide-react';

interface TechnicalSignal {
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
  market_data_snapshot: any;
}

export default function TechnicalAnalysisPage() {
  const [signals, setSignals] = useState<TechnicalSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('15m');
  const [showEnhancedVersion, setShowEnhancedVersion] = useState(false);

  useEffect(() => {
    fetchTechnicalSignals();
  }, [selectedTimeframe]);

  const fetchTechnicalSignals = async () => {
    try {
      setLoading(true);
      
      // Fetch modular signals for technical analysis
      const { data: modularData, error: modularError } = await supabase
        .from('modular_signals')
        .select('*')
        .eq('module_id', 'technical_analysis')
        .eq('timeframe', selectedTimeframe)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch pattern signals for additional technical data
      const { data: patternData, error: patternError } = await supabase
        .from('pattern_signals')
        .select('*')
        .eq('symbol', 'EUR/USD')
        .eq('timeframe', selectedTimeframe)
        .order('detected_at', { ascending: false })
        .limit(5);

      // Fetch support/resistance levels
      const { data: levelsData, error: levelsError } = await supabase
        .from('support_resistance')
        .select('*')
        .eq('symbol', 'EUR/USD')
        .eq('timeframe', selectedTimeframe)
        .order('detected_at', { ascending: false })
        .limit(5);

      if (modularError) throw modularError;
      
      // Transform and combine data
      const modularSignals = (modularData || []).map(signal => {
        const baseValues = signal.intermediate_values && typeof signal.intermediate_values === 'object' 
          ? signal.intermediate_values as Record<string, any>
          : {};
        
        return {
          ...signal,
          intermediate_values: {
            ...baseValues,
            patterns: patternData || [],
            supportResistance: levelsData || []
          }
        };
      });

      setSignals(modularSignals as TechnicalSignal[]);
    } catch (error) {
      console.error('Error fetching technical signals:', error);
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

  const renderIndicatorValues = (indicators: any) => {
    if (!indicators) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
        {indicators.rsi && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">RSI</div>
            <div className="text-2xl font-bold">{indicators.rsi.toFixed(1)}</div>
            <Progress value={indicators.rsi} className="mt-2" />
          </div>
        )}
        
        {indicators.macd && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">MACD</div>
            <div className="text-lg font-bold">
              {indicators.macd.macd > 0 ? '+' : ''}{indicators.macd.macd.toFixed(4)}
            </div>
            <div className="text-xs text-muted-foreground">
              Signal: {indicators.macd.signal.toFixed(4)}
            </div>
          </div>
        )}

        {indicators.sma20 && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">SMA 20</div>
            <div className="text-lg font-bold">{indicators.sma20.toFixed(5)}</div>
          </div>
        )}

        {indicators.bollinger && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">Bollinger Bands</div>
            <div className="text-xs">
              Upper: {indicators.bollinger.upper.toFixed(5)}
            </div>
            <div className="text-xs">
              Middle: {indicators.bollinger.middle.toFixed(5)}
            </div>
            <div className="text-xs">
              Lower: {indicators.bollinger.lower.toFixed(5)}
            </div>
          </div>
        )}

        {indicators.stochastic && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">Stochastic</div>
            <div className="text-lg font-bold">
              %K: {indicators.stochastic.k.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">
              %D: {indicators.stochastic.d.toFixed(1)}
            </div>
          </div>
        )}

        {indicators.supportResistance && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">Support/Resistance</div>
            <div className="text-xs">
              Support: {indicators.supportResistance.support?.[0]?.toFixed(5) || 'N/A'}
            </div>
            <div className="text-xs">
              Resistance: {indicators.supportResistance.resistance?.[0]?.toFixed(5) || 'N/A'}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSignalCard = (signal: TechnicalSignal) => (
    <Card key={signal.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {getSignalIcon(signal.signal_type)}
            <CardTitle className="text-lg">
              {signal.symbol} {signal.signal_type.toUpperCase()}
            </CardTitle>
            <Badge variant="outline">{signal.timeframe}</Badge>
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
            <div className="text-sm text-muted-foreground">Trend Context</div>
            <Badge variant="outline">{signal.trend_context}</Badge>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Volatility</div>
            <Badge variant="outline">{signal.volatility_regime}</Badge>
          </div>
        </div>

        {renderIndicatorValues(signal.intermediate_values)}
        
        {/* Display Pattern Signals */}
        {signal.intermediate_values?.patterns && signal.intermediate_values.patterns.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Chart Patterns</h4>
            <div className="space-y-2">
              {signal.intermediate_values.patterns.slice(0, 3).map((pattern: any, index: number) => (
                <div key={index} className="p-2 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{pattern.pattern_type}</span>
                    <Badge variant="outline">
                      {pattern.confidence ? (pattern.confidence * 100).toFixed(0) + '%' : 'N/A'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Entry: {pattern.entry_price?.toFixed(5)} | SL: {pattern.stop_loss?.toFixed(5)} | TP: {pattern.take_profit?.toFixed(5)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Display Support/Resistance Levels */}
        {signal.intermediate_values?.supportResistance && signal.intermediate_values.supportResistance.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Key Levels</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {signal.intermediate_values.supportResistance.map((level: any, index: number) => (
                <div key={index} className={`p-2 rounded-lg text-sm ${
                  level.level_type === 'support' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  <div className="font-medium">{level.level_type.toUpperCase()}</div>
                  <div className="font-mono">{level.level_price?.toFixed(5)}</div>
                  <div className="text-xs opacity-70">Strength: {level.strength}/10</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading technical analysis...</div>
      </div>
    );
  }

  // Handle enhanced version redirect
  if (showEnhancedVersion) {
    window.location.href = '/technical-analysis-enhanced';
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              Technical Analysis
            </h1>
            <p className="text-muted-foreground">
              Raw technical insights from RSI, MACD, moving averages, and support/resistance levels
            </p>
          </div>
          
          {/* Enhanced Version CTA */}
          <Card className="w-80">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Enhanced Analysis Available</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Access 120+ real-time indicators, live charts, and advanced pattern detection
                  </p>
                  <Button 
                    size="sm" 
                    onClick={() => setShowEnhancedVersion(true)}
                    className="w-full flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open Enhanced Version
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs value={selectedTimeframe} onValueChange={setSelectedTimeframe} className="mb-6">
        <TabsList>
          <TabsTrigger value="1m">1M</TabsTrigger>
          <TabsTrigger value="5m">5M</TabsTrigger>
          <TabsTrigger value="15m">15M</TabsTrigger>
          <TabsTrigger value="1h">1H</TabsTrigger>
          <TabsTrigger value="4h">4H</TabsTrigger>
          <TabsTrigger value="1d">1D</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4">
        {signals.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Technical Signals</h3>
              <p className="text-muted-foreground">
                No technical analysis signals found for {selectedTimeframe} timeframe.
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