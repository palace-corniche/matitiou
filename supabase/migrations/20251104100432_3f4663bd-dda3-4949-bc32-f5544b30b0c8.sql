-- Add position_size to execute_advanced_order INSERT
CREATE OR REPLACE FUNCTION public.execute_advanced_order(p_portfolio_id uuid, p_order_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
  v_balance DECIMAL;
  v_leverage INTEGER;
BEGIN
  v_symbol := p_order_data->>'symbol';
  v_trade_type := p_order_data->>'trade_type';
  v_lot_size := (p_order_data->>'lot_size')::DECIMAL;
  v_stop_loss := (p_order_data->>'stop_loss')::DECIMAL;
  v_take_profit := (p_order_data->>'take_profit')::DECIMAL;

  IF p_portfolio_id = '00000000-0000-0000-0000-000000000001' THEN
    SELECT id, balance, equity, leverage, max_open_positions
    INTO v_portfolio
    FROM global_trading_account WHERE id = p_portfolio_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Global trading account not found');
    END IF;
    v_balance := v_portfolio.balance;
    v_leverage := v_portfolio.leverage;
  ELSE
    SELECT * INTO v_portfolio FROM shadow_portfolios WHERE id = p_portfolio_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Portfolio not found');
    END IF;
    v_balance := v_portfolio.balance;
    v_leverage := v_portfolio.leverage;
  END IF;

  SELECT bid, ask, spread INTO v_tick FROM tick_data WHERE symbol = v_symbol ORDER BY timestamp DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tick data available');
  END IF;

  IF v_trade_type = 'buy' THEN
    v_entry_price := v_tick.ask;
  ELSE
    v_entry_price := v_tick.bid;
  END IF;
  
  v_margin_required := v_lot_size * 100000 * v_entry_price / v_leverage;
  
  IF v_balance < v_margin_required THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient margin');
  END IF;

  INSERT INTO shadow_trades (
    portfolio_id, symbol, trade_type, lot_size, position_size,
    entry_price, current_price, stop_loss, take_profit,
    entry_time, status, margin_required,
    master_signal_id, comment, trailing_stop_distance,
    remaining_lot_size, original_lot_size
  ) VALUES (
    p_portfolio_id, v_symbol, v_trade_type, v_lot_size, v_lot_size,
    v_entry_price, v_entry_price, v_stop_loss, v_take_profit,
    NOW(), 'open', v_margin_required,
    (p_order_data->>'master_signal_id')::UUID,
    p_order_data->>'comment',
    COALESCE((p_order_data->>'trailing_stop_distance')::DECIMAL, 0),
    v_lot_size, v_lot_size
  ) RETURNING id INTO v_new_trade_id;

  IF p_portfolio_id = '00000000-0000-0000-0000-000000000001' THEN
    UPDATE global_trading_account
    SET used_margin = used_margin + v_margin_required, equity = balance
    WHERE id = p_portfolio_id;
  ELSE
    UPDATE shadow_portfolios
    SET used_margin = used_margin + v_margin_required, equity = balance
    WHERE id = p_portfolio_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'trade_id', v_new_trade_id, 'entry_price', v_entry_price);
END;
$function$;