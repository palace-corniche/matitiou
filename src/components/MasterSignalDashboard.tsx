import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Activity, Target, AlertTriangle, CheckCircle } from 'lucide-react';

interface MasterSignal {
  id: string;
  analysis_id: string;
  signal_type: string;
  confluence_score: number;
  final_strength: number;
  recommended_entry: number;
  recommended_stop_loss: number;
  recommended_take_profit: number;
  contributing_modules: string[];
  notes?: string;
  created_at: string;
  symbol: string;
  timeframe: string;
  final_confidence: number;
  // Additional fields from the actual schema
  actual_outcome?: string;
  actual_pnl?: number;
  actual_pips?: number;
  edge_probability?: number;
  volatility_percentile?: number;
  risk_reward_ratio?: number;
  signal_quality_score?: number;
}

interface FusionData {
  id: string;
  analysis_id: string;
  confidence_score: number;
  weighted_score: number;
  contributing_signals: any;
  fusion_decision: string;
  fusion_reasoning: string;
  risk_assessment: any;
  market_conditions: any;
  created_at: string;
}

const MasterSignalDashboard: React.FC = () => {
  const [masterSignals, setMasterSignals] = useState<MasterSignal[]>([]);
  const [fusionData, setFusionData] = useState<FusionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSignals: 0,
    activeSignals: 0,
    avgConfidence: 0,
    successRate: 0
  });

  useEffect(() => {
    fetchMasterSignals();
    fetchFusionData();
    fetchStats();

    // Set up real-time subscriptions
    const signalsChannel = supabase
      .channel('master-signals-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'master_signals'
      }, () => {
        fetchMasterSignals();
        fetchStats();
      })
      .subscribe();

    const fusionChannel = supabase
      .channel('fusion-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'master_signals_fusion'
      }, () => {
        fetchFusionData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(signalsChannel);
      supabase.removeChannel(fusionChannel);
    };
  }, []);

  const fetchMasterSignals = async () => {
    try {
      const { data, error } = await supabase
        .from('master_signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setMasterSignals((data || []) as MasterSignal[]);
    } catch (error) {
      console.error('Failed to fetch master signals:', error);
    }
  };

  const fetchFusionData = async () => {
    try {
      const { data, error } = await supabase
        .from('master_signals_fusion')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setFusionData((data || []) as FusionData[]);
    } catch (error) {
      console.error('Failed to fetch fusion data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get all signals (accept pagination limit for performance)
      const { data: allSignals, error: allError } = await supabase
        .from('master_signals')
        .select('id, created_at, final_confidence, actual_outcome')
        .order('created_at', { ascending: false })
        .limit(10000); // Get up to 10k most recent

      if (allError) throw allError;

      const totalCount = allSignals?.length || 0;
      
      // Calculate active signals (24h)
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      const activeCount = allSignals?.filter(s => 
        new Date(s.created_at).getTime() > twentyFourHoursAgo
      ).length || 0;

      // Calculate average confidence
      const avgConf = allSignals && allSignals.length > 0
        ? allSignals.reduce((sum, s) => sum + (s.final_confidence || 0), 0) / allSignals.length
        : 0;

      // Calculate success rate (signals with positive actual outcome)
      const successfulCount = allSignals?.filter(s => 
        s.actual_outcome === 'win' || s.actual_outcome === 'success'
      ).length || 0;
      const totalWithOutcome = allSignals?.filter(s => s.actual_outcome !== null).length || 0;
      const successRate = totalWithOutcome > 0 ? (successfulCount / totalWithOutcome) * 100 : 0;

      setStats({
        totalSignals: totalCount,
        activeSignals: activeCount,
        avgConfidence: avgConf,
        successRate
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const getSignalIcon = (signalType: string) => {
    switch (signalType.toLowerCase()) {
      case 'buy':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'sell':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Signals</p>
                <p className="text-2xl font-bold">{stats.totalSignals}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active (24h)</p>
                <p className="text-2xl font-bold">{stats.activeSignals}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Confidence</p>
                <p className={`text-2xl font-bold ${getConfidenceColor(stats.avgConfidence)}`}>
                  {(stats.avgConfidence * 100).toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Master Signals List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Recent Master Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {masterSignals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No master signals found. Signals may not be storing properly.</p>
                <p className="text-sm mt-2">Check edge function logs for storage issues.</p>
              </div>
            ) : (
              masterSignals.map((signal) => (
                <div key={signal.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getSignalIcon(signal.signal_type)}
                      <div>
                        <Badge variant={signal.signal_type === 'buy' ? 'default' : 'destructive'}>
                          {signal.signal_type.toUpperCase()}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {signal.symbol} • {signal.timeframe}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${getConfidenceColor(signal.final_confidence || 0)}`}>
                        {((signal.final_confidence || 0) * 100).toFixed(1)}% Confidence
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Strength: {signal.final_strength}/10
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Entry</p>
                      <p className="font-medium">{signal.recommended_entry}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stop Loss</p>
                      <p className="font-medium">{signal.recommended_stop_loss}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Take Profit</p>
                      <p className="font-medium">{signal.recommended_take_profit}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Contributing Modules ({signal.contributing_modules?.length || 0})</p>
                    <Progress 
                      value={signal.confluence_score || 0} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      {signal.notes || 'No reasoning provided'}
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Generated: {new Date(signal.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fusion Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Signal Fusion Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fusionData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No fusion data found. Fusion analytics may not be storing.</p>
              </div>
            ) : (
              fusionData.map((fusion) => (
                <div key={fusion.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      Fusion Analysis
                    </Badge>
                    <div className="text-right">
                      <p className="font-semibold">Score: {fusion.weighted_score}</p>
                      <p className={`text-sm ${getConfidenceColor(fusion.confidence_score)}`}>
                        {(fusion.confidence_score * 100).toFixed(1)}% Confidence
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Decision</p>
                      <p className="font-medium">{fusion.fusion_decision}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Risk Level</p>
                      <p className="font-medium">
                        {fusion.risk_assessment?.risk_level || 'Medium'}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {fusion.fusion_reasoning}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MasterSignalDashboard;