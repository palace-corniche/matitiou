-- **PHASE 3: Database Integration - Add Intelligence Exit Columns**

-- Add exit intelligence columns to shadow_trades
ALTER TABLE shadow_trades 
ADD COLUMN IF NOT EXISTS exit_intelligence_score NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS exit_factors JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS intelligence_exit_triggered BOOLEAN DEFAULT false;

-- Create index for intelligence-based exit queries
CREATE INDEX IF NOT EXISTS idx_shadow_trades_intelligence_exit 
ON shadow_trades(status, intelligence_exit_triggered, exit_intelligence_score) 
WHERE status = 'open';

-- Log the change
COMMENT ON COLUMN shadow_trades.exit_intelligence_score IS 'Holistic intelligence score (0-100) calculated from all analysis modules';
COMMENT ON COLUMN shadow_trades.exit_factors IS 'Detailed breakdown of exit intelligence factors (confluence, trend, sentiment, etc.)';
COMMENT ON COLUMN shadow_trades.intelligence_exit_triggered IS 'Whether this trade was closed by intelligence system vs SL/TP';