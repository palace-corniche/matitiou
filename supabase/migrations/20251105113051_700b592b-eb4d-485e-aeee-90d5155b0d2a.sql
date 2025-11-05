-- PHASE 4: Add Comprehensive Validation Layer

-- Create validation function for trade execution
CREATE OR REPLACE FUNCTION validate_trade_execution(
  p_symbol text,
  p_signal_id uuid,
  p_entry_price numeric,
  p_tick_timestamp timestamp with time zone,
  p_tick_bid numeric,
  p_tick_ask numeric,
  p_account_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_tick_age_ms integer;
  v_price_deviation numeric;
  v_signal_record master_signals%ROWTYPE;
  v_account_record global_trading_account%ROWTYPE;
  v_validation_result jsonb := '{"valid": true, "errors": []}'::jsonb;
  v_errors text[] := ARRAY[]::text[];
BEGIN
  -- Check 1: Tick freshness (< 5 seconds)
  v_tick_age_ms := EXTRACT(EPOCH FROM (now() - p_tick_timestamp)) * 1000;
  IF v_tick_age_ms > 5000 THEN
    v_errors := array_append(v_errors, 'Tick data too old: ' || v_tick_age_ms || 'ms');
  END IF;
  
  -- Check 2: Entry price within 0.5% of current market
  v_price_deviation := ABS(p_entry_price - (p_tick_bid + p_tick_ask) / 2) / p_entry_price * 100;
  IF v_price_deviation > 0.5 THEN
    v_errors := array_append(v_errors, 'Price deviation too high: ' || v_price_deviation::numeric(10,4) || '%');
  END IF;
  
  -- Check 3: Signal still valid (not expired)
  SELECT * INTO v_signal_record FROM master_signals WHERE id = p_signal_id;
  IF NOT FOUND THEN
    v_errors := array_append(v_errors, 'Signal not found');
  ELSIF v_signal_record.expires_at IS NOT NULL AND v_signal_record.expires_at < now() THEN
    v_errors := array_append(v_errors, 'Signal expired');
  ELSIF v_signal_record.status != 'pending' THEN
    v_errors := array_append(v_errors, 'Signal already executed or rejected');
  END IF;
  
  -- Check 4: Account has sufficient margin
  SELECT * INTO v_account_record FROM global_trading_account WHERE id = p_account_id;
  IF v_account_record.free_margin < 100 THEN
    v_errors := array_append(v_errors, 'Insufficient margin: ' || v_account_record.free_margin::text);
  END IF;
  
  -- Build result
  IF array_length(v_errors, 1) > 0 THEN
    v_validation_result := jsonb_build_object(
      'valid', false,
      'errors', to_jsonb(v_errors),
      'tick_age_ms', v_tick_age_ms,
      'price_deviation_percent', v_price_deviation,
      'signal_id', p_signal_id
    );
  ELSE
    v_validation_result := jsonb_build_object(
      'valid', true,
      'tick_age_ms', v_tick_age_ms,
      'price_deviation_percent', v_price_deviation
    );
  END IF;
  
  RETURN v_validation_result;
END;
$$;

-- Create trade_execution_log table for monitoring
CREATE TABLE IF NOT EXISTS trade_execution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid REFERENCES master_signals(id),
  execution_timestamp timestamp with time zone NOT NULL DEFAULT now(),
  success boolean NOT NULL,
  validation_result jsonb,
  error_message text,
  entry_price numeric,
  tick_age_ms integer,
  price_deviation_percent numeric,
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_trade_execution_log_signal 
  ON trade_execution_log(signal_id, execution_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_trade_execution_log_timestamp 
  ON trade_execution_log(execution_timestamp DESC);