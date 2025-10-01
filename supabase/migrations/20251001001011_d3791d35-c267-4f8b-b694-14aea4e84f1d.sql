-- ============================================================================
-- PHASE 5: FIX TRADE HISTORY, PRICE PIPELINE, AND EXIT LOGIC
-- ============================================================================

-- 1. Fix ea_logs constraint to accept valid log levels
ALTER TABLE public.ea_logs DROP CONSTRAINT IF EXISTS ea_logs_log_level_check;
ALTER TABLE public.ea_logs ADD CONSTRAINT ea_logs_log_level_check 
  CHECK (log_level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'));

-- 2. Update update_eurusd_pnl to use market_data_feed instead of tick_data
CREATE OR REPLACE FUNCTION public.update_eurusd_pnl()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  trade_record shadow_trades%ROWTYPE;
  current_bid NUMERIC;
  current_ask NUMERIC;
  cur_price NUMERIC;
  pip_difference NUMERIC;
  pip_value_calc NUMERIC;
  pnl_calc NUMERIC;
  portfolio_ids UUID[];
BEGIN
  -- Get latest EUR/USD price from market_data_feed (not tick_data)
  SELECT price, price INTO current_bid, current_ask
  FROM market_data_feed 
  WHERE symbol = 'EUR/USD' 
  ORDER BY timestamp DESC 
  LIMIT 1;
  
  -- Add small spread simulation
  IF current_bid IS NOT NULL THEN
    current_ask := current_bid + 0.00015; -- 1.5 pip spread
  ELSE
    -- Fallback if no data
    current_bid := 1.17065;
    current_ask := 1.17080;
  END IF;
  
  -- Process each open EUR/USD trade
  FOR trade_record IN 
    SELECT * FROM shadow_trades 
    WHERE status = 'open' AND symbol = 'EUR/USD'
  LOOP
    -- Use appropriate price for P&L calculation
    IF trade_record.trade_type = 'buy' THEN
      cur_price := current_bid;
    ELSE
      cur_price := current_ask;
    END IF;
    
    -- Calculate pip difference
    IF trade_record.trade_type = 'buy' THEN
      pip_difference := (cur_price - trade_record.entry_price) / 0.0001;
    ELSE
      pip_difference := (trade_record.entry_price - cur_price) / 0.0001;
    END IF;
    
    -- Calculate pip value (1 pip = $10 for 1 lot EUR/USD)
    pip_value_calc := trade_record.lot_size * 10;
    
    -- Calculate P&L in USD
    pnl_calc := pip_difference * pip_value_calc;
    
    -- Update trade with real-time P&L
    UPDATE shadow_trades 
    SET 
      current_price = cur_price,
      unrealized_pnl = pnl_calc,
      profit_pips = pip_difference,
      pip_value = pip_value_calc,
      updated_at = now()
    WHERE id = trade_record.id;
    
    -- Check for SL/TP hits
    IF (trade_record.trade_type = 'buy' AND cur_price <= trade_record.stop_loss AND trade_record.stop_loss > 0) OR
       (trade_record.trade_type = 'sell' AND cur_price >= trade_record.stop_loss AND trade_record.stop_loss > 0) THEN
      
      PERFORM close_shadow_trade(trade_record.id, cur_price, trade_record.lot_size, 'stop_loss');
      
    ELSIF (trade_record.trade_type = 'buy' AND cur_price >= trade_record.take_profit AND trade_record.take_profit > 0) OR
          (trade_record.trade_type = 'sell' AND cur_price <= trade_record.take_profit AND trade_record.take_profit > 0) THEN
      
      PERFORM close_shadow_trade(trade_record.id, cur_price, trade_record.lot_size, 'take_profit');
    
    -- NEW: Intelligent profit protection
    ELSIF pnl_calc >= 200 THEN
      -- Close trade if profit >= $200 (20 pips for 1 lot)
      PERFORM close_shadow_trade(trade_record.id, cur_price, trade_record.lot_size, 'profit_protection');
    
    -- NEW: Time-based exit after 24 hours
    ELSIF trade_record.entry_time < now() - interval '24 hours' THEN
      PERFORM close_shadow_trade(trade_record.id, cur_price, trade_record.lot_size, 'time_exit');
    END IF;
  END LOOP;
  
  -- Get all portfolio IDs with open trades
  SELECT array_agg(DISTINCT portfolio_id) INTO portfolio_ids
  FROM shadow_trades 
  WHERE status = 'open';
  
  -- Update portfolio equity based on floating P&L
  IF portfolio_ids IS NOT NULL THEN
    UPDATE shadow_portfolios 
    SET 
      floating_pnl = COALESCE((
        SELECT SUM(unrealized_pnl) 
        FROM shadow_trades 
        WHERE portfolio_id = shadow_portfolios.id AND status = 'open'
      ), 0),
      equity = balance + COALESCE((
        SELECT SUM(unrealized_pnl) 
        FROM shadow_trades 
        WHERE portfolio_id = shadow_portfolios.id AND status = 'open'
      ), 0),
      updated_at = now()
    WHERE id = ANY(portfolio_ids);
  END IF;
  
  -- Update global trading account
  UPDATE global_trading_account
  SET
    floating_pnl = COALESCE((SELECT SUM(unrealized_pnl) FROM shadow_trades WHERE status = 'open'), 0),
    equity = balance + COALESCE((SELECT SUM(unrealized_pnl) FROM shadow_trades WHERE status = 'open'), 0),
    used_margin = COALESCE((SELECT SUM(margin_required) FROM shadow_trades WHERE status = 'open'), 0),
    free_margin = balance - COALESCE((SELECT SUM(margin_required) FROM shadow_trades WHERE status = 'open'), 0),
    margin_level = CASE 
      WHEN COALESCE((SELECT SUM(margin_required) FROM shadow_trades WHERE status = 'open'), 0) > 0 
      THEN ((balance + COALESCE((SELECT SUM(unrealized_pnl) FROM shadow_trades WHERE status = 'open'), 0)) / 
            COALESCE((SELECT SUM(margin_required) FROM shadow_trades WHERE status = 'open'), 0)) * 100
      ELSE 0 
    END,
    updated_at = now()
  WHERE id = '00000000-0000-0000-0000-000000000001';
END;
$function$;

-- 3. Fix close_shadow_trade to properly create trade_history records
CREATE OR REPLACE FUNCTION public.close_shadow_trade(
    p_trade_id uuid, 
    p_close_price numeric, 
    p_close_lot_size numeric DEFAULT NULL::numeric, 
    p_close_reason text DEFAULT 'manual'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    trade_record shadow_trades%ROWTYPE;
    portfolio_record shadow_portfolios%ROWTYPE;
    global_account_record global_trading_account%ROWTYPE;
    close_lot_size NUMERIC;
    pip_difference NUMERIC;
    pip_value_calc NUMERIC;
    profit_amount NUMERIC;
    commission_amount NUMERIC;
    swap_amount NUMERIC;
    net_profit NUMERIC;
    is_partial_close BOOLEAN;
    result JSON;
    balance_before NUMERIC;
    equity_before NUMERIC;
BEGIN
    -- Get trade details
    SELECT * INTO trade_record FROM shadow_trades WHERE id = p_trade_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trade not found';
    END IF;
    
    -- Get account details (portfolio or global)
    IF trade_record.portfolio_id IS NOT NULL THEN
        SELECT * INTO portfolio_record FROM shadow_portfolios WHERE id = trade_record.portfolio_id;
        balance_before := portfolio_record.balance;
        equity_before := portfolio_record.equity;
    ELSE
        SELECT * INTO global_account_record FROM global_trading_account WHERE id = '00000000-0000-0000-0000-000000000001';
        balance_before := global_account_record.balance;
        equity_before := global_account_record.equity;
    END IF;
    
    -- Determine close lot size
    close_lot_size := COALESCE(p_close_lot_size, trade_record.remaining_lot_size);
    is_partial_close := close_lot_size < trade_record.remaining_lot_size;
    
    -- Calculate profit using correct pip calculation
    IF trade_record.trade_type = 'buy' THEN
        pip_difference := (p_close_price - trade_record.entry_price) / 0.0001;
    ELSE
        pip_difference := (trade_record.entry_price - p_close_price) / 0.0001;
    END IF;
    
    pip_value_calc := close_lot_size * 10;
    profit_amount := pip_difference * pip_value_calc;
    
    -- Calculate commission and swap
    commission_amount := close_lot_size * 0.5;
    swap_amount := 0;
    
    net_profit := profit_amount - commission_amount - swap_amount;
    
    -- Update account balance and stats
    IF trade_record.portfolio_id IS NOT NULL THEN
        UPDATE shadow_portfolios 
        SET 
            balance = balance + net_profit,
            equity = equity + net_profit,
            total_trades = CASE WHEN NOT is_partial_close THEN total_trades + 1 ELSE total_trades END,
            winning_trades = CASE WHEN net_profit > 0 AND NOT is_partial_close THEN winning_trades + 1 ELSE winning_trades END,
            losing_trades = CASE WHEN net_profit <= 0 AND NOT is_partial_close THEN losing_trades + 1 ELSE losing_trades END,
            updated_at = now()
        WHERE id = trade_record.portfolio_id;
    ELSE
        UPDATE global_trading_account
        SET
            balance = balance + net_profit,
            equity = equity + net_profit,
            total_trades = CASE WHEN NOT is_partial_close THEN total_trades + 1 ELSE total_trades END,
            winning_trades = CASE WHEN net_profit > 0 AND NOT is_partial_close THEN winning_trades + 1 ELSE winning_trades END,
            losing_trades = CASE WHEN net_profit <= 0 AND NOT is_partial_close THEN losing_trades + 1 ELSE losing_trades END,
            win_rate = CASE 
                WHEN (total_trades + 1) > 0 
                THEN (CASE WHEN net_profit > 0 THEN winning_trades + 1 ELSE winning_trades END)::NUMERIC / (total_trades + 1)::NUMERIC * 100
                ELSE 0 
            END,
            updated_at = now()
        WHERE id = '00000000-0000-0000-0000-000000000001';
    END IF;
    
    -- CRITICAL: Insert trade history record with proper portfolio_id handling
    INSERT INTO trade_history (
        portfolio_id, original_trade_id, action_type, symbol, trade_type,
        lot_size, execution_price, profit, profit_pips, commission, swap,
        balance_before, balance_after, equity_before, equity_after,
        execution_time
    ) VALUES (
        COALESCE(trade_record.portfolio_id, '00000000-0000-0000-0000-000000000001'),
        p_trade_id, 
        CASE WHEN is_partial_close THEN 'partial_close' ELSE 'close' END,
        trade_record.symbol, 
        trade_record.trade_type, 
        close_lot_size, 
        p_close_price,
        net_profit, 
        pip_difference, 
        commission_amount, 
        swap_amount,
        balance_before, 
        balance_before + net_profit,
        equity_before, 
        equity_before + net_profit,
        now()
    );
    
    -- Update or close the trade
    IF is_partial_close THEN
        UPDATE shadow_trades 
        SET 
            remaining_lot_size = remaining_lot_size - close_lot_size,
            partial_close_count = partial_close_count + 1,
            realized_pnl = realized_pnl + net_profit,
            updated_at = now()
        WHERE id = p_trade_id;
    ELSE
        UPDATE shadow_trades 
        SET 
            status = 'closed',
            exit_price = p_close_price,
            exit_time = now(),
            exit_reason = p_close_reason,
            pnl = net_profit,
            pnl_percent = (net_profit / (trade_record.entry_price * trade_record.lot_size * 100000)) * 100,
            profit = profit_amount,
            profit_pips = pip_difference,
            commission = commission_amount,
            swap = swap_amount,
            close_type = 'full',
            updated_at = now()
        WHERE id = p_trade_id;
    END IF;
    
    -- Return result
    result := json_build_object(
        'success', true,
        'trade_id', p_trade_id,
        'closed_lot_size', close_lot_size,
        'profit', net_profit,
        'profit_pips', pip_difference,
        'is_partial', is_partial_close,
        'new_balance', balance_before + net_profit,
        'close_reason', p_close_reason
    );
    
    RETURN result;
END;
$function$;

-- 4. Add entry price validation to execute_advanced_order
CREATE OR REPLACE FUNCTION public.execute_advanced_order(p_portfolio_id uuid, p_order_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  portfolio_record shadow_portfolios%ROWTYPE;
  global_account_record global_trading_account%ROWTYPE;
  instrument_record trading_instruments%ROWTYPE;
  order_result JSONB;
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
BEGIN
  -- Determine if using global account
  use_global_account := (p_portfolio_id = '00000000-0000-0000-0000-000000000001');
  
  -- Get account details
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
  
  -- Get instrument details
  SELECT * INTO instrument_record 
  FROM trading_instruments 
  WHERE symbol = (p_order_data->>'symbol');
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid trading instrument');
  END IF;
  
  lot_size_val := (p_order_data->>'lot_size')::NUMERIC;
  entry_price := (p_order_data->>'entry_price')::NUMERIC;
  
  -- NEW: Validate entry price against current market data
  SELECT price INTO current_market_price
  FROM market_data_feed
  WHERE symbol = (p_order_data->>'symbol')
  ORDER BY timestamp DESC
  LIMIT 1;
  
  IF current_market_price IS NOT NULL THEN
    price_deviation := ABS(entry_price - current_market_price) / current_market_price * 100;
    
    -- Reject if price is more than 0.5% away from current market
    IF price_deviation > 0.5 THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Entry price deviation too large',
        'requested_price', entry_price,
        'market_price', current_market_price,
        'deviation_percent', price_deviation
      );
    END IF;
  END IF;
  
  -- Calculate required margin
  required_margin := lot_size_val * 
                    instrument_record.contract_size * 
                    entry_price * 
                    (instrument_record.margin_percentage / 100);
  
  IF required_margin > available_margin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient margin');
  END IF;
  
  -- Calculate spread and actual entry price
  spread := instrument_record.typical_spread * instrument_record.pip_size;
  
  IF (p_order_data->>'trade_type') = 'buy' THEN
    actual_entry_price := entry_price + spread;
  ELSE
    actual_entry_price := entry_price - spread;
  END IF;
  
  -- Create trade record
  INSERT INTO shadow_trades (
    portfolio_id, symbol, trade_type, lot_size, position_size, remaining_lot_size,
    entry_price, current_price, stop_loss, take_profit, contract_size, 
    margin_required, order_type, comment, magic_number, status
  ) VALUES (
    p_portfolio_id,
    p_order_data->>'symbol',
    p_order_data->>'trade_type',
    lot_size_val,
    lot_size_val,
    lot_size_val,
    actual_entry_price,
    actual_entry_price,
    COALESCE((p_order_data->>'stop_loss')::NUMERIC, 0),
    COALESCE((p_order_data->>'take_profit')::NUMERIC, 0),
    instrument_record.contract_size,
    required_margin,
    COALESCE(p_order_data->>'order_type', 'market'),
    COALESCE(p_order_data->>'comment', ''),
    COALESCE((p_order_data->>'magic_number')::INTEGER, 0),
    'open'
  ) RETURNING id INTO trade_id;
  
  -- Update account margins
  IF use_global_account THEN
    UPDATE global_trading_account
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
  ELSE
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
  END IF;
  
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
    'spread_applied', spread,
    'market_price', current_market_price
  );
END;
$function$;

COMMENT ON FUNCTION public.update_eurusd_pnl() IS 'Updated to use market_data_feed and includes profit protection and time-based exits';
COMMENT ON FUNCTION public.close_shadow_trade(uuid, numeric, numeric, text) IS 'Fixed to properly create trade_history records with correct portfolio_id handling';
COMMENT ON FUNCTION public.execute_advanced_order(uuid, jsonb) IS 'Added entry price validation against current market data';