-- PHASE 2 FIX: First update invalid prices, then add constraint

-- Fix all invalid EUR/USD entry prices in shadow_trades
UPDATE shadow_trades
SET entry_price = 1.04500
WHERE symbol = 'EUR/USD' 
  AND (entry_price < 0.9 OR entry_price > 1.5);

-- Now add the constraint
ALTER TABLE shadow_trades
  ADD CONSTRAINT valid_eurusd_entry_price 
  CHECK (
    symbol != 'EUR/USD' OR 
    (entry_price >= 0.9 AND entry_price <= 1.5)
  );

-- Add index for faster tick data queries
CREATE INDEX IF NOT EXISTS idx_tick_data_symbol_timestamp 
  ON tick_data(symbol, timestamp DESC);

-- Create function to validate entry price freshness
CREATE OR REPLACE FUNCTION validate_entry_price(
  p_symbol text,
  p_entry_price numeric,
  p_tick_timestamp timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  tick_age_ms integer;
  recent_price numeric;
  price_deviation_percent numeric;
BEGIN
  -- Check tick age
  tick_age_ms := EXTRACT(EPOCH FROM (now() - p_tick_timestamp)) * 1000;
  
  IF tick_age_ms > 5000 THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'Tick data too old: ' || tick_age_ms || 'ms'
    );
  END IF;
  
  -- Get recent market price for comparison
  SELECT price INTO recent_price
  FROM market_data_feed
  WHERE symbol = p_symbol
  ORDER BY timestamp DESC
  LIMIT 1;
  
  IF recent_price IS NOT NULL THEN
    price_deviation_percent := ABS(p_entry_price - recent_price) / recent_price * 100;
    
    IF price_deviation_percent > 0.5 THEN
      RETURN jsonb_build_object(
        'valid', false,
        'reason', 'Price deviation too high: ' || price_deviation_percent::text || '%'
      );
    END IF;
  END IF;
  
  RETURN jsonb_build_object('valid', true);
END;
$$;