import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, AlertTriangle, Target, Shield, RefreshCw } from 'lucide-react';
import { CandleData } from '@/services/technicalAnalysis';
import { type ConfluenceSignal, type MarketSentiment, type RiskAssessment } from '@/services/confluenceEngine';
import { EnhancedSignalEngine } from '@/services/enhancedSignalEngine';
import { useToast } from '@/hooks/use-toast';
interface ComprehensiveTradingDashboardProps {
  data: CandleData[];
  pair?: string;
}
export const ComprehensiveTradingDashboard: React.FC<ComprehensiveTradingDashboardProps> = ({
  data,
  pair = "EUR/USD"
}) => {
  const [confluenceSignal, setConfluenceSignal] = useState<ConfluenceSignal | null>(null);
  const [marketSentiment, setMarketSentiment] = useState<MarketSentiment | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const enhancedEngine = new EnhancedSignalEngine();
  const {
    toast
  } = useToast();
  useEffect(() => {
    if (data.length > 50) {
      analyzeMarket();
    }
  }, [data]);
  const analyzeMarket = async () => {
    setLoading(true);
    setAnalysisProgress('Initializing comprehensive analysis...');
    try {
      // Phase 1: Generate comprehensive signal using all 120+ indicators
      setAnalysisProgress('Calculating 120+ technical indicators...');
      const confluenceSignal = await enhancedEngine.generateComprehensiveSignal(data, pair, '1h');
      if (confluenceSignal) {
        setConfluenceSignal(confluenceSignal);

        // Phase 2: Analyze market sentiment using all factors
        setAnalysisProgress('Analyzing market sentiment across all factors...');
        const sentiment = await enhancedEngine.analyzeMarketSentiment(data);
        setMarketSentiment(sentiment);

        // Phase 3: Assess risk using advanced metrics
        setAnalysisProgress('Performing advanced risk assessment...');
        const risk = await enhancedEngine.assessRisk(data, confluenceSignal);
        setRiskAssessment(risk);
        toast({
          title: "Analysis Complete",
          description: `Generated ${confluenceSignal.signal.toUpperCase()} signal with ${confluenceSignal.confluenceScore.toFixed(1)}% confluence score`
        });
      } else {
        toast({
          title: "No Clear Signal",
          description: "Insufficient confluence detected across all analysis methods",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Comprehensive analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to complete comprehensive market analysis",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setAnalysisProgress('');
    }
  };
  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'buy':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'sell':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };
  const getAlertBadgeVariant = (level: string) => {
    switch (level) {
      case 'extreme':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <div className="text-xl font-semibold mb-2">Comprehensive Market Analysis</div>
              <div className="text-muted-foreground mb-4">{analysisProgress}</div>
              <div className="text-sm text-muted-foreground max-w-md mx-auto">
                Analyzing 120+ indicators, 50+ patterns, harmonic analysis, Elliott waves, 
                Fibonacci levels, Gann analysis, 50+ strategies, and multi-timeframe confluence...
              </div>
            </CardContent>
          </Card>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-foreground">Advanced Trading Analysis</h1>
            {confluenceSignal && <Badge variant={confluenceSignal.alertLevel === 'high' || confluenceSignal.alertLevel === 'extreme' ? 'default' : 'secondary'}>
                {confluenceSignal.alertLevel.toUpperCase()} CONFLUENCE
              </Badge>}
          </div>
          <Button onClick={analyzeMarket} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing...' : 'Refresh Analysis'}
          </Button>
        </div>
      {/* Main Signal Card */}
      {confluenceSignal && <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getSignalIcon(confluenceSignal.signal)}
              Confluence Analysis - {pair}
              <Badge variant={getAlertBadgeVariant(confluenceSignal.alertLevel)}>
                {confluenceSignal.alertLevel.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          
        </Card>}

      <Tabs defaultValue="confluence" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="confluence">Confluence Factors</TabsTrigger>
          <TabsTrigger value="sentiment">Market Sentiment</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="confluence">
          <Card>
            <CardHeader>
              <CardTitle>Confluence Factors</CardTitle>
            </CardHeader>
            <CardContent>
              {confluenceSignal?.factors.map((factor, index) => <div key={index} className="flex items-center justify-between p-3 border rounded-lg mb-2">
                  <div>
                    <div className="font-medium">{factor.name}</div>
                    <div className="text-sm text-muted-foreground">{factor.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Weight: {factor.weight}</Badge>
                    <Badge variant="outline">Strength: {factor.strength}</Badge>
                    {getSignalIcon(factor.signal)}
                  </div>
                </div>)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sentiment">
          <Card>
            <CardHeader>
              <CardTitle>Market Sentiment Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {marketSentiment && <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{marketSentiment.overall.replace('_', ' ').toUpperCase()}</div>
                    <div className="text-muted-foreground">Overall Score: {marketSentiment.score.toFixed(1)}</div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Technical</div>
                      <div className="font-semibold">{marketSentiment.components.technical.toFixed(1)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Patterns</div>
                      <div className="font-semibold">{marketSentiment.components.patterns.toFixed(1)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Harmonic</div>
                      <div className="font-semibold">{marketSentiment.components.harmonic.toFixed(1)}</div>
                    </div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="font-medium mb-2">Recommendation</div>
                    <div>{marketSentiment.recommendation}</div>
                  </div>
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {riskAssessment && <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Risk Level</div>
                      <Badge variant={riskAssessment.riskLevel === 'low' || riskAssessment.riskLevel === 'very_low' ? 'default' : 'destructive'}>
                        {riskAssessment.riskLevel.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Max Position Size</div>
                      <div className="font-semibold">{riskAssessment.maxPositionSize.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Market Conditions</div>
                    <div>{riskAssessment.marketConditions}</div>
                  </div>
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Analysis Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">120+ Technical Indicators</h3>
                  <p className="text-sm text-muted-foreground">Comprehensive indicator analysis including Ichimoku, SuperTrend, advanced oscillators</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">50+ Candlestick Patterns</h3>
                  <p className="text-sm text-muted-foreground">Complete pattern recognition from single candle to complex formations</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Harmonic Patterns</h3>
                  <p className="text-sm text-muted-foreground">Gartley, Butterfly, Bat, Crab, and all harmonic pattern variations</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Elliott Wave Analysis</h3>
                  <p className="text-sm text-muted-foreground">Complete wave analysis with projections and degree classification</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Fibonacci Tools</h3>
                  <p className="text-sm text-muted-foreground">All Fibonacci levels, extensions, fans, arcs, and time zones</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">50+ Trading Strategies</h3>
                  <p className="text-sm text-muted-foreground">From scalping to position trading with multi-timeframe analysis</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2">
        <Button onClick={analyzeMarket} disabled={loading}>
          {loading ? 'Analyzing...' : 'Refresh Analysis'}
        </Button>
        <Button variant="outline" disabled>
          Advanced Settings
        </Button>
      </div>
      </div>
    </div>;
};
export default ComprehensiveTradingDashboard;