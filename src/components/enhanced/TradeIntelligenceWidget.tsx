import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, AlertTriangle, TrendingUp, Target, Shield } from 'lucide-react';

interface TradeIntelligenceWidgetProps {
  tradeId: string;
}

interface ExitIntelligence {
  overall_score: number;
  recommendation: string;
  factors: any;
  reasoning: string;
  check_timestamp: string;
  holding_time_minutes: number;
}

interface IntelligentTargets {
  confidence: number;
  reasoning: string;
  recommended_tp1: number;
  recommended_tp2: number;
  recommended_tp3: number;
  actual_sl: number;
  actual_tp: number;
  entry_price: number;
  key_levels: any;
}

interface Trade {
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  symbol: string;
  trade_type: string;
  exit_intelligence_score?: number;
  intelligence_exit_triggered?: boolean;
}

export function TradeIntelligenceWidget({ tradeId }: TradeIntelligenceWidgetProps) {
  const [exitIntel, setExitIntel] = useState<ExitIntelligence | null>(null);
  const [targets, setTargets] = useState<IntelligentTargets | null>(null);
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIntelligenceData();
    
    // Subscribe to real-time updates
    const exitChannel = supabase
      .channel('exit-intelligence-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exit_intelligence',
          filter: `trade_id=eq.${tradeId}`
        },
        () => {
          loadIntelligenceData();
        }
      )
      .subscribe();

    const tradeChannel = supabase
      .channel('trade-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shadow_trades',
          filter: `id=eq.${tradeId}`
        },
        () => {
          loadIntelligenceData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(exitChannel);
      supabase.removeChannel(tradeChannel);
    };
  }, [tradeId]);

  const loadIntelligenceData = async () => {
    try {
      // Load latest exit intelligence
      const { data: exitData } = await supabase
        .from('exit_intelligence')
        .select('*')
        .eq('trade_id', tradeId)
        .order('check_timestamp', { ascending: false })
        .limit(1)
        .single();

      if (exitData) {
        setExitIntel(exitData);
      }

      // Load intelligent targets
      const { data: targetsData } = await supabase
        .from('intelligent_targets')
        .select('*')
        .eq('trade_id', tradeId)
        .single();

      if (targetsData) {
        setTargets(targetsData);
      }

      // Load trade info
      const { data: tradeData } = await supabase
        .from('shadow_trades')
        .select('entry_price, stop_loss, take_profit, symbol, trade_type, exit_intelligence_score, intelligence_exit_triggered')
        .eq('id', tradeId)
        .single();

      if (tradeData) {
        setTrade(tradeData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading intelligence data:', error);
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'hsl(var(--chart-2))';
    if (score >= 40) return 'hsl(var(--chart-3))';
    return 'hsl(var(--destructive))';
  };

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case 'FORCE_EXIT':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Force Exit</Badge>;
      case 'HOLD_CAUTION':
        return <Badge variant="secondary" className="gap-1"><Shield className="h-3 w-3" />Hold - Caution</Badge>;
      case 'HOLD_CONFIDENT':
        return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />Hold - Confident</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Trade Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading intelligence data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Trade Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Exit Intelligence Score */}
        {exitIntel ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Exit Intelligence Score</span>
              {getRecommendationBadge(exitIntel.recommendation)}
            </div>
            <div className="flex items-center gap-3">
              <Progress 
                value={exitIntel.overall_score} 
                className="h-2 flex-1"
                style={{ 
                  // @ts-ignore
                  '--progress-background': getScoreColor(exitIntel.overall_score) 
                }}
              />
              <span className="text-lg font-bold" style={{ color: getScoreColor(exitIntel.overall_score) }}>
                {exitIntel.overall_score.toFixed(0)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Last checked: {new Date(exitIntel.check_timestamp).toLocaleTimeString()} 
              {exitIntel.holding_time_minutes && ` • Holding: ${Math.floor(exitIntel.holding_time_minutes)}m`}
            </div>
            {exitIntel.reasoning && (
              <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                {exitIntel.reasoning}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Exit intelligence calculating...</div>
        )}

        {/* Intelligence Status */}
        {trade && trade.exit_intelligence_score !== undefined && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Intelligence Status</span>
            <div className="flex gap-2">
              <Badge variant={trade.intelligence_exit_triggered ? "destructive" : "default"} className="gap-1">
                <Shield className="h-3 w-3" />
                Exit Trigger {trade.intelligence_exit_triggered ? 'Active' : 'Monitoring'}
              </Badge>
              <Badge variant="outline" className="gap-1">
                Score: {trade.exit_intelligence_score?.toFixed(0) || 'N/A'}
              </Badge>
            </div>
          </div>
        )}

        {/* Key Levels */}
        {targets && trade && (
          <div className="space-y-2">
            <span className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Key Levels ({targets.confidence.toFixed(0)}% confidence)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/30 p-2 rounded">
                <div className="text-muted-foreground">Entry</div>
                <div className="font-mono font-semibold">{trade.entry_price.toFixed(5)}</div>
              </div>
              <div className="bg-destructive/10 p-2 rounded">
                <div className="text-muted-foreground">Stop Loss</div>
                <div className="font-mono font-semibold">{trade.stop_loss.toFixed(5)}</div>
                <div className="text-muted-foreground text-[10px]">
                  {Math.abs((trade.entry_price - trade.stop_loss) / 0.0001).toFixed(0)} pips
                </div>
              </div>
              <div className="bg-chart-2/10 p-2 rounded">
                <div className="text-muted-foreground">TP1</div>
                <div className="font-mono font-semibold">{targets.recommended_tp1.toFixed(5)}</div>
                <div className="text-muted-foreground text-[10px]">
                  {Math.abs((trade.entry_price - targets.recommended_tp1) / 0.0001).toFixed(0)} pips
                </div>
              </div>
              <div className="bg-chart-2/10 p-2 rounded">
                <div className="text-muted-foreground">TP (Active)</div>
                <div className="font-mono font-semibold">{trade.take_profit.toFixed(5)}</div>
                <div className="text-muted-foreground text-[10px]">
                  {Math.abs((trade.entry_price - trade.take_profit) / 0.0001).toFixed(0)} pips
                </div>
              </div>
            </div>
            {targets.reasoning && (
              <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                {targets.reasoning}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
