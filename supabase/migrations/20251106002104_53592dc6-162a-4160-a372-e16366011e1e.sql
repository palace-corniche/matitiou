-- Phase 5: Update global account statistics
UPDATE global_trading_account
SET
  total_trades = (SELECT COUNT(*) FROM shadow_trades WHERE status = 'closed'),
  winning_trades = (SELECT COUNT(*) FROM shadow_trades WHERE status = 'closed' AND profit > 0),
  losing_trades = (SELECT COUNT(*) FROM shadow_trades WHERE status = 'closed' AND profit < 0),
  win_rate = ROUND((
    (SELECT COUNT(*)::NUMERIC FROM shadow_trades WHERE status = 'closed' AND profit > 0) / 
    NULLIF((SELECT COUNT(*) FROM shadow_trades WHERE status = 'closed'), 0) * 100
  )::numeric, 2),
  average_win = (SELECT ROUND(AVG(profit)::numeric, 2) FROM shadow_trades WHERE status = 'closed' AND profit > 0),
  average_loss = (SELECT ROUND(AVG(profit)::numeric, 2) FROM shadow_trades WHERE status = 'closed' AND profit < 0),
  largest_win = (SELECT MAX(profit) FROM shadow_trades WHERE status = 'closed'),
  largest_loss = (SELECT MIN(profit) FROM shadow_trades WHERE status = 'closed'),
  profit_factor = CASE
    WHEN (SELECT SUM(ABS(profit)) FROM shadow_trades WHERE status = 'closed' AND profit < 0) > 0
    THEN ROUND(((SELECT SUM(profit) FROM shadow_trades WHERE status = 'closed' AND profit > 0) /
         (SELECT SUM(ABS(profit)) FROM shadow_trades WHERE status = 'closed' AND profit < 0))::numeric, 2)
    ELSE 0
  END
WHERE id = '00000000-0000-0000-0000-000000000001';