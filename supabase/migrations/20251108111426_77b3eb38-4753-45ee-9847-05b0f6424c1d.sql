-- Add price source tracking columns to shadow_trades
ALTER TABLE shadow_trades 
ADD COLUMN IF NOT EXISTS price_source TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS price_timestamp TIMESTAMPTZ;

-- Update existing trades to mark them as legacy
UPDATE shadow_trades
SET price_source = 'legacy',
    price_timestamp = entry_time
WHERE price_source IS NULL OR price_source = 'unknown';

-- Add comment
COMMENT ON COLUMN shadow_trades.price_source IS 'Source of price data: market_data_feed, tick_data, or legacy';
COMMENT ON COLUMN shadow_trades.price_timestamp IS 'Timestamp of the price data used for entry';