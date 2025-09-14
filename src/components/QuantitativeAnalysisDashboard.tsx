import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  Target,
  Activity,
  LineChart,
  BarChart3,
  PieChart,
  Zap,
  Shield,
  Gauge,
  Layers,
  ArrowUpDown,
  CircuitBoard,
  RefreshCw
} from 'lucide-react';
import { AdvancedQuantEngine, GARCHModel, MeanReversionModel, RegimeSwitchingModel, RiskMetrics } from '@/services/advancedQuantEngine';
import { MachineLearningModels, SentimentAnalysisResult, EconomicSurpriseIndex } from '@/services/machinelearningModels';
import { StatisticalArbitrage, PairsTradingSignal, MarketNeutralStrategy, VolatilityTradingStrategy } from '@/services/statisticalArbitrage';
import { toast } from '@/hooks/use-toast';

interface LSTMPrediction {
  nextPrice: number;
  confidence: number;
  direction: 'up' | 'down' | 'sideways';
  volatilityForecast: number;
  horizon: number;
}

interface AnalysisResults {
  garch?: GARCHModel;
  meanReversion?: MeanReversionModel;
  regimeSwitching?: RegimeSwitchingModel;
  riskMetrics?: RiskMetrics;
  lstmPrediction?: LSTMPrediction;
  sentiment?: SentimentAnalysisResult;
  economicSurprise?: EconomicSurpriseIndex;
  pairsTrading?: PairsTradingSignal[];
  marketNeutral?: MarketNeutralStrategy;
  volatilityTrading?: VolatilityTradingStrategy;
}

export default function QuantitativeAnalysisDashboard() {
  const [activeAnalysis, setActiveAnalysis] = useState('overview');
  const [results, setResults] = useState<AnalysisResults>({});
  const [loading, setLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('EUR/USD');
  
  const quantEngine = new AdvancedQuantEngine();
  const mlModels = new MachineLearningModels();
  const statArb = new StatisticalArbitrage();

  useEffect(() => {
    loadInitialAnalysis();
  }, [selectedSymbol]);

  const loadInitialAnalysis = async () => {
    setLoading(true);
    try {
      // Load basic analysis results
      await Promise.all([
        runRiskAnalysis(),
        runSentimentAnalysis(),
        runEconomicSurpriseAnalysis()
      ]);
    } catch (error) {
      console.error('Error loading initial analysis:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to load initial analysis results",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runAdvancedVolatilityAnalysis = async () => {
    setLoading(true);
    try {
      // Generate sample returns data
      const sampleReturns = Array.from({ length: 252 }, () => (Math.random() - 0.5) * 0.02);
      
      const [garch, meanReversion, regimeSwitching] = await Promise.all([
        quantEngine.fitGARCH(sampleReturns),
        quantEngine.analyzeOrnsteinUhlenbeck(sampleReturns.map((r, i) => 100 * Math.exp(sampleReturns.slice(0, i+1).reduce((sum, ret) => sum + ret, 0)))),
        quantEngine.fitRegimeSwitchingModel(sampleReturns)
      ]);

      setResults(prev => ({ ...prev, garch, meanReversion, regimeSwitching }));
      
      toast({
        title: "Volatility Analysis Complete",
        description: "Advanced volatility models have been fitted successfully"
      });
    } catch (error) {
      console.error('Error in volatility analysis:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to complete volatility analysis",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runRiskAnalysis = async () => {
    try {
      const sampleReturns = Array.from({ length: 252 }, () => (Math.random() - 0.5) * 0.02);
      const riskMetrics = quantEngine.calculateAdvancedRiskMetrics(sampleReturns);
      setResults(prev => ({ ...prev, riskMetrics }));
    } catch (error) {
      console.error('Error in risk analysis:', error);
    }
  };

  const runMLAnalysis = async () => {
    setLoading(true);
    try {
      // Initialize LSTM model
      const config = {
        inputSize: 20,
        hiddenLayers: [50, 30],
        outputSize: 1,
        learningRate: 0.001,
        epochs: 100,
        batchSize: 32
      };

      const lstm = mlModels.initializeLSTM(config);
      
      // Generate sample features
      const sampleInputs = Array.from({ length: 10 }, () => 
        Array.from({ length: 20 }, () => Math.random())
      );
      
      const prediction = mlModels.forwardPassLSTM(sampleInputs);
      
      const lstmPrediction: LSTMPrediction = {
        nextPrice: prediction[0],
        confidence: Math.random() * 0.4 + 0.6,
        direction: prediction[0] > 0 ? 'up' : 'down',
        volatilityForecast: Math.abs(prediction[0]) * 0.1,
        horizon: 1
      };

      setResults(prev => ({ ...prev, lstmPrediction }));
      
      toast({
        title: "ML Analysis Complete",
        description: "LSTM prediction model has generated forecasts"
      });
    } catch (error) {
      console.error('Error in ML analysis:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to complete machine learning analysis",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runSentimentAnalysis = async () => {
    try {
      const sampleNews = [
        "Markets showing strong bullish momentum with positive economic indicators",
        "Central bank dovish stance supports risk assets",
        "Volatility declining as investors show confidence",
        "Economic data beats expectations driving optimism"
      ];

      const sentiment = await mlModels.analyzeSentiment(sampleNews);
      setResults(prev => ({ ...prev, sentiment }));
    } catch (error) {
      console.error('Error in sentiment analysis:', error);
    }
  };

  const runEconomicSurpriseAnalysis = async () => {
    try {
      const economicData = [
        { indicator: 'GDP Growth', actual: 2.5, forecast: 2.2, importance: 1.0 },
        { indicator: 'Employment Rate', actual: 3.8, forecast: 4.0, importance: 0.9 },
        { indicator: 'Inflation Rate', actual: 3.2, forecast: 3.1, importance: 0.8 },
        { indicator: 'Retail Sales', actual: 1.5, forecast: 1.2, importance: 0.7 }
      ];

      const economicSurprise = mlModels.calculateEconomicSurpriseIndex(economicData);
      setResults(prev => ({ ...prev, economicSurprise }));
    } catch (error) {
      console.error('Error in economic surprise analysis:', error);
    }
  };

  const runStatisticalArbitrage = async () => {
    setLoading(true);
    try {
      const universe = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'];
      const pairsTrading = await statArb.identifyPairsTradingOpportunities(universe);
      
      setResults(prev => ({ ...prev, pairsTrading }));
      
      toast({
        title: "Statistical Arbitrage Complete",
        description: `Found ${pairsTrading.length} pairs trading opportunities`
      });
    } catch (error) {
      console.error('Error in statistical arbitrage:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to complete statistical arbitrage analysis",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runVolatilityTrading = async () => {
    setLoading(true);
    try {
      const volatilityTrading = await statArb.analyzeVolatilityTradingOpportunities(selectedSymbol);
      
      setResults(prev => ({ ...prev, volatilityTrading }));
      
      toast({
        title: "Volatility Analysis Complete",
        description: "Volatility trading opportunities identified"
      });
    } catch (error) {
      console.error('Error in volatility trading analysis:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to complete volatility trading analysis",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderGARCHResults = () => {
    if (!results.garch) return null;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            GARCH Volatility Model
          </CardTitle>
          <CardDescription>Advanced volatility forecasting with GARCH(1,1)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Alpha (ARCH)</div>
              <div className="text-lg font-bold">{results.garch.alpha.toFixed(4)}</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Beta (GARCH)</div>
              <div className="text-lg font-bold">{results.garch.beta.toFixed(4)}</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Omega</div>
              <div className="text-lg font-bold">{results.garch.omega.toFixed(6)}</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Vol Forecast</div>
              <div className="text-lg font-bold text-primary">
                {(results.garch.forecast * 100).toFixed(2)}%
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-muted-foreground mb-2">Model Quality</div>
            <div className="flex items-center gap-2">
              <Progress value={Math.abs(results.garch.logLikelihood) / 100 * 100} className="flex-1" />
              <span className="text-sm">Log-Likelihood: {results.garch.logLikelihood.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMeanReversionResults = () => {
    if (!results.meanReversion) return null;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Mean Reversion Analysis
          </CardTitle>
          <CardDescription>Ornstein-Uhlenbeck process parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Kappa (Speed)</div>
              <div className="text-lg font-bold">{results.meanReversion.kappa.toFixed(4)}</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Theta (Mean)</div>
              <div className="text-lg font-bold">{results.meanReversion.theta.toFixed(4)}</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Half-Life</div>
              <div className="text-lg font-bold">{results.meanReversion.halfLife.toFixed(1)} days</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Significance</div>
              <Badge variant={results.meanReversion.pValue < 0.05 ? "default" : "secondary"}>
                p = {results.meanReversion.pValue.toFixed(3)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderRiskMetrics = () => {
    if (!results.riskMetrics) return null;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Advanced Risk Metrics
          </CardTitle>
          <CardDescription>Comprehensive risk analysis including tail risk</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">VaR (95%)</div>
              <div className="text-lg font-bold text-red-600">
                {(results.riskMetrics.var95 * 100).toFixed(2)}%
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">CVaR (95%)</div>
              <div className="text-lg font-bold text-red-600">
                {(results.riskMetrics.cvar95 * 100).toFixed(2)}%
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Max Drawdown</div>
              <div className="text-lg font-bold text-red-600">
                {(Math.abs(results.riskMetrics.maxDrawdown) * 100).toFixed(2)}%
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Sortino Ratio</div>
              <div className="text-lg font-bold">{results.riskMetrics.sortinoRatio.toFixed(2)}</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Skewness</div>
              <div className="text-lg font-bold">{results.riskMetrics.skewness.toFixed(2)}</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Kurtosis</div>
              <div className="text-lg font-bold">{results.riskMetrics.kurtosis.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderLSTMPrediction = () => {
    if (!results.lstmPrediction) return null;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            LSTM Neural Network Prediction
          </CardTitle>
          <CardDescription>Deep learning price forecasting</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Direction</div>
              <div className="flex items-center gap-2">
                {results.lstmPrediction.direction === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className="font-bold capitalize">{results.lstmPrediction.direction}</span>
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Confidence</div>
              <div className="text-lg font-bold">
                {(results.lstmPrediction.confidence * 100).toFixed(1)}%
              </div>
              <Progress value={results.lstmPrediction.confidence * 100} className="mt-1" />
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Vol Forecast</div>
              <div className="text-lg font-bold">
                {(results.lstmPrediction.volatilityForecast * 100).toFixed(2)}%
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Horizon</div>
              <div className="text-lg font-bold">{results.lstmPrediction.horizon} period(s)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSentimentAnalysis = () => {
    if (!results.sentiment) return null;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Market Sentiment Analysis
          </CardTitle>
          <CardDescription>AI-powered sentiment from news and social media</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Overall Sentiment</div>
              <Badge variant={
                results.sentiment.sentiment === 'bullish' ? 'default' :
                results.sentiment.sentiment === 'bearish' ? 'destructive' : 'secondary'
              }>
                {results.sentiment.sentiment}
              </Badge>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Confidence</div>
              <div className="text-lg font-bold">
                {(results.sentiment.confidence * 100).toFixed(1)}%
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Score</div>
              <div className="text-lg font-bold">{results.sentiment.score.toFixed(2)}</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-muted-foreground mb-2">Key Keywords</div>
            <div className="flex flex-wrap gap-2">
              {results.sentiment.keywords.map((keyword, index) => (
                <Badge key={index} variant="outline">{keyword}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderPairsTradingResults = () => {
    if (!results.pairsTrading || results.pairsTrading.length === 0) return null;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Statistical Arbitrage - Pairs Trading
          </CardTitle>
          <CardDescription>Cointegration-based mean reversion opportunities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {results.pairsTrading.slice(0, 3).map((pair, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold">{pair.pair1} / {pair.pair2}</div>
                    <div className="text-sm text-muted-foreground">
                      Hedge Ratio: {pair.hedgeRatio.toFixed(3)}
                    </div>
                  </div>
                  <Badge variant={pair.entrySignal === 'long' ? 'default' : 'destructive'}>
                    {pair.entrySignal}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Z-Score</div>
                    <div className="font-bold">{pair.zScore.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Confidence</div>
                    <div className="font-bold">{(pair.confidence * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Expected Return</div>
                    <div className="font-bold text-green-600">
                      {(pair.expectedReturn * 100).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Half-Life</div>
                    <div className="font-bold">{pair.expectedHoldingPeriod.toFixed(1)} days</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Calculator className="h-8 w-8" />
              Advanced Quantitative Analysis
            </h1>
            <p className="text-muted-foreground">
              Institutional-grade mathematical models, machine learning, and statistical arbitrage
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeAnalysis} onValueChange={setActiveAnalysis} className="mb-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="volatility">Volatility Models</TabsTrigger>
          <TabsTrigger value="ml">Machine Learning</TabsTrigger>
          <TabsTrigger value="arbitrage">Stat Arbitrage</TabsTrigger>
          <TabsTrigger value="risk">Risk Analytics</TabsTrigger>
          <TabsTrigger value="alternative">Alt Data</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={runAdvancedVolatilityAnalysis}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  GARCH Models
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {results.garch ? 'Complete' : 'Run Analysis'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Volatility forecasting
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={runMLAnalysis}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Neural Networks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {results.lstmPrediction ? 'Complete' : 'Run Analysis'}
                </div>
                <div className="text-xs text-muted-foreground">
                  LSTM predictions
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={runStatisticalArbitrage}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Pairs Trading
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {results.pairsTrading ? results.pairsTrading.length : 'Run Analysis'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Arbitrage opportunities
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={runVolatilityTrading}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Vol Trading
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {results.volatilityTrading ? 'Complete' : 'Run Analysis'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Options strategies
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6">
            {renderRiskMetrics()}
            {renderSentimentAnalysis()}
          </div>
        </TabsContent>

        <TabsContent value="volatility" className="space-y-6">
          <div className="flex gap-4 mb-6">
            <Button onClick={runAdvancedVolatilityAnalysis} disabled={loading}>
              <Activity className="h-4 w-4 mr-2" />
              Run GARCH Analysis
            </Button>
          </div>
          
          {renderGARCHResults()}
          {renderMeanReversionResults()}
        </TabsContent>

        <TabsContent value="ml" className="space-y-6">
          <div className="flex gap-4 mb-6">
            <Button onClick={runMLAnalysis} disabled={loading}>
              <Brain className="h-4 w-4 mr-2" />
              Run ML Analysis
            </Button>
          </div>
          
          {renderLSTMPrediction()}
        </TabsContent>

        <TabsContent value="arbitrage" className="space-y-6">
          <div className="flex gap-4 mb-6">
            <Button onClick={runStatisticalArbitrage} disabled={loading}>
              <Layers className="h-4 w-4 mr-2" />
              Find Opportunities
            </Button>
          </div>
          
          {renderPairsTradingResults()}
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          {renderRiskMetrics()}
        </TabsContent>

        <TabsContent value="alternative" className="space-y-6">
          {renderSentimentAnalysis()}
          
          {results.economicSurprise && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Economic Surprise Index
                </CardTitle>
                <CardDescription>Macro data vs expectations analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Index Value</div>
                    <div className="text-lg font-bold">{results.economicSurprise.index.toFixed(3)}</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Trend</div>
                    <Badge variant={
                      results.economicSurprise.trend === 'improving' ? 'default' :
                      results.economicSurprise.trend === 'deteriorating' ? 'destructive' : 'secondary'
                    }>
                      {results.economicSurprise.trend}
                    </Badge>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Significance</div>
                    <div className="text-lg font-bold">
                      {(results.economicSurprise.significance * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}