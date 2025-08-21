-- Phase 1: Fix the database constraint issue that's causing market data insertion failures
-- Add the missing unique constraint that the upsert operation expects
ALTER TABLE market_data_feed 
ADD CONSTRAINT market_data_feed_unique_constraint 
UNIQUE (symbol, timeframe, timestamp);

-- Also add an index for better performance on the constraint
CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timeframe_timestamp 
ON market_data_feed (symbol, timeframe, timestamp);