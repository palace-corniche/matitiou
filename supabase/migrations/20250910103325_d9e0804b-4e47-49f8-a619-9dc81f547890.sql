-- Fix the update_eurusd_pnl function to properly handle EUR/USD PnL calculations
CREATE OR REPLACE FUNCTION public.update_eurusd_pnl()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  trade_record shadow_trades%ROWTYPE;
  current_bid NUMERIC;
  current_ask NUMERIC;
  current_price NUMERIC;
  pip_difference NUMERIC;
  pip_value_calc NUMERIC;
  pnl_calc NUMERIC;
  portfolio_ids UUID[];
BEGIN
  -- Get latest EUR/USD tick
  SELECT bid, ask INTO current_bid, current_ask
  FROM tick_data 
  WHERE symbol = 'EUR/USD' 
  ORDER BY timestamp DESC 
  LIMIT 1;
  
  IF current_bid IS NULL THEN
    -- Use fallback price if no tick data
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
      current_price := current_bid;  -- Use bid for closing long position
    ELSE
      current_price := current_ask;  -- Use ask for closing short position
    END IF;
    
    -- Calculate pip difference
    IF trade_record.trade_type = 'buy' THEN
      pip_difference := (current_price - trade_record.entry_price) / 0.0001;
    ELSE
      pip_difference := (trade_record.entry_price - current_price) / 0.0001;
    END IF;
    
    -- Calculate pip value (1 pip = $10 for 1 lot EUR/USD)
    pip_value_calc := trade_record.lot_size * 10;
    
    -- Calculate P&L in USD
    pnl_calc := pip_difference * pip_value_calc;
    
    -- Update trade with real-time P&L
    UPDATE shadow_trades 
    SET 
      current_price = current_price,
      unrealized_pnl = pnl_calc,
      profit_pips = pip_difference,
      pip_value = pip_value_calc,
      updated_at = now()
    WHERE id = trade_record.id;
    
    -- Check for SL/TP hits
    IF (trade_record.trade_type = 'buy' AND current_price <= trade_record.stop_loss AND trade_record.stop_loss > 0) OR
       (trade_record.trade_type = 'sell' AND current_price >= trade_record.stop_loss AND trade_record.stop_loss > 0) THEN
      
      -- Close at stop loss
      PERFORM close_shadow_trade(
        trade_record.id,
        current_price,
        trade_record.lot_size,
        'stop_loss'
      );
      
    ELSIF (trade_record.trade_type = 'buy' AND current_price >= trade_record.take_profit AND trade_record.take_profit > 0) OR
          (trade_record.trade_type = 'sell' AND current_price <= trade_record.take_profit AND trade_record.take_profit > 0) THEN
      
      -- Close at take profit
      PERFORM close_shadow_trade(
        trade_record.id,
        current_price,
        trade_record.lot_size,
        'take_profit'
      );
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
END;
$function$;