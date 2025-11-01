
-- Fix #2: Re-apply Entry Price Fix for execute_advanced_order
-- This function must use actual bid/ask prices from tick_data, not apply spread incorrectly

CREATE OR REPLACE FUNCTION execute_advanced_order(
  p_portfolio_id UUID,
  p_symbol TEXT,
  p_order_type TEXT,
  p_trade_type TEXT,
  p_lot_size NUMERIC,
  p_entry_price NUMERIC DEFAULT NULL,
  p_stop_loss NUMERIC DEFAULT NULL,
  p_take_profit NUMERIC DEFAULT NULL,
  p_comment TEXT DEFAULT NULL,
  p_magic_number INTEGER DEFAULT NULL,
  p_signal_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  actual_entry_price NUMERIC;
  actual_spread NUMERIC;
  bid_price NUMERIC;
  ask_price NUMERIC;
  trade_id UUID;
  result JSONB;
BEGIN
  -- Get ACTUAL bid/ask prices from tick_data (most recent tick)
  SELECT 
    td.bid, 
    td.ask,
    td.ask - td.bid as spread_value
  INTO bid_price, ask_price, actual_spread
  FROM tick_data td
  WHERE td.symbol = p_symbol
  ORDER BY td.timestamp DESC
  LIMIT 1;
  
  -- Fallback to market_data_feed if tick_data is empty
  IF bid_price IS NULL OR ask_price IS NULL THEN
    SELECT 
      price - (0.00012), -- EUR/USD typical spread 1.2 pips
      price + (0.00012),
      0.00024
    INTO bid_price, ask_price, actual_spread
    FROM market_data_feed
    WHERE symbol = p_symbol
    ORDER BY timestamp DESC
    LIMIT 1;
  END IF;
  
  -- Use CORRECT entry price based on trade type
  IF p_trade_type = 'buy' THEN
    -- BUY trades execute at ASK price (higher price)
    actual_entry_price := COALESCE(p_entry_price, ask_price);
  ELSE
    -- SELL trades execute at BID price (lower price)
    actual_entry_price := COALESCE(p_entry_price, bid_price);
  END IF;
  
  -- Insert trade with CORRECT entry price
  INSERT INTO shadow_trades (
    portfolio_id,
    symbol,
    trade_type,
    lot_size,
    remaining_lot_size,
    entry_price,
    stop_loss,
    take_profit,
    status,
    entry_time,
    comment,
    magic_number,
    master_signal_id,
    position_size
  ) VALUES (
    p_portfolio_id,
    p_symbol,
    p_trade_type,
    p_lot_size,
    p_lot_size,
    actual_entry_price, -- CORRECT PRICE
    p_stop_loss,
    p_take_profit,
    'open',
    NOW(),
    COALESCE(p_comment, 'Advanced Order'),
    p_magic_number,
    p_signal_id,
    p_lot_size * 100000
  ) RETURNING id INTO trade_id;
  
  -- Build result
  result := jsonb_build_object(
    'success', true,
    'trade_id', trade_id,
    'entry_price', actual_entry_price,
    'bid', bid_price,
    'ask', ask_price,
    'spread_pips', actual_spread * 10000,
    'message', 'Trade executed with CORRECT ' || 
               CASE WHEN p_trade_type = 'buy' THEN 'ASK' ELSE 'BID' END || 
               ' price: ' || actual_entry_price::TEXT
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
