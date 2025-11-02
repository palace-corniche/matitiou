-- ============================================
-- CRITICAL FIX: Entry Price Correction
-- ============================================
-- Drop and recreate execute_advanced_order with correct bid/ask logic
-- BUY orders MUST use ASK price, SELL orders MUST use BID price

DROP FUNCTION IF EXISTS execute_advanced_order(UUID, TEXT, DECIMAL, TEXT, DECIMAL, DECIMAL);

CREATE OR REPLACE FUNCTION execute_advanced_order(
  p_portfolio_id UUID,
  p_symbol TEXT,
  p_lot_size DECIMAL,
  p_trade_type TEXT,
  p_stop_loss DECIMAL DEFAULT NULL,
  p_take_profit DECIMAL DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_account RECORD;
  v_tick RECORD;
  v_entry_price DECIMAL;
  v_margin_required DECIMAL;
  v_new_trade_id UUID;
  v_result JSON;
  v_spread DECIMAL;
  v_actual_entry DECIMAL;
BEGIN
  -- Get portfolio account
  SELECT * INTO v_account 
  FROM shadow_portfolios 
  WHERE id = p_portfolio_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Portfolio not found or inactive'
    );
  END IF;

  -- Get latest tick data for real bid/ask prices
  SELECT bid_price, ask_price, spread INTO v_tick
  FROM tick_data
  WHERE symbol = p_symbol
  ORDER BY timestamp DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No tick data available for symbol'
    );
  END IF;

  -- ✅ CRITICAL FIX: Use real bid/ask from tick_data
  -- BUY orders fill at ASK (higher price)
  -- SELL orders fill at BID (lower price)
  IF p_trade_type = 'buy' THEN
    v_actual_entry := v_tick.ask_price;  -- Use ASK for buys
  ELSE
    v_actual_entry := v_tick.bid_price;  -- Use BID for sells
  END IF;
  
  v_spread := v_tick.spread;
  
  -- Calculate margin (standard forex: 100,000 units per lot)
  v_margin_required := p_lot_size * 100000 * v_actual_entry / v_account.leverage;
  
  -- Check if sufficient margin
  IF v_account.balance < v_margin_required THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient margin',
      'required', v_margin_required,
      'available', v_account.balance
    );
  END IF;

  -- Create trade with CORRECT entry price
  INSERT INTO shadow_trades (
    portfolio_id,
    symbol,
    trade_type,
    lot_size,
    entry_price,     -- Real bid/ask price
    current_price,
    stop_loss,
    take_profit,
    entry_time,
    status,
    spread_at_entry,
    margin_used
  ) VALUES (
    p_portfolio_id,
    p_symbol,
    p_trade_type,
    p_lot_size,
    v_actual_entry,   -- ✅ CORRECT PRICE
    v_actual_entry,
    p_stop_loss,
    p_take_profit,
    NOW(),
    'open',
    v_spread,
    v_margin_required
  ) RETURNING id INTO v_new_trade_id;

  -- Update portfolio margin
  UPDATE shadow_portfolios
  SET used_margin = used_margin + v_margin_required,
      equity = balance + COALESCE((
        SELECT SUM(pnl) 
        FROM shadow_trades 
        WHERE portfolio_id = p_portfolio_id AND status = 'open'
      ), 0)
  WHERE id = p_portfolio_id;

  v_result := json_build_object(
    'success', true,
    'trade_id', v_new_trade_id,
    'entry_price', v_actual_entry,
    'spread', v_spread,
    'margin_used', v_margin_required,
    'execution_method', 'tick_data_bid_ask'
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;