import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { untypedSupabase as supabase } from '@/integrations/supabase/untypedClient';
import { 
  TrendingUp, 
  TrendingDown, 
  Globe, 
  Target,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Coins,
  Network
} from 'lucide-react';

interface IntermarketSignal {
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

export default function IntermarketAnalysisPage() {
  const [signals, setSignals] = useState<IntermarketSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState('signals');

  useEffect(() => {
    fetchIntermarketSignals();
  }, []);

  const fetchIntermarketSignals = async () => {
    try {
      setLoading(true);
      
      // Fetch real data from existing database tables
      const [signalsResult, correlationsResult] = await Promise.all([
        supabase
          .from('modular_signals')
          .select('*')
          .eq('module_id', 'intermarket_analysis')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('correlations')
          .select('*')
          .order('calculated_at', { ascending: false })
          .limit(20)
      ]);

      if (signalsResult.error) throw signalsResult.error;
      
      // Build correlations map from real DB data
      const corrData = correlationsResult.data || [];
      const getCorr = (pair: string) => {
        const found = corrData.find((c: any) => c.symbol_pair?.includes(pair));
        return found?.correlation_coefficient ?? null;
      };
      
      const enrichedSignals = (signalsResult.data || []).map(signal => ({
        ...signal,
        intermediate_values: {
          ...(typeof signal.intermediate_values === 'object' && signal.intermediate_values !== null ? signal.intermediate_values : {}),
          intermarket_data: {
            forexCorrelations: {
              'GBP/USD': getCorr('GBP/USD') ?? 'N/A',
              'USD/JPY': getCorr('USD/JPY') ?? 'N/A',
              'AUD/USD': getCorr('AUD/USD') ?? 'N/A'
            },
            commodityRelations: {
              gold: {
                currentPrice: null,
                correlation: getCorr('GOLD') ?? 'N/A',
                change24h: null
              },
              oil: {
                currentPrice: null,
                correlation: getCorr('OIL') ?? 'N/A',
                change24h: null
              },
              copper: {
                currentPrice: null,
                correlation: getCorr('COPPER') ?? 'N/A',
                change24h: null
              }
            },
            equityIndices: {
              spy: {
                performance: null,
                correlation: getCorr('SPX') ?? 'N/A',
                currentPrice: null
              },
              vix: {
                level: null,
                correlation: getCorr('VIX') ?? 'N/A'
              },
              dxy: {
                level: null,
                correlation: getCorr('DXY') ?? 'N/A',
                change24h: null
              }
            },
            bondMarkets: {
              us10y: {
                yield: null,
                correlation: getCorr('US10Y') ?? 'N/A'
              },
              ger10y: {
                yield: null,
                correlation: getCorr('GER10Y') ?? 'N/A'
              },
              yieldSpread: null
            },
            riskSentiment: {
              riskOn: null,
              confidence: null
            }
          }
        }
      }));
      
      setSignals(enrichedSignals as IntermarketSignal[]);
    } catch (error) {
      console.error('Error fetching intermarket signals:', error);
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

  const getCorrelationIcon = (correlation: number) => {
    if (correlation > 0) {
      return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    } else {
      return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    }
  };

  const getCorrelationColor = (correlation: number) => {
    const abs = Math.abs(correlation);
    if (abs >= 0.7) return 'text-red-600 font-bold';
    if (abs >= 0.5) return 'text-yellow-600 font-medium';
    return 'text-gray-600';
  };

  const renderForexCorrelations = (correlations: any) => {
    if (!correlations) return null;

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-3">Forex Cross-Correlations</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(correlations).map(([pair, correlation]: [string, any]) => (
            <div key={pair} className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{pair}</span>
                {getCorrelationIcon(correlation)}
              </div>
              <div className={`text-lg font-bold ${getCorrelationColor(correlation)}`}>
                {correlation > 0 ? '+' : ''}{correlation.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCommodityRelations = (commodities: any) => {
    if (!commodities) return null;

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-3">Commodity Relationships</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Gold</span>
            </div>
            <div className="text-lg font-bold">${commodities.gold?.currentPrice?.toFixed(0) || 'N/A'}</div>
            <div className={`text-xs ${commodities.gold?.change24h > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {commodities.gold?.change24h > 0 ? '+' : ''}{commodities.gold?.change24h?.toFixed(2) || '0.00'}% (24h)
            </div>
            <div className={`text-sm ${getCorrelationColor(commodities.gold?.correlation || 0)}`}>
              Correlation: {commodities.gold?.correlation?.toFixed(2) || 'N/A'}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-4 w-4 bg-black rounded-full" />
              <span className="text-sm font-medium">Oil</span>
            </div>
            <div className="text-lg font-bold">${commodities.oil?.currentPrice?.toFixed(2) || 'N/A'}</div>
            <div className={`text-xs ${commodities.oil?.change24h > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {commodities.oil?.change24h > 0 ? '+' : ''}{commodities.oil?.change24h?.toFixed(2) || '0.00'}% (24h)
            </div>
            <div className={`text-sm ${getCorrelationColor(commodities.oil?.correlation || 0)}`}>
              Correlation: {commodities.oil?.correlation?.toFixed(2) || 'N/A'}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-4 w-4 bg-orange-500 rounded-full" />
              <span className="text-sm font-medium">Copper</span>
            </div>
            <div className="text-lg font-bold">${commodities.copper?.currentPrice?.toFixed(2) || 'N/A'}</div>
            <div className={`text-xs ${commodities.copper?.change24h > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {commodities.copper?.change24h > 0 ? '+' : ''}{commodities.copper?.change24h?.toFixed(2) || '0.00'}% (24h)
            </div>
            <div className={`text-sm ${getCorrelationColor(commodities.copper?.correlation || 0)}`}>
              Correlation: {commodities.copper?.correlation?.toFixed(2) || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEquityIndices = (equities: any) => {
    if (!equities) return null;

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-3">Equity Index Relations</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">S&P 500</div>
            <div className="text-lg font-bold">
              {equities.spy?.performance > 0 ? '+' : ''}{equities.spy?.performance?.toFixed(2) || 'N/A'}%
            </div>
            <div className={`text-xs ${getCorrelationColor(equities.spy?.correlation || 0)}`}>
              Correlation: {equities.spy?.correlation?.toFixed(2) || 'N/A'}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">VIX</div>
            <div className="text-lg font-bold">{equities.vix?.level?.toFixed(1) || 'N/A'}</div>
            <div className={`text-xs ${getCorrelationColor(equities.vix?.correlation || 0)}`}>
              Correlation: {equities.vix?.correlation?.toFixed(2) || 'N/A'}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">DXY</div>
            <div className="text-lg font-bold">{equities.dxy?.level?.toFixed(2) || 'N/A'}</div>
            <div className={`text-xs ${getCorrelationColor(equities.dxy?.correlation || 0)}`}>
              Correlation: {equities.dxy?.correlation?.toFixed(2) || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBondMarkets = (bonds: any) => {
    if (!bonds) return null;

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-3">Bond Market Analysis</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">US 10Y</div>
            <div className="text-lg font-bold">{bonds.us10y?.yield?.toFixed(2) || 'N/A'}%</div>
            <div className={`text-xs ${getCorrelationColor(bonds.us10y?.correlation || 0)}`}>
              Correlation: {bonds.us10y?.correlation?.toFixed(2) || 'N/A'}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">GER 10Y</div>
            <div className="text-lg font-bold">{bonds.ger10y?.yield?.toFixed(2) || 'N/A'}%</div>
            <div className={`text-xs ${getCorrelationColor(bonds.ger10y?.correlation || 0)}`}>
              Correlation: {bonds.ger10y?.correlation?.toFixed(2) || 'N/A'}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">Yield Spread</div>
            <div className="text-lg font-bold">{bonds.yieldSpread?.toFixed(2) || 'N/A'} bps</div>
            <div className="text-xs text-muted-foreground">US - GER</div>
          </div>
        </div>
      </div>
    );
  };

  const renderRiskSentiment = (riskData: any) => {
    if (!riskData) return null;

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-3">Risk Environment</h4>
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Market Sentiment</span>
            <Badge variant={riskData.riskOn ? 'default' : 'destructive'}>
              {riskData.riskOn ? 'Risk On' : 'Risk Off'}
            </Badge>
          </div>
          <div className="text-lg font-bold mt-1">
            {(riskData.confidence * 100).toFixed(0)}% Confidence
          </div>
        </div>
      </div>
    );
  };

  const renderSignalCard = (signal: IntermarketSignal) => (
    <Card key={signal.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {getSignalIcon(signal.signal_type)}
            <CardTitle className="text-lg">
              {signal.symbol} {signal.signal_type.toUpperCase()}
            </CardTitle>
            <Badge variant="outline">Intermarket</Badge>
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
            <div className="text-sm text-muted-foreground">Risk Environment</div>
            <Badge variant="outline">{signal.trend_context}</Badge>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Primary Driver</div>
            <Badge variant="outline">{signal.volatility_regime}</Badge>
          </div>
        </div>

        {signal.intermediate_values?.intermarket_data && (
          <>
            {renderForexCorrelations(signal.intermediate_values.intermarket_data.forexCorrelations)}
            {renderCommodityRelations(signal.intermediate_values.intermarket_data.commodityRelations)}
            {renderEquityIndices(signal.intermediate_values.intermarket_data.equityIndices)}
            {renderBondMarkets(signal.intermediate_values.intermarket_data.bondMarkets)}
            {renderRiskSentiment(signal.intermediate_values.intermarket_data.riskSentiment)}
          </>
        )}

        {signal.calculation_parameters && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">Analysis Parameters</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Primary Driver:</span><br />
                <span>{signal.calculation_parameters.primary_driver || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Correlation Strength:</span><br />
                <span className={getCorrelationColor(signal.calculation_parameters.correlation_strength || 0)}>
                  {signal.calculation_parameters.correlation_strength?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Risk Environment:</span><br />
                <span>{signal.calculation_parameters.risk_environment || 'N/A'}</span>
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
          title="Intermarket Analysis"
          description="Cross-asset insights showing relationships between forex, commodities, indices, and bonds"
          icon={Network}
        />
        <div className="container mx-auto px-6 py-6">
          <div className="text-center">Loading intermarket analysis...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader 
        title="Intermarket Analysis"
        description="Cross-asset insights showing relationships between forex, commodities, indices, and bonds"
        icon={Network}
      />
      <div className="container mx-auto px-6 py-6">
        <Tabs value={selectedView} onValueChange={setSelectedView} className="mb-6">
          <TabsList>
            <TabsTrigger value="signals">Intermarket Signals</TabsTrigger>
            <TabsTrigger value="correlations">Correlations</TabsTrigger>
            <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid gap-4">
          {signals.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Intermarket Signals</h3>
                <p className="text-muted-foreground">
                  No intermarket analysis signals found.
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