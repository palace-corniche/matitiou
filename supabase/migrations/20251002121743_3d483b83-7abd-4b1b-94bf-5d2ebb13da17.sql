-- Fix trade closing logic with realistic parameters (24-hour exit + $20-50 profit targets)

CREATE OR REPLACE FUNCTION update_eurusd_pnl()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trade_record RECORD;
  current_price NUMERIC;
  pip_difference NUMERIC;
  pip_value NUMERIC;
  unrealized_pnl NUMERIC;
  should_close BOOLEAN;
  close_reason TEXT;
BEGIN
  -- Get latest EUR/USD price from market data
  SELECT price INTO current_price
  FROM market_data_feed
  WHERE symbol = 'EUR/USD'
  ORDER BY timestamp DESC
  LIMIT 1;

  IF current_price IS NULL THEN
    RETURN;
  END IF;

  -- Process all open EUR/USD trades
  FOR trade_record IN 
    SELECT * FROM shadow_trades 
    WHERE status = 'open' AND symbol = 'EUR/USD'
  LOOP
    should_close := false;
    close_reason := NULL;

    -- Calculate P&L
    IF trade_record.trade_type = 'buy' THEN
      pip_difference := (current_price - trade_record.entry_price) / 0.0001;
    ELSE
      pip_difference := (trade_record.entry_price - current_price) / 0.0001;
    END IF;

    pip_value := trade_record.remaining_lot_size * 10;
    unrealized_pnl := (pip_difference * pip_value) / 10;

    -- Update unrealized P&L
    UPDATE shadow_trades
    SET 
      unrealized_pnl = unrealized_pnl,
      current_price = current_price,
      profit_pips = pip_difference,
      updated_at = now()
    WHERE id = trade_record.id;

    -- Check closing conditions (prioritized)
    
    -- 1. Stop Loss hit
    IF (trade_record.trade_type = 'buy' AND current_price <= trade_record.stop_loss) OR
       (trade_record.trade_type = 'sell' AND current_price >= trade_record.stop_loss) THEN
      should_close := true;
      close_reason := 'stop_loss';
    
    -- 2. Take Profit hit
    ELSIF (trade_record.trade_type = 'buy' AND current_price >= trade_record.take_profit) OR
          (trade_record.trade_type = 'sell' AND current_price <= trade_record.take_profit) THEN
      should_close := true;
      close_reason := 'take_profit';
    
    -- 3. Realistic profit target ($20-50 for 0.01 lot)
    ELSIF unrealized_pnl >= 20 THEN
      should_close := true;
      close_reason := 'profit_target';
    
    -- 4. 24-hour time-based exit (restore old working logic)
    ELSIF trade_record.entry_time < (now() - interval '24 hours') THEN
      should_close := true;
      close_reason := 'time_exit_24h';
    END IF;

    -- Close trade if any condition met
    IF should_close THEN
      PERFORM close_shadow_trade(
        trade_record.id,
        current_price,
        trade_record.remaining_lot_size,
        close_reason
      );
    END IF;
  END LOOP;
END;
$$;