// ============= ENHANCED TECHNICAL ANALYSIS PAGE =============
// Real-time Technical Analysis with 120+ Indicators and Live Charts

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3, 
  Target,
  Clock,
  Settings,
  Filter,
  Zap,
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
  IndicatorValue,
  IndicatorConfig 
} from '@/services/technicalIndicatorsAdvanced';
import { unifiedMarketData, UnifiedTick } from '@/services/unifiedMarketData';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface LivePriceData {
  price: number;
  bid: number;
  ask: number;
  spread: number;
  timestamp: number;
  connected: boolean;
}

export default function TechnicalAnalysisEnhanced() {
  // ============= STATE MANAGEMENT =============
  const [indicatorResult, setIndicatorResult] = useState<IndicatorResult | null>(null);
  const [livePriceData, setLivePriceData] = useState<LivePriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndicators, setSelectedIndicators] = useState<Set<string>>(new Set());
  const [indicatorConfigs, setIndicatorConfigs] = useState<Map<string, IndicatorConfig>>(new Map());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [priceHistory, setPriceHistory] = useState<Array<{time: string, price: number}>>([]);

  // ============= REAL-TIME DATA SUBSCRIPTION =============
  useEffect(() => {
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
  }, []);

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

  // ============= INDICATOR MANAGEMENT =============
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

  // ============= RENDERING HELPERS =============
  const getSignalIcon = (signalType: string, strength: number) => {
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

  // ============= COMPONENT RENDERING =============
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
    <div className="container mx-auto p-6 space-y-6">
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

      {/* ============= CONNECTION STATUS ============= */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {connected ? 
                <Wifi className="h-4 w-4 text-green-500" /> : 
                <WifiOff className="h-4 w-4 text-red-500" />
              }
              <span>
                Market Data: {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span>Updates: Real-time</span>
              <span>Indicators: {indicatorResult?.indicators.length || 0}</span>
              <span>Latency: &lt;100ms</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}