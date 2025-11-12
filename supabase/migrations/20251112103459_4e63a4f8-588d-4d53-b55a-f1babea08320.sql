
-- Create atomic signal locking function using SELECT FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION public.atomic_lock_signals(
  p_limit INTEGER DEFAULT 5,
  p_min_confluence_score NUMERIC DEFAULT 12,
  p_max_age_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
  id UUID,
  symbol TEXT,
  signal_type TEXT,
  recommended_entry NUMERIC,
  recommended_stop_loss NUMERIC,
  recommended_take_profit NUMERIC,
  final_confidence NUMERIC,
  confluence_score NUMERIC,
  signal_quality_score NUMERIC,
  market_regime TEXT,
  timeframe TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atomically lock and update pending signals to 'processing'
  -- SKIP LOCKED ensures no conflicts - each instance gets different signals
  RETURN QUERY
  UPDATE master_signals
  SET 
    status = 'processing',
    processing_started_at = NOW(),
    updated_at = NOW()
  WHERE master_signals.id IN (
    SELECT master_signals.id
    FROM master_signals
    WHERE status = 'pending'
      AND confluence_score >= p_min_confluence_score
      AND signal_type IN ('buy', 'sell')
      AND created_at >= NOW() - (p_max_age_minutes || ' minutes')::INTERVAL
    ORDER BY created_at DESC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED  -- ⚡ THE MAGIC: Atomically locks without conflicts
  )
  RETURNING 
    master_signals.id,
    master_signals.symbol,
    master_signals.signal_type,
    master_signals.recommended_entry,
    master_signals.recommended_stop_loss,
    master_signals.recommended_take_profit,
    master_signals.final_confidence,
    master_signals.confluence_score,
    master_signals.signal_quality_score,
    master_signals.market_regime,
    master_signals.timeframe,
    master_signals.created_at;
END;
$$;

COMMENT ON FUNCTION public.atomic_lock_signals IS 'Atomically locks available pending signals using SELECT FOR UPDATE SKIP LOCKED to prevent race conditions';
