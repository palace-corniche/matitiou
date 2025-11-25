import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ExitIntelligence {
  id: string;
  trade_id: string;
  overall_score: number;
  recommendation: string;
  confidence: number;
  reasoning: string;
  check_timestamp: string;
  holding_time_minutes?: number;
  factors?: any;
}

interface TradeInfo {
  id: string;
  symbol: string;
  trade_type: string;
  entry_price: number;
  current_price: number;
  pnl: number;
  profit_pips: number;
  entry_time: string;
}

interface TradeWithIntelligence extends TradeInfo {
  exitIntelligence?: ExitIntelligence;
}

export function ExitIntelligenceDashboard() {
  const [trades, setTrades] = useState<TradeWithIntelligence[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    avgScore: 0,
    forceExits: 0,
    cautionHolds: 0,
    confidentHolds: 0,
  });

  const loadData = async () => {
    try {
      // Fetch open trades
      const { data: tradesData, error: tradesError } = await supabase
        .from("shadow_trades")
        .select("id, symbol, trade_type, entry_price, current_price, pnl, profit_pips, entry_time")
        .eq("status", "open")
        .order("entry_time", { ascending: false });

      if (tradesError) throw tradesError;

      // Fetch latest exit intelligence for each trade
      const { data: intelligenceData, error: intelligenceError } = await supabase
        .from("exit_intelligence")
        .select("*")
        .in("trade_id", (tradesData || []).map(t => t.id))
        .order("check_timestamp", { ascending: false });

      if (intelligenceError) throw intelligenceError;

      // Combine data - get most recent intelligence for each trade
      const tradesWithIntelligence: TradeWithIntelligence[] = (tradesData || []).map(trade => {
        const latestIntelligence = intelligenceData?.find(ei => ei.trade_id === trade.id);
        return {
          ...trade,
          exitIntelligence: latestIntelligence,
        };
      });

      setTrades(tradesWithIntelligence);

      // Calculate stats
      const scores = intelligenceData?.map(ei => ei.overall_score || 0) || [];
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      
      const forceExits = intelligenceData?.filter(ei => ei.recommendation === 'FORCE_EXIT').length || 0;
      const cautionHolds = intelligenceData?.filter(ei => ei.recommendation === 'HOLD_CAUTION').length || 0;
      const confidentHolds = intelligenceData?.filter(ei => ei.recommendation === 'HOLD_CONFIDENT').length || 0;

      setStats({ avgScore, forceExits, cautionHolds, confidentHolds });
    } catch (error) {
      console.error("Error loading exit intelligence:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to real-time updates on exit_intelligence
    const channel = supabase
      .channel('exit-intelligence-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'exit_intelligence'
        },
        (payload) => {
          console.log('New exit intelligence:', payload);
          loadData(); // Reload data when new analysis arrives
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shadow_trades'
        },
        (payload) => {
          console.log('Trade updated:', payload);
          loadData(); // Reload when trades update (PnL changes)
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'FORCE_EXIT': return 'destructive';
      case 'HOLD_CAUTION': return 'default';
      case 'HOLD_CONFIDENT': return 'secondary';
      default: return 'outline';
    }
  };

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'FORCE_EXIT': return <TrendingDown className="h-4 w-4" />;
      case 'HOLD_CAUTION': return <AlertTriangle className="h-4 w-4" />;
      case 'HOLD_CONFIDENT': return <TrendingUp className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score < 30) return 'text-destructive';
    if (score < 60) return 'text-warning';
    return 'text-success';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Exit Intelligence Dashboard
          </CardTitle>
          <CardDescription>Real-time intelligent exit analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading exit intelligence...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (trades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Exit Intelligence Dashboard
          </CardTitle>
          <CardDescription>Real-time intelligent exit analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium">No Open Trades</p>
            <p className="text-sm mt-1">Exit intelligence will appear when trades are opened</p>
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
          Exit Intelligence Dashboard
        </CardTitle>
        <CardDescription>Real-time intelligent exit analysis • Updates every 5 minutes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Average Score</div>
            <div className={`text-2xl font-bold ${getScoreColor(stats.avgScore)}`}>
              {stats.avgScore.toFixed(1)}
            </div>
          </div>
          <div className="bg-destructive/10 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Force Exits</div>
            <div className="text-2xl font-bold text-destructive">{stats.forceExits}</div>
          </div>
          <div className="bg-warning/10 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Caution</div>
            <div className="text-2xl font-bold text-warning">{stats.cautionHolds}</div>
          </div>
          <div className="bg-success/10 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Confident</div>
            <div className="text-2xl font-bold text-success">{stats.confidentHolds}</div>
          </div>
        </div>

        {/* Individual Trade Analysis */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Open Positions ({trades.length})
          </h3>
          {trades.map((trade) => (
            <div
              key={trade.id}
              className="border rounded-lg p-4 space-y-3 hover:bg-muted/30 transition-colors"
            >
              {/* Trade Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={trade.trade_type === 'buy' ? 'default' : 'secondary'}>
                    {trade.trade_type.toUpperCase()}
                  </Badge>
                  <span className="font-semibold">{trade.symbol}</span>
                  <span className="text-sm text-muted-foreground">
                    Entry: {trade.entry_price?.toFixed(5)}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={trade.pnl >= 0 ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
                      ${trade.pnl?.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {trade.profit_pips?.toFixed(1)} pips
                    </div>
                  </div>
                </div>
              </div>

              {/* Exit Intelligence Analysis */}
              {trade.exitIntelligence ? (
                <div className="bg-muted/50 rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getRecommendationIcon(trade.exitIntelligence.recommendation)}
                      <Badge variant={getRecommendationColor(trade.exitIntelligence.recommendation)}>
                        {trade.exitIntelligence.recommendation.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Exit Score</div>
                        <div className={`text-lg font-bold ${getScoreColor(trade.exitIntelligence.overall_score)}`}>
                          {trade.exitIntelligence.overall_score.toFixed(1)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Confidence</div>
                        <div className="text-lg font-semibold">
                          {(trade.exitIntelligence.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Reasoning */}
                  <div className="pt-2 border-t border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">Analysis</div>
                    <p className="text-sm">{trade.exitIntelligence.reasoning}</p>
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Analyzed {formatDistanceToNow(new Date(trade.exitIntelligence.check_timestamp), { addSuffix: true })}
                  </div>
                </div>
              ) : (
                <div className="bg-muted/30 rounded-md p-3 text-center text-sm text-muted-foreground">
                  <Brain className="h-4 w-4 inline-block mr-2 opacity-50" />
                  Waiting for analysis...
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
