-- ============================================
-- CRITICAL FIX: Fix THIRD version of execute_advanced_order
-- ============================================
-- This version takes 10 parameters and also needs the bid/ask fix

DROP FUNCTION IF EXISTS execute_advanced_order(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, INTEGER, UUID);

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
  -- Get portfolio
  SELECT * INTO v_portfolio 
  FROM shadow_portfolios 
  WHERE id = p_portfolio_id AND is_active = true;
  
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

  -- ✅ CRITICAL FIX: Use real bid/ask
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