import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MarketRegime } from '@/services/marketIntelligenceEngine';

interface MarketRegimeIndicatorProps {
  regime: MarketRegime;
}

export const MarketRegimeIndicator: React.FC<MarketRegimeIndicatorProps> = ({ regime }) => {
  const getRegimeIcon = () => {
    switch (regime.regime) {
      case 'risk-on':
        return <TrendingUp className="h-5 w-5 text-bullish" />;
      case 'risk-off':
        return <TrendingDown className="h-5 w-5 text-bearish" />;
      default:
        return <Minus className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getRegimeColor = () => {
    switch (regime.regime) {
      case 'risk-on':
        return 'text-bullish';
      case 'risk-off':
        return 'text-bearish';
      default:
        return 'text-muted-foreground';
    }
  };

  const getConfidenceColor = () => {
    if (regime.confidence > 0.7) return 'bg-bullish text-bullish-foreground';
    if (regime.confidence > 0.5) return 'bg-secondary text-secondary-foreground';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Market Regime</CardTitle>
        {getRegimeIcon()}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-bold capitalize ${getRegimeColor()}`}>
              {regime.regime.replace('-', ' ')}
            </span>
            <Badge className={getConfidenceColor()}>
              {Math.round(regime.confidence * 100)}% confident
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">VIX:</span>
              <span className={regime.indicators.vix > 25 ? 'text-bearish' : 'text-bullish'}>
                {regime.indicators.vix.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">USD Index:</span>
              <span>{regime.indicators.usdIndex.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Commodities:</span>
              <span className={regime.indicators.commodities > 50 ? 'text-bullish' : 'text-bearish'}>
                {regime.indicators.commodities.toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Equities:</span>
              <span className={regime.indicators.equities > 50 ? 'text-bullish' : 'text-bearish'}>
                {regime.indicators.equities.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};