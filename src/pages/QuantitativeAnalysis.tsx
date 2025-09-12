import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  TrendingDown, 
  Calculator, 
  BarChart3, 
  Target,
  Clock,
  TrendingUp as ArrowUp,
  TrendingDown as ArrowDown,
  Activity
} from 'lucide-react';

interface QuantitativeSignal {
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

export default function QuantitativeAnalysisPage() {
  const [signals, setSignals] = useState<QuantitativeSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('overview');

  useEffect(() => {
    fetchQuantitativeSignals();
  }, []);

  const fetchQuantitativeSignals = async () => {
    try {
      setLoading(true);
      
      // Fetch modular signals for quantitative analysis
      const { data: modularData, error: modularError } = await supabase
        .from('modular_signals')
        .select('*')
        .eq('module_id', 'quantitative_analysis')
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch correlation data
      const { data: corrData, error: corrError } = await supabase
        .from('correlations')
        .select('*')
        .eq('asset_a', 'EUR/USD')
        .order('calculation_date', { ascending: false })
        .limit(10);

      // Fetch volatility metrics
      const { data: volData, error: volError } = await supabase
        .from('volatility_metrics')
        .select('*')
        .eq('symbol', 'EUR/USD')
        .order('calculation_date', { ascending: false })
        .limit(5);

      if (modularError) throw modularError;
      
      // Transform and combine data
      const quantSignals = (modularData || []).map(signal => {
        const baseValues = signal.intermediate_values && typeof signal.intermediate_values === 'object' 
          ? signal.intermediate_values as Record<string, any>
          : {};
        
        return {
          ...signal,
          intermediate_values: {
            ...baseValues,
            correlations: corrData || [],
            volatility_metrics: volData || []
          }
        };
      });

      setSignals(quantSignals as QuantitativeSignal[]);
    } catch (error) {
      console.error('Error fetching quantitative signals:', error);
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

  const getPerformanceColor = (value: number, type: 'ratio' | 'percentage') => {
    if (type === 'ratio') {
      if (value >= 2) return 'text-green-600';
      if (value >= 1.5) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      if (value >= 70) return 'text-green-600';
      if (value >= 50) return 'text-yellow-600';
      return 'text-red-600';
    }
  };

  const renderBacktestResults = (results: any) => {
    if (!results) return null;

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-3">Backtest Performance</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Win Rate</div>
            <div className={`text-lg font-bold ${getPerformanceColor(results.winRate * 100, 'percentage')}`}>
              {(results.winRate * 100).toFixed(1)}%
            </div>
            <Progress value={results.winRate * 100} className="mt-2" />
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Profit Factor</div>
            <div className={`text-lg font-bold ${getPerformanceColor(results.profitFactor, 'ratio')}`}>
              {results.profitFactor.toFixed(2)}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
            <div className={`text-lg font-bold ${getPerformanceColor(results.sharpeRatio, 'ratio')}`}>
              {results.sharpeRatio.toFixed(2)}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Max Drawdown</div>
            <div className="text-lg font-bold text-red-600">
              {(results.maxDrawdown * 100).toFixed(1)}%
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Total Trades</div>
            <div className="text-lg font-bold">
              {results.totalTrades}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderVolatilityMetrics = (volatility: any) => {
    if (!volatility) return null;

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-3">Volatility Analysis</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Historical Vol</div>
            <div className="text-lg font-bold">
              {(volatility.historicalVol * 100).toFixed(2)}%
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Implied Vol</div>
            <div className="text-lg font-bold">
              {(volatility.impliedVol * 100).toFixed(2)}%
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Vol Percentile</div>
            <div className="text-lg font-bold">
              {volatility.volPercentile.toFixed(0)}%
            </div>
            <Progress value={volatility.volPercentile} className="mt-2" />
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Vol Regime</div>
            <Badge variant={
              volatility.volRegime === 'high' ? 'destructive' :
              volatility.volRegime === 'low' ? 'secondary' : 'default'
            }>
              {volatility.volRegime}
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  const renderCorrelationMatrix = (correlations: any) => {
    if (!correlations) return null;

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-3">Asset Correlations</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(correlations).map(([asset, correlation]: [string, any]) => (
            <div key={asset} className="p-3 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground">{asset}</div>
              <div className="flex items-center gap-2">
                <div className={`text-lg font-bold ${correlation > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {correlation > 0 ? '+' : ''}{correlation.toFixed(2)}
                </div>
                {correlation > 0 ? 
                  <ArrowUp className="h-4 w-4 text-green-500" /> : 
                  <ArrowDown className="h-4 w-4 text-red-500" />
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRiskMetrics = (risk: any) => {
    if (!risk) return null;

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-3">Risk Metrics</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">VaR (95%)</div>
            <div className="text-lg font-bold text-red-600">
              {(risk.var95 * 100).toFixed(2)}%
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Expected Shortfall</div>
            <div className="text-lg font-bold text-red-600">
              {(risk.expectedShortfall * 100).toFixed(2)}%
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">Beta to Market</div>
            <div className="text-lg font-bold">
              {risk.betaToMarket.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSignalCard = (signal: QuantitativeSignal) => (
    <Card key={signal.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {getSignalIcon(signal.signal_type)}
            <CardTitle className="text-lg">
              {signal.symbol} {signal.signal_type.toUpperCase()}
            </CardTitle>
            <Badge variant="outline">Quantitative</Badge>
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
            <div className="text-sm text-muted-foreground">Volatility Regime</div>
            <Badge variant="outline">{signal.volatility_regime}</Badge>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Model Accuracy</div>
            <Badge variant="outline">
              {signal.calculation_parameters?.model_accuracy ? 
                `${(signal.calculation_parameters.model_accuracy * 100).toFixed(0)}%` : 'N/A'}
            </Badge>
          </div>
        </div>

        {signal.intermediate_values?.quant_data && (
          <>
            {renderBacktestResults(signal.intermediate_values.quant_data.backtestResults)}
            {renderVolatilityMetrics(signal.intermediate_values.quant_data.volatilityMetrics)}
            {renderCorrelationMatrix(signal.intermediate_values.quant_data.correlationMatrix)}
            {renderRiskMetrics(signal.intermediate_values.quant_data.riskMetrics)}
          </>
        )}

        {/* Display Real Data */}
        {signal.intermediate_values?.correlations && signal.intermediate_values.correlations.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Live Correlations</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {signal.intermediate_values.correlations.slice(0, 6).map((corr: any, index: number) => (
                <div key={index} className="p-2 bg-muted rounded-lg text-center">
                  <div className="text-sm font-medium">{corr.asset_b}</div>
                  <div className={`text-lg font-bold ${corr.correlation_value > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {corr.correlation_value?.toFixed(3)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {signal.intermediate_values?.volatility_metrics && signal.intermediate_values.volatility_metrics.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Live Volatility</h4>
            {signal.intermediate_values.volatility_metrics.slice(0, 2).map((vol: any, index: number) => (
              <div key={index} className="p-2 bg-muted rounded-lg mb-2">
                <div className="flex justify-between text-sm">
                  <span>{vol.timeframe}</span>
                  <span>ATR: {vol.atr?.toFixed(5)}</span>
                  <span>RV: {vol.realized_volatility?.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {signal.calculation_parameters && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">Model Parameters</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Backtest Period:</span><br />
                <span>{signal.calculation_parameters.backtest_period || 'N/A'} bars</span>
              </div>
              <div>
                <span className="text-muted-foreground">Vol Lookback:</span><br />
                <span>{signal.calculation_parameters.volatility_lookback || 'N/A'} bars</span>
              </div>
              <div>
                <span className="text-muted-foreground">Risk-Adj Return:</span><br />
                <span className={getPerformanceColor(signal.calculation_parameters.risk_adjusted_return || 0, 'ratio')}>
                  {signal.calculation_parameters.risk_adjusted_return?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Backtest Score:</span><br />
                <span>{signal.intermediate_values?.backtest_score?.toFixed(2) || 'N/A'}</span>
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
        <div className="text-center">Loading quantitative analysis...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Calculator className="h-8 w-8" />
          Quantitative Analysis
        </h1>
        <p className="text-muted-foreground">
          Statistical outputs from backtesting, correlation analysis, volatility modeling, and risk metrics
        </p>
      </div>

      <Tabs value={selectedMetric} onValueChange={setSelectedMetric} className="mb-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="backtest">Backtest Results</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="correlations">Correlations</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4">
        {signals.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Quantitative Signals</h3>
              <p className="text-muted-foreground">
                No quantitative analysis signals found.
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