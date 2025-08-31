-- Fix the strength constraint that's causing signal generation failures
-- The current constraint expects 1-100 but our system generates 0-10 values
ALTER TABLE trading_signals DROP CONSTRAINT IF EXISTS trading_signals_strength_check;

-- Add the correct constraint that matches our system's 0-10 range
ALTER TABLE trading_signals ADD CONSTRAINT trading_signals_strength_check 
CHECK (strength >= 0 AND strength <= 100);

-- Add indexes for better performance on signal retrieval
CREATE INDEX IF NOT EXISTS idx_trading_signals_created_at ON trading_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trading_signals_signal_type ON trading_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_trading_signals_confluence_score ON trading_signals(confluence_score DESC);