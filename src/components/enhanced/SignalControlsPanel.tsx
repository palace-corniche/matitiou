import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { untypedSupabase } from '@/integrations/supabase/untypedClient';
import { FlipHorizontal2, Activity, RefreshCw } from 'lucide-react';

const KNOWN_MODULES = [
  { id: 'technical_analysis', label: 'Technical' },
  { id: 'fundamental_analysis', label: 'Fundamental' },
  { id: 'sentiment_analysis', label: 'Sentiment' },
  { id: 'quantitative_analysis', label: 'Quant' },
  { id: 'intermarket_analysis', label: 'Intermarket' },
  { id: 'specialized_analysis', label: 'Specialized' },
  { id: 'multi_timeframe_analysis', label: 'MTF' },
];

const SAMPLE_SIZE = 20;

interface ModuleHealth {
  id: string;
  label: string;
  appearance: number; // 0..1
}

const healthColor = (a: number) =>
  a >= 0.7 ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
  : a >= 0.3 ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
  : 'bg-red-500/15 text-red-500 border-red-500/30';

const healthLabel = (a: number) => (a >= 0.7 ? 'live' : a >= 0.3 ? 'partial' : 'no data');

export const SignalControlsPanel: React.FC = () => {
  const { toast } = useToast();
  const [invert, setInvert] = useState(false);
  const [loadingFlag, setLoadingFlag] = useState(true);
  const [saving, setSaving] = useState(false);
  const [health, setHealth] = useState<ModuleHealth[]>([]);
  const [loadingHealth, setLoadingHealth] = useState(true);

  const loadFlag = useCallback(async () => {
    setLoadingFlag(true);
    try {
      const { data } = await untypedSupabase
        .from('trading_config')
        .select('value')
        .eq('key', 'invert_signals')
        .maybeSingle();
      setInvert(data?.value === 'true');
    } finally {
      setLoadingFlag(false);
    }
  }, []);

  const loadHealth = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const { data } = await untypedSupabase
        .from('master_signals')
        .select('contributing_modules')
        .order('created_at', { ascending: false })
        .limit(SAMPLE_SIZE);

      const sample = (data ?? []) as Array<{ contributing_modules: string[] | null }>;
      const denom = sample.length || 1;

      const next: ModuleHealth[] = KNOWN_MODULES.map((m) => {
        const hits = sample.filter((s) =>
          Array.isArray(s.contributing_modules) && s.contributing_modules.includes(m.id)
        ).length;
        return { id: m.id, label: m.label, appearance: hits / denom };
      });
      setHealth(next);
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  useEffect(() => {
    loadFlag();
    loadHealth();
  }, [loadFlag, loadHealth]);

  const handleToggle = async (checked: boolean) => {
    setSaving(true);
    try {
      const { error } = await untypedSupabase
        .from('trading_config')
        .upsert(
          { key: 'invert_signals', value: String(checked), updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      if (error) throw error;
      setInvert(checked);
      toast({
        title: checked ? '🔄 Signal inversion ON' : 'Signal inversion OFF',
        description: checked
          ? 'New signals will be flipped (BUY ⇄ SELL) after fusion.'
          : 'Signals will be used as fused.',
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to update', description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-amber-500/60">
      <CardContent className="p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <FlipHorizontal2 className="h-4 w-4 text-amber-500" />
            <Label htmlFor="invert-signals" className="text-xs font-medium cursor-pointer">
              Invert Signals (A/B test)
            </Label>
            <Switch
              id="invert-signals"
              checked={invert}
              disabled={loadingFlag || saving}
              onCheckedChange={handleToggle}
            />
            <Badge
              variant="outline"
              className={`text-[10px] ${invert ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' : ''}`}
            >
              {invert ? 'INVERTED' : 'normal'}
            </Badge>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">
              Module health (last {SAMPLE_SIZE} signals)
            </span>
            <button
              onClick={loadHealth}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Refresh module health"
            >
              <RefreshCw className={`h-3 w-3 ${loadingHealth ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {health.map((m) => (
            <Badge
              key={m.id}
              variant="outline"
              className={`text-[10px] font-mono ${healthColor(m.appearance)}`}
              title={`${m.label}: contributed to ${Math.round(m.appearance * 100)}% of recent signals`}
            >
              {m.label} · {Math.round(m.appearance * 100)}% · {healthLabel(m.appearance)}
            </Badge>
          ))}
          {!loadingHealth && health.every((m) => m.appearance === 0) && (
            <span className="text-[10px] text-muted-foreground">
              No recent signals — module health unavailable.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SignalControlsPanel;
