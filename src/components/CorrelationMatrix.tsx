import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CrossCurrencyCorrelation } from '@/services/marketIntelligenceEngine';

interface CorrelationMatrixProps {
  correlations: CrossCurrencyCorrelation[];
}

export const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({ correlations }) => {
  const getCorrelationColor = (correlation: number) => {
    const intensity = Math.abs(correlation);
    if (correlation > 0) {
      return `rgba(45, 174, 127, ${intensity})`; // Bullish green with transparency
    } else {
      return `rgba(220, 38, 127, ${Math.abs(correlation)})`; // Bearish red with transparency
    }
  };

  const getTextColor = (correlation: number) => {
    return Math.abs(correlation) > 0.5 ? 'text-white' : 'text-foreground';
  };

  const pairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF'];

  const getCorrelation = (pair1: string, pair2: string): number => {
    if (pair1 === pair2) return 1;
    const correlation = correlations.find(c => 
      (c.pair1 === pair1 && c.pair2 === pair2) || 
      (c.pair1 === pair2 && c.pair2 === pair1)
    );
    return correlation?.correlation || 0;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Currency Correlation Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-6 gap-1 text-xs">
          {/* Header row */}
          <div></div>
          {pairs.map(pair => (
            <div key={pair} className="text-center font-medium text-muted-foreground p-1">
              {pair.split('/')[0]}
            </div>
          ))}
          
          {/* Matrix rows */}
          {pairs.map(pair1 => (
            <React.Fragment key={pair1}>
              <div className="text-center font-medium text-muted-foreground p-1">
                {pair1.split('/')[0]}
              </div>
              {pairs.map(pair2 => {
                const correlation = getCorrelation(pair1, pair2);
                return (
                  <div
                    key={`${pair1}-${pair2}`}
                    className={`text-center p-1 rounded text-xs font-medium ${getTextColor(correlation)}`}
                    style={{ backgroundColor: getCorrelationColor(correlation) }}
                  >
                    {correlation.toFixed(2)}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        
        <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-bearish rounded"></div>
            <span>Negative</span>
          </div>
          <span>-1.0 to +1.0</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-bullish rounded"></div>
            <span>Positive</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};