import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fusionEngine, MasterSignal, FusionParameters } from '@/services/fusionEngine';
import { 
  Brain, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Clock,
  Activity,
  Settings,
  Zap,
  AlertTriangle
} from 'lucide-react';

export const FusionDashboard: React.FC = () => {
  const [masterSignals, setMasterSignals] = useState<MasterSignal[]>([]);
  const [fusionParameters, setFusionParameters] = useState<FusionParameters>(fusionEngine.getFusionParameters());
  const [isGenerating, setIsGenerating] = useState(false);
  const [observeOnlyMode, setObserveOnlyMode] = useState(true);

  useEffect(() => {
    fetchMasterSignals();
    const interval = setInterval(fetchMasterSignals, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMasterSignals = async () => {
    try {
      const signals = await fusionEngine.getRecentMasterSignals(10);
      setMasterSignals(signals);
    } catch (error) {
      console.error('Error fetching master signals:', error);
    }
  };

  const generateMasterSignal = async () => {
    setIsGenerating(true);
    try {
      const signal = await fusionEngine.generateMasterSignal('EURUSD', 'M15');
      if (signal) {
        setMasterSignals(prev => [signal, ...prev.slice(0, 9)]);
      }
    } catch (error) {
      console.error('Error generating master signal:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleObserveOnlyMode = (enabled: boolean) => {
    setObserveOnlyMode(enabled);
    fusionEngine.setObserveOnlyMode(enabled);
    setFusionParameters(fusionEngine.getFusionParameters());
  };

  const updateFusionParameter = (key: keyof FusionParameters, value: number | boolean) => {
    const newParams = { [key]: value };
    fusionEngine.updateFusionParameters(newParams);
    setFusionParameters(fusionEngine.getFusionParameters());
  };

  const getSignalIcon = (decision: string) => {
    switch (decision) {
      case 'BUY': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'SELL': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'NEUTRAL': return <Target className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.65) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return 'text-green-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'HIGH': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatModuleName = (moduleId: string) => {
    return moduleId.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Phase 7: Fusion Engine
              {observeOnlyMode && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Observe Only
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Master signal generation combining modular analysis with weighted fusion
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-2">
              <EyeOff className="h-4 w-4" />
              <Switch
                checked={observeOnlyMode}
                onCheckedChange={toggleObserveOnlyMode}
              />
              <Eye className="h-4 w-4" />
            </div>
            <Button 
              onClick={generateMasterSignal} 
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Generate Signal'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="signals" className="w-full">
          <TabsList>
            <TabsTrigger value="signals">Master Signals</TabsTrigger>
            <TabsTrigger value="parameters">Fusion Parameters</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          <TabsContent value="signals" className="mt-4">
            {masterSignals.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Master Signals</h3>
                <p className="text-muted-foreground mb-4">
                  Generate your first master signal by combining modular analysis
                </p>
                <Button onClick={generateMasterSignal} disabled={isGenerating}>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Master Signal
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {masterSignals.map((signal) => (
                  <Card key={signal.id} className="border-l-4 border-l-primary/20">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          {getSignalIcon(signal.fusion_decision)}
                          <CardTitle className="text-lg">
                            {signal.symbol} {signal.fusion_decision}
                          </CardTitle>
                          <Badge variant="outline">Master Signal</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getConfidenceColor(signal.confidence_score)}>
                            {(signal.confidence_score * 100).toFixed(1)}% Confidence
                          </Badge>
                          <Badge variant="secondary">
                            {signal.contributing_signals.length} Signals
                          </Badge>
                        </div>
                      </div>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          Entry: {signal.recommended_entry.toFixed(5)}
                        </span>
                        <span>SL: {signal.recommended_stop_loss.toFixed(5)}</span>
                        <span>TP: {signal.recommended_take_profit.toFixed(5)}</span>
                        <span>Size: {signal.recommended_lot_size}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(signal.created_at).toLocaleTimeString()}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Risk Assessment</div>
                          <Badge variant="outline" className={getRiskColor(signal.risk_assessment.risk_level)}>
                            {signal.risk_assessment.risk_level} Risk
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            Max Risk: {signal.risk_assessment.max_risk_percent}%
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Market Conditions</div>
                          <Badge variant="outline">{signal.market_conditions.trend}</Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            Volatility: {signal.market_conditions.volatility}
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-sm font-medium mb-2">Contributing Signals</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {signal.contributing_signals.map((contrib, index) => (
                            <div key={index} className="p-2 bg-muted rounded text-xs">
                              <div className="font-medium">
                                {formatModuleName(contrib.module_id)}
                              </div>
                              <div className="flex justify-between items-center">
                                <Badge variant={contrib.signal_type === 'buy' ? 'default' : 'destructive'} className="text-xs">
                                  {contrib.signal_type.toUpperCase()}
                                </Badge>
                                <span className="text-muted-foreground">
                                  {(contrib.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-sm font-medium mb-2">Fusion Reasoning</div>
                        <div className="text-sm text-muted-foreground p-3 bg-muted rounded">
                          {signal.fusion_reasoning}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Weighted Score:</span><br />
                          <span className="font-medium">{signal.weighted_score.toFixed(3)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Session:</span><br />
                          <span className="font-medium">{signal.market_conditions.session}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">News Impact:</span><br />
                          <span className="font-medium">{signal.market_conditions.news_impact}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span><br />
                          <Badge variant={signal.status === 'pending' ? 'secondary' : 'default'} className="text-xs">
                            {signal.status}
                          </Badge>
                        </div>
                      </div>

                      {observeOnlyMode && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded flex items-center gap-2">
                          <Eye className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-800">
                            Observe-Only Mode: Signal logged for analysis but not executed
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="parameters" className="mt-4">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Signal Weights</CardTitle>
                  <CardDescription>
                    Configure the relative importance of each analysis module
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Technical Analysis</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={fusionParameters.technical_weight}
                          onChange={(e) => updateFusionParameter('technical_weight', parseFloat(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-sm font-mono w-12">
                          {fusionParameters.technical_weight.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Fundamental Analysis</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={fusionParameters.fundamental_weight}
                          onChange={(e) => updateFusionParameter('fundamental_weight', parseFloat(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-sm font-mono w-12">
                          {fusionParameters.fundamental_weight.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Sentiment Analysis</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={fusionParameters.sentiment_weight}
                          onChange={(e) => updateFusionParameter('sentiment_weight', parseFloat(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-sm font-mono w-12">
                          {fusionParameters.sentiment_weight.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Quantitative Analysis</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={fusionParameters.quantitative_weight}
                          onChange={(e) => updateFusionParameter('quantitative_weight', parseFloat(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-sm font-mono w-12">
                          {fusionParameters.quantitative_weight.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Intermarket Analysis</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={fusionParameters.intermarket_weight}
                          onChange={(e) => updateFusionParameter('intermarket_weight', parseFloat(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-sm font-mono w-12">
                          {fusionParameters.intermarket_weight.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Specialized Analysis</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={fusionParameters.specialized_weight}
                          onChange={(e) => updateFusionParameter('specialized_weight', parseFloat(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-sm font-mono w-12">
                          {fusionParameters.specialized_weight.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Fusion Thresholds</CardTitle>
                  <CardDescription>
                    Configure signal generation and filtering parameters
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Min Contributing Signals</label>
                      <input
                        type="number"
                        min="2"
                        max="6"
                        value={fusionParameters.min_contributing_signals}
                        onChange={(e) => updateFusionParameter('min_contributing_signals', parseInt(e.target.value))}
                        className="w-full mt-1 p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Min Weighted Score</label>
                      <input
                        type="number"
                        min="0.3"
                        max="1.0"
                        step="0.05"
                        value={fusionParameters.min_weighted_score}
                        onChange={(e) => updateFusionParameter('min_weighted_score', parseFloat(e.target.value))}
                        className="w-full mt-1 p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Min Confidence Threshold</label>
                      <input
                        type="number"
                        min="0.3"
                        max="1.0"
                        step="0.05"
                        value={fusionParameters.min_confidence_threshold}
                        onChange={(e) => updateFusionParameter('min_confidence_threshold', parseFloat(e.target.value))}
                        className="w-full mt-1 p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Max Confidence Threshold</label>
                      <input
                        type="number"
                        min="0.7"
                        max="1.0"
                        step="0.05"
                        value={fusionParameters.max_confidence_threshold}
                        onChange={(e) => updateFusionParameter('max_confidence_threshold', parseFloat(e.target.value))}
                        className="w-full mt-1 p-2 border rounded"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <div className="text-center py-8">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Fusion Audit Trail</h3>
              <p className="text-muted-foreground">
                Every fusion decision is logged with timestamp, reasoning, and contributing factors.
                Check the console for detailed audit logs during signal generation.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};