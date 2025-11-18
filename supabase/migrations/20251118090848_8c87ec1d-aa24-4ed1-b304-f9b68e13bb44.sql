-- ============================================================
-- PART B: Missing RPC Functions + Tables Migration
-- ============================================================

-- 1. Create intelligence_performance table for ML tracking
CREATE TABLE IF NOT EXISTS public.intelligence_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type text NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric(10,4),
  sample_size integer DEFAULT 0,
  timeframe text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intelligence_performance_model ON public.intelligence_performance(model_type);
CREATE INDEX IF NOT EXISTS idx_intelligence_performance_created ON public.intelligence_performance(created_at DESC);

-- 2. Execute Advanced Order Function (for pending orders)
CREATE OR REPLACE FUNCTION public.execute_advanced_order(
  p_order_id uuid,
  p_current_price numeric
) RETURNS jsonb AS $$
DECLARE
  v_order RECORD;
  v_should_trigger boolean := false;
  v_trade_id uuid;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM public.pending_orders WHERE id = p_order_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found or already executed');
  END IF;
  
  -- Check if order should trigger
  IF v_order.order_type = 'buy_stop' AND p_current_price >= v_order.trigger_price THEN
    v_should_trigger := true;
  ELSIF v_order.order_type = 'sell_stop' AND p_current_price <= v_order.trigger_price THEN
    v_should_trigger := true;
  ELSIF v_order.order_type = 'buy_limit' AND p_current_price <= v_order.trigger_price THEN
    v_should_trigger := true;
  ELSIF v_order.order_type = 'sell_limit' AND p_current_price >= v_order.trigger_price THEN
    v_should_trigger := true;
  END IF;
  
  IF v_should_trigger THEN
    -- Create shadow trade
    INSERT INTO public.shadow_trades (
      symbol, trade_type, lot_size, entry_price, 
      stop_loss, take_profit, status, order_type,
      portfolio_id, metadata
    ) VALUES (
      v_order.symbol, v_order.trade_type, v_order.lot_size, p_current_price,
      v_order.stop_loss, v_order.take_profit, 'open', v_order.order_type,
      '00000000-0000-0000-0000-000000000001'::uuid, v_order.metadata
    ) RETURNING id INTO v_trade_id;
    
    -- Update order status
    UPDATE public.pending_orders 
    SET status = 'executed', triggered_at = NOW()
    WHERE id = p_order_id;
    
    RETURN jsonb_build_object('success', true, 'trade_id', v_trade_id, 'triggered', true);
  ELSE
    RETURN jsonb_build_object('success', true, 'triggered', false, 'reason', 'Price condition not met');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Auto-Detect Support/Resistance Function
CREATE OR REPLACE FUNCTION public.auto_detect_support_resistance(
  p_symbol text,
  p_timeframe text DEFAULT '1h',
  p_lookback_periods integer DEFAULT 100
) RETURNS jsonb AS $$
DECLARE
  v_levels jsonb := '[]'::jsonb;
  v_candle RECORD;
  v_pivot_high numeric;
  v_pivot_low numeric;
  v_strength integer;
BEGIN
  -- Find swing highs and lows
  FOR v_candle IN 
    SELECT 
      high_price, low_price, timestamp,
      LAG(high_price, 1) OVER (ORDER BY timestamp) as prev_high,
      LAG(low_price, 1) OVER (ORDER BY timestamp) as prev_low,
      LEAD(high_price, 1) OVER (ORDER BY timestamp) as next_high,
      LEAD(low_price, 1) OVER (ORDER BY timestamp) as next_low
    FROM public.aggregated_candles
    WHERE symbol = p_symbol 
      AND timeframe = p_timeframe
      AND is_complete = true
    ORDER BY timestamp DESC
    LIMIT p_lookback_periods
  LOOP
    -- Detect swing high (resistance)
    IF v_candle.high_price > v_candle.prev_high AND v_candle.high_price > v_candle.next_high THEN
      v_strength := 1;
      
      -- Insert or update resistance level
      INSERT INTO public.support_resistance (
        symbol, timeframe, level_type, price_level, strength, last_tested
      ) VALUES (
        p_symbol, p_timeframe, 'resistance', v_candle.high_price, v_strength, v_candle.timestamp
      )
      ON CONFLICT DO NOTHING;
      
      v_levels := v_levels || jsonb_build_object(
        'type', 'resistance',
        'price', v_candle.high_price,
        'strength', v_strength,
        'timestamp', v_candle.timestamp
      );
    END IF;
    
    -- Detect swing low (support)
    IF v_candle.low_price < v_candle.prev_low AND v_candle.low_price < v_candle.next_low THEN
      v_strength := 1;
      
      -- Insert or update support level
      INSERT INTO public.support_resistance (
        symbol, timeframe, level_type, price_level, strength, last_tested
      ) VALUES (
        p_symbol, p_timeframe, 'support', v_candle.low_price, v_strength, v_candle.timestamp
      )
      ON CONFLICT DO NOTHING;
      
      v_levels := v_levels || jsonb_build_object(
        'type', 'support',
        'price', v_candle.low_price,
        'strength', v_strength,
        'timestamp', v_candle.timestamp
      );
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'levels_detected', jsonb_array_length(v_levels),
    'levels', v_levels
  );
END;
$$ LANGUAGE plpgsql;

-- 4. Update Trailing Stops Function
CREATE OR REPLACE FUNCTION public.update_trailing_stops(
  p_current_price numeric,
  p_symbol text DEFAULT 'EUR/USD'
) RETURNS jsonb AS $$
DECLARE
  v_trade RECORD;
  v_updated_count integer := 0;
  v_new_stop numeric;
  v_trailing_distance numeric := 0.0020; -- 20 pips
BEGIN
  FOR v_trade IN 
    SELECT * FROM public.shadow_trades 
    WHERE status = 'open' 
      AND symbol = p_symbol
      AND stop_loss IS NOT NULL
  LOOP
    IF v_trade.trade_type = 'buy' THEN
      -- For buy trades, move stop loss up if price moved favorably
      v_new_stop := p_current_price - v_trailing_distance;
      IF v_new_stop > v_trade.stop_loss THEN
        UPDATE public.shadow_trades
        SET stop_loss = v_new_stop,
            metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{trailing_stop_updated}', 'true'::jsonb)
        WHERE id = v_trade.id;
        v_updated_count := v_updated_count + 1;
      END IF;
    ELSE
      -- For sell trades, move stop loss down if price moved favorably
      v_new_stop := p_current_price + v_trailing_distance;
      IF v_new_stop < v_trade.stop_loss THEN
        UPDATE public.shadow_trades
        SET stop_loss = v_new_stop,
            metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{trailing_stop_updated}', 'true'::jsonb)
        WHERE id = v_trade.id;
        v_updated_count := v_updated_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'trades_updated', v_updated_count,
    'current_price', p_current_price
  );
END;
$$ LANGUAGE plpgsql;

-- 5. Manage Break-Even Function
CREATE OR REPLACE FUNCTION public.manage_break_even(
  p_current_price numeric,
  p_symbol text DEFAULT 'EUR/USD',
  p_profit_threshold_pips integer DEFAULT 20
) RETURNS jsonb AS $$
DECLARE
  v_trade RECORD;
  v_updated_count integer := 0;
  v_profit_pips numeric;
BEGIN
  FOR v_trade IN 
    SELECT * FROM public.shadow_trades 
    WHERE status = 'open' 
      AND symbol = p_symbol
      AND stop_loss IS NOT NULL
      AND (metadata->>'break_even_set')::boolean IS NOT TRUE
  LOOP
    -- Calculate current profit in pips
    IF v_trade.trade_type = 'buy' THEN
      v_profit_pips := (p_current_price - v_trade.entry_price) / 0.00001;
    ELSE
      v_profit_pips := (v_trade.entry_price - p_current_price) / 0.00001;
    END IF;
    
    -- Move to break-even if profit threshold reached
    IF v_profit_pips >= p_profit_threshold_pips THEN
      UPDATE public.shadow_trades
      SET stop_loss = v_trade.entry_price,
          metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{break_even_set}', 'true'::jsonb)
      WHERE id = v_trade.id;
      v_updated_count := v_updated_count + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'trades_moved_to_break_even', v_updated_count,
    'current_price', p_current_price
  );
END;
$$ LANGUAGE plpgsql;

-- 6. Update EUR/USD PnL Function
CREATE OR REPLACE FUNCTION public.update_eurusd_pnl() RETURNS void AS $$
DECLARE
  v_current_price numeric;
  v_trade RECORD;
  v_pnl numeric;
  v_pips numeric;
BEGIN
  -- Get current price
  SELECT price INTO v_current_price 
  FROM public.market_data_feed 
  WHERE symbol = 'EUR/USD' 
  ORDER BY timestamp DESC 
  LIMIT 1;
  
  IF v_current_price IS NULL THEN
    RETURN;
  END IF;
  
  -- Update PnL for all open EUR/USD trades
  FOR v_trade IN 
    SELECT * FROM public.shadow_trades 
    WHERE status = 'open' AND symbol = 'EUR/USD'
  LOOP
    IF v_trade.trade_type = 'buy' THEN
      v_pips := (v_current_price - v_trade.entry_price) / 0.00001;
    ELSE
      v_pips := (v_trade.entry_price - v_current_price) / 0.00001;
    END IF;
    
    v_pnl := v_pips * (v_trade.lot_size * 100000 * 0.0001);
    
    UPDATE public.shadow_trades
    SET pnl = v_pnl,
        profit_pips = v_pips,
        updated_at = NOW()
    WHERE id = v_trade.id;
  END LOOP;
  
  -- Update global account equity
  UPDATE public.global_trading_account
  SET equity = balance + (
    SELECT COALESCE(SUM(pnl), 0) 
    FROM public.shadow_trades 
    WHERE status = 'open'
  ),
  updated_at = NOW()
  WHERE id = '00000000-0000-0000-0000-000000000001';
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on new table
ALTER TABLE public.intelligence_performance ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for intelligence_performance
CREATE POLICY "Allow all access to intelligence_performance"
ON public.intelligence_performance
FOR ALL
USING (true);

-- Add comments
COMMENT ON FUNCTION public.execute_advanced_order IS 'Executes pending orders (buy/sell stop/limit) when price conditions are met';
COMMENT ON FUNCTION public.auto_detect_support_resistance IS 'Automatically detects support and resistance levels from price action';
COMMENT ON FUNCTION public.update_trailing_stops IS 'Updates trailing stop losses for open trades based on current price';
COMMENT ON FUNCTION public.manage_break_even IS 'Moves stop loss to break-even when profit threshold is reached';
COMMENT ON FUNCTION public.update_eurusd_pnl IS 'Updates PnL for all open EUR/USD trades based on current market price';
COMMENT ON TABLE public.intelligence_performance IS 'Tracks ML model performance metrics over time';