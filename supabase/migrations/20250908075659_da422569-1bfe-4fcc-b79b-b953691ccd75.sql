-- Create enhanced trading edge function for advanced order management
CREATE OR REPLACE FUNCTION public.execute_advanced_order(
  p_portfolio_id UUID,
  p_order_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  portfolio_record shadow_portfolios%ROWTYPE;
  instrument_record trading_instruments%ROWTYPE;
  order_result JSONB;
  required_margin NUMERIC;
  available_margin NUMERIC;
  pip_value NUMERIC;
  spread NUMERIC;
  entry_price NUMERIC;
  actual_entry_price NUMERIC;
  trade_id UUID;
BEGIN
  -- Get portfolio details
  SELECT * INTO portfolio_record FROM shadow_portfolios WHERE id = p_portfolio_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Portfolio not found');
  END IF;
  
  -- Get instrument details
  SELECT * INTO instrument_record 
  FROM trading_instruments 
  WHERE symbol = (p_order_data->>'symbol');
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid trading instrument');
  END IF;
  
  -- Calculate required margin
  required_margin := (p_order_data->>'lot_size')::NUMERIC * 
                    instrument_record.contract_size * 
                    (p_order_data->>'entry_price')::NUMERIC * 
                    (instrument_record.margin_percentage / 100);
  
  -- Check available margin
  available_margin := portfolio_record.free_margin;
  
  IF required_margin > available_margin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient margin');
  END IF;
  
  -- Calculate spread and actual entry price
  spread := instrument_record.typical_spread * instrument_record.pip_size;
  entry_price := (p_order_data->>'entry_price')::NUMERIC;
  
  -- Adjust for spread based on trade type
  IF (p_order_data->>'trade_type') = 'buy' THEN
    actual_entry_price := entry_price + spread;
  ELSE
    actual_entry_price := entry_price - spread;
  END IF;
  
  -- Create trade record
  INSERT INTO shadow_trades (
    portfolio_id, symbol, trade_type, lot_size, entry_price,
    stop_loss, take_profit, contract_size, margin_required,
    order_type, comment, magic_number
  ) VALUES (
    p_portfolio_id,
    p_order_data->>'symbol',
    p_order_data->>'trade_type',
    (p_order_data->>'lot_size')::NUMERIC,
    actual_entry_price,
    COALESCE((p_order_data->>'stop_loss')::NUMERIC, 0),
    COALESCE((p_order_data->>'take_profit')::NUMERIC, 0),
    instrument_record.contract_size,
    required_margin,
    COALESCE(p_order_data->>'order_type', 'market'),
    COALESCE(p_order_data->>'comment', ''),
    COALESCE((p_order_data->>'magic_number')::INTEGER, 0)
  ) RETURNING id INTO trade_id;
  
  -- Update portfolio margins
  UPDATE shadow_portfolios 
  SET 
    used_margin = used_margin + required_margin,
    free_margin = free_margin - required_margin,
    margin_level = CASE 
      WHEN (used_margin + required_margin) > 0 
      THEN (equity / (used_margin + required_margin)) * 100 
      ELSE 0 
    END,
    updated_at = now()
  WHERE id = p_portfolio_id;
  
  -- Log trade execution
  INSERT INTO ea_logs (
    portfolio_id, trade_id, ea_name, log_level, message, symbol
  ) VALUES (
    p_portfolio_id, trade_id, 'Enhanced Trading Engine', 'INFO',
    'Trade executed successfully', p_order_data->>'symbol'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'trade_id', trade_id,
    'actual_entry_price', actual_entry_price,
    'required_margin', required_margin,
    'spread_applied', spread
  );
END;
$$;

-- Create function for advanced position sizing
CREATE OR REPLACE FUNCTION public.calculate_optimal_lot_size(
  p_portfolio_id UUID,
  p_symbol TEXT,
  p_risk_percentage NUMERIC,
  p_entry_price NUMERIC,
  p_stop_loss NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  portfolio_record shadow_portfolios%ROWTYPE;
  instrument_record trading_instruments%ROWTYPE;
  risk_amount NUMERIC;
  pip_difference NUMERIC;
  pip_value NUMERIC;
  optimal_lot_size NUMERIC;
  max_lot_size NUMERIC;
  min_lot_size NUMERIC;
BEGIN
  -- Get portfolio and instrument data
  SELECT * INTO portfolio_record FROM shadow_portfolios WHERE id = p_portfolio_id;
  SELECT * INTO instrument_record FROM trading_instruments WHERE symbol = p_symbol;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid data');
  END IF;
  
  -- Calculate risk amount
  risk_amount := portfolio_record.balance * (p_risk_percentage / 100);
  
  -- Calculate pip difference
  pip_difference := ABS(p_entry_price - p_stop_loss) / instrument_record.pip_size;
  
  -- Calculate pip value per lot
  pip_value := instrument_record.contract_size * instrument_record.pip_size;
  
  -- Calculate optimal lot size
  optimal_lot_size := risk_amount / (pip_difference * pip_value);
  
  -- Apply min/max constraints
  optimal_lot_size := GREATEST(optimal_lot_size, instrument_record.min_lot_size);
  optimal_lot_size := LEAST(optimal_lot_size, instrument_record.max_lot_size);
  
  -- Round to lot step
  optimal_lot_size := ROUND(optimal_lot_size / instrument_record.lot_step) * instrument_record.lot_step;
  
  RETURN jsonb_build_object(
    'success', true,
    'optimal_lot_size', optimal_lot_size,
    'risk_amount', risk_amount,
    'pip_difference', pip_difference,
    'pip_value', pip_value
  );
END;
$$;

-- Create function for trailing stop management
CREATE OR REPLACE FUNCTION public.update_trailing_stops()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  trade_record shadow_trades%ROWTYPE;
  new_stop_loss NUMERIC;
  current_price NUMERIC;
BEGIN
  -- Process all open trades with trailing stops
  FOR trade_record IN 
    SELECT * FROM shadow_trades 
    WHERE status = 'open' 
    AND trailing_stop_distance > 0
  LOOP
    -- Get current market price (simplified - would come from market data)
    SELECT COALESCE(
      (SELECT close_price FROM market_data_enhanced 
       WHERE symbol = trade_record.symbol 
       ORDER BY timestamp DESC LIMIT 1), 
      trade_record.entry_price
    ) INTO current_price;
    
    -- Calculate new trailing stop
    IF trade_record.trade_type = 'buy' THEN
      new_stop_loss := current_price - (trade_record.trailing_stop_distance * 0.0001);
      
      -- Only move stop loss up for buy trades
      IF new_stop_loss > trade_record.stop_loss THEN
        UPDATE shadow_trades 
        SET 
          stop_loss = new_stop_loss,
          trailing_stop_triggered = true,
          updated_at = now()
        WHERE id = trade_record.id;
      END IF;
    ELSE
      new_stop_loss := current_price + (trade_record.trailing_stop_distance * 0.0001);
      
      -- Only move stop loss down for sell trades
      IF new_stop_loss < trade_record.stop_loss THEN
        UPDATE shadow_trades 
        SET 
          stop_loss = new_stop_loss,
          trailing_stop_triggered = true,
          updated_at = now()
        WHERE id = trade_record.id;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Create function for break-even management
CREATE OR REPLACE FUNCTION public.manage_break_even()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  trade_record shadow_trades%ROWTYPE;
  current_price NUMERIC;
  profit_pips NUMERIC;
BEGIN
  -- Process all open trades that haven't triggered break-even yet
  FOR trade_record IN 
    SELECT * FROM shadow_trades 
    WHERE status = 'open' 
    AND break_even_triggered = false
  LOOP
    -- Get current market price
    SELECT COALESCE(
      (SELECT close_price FROM market_data_enhanced 
       WHERE symbol = trade_record.symbol 
       ORDER BY timestamp DESC LIMIT 1), 
      trade_record.entry_price
    ) INTO current_price;
    
    -- Calculate profit in pips
    IF trade_record.trade_type = 'buy' THEN
      profit_pips := (current_price - trade_record.entry_price) * 10000;
    ELSE
      profit_pips := (trade_record.entry_price - current_price) * 10000;
    END IF;
    
    -- Trigger break-even if profit >= 20 pips
    IF profit_pips >= 20 THEN
      UPDATE shadow_trades 
      SET 
        stop_loss = trade_record.entry_price,
        break_even_triggered = true,
        updated_at = now()
      WHERE id = trade_record.id;
      
      -- Log break-even trigger
      INSERT INTO ea_logs (
        portfolio_id, trade_id, ea_name, log_level, message, symbol
      ) VALUES (
        trade_record.portfolio_id, trade_record.id, 
        'Break Even Manager', 'INFO',
        'Break-even triggered at ' || profit_pips || ' pips profit',
        trade_record.symbol
      );
    END IF;
  END LOOP;
END;
$$;