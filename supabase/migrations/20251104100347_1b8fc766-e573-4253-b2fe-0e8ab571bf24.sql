-- Fix execute_advanced_order to use correct shadow_trades column names
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
  v_result JSONB;
  v_balance DECIMAL;
  v_leverage INTEGER;
BEGIN
  -- Extract order parameters
  v_symbol := p_order_data->>'symbol';
  v_trade_type := p_order_data->>'trade_type';
  v_lot_size := (p_order_data->>'lot_size')::DECIMAL;
  v_stop_loss := (p_order_data->>'stop_loss')::DECIMAL;
  v_take_profit := (p_order_data->>'take_profit')::DECIMAL;

  -- Get portfolio/account data based on whether it's global account or regular portfolio
  IF p_portfolio_id = '00000000-0000-0000-0000-000000000001' THEN
    -- Global trading account
    SELECT 
      id,
      balance,
      equity,
      leverage,
      max_open_positions
    INTO v_portfolio
    FROM global_trading_account 
    WHERE id = p_portfolio_id;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Global trading account not found'
      );
    END IF;
    
    v_balance := v_portfolio.balance;
    v_leverage := v_portfolio.leverage;
  ELSE
    -- Regular shadow portfolio
    SELECT * INTO v_portfolio 
    FROM shadow_portfolios 
    WHERE id = p_portfolio_id;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Portfolio not found'
      );
    END IF;
    
    v_balance := v_portfolio.balance;
    v_leverage := v_portfolio.leverage;
  END IF;

  -- Get latest tick data
  SELECT bid, ask, spread INTO v_tick
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
    v_entry_price := v_tick.ask;  -- BUY at ASK
  ELSE
    v_entry_price := v_tick.bid;  -- SELL at BID
  END IF;
  
  -- Calculate margin
  v_margin_required := v_lot_size * 100000 * v_entry_price / v_leverage;
  
  -- Check margin
  IF v_balance < v_margin_required THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient margin'
    );
  END IF;

  -- Create trade with ONLY columns that exist in shadow_trades
  INSERT INTO shadow_trades (
    portfolio_id, symbol, trade_type, lot_size,
    entry_price, current_price, stop_loss, take_profit,
    entry_time, status, margin_required,
    master_signal_id, comment, trailing_stop_distance,
    remaining_lot_size, original_lot_size
  ) VALUES (
    p_portfolio_id, v_symbol, v_trade_type, v_lot_size,
    v_entry_price, v_entry_price, v_stop_loss, v_take_profit,
    NOW(), 'open', v_margin_required,
    (p_order_data->>'master_signal_id')::UUID,
    p_order_data->>'comment',
    COALESCE((p_order_data->>'trailing_stop_distance')::DECIMAL, 0),
    v_lot_size, v_lot_size
  ) RETURNING id INTO v_new_trade_id;

  -- Update portfolio/account
  IF p_portfolio_id = '00000000-0000-0000-0000-000000000001' THEN
    -- Update global trading account
    UPDATE global_trading_account
    SET used_margin = used_margin + v_margin_required,
        equity = balance
    WHERE id = p_portfolio_id;
  ELSE
    -- Update shadow portfolio
    UPDATE shadow_portfolios
    SET used_margin = used_margin + v_margin_required,
        equity = balance
    WHERE id = p_portfolio_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'trade_id', v_new_trade_id,
    'entry_price', v_entry_price,
    'execution_method', 'tick_data_bid_ask'
  );
END;
$function$;