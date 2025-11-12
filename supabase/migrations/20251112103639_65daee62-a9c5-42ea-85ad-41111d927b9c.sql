
-- Fix atomic signal locking function - resolve ambiguous column references
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
  UPDATE master_signals ms
  SET 
    status = 'processing',
    processing_started_at = NOW(),
    updated_at = NOW()
  WHERE ms.id IN (
    SELECT ms2.id
    FROM master_signals ms2
    WHERE ms2.status = 'pending'
      AND ms2.confluence_score >= p_min_confluence_score
      AND ms2.signal_type IN ('buy', 'sell')
      AND ms2.created_at >= NOW() - (p_max_age_minutes || ' minutes')::INTERVAL
    ORDER BY ms2.created_at DESC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED  -- ⚡ Atomically locks without conflicts
  )
  RETURNING 
    ms.id,
    ms.symbol,
    ms.signal_type,
    ms.recommended_entry,
    ms.recommended_stop_loss,
    ms.recommended_take_profit,
    ms.final_confidence,
    ms.confluence_score,
    ms.signal_quality_score,
    ms.market_regime,
    ms.timeframe,
    ms.created_at;
END;
$$;
