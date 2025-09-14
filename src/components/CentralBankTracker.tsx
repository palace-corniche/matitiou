import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CentralBankSignal {
  bank: string;
  currency: string;
  signal: 'hawkish' | 'dovish' | 'neutral';
  confidence: number;
  lastSpeech: Date;
}

interface CentralBankTrackerProps {
  signals: CentralBankSignal[];
}

export const CentralBankTracker: React.FC<CentralBankTrackerProps> = ({ signals }) => {
  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'hawkish':
        return <TrendingUp className="h-4 w-4 text-bullish" />;
      case 'dovish':
        return <TrendingDown className="h-4 w-4 text-bearish" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'hawkish':
        return 'text-bullish';
      case 'dovish':
        return 'text-bearish';
      default:
        return 'text-muted-foreground';
    }
  };

  const getSignalVariant = (signal: string) => {
    switch (signal) {
      case 'hawkish':
        return 'default';
      case 'dovish':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Central Bank Signals</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {signals.map((signal, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {getSignalIcon(signal.signal)}
                <div>
                  <div className="font-medium text-sm">{signal.bank}</div>
                  <div className="text-xs text-muted-foreground">
                    {signal.currency} • {formatTimeAgo(signal.lastSpeech)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Badge variant={getSignalVariant(signal.signal)} className="mb-1">
                  {signal.signal}
                </Badge>
                <div className="text-xs text-muted-foreground">
                  {Math.round(signal.confidence * 100)}% confidence
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};