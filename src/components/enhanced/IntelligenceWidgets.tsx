import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, TrendingDown, Brain, AlertTriangle, 
  DollarSign, Target, Zap, ArrowRight 
} from 'lucide-react';
import { MarketIntelligence, marketIntelligenceEngine } from '@/services/marketIntelligenceEngine';
import { FundamentalAnalysisAdapter } from '@/services/analysisAdapters/fundamentalAnalysisAdapter';
import { toast } from 'sonner';

interface IntelligenceWidgetsProps {
  symbol: string;
  onSignalExecute?: (signalData: any) => void;
  className?: string;
}

export const IntelligenceWidgets: React.FC<IntelligenceWidgetsProps> = ({ 
  symbol, 
  onSignalExecute,
  className = ""
}) => {
  const [intelligence, setIntelligence] = useState<MarketIntelligence | null>(null);
  const [fundamentalSignal, setFundamentalSignal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIntelligenceData();
    const interval = setInterval(loadIntelligenceData, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [symbol]);

  const loadIntelligenceData = async () => {
    try {
      const [intelligenceData, signalData] = await Promise.all([
        marketIntelligenceEngine.getMarketIntelligence(symbol),
        new FundamentalAnalysisAdapter().analyze(symbol, '1h')
      ]);
      
      setIntelligence(intelligenceData);
      setFundamentalSignal(signalData);
    } catch (error) {
      console.error('Error loading intelligence data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case 'risk-on': return 'text-bullish';
      case 'risk-off': return 'text-bearish';
      default: return 'text-muted-foreground';
    }
  };

  const getSentimentColor = (score: number) => {
    if (score > 0.2) return 'text-bullish';
    if (score < -0.2) return 'text-bearish';
    return 'text-muted-foreground';
  };

  const getSentimentScore = () => {
    if (!intelligence?.sentiment?.overallSentiment) return 0;
    return intelligence.sentiment.overallSentiment / 100; // Convert to decimal
  };

  const handleQuickTrade = () => {
    if (!fundamentalSignal || !onSignalExecute) return;

    const tradeData = {
      symbol: fundamentalSignal.symbol,
      tradeType: fundamentalSignal.signal === 'buy' ? 'buy' : 'sell',
      lotSize: Math.min(0.1 * fundamentalSignal.confidence, 1.0), // Risk-adjusted lot size
      stopLoss: fundamentalSignal.stopLoss,
      takeProfit: fundamentalSignal.takeProfit,
      comment: `Intelligence Signal - ${fundamentalSignal.confidence.toFixed(2)} conf`,
      source: 'intelligence'
    };

    onSignalExecute(tradeData);
    toast.success(`Quick trade executed based on intelligence signal`);
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!intelligence) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Market Regime Widget */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Market Regime</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-lg font-bold capitalize ${getRegimeColor(intelligence.regime.regime)}`}>
                {intelligence.regime.regime.replace('-', ' ')}
              </span>
              <Badge variant="secondary">
                {Math.round(intelligence.regime.confidence * 100)}%
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">VIX:</span>
                <span className={intelligence.regime.indicators.vix > 25 ? 'text-bearish' : 'text-bullish'}>
                  {intelligence.regime.indicators.vix.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">USD:</span>
                <span>{intelligence.regime.indicators.usdIndex.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sentiment Widget */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Market Sentiment</CardTitle>
          <div className={`h-4 w-4 ${getSentimentColor(getSentimentScore()) === 'text-bullish' ? 'text-bullish' : getSentimentScore() < -0.2 ? 'text-bearish' : 'text-muted-foreground'}`}>
            {getSentimentScore() > 0.2 ? <TrendingUp className="h-4 w-4" /> : 
             getSentimentScore() < -0.2 ? <TrendingDown className="h-4 w-4" /> : 
             <div className="h-4 w-4 rounded-full bg-muted"></div>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Overall Score</span>
              <span className={`text-sm font-medium ${getSentimentColor(getSentimentScore())}`}>
                {getSentimentScore() > 0 ? '+' : ''}{(getSentimentScore() * 100).toFixed(1)}%
              </span>
            </div>
            
            <Progress 
              value={50 + (getSentimentScore() * 50)} 
              className="h-2"
            />
            
            <div className="text-xs text-muted-foreground">
              {intelligence.sentiment.sources?.length || 0} sources analyzed
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Economic Surprises Widget */}
      {intelligence.surprises && intelligence.surprises.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Economic Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {intelligence.surprises.slice(0, 3).map((event, index) => (
                <div key={index} className="text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{event.eventName}</span>
                    <Badge variant={event.surprise > 0 ? "default" : "secondary"} className="text-xs">
                      {event.surprise > 0 ? '+' : ''}{event.surprise.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">{event.currency}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trading Signal Widget */}
      {fundamentalSignal && (
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Intelligence Signal</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold uppercase ${fundamentalSignal.signal === 'buy' ? 'text-bullish' : 'text-bearish'}`}>
                  {fundamentalSignal.signal}
                </span>
                <Badge variant="outline">
                  {Math.round(fundamentalSignal.confidence * 100)}% conf
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry:</span>
                  <span className="font-medium">{fundamentalSignal.entry_price?.toFixed(5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SL:</span>
                  <span className="font-medium">{fundamentalSignal.stopLoss?.toFixed(5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TP:</span>
                  <span className="font-medium">{fundamentalSignal.takeProfit?.toFixed(5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk:</span>
                  <span className="font-medium">{fundamentalSignal.risk_score?.toFixed(1)}/10</span>
                </div>
              </div>

              {onSignalExecute && (
                <>
                  <Separator />
                  <Button 
                    onClick={handleQuickTrade}
                    size="sm" 
                    className="w-full"
                    disabled={fundamentalSignal.confidence < 0.6}
                  >
                    <Target className="h-3 w-3 mr-1" />
                    Quick Trade
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Currency Correlations Widget */}
      {intelligence.correlations && intelligence.correlations.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Correlations</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {intelligence.correlations.slice(0, 3).map((corr, index) => (
                <div key={index} className="text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{corr.pair1}/{corr.pair2}</span>
                    <span className={`font-medium ${Math.abs(corr.correlation) > 0.7 ? 'text-primary' : 'text-muted-foreground'}`}>
                      {corr.correlation > 0 ? '+' : ''}{(corr.correlation * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};