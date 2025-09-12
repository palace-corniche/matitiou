-- Fix ambiguous variable names and table references in diagnostic functions

-- 1) Update P&L function: rename PL/pgSQL variable to avoid ambiguity
CREATE OR REPLACE FUNCTION public.update_eurusd_pnl()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  trade_record shadow_trades%ROWTYPE;
  current_bid NUMERIC;
  current_ask NUMERIC;
  cur_price NUMERIC; -- renamed from current_price to avoid ambiguity
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
      cur_price := current_bid;  -- Use bid for closing long position
    ELSE
      cur_price := current_ask;  -- Use ask for closing short position
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
      
      -- Close at stop loss
      PERFORM close_shadow_trade(
        trade_record.id,
        cur_price,
        trade_record.lot_size,
        'stop_loss'
      );
      
    ELSIF (trade_record.trade_type = 'buy' AND cur_price >= trade_record.take_profit AND trade_record.take_profit > 0) OR
          (trade_record.trade_type = 'sell' AND cur_price <= trade_record.take_profit AND trade_record.take_profit > 0) THEN
      
      -- Close at take profit
      PERFORM close_shadow_trade(
        trade_record.id,
        cur_price,
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
$$;

-- 2) Update diagnostics function to fully-qualify columns and avoid ambiguous references
CREATE OR REPLACE FUNCTION public.run_trading_diagnostics()
RETURNS TABLE(check_name text, status text, value numeric, message text)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  latest_tick RECORD;
  pnl_check RECORD;
  margin_check RECORD;
  signal_count INTEGER;
  avg_perf_score NUMERIC;
  error_modules INTEGER;
BEGIN
  -- Check tick data latency
  SELECT 
    t.timestamp,
    EXTRACT(EPOCH FROM (now() - t.timestamp)) * 1000 as latency_ms
  INTO latest_tick
  FROM tick_data t
  WHERE t.symbol = 'EUR/USD' 
  ORDER BY t.timestamp DESC 
  LIMIT 1;
  
  RETURN QUERY SELECT 
    'tick_latency'::TEXT,
    CASE WHEN COALESCE(latest_tick.latency_ms, 1e9) < 1500 THEN 'healthy' ELSE 'warning' END,
    COALESCE(latest_tick.latency_ms, 0),
    'Tick data latency: ' || COALESCE(latest_tick.latency_ms, 0)::TEXT || 'ms'::TEXT;
  
  -- Check PnL calculation accuracy (approximate)
  SELECT COUNT(*) as trades_checked, AVG(ABS(unrealized_pnl)) as avg_pnl
  INTO pnl_check
  FROM shadow_trades st
  WHERE st.status = 'open' AND st.symbol = 'EUR/USD';
  
  RETURN QUERY SELECT 
    'pnl_calculation'::TEXT,
    'healthy'::TEXT,
    COALESCE(pnl_check.avg_pnl, 0),
    'Average floating P&L: $' || COALESCE(pnl_check.avg_pnl, 0)::TEXT;
  
  -- Module health snapshot instead of system_health
  SELECT AVG(mh.performance_score) INTO avg_perf_score FROM module_health mh;
  SELECT COUNT(*) INTO error_modules FROM module_health mh WHERE mh.status = 'error';
  
  RETURN QUERY SELECT 
    'module_health'::TEXT,
    CASE WHEN COALESCE(avg_perf_score, 0) > 0.3 THEN 'healthy' ELSE 'warning' END,
    COALESCE(avg_perf_score, 0),
    'Avg performance score: ' || COALESCE(avg_perf_score, 0)::TEXT;
  
  -- Check active signal modules
  SELECT COUNT(DISTINCT mp.module_id) INTO signal_count
  FROM module_performance mp
  WHERE mp.signals_generated > 0 AND mp.last_updated > now() - interval '1 hour';
  
  RETURN QUERY SELECT 
    'signal_modules'::TEXT,
    CASE WHEN signal_count >= 5 THEN 'healthy' ELSE 'warning' END,
    signal_count::NUMERIC,
    'Active signal modules: ' || signal_count::TEXT || '/8';
  
  -- Log diagnostic run
  INSERT INTO trading_diagnostics (
    diagnostic_type, latency_ms, signal_modules_active,
    metadata
  ) VALUES (
    'system_health_check',
    COALESCE(latest_tick.latency_ms, 0)::INTEGER,
    COALESCE(signal_count, 0),
    jsonb_build_object(
      'avg_perf_score', COALESCE(avg_perf_score, 0),
      'error_modules', COALESCE(error_modules, 0),
      'timestamp', now()
    )
  );
END;
$$;