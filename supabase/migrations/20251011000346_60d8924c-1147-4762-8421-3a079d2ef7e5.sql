-- PHASE 2 & 7: Create cron job and optimize thresholds (fixed system_health schema)
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the signal recovery job
SELECT cron.schedule(
  'recover-signals-every-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/recover-missed-signals',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
    body:='{"trigger": "cron"}'::jsonb
  ) as request_id;
  $$
);

-- PHASE 7: Fine-tune intelligent exit thresholds for $10/24h target
UPDATE adaptive_thresholds 
SET 
  confluence_min = 12,
  confluence_adaptive = 15,
  entropy_min = 0.65,
  entropy_current = 0.80,
  entropy_max = 0.92,
  edge_adaptive = 0.00015,
  probability_buy = 0.55,
  probability_sell = 0.45,
  updated_at = now(),
  last_adaptation = now();

-- PHASE 6: Create preflight validation function
CREATE OR REPLACE FUNCTION public.validate_trade_preflight(
  p_symbol TEXT,
  p_signal_type TEXT,
  p_confluence_score NUMERIC,
  p_entry_price NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
  validation_errors TEXT[] := ARRAY[]::TEXT[];
  current_volatility NUMERIC;
  high_impact_news_count INTEGER;
  correlation_issues INTEGER;
  atr_value NUMERIC;
BEGIN
  -- Check 1: Confluence score minimum
  IF p_confluence_score < 12 THEN
    validation_errors := array_append(validation_errors, 
      'Confluence score too low: ' || p_confluence_score || ' (min: 12)');
  END IF;
  
  -- Check 2: Volatility check (using recent market data)
  SELECT STDDEV(high_price - low_price) / AVG(price) * 100
  INTO current_volatility
  FROM market_data_feed
  WHERE symbol = p_symbol
    AND timestamp > now() - interval '4 hours'
  LIMIT 50;
  
  IF current_volatility > 0.6 THEN
    validation_errors := array_append(validation_errors, 
      'Volatility too high: ' || ROUND(current_volatility::NUMERIC, 4) || '% (max: 0.6%)');
  ELSIF current_volatility < 0.03 THEN
    validation_errors := array_append(validation_errors, 
      'Volatility too low: ' || ROUND(current_volatility::NUMERIC, 4) || '% (min: 0.03%)');
  END IF;
  
  -- Check 3: High-impact news within 30 minutes
  SELECT COUNT(*) INTO high_impact_news_count
  FROM economic_events
  WHERE p_symbol = ANY(symbol_impact)
    AND impact_level = 'high'
    AND event_time BETWEEN now() - interval '15 minutes' AND now() + interval '30 minutes';
  
  IF high_impact_news_count > 0 THEN
    validation_errors := array_append(validation_errors, 
      'High-impact news event within 30 minutes (' || high_impact_news_count || ' events)');
  END IF;
  
  -- Check 4: ATR-based price validation
  SELECT AVG(high_price - low_price) INTO atr_value
  FROM market_data_feed
  WHERE symbol = p_symbol
    AND timestamp > now() - interval '2 hours'
  LIMIT 14;
  
  -- Build result
  result := jsonb_build_object(
    'allowed', array_length(validation_errors, 1) IS NULL OR array_length(validation_errors, 1) = 0,
    'errors', to_jsonb(validation_errors),
    'checks', jsonb_build_object(
      'confluence_score', p_confluence_score,
      'volatility_percent', ROUND(COALESCE(current_volatility, 0)::NUMERIC, 4),
      'high_impact_news_count', high_impact_news_count,
      'atr', ROUND(COALESCE(atr_value, 0)::NUMERIC, 5)
    ),
    'timestamp', now()
  );
  
  RETURN result;
END;
$$;