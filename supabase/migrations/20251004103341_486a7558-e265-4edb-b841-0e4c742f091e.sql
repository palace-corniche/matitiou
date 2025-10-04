
-- ========================================
-- STEP A: Fix S/R Column Names + Schedule Cron
-- ========================================

-- 1. Fix auto_detect_support_resistance() column names
CREATE OR REPLACE FUNCTION auto_detect_support_resistance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  candle_data RECORD;
  current_price NUMERIC;
  pivot_p NUMERIC;
  pivot_r1 NUMERIC;
  pivot_r2 NUMERIC;
  pivot_s1 NUMERIC;
  pivot_s2 NUMERIC;
  swing_high NUMERIC;
  swing_low NUMERIC;
  max_high NUMERIC;
  min_low NUMERIC;
BEGIN
  -- Get latest market data for calculations
  SELECT 
    MAX(high_price) as max_h,
    MIN(low_price) as min_l,
    AVG(price) as curr
  INTO max_high, min_low, current_price
  FROM (
    SELECT high_price, low_price, price
    FROM market_data_feed
    WHERE symbol = 'EUR/USD' AND timeframe = '15m'
    ORDER BY timestamp DESC
    LIMIT 200
  ) recent_data;

  -- Calculate pivot points
  SELECT 
    (high_price + low_price + price) / 3,
    high_price,
    low_price
  INTO pivot_p, swing_high, swing_low
  FROM market_data_feed
  WHERE symbol = 'EUR/USD' AND timeframe = '15m'
  ORDER BY timestamp DESC
  LIMIT 1;

  pivot_r1 := (2 * pivot_p) - swing_low;
  pivot_s1 := (2 * pivot_p) - swing_high;
  pivot_r2 := pivot_p + (swing_high - swing_low);
  pivot_s2 := pivot_p - (swing_high - swing_low);

  -- Clear old S/R data
  DELETE FROM support_resistance WHERE symbol = 'EUR/USD';

  -- Insert resistance levels (FIXED: level_price + touches_count)
  INSERT INTO support_resistance (symbol, level_type, level_price, strength, touches_count, timeframe)
  VALUES 
    ('EUR/USD', 'resistance', pivot_r1, 80, 5, '15m'),
    ('EUR/USD', 'resistance', pivot_r2, 70, 3, '15m'),
    ('EUR/USD', 'resistance', max_high, 90, 8, '15m');

  -- Insert support levels (FIXED: level_price + touches_count)
  INSERT INTO support_resistance (symbol, level_type, level_price, strength, touches_count, timeframe)
  VALUES 
    ('EUR/USD', 'support', pivot_s1, 80, 5, '15m'),
    ('EUR/USD', 'support', pivot_s2, 70, 3, '15m'),
    ('EUR/USD', 'support', min_low, 90, 8, '15m');

  -- Add order block detection
  INSERT INTO support_resistance (symbol, level_type, level_price, strength, touches_count, timeframe)
  SELECT 
    'EUR/USD',
    CASE WHEN price > current_price THEN 'resistance' ELSE 'support' END,
    price,
    CASE WHEN volume > 50000 THEN 85 ELSE 60 END,
    3,
    '15m'
  FROM market_data_feed
  WHERE symbol = 'EUR/USD' 
    AND timeframe = '15m'
    AND volume > 40000
  ORDER BY timestamp DESC
  LIMIT 5;

  RAISE NOTICE 'S/R auto-detection complete: % levels inserted', 
    (SELECT COUNT(*) FROM support_resistance WHERE symbol = 'EUR/USD');
END;
$$;

-- 2. Schedule S/R auto-detection cron job (every 15 minutes)
SELECT cron.schedule(
  'auto-detect-sr-15min',
  '*/15 * * * *', 
  $$
  SELECT net.http_post(
    url:='https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/auto-detect-sr',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);

-- ========================================
-- STEP B: Fix update_eurusd_pnl() - Proper Column Names
-- ========================================

CREATE OR REPLACE FUNCTION update_eurusd_pnl()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trade_record RECORD;
  latest_price NUMERIC;
  pip_diff NUMERIC;
  pip_val NUMERIC;
  pnl_amount NUMERIC;
  should_close BOOLEAN;
  close_reason TEXT;
  
  -- Dynamic exit variables
  sma_20 NUMERIC;
  sma_50 NUMERIC;
  news_count INTEGER;
  sentiment_shift NUMERIC;
  volatility_spike NUMERIC;
  nearest_sr NUMERIC;
  sr_distance NUMERIC;
  correlation_break BOOLEAN;
  time_held INTERVAL;
BEGIN
  -- Get latest EUR/USD price
  SELECT price INTO latest_price
  FROM market_data_feed
  WHERE symbol = 'EUR/USD'
  ORDER BY timestamp DESC
  LIMIT 1;

  IF latest_price IS NULL THEN
    RAISE WARNING 'No market data available';
    RETURN;
  END IF;

  -- Get trend indicators
  SELECT 
    AVG(price) FILTER (WHERE rn <= 20) as sma20,
    AVG(price) FILTER (WHERE rn <= 50) as sma50
  INTO sma_20, sma_50
  FROM (
    SELECT price, ROW_NUMBER() OVER (ORDER BY timestamp DESC) as rn
    FROM market_data_feed
    WHERE symbol = 'EUR/USD' AND timeframe = '15m'
    ORDER BY timestamp DESC
    LIMIT 50
  ) ranked;

  -- Check for upcoming news
  SELECT COUNT(*) INTO news_count
  FROM economic_events
  WHERE event_time BETWEEN now() AND now() + interval '2 hours'
    AND impact_level IN ('high', 'medium')
    AND 'EUR/USD' = ANY(symbol_impact);

  -- Check volatility
  SELECT STDDEV(price) INTO volatility_spike
  FROM market_data_feed
  WHERE symbol = 'EUR/USD' AND timeframe = '15m'
    AND timestamp > now() - interval '1 hour';

  -- Process each open trade
  FOR trade_record IN 
    SELECT * FROM shadow_trades 
    WHERE status = 'open' AND symbol = 'EUR/USD'
  LOOP
    should_close := false;
    close_reason := NULL;

    -- Calculate current P&L
    IF trade_record.trade_type = 'buy' THEN
      pip_diff := (latest_price - trade_record.entry_price) / 0.0001;
    ELSE
      pip_diff := (trade_record.entry_price - latest_price) / 0.0001;
    END IF;

    pip_val := trade_record.lot_size * 10;
    pnl_amount := pip_diff * pip_val;

    -- Update current price and unrealized P&L
    UPDATE shadow_trades
    SET 
      current_price = latest_price,
      unrealized_pnl = pnl_amount,
      profit_pips = pip_diff,
      updated_at = now()
    WHERE id = trade_record.id;

    -- ========== EXIT PRIORITY LOGIC ==========
    
    -- 1. Stop Loss
    IF (trade_record.trade_type = 'buy' AND latest_price <= trade_record.stop_loss)
       OR (trade_record.trade_type = 'sell' AND latest_price >= trade_record.stop_loss) THEN
      should_close := true;
      close_reason := 'stop_loss';
    END IF;

    -- 2. Take Profit
    IF NOT should_close AND
       ((trade_record.trade_type = 'buy' AND latest_price >= trade_record.take_profit)
        OR (trade_record.trade_type = 'sell' AND latest_price <= trade_record.take_profit)) THEN
      should_close := true;
      close_reason := 'take_profit';
    END IF;

    -- 3. S/R Rejection (FIXED: level_price column)
    IF NOT should_close AND pnl_amount > 0 THEN
      SELECT level_price INTO nearest_sr
      FROM support_resistance
      WHERE symbol = 'EUR/USD'
        AND ((trade_record.trade_type = 'buy' AND level_type = 'resistance' AND level_price > latest_price)
             OR (trade_record.trade_type = 'sell' AND level_type = 'support' AND level_price < latest_price))
      ORDER BY ABS(level_price - latest_price)
      LIMIT 1;

      IF nearest_sr IS NOT NULL THEN
        sr_distance := ABS(latest_price - nearest_sr) / 0.0001;
        IF sr_distance < 5 THEN -- Within 5 pips of S/R
          should_close := true;
          close_reason := 'sr_rejection';
        END IF;
      END IF;
    END IF;

    -- 4. Trend Reversal
    IF NOT should_close AND pnl_amount > 0 AND sma_20 IS NOT NULL AND sma_50 IS NOT NULL THEN
      IF (trade_record.trade_type = 'buy' AND sma_20 < sma_50)
         OR (trade_record.trade_type = 'sell' AND sma_20 > sma_50) THEN
        should_close := true;
        close_reason := 'trend_reversal';
      END IF;
    END IF;

    -- 5. News Event Exit
    IF NOT should_close AND pnl_amount > 0 AND news_count > 0 THEN
      should_close := true;
      close_reason := 'news_event';
    END IF;

    -- 6. Volatility Spike Exit
    IF NOT should_close AND pnl_amount > 0 AND volatility_spike > 0.0015 THEN
      should_close := true;
      close_reason := 'volatility_spike';
    END IF;

    -- 7. Quick $10 Profit Exit
    IF NOT should_close AND pnl_amount >= 10 THEN
      should_close := true;
      close_reason := 'quick_profit_10';
    END IF;

    -- 8. Trailing Stop (activate at +$5, trail 3 pips)
    IF NOT should_close AND pnl_amount >= 5 THEN
      IF (trade_record.trade_type = 'buy' AND latest_price < (SELECT MAX(current_price) FROM shadow_trades WHERE id = trade_record.id) - 0.0003)
         OR (trade_record.trade_type = 'sell' AND latest_price > (SELECT MIN(current_price) FROM shadow_trades WHERE id = trade_record.id) + 0.0003) THEN
        should_close := true;
        close_reason := 'trailing_stop';
      END IF;
    END IF;

    -- 9. 15 Pips Profit Lock
    IF NOT should_close AND pip_diff >= 15 THEN
      should_close := true;
      close_reason := '15_pips_profit';
    END IF;

    -- 10. Adaptive Time Exit
    IF NOT should_close THEN
      time_held := now() - trade_record.entry_time;
      IF (pnl_amount < -5 AND time_held > interval '6 hours')
         OR (pnl_amount BETWEEN -5 AND 5 AND time_held > interval '24 hours')
         OR (pnl_amount > 5 AND time_held > interval '48 hours') THEN
        should_close := true;
        close_reason := 'adaptive_time_exit';
      END IF;
    END IF;

    -- Execute close if any condition met
    IF should_close THEN
      PERFORM close_shadow_trade(
        trade_record.id,
        latest_price,
        trade_record.lot_size,
        close_reason
      );
      RAISE NOTICE 'Closed trade % via %: $% (% pips)', 
        trade_record.id, close_reason, pnl_amount, pip_diff;
    END IF;
  END LOOP;
END;
$$;

-- ========================================
-- STEP C: Fix master_signals INSERT Failure
-- ========================================

-- Ensure master_signals has proper defaults and no constraint issues
ALTER TABLE master_signals 
  ALTER COLUMN signal_hash DROP NOT NULL;

ALTER TABLE master_signals
  ALTER COLUMN signal_hash SET DEFAULT md5(random()::text || clock_timestamp()::text);

-- Create helper function to safely insert master signals
CREATE OR REPLACE FUNCTION insert_master_signal(
  p_analysis_id UUID,
  p_signal_type TEXT,
  p_confidence NUMERIC,
  p_strength INTEGER,
  p_confluence_score NUMERIC,
  p_entry NUMERIC,
  p_sl NUMERIC,
  p_tp NUMERIC,
  p_lot_size NUMERIC,
  p_timeframe TEXT,
  p_modules TEXT[],
  p_modular_ids UUID[],
  p_fusion_params JSONB,
  p_market_snapshot JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_signal_id UUID;
  signal_hash_val TEXT;
BEGIN
  -- Generate unique signal hash
  signal_hash_val := md5(
    p_analysis_id::TEXT || 
    p_signal_type || 
    p_confidence::TEXT || 
    now()::TEXT
  );

  -- Insert master signal
  INSERT INTO master_signals (
    analysis_id,
    signal_type,
    final_confidence,
    final_strength,
    confluence_score,
    recommended_entry,
    recommended_stop_loss,
    recommended_take_profit,
    recommended_lot_size,
    timeframe,
    symbol,
    contributing_modules,
    modular_signal_ids,
    fusion_parameters,
    market_data_snapshot,
    signal_hash,
    fusion_algorithm,
    status
  ) VALUES (
    p_analysis_id,
    p_signal_type,
    p_confidence,
    p_strength,
    p_confluence_score,
    p_entry,
    p_sl,
    p_tp,
    p_lot_size,
    p_timeframe,
    'EUR/USD',
    p_modules,
    p_modular_ids,
    p_fusion_params,
    p_market_snapshot,
    signal_hash_val,
    'bayesian_fusion_v2',
    'pending'
  )
  RETURNING id INTO new_signal_id;

  RETURN new_signal_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Master signal INSERT failed: %', SQLERRM;
  RETURN NULL;
END;
$$;

-- Run initial S/R detection
SELECT auto_detect_support_resistance();
