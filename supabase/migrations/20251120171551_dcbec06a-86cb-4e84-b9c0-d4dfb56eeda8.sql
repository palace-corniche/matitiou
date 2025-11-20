-- Create atomic_lock_signals function for shadow trade execution
CREATE OR REPLACE FUNCTION public.atomic_lock_signals(
  p_limit INTEGER DEFAULT 10,
  p_max_age_minutes INTEGER DEFAULT 60,
  p_min_confluence_score NUMERIC DEFAULT 0.5
)
RETURNS TABLE(
  id UUID,
  signal_type TEXT,
  symbol TEXT,
  final_confidence NUMERIC,
  confluence_score NUMERIC,
  recommended_entry NUMERIC,
  recommended_stop_loss NUMERIC,
  recommended_take_profit NUMERIC,
  recommended_lot_size NUMERIC,
  market_regime TEXT,
  created_at TIMESTAMPTZ,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ms.id,
    ms.signal_type,
    ms.symbol,
    ms.final_confidence,
    ms.confluence_score,
    ms.recommended_entry,
    ms.recommended_stop_loss,
    ms.recommended_take_profit,
    ms.recommended_lot_size,
    ms.market_regime,
    ms.created_at,
    ms.metadata
  FROM public.master_signals ms
  WHERE ms.status = 'pending'
    AND ms.created_at > NOW() - (p_max_age_minutes || ' minutes')::INTERVAL
    AND ms.confluence_score >= p_min_confluence_score
    AND NOT EXISTS (
      SELECT 1 FROM public.shadow_trades st 
      WHERE st.signal_id = ms.id
    )
  ORDER BY ms.confluence_score DESC, ms.created_at ASC
  LIMIT p_limit
  FOR UPDATE SKIP LOCKED;
END;
$$;