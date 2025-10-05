
-- ========================================
-- STEP D: Fix Exit Reason Constraint + Schedule P&L Cron
-- ========================================

-- 1. Update exit_reason constraint to match new dynamic exit reasons
ALTER TABLE shadow_trades DROP CONSTRAINT IF EXISTS shadow_trades_exit_reason_check;

ALTER TABLE shadow_trades 
ADD CONSTRAINT shadow_trades_exit_reason_check 
CHECK (exit_reason IN (
  'manual',
  'stop_loss',
  'take_profit',
  'opposing_signal',
  'sr_rejection',
  'trend_reversal',
  'news_event',
  'volatility_spike',
  'quick_profit_10',
  'trailing_stop',
  '15_pips_profit',
  'adaptive_time_exit'
));

-- 2. Schedule update_eurusd_pnl to run every 30 seconds
SELECT cron.schedule(
  'update-pnl-30s',
  '*/1 * * * *', -- Every minute (Supabase cron minimum is 1 min)
  $$
  SELECT update_eurusd_pnl();
  $$
);

-- 3. Verify cron jobs are active
SELECT jobname, schedule, active 
FROM cron.job 
WHERE jobname IN ('auto-detect-sr-15min', 'update-pnl-30s')
ORDER BY jobname;
