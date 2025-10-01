-- ============================================================================
-- PHASE 6: PATTERN RECOGNITION & TRADE FILTERING
-- ============================================================================

-- 1. Create winning patterns tracking table
CREATE TABLE IF NOT EXISTS public.winning_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL, -- 'signal_quality', 'market_regime', 'timing', 'confluence'
  pattern_criteria JSONB NOT NULL, -- The specific pattern parameters
  win_rate NUMERIC NOT NULL DEFAULT 0,
  sample_size INTEGER NOT NULL DEFAULT 0,
  avg_profit NUMERIC NOT NULL DEFAULT 0,
  avg_pips NUMERIC NOT NULL DEFAULT 0,
  confidence_threshold NUMERIC NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 2. Create trade quality score function
CREATE OR REPLACE FUNCTION public.calculate_trade_quality_score(
  p_signal_id UUID,
  p_confluence_score NUMERIC DEFAULT 0,
  p_market_regime TEXT DEFAULT 'unknown',
  p_volatility_percentile NUMERIC DEFAULT 50
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $function$
DECLARE
  quality_score NUMERIC := 0;
  signal_record RECORD;
  pattern_bonus NUMERIC := 0;
BEGIN
  -- Get signal details
  SELECT * INTO signal_record
  FROM master_signals
  WHERE id = p_signal_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Base score from confluence (0-40 points)
  quality_score := quality_score + (LEAST(p_confluence_score / 20, 2) * 20);
  
  -- Confidence score (0-30 points)
  quality_score := quality_score + (signal_record.final_confidence * 30);
  
  -- Market regime bonus (0-15 points)
  IF p_market_regime = 'trending' THEN
    quality_score := quality_score + 15;
  ELSIF p_market_regime = 'ranging' THEN
    quality_score := quality_score + 10;
  ELSIF p_market_regime = 'volatile' THEN
    quality_score := quality_score + 5;
  END IF;
  
  -- Volatility appropriateness (0-10 points)
  IF p_volatility_percentile BETWEEN 30 AND 70 THEN
    quality_score := quality_score + 10;
  ELSIF p_volatility_percentile BETWEEN 20 AND 80 THEN
    quality_score := quality_score + 5;
  END IF;
  
  -- Check winning patterns (0-15 bonus points)
  SELECT COALESCE(MAX(win_rate * 0.15), 0) INTO pattern_bonus
  FROM winning_patterns wp
  WHERE wp.is_active 
    AND wp.sample_size >= 10
    AND (
      (wp.pattern_type = 'signal_quality' AND signal_record.final_confidence >= (wp.pattern_criteria->>'min_confidence')::NUMERIC)
      OR (wp.pattern_type = 'market_regime' AND p_market_regime = (wp.pattern_criteria->>'regime'))
      OR (wp.pattern_type = 'confluence' AND p_confluence_score >= (wp.pattern_criteria->>'min_score')::NUMERIC)
    );
  
  quality_score := quality_score + pattern_bonus;
  
  RETURN LEAST(quality_score, 100); -- Cap at 100
END;
$function$;

-- 3. Create dynamic lot sizing function
CREATE OR REPLACE FUNCTION public.calculate_dynamic_lot_size(
  p_portfolio_id UUID,
  p_quality_score NUMERIC,
  p_risk_percent NUMERIC DEFAULT 2.0,
  p_account_balance NUMERIC DEFAULT 100000
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $function$
DECLARE
  base_lot_size NUMERIC;
  adjusted_lot_size NUMERIC;
  risk_multiplier NUMERIC;
  account_defaults RECORD;
BEGIN
  -- Get account defaults
  SELECT * INTO account_defaults
  FROM account_defaults
  WHERE portfolio_id = p_portfolio_id
  LIMIT 1;
  
  -- Start with base lot size
  base_lot_size := COALESCE(account_defaults.default_lot_size, 0.01);
  
  -- Calculate risk multiplier based on quality score
  -- Quality 0-40: 0.5x | 40-60: 1.0x | 60-80: 1.5x | 80-100: 2.0x
  IF p_quality_score >= 80 THEN
    risk_multiplier := 2.0;
  ELSIF p_quality_score >= 60 THEN
    risk_multiplier := 1.5;
  ELSIF p_quality_score >= 40 THEN
    risk_multiplier := 1.0;
  ELSE
    risk_multiplier := 0.5;
  END IF;
  
  -- Apply multiplier
  adjusted_lot_size := base_lot_size * risk_multiplier;
  
  -- Apply risk percentage constraint
  adjusted_lot_size := LEAST(
    adjusted_lot_size, 
    (p_account_balance * (p_risk_percent / 100)) / 100
  );
  
  -- Round to valid lot sizes (0.01, 0.02, etc.)
  adjusted_lot_size := ROUND(adjusted_lot_size / 0.01) * 0.01;
  
  -- Ensure minimum and maximum
  adjusted_lot_size := GREATEST(adjusted_lot_size, 0.01);
  adjusted_lot_size := LEAST(adjusted_lot_size, 10.0);
  
  RETURN adjusted_lot_size;
END;
$function$;

-- 4. Create market condition filter function
CREATE OR REPLACE FUNCTION public.should_trade_now(
  p_symbol TEXT DEFAULT 'EUR/USD',
  p_min_quality_score NUMERIC DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
AS $function$
DECLARE
  result JSONB;
  current_hour INTEGER;
  current_volatility NUMERIC;
  recent_spread NUMERIC;
  trading_allowed BOOLEAN := true;
  rejection_reason TEXT := NULL;
BEGIN
  -- Check trading hours (avoid low liquidity periods)
  current_hour := EXTRACT(HOUR FROM now() AT TIME ZONE 'UTC');
  
  -- Avoid Asian session low liquidity (22:00-06:00 UTC)
  IF current_hour >= 22 OR current_hour < 6 THEN
    trading_allowed := false;
    rejection_reason := 'Low liquidity period (Asian session)';
  END IF;
  
  -- Check recent volatility
  SELECT 
    STDDEV(high_price - low_price) / AVG(price) * 100
  INTO current_volatility
  FROM market_data_feed
  WHERE symbol = p_symbol
    AND timestamp > now() - interval '4 hours'
    AND timeframe = '15m';
  
  -- Reject if volatility is too high (> 0.5%) or too low (< 0.05%)
  IF current_volatility > 0.5 THEN
    trading_allowed := false;
    rejection_reason := 'Volatility too high';
  ELSIF current_volatility < 0.05 THEN
    trading_allowed := false;
    rejection_reason := 'Volatility too low';
  END IF;
  
  -- Build result
  result := jsonb_build_object(
    'allowed', trading_allowed,
    'reason', rejection_reason,
    'current_hour', current_hour,
    'volatility_percent', COALESCE(current_volatility, 0),
    'timestamp', now()
  );
  
  RETURN result;
END;
$function$;

-- 5. Create function to update winning patterns
CREATE OR REPLACE FUNCTION public.update_winning_patterns()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  pattern_record RECORD;
BEGIN
  -- Analyze closed trades to find winning patterns
  
  -- Pattern 1: High confidence signals (>0.7)
  INSERT INTO winning_patterns (pattern_type, pattern_criteria, win_rate, sample_size, avg_profit, avg_pips)
  SELECT 
    'signal_quality',
    jsonb_build_object('min_confidence', 0.7),
    COUNT(CASE WHEN st.pnl > 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100,
    COUNT(*),
    AVG(st.pnl),
    AVG(st.profit_pips)
  FROM shadow_trades st
  JOIN master_signals ms ON st.comment LIKE '%' || ms.id::TEXT || '%'
  WHERE st.status = 'closed' 
    AND ms.final_confidence >= 0.7
    AND st.exit_time > now() - interval '7 days'
  HAVING COUNT(*) >= 5
  ON CONFLICT (pattern_type, pattern_criteria) 
  DO UPDATE SET
    win_rate = EXCLUDED.win_rate,
    sample_size = EXCLUDED.sample_size,
    avg_profit = EXCLUDED.avg_profit,
    avg_pips = EXCLUDED.avg_pips,
    updated_at = now();
    
  -- Pattern 2: Trending market regime
  INSERT INTO winning_patterns (pattern_type, pattern_criteria, win_rate, sample_size, avg_profit, avg_pips)
  SELECT 
    'market_regime',
    jsonb_build_object('regime', 'trending'),
    COUNT(CASE WHEN st.pnl > 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100,
    COUNT(*),
    AVG(st.pnl),
    AVG(st.profit_pips)
  FROM shadow_trades st
  JOIN master_signals ms ON st.comment LIKE '%' || ms.id::TEXT || '%'
  WHERE st.status = 'closed' 
    AND ms.market_regime = 'trending'
    AND st.exit_time > now() - interval '7 days'
  HAVING COUNT(*) >= 5
  ON CONFLICT (pattern_type, pattern_criteria) 
  DO UPDATE SET
    win_rate = EXCLUDED.win_rate,
    sample_size = EXCLUDED.sample_size,
    avg_profit = EXCLUDED.avg_profit,
    avg_pips = EXCLUDED.avg_pips,
    updated_at = now();
    
  -- Pattern 3: High confluence (>15)
  INSERT INTO winning_patterns (pattern_type, pattern_criteria, win_rate, sample_size, avg_profit, avg_pips)
  SELECT 
    'confluence',
    jsonb_build_object('min_score', 15),
    COUNT(CASE WHEN st.pnl > 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100,
    COUNT(*),
    AVG(st.pnl),
    AVG(st.profit_pips)
  FROM shadow_trades st
  JOIN master_signals ms ON st.comment LIKE '%' || ms.id::TEXT || '%'
  WHERE st.status = 'closed' 
    AND ms.confluence_score >= 15
    AND st.exit_time > now() - interval '7 days'
  HAVING COUNT(*) >= 5
  ON CONFLICT (pattern_type, pattern_criteria) 
  DO UPDATE SET
    win_rate = EXCLUDED.win_rate,
    sample_size = EXCLUDED.sample_size,
    avg_profit = EXCLUDED.avg_profit,
    avg_pips = EXCLUDED.avg_pips,
    updated_at = now();
END;
$function$;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_winning_patterns_active ON winning_patterns(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_winning_patterns_type ON winning_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_shadow_trades_closed_exit_time ON shadow_trades(exit_time) WHERE status = 'closed';

-- 7. Grant permissions
ALTER TABLE public.winning_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view winning patterns"
  ON public.winning_patterns FOR SELECT
  USING (true);

CREATE POLICY "System can manage winning patterns"
  ON public.winning_patterns FOR ALL
  USING (true);

COMMENT ON TABLE public.winning_patterns IS 'Tracks historically successful trading patterns for signal filtering';
COMMENT ON FUNCTION public.calculate_trade_quality_score(UUID, NUMERIC, TEXT, NUMERIC) IS 'Calculates comprehensive quality score (0-100) for trade signals';
COMMENT ON FUNCTION public.calculate_dynamic_lot_size(UUID, NUMERIC, NUMERIC, NUMERIC) IS 'Adjusts lot size based on signal quality and risk parameters';
COMMENT ON FUNCTION public.should_trade_now(TEXT, NUMERIC) IS 'Filters trades based on current market conditions and trading hours';
COMMENT ON FUNCTION public.update_winning_patterns() IS 'Analyzes historical trades to identify and update winning patterns';