
-- Step 1: Rename aggregated_candles columns to match edge function code
ALTER TABLE public.aggregated_candles RENAME COLUMN "open" TO open_price;
ALTER TABLE public.aggregated_candles RENAME COLUMN high TO high_price;
ALTER TABLE public.aggregated_candles RENAME COLUMN low TO low_price;
ALTER TABLE public.aggregated_candles RENAME COLUMN close TO close_price;

-- Step 2: Add unique constraint for upsert
ALTER TABLE public.aggregated_candles ADD CONSTRAINT aggregated_candles_symbol_timeframe_timestamp_key UNIQUE (symbol, timeframe, timestamp);

-- Step 3: Create function_execution_locks table
CREATE TABLE IF NOT EXISTS public.function_execution_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL UNIQUE,
  locked_at timestamptz NOT NULL DEFAULT now(),
  lock_id text
);
ALTER TABLE public.function_execution_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to function_execution_locks" ON public.function_execution_locks FOR ALL USING (true) WITH CHECK (true);

-- Step 4: Create account_defaults table
CREATE TABLE IF NOT EXISTS public.account_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL,
  min_signal_quality numeric DEFAULT 10,
  max_position_size numeric DEFAULT 0.1,
  risk_per_trade numeric DEFAULT 2,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.account_defaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to account_defaults" ON public.account_defaults FOR ALL USING (true) WITH CHECK (true);

-- Seed account_defaults
INSERT INTO public.account_defaults (portfolio_id, min_signal_quality, max_position_size, risk_per_trade)
VALUES ('00000000-0000-0000-0000-000000000001', 5, 0.1, 2)
ON CONFLICT DO NOTHING;

-- Step 5: Create correlations table
CREATE TABLE IF NOT EXISTS public.correlations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol_pair text NOT NULL,
  correlation_coefficient numeric DEFAULT 0,
  calculated_at timestamptz DEFAULT now(),
  timeframe text DEFAULT '1h',
  sample_size integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'
);
ALTER TABLE public.correlations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to correlations" ON public.correlations FOR ALL USING (true) WITH CHECK (true);

-- Step 6: Add exit_check_count to shadow_trades
ALTER TABLE public.shadow_trades ADD COLUMN IF NOT EXISTS exit_check_count integer DEFAULT 0;

-- Step 7: Add signal_quality_score and market_regime to master_signals
ALTER TABLE public.master_signals ADD COLUMN IF NOT EXISTS signal_quality_score numeric DEFAULT NULL;
ALTER TABLE public.master_signals ADD COLUMN IF NOT EXISTS market_regime text DEFAULT NULL;

-- Step 8: Add missing columns to signal_rejection_logs
ALTER TABLE public.signal_rejection_logs ADD COLUMN IF NOT EXISTS value numeric DEFAULT NULL;
ALTER TABLE public.signal_rejection_logs ADD COLUMN IF NOT EXISTS threshold numeric DEFAULT NULL;
ALTER TABLE public.signal_rejection_logs ADD COLUMN IF NOT EXISTS signal_type text DEFAULT NULL;
ALTER TABLE public.signal_rejection_logs ADD COLUMN IF NOT EXISTS factors_count integer DEFAULT NULL;
ALTER TABLE public.signal_rejection_logs ADD COLUMN IF NOT EXISTS entropy numeric DEFAULT NULL;
ALTER TABLE public.signal_rejection_logs ADD COLUMN IF NOT EXISTS probability numeric DEFAULT NULL;
ALTER TABLE public.signal_rejection_logs ADD COLUMN IF NOT EXISTS confluence_score numeric DEFAULT NULL;
ALTER TABLE public.signal_rejection_logs ADD COLUMN IF NOT EXISTS net_edge numeric DEFAULT NULL;
ALTER TABLE public.signal_rejection_logs ADD COLUMN IF NOT EXISTS market_regime text DEFAULT NULL;

-- Step 9: Create atomic_lock_signals RPC
CREATE OR REPLACE FUNCTION public.atomic_lock_signals(
  p_limit integer DEFAULT 5,
  p_min_confluence_score numeric DEFAULT 5,
  p_max_age_minutes integer DEFAULT 240
)
RETURNS SETOF public.master_signals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.master_signals
  SET status = 'executing', updated_at = now()
  WHERE id IN (
    SELECT id FROM public.master_signals
    WHERE status = 'pending'
      AND confluence_score >= p_min_confluence_score
      AND created_at >= now() - (p_max_age_minutes || ' minutes')::interval
      AND signal_type IN ('buy', 'sell')
    ORDER BY confluence_score DESC, created_at DESC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

-- Step 10: Add missing columns to adaptive_thresholds for generate-confluence-signals
ALTER TABLE public.adaptive_thresholds ADD COLUMN IF NOT EXISTS probability_buy numeric DEFAULT 0.56;
ALTER TABLE public.adaptive_thresholds ADD COLUMN IF NOT EXISTS probability_sell numeric DEFAULT 0.44;
ALTER TABLE public.adaptive_thresholds ADD COLUMN IF NOT EXISTS confluence_min numeric DEFAULT 8;
ALTER TABLE public.adaptive_thresholds ADD COLUMN IF NOT EXISTS edge_min numeric DEFAULT -0.0002;
ALTER TABLE public.adaptive_thresholds ADD COLUMN IF NOT EXISTS edge_adaptive numeric DEFAULT 0.00005;
