import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Activity, TrendingUp, Clock, Database } from 'lucide-react';

interface TimeframeStatus {
  timeframe: string;
  count: number;
  completeCount: number;
  oldestTimestamp: string | null;
  latestTimestamp: string | null;
  avgTicksPerCandle: number;
  coverageHours: number;
}

export const CandleDataStatus = () => {
  const [timeframeStats, setTimeframeStats] = useState<TimeframeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchCandleStats = async () => {
    try {
      const timeframes = ['15m', '1h', '4h', '1d'];
      const stats: TimeframeStatus[] = [];

      for (const tf of timeframes) {
        const { data, error } = await supabase
          .from('aggregated_candles')
          .select('timestamp, tick_count, is_complete')
          .eq('symbol', 'EUR/USD')
          .eq('timeframe', tf)
          .order('timestamp', { ascending: true });

        if (!error && data) {
          const completeCandles = data.filter(c => c.is_complete);
          const avgTicks = data.length > 0
            ? data.reduce((sum, c) => sum + (c.tick_count || 0), 0) / data.length
            : 0;

          let coverageHours = 0;
          if (data.length >= 2) {
            const oldest = new Date(data[0].timestamp).getTime();
            const latest = new Date(data[data.length - 1].timestamp).getTime();
            coverageHours = (latest - oldest) / (1000 * 60 * 60);
          }

          stats.push({
            timeframe: tf,
            count: data.length,
            completeCount: completeCandles.length,
            oldestTimestamp: data.length > 0 ? data[0].timestamp : null,
            latestTimestamp: data.length > 0 ? data[data.length - 1].timestamp : null,
            avgTicksPerCandle: Math.round(avgTicks),
            coverageHours: Math.round(coverageHours * 10) / 10,
          });
        }
      }

      setTimeframeStats(stats);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching candle stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandleStats();
    const interval = setInterval(fetchCandleStats, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (count: number, timeframe: string): string => {
    const thresholds: Record<string, { green: number; yellow: number }> = {
      '15m': { green: 100, yellow: 20 },
      '1h': { green: 100, yellow: 24 },
      '4h': { green: 100, yellow: 12 },
      '1d': { green: 100, yellow: 7 },
    };

    const threshold = thresholds[timeframe];
    if (count >= threshold.green) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (count >= threshold.yellow) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const formatCoverage = (hours: number): string => {
    if (hours < 24) return `${hours.toFixed(1)}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d`;
    const months = Math.floor(days / 30);
    return `${months}mo`;
  };

  if (loading) {
    return (
      <Card className="bg-background/95 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Candle Data Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/95 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Candle Data Status
          </div>
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Updated {lastUpdate.toLocaleTimeString()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timeframeStats.map((stat) => (
            <div key={stat.timeframe} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(stat.count, stat.timeframe)}>
                    {stat.timeframe.toUpperCase()}
                  </Badge>
                  <span className="text-sm font-medium">
                    {stat.count} candles
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({stat.completeCount} complete)
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {formatCoverage(stat.coverageHours)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    {stat.avgTicksPerCandle} ticks/candle
                  </div>
                </div>
              </div>
              
              {stat.count > 0 && (
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      stat.count >= 100
                        ? 'bg-green-500'
                        : stat.count >= 20
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{
                      width: `${Math.min((stat.count / 100) * 100, 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          ))}

          <div className="pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center justify-between">
                <span>Data Quality:</span>
                <Badge variant="outline" className="text-xs">
                  {timeframeStats.every(s => s.count >= 100)
                    ? 'Excellent'
                    : timeframeStats.some(s => s.count >= 20)
                    ? 'Good'
                    : 'Limited'}
                </Badge>
              </div>
              <p className="text-xs opacity-70">
                System builds candles from real-time tick data. Full analysis capabilities require 100+ candles per timeframe.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
