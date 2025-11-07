-- Phase 4: Rebuild balance history chronologically using corrected profits

DO $$
DECLARE
  running_balance NUMERIC := 100.00;
  running_equity NUMERIC := 100.00;
  trade_record RECORD;
  trades_processed INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting balance rebuild from base $100.00';

  -- Process all closed trades chronologically
  FOR trade_record IN 
    SELECT id, profit, exit_time, symbol, trade_type
    FROM shadow_trades 
    WHERE status = 'closed'
      AND exit_reason != 'duplicate_cleanup'
    ORDER BY exit_time ASC, created_at ASC
  LOOP
    -- Update trade_history for this trade
    UPDATE trade_history
    SET 
      balance_before = running_balance,
      equity_before = running_equity
    WHERE original_trade_id = trade_record.id
      AND action_type = 'close';
    
    -- Apply profit to balances
    running_balance := running_balance + COALESCE(trade_record.profit, 0);
    running_equity := running_balance;
    
    -- Update after balances
    UPDATE trade_history
    SET 
      balance_after = running_balance,
      equity_after = running_equity
    WHERE original_trade_id = trade_record.id
      AND action_type = 'close';

    trades_processed := trades_processed + 1;
  END LOOP;
  
  RAISE NOTICE 'Processed % trades', trades_processed;
  RAISE NOTICE 'Final balance: $%', running_balance;
  
  -- Update global_trading_account
  UPDATE global_trading_account
  SET 
    balance = running_balance,
    equity = running_equity,
    updated_at = now()
  WHERE id = '00000000-0000-0000-0000-000000000001';

  RAISE NOTICE '✅ Balance rebuild complete';
END $$;