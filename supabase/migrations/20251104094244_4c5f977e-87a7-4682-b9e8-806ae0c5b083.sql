-- ============================================
-- CRITICAL FIX: Remove is_active column from execute_advanced_order
-- ============================================
-- The shadow_portfolios table does not have an is_active column
-- This was causing all trade executions to fail with "column is_active does not exist" error

-- Fix JSONB version of execute_advanced_order
CREATE OR REPLACE FUNCTION execute_advanced_order(
  p_portfolio_id UUID,
  p_order_data JSONB
) RETURNS JSONB AS $$
DECLARE
  v_portfolio RECORD;
  v_tick RECORD;
  v_symbol TEXT;
  v_trade_type TEXT;
  v_lot_size DECIMAL;
  v_stop_loss DECIMAL;
  v_take_profit DECIMAL;
  v_entry_price DECIMAL;
  v_margin_required DECIMAL;
  v_new_trade_id UUID;
  v_result JSONB;
BEGIN
  -- Extract order parameters
  v_symbol := p_order_data->>'symbol';
  v_trade_type := p_order_data->>'trade_type';
  v_lot_size := (p_order_data->>'lot_size')::DECIMAL;
  v_stop_loss := (p_order_data->>'stop_loss')::DECIMAL;
  v_take_profit := (p_order_data->>'take_profit')::DECIMAL;

  -- Get portfolio (REMOVED is_active = true check)
  SELECT * INTO v_portfolio 
  FROM shadow_portfolios 
  WHERE id = p_portfolio_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Portfolio not found'
    );
  END IF;

  -- Get latest tick data for REAL bid/ask prices
  SELECT bid_price, ask_price, spread INTO v_tick
  FROM tick_data
  WHERE symbol = v_symbol
  ORDER BY timestamp DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No tick data available'
    );
  END IF;

  -- Use real bid/ask from tick_data
  IF v_trade_type = 'buy' THEN
    v_entry_price := v_tick.ask_price;  -- BUY at ASK
  ELSE
    v_entry_price := v_tick.bid_price;  -- SELL at BID
  END IF;
  
  -- Calculate margin
  v_margin_required := v_lot_size * 100000 * v_entry_price / v_portfolio.leverage;
  
  -- Check margin
  IF v_portfolio.balance < v_margin_required THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient margin'
    );
  END IF;

  -- Create trade with CORRECT entry price
  INSERT INTO shadow_trades (
    portfolio_id, symbol, trade_type, lot_size,
    entry_price, current_price, stop_loss, take_profit,
    entry_time, status, spread_at_entry, margin_used,
    master_signal_id
  ) VALUES (
    p_portfolio_id, v_symbol, v_trade_type, v_lot_size,
    v_entry_price, v_entry_price, v_stop_loss, v_take_profit,
    NOW(), 'open', v_tick.spread, v_margin_required,
    (p_order_data->>'master_signal_id')::UUID
  ) RETURNING id INTO v_new_trade_id;

  -- Update portfolio
  UPDATE shadow_portfolios
  SET used_margin = used_margin + v_margin_required,
      equity = balance
  WHERE id = p_portfolio_id;

  RETURN jsonb_build_object(
    'success', true,
    'trade_id', v_new_trade_id,
    'entry_price', v_entry_price,
    'execution_method', 'tick_data_bid_ask'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 10-parameter version of execute_advanced_order
CREATE OR REPLACE FUNCTION execute_advanced_order(
  p_portfolio_id UUID,
  p_symbol TEXT,
  p_order_type TEXT,
  p_trade_type TEXT,
  p_lot_size NUMERIC,
  p_entry_price NUMERIC DEFAULT NULL,
  p_stop_loss NUMERIC DEFAULT NULL,
  p_take_profit NUMERIC DEFAULT NULL,
  p_comment TEXT DEFAULT NULL,
  p_magic_number INTEGER DEFAULT NULL,
  p_signal_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_portfolio RECORD;
  v_tick RECORD;
  v_entry_price DECIMAL;
  v_margin_required DECIMAL;
  v_new_trade_id UUID;
BEGIN
  -- Get portfolio (REMOVED is_active = true check)
  SELECT * INTO v_portfolio 
  FROM shadow_portfolios 
  WHERE id = p_portfolio_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Portfolio not found');
  END IF;

  -- Get latest tick data
  SELECT bid_price, ask_price, spread INTO v_tick
  FROM tick_data
  WHERE symbol = p_symbol
  ORDER BY timestamp DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tick data available');
  END IF;

  -- Use real bid/ask
  IF p_trade_type = 'buy' THEN
    v_entry_price := v_tick.ask_price;
  ELSE
    v_entry_price := v_tick.bid_price;
  END IF;
  
  -- Calculate margin
  v_margin_required := p_lot_size * 100000 * v_entry_price / v_portfolio.leverage;
  
  IF v_portfolio.balance < v_margin_required THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient margin');
  END IF;

  -- Create trade
  INSERT INTO shadow_trades (
    portfolio_id, symbol, trade_type, lot_size,
    entry_price, current_price, stop_loss, take_profit,
    entry_time, status, spread_at_entry, margin_used,
    master_signal_id, comment
  ) VALUES (
    p_portfolio_id, p_symbol, p_trade_type, p_lot_size,
    v_entry_price, v_entry_price, p_stop_loss, p_take_profit,
    NOW(), 'open', v_tick.spread, v_margin_required,
    p_signal_id, p_comment
  ) RETURNING id INTO v_new_trade_id;

  -- Update portfolio
  UPDATE shadow_portfolios
  SET used_margin = used_margin + v_margin_required
  WHERE id = p_portfolio_id;

  RETURN jsonb_build_object(
    'success', true,
    'trade_id', v_new_trade_id,
    'entry_price', v_entry_price,
    'execution_method', 'tick_data_bid_ask'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;