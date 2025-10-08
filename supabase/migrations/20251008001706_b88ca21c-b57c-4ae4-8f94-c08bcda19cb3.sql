-- **PHASE 3: Database Cleanup**

-- Drop the lot size validation triggers
DROP TRIGGER IF EXISTS validate_global_lot_size_insert ON shadow_trades;
DROP TRIGGER IF EXISTS validate_global_lot_size_update ON shadow_trades;

-- Drop the validation function
DROP FUNCTION IF EXISTS validate_global_account_lot_size();

-- Add index for signal recovery queries (improves performance)
CREATE INDEX IF NOT EXISTS idx_trading_signals_recovery 
ON trading_signals(was_executed, created_at DESC) 
WHERE was_executed = false;

-- Log the cleanup
COMMENT ON INDEX idx_trading_signals_recovery IS 'Index for efficient recovery of unexecuted signals (Phase 3)';
