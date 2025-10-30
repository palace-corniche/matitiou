-- Fix execute_advanced_order to ONLY use tick_data for validation (never stale market_data_feed)
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
  
  -- **CRITICAL FIX**: ONLY use tick_data for validation (never stale market_data_feed)
  SELECT (bid + ask) / 2, EXTRACT(EPOCH FROM (now() - timestamp))::INTEGER * 1000
  INTO current_market_price, data_freshness_ms
  FROM tick_data
  WHERE symbol = (p_order_data->>'symbol') AND is_live = true
  ORDER BY timestamp DESC LIMIT 1;
  
  -- Reject if tick data is missing or too old (>60 seconds)
  IF data_freshness_ms IS NULL OR data_freshness_ms > 60000 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'No fresh tick data available', 
      'data_age_ms', data_freshness_ms, 
      'execution_path', 'rejected_stale_tick_data',
      'required_freshness_ms', 60000
    );
  END IF;
  
  data_source := 'tick_data';
  
  -- Calculate price deviation against REAL market price
  price_deviation := ABS(entry_price - current_market_price) / current_market_price * 100;
  
  -- Strict 0.1% deviation limit to prevent bad fills
  IF price_deviation > 0.1 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Price deviation too large', 
      'requested_price', entry_price, 
      'market_price', current_market_price, 
      'deviation_percent', price_deviation, 
      'execution_path', 'rejected_price_deviation',
      'max_deviation_percent', 0.1
    );
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
    master_signal_id, execution_path, trailing_stop_distance
  ) VALUES (
    p_portfolio_id, p_order_data->>'symbol', p_order_data->>'trade_type',
    lot_size_val, lot_size_val * instrument_record.contract_size, lot_size_val,
    actual_entry_price, actual_entry_price,
    (p_order_data->>'stop_loss')::NUMERIC, (p_order_data->>'take_profit')::NUMERIC,
    instrument_record.contract_size, required_margin, 
    COALESCE(p_order_data->>'order_type', 'market'),
    p_order_data->>'comment', (p_order_data->>'magic_number')::INTEGER, 'open',
    master_signal_id_val, 'advanced_fusion_real_prices',
    COALESCE((p_order_data->>'trailing_stop_distance')::NUMERIC, 0)
  ) RETURNING id INTO trade_id;
  
  IF use_global_account THEN
    UPDATE global_trading_account 
    SET 
      used_margin = used_margin + required_margin,
      free_margin = free_margin - required_margin,
      updated_at = now()
    WHERE id = p_portfolio_id;
  ELSE
    UPDATE shadow_portfolios 
    SET 
      used_margin = used_margin + required_margin,
      free_margin = free_margin - required_margin,
      updated_at = now()
    WHERE id = p_portfolio_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'trade_id', trade_id, 
    'execution_path', 'advanced_fusion_real_prices',
    'data_freshness_ms', data_freshness_ms,
    'data_source', data_source,
    'price_deviation_percent', price_deviation,
    'actual_entry_price', actual_entry_price,
    'market_price', current_market_price,
    'required_margin', required_margin,
    'spread_applied', spread,
    'validation', 'strict_tick_data_only'
  );
END;
$$;