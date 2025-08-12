import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, Minus, AlertTriangle, 
  Activity, BarChart3, Target, Settings 
} from 'lucide-react';
import { TechnicalAnalysisEngine, type TechnicalAnalysisResult } from '@/services/technicalAnalysis';
import { CandlestickPatternRecognition, ChartPatternRecognition } from '@/services/patternRecognition';
import { SignalEngine } from '@/services/signalEngine';
import type { CandleData } from '@/services/technicalAnalysis';

interface TechnicalAnalysisPanelProps {
  data: CandleData[];
  timeframe: string;
  isVisible?: boolean;
  onToggle?: (visible: boolean) => void;
}

interface IndicatorSettings {
  [key: string]: {
    enabled: boolean;
    period?: number;
    color?: string;
  };
}

const TechnicalAnalysisPanel: React.FC<TechnicalAnalysisPanelProps> = ({
  data,
  timeframe,
  isVisible = true,
  onToggle
}) => {
  const [analysis, setAnalysis] = useState<TechnicalAnalysisResult | null>(null);
  const [candlestickPatterns, setCandlestickPatterns] = useState<any[]>([]);
  const [chartPatterns, setChartPatterns] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('indicators');
  const [indicatorSettings, setIndicatorSettings] = useState<IndicatorSettings>({
    RSI: { enabled: true, period: 14, color: '#8b5cf6' },
    MACD: { enabled: true, color: '#06b6d4' },
    'Bollinger Bands': { enabled: true, period: 20, color: '#f59e0b' },
    'SMA Crossover': { enabled: true, color: '#10b981' },
    Stochastic: { enabled: true, period: 14, color: '#ef4444' }
  });

  useEffect(() => {
    if (data && data.length > 0) {
      analyzeData();
    }
  }, [data, timeframe]);

  const analyzeData = async () => {
    setLoading(true);
    try {
      // Technical Analysis
      const technicalResult = TechnicalAnalysisEngine.analyzeCandles(data);
      setAnalysis(technicalResult);

      // Candlestick Patterns
      const candlePatterns = CandlestickPatternRecognition.detectPatterns(data);
      setCandlestickPatterns(candlePatterns.slice(-10)); // Last 10 patterns

      // Chart Patterns
      const chartPatterns = ChartPatternRecognition.analyzePatterns(data);
      setChartPatterns(chartPatterns);

      // Generate Trading Signals
      const signalEngine = new SignalEngine();
      const signal = signalEngine.generateSignal(data, 'EUR/USD', timeframe);
      if (signal) {
        setSignals([signal]);
      }

    } catch (error) {
      console.error('Error analyzing technical data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSignalIcon = (signal: string, strength: number) => {
    const iconClass = `w-4 h-4 ${strength >= 7 ? 'animate-pulse' : ''}`;
    
    switch (signal) {
      case 'buy':
        return <TrendingUp className={`${iconClass} text-bullish`} />;
      case 'sell':
        return <TrendingDown className={`${iconClass} text-bearish`} />;
      default:
        return <Minus className={`${iconClass} text-muted-foreground`} />;
    }
  };

  const getSignalBadgeVariant = (signal: string): "default" | "secondary" | "destructive" => {
    switch (signal) {
      case 'buy':
        return 'default';
      case 'sell':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const toggleIndicator = (name: string) => {
    setIndicatorSettings(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        enabled: !prev[name]?.enabled
      }
    }));
  };

  if (!isVisible) return null;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Technical Analysis
            <Badge variant="outline">{timeframe}</Badge>
          </CardTitle>
          {onToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggle(false)}
            >
              ×
            </Button>
          )}
        </div>
        
        {analysis && (
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              {getSignalIcon(analysis.overallSignal, analysis.overallStrength)}
              <Badge variant={getSignalBadgeVariant(analysis.overallSignal)}>
                {analysis.overallSignal.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Strength:</span>
              <Progress value={analysis.overallStrength * 10} className="w-20" />
              <span className="text-sm font-medium">{analysis.overallStrength}/10</span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="indicators">Indicators</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="signals">Signals</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="indicators" className="space-y-4">
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : analysis?.indicators.map((indicator, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getSignalIcon(indicator.signal, indicator.strength)}
                      <div>
                        <div className="font-medium">{indicator.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Value: {indicator.value?.toFixed(4) || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getSignalBadgeVariant(indicator.signal)}>
                        {indicator.signal}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Progress value={indicator.strength * 10} className="w-12" />
                        <span className="text-xs w-6">{indicator.strength}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="patterns" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Candlestick Patterns
                </h4>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {candlestickPatterns.map((pattern, index) => (
                      <div key={index} className="p-2 border rounded text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{pattern.name}</span>
                          <Badge 
                            variant={pattern.signal === 'bullish' ? 'default' : 
                                   pattern.signal === 'bearish' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {pattern.signal}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground mt-1">
                          Strength: {pattern.strength}/10
                        </div>
                      </div>
                    ))}
                    {candlestickPatterns.length === 0 && (
                      <div className="text-center text-muted-foreground py-4">
                        No patterns detected
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Chart Patterns
                </h4>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {chartPatterns.map((pattern, index) => (
                      <div key={index} className="p-2 border rounded text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{pattern.name}</span>
                          <Badge 
                            variant={pattern.signal === 'bullish' ? 'default' : 
                                   pattern.signal === 'bearish' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {pattern.signal}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground mt-1">
                          Strength: {pattern.strength}/10
                        </div>
                      </div>
                    ))}
                    {chartPatterns.length === 0 && (
                      <div className="text-center text-muted-foreground py-4">
                        No patterns detected
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="signals" className="space-y-4">
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {signals.map((signal, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getSignalIcon(signal.signal, signal.strength)}
                        <Badge variant={getSignalBadgeVariant(signal.signal)} className="font-semibold">
                          {signal.signal.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {signal.confidence}% Confidence
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(signal.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm">
                        <strong>Price:</strong> {signal.price.toFixed(5)}
                      </div>
                      {signal.stopLoss && (
                        <div className="text-sm">
                          <strong>Stop Loss:</strong> {signal.stopLoss.toFixed(5)}
                        </div>
                      )}
                      {signal.takeProfit && (
                        <div className="text-sm">
                          <strong>Take Profit:</strong> {signal.takeProfit.toFixed(5)}
                        </div>
                      )}
                      <div className="text-sm">
                        <strong>Description:</strong> {signal.description}
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="space-y-1">
                      <div className="text-sm font-medium">Signal Sources:</div>
                      {signal.sources.slice(0, 3).map((source: any, sourceIndex: number) => (
                        <div key={sourceIndex} className="text-xs text-muted-foreground ml-2">
                          • {source.name} ({source.strength}/10)
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
                
                {signals.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No active signals
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Indicator Settings
              </h4>
              <div className="space-y-3">
                {Object.entries(indicatorSettings).map(([name, settings]) => (
                  <div key={name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={settings.enabled}
                        onCheckedChange={() => toggleIndicator(name)}
                      />
                      <span className="font-medium">{name}</span>
                      {settings.period && (
                        <Badge variant="outline">Period: {settings.period}</Badge>
                      )}
                    </div>
                    <div
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: settings.color }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button onClick={analyzeData} disabled={loading} className="flex-1">
                {loading ? 'Analyzing...' : 'Refresh Analysis'}
              </Button>
              <Button variant="outline" onClick={() => setSignals([])}>
                Clear Signals
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TechnicalAnalysisPanel;