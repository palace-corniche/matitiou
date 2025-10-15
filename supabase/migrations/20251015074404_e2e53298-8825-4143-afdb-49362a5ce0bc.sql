-- =============================================
-- PHASE 2: PRICE VALIDATION FUNCTIONS
-- =============================================

-- Create signal freshness validation function
CREATE OR REPLACE FUNCTION validate_signal_freshness(p_signal_id UUID)
RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  signal_age_seconds INTEGER;
  signal_status TEXT;
BEGIN
  SELECT 
    EXTRACT(EPOCH FROM (now() - created_at))::INTEGER,
    status
  INTO signal_age_seconds, signal_status
  FROM master_signals
  WHERE id = p_signal_id;
  
  IF signal_age_seconds IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Signal not found');
  END IF;
  
  IF signal_status != 'pending' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Signal already executed or rejected', 'status', signal_status);
  END IF;
  
  IF signal_age_seconds > 300 THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Signal too old', 'age_seconds', signal_age_seconds, 'max_age_seconds', 300);
  END IF;
  
  RETURN jsonb_build_object('valid', true, 'age_seconds', signal_age_seconds);
END;
$$;

-- Enhanced execute_advanced_order with real-time price validation
CREATE OR REPLACE FUNCTION execute_advanced_order(p_portfolio_id UUID, p_order_data JSONB)
RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  portfolio_record shadow_portfolios%ROWTYPE;
  global_account_record global_trading_account%ROWTYPE;
  instrument_record trading_instruments%ROWTYPE;
  required_margin NUMERIC;
  available_margin NUMERIC;
  spread NUMERIC;
  entry_price NUMERIC;
  actual_entry_price NUMERIC;
  trade_id UUID;
  lot_size_val NUMERIC;
  current_market_price NUMERIC;
  price_deviation NUMERIC;
  use_global_account BOOLEAN;
  signal_validation JSONB;
  data_freshness_ms INTEGER;
  master_signal_id_val UUID;
  data_source TEXT;
BEGIN
  master_signal_id_val := (p_order_data->>'master_signal_id')::UUID;
  
  IF master_signal_id_val IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'master_signal_id required', 'execution_path', 'rejected_no_signal');
  END IF;
  
  signal_validation := validate_signal_freshness(master_signal_id_val);
  
  IF NOT (signal_validation->>'valid')::BOOLEAN THEN
    RETURN jsonb_build_object('success', false, 'error', 'Signal validation failed', 'reason', signal_validation->>'reason', 'details', signal_validation, 'execution_path', 'rejected_stale_signal');
  END IF;
  
  use_global_account := (p_portfolio_id = '00000000-0000-0000-0000-000000000001');
  
  IF use_global_account THEN
    SELECT * INTO global_account_record FROM global_trading_account WHERE id = p_portfolio_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Global account not found');
    END IF;
    available_margin := global_account_record.free_margin;
  ELSE
    SELECT * INTO portfolio_record FROM shadow_portfolios WHERE id = p_portfolio_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Portfolio not found');
    END IF;
    available_margin := portfolio_record.free_margin;
  END IF;
  
  SELECT * INTO instrument_record FROM trading_instruments WHERE symbol = (p_order_data->>'symbol');
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid instrument');
  END IF;
  
  lot_size_val := (p_order_data->>'lot_size')::NUMERIC;
  entry_price := (p_order_data->>'entry_price')::NUMERIC;
  
  -- Cascading price validation: tick_data → market_data_feed
  SELECT (bid + ask) / 2, EXTRACT(EPOCH FROM (now() - timestamp))::INTEGER * 1000
  INTO current_market_price, data_freshness_ms
  FROM tick_data
  WHERE symbol = (p_order_data->>'symbol') AND is_live = true
  ORDER BY timestamp DESC LIMIT 1;
  
  IF data_freshness_ms IS NOT NULL AND data_freshness_ms <= 5000 THEN
    data_source := 'tick_data';
  ELSE
    SELECT price, EXTRACT(EPOCH FROM (now() - timestamp))::INTEGER * 1000
    INTO current_market_price, data_freshness_ms
    FROM market_data_feed
    WHERE symbol = (p_order_data->>'symbol')
    ORDER BY timestamp DESC LIMIT 1;
    
    IF data_freshness_ms IS NULL OR data_freshness_ms > 300000 THEN
      RETURN jsonb_build_object('success', false, 'error', 'No fresh data', 'data_age_ms', data_freshness_ms, 'execution_path', 'rejected_stale_data');
    END IF;
    data_source := 'market_data_feed';
  END IF;
  
  price_deviation := ABS(entry_price - current_market_price) / current_market_price * 100;
  
  IF price_deviation > 0.1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Price deviation too large', 'requested_price', entry_price, 'market_price', current_market_price, 'deviation_percent', price_deviation, 'execution_path', 'rejected_price_deviation');
  END IF;
  
  required_margin := lot_size_val * instrument_record.contract_size * entry_price * (instrument_record.margin_percentage / 100);
  
  IF required_margin > available_margin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient margin', 'execution_path', 'rejected_margin');
  END IF;
  
  spread := instrument_record.typical_spread * instrument_record.pip_size;
  
  IF (p_order_data->>'trade_type') = 'buy' THEN
    actual_entry_price := entry_price + spread;
  ELSE
    actual_entry_price := entry_price - spread;
  END IF;
  
  INSERT INTO shadow_trades (
    portfolio_id, symbol, trade_type, lot_size, position_size, remaining_lot_size,
    entry_price, current_price, stop_loss, take_profit, contract_size, 
    margin_required, order_type, comment, magic_number, status,
    master_signal_id, execution_path
  ) VALUES (
    p_portfolio_id, p_order_data->>'symbol', p_order_data->>'trade_type',
    lot_size_val, lot_size_val, lot_size_val, actual_entry_price, actual_entry_price,
    COALESCE((p_order_data->>'stop_loss')::NUMERIC, 0),
    COALESCE((p_order_data->>'take_profit')::NUMERIC, 0),
    instrument_record.contract_size, required_margin,
    COALESCE(p_order_data->>'order_type', 'market'),
    'Advanced Fusion System v2', 999999, 'open',
    master_signal_id_val, 'advanced_fusion'
  ) RETURNING id INTO trade_id;
  
  INSERT INTO trade_execution_log (trade_id, signal_id, execution_path, execution_timestamp, data_freshness_ms, price_deviation_percent, validation_results)
  VALUES (trade_id, master_signal_id_val, 'advanced_fusion', now(), data_freshness_ms, price_deviation, 
    jsonb_build_object('signal_age_seconds', (signal_validation->>'age_seconds')::INTEGER, 'market_price', current_market_price, 'entry_price', actual_entry_price, 'data_source', data_source)
  );
  
  IF use_global_account THEN
    UPDATE global_trading_account
    SET used_margin = used_margin + required_margin, free_margin = free_margin - required_margin,
        margin_level = CASE WHEN (used_margin + required_margin) > 0 THEN (equity / (used_margin + required_margin)) * 100 ELSE 0 END,
        updated_at = now()
    WHERE id = p_portfolio_id;
  ELSE
    UPDATE shadow_portfolios 
    SET used_margin = used_margin + required_margin, free_margin = free_margin - required_margin,
        margin_level = CASE WHEN (used_margin + required_margin) > 0 THEN (equity / (used_margin + required_margin)) * 100 ELSE 0 END,
        updated_at = now()
    WHERE id = p_portfolio_id;
  END IF;
  
  UPDATE master_signals SET status = 'executed', execution_timestamp = now(), execution_price = actual_entry_price, updated_at = now()
  WHERE id = master_signal_id_val;
  
  RETURN jsonb_build_object('success', true, 'trade_id', trade_id, 'actual_entry_price', actual_entry_price, 'data_freshness_ms', data_freshness_ms, 'data_source', data_source, 'price_deviation_percent', price_deviation, 'execution_path', 'advanced_fusion');
END;
$$;