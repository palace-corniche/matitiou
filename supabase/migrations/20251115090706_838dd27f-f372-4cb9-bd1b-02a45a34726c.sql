-- VERIFICATION: Check the results of our fixes
-- This will show us the impact of the PnL recalculation

-- Get summary statistics
SELECT 
  'FIXED STATS' as status,
  COUNT(*) as total_closed_trades,
  COUNT(*) FILTER (WHERE pnl != 0) as trades_with_pnl,
  COUNT(*) FILTER (WHERE pnl = 0) as trades_zero_pnl,
  COUNT(*) FILTER (WHERE commission > 0) as trades_with_commission,
  COUNT(*) FILTER (WHERE commission = 0 OR commission IS NULL) as trades_no_commission,
  ROUND(SUM(pnl)::numeric, 2) as total_pnl,
  ROUND(SUM(commission)::numeric, 2) as total_commission,
  ROUND(AVG(pnl)::numeric, 2) as avg_pnl_per_trade,
  COUNT(*) FILTER (WHERE pnl > 0) as winning_trades,
  COUNT(*) FILTER (WHERE pnl < 0) as losing_trades,
  ROUND((COUNT(*) FILTER (WHERE pnl > 0)::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC * 100)::numeric, 1) as win_rate_percent
FROM shadow_trades
WHERE status = 'closed'
  AND portfolio_id IS NULL;