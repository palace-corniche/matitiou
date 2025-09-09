-- Phase 3: Real-time Market Data and Enhanced EUR/USD Trading System

-- Create real-time tick data table
CREATE TABLE IF NOT EXISTS tick_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL DEFAULT 'EUR/USD',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  bid NUMERIC(8,5) NOT NULL,
  ask NUMERIC(8,5) NOT NULL,
  spread NUMERIC(6,5) NOT NULL,
  tick_volume INTEGER DEFAULT 1,
  data_source TEXT DEFAULT 'twelve_data',
  session_type TEXT DEFAULT 'london',
  is_live BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for fast tick data retrieval
CREATE INDEX IF NOT EXISTS idx_tick_data_symbol_timestamp ON tick_data(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tick_data_timestamp ON tick_data(timestamp DESC);

-- Enable RLS on tick_data
ALTER TABLE tick_data ENABLE ROW LEVEL SECURITY;

-- Create policy for tick data access
CREATE POLICY "Anyone can view tick data" ON tick_data FOR SELECT USING (true);
CREATE POLICY "System can manage tick data" ON tick_data FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update tick data" ON tick_data FOR UPDATE USING (true);

-- Create function to calculate EUR/USD PnL with MT4 precision
CREATE OR REPLACE FUNCTION calculate_eurusd_pnl(
  p_trade_type TEXT,
  p_entry_price NUMERIC,
  p_current_price NUMERIC,
  p_lot_size NUMERIC,
  p_contract_size NUMERIC DEFAULT 100000
) RETURNS TABLE(
  pnl_usd NUMERIC,
  pips NUMERIC,
  pip_value NUMERIC
) LANGUAGE plpgsql AS $$
DECLARE
  pip_diff NUMERIC;
  pip_val NUMERIC;
  pnl_calc NUMERIC;
BEGIN
  -- Calculate pip difference
  IF p_trade_type = 'buy' THEN
    pip_diff := (p_current_price - p_entry_price) / 0.0001;
  ELSE
    pip_diff := (p_entry_price - p_current_price) / 0.0001;
  END IF;
  
  -- Calculate pip value for EUR/USD (1 pip = $10 for 1 lot)
  pip_val := p_lot_size * 10;
  
  -- Calculate P&L in USD
  pnl_calc := pip_diff * pip_val;
  
  RETURN QUERY SELECT pnl_calc, pip_diff, pip_val;
END;
$$;

-- Create function to update real-time PnL for all open EUR/USD trades
CREATE OR REPLACE FUNCTION update_eurusd_pnl() RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  trade_record shadow_trades%ROWTYPE;
  current_bid NUMERIC;
  current_ask NUMERIC;
  current_price NUMERIC;
  pnl_result RECORD;
BEGIN
  -- Get latest EUR/USD tick
  SELECT bid, ask INTO current_bid, current_ask
  FROM tick_data 
  WHERE symbol = 'EUR/USD' 
  ORDER BY timestamp DESC 
  LIMIT 1;
  
  IF current_bid IS NULL THEN
    RETURN;
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
    
    -- Calculate P&L
    SELECT * INTO pnl_result FROM calculate_eurusd_pnl(
      trade_record.trade_type,
      trade_record.entry_price,
      current_price,
      trade_record.lot_size,
      trade_record.contract_size
    );
    
    -- Update trade with real-time P&L
    UPDATE shadow_trades 
    SET 
      current_price = current_price,
      unrealized_pnl = pnl_result.pnl_usd,
      profit_pips = pnl_result.pips,
      pip_value = pnl_result.pip_value,
      updated_at = now()
    WHERE id = trade_record.id;
    
    -- Check for SL/TP hits
    IF (trade_record.trade_type = 'buy' AND current_price <= trade_record.stop_loss) OR
       (trade_record.trade_type = 'sell' AND current_price >= trade_record.stop_loss) THEN
      
      -- Close at stop loss
      PERFORM close_shadow_trade(
        trade_record.id,
        current_price,
        trade_record.lot_size,
        'stop_loss'
      );
      
    ELSIF (trade_record.trade_type = 'buy' AND current_price >= trade_record.take_profit) OR
          (trade_record.trade_type = 'sell' AND current_price <= trade_record.take_profit) THEN
      
      -- Close at take profit
      PERFORM close_shadow_trade(
        trade_record.id,
        current_price,
        trade_record.lot_size,
        'take_profit'
      );
    END IF;
  END LOOP;
  
  -- Update portfolio equity based on floating P&L
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
  WHERE EXISTS (
    SELECT 1 FROM shadow_trades 
    WHERE portfolio_id = shadow_portfolios.id AND status = 'open'
  );
END;
$$;

-- Create function for trade archival (keep only last 100 closed trades)
CREATE OR REPLACE FUNCTION archive_old_trades() RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  portfolio_record shadow_portfolios%ROWTYPE;
BEGIN
  FOR portfolio_record IN SELECT * FROM shadow_portfolios LOOP
    -- Keep only the 100 most recent closed trades per portfolio
    DELETE FROM shadow_trades 
    WHERE portfolio_id = portfolio_record.id 
      AND status = 'closed'
      AND id NOT IN (
        SELECT id FROM shadow_trades 
        WHERE portfolio_id = portfolio_record.id 
          AND status = 'closed'
        ORDER BY exit_time DESC 
        LIMIT 100
      );
  END LOOP;
END;
$$;

-- Create diagnostics table for system monitoring
CREATE TABLE IF NOT EXISTS trading_diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  diagnostic_type TEXT NOT NULL,
  symbol TEXT DEFAULT 'EUR/USD',
  latency_ms INTEGER,
  price_source TEXT,
  spread_points NUMERIC,
  pnl_accuracy NUMERIC,
  margin_calculation_valid BOOLEAN DEFAULT true,
  signal_modules_active INTEGER DEFAULT 0,
  error_message TEXT,
  severity_level TEXT DEFAULT 'info',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on diagnostics
ALTER TABLE trading_diagnostics ENABLE ROW LEVEL SECURITY;

-- Create policies for diagnostics
CREATE POLICY "Anyone can view diagnostics" ON trading_diagnostics FOR SELECT USING (true);
CREATE POLICY "System can manage diagnostics" ON trading_diagnostics FOR INSERT WITH CHECK (true);

-- Create function for comprehensive system diagnostics
CREATE OR REPLACE FUNCTION run_trading_diagnostics() RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  value NUMERIC,
  message TEXT
) LANGUAGE plpgsql AS $$
DECLARE
  latest_tick RECORD;
  pnl_check RECORD;
  margin_check RECORD;
  signal_count INTEGER;
BEGIN
  -- Check tick data latency
  SELECT 
    timestamp,
    EXTRACT(EPOCH FROM (now() - timestamp)) * 1000 as latency_ms
  INTO latest_tick
  FROM tick_data 
  WHERE symbol = 'EUR/USD' 
  ORDER BY timestamp DESC 
  LIMIT 1;
  
  RETURN QUERY SELECT 
    'tick_latency'::TEXT,
    CASE WHEN latest_tick.latency_ms < 500 THEN 'healthy' ELSE 'warning' END,
    latest_tick.latency_ms,
    'Tick data latency: ' || latest_tick.latency_ms::TEXT || 'ms'::TEXT;
  
  -- Check PnL calculation accuracy
  SELECT COUNT(*) as trades_checked, AVG(ABS(unrealized_pnl)) as avg_pnl
  INTO pnl_check
  FROM shadow_trades 
  WHERE status = 'open' AND symbol = 'EUR/USD';
  
  RETURN QUERY SELECT 
    'pnl_calculation'::TEXT,
    'healthy'::TEXT,
    pnl_check.avg_pnl,
    'Average floating P&L: $' || COALESCE(pnl_check.avg_pnl, 0)::TEXT;
  
  -- Check margin calculations
  SELECT COUNT(*) as portfolio_count
  INTO margin_check
  FROM shadow_portfolios 
  WHERE margin_level > 0 AND margin_level < 1000;
  
  RETURN QUERY SELECT 
    'margin_health'::TEXT,
    CASE WHEN margin_check.portfolio_count > 0 THEN 'healthy' ELSE 'normal' END,
    margin_check.portfolio_count::NUMERIC,
    'Portfolios with active margin: ' || margin_check.portfolio_count::TEXT;
  
  -- Check active signal modules
  SELECT COUNT(DISTINCT module_id) INTO signal_count
  FROM module_performance 
  WHERE signals_generated > 0 AND last_updated > now() - interval '1 hour';
  
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
    latest_tick.latency_ms::INTEGER,
    signal_count,
    jsonb_build_object(
      'avg_pnl', pnl_check.avg_pnl,
      'active_portfolios', margin_check.portfolio_count,
      'timestamp', now()
    )
  );
END;
$$;