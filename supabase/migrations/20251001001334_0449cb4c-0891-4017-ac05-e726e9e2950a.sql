-- ============================================================================
-- PHASE 7: PERFORMANCE OPTIMIZATION & COMPREHENSIVE LOGGING
-- ============================================================================

-- 1. Create trade decision log table for tracking all decisions
CREATE TABLE IF NOT EXISTS public.trade_decision_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES master_signals(id),
  decision TEXT NOT NULL, -- 'executed', 'rejected', 'skipped'
  decision_reason TEXT NOT NULL,
  quality_score NUMERIC,
  market_conditions JSONB,
  calculated_lot_size NUMERIC,
  expected_entry NUMERIC,
  expected_sl NUMERIC,
  expected_tp NUMERIC,
  rejection_filters JSONB, -- Which filters rejected the trade
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::JSONB
);

-- 2. Enhanced trailing stop logic with profit protection levels
CREATE OR REPLACE FUNCTION public.apply_intelligent_trailing_stop(
  p_trade_id UUID,
  p_current_price NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  trade_record shadow_trades%ROWTYPE;
  current_pips NUMERIC;
  new_sl NUMERIC;
  sl_updated BOOLEAN := false;
  protection_level TEXT;
BEGIN
  SELECT * INTO trade_record FROM shadow_trades WHERE id = p_trade_id;
  
  IF NOT FOUND OR trade_record.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Trade not found or closed');
  END IF;
  
  -- Calculate current profit in pips
  IF trade_record.trade_type = 'buy' THEN
    current_pips := (p_current_price - trade_record.entry_price) / 0.0001;
  ELSE
    current_pips := (trade_record.entry_price - p_current_price) / 0.0001;
  END IF;
  
  -- Apply tiered profit protection
  -- Level 1: 10+ pips - Move SL to breakeven
  IF current_pips >= 10 AND NOT trade_record.break_even_triggered THEN
    new_sl := trade_record.entry_price;
    protection_level := 'breakeven';
    sl_updated := true;
    
    UPDATE shadow_trades 
    SET 
      stop_loss = new_sl,
      break_even_triggered = true,
      updated_at = now()
    WHERE id = p_trade_id;
    
  -- Level 2: 20+ pips - Trail at +10 pips
  ELSIF current_pips >= 20 AND trade_record.break_even_triggered THEN
    IF trade_record.trade_type = 'buy' THEN
      new_sl := trade_record.entry_price + (0.0001 * 10);
    ELSE
      new_sl := trade_record.entry_price - (0.0001 * 10);
    END IF;
    
    IF (trade_record.trade_type = 'buy' AND new_sl > trade_record.stop_loss) OR
       (trade_record.trade_type = 'sell' AND new_sl < trade_record.stop_loss) THEN
      protection_level := 'trail_10pips';
      sl_updated := true;
      
      UPDATE shadow_trades 
      SET 
        stop_loss = new_sl,
        trailing_stop_triggered = true,
        updated_at = now()
      WHERE id = p_trade_id;
    END IF;
    
  -- Level 3: 40+ pips - Trail at 50% of profit
  ELSIF current_pips >= 40 THEN
    IF trade_record.trade_type = 'buy' THEN
      new_sl := trade_record.entry_price + (0.0001 * current_pips * 0.5);
    ELSE
      new_sl := trade_record.entry_price - (0.0001 * current_pips * 0.5);
    END IF;
    
    IF (trade_record.trade_type = 'buy' AND new_sl > trade_record.stop_loss) OR
       (trade_record.trade_type = 'sell' AND new_sl < trade_record.stop_loss) THEN
      protection_level := 'trail_50percent';
      sl_updated := true;
      
      UPDATE shadow_trades 
      SET 
        stop_loss = new_sl,
        trailing_stop_triggered = true,
        updated_at = now()
      WHERE id = p_trade_id;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'sl_updated', sl_updated,
    'protection_level', protection_level,
    'current_pips', current_pips,
    'new_sl', new_sl,
    'old_sl', trade_record.stop_loss
  );
END;
$function$;

-- 3. Enhanced update_eurusd_pnl with intelligent trailing stops
CREATE OR REPLACE FUNCTION public.update_eurusd_pnl()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  trade_record shadow_trades%ROWTYPE;
  current_bid NUMERIC;
  current_ask NUMERIC;
  cur_price NUMERIC;
  pip_difference NUMERIC;
  pip_value_calc NUMERIC;
  pnl_calc NUMERIC;
  portfolio_ids UUID[];
  trailing_result JSONB;
BEGIN
  -- Get latest EUR/USD price from market_data_feed
  SELECT price, price INTO current_bid, current_ask
  FROM market_data_feed 
  WHERE symbol = 'EUR/USD' 
  ORDER BY timestamp DESC 
  LIMIT 1;
  
  IF current_bid IS NOT NULL THEN
    current_ask := current_bid + 0.00015;
  ELSE
    current_bid := 1.17065;
    current_ask := 1.17080;
  END IF;
  
  -- Process each open EUR/USD trade
  FOR trade_record IN 
    SELECT * FROM shadow_trades 
    WHERE status = 'open' AND symbol = 'EUR/USD'
  LOOP
    IF trade_record.trade_type = 'buy' THEN
      cur_price := current_bid;
    ELSE
      cur_price := current_ask;
    END IF;
    
    -- Calculate pip difference and P&L
    IF trade_record.trade_type = 'buy' THEN
      pip_difference := (cur_price - trade_record.entry_price) / 0.0001;
    ELSE
      pip_difference := (trade_record.entry_price - cur_price) / 0.0001;
    END IF;
    
    pip_value_calc := trade_record.lot_size * 10;
    pnl_calc := pip_difference * pip_value_calc;
    
    -- Update trade with real-time P&L
    UPDATE shadow_trades 
    SET 
      current_price = cur_price,
      unrealized_pnl = pnl_calc,
      profit_pips = pip_difference,
      pip_value = pip_value_calc,
      updated_at = now()
    WHERE id = trade_record.id;
    
    -- Apply intelligent trailing stops
    trailing_result := apply_intelligent_trailing_stop(trade_record.id, cur_price);
    
    -- Check for SL/TP hits
    IF (trade_record.trade_type = 'buy' AND cur_price <= trade_record.stop_loss AND trade_record.stop_loss > 0) OR
       (trade_record.trade_type = 'sell' AND cur_price >= trade_record.stop_loss AND trade_record.stop_loss > 0) THEN
      
      PERFORM close_shadow_trade(trade_record.id, cur_price, trade_record.lot_size, 'stop_loss');
      
    ELSIF (trade_record.trade_type = 'buy' AND cur_price >= trade_record.take_profit AND trade_record.take_profit > 0) OR
          (trade_record.trade_type = 'sell' AND cur_price <= trade_record.take_profit AND trade_record.take_profit > 0) THEN
      
      PERFORM close_shadow_trade(trade_record.id, cur_price, trade_record.lot_size, 'take_profit');
    
    -- Maximum profit protection: close if profit >= $500
    ELSIF pnl_calc >= 500 THEN
      PERFORM close_shadow_trade(trade_record.id, cur_price, trade_record.lot_size, 'max_profit_protection');
    
    -- Time-based exit after 48 hours
    ELSIF trade_record.entry_time < now() - interval '48 hours' THEN
      PERFORM close_shadow_trade(trade_record.id, cur_price, trade_record.lot_size, 'time_exit');
    END IF;
  END LOOP;
  
  -- Update portfolio equities
  SELECT array_agg(DISTINCT portfolio_id) INTO portfolio_ids
  FROM shadow_trades 
  WHERE status = 'open';
  
  IF portfolio_ids IS NOT NULL THEN
    UPDATE shadow_portfolios 
    SET 
      floating_pnl = COALESCE((SELECT SUM(unrealized_pnl) FROM shadow_trades WHERE portfolio_id = shadow_portfolios.id AND status = 'open'), 0),
      equity = balance + COALESCE((SELECT SUM(unrealized_pnl) FROM shadow_trades WHERE portfolio_id = shadow_portfolios.id AND status = 'open'), 0),
      updated_at = now()
    WHERE id = ANY(portfolio_ids);
  END IF;
  
  -- Update global trading account
  UPDATE global_trading_account
  SET
    floating_pnl = COALESCE((SELECT SUM(unrealized_pnl) FROM shadow_trades WHERE status = 'open'), 0),
    equity = balance + COALESCE((SELECT SUM(unrealized_pnl) FROM shadow_trades WHERE status = 'open'), 0),
    used_margin = COALESCE((SELECT SUM(margin_required) FROM shadow_trades WHERE status = 'open'), 0),
    free_margin = balance - COALESCE((SELECT SUM(margin_required) FROM shadow_trades WHERE status = 'open'), 0),
    margin_level = CASE 
      WHEN COALESCE((SELECT SUM(margin_required) FROM shadow_trades WHERE status = 'open'), 0) > 0 
      THEN ((balance + COALESCE((SELECT SUM(unrealized_pnl) FROM shadow_trades WHERE status = 'open'), 0)) / 
            COALESCE((SELECT SUM(margin_required) FROM shadow_trades WHERE status = 'open'), 0)) * 100
      ELSE 0 
    END,
    updated_at = now()
  WHERE id = '00000000-0000-0000-0000-000000000001';
END;
$function$;

-- 4. Create performance feedback analytics function
CREATE OR REPLACE FUNCTION public.analyze_trade_performance()
RETURNS TABLE(
  pattern_type TEXT,
  win_rate NUMERIC,
  avg_profit NUMERIC,
  sample_size BIGINT,
  recommendation TEXT
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH trade_analysis AS (
    SELECT 
      st.pnl > 0 as is_win,
      st.pnl,
      st.profit_pips,
      st.exit_reason,
      ms.final_confidence,
      ms.confluence_score,
      ms.market_regime,
      EXTRACT(HOUR FROM st.entry_time) as entry_hour
    FROM shadow_trades st
    LEFT JOIN master_signals ms ON st.comment LIKE '%' || ms.id::TEXT || '%'
    WHERE st.status = 'closed'
      AND st.exit_time > now() - interval '30 days'
  )
  SELECT 
    'High Confidence (>0.7)' as pattern_type,
    (COUNT(CASE WHEN is_win THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100) as win_rate,
    AVG(pnl) as avg_profit,
    COUNT(*) as sample_size,
    CASE 
      WHEN COUNT(*) < 10 THEN 'Insufficient data'
      WHEN (COUNT(CASE WHEN is_win THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) > 0.6 THEN 'INCREASE lot size'
      WHEN (COUNT(CASE WHEN is_win THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) < 0.4 THEN 'DECREASE lot size'
      ELSE 'MAINTAIN current sizing'
    END as recommendation
  FROM trade_analysis
  WHERE final_confidence >= 0.7
  
  UNION ALL
  
  SELECT 
    'High Confluence (>15)' as pattern_type,
    (COUNT(CASE WHEN is_win THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100) as win_rate,
    AVG(pnl) as avg_profit,
    COUNT(*) as sample_size,
    CASE 
      WHEN COUNT(*) < 10 THEN 'Insufficient data'
      WHEN (COUNT(CASE WHEN is_win THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) > 0.6 THEN 'PRIORITIZE these signals'
      WHEN (COUNT(CASE WHEN is_win THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) < 0.4 THEN 'FILTER OUT these signals'
      ELSE 'NEUTRAL - no action needed'
    END as recommendation
  FROM trade_analysis
  WHERE confluence_score >= 15
  
  UNION ALL
  
  SELECT 
    'Trending Market' as pattern_type,
    (COUNT(CASE WHEN is_win THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100) as win_rate,
    AVG(pnl) as avg_profit,
    COUNT(*) as sample_size,
    CASE 
      WHEN COUNT(*) < 10 THEN 'Insufficient data'
      WHEN (COUNT(CASE WHEN is_win THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) > 0.6 THEN 'FAVOR trend-following strategies'
      ELSE 'NEUTRAL - no strong pattern'
    END as recommendation
  FROM trade_analysis
  WHERE market_regime = 'trending'
  
  UNION ALL
  
  SELECT 
    'London Session (7-11 UTC)' as pattern_type,
    (COUNT(CASE WHEN is_win THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100) as win_rate,
    AVG(pnl) as avg_profit,
    COUNT(*) as sample_size,
    CASE 
      WHEN COUNT(*) < 10 THEN 'Insufficient data'
      WHEN (COUNT(CASE WHEN is_win THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) > 0.6 THEN 'INCREASE activity during London session'
      WHEN (COUNT(CASE WHEN is_win THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) < 0.4 THEN 'REDUCE activity during London session'
      ELSE 'NEUTRAL timing'
    END as recommendation
  FROM trade_analysis
  WHERE entry_hour BETWEEN 7 AND 11;
END;
$function$;

-- 5. Create comprehensive trade metrics view
CREATE OR REPLACE VIEW public.trade_performance_summary AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'closed') as total_closed_trades,
  COUNT(*) FILTER (WHERE status = 'open') as total_open_trades,
  COUNT(*) FILTER (WHERE status = 'closed' AND pnl > 0) as winning_trades,
  COUNT(*) FILTER (WHERE status = 'closed' AND pnl <= 0) as losing_trades,
  ROUND((COUNT(*) FILTER (WHERE status = 'closed' AND pnl > 0)::NUMERIC / 
         NULLIF(COUNT(*) FILTER (WHERE status = 'closed'), 0) * 100), 2) as win_rate_percent,
  ROUND(AVG(pnl) FILTER (WHERE status = 'closed' AND pnl > 0), 2) as avg_win_amount,
  ROUND(AVG(pnl) FILTER (WHERE status = 'closed' AND pnl <= 0), 2) as avg_loss_amount,
  ROUND(SUM(pnl) FILTER (WHERE status = 'closed'), 2) as total_realized_pnl,
  ROUND(SUM(unrealized_pnl) FILTER (WHERE status = 'open'), 2) as total_unrealized_pnl,
  ROUND(AVG(profit_pips) FILTER (WHERE status = 'closed' AND pnl > 0), 1) as avg_win_pips,
  ROUND(AVG(profit_pips) FILTER (WHERE status = 'closed' AND pnl <= 0), 1) as avg_loss_pips,
  MAX(pnl) FILTER (WHERE status = 'closed') as largest_win,
  MIN(pnl) FILTER (WHERE status = 'closed') as largest_loss,
  ROUND(AVG(EXTRACT(EPOCH FROM (exit_time - entry_time)) / 3600) FILTER (WHERE status = 'closed'), 1) as avg_trade_duration_hours,
  COUNT(DISTINCT exit_reason) FILTER (WHERE status = 'closed') as distinct_exit_reasons
FROM shadow_trades;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trade_decision_log_signal ON trade_decision_log(signal_id);
CREATE INDEX IF NOT EXISTS idx_trade_decision_log_decision ON trade_decision_log(decision);
CREATE INDEX IF NOT EXISTS idx_trade_decision_log_created ON trade_decision_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shadow_trades_entry_time ON shadow_trades(entry_time);
CREATE INDEX IF NOT EXISTS idx_shadow_trades_pnl ON shadow_trades(pnl) WHERE status = 'closed';

-- 7. Enable RLS on trade_decision_log
ALTER TABLE public.trade_decision_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trade decisions"
  ON public.trade_decision_log FOR SELECT
  USING (true);

CREATE POLICY "System can manage trade decisions"
  ON public.trade_decision_log FOR ALL
  USING (true);

-- 8. Create function to log trade decisions
CREATE OR REPLACE FUNCTION public.log_trade_decision(
  p_signal_id UUID,
  p_decision TEXT,
  p_reason TEXT,
  p_quality_score NUMERIC DEFAULT NULL,
  p_market_conditions JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $function$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO trade_decision_log (
    signal_id, decision, decision_reason, quality_score, 
    market_conditions, metadata
  ) VALUES (
    p_signal_id, p_decision, p_reason, p_quality_score,
    p_market_conditions, p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$;

COMMENT ON TABLE public.trade_decision_log IS 'Comprehensive log of all trading decisions for pattern analysis';
COMMENT ON FUNCTION public.apply_intelligent_trailing_stop(UUID, NUMERIC) IS 'Applies tiered profit protection: breakeven at 10 pips, trailing at 20+ pips';
COMMENT ON FUNCTION public.analyze_trade_performance() IS 'Analyzes historical trades to provide actionable recommendations';
COMMENT ON FUNCTION public.log_trade_decision(UUID, TEXT, TEXT, NUMERIC, JSONB, JSONB) IS 'Logs trading decisions for performance feedback loop';
COMMENT ON VIEW public.trade_performance_summary IS 'Comprehensive real-time view of trading performance metrics';