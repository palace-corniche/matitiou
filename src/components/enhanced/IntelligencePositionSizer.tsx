import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Target, AlertTriangle } from 'lucide-react';
import { MarketIntelligence, marketIntelligenceEngine } from '@/services/marketIntelligenceEngine';

interface IntelligencePositionSizerProps {
  symbol: string;
  accountBalance: number;
  baseRiskPercent: number;
  onRecommendationChange?: (recommendation: PositionSizeRecommendation) => void;
}

interface PositionSizeRecommendation {
  recommendedLotSize: number;
  adjustedRiskPercent: number;
  confidenceLevel: number;
  reasoning: string[];
  riskAdjustments: {
    regimeAdjustment: number;
    sentimentAdjustment: number;
    volatilityAdjustment: number;
  };
}

export const IntelligencePositionSizer: React.FC<IntelligencePositionSizerProps> = ({
  symbol,
  accountBalance,
  baseRiskPercent,
  onRecommendationChange
}) => {
  const [intelligence, setIntelligence] = useState<MarketIntelligence | null>(null);
  const [recommendation, setRecommendation] = useState<PositionSizeRecommendation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIntelligenceAndCalculate();
  }, [symbol, accountBalance, baseRiskPercent]);

  const loadIntelligenceAndCalculate = async () => {
    try {
      setLoading(true);
      const intelligenceData = await marketIntelligenceEngine.getMarketIntelligence(symbol);
      setIntelligence(intelligenceData);
      
      const rec = calculateIntelligenceBasedPosition(intelligenceData);
      setRecommendation(rec);
      onRecommendationChange?.(rec);
    } catch (error) {
      console.error('Error loading intelligence for position sizing:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateIntelligenceBasedPosition = (intel: MarketIntelligence): PositionSizeRecommendation => {
    const reasoning: string[] = [];
    let riskMultiplier = 1.0;
    
    // Regime-based adjustment
    let regimeAdjustment = 0;
    switch (intel.regime.regime) {
      case 'risk-on':
        regimeAdjustment = intel.regime.confidence > 0.7 ? 0.2 : 0.1;
        reasoning.push(`Risk-on regime: +${Math.round(regimeAdjustment * 100)}% position size`);
        break;
      case 'risk-off':
        regimeAdjustment = intel.regime.confidence > 0.7 ? -0.3 : -0.15;
        reasoning.push(`Risk-off regime: ${Math.round(regimeAdjustment * 100)}% position size`);
        break;
      default:
        regimeAdjustment = -0.1;
        reasoning.push('Neutral regime: -10% position size for caution');
    }
    
    // Sentiment-based adjustment
    const sentimentScore = intel.sentiment.overallSentiment / 100;
    let sentimentAdjustment = 0;
    if (Math.abs(sentimentScore) > 0.3) {
      sentimentAdjustment = Math.sign(sentimentScore) * 0.15;
      reasoning.push(`Strong sentiment (${Math.round(sentimentScore * 100)}%): ${sentimentAdjustment > 0 ? '+' : ''}${Math.round(sentimentAdjustment * 100)}% position`);
    } else {
      sentimentAdjustment = -0.05;
      reasoning.push('Weak sentiment: -5% position size');
    }
    
    // Volatility adjustment based on VIX
    let volatilityAdjustment = 0;
    if (intel.regime.indicators.vix > 30) {
      volatilityAdjustment = -0.25;
      reasoning.push(`High volatility (VIX ${intel.regime.indicators.vix.toFixed(1)}): -25% position`);
    } else if (intel.regime.indicators.vix < 15) {
      volatilityAdjustment = 0.1;
      reasoning.push(`Low volatility (VIX ${intel.regime.indicators.vix.toFixed(1)}): +10% position`);
    } else {
      volatilityAdjustment = -0.05;
      reasoning.push('Moderate volatility: -5% position size');
    }
    
    // Economic surprise impact
    if (intel.surprises.length > 0) {
      const avgSurprise = intel.surprises.reduce((sum, s) => sum + Math.abs(s.surprise), 0) / intel.surprises.length;
      if (avgSurprise > 20) {
        volatilityAdjustment -= 0.1;
        reasoning.push('Major economic surprises: -10% additional risk reduction');
      }
    }
    
    // Calculate final multipliers
    riskMultiplier = Math.max(0.1, Math.min(2.0, 1 + regimeAdjustment + sentimentAdjustment + volatilityAdjustment));
    
    const adjustedRiskPercent = baseRiskPercent * riskMultiplier;
    const recommendedLotSize = (accountBalance * (adjustedRiskPercent / 100)) / 100000; // Assuming standard lot calculation
    
    // Calculate confidence based on intelligence quality
    const confidenceLevel = (
      intel.regime.confidence * 0.4 +
      intel.sentiment.confidence * 0.3 +
      (intel.surprises.length > 0 ? 0.8 : 0.5) * 0.3
    );

    return {
      recommendedLotSize: Math.round(recommendedLotSize * 100) / 100,
      adjustedRiskPercent: Math.round(adjustedRiskPercent * 100) / 100,
      confidenceLevel: Math.round(confidenceLevel * 100) / 100,
      reasoning,
      riskAdjustments: {
        regimeAdjustment,
        sentimentAdjustment,
        volatilityAdjustment
      }
    };
  };

  const getRiskLevelColor = () => {
    if (!recommendation) return 'text-muted-foreground';
    const ratio = recommendation.adjustedRiskPercent / baseRiskPercent;
    if (ratio > 1.2) return 'text-bullish';
    if (ratio < 0.8) return 'text-bearish';
    return 'text-muted-foreground';
  };

  const getConfidenceColor = () => {
    if (!recommendation) return 'bg-muted';
    if (recommendation.confidenceLevel > 0.7) return 'bg-bullish text-bullish-foreground';
    if (recommendation.confidenceLevel > 0.5) return 'bg-secondary text-secondary-foreground';
    return 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendation) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Intelligence Position Sizing</CardTitle>
        <Brain className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Recommendation Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Recommended Lot Size</div>
              <div className="text-lg font-bold">{recommendation.recommendedLotSize}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Adjusted Risk</div>
              <div className={`text-lg font-bold ${getRiskLevelColor()}`}>
                {recommendation.adjustedRiskPercent}%
              </div>
            </div>
          </div>

          {/* Confidence Level */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Confidence Level</span>
              <Badge className={getConfidenceColor()}>
                {Math.round(recommendation.confidenceLevel * 100)}%
              </Badge>
            </div>
            <Progress value={recommendation.confidenceLevel * 100} className="h-2" />
          </div>

          {/* Risk Adjustments */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Risk Adjustments:</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="text-muted-foreground">Regime</div>
                <div className={recommendation.riskAdjustments.regimeAdjustment > 0 ? 'text-bullish' : 'text-bearish'}>
                  {recommendation.riskAdjustments.regimeAdjustment > 0 ? '+' : ''}{Math.round(recommendation.riskAdjustments.regimeAdjustment * 100)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">Sentiment</div>
                <div className={recommendation.riskAdjustments.sentimentAdjustment > 0 ? 'text-bullish' : 'text-bearish'}>
                  {recommendation.riskAdjustments.sentimentAdjustment > 0 ? '+' : ''}{Math.round(recommendation.riskAdjustments.sentimentAdjustment * 100)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">Volatility</div>
                <div className={recommendation.riskAdjustments.volatilityAdjustment > 0 ? 'text-bullish' : 'text-bearish'}>
                  {recommendation.riskAdjustments.volatilityAdjustment > 0 ? '+' : ''}{Math.round(recommendation.riskAdjustments.volatilityAdjustment * 100)}%
                </div>
              </div>
            </div>
          </div>

          {/* Reasoning */}
          {recommendation.reasoning.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Analysis:</div>
              <div className="text-xs space-y-1">
                {recommendation.reasoning.slice(0, 3).map((reason, index) => (
                  <div key={index} className="flex items-start gap-1">
                    <AlertTriangle className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};