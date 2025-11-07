-- Phase 5: Update global account statistics with corrected data

UPDATE global_trading_account
SET
  total_trades = (SELECT COUNT(*) FROM shadow_trades WHERE status = 'closed' AND exit_reason != 'duplicate_cleanup'),
  winning_trades = (SELECT COUNT(*) FROM shadow_trades WHERE status = 'closed' AND exit_reason != 'duplicate_cleanup' AND profit > 0),
  losing_trades = (SELECT COUNT(*) FROM shadow_trades WHERE status = 'closed' AND exit_reason != 'duplicate_cleanup' AND profit < 0),
  win_rate = ROUND((
    (SELECT COUNT(*)::NUMERIC FROM shadow_trades WHERE status = 'closed' AND exit_reason != 'duplicate_cleanup' AND profit > 0) / 
    NULLIF((SELECT COUNT(*) FROM shadow_trades WHERE status = 'closed' AND exit_reason != 'duplicate_cleanup'), 0) * 100
  )::numeric, 2),
  average_win = (SELECT ROUND(AVG(profit)::numeric, 2) FROM shadow_trades WHERE status = 'closed' AND exit_reason != 'duplicate_cleanup' AND profit > 0),
  average_loss = (SELECT ROUND(AVG(profit)::numeric, 2) FROM shadow_trades WHERE status = 'closed' AND exit_reason != 'duplicate_cleanup' AND profit < 0),
  largest_win = (SELECT MAX(profit) FROM shadow_trades WHERE status = 'closed' AND exit_reason != 'duplicate_cleanup'),
  largest_loss = (SELECT MIN(profit) FROM shadow_trades WHERE status = 'closed' AND exit_reason != 'duplicate_cleanup'),
  profit_factor = CASE
    WHEN (SELECT SUM(ABS(profit)) FROM shadow_trades WHERE status = 'closed' AND exit_reason != 'duplicate_cleanup' AND profit < 0) > 0
    THEN ROUND(((SELECT SUM(profit) FROM shadow_trades WHERE status = 'closed' AND exit_reason != 'duplicate_cleanup' AND profit > 0) /
         (SELECT SUM(ABS(profit)) FROM shadow_trades WHERE status = 'closed' AND exit_reason != 'duplicate_cleanup' AND profit < 0))::numeric, 2)
    ELSE 0
  END,
  updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Log completion
DO $$
DECLARE
  account_balance NUMERIC;
  total_pnl NUMERIC;
BEGIN
  SELECT balance INTO account_balance 
  FROM global_trading_account 
  WHERE id = '00000000-0000-0000-0000-000000000001';
  
  SELECT SUM(profit) INTO total_pnl
  FROM shadow_trades
  WHERE status = 'closed' AND exit_reason != 'duplicate_cleanup';
  
  RAISE NOTICE '✅ All phases complete!';
  RAISE NOTICE '   Account balance: $%', account_balance;
  RAISE NOTICE '   Total P&L from trades: $%', total_pnl;
  RAISE NOTICE '   Expected balance: $%', 100.00 + total_pnl;
END $$;