import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { KeyLevelsEngine, type KeyLevel, type ComputedLevels } from '../services/keyLevelsEngine';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3, 
  Target,
  Clock,
  Settings,
  Filter,
  Gauge,
  LineChart,
  Search,
  RefreshCw,
  Wifi,
  WifiOff,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  realTimeIndicatorEngine, 
  AdvancedTechnicalIndicators,
  IndicatorResult, 
  IndicatorValue
} from '@/services/technicalIndicatorsAdvanced';
import { unifiedMarketData, UnifiedTick } from '@/services/unifiedMarketData';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

interface LivePriceData {
  price: number;
  bid: number;
  ask: number;
  spread: number;
  timestamp: number;
  connected: boolean;
}

export default function TechnicalAnalysisPage() {
  // ============= STATE MANAGEMENT =============
  const [signals, setSignals] = useState<TechnicalSignal[]>([]);
  const [indicatorResult, setIndicatorResult] = useState<IndicatorResult | null>(null);
  const [livePriceData, setLivePriceData] = useState<LivePriceData | null>(null);
  const [keyLevels, setKeyLevels] = useState<ComputedLevels | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('15m');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndicators, setSelectedIndicators] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [priceHistory, setPriceHistory] = useState<Array<{time: string, price: number}>>([]);

  // ============= REAL-TIME DATA SUBSCRIPTION =============
  useEffect(() => {
    fetchTechnicalSignals();
    
    let indicatorUnsubscribe: (() => void) | undefined;
    let priceUnsubscribe: (() => void) | undefined;

    // Subscribe to technical indicators
    indicatorUnsubscribe = realTimeIndicatorEngine.subscribe((result: IndicatorResult) => {
      setIndicatorResult(result);
      setLoading(false);
      console.log(`📊 Technical indicators updated: ${result.indicators.length} indicators, ${result.overallSignal} signal`);
    });

    // Subscribe to live price data
    priceUnsubscribe = unifiedMarketData.subscribe({
      onTick: (tick: UnifiedTick) => {
        setLivePriceData({
          price: tick.price,
          bid: tick.bid,
          ask: tick.ask,
          spread: tick.spread,
          timestamp: tick.timestamp,
          connected: true
        });

        // Update price history for chart
        setPriceHistory(prev => {
          const newEntry = {
            time: new Date(tick.timestamp).toLocaleTimeString(),
            price: tick.price
          };
          const updated = [...prev, newEntry].slice(-50); // Keep last 50 points
          return updated;
        });
      },
      onConnectionChange: (isConnected: boolean) => {
        setConnected(isConnected);
        console.log(`📊 Price feed connection: ${isConnected ? 'Connected' : 'Disconnected'}`);
      },
      onError: (error: Error) => {
        console.error('❌ Price feed error:', error);
        setConnected(false);
      }
    });

    return () => {
      indicatorUnsubscribe?.();
      priceUnsubscribe?.();
    };
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

      if (modularError) throw modularError;
      
      // Compute real-time key levels from market data
      const marketData = await unifiedMarketData.getForexData(selectedTimeframe);
      const computedLevels = KeyLevelsEngine.computeKeyLevels(marketData, selectedTimeframe);
      setKeyLevels(computedLevels);
      
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
            keyLevels: computedLevels
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

  // ============= RENDERING HELPERS =============
  const getSignalIcon = (signalType: string, strength: number = 5) => {
    const IconComponent = signalType === 'buy' ? TrendingUp : signalType === 'sell' ? TrendingDown : Activity;
    const colorClass = signalType === 'buy' ? 'text-green-500' : signalType === 'sell' ? 'text-red-500' : 'text-muted-foreground';
    
    return <IconComponent className={`h-4 w-4 ${colorClass}`} />;
  };

  const getSignalBadgeVariant = (signal: string) => {
    switch (signal) {
      case 'buy': return 'default';
      case 'sell': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStrengthColor = (strength: number) => {
    if (strength >= 8) return 'text-green-600';
    if (strength >= 6) return 'text-yellow-600';
    if (strength >= 4) return 'text-blue-600';
    return 'text-muted-foreground';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // ============= INDICATOR FILTERING AND SEARCH =============
  const filteredIndicators = useCallback(() => {
    if (!indicatorResult) return [];

    let filtered = indicatorResult.indicators;

    // Filter by category
    if (activeCategory !== 'all') {
      filtered = filtered.filter(indicator => indicator.category === activeCategory);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(indicator => 
        indicator.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by strength (highest first)
    filtered.sort((a, b) => b.strength - a.strength);

    return filtered;
  }, [indicatorResult, activeCategory, searchTerm]);

  const toggleIndicatorSelection = (indicatorName: string) => {
    setSelectedIndicators(prev => {
      const newSet = new Set(prev);
      if (newSet.has(indicatorName)) {
        newSet.delete(indicatorName);
      } else {
        newSet.add(indicatorName);
      }
      return newSet;
    });
  };

  const getIndicatorCategories = () => {
    if (!indicatorResult) return [];
    
    const categories = Array.from(new Set(indicatorResult.indicators.map(i => i.category)));
    return ['all', ...categories];
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

        {/* Display Computed Key Levels */}
        {signal.intermediate_values?.keyLevels && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Live Key Levels</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* Support Levels */}
              {signal.intermediate_values.keyLevels.support?.slice(0, 3).map((level: KeyLevel, index: number) => {
                const distancePips = (level.distance_from_current * 10000).toFixed(1);
                
                return (
                  <div key={`support-${index}`} className="p-3 rounded-lg text-sm border-l-4 bg-green-50 border-green-500 text-green-700">
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-medium">SUPPORT</div>
                      <Badge variant="outline" className="text-xs">
                        {level.strength}/10
                      </Badge>
                    </div>
                    <div className="font-mono text-base mb-1">
                      {level.price.toFixed(5)}
                    </div>
                    <div className="text-xs opacity-80 space-y-1">
                      <div>Distance: {distancePips} pips</div>
                      <div>Touches: {level.touches}</div>
                      <div>Age: {level.age_hours.toFixed(0)}h</div>
                    </div>
                  </div>
                );
              })}
              
              {/* Resistance Levels */}
              {signal.intermediate_values.keyLevels.resistance?.slice(0, 3).map((level: KeyLevel, index: number) => {
                const distancePips = (level.distance_from_current * 10000).toFixed(1);
                
                return (
                  <div key={`resistance-${index}`} className="p-3 rounded-lg text-sm border-l-4 bg-red-50 border-red-500 text-red-700">
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-medium">RESISTANCE</div>
                      <Badge variant="outline" className="text-xs">
                        {level.strength}/10
                      </Badge>
                    </div>
                    <div className="font-mono text-base mb-1">
                      {level.price.toFixed(5)}
                    </div>
                    <div className="text-xs opacity-80 space-y-1">
                      <div>Distance: {distancePips} pips</div>
                      <div>Touches: {level.touches}</div>
                      <div>Age: {level.age_hours.toFixed(0)}h</div>
                    </div>
                  </div>
                );
              })}
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <div className="text-lg font-medium">Loading Real-time Technical Analysis...</div>
            <div className="text-sm text-muted-foreground">Initializing 120+ indicators and live price feeds</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Technical Analysis"
        description="Advanced technical indicators, patterns, and chart analysis with real-time price feeds"
        icon={LineChart}
      />
      <div className="container mx-auto px-6 py-6 space-y-6">
      {/* ============= HEADER WITH LIVE PRICE =============*/}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Advanced Technical Analysis
          </h1>
          <p className="text-muted-foreground">
            Real-time analysis with 120+ technical indicators and live market data
          </p>
        </div>

        {/* Live Price Display */}
        <Card className="w-full lg:w-auto">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {connected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
                <span className="text-sm font-medium">EUR/USD</span>
              </div>
              {livePriceData && (
                <div className="text-right">
                  <div className="text-2xl font-bold">{livePriceData.price.toFixed(5)}</div>
                  <div className="text-xs text-muted-foreground">
                    Bid: {livePriceData.bid.toFixed(5)} | Ask: {livePriceData.ask.toFixed(5)} | Spread: {livePriceData.spread} pips
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============= OVERALL SIGNAL SUMMARY ============= */}
      {indicatorResult && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Market Signal Overview
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={getSignalBadgeVariant(indicatorResult.overallSignal)} className="px-3 py-1">
                  {getSignalIcon(indicatorResult.overallSignal, indicatorResult.overallStrength)}
                  <span className="ml-1">{indicatorResult.overallSignal.toUpperCase()}</span>
                </Badge>
                <Badge variant="outline">
                  Confidence: {indicatorResult.confidence.toFixed(1)}%
                </Badge>
                <Badge variant="secondary">
                  Strength: {indicatorResult.overallStrength}/10
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {getIndicatorCategories().slice(1).map(category => {
                const categoryIndicators = indicatorResult.indicators.filter(i => i.category === category);
                const buyCount = categoryIndicators.filter(i => i.signal === 'buy').length;
                const sellCount = categoryIndicators.filter(i => i.signal === 'sell').length;
                const neutralCount = categoryIndicators.filter(i => i.signal === 'neutral').length;
                
                return (
                  <div key={category} className="p-3 border rounded-lg">
                    <div className="text-sm font-medium capitalize mb-2">{category}</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-green-600">Buy:</span>
                        <span>{buyCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">Sell:</span>
                        <span>{sellCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Neutral:</span>
                        <span>{neutralCount}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============= PRICE CHART ============= */}
      {priceHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Live Price Chart
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={['dataMin - 0.0001', 'dataMax + 0.0001']} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============= INDICATORS CONTROL PANEL ============= */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Indicators Control Panel
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search indicators..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-2">
              {getIndicatorCategories().map(category => (
                <Button
                  key={category}
                  variant={activeCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(category)}
                  className="capitalize"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Results Summary */}
          {indicatorResult && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Total Indicators: {indicatorResult.indicators.length}</span>
              <span>Filtered: {filteredIndicators().length}</span>
              <span>Last Update: {new Date(indicatorResult.timestamp).toLocaleTimeString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============= INDICATORS GRID ============= */}
      {indicatorResult && (
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Technical Indicators ({filteredIndicators().length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="grid gap-3">
                  {filteredIndicators().map((indicator, index) => (
                    <div key={`${indicator.name}-${index}`} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getSignalIcon(indicator.signal, indicator.strength)}
                            <span className="font-medium">{indicator.name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {indicator.category}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-mono text-sm">
                              {indicator.value !== null ? indicator.value.toFixed(5) : 'N/A'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(indicator.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                          
                          <Badge variant={getSignalBadgeVariant(indicator.signal)}>
                            {indicator.signal.toUpperCase()}
                          </Badge>
                          
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-medium ${getStrengthColor(indicator.strength)}`}>
                              {indicator.strength}
                            </span>
                            <span className="text-xs text-muted-foreground">/10</span>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleIndicatorSelection(indicator.name)}
                            className="p-1"
                          >
                            {selectedIndicators.has(indicator.name) ? 
                              <Eye className="h-3 w-3" /> : 
                              <EyeOff className="h-3 w-3" />
                            }
                          </Button>
                        </div>
                      </div>
                      
                      {/* Strength bar */}
                      <div className="mt-2">
                        <Progress value={indicator.strength * 10} className="h-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============= REAL-TIME KEY LEVELS ============= */}
      <Tabs value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
        <TabsList>
          <TabsTrigger value="1m">1M</TabsTrigger>
          <TabsTrigger value="5m">5M</TabsTrigger>
          <TabsTrigger value="15m">15M</TabsTrigger>
          <TabsTrigger value="1h">1H</TabsTrigger>
          <TabsTrigger value="4h">4H</TabsTrigger>
          <TabsTrigger value="1d">1D</TabsTrigger>
        </TabsList>
        <TabsContent value={selectedTimeframe}>
          <div className="grid gap-6">
            {/* Pivot Points */}
            {keyLevels && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Classic Pivot Points ({selectedTimeframe})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-7 gap-4">
                    <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <div className="text-xs text-muted-foreground">R3</div>
                      <div className="font-mono text-sm text-red-600">{keyLevels.r3.toFixed(5)}</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <div className="text-xs text-muted-foreground">R2</div>
                      <div className="font-mono text-sm text-red-600">{keyLevels.r2.toFixed(5)}</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <div className="text-xs text-muted-foreground">R1</div>
                      <div className="font-mono text-sm text-red-600">{keyLevels.r1.toFixed(5)}</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <div className="text-xs text-muted-foreground">PP</div>
                      <div className="font-mono text-sm font-semibold">{keyLevels.pivot_point.toFixed(5)}</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div className="text-xs text-muted-foreground">S1</div>
                      <div className="font-mono text-sm text-green-600">{keyLevels.s1.toFixed(5)}</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div className="text-xs text-muted-foreground">S2</div>
                      <div className="font-mono text-sm text-green-600">{keyLevels.s2.toFixed(5)}</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div className="text-xs text-muted-foreground">S3</div>
                      <div className="font-mono text-sm text-green-600">{keyLevels.s3.toFixed(5)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dynamic Support/Resistance Levels */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <TrendingUp className="h-5 w-5" />
                    Support Levels
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {keyLevels?.support.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No support levels detected
                      </div>
                    ) : (
                      keyLevels?.support.map((level, index) => (
                        <div key={level.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <div className="flex-1">
                            <div className="font-mono font-semibold text-green-700 dark:text-green-400">
                              {level.price.toFixed(5)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {level.touches} touches • {level.age_hours.toFixed(0)}h old
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${level.strength >= 8 ? 'bg-green-600' : level.strength >= 6 ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                              <span className="text-sm font-medium">{level.strength}/10</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {Math.abs(level.distance_from_current * 10000).toFixed(1)} pips
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <TrendingDown className="h-5 w-5" />
                    Resistance Levels
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {keyLevels?.resistance.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No resistance levels detected
                      </div>
                    ) : (
                      keyLevels?.resistance.map((level, index) => (
                        <div key={level.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                          <div className="flex-1">
                            <div className="font-mono font-semibold text-red-700 dark:text-red-400">
                              {level.price.toFixed(5)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {level.touches} touches • {level.age_hours.toFixed(0)}h old
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${level.strength >= 8 ? 'bg-red-600' : level.strength >= 6 ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                              <span className="text-sm font-medium">{level.strength}/10</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {Math.abs(level.distance_from_current * 10000).toFixed(1)} pips
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Technical Signals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Database Signals ({selectedTimeframe})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {signals.length === 0 ? (
                    <div className="p-8 text-center">
                      <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Technical Signals</h3>
                      <p className="text-muted-foreground">
                        No technical analysis signals found for {selectedTimeframe} timeframe.
                      </p>
                    </div>
                  ) : (
                    signals.map(renderSignalCard)
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
}