import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, Circle, Activity, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PipelineStage {
  name: string;
  status: 'complete' | 'active' | 'pending' | 'error';
  details: string;
  timestamp?: string;
  progress?: number;
}

export const DataPipelineStatus: React.FC = () => {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkPipelineStatus();
    const interval = setInterval(checkPipelineStatus, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  const checkPipelineStatus = async () => {
    try {
      // Check tick data collection
      const { count: tickCount } = await supabase
        .from('market_data_feed')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', new Date(Date.now() - 3600000).toISOString());

      const { data: lastTick } = await supabase
        .from('market_data_feed')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      const tickAge = lastTick ? Math.floor((Date.now() - new Date(lastTick.timestamp).getTime()) / 60000) : Infinity;

      // Check candle aggregation
      const { data: candles } = await supabase
        .from('aggregated_candles')
        .select('timeframe, is_complete')
        .eq('symbol', 'EUR/USD')
        .eq('is_complete', true)
        .gte('timestamp', new Date(Date.now() - 86400000).toISOString());

      const candlesByTimeframe = candles?.reduce((acc, c) => {
        acc[c.timeframe] = (acc[c.timeframe] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const { data: lastCandle } = await supabase
        .from('aggregated_candles')
        .select('timestamp')
        .eq('is_complete', true)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      const candleAge = lastCandle ? Math.floor((Date.now() - new Date(lastCandle.timestamp).getTime()) / 60000) : Infinity;

      // Check signal generation
      const { data: recentSignals } = await supabase
        .from('master_signals')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 7200000).toISOString())
        .order('created_at', { ascending: false });

      const { data: systemHealth } = await supabase
        .from('system_health')
        .select('*')
        .eq('function_name', 'generate-confluence-signals')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const signalAge = recentSignals?.[0] ? Math.floor((Date.now() - new Date(recentSignals[0].created_at).getTime()) / 60000) : Infinity;

      // Build pipeline stages
      const pipelineStages: PipelineStage[] = [
        {
          name: 'Tick Collection',
          status: tickAge < 5 ? 'complete' : 'error',
          details: tickCount ? `${tickCount} ticks collected (last ${tickAge}m ago)` : 'No recent ticks',
          timestamp: lastTick?.timestamp,
          progress: tickAge < 5 ? 100 : 0
        },
        {
          name: 'Candle Aggregation',
          status: candleAge < 20 && Object.keys(candlesByTimeframe).length > 0 ? 'complete' : candlesByTimeframe['15m'] >= 5 ? 'active' : 'pending',
          details: `15m: ${candlesByTimeframe['15m'] || 0} | 1h: ${candlesByTimeframe['1h'] || 0} | 4h: ${candlesByTimeframe['4h'] || 0} (last ${candleAge}m ago)`,
          timestamp: lastCandle?.timestamp,
          progress: Math.min(100, ((candlesByTimeframe['15m'] || 0) / 10) * 100)
        },
        {
          name: 'Signal Generation',
          status: signalAge < 120 ? 'complete' : systemHealth?.error_message?.includes('Insufficient') ? 'pending' : systemHealth?.status === 'error' ? 'error' : 'pending',
          details: recentSignals?.length ? `${recentSignals.length} signals (last ${signalAge}m ago)` : systemHealth?.error_message || 'Waiting for sufficient candle data',
          timestamp: recentSignals?.[0]?.created_at,
          progress: (candlesByTimeframe['15m'] || 0) >= 5 ? 80 : Math.min(80, ((candlesByTimeframe['15m'] || 0) / 5) * 80)
        },
        {
          name: 'Analytics Readiness',
          status: recentSignals?.length > 0 ? 'complete' : candlesByTimeframe['15m'] >= 5 ? 'active' : 'pending',
          details: recentSignals?.length > 0 ? 'Real-time analytics available' : 'Waiting for first signals',
          progress: recentSignals?.length > 0 ? 100 : candlesByTimeframe['15m'] >= 5 ? 50 : Math.min(50, ((candlesByTimeframe['15m'] || 0) / 5) * 50)
        }
      ];

      setStages(pipelineStages);
      
      // Calculate overall progress
      const avgProgress = pipelineStages.reduce((sum, stage) => sum + (stage.progress || 0), 0) / pipelineStages.length;
      setOverallProgress(avgProgress);
      
    } catch (error) {
      console.error('Error checking pipeline status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'active':
        return <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge variant="default" className="bg-green-100 text-green-700">Active</Badge>;
      case 'active':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Building</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Activity className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Checking pipeline status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Data Pipeline Status</CardTitle>
          <Badge variant={overallProgress === 100 ? "default" : "secondary"}>
            {overallProgress.toFixed(0)}% Complete
          </Badge>
        </div>
        <Progress value={overallProgress} className="mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage, index) => (
            <div key={index} className="flex items-start gap-3">
              {getStatusIcon(stage.status)}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{stage.name}</div>
                  {getStatusBadge(stage.status)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{stage.details}</div>
                {stage.progress !== undefined && stage.status !== 'complete' && (
                  <Progress value={stage.progress} className="mt-2 h-1" />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
