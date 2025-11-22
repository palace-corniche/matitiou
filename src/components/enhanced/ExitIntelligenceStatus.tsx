import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Brain, Target, AlertCircle, TrendingUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ExitIntelligenceData {
  id: string;
  trade_id: string;
  overall_score: number;
  recommendation: string;
  confidence: number;
  reasoning: string;
  factors: any;
  check_timestamp: string;
}

export const ExitIntelligenceStatus: React.FC = () => {
  const [recentAnalyses, setRecentAnalyses] = useState<ExitIntelligenceData[]>([]);
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    forceExits: 0,
    avgScore: 0,
    avgConfidence: 0
  });
  const [loading, setLoading] = useState(true);

  const loadExitIntelligence = async () => {
    try {
      // Get recent exit intelligence analyses
      const { data: analyses } = await supabase
        .from('exit_intelligence')
        .select('*')
        .order('check_timestamp', { ascending: false })
        .limit(10);

      if (analyses && analyses.length > 0) {
        setRecentAnalyses(analyses);

        // Calculate stats
        const total = analyses.length;
        const forceExits = analyses.filter(a => a.recommendation === 'FORCE_EXIT').length;
        const avgScore = analyses.reduce((sum, a) => sum + (a.overall_score || 0), 0) / total;
        const avgConfidence = analyses.reduce((sum, a) => sum + (a.confidence || 0), 0) / total;

        setStats({
          totalAnalyses: total,
          forceExits,
          avgScore,
          avgConfidence
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading exit intelligence:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExitIntelligence();
    const interval = setInterval(loadExitIntelligence, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const getRecommendationColor = (recommendation: string) => {
    if (recommendation === 'FORCE_EXIT') return 'destructive';
    if (recommendation === 'HOLD_CAUTION') return 'warning';
    return 'success';
  };

  const getScoreColor = (score: number) => {
    if (score < 30) return 'text-red-600';
    if (score < 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 animate-pulse" />
            Exit Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading exit intelligence data...</p>
        </CardContent>
      </Card>
    );
  }

  if (recentAnalyses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Exit Intelligence
          </CardTitle>
          <CardDescription>Intelligent exit monitoring system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No exit analyses yet</p>
            <p className="text-sm mt-2">The system will start analyzing trades once they've been open for 5+ minutes</p>
            <div className="mt-4 p-3 bg-muted/30 rounded-lg text-left">
              <p className="text-xs font-medium mb-2">Exit Intelligence Factors:</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>• Confluence Score (15%)</div>
                <div>• Trend Alignment (15%)</div>
                <div>• Sentiment Score (10%)</div>
                <div>• Volatility Regime (10%)</div>
                <div>• Volume Profile (8%)</div>
                <div>• Correlation Health (8%)</div>
                <div>• Fundamental Bias (12%)</div>
                <div>• Harmonic Completion (7%)</div>
                <div>• Market Structure (10%)</div>
                <div>• Regime Strength (5%)</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Exit Intelligence
        </CardTitle>
        <CardDescription>Recent exit analyses (runs every 5 minutes)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.totalAnalyses}</div>
            <div className="text-xs text-muted-foreground">Total Checks</div>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">{stats.forceExits}</div>
            <div className="text-xs text-muted-foreground">Force Exits</div>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <div className={`text-2xl font-bold ${getScoreColor(stats.avgScore)}`}>
              {stats.avgScore.toFixed(0)}
            </div>
            <div className="text-xs text-muted-foreground">Avg Score</div>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <div className="text-2xl font-bold">{(stats.avgConfidence * 100).toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Avg Confidence</div>
          </div>
        </div>

        {/* Recent Analyses */}
        <div>
          <p className="text-sm font-medium mb-2">Recent Exit Analyses</p>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {recentAnalyses.map((analysis) => (
                <div key={analysis.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={getRecommendationColor(analysis.recommendation) as any}>
                      {analysis.recommendation}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(analysis.check_timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Exit Score:</span>
                      <span className={`font-bold ${getScoreColor(analysis.overall_score || 0)}`}>
                        {(analysis.overall_score || 0).toFixed(1)}/100
                      </span>
                    </div>
                    <Progress value={analysis.overall_score || 0} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Confidence:</span>
                    <span className="font-medium">{((analysis.confidence || 0) * 100).toFixed(0)}%</span>
                  </div>

                  {analysis.reasoning && (
                    <p className="text-xs text-muted-foreground italic">
                      {analysis.reasoning}
                    </p>
                  )}

                  {/* Top 3 factors */}
                  {analysis.factors && (
                    <div className="text-xs space-y-1 pt-2 border-t">
                      <p className="font-medium">Top Factors:</p>
                      <div className="grid grid-cols-3 gap-1">
                        {Object.entries(analysis.factors)
                          .sort((a: any, b: any) => b[1] - a[1])
                          .slice(0, 3)
                          .map(([key, value]: [string, any]) => (
                            <div key={key} className="text-center p-1 bg-muted/30 rounded">
                              <div className="font-medium">{(value || 0).toFixed(0)}</div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
