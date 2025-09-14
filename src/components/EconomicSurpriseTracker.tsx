import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { EconomicSurprise } from '@/services/marketIntelligenceEngine';

interface EconomicSurpriseTrackerProps {
  surprises: EconomicSurprise[];
}

export const EconomicSurpriseTracker: React.FC<EconomicSurpriseTrackerProps> = ({ surprises }) => {
  const getSurpriseIcon = (surprise: number) => {
    if (Math.abs(surprise) > 10) {
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
    return surprise > 0 ? 
      <TrendingUp className="h-4 w-4 text-bullish" /> : 
      <TrendingDown className="h-4 w-4 text-bearish" />;
  };

  const getSurpriseColor = (surprise: number) => {
    if (Math.abs(surprise) > 10) return 'text-destructive';
    return surprise > 0 ? 'text-bullish' : 'text-bearish';
  };

  const getImpactVariant = (impact: string) => {
    switch (impact) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Economic Surprises</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {surprises.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No significant surprises detected
            </div>
          ) : (
            surprises.slice(0, 5).map((surprise, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getSurpriseIcon(surprise.surprise)}
                    <span className="text-sm font-medium truncate">{surprise.eventName}</span>
                    <Badge variant={getImpactVariant(surprise.impact)} className="text-xs">
                      {surprise.impact}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Actual: {surprise.actual}</span>
                    <span>Forecast: {surprise.forecast}</span>
                    <span>Previous: {surprise.previous}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${getSurpriseColor(surprise.surprise)}`}>
                    {surprise.surprise > 0 ? '+' : ''}{surprise.surprise.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {surprise.currency}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};