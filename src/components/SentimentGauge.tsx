import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SentimentAggregation } from '@/services/marketIntelligenceEngine';

interface SentimentGaugeProps {
  sentiment: SentimentAggregation;
}

export const SentimentGauge: React.FC<SentimentGaugeProps> = ({ sentiment }) => {
  const getSentimentColor = (value: number) => {
    if (value > 20) return 'text-bullish';
    if (value < -20) return 'text-bearish';
    return 'text-muted-foreground';
  };

  const getSentimentLabel = (value: number) => {
    if (value > 50) return 'Very Bullish';
    if (value > 20) return 'Bullish';
    if (value > -20) return 'Neutral';
    if (value > -50) return 'Bearish';
    return 'Very Bearish';
  };

  const getGaugePosition = (value: number) => {
    // Convert -100 to 100 range to 0 to 100 for positioning
    return Math.max(0, Math.min(100, (value + 100) / 2));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Market Sentiment</CardTitle>
        <Badge variant={sentiment.confidence > 0.7 ? 'default' : 'secondary'}>
          {Math.round(sentiment.confidence * 100)}% confidence
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center">
            <div className={`text-3xl font-bold ${getSentimentColor(sentiment.overallSentiment)}`}>
              {sentiment.overallSentiment > 0 ? '+' : ''}{sentiment.overallSentiment.toFixed(0)}
            </div>
            <div className="text-sm text-muted-foreground">
              {getSentimentLabel(sentiment.overallSentiment)}
            </div>
          </div>

          {/* Sentiment Gauge */}
          <div className="relative">
            <div className="h-2 bg-gradient-to-r from-bearish via-muted to-bullish rounded-full">
              <div 
                className="absolute top-0 w-1 h-2 bg-foreground rounded-full transform -translate-x-1/2"
                style={{ left: `${getGaugePosition(sentiment.overallSentiment)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Bearish</span>
              <span>Neutral</span>
              <span>Bullish</span>
            </div>
          </div>

          {/* Source Breakdown */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Top Sources:</div>
            {sentiment.sources.slice(0, 3).map((source, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{source.source}</span>
                <span className={getSentimentColor(source.sentiment)}>
                  {source.sentiment > 0 ? '+' : ''}{source.sentiment.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};