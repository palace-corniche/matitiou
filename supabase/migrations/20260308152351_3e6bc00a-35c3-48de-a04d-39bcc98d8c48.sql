
-- Create learning_outcomes table for trade result tracking
CREATE TABLE public.learning_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid REFERENCES public.shadow_trades(id) ON DELETE CASCADE,
  signal_id uuid,
  outcome_type text NOT NULL DEFAULT 'breakeven',
  pnl numeric DEFAULT 0,
  profit_pips numeric DEFAULT 0,
  holding_time_minutes numeric DEFAULT 0,
  signal_quality numeric DEFAULT 0,
  confluence_score numeric DEFAULT 0,
  entry_accuracy numeric DEFAULT 0,
  exit_timing_score numeric DEFAULT 0,
  market_regime text DEFAULT 'unknown',
  contributing_modules text[] DEFAULT '{}',
  learned_features jsonb DEFAULT '{}',
  processed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create intelligence_performance table for dynamic Bayesian weight adjustment
CREATE TABLE public.intelligence_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL UNIQUE,
  total_predictions integer DEFAULT 0,
  correct_predictions integer DEFAULT 0,
  accuracy numeric DEFAULT 0.5,
  avg_confidence numeric DEFAULT 0,
  avg_return numeric DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create system_config table for debug flags
CREATE TABLE public.system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE,
  config_value jsonb DEFAULT '{}',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create RPC for updating module performance from trade outcomes
CREATE OR REPLACE FUNCTION public.update_module_performance_from_trade(
  p_module_id text,
  p_signal_successful boolean,
  p_confidence numeric,
  p_strength numeric,
  p_return numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.module_performance
  SET 
    successful_signals = CASE WHEN p_signal_successful THEN successful_signals + 1 ELSE successful_signals END,
    failed_signals = CASE WHEN NOT p_signal_successful THEN failed_signals + 1 ELSE failed_signals END,
    win_rate = CASE 
      WHEN (successful_signals + failed_signals + 1) > 0 
      THEN (CASE WHEN p_signal_successful THEN successful_signals + 1 ELSE successful_signals END)::numeric 
           / (successful_signals + failed_signals + 1) * 100
      ELSE 0 END,
    average_return = CASE 
      WHEN total_signals > 0 
      THEN ((average_return * total_signals) + p_return) / (total_signals + 1)
      ELSE p_return END,
    last_updated = now()
  WHERE module_id = p_module_id;
END;
$$;

-- Create RPC for updating system learning stats
CREATE OR REPLACE FUNCTION public.update_system_learning_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_adaptations integer;
  v_patterns integer;
  v_calibrated integer;
BEGIN
  SELECT COUNT(*) INTO v_adaptations FROM public.learning_actions;
  SELECT COUNT(*) INTO v_patterns FROM public.discovered_patterns WHERE is_active = true;
  SELECT COUNT(*) INTO v_calibrated FROM public.module_performance WHERE status = 'active';
  
  INSERT INTO public.system_learning_stats (
    total_adaptations, patterns_discovered, modules_calibrated, last_optimization
  ) VALUES (
    v_adaptations, v_patterns, v_calibrated, now()
  );
END;
$$;

-- Enable RLS on new tables
ALTER TABLE public.learning_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- RLS policies (public access like other tables)
CREATE POLICY "Allow all access to learning_outcomes" ON public.learning_outcomes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to intelligence_performance" ON public.intelligence_performance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to system_config" ON public.system_config FOR ALL USING (true) WITH CHECK (true);
