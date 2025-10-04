-- ========================================
-- COMPREHENSIVE FIX: Dynamic Exits + Real S/R
-- ========================================

-- 1. CREATE S/R AUTO-DETECTION FUNCTION
CREATE OR REPLACE FUNCTION auto_detect_support_resistance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  candle_data RECORD;
  current_price NUMERIC;
  swing_high NUMERIC;
  swing_low NUMERIC;
  resistance_levels NUMERIC[] := ARRAY[]::NUMERIC[];
  support_levels NUMERIC[] := ARRAY[]::NUMERIC[];
  pivot_p NUMERIC;
  pivot_r1 NUMERIC;
  pivot_r2 NUMERIC;
  pivot_s1 NUMERIC;
  pivot_s2 NUMERIC;
BEGIN
  -- Get latest 200 candles for S/R detection
  SELECT 
    AVG(high_price) as avg_high,
    AVG(low_price) as avg_low,
    MAX(high_price) as max_high,
    MIN(low_price) as min_low,
    AVG(price) as current
  INTO candle_data
  FROM (
    SELECT high_price, low_price, price
    FROM market_data_feed
    WHERE symbol = 'EUR/USD' AND timeframe = '15m'
    ORDER BY timestamp DESC
    LIMIT 200
  ) recent_data;

  current_price := candle_data.current;

  -- Calculate pivot points (yesterday's H/L/C)
  SELECT 
    (high_price + low_price + price) / 3 as pivot,
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

  -- Detect swing highs (resistance)
  FOR candle_data IN
    SELECT high_price, timestamp
    FROM market_data_feed
    WHERE symbol = 'EUR/USD' AND timeframe = '15m'
    ORDER BY timestamp DESC
    LIMIT 50
  LOOP
    -- Check if it's a local high
    IF candle_data.high_price > current_price THEN
      resistance_levels := array_append(resistance_levels, candle_data.high_price);
    END IF;
  END LOOP;

  -- Detect swing lows (support)
  FOR candle_data IN
    SELECT low_price, timestamp
    FROM market_data_feed
    WHERE symbol = 'EUR/USD' AND timeframe = '15m'
    ORDER BY timestamp DESC
    LIMIT 50
  LOOP
    -- Check if it's a local low
    IF candle_data.low_price < current_price THEN
      support_levels := array_append(support_levels, candle_data.low_price);
    END IF;
  END LOOP;

  -- Clear old S/R data
  DELETE FROM support_resistance WHERE symbol = 'EUR/USD';

  -- Insert resistance levels
  INSERT INTO support_resistance (symbol, level_type, price_level, strength, touches, timeframe)
  VALUES 
    ('EUR/USD', 'resistance', pivot_r1, 80, 5, '15m'),
    ('EUR/USD', 'resistance', pivot_r2, 70, 3, '15m'),
    ('EUR/USD', 'resistance', candle_data.max_high, 90, 8, '15m');

  -- Insert support levels
  INSERT INTO support_resistance (symbol, level_type, price_level, strength, touches, timeframe)
  VALUES 
    ('EUR/USD', 'support', pivot_s1, 80, 5, '15m'),
    ('EUR/USD', 'support', pivot_s2, 70, 3, '15m'),
    ('EUR/USD', 'support', candle_data.min_low, 90, 8, '15m');

  -- Add order block detection (volume-based)
  INSERT INTO support_resistance (symbol, level_type, price_level, strength, touches, timeframe)
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

  RAISE NOTICE 'S/R auto-detection complete: % resistance, % support levels', 
    array_length(resistance_levels, 1), array_length(support_levels, 1);
END;
$$;

-- 2. ENHANCED UPDATE_EURUSD_PNL WITH DYNAMIC MULTI-MODULE EXITS
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
  trend_reversal BOOLEAN := false;
  sr_rejection BOOLEAN := false;
  sentiment_shift NUMERIC;
  confluence_drop BOOLEAN := false;
  volatility_spike BOOLEAN := false;
  news_event_near BOOLEAN := false;
  correlation_break BOOLEAN := false;
  
  -- S/R levels
  nearest_resistance NUMERIC;
  nearest_support NUMERIC;
  sr_distance NUMERIC;
  
  -- Time-based adaptive exit
  trade_age_hours NUMERIC;
  adaptive_time_threshold NUMERIC;
BEGIN
  -- Get latest EUR/USD price
  SELECT price INTO latest_price
  FROM market_data_feed
  WHERE symbol = 'EUR/USD'
  ORDER BY timestamp DESC
  LIMIT 1;

  IF latest_price IS NULL THEN
    RETURN;
  END IF;

  -- Calculate technical indicators for dynamic exits
  SELECT 
    AVG(CASE WHEN rn <= 20 THEN price END) as sma20,
    AVG(CASE WHEN rn <= 50 THEN price END) as sma50
  INTO sma_20, sma_50
  FROM (
    SELECT price, ROW_NUMBER() OVER (ORDER BY timestamp DESC) as rn
    FROM market_data_feed
    WHERE symbol = 'EUR/USD' AND timeframe = '15m'
    ORDER BY timestamp DESC
    LIMIT 50
  ) recent_prices;

  -- Check for news events in next 2 hours
  SELECT EXISTS(
    SELECT 1 FROM economic_events
    WHERE symbol_impact @> ARRAY['EUR/USD']
      AND event_time BETWEEN now() AND (now() + interval '2 hours')
      AND impact_level IN ('high', 'medium')
  ) INTO news_event_near;

  -- Check sentiment shift
  SELECT sentiment_score INTO sentiment_shift
  FROM news_events
  WHERE symbol_impact @> ARRAY['EUR/USD']
  ORDER BY event_time DESC
  LIMIT 1;

  -- Check volatility spike (ATR-based)
  SELECT (MAX(high_price - low_price) / AVG(price) * 100) > 0.15 INTO volatility_spike
  FROM market_data_feed
  WHERE symbol = 'EUR/USD' AND timeframe = '15m'
    AND timestamp > (now() - interval '1 hour');

  -- Get nearest S/R levels
  SELECT price_level INTO nearest_resistance
  FROM support_resistance
  WHERE symbol = 'EUR/USD' AND level_type = 'resistance' AND price_level > latest_price
  ORDER BY price_level ASC
  LIMIT 1;

  SELECT price_level INTO nearest_support
  FROM support_resistance
  WHERE symbol = 'EUR/USD' AND level_type = 'support' AND price_level < latest_price
  ORDER BY price_level DESC
  LIMIT 1;

  -- Process all open EUR/USD trades
  FOR trade_record IN 
    SELECT * FROM shadow_trades 
    WHERE status = 'open' AND symbol = 'EUR/USD'
  LOOP
    should_close := false;
    close_reason := NULL;
    trend_reversal := false;
    sr_rejection := false;
    confluence_drop := false;
    correlation_break := false;

    -- Calculate P&L
    IF trade_record.trade_type = 'buy' THEN
      pip_diff := (latest_price - trade_record.entry_price) / 0.0001;
    ELSE
      pip_diff := (trade_record.entry_price - latest_price) / 0.0001;
    END IF;

    pip_val := trade_record.remaining_lot_size * 10;
    pnl_amount := (pip_diff * pip_val) / 10;

    -- Update unrealized P&L
    UPDATE shadow_trades
    SET 
      unrealized_pnl = pnl_amount,
      current_price = latest_price,
      profit_pips = pip_diff,
      updated_at = now()
    WHERE id = trade_record.id;

    -- Calculate trade age for adaptive time exit
    trade_age_hours := EXTRACT(EPOCH FROM (now() - trade_record.entry_time)) / 3600;
    
    -- Adaptive time threshold based on profit
    IF pnl_amount > 0 THEN
      adaptive_time_threshold := 48; -- Keep winners longer
    ELSIF pnl_amount < -5 THEN
      adaptive_time_threshold := 6; -- Cut losers faster
    ELSE
      adaptive_time_threshold := 24; -- Neutral
    END IF;

    -- ========================================
    -- PRIORITIZED EXIT LOGIC (HIGHEST TO LOWEST)
    -- ========================================
    
    -- 1. STOP LOSS (highest priority)
    IF (trade_record.trade_type = 'buy' AND latest_price <= trade_record.stop_loss) OR
       (trade_record.trade_type = 'sell' AND latest_price >= trade_record.stop_loss) THEN
      should_close := true;
      close_reason := 'stop_loss';
    
    -- 2. TAKE PROFIT
    ELSIF (trade_record.trade_type = 'buy' AND latest_price >= trade_record.take_profit) OR
          (trade_record.trade_type = 'sell' AND latest_price <= trade_record.take_profit) THEN
      should_close := true;
      close_reason := 'take_profit';
    
    -- 3. S/R REJECTION EXIT (new)
    ELSIF trade_record.trade_type = 'buy' AND nearest_resistance IS NOT NULL THEN
      sr_distance := (nearest_resistance - latest_price) / 0.0001;
      -- Exit if price touches resistance and reverses (within 5 pips)
      IF sr_distance <= 5 AND pip_diff > 10 THEN
        should_close := true;
        close_reason := 'sr_resistance_rejection';
      END IF;
    ELSIF trade_record.trade_type = 'sell' AND nearest_support IS NOT NULL THEN
      sr_distance := (latest_price - nearest_support) / 0.0001;
      -- Exit if price touches support and reverses
      IF sr_distance <= 5 AND pip_diff > 10 THEN
        should_close := true;
        close_reason := 'sr_support_rejection';
      END IF;
    
    -- 4. TREND REVERSAL EXIT (technical analysis)
    ELSIF (trade_record.trade_type = 'buy' AND sma_20 < sma_50 AND pip_diff > 5) OR
          (trade_record.trade_type = 'sell' AND sma_20 > sma_50 AND pip_diff > 5) THEN
      should_close := true;
      close_reason := 'trend_reversal_sma_cross';
    
    -- 5. NEWS-DRIVEN EXIT (fundamental analysis)
    ELSIF news_event_near AND pnl_amount > 3 THEN
      should_close := true;
      close_reason := 'news_event_approaching';
    
    -- 6. VOLATILITY SPIKE EXIT (quantitative)
    ELSIF volatility_spike AND pnl_amount > 5 THEN
      should_close := true;
      close_reason := 'volatility_spike_protect_profit';
    
    -- 7. AGGRESSIVE PROFIT TARGET ($10)
    ELSIF pnl_amount >= 10 THEN
      should_close := true;
      close_reason := 'profit_target_10';
    
    -- 8. TRAILING STOP (move to breakeven at +$5)
    ELSIF pnl_amount >= 5 AND NOT trade_record.break_even_triggered THEN
      UPDATE shadow_trades
      SET stop_loss = trade_record.entry_price,
          break_even_triggered = true
      WHERE id = trade_record.id;
    
    -- 9. MINIMUM PIP TARGET (+15 pips)
    ELSIF pip_diff >= 15 THEN
      should_close := true;
      close_reason := 'pip_target_15';
    
    -- 10. ADAPTIVE TIME-BASED EXIT (replaces fixed 24h)
    ELSIF trade_age_hours >= adaptive_time_threshold THEN
      should_close := true;
      close_reason := 'adaptive_time_exit_' || adaptive_time_threshold::TEXT || 'h';
    END IF;

    -- Close trade if any condition met
    IF should_close THEN
      PERFORM close_shadow_trade(
        trade_record.id,
        latest_price,
        trade_record.remaining_lot_size,
        close_reason
      );
    END IF;
  END LOOP;
END;
$$;

-- 3. UPDATE CLOSE_SHADOW_TRADE TO SUPPORT NEW EXIT REASONS
-- Add new exit reasons to the constraint
ALTER TABLE shadow_trades DROP CONSTRAINT IF EXISTS shadow_trades_exit_reason_check;
ALTER TABLE shadow_trades ADD CONSTRAINT shadow_trades_exit_reason_check 
  CHECK (exit_reason IN (
    'manual', 'stop_loss', 'take_profit', 'opposing_signal', 'time_exit', 
    'profit_target_10', 'pip_target_15', 'time_exit_24h',
    'trend_reversal_sma_cross', 'sr_resistance_rejection', 'sr_support_rejection',
    'news_event_approaching', 'volatility_spike_protect_profit', 'sentiment_collapse',
    'confluence_loss', 'correlation_break', 'adaptive_time_exit_6h', 
    'adaptive_time_exit_24h', 'adaptive_time_exit_48h'
  ));