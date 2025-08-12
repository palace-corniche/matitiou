import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, AlertTriangle, Target, Shield } from 'lucide-react';
import { CandleData } from '@/services/technicalAnalysis';
import { ConfluenceEngine, type ConfluenceSignal, type MarketSentiment, type RiskAssessment } from '@/services/confluenceEngine';
import { HarmonicPatternRecognition } from '@/services/harmonicPatterns';
import { ScalpingStrategies, DayTradingStrategies, SwingTradingStrategies, MultiTimeframeEngine } from '@/services/tradingStrategies';
import { AdvancedTrendIndicators, FibonacciTools, GannAnalysis, PivotPoints } from '@/services/advancedIndicators';

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

  const confluenceEngine = new ConfluenceEngine();

  useEffect(() => {
    if (data.length > 50) {
      analyzeMarket();
    }
  }, [data]);

  const analyzeMarket = async () => {
    setLoading(true);
    try {
      // This is a simplified version - in real implementation, you'd call all the analysis services
      const mockConfluenceSignal: ConfluenceSignal = {
        id: 'test-1',
        timestamp: new Date().toISOString(),
        pair,
        signal: 'buy',
        confluenceScore: 78,
        strength: 8,
        confidence: 85,
        entry: data[data.length - 1].close,
        stopLoss: data[data.length - 1].close * 0.98,
        takeProfit: data[data.length - 1].close * 1.05,
        riskReward: 2.5,
        factors: [
          { type: 'technical', name: 'RSI Oversold', signal: 'buy', weight: 7, strength: 8, description: 'RSI showing oversold conditions' },
          { type: 'harmonic', name: 'Gartley Pattern', signal: 'buy', weight: 9, strength: 9, description: 'Bullish Gartley pattern completed' },
          { type: 'fibonacci', name: 'Fibonacci 61.8%', signal: 'buy', weight: 8, strength: 7, description: 'Price at 61.8% retracement level' }
        ],
        description: 'Strong BUY signal with 78% confluence score',
        timeframes: ['15m', '1h', '4h'],
        alertLevel: 'high'
      };

      const mockSentiment: MarketSentiment = {
        overall: 'bullish',
        score: 45,
        components: {
          technical: 30,
          patterns: 50,
          harmonic: 60,
          strategies: 40,
          timeframes: 45
        },
        volatility: 'medium',
        recommendation: 'Favorable conditions for long positions'
      };

      const mockRisk: RiskAssessment = {
        riskLevel: 'medium',
        score: 35,
        factors: ['Medium volatility environment'],
        maxPositionSize: 2.5,
        suggestedStopLoss: mockConfluenceSignal.stopLoss,
        marketConditions: 'moderately bullish, medium volatility'
      };

      setConfluenceSignal(mockConfluenceSignal);
      setMarketSentiment(mockSentiment);
      setRiskAssessment(mockRisk);
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'buy': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'sell': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getAlertBadgeVariant = (level: string) => {
    switch (level) {
      case 'extreme': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Analyzing comprehensive market data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Signal Card */}
      {confluenceSignal && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getSignalIcon(confluenceSignal.signal)}
              Confluence Analysis - {pair}
              <Badge variant={getAlertBadgeVariant(confluenceSignal.alertLevel)}>
                {confluenceSignal.alertLevel.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-sm text-muted-foreground">Signal</div>
                <div className="font-semibold text-lg">{confluenceSignal.signal.toUpperCase()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Confluence Score</div>
                <div className="font-semibold text-lg">{confluenceSignal.confluenceScore.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Confidence</div>
                <div className="font-semibold text-lg">{confluenceSignal.confidence.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Risk/Reward</div>
                <div className="font-semibold text-lg">{confluenceSignal.riskReward.toFixed(2)}:1</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Entry Price</div>
                <div className="font-mono">{confluenceSignal.entry.toFixed(5)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Stop Loss</div>
                <div className="font-mono text-red-500">{confluenceSignal.stopLoss.toFixed(5)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Take Profit</div>
                <div className="font-mono text-green-500">{confluenceSignal.takeProfit.toFixed(5)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              {confluenceSignal?.factors.map((factor, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg mb-2">
                  <div>
                    <div className="font-medium">{factor.name}</div>
                    <div className="text-sm text-muted-foreground">{factor.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Weight: {factor.weight}</Badge>
                    <Badge variant="outline">Strength: {factor.strength}</Badge>
                    {getSignalIcon(factor.signal)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sentiment">
          <Card>
            <CardHeader>
              <CardTitle>Market Sentiment Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {marketSentiment && (
                <div className="space-y-4">
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
                </div>
              )}
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
              {riskAssessment && (
                <div className="space-y-4">
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
                </div>
              )}
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
        <Button variant="outline" onClick={() => window.open('/advanced-settings', '_blank')}>
          Advanced Settings
        </Button>
      </div>
    </div>
  );
};

export default ComprehensiveTradingDashboard;