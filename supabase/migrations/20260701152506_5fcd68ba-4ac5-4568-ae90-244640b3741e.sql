-- 1) trading_config_history
CREATE TABLE public.trading_config_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL,
  old_value text,
  new_value text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by text
);
GRANT SELECT ON public.trading_config_history TO anon, authenticated;
GRANT ALL ON public.trading_config_history TO service_role;
ALTER TABLE public.trading_config_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read config history" ON public.trading_config_history FOR SELECT USING (true);
CREATE INDEX idx_tch_key_time ON public.trading_config_history(config_key, changed_at DESC);

CREATE OR REPLACE FUNCTION public.log_trading_config_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.value IS DISTINCT FROM OLD.value THEN
    INSERT INTO public.trading_config_history(config_key, old_value, new_value)
    VALUES (NEW.key, OLD.value::text, NEW.value::text);
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.trading_config_history(config_key, old_value, new_value)
    VALUES (NEW.key, NULL, NEW.value::text);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_trading_config_history
AFTER INSERT OR UPDATE ON public.trading_config
FOR EACH ROW EXECUTE FUNCTION public.log_trading_config_change();

-- 2) signal_cycle_logs
CREATE TABLE public.signal_cycle_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id text,
  symbol text,
  timeframe text,
  module_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  fusion_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  final_signal jsonb NOT NULL DEFAULT '{}'::jsonb,
  config_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.signal_cycle_logs TO anon, authenticated;
GRANT ALL ON public.signal_cycle_logs TO service_role;
ALTER TABLE public.signal_cycle_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read cycle logs" ON public.signal_cycle_logs FOR SELECT USING (true);
CREATE INDEX idx_scl_time ON public.signal_cycle_logs(created_at DESC);

-- 3) trade_snapshots
CREATE TABLE public.trade_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid,
  signal_id uuid,
  entry_price numeric,
  stop_loss numeric,
  take_profit numeric,
  signal_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  module_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  config_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trade_snapshots TO anon, authenticated;
GRANT ALL ON public.trade_snapshots TO service_role;
ALTER TABLE public.trade_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read trade snapshots" ON public.trade_snapshots FOR SELECT USING (true);
CREATE INDEX idx_ts_trade ON public.trade_snapshots(trade_id);
CREATE INDEX idx_ts_time ON public.trade_snapshots(created_at DESC);