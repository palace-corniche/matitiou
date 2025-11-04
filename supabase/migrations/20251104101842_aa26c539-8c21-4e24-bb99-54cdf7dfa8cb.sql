
-- Add intelligent targeting columns to shadow_trades table
ALTER TABLE shadow_trades 
ADD COLUMN IF NOT EXISTS take_profit_1 NUMERIC,
ADD COLUMN IF NOT EXISTS take_profit_2 NUMERIC,
ADD COLUMN IF NOT EXISTS take_profit_3 NUMERIC,
ADD COLUMN IF NOT EXISTS target_confidence NUMERIC,
ADD COLUMN IF NOT EXISTS target_reasoning TEXT,
ADD COLUMN IF NOT EXISTS key_levels JSONB;

-- Update existing trades to use TP1 as primary TP
UPDATE shadow_trades 
SET take_profit_1 = take_profit 
WHERE take_profit_1 IS NULL AND take_profit IS NOT NULL;

COMMENT ON COLUMN shadow_trades.take_profit_1 IS 'First take profit level from intelligent targeting';
COMMENT ON COLUMN shadow_trades.take_profit_2 IS 'Second take profit level from intelligent targeting';
COMMENT ON COLUMN shadow_trades.take_profit_3 IS 'Third take profit level from intelligent targeting';
COMMENT ON COLUMN shadow_trades.target_confidence IS 'Confidence score (0-100) for the calculated targets';
COMMENT ON COLUMN shadow_trades.target_reasoning IS 'Human-readable explanation of target calculation';
COMMENT ON COLUMN shadow_trades.key_levels IS 'Array of key price levels used in target calculation';
