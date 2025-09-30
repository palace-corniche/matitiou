-- Fix execute_advanced_order to prevent null position_size errors
CREATE OR REPLACE FUNCTION public.execute_advanced_order(p_portfolio_id uuid, p_order_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  lot_size_val NUMERIC;
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
  
  -- Extract lot size
  lot_size_val := (p_order_data->>'lot_size')::NUMERIC;
  
  -- Calculate required margin
  required_margin := lot_size_val * 
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
  
  -- Create trade record with REQUIRED FIELDS
  INSERT INTO shadow_trades (
    portfolio_id, symbol, trade_type, lot_size, position_size, remaining_lot_size,
    entry_price, current_price, stop_loss, take_profit, contract_size, 
    margin_required, order_type, comment, magic_number, status
  ) VALUES (
    p_portfolio_id,
    p_order_data->>'symbol',
    p_order_data->>'trade_type',
    lot_size_val,
    lot_size_val,  -- position_size = lot_size
    lot_size_val,  -- remaining_lot_size = lot_size
    actual_entry_price,
    actual_entry_price,  -- current_price = actual_entry_price initially
    COALESCE((p_order_data->>'stop_loss')::NUMERIC, 0),
    COALESCE((p_order_data->>'take_profit')::NUMERIC, 0),
    instrument_record.contract_size,
    required_margin,
    COALESCE(p_order_data->>'order_type', 'market'),
    COALESCE(p_order_data->>'comment', ''),
    COALESCE((p_order_data->>'magic_number')::INTEGER, 0),
    'open'  -- explicit status
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
$function$;