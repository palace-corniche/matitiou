-- Fix security issues from Phase 3 migration

-- Fix function search paths for security
ALTER FUNCTION calculate_eurusd_pnl SET search_path = 'public';
ALTER FUNCTION update_eurusd_pnl SET search_path = 'public';
ALTER FUNCTION archive_old_trades SET search_path = 'public';
ALTER FUNCTION run_trading_diagnostics SET search_path = 'public';

-- Enable RLS on trading_diagnostics (already done but ensuring)
ALTER TABLE trading_diagnostics ENABLE ROW LEVEL SECURITY;