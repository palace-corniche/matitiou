-- Phase 4: Rebuild balance history chronologically
DO $$
DECLARE
  running_balance NUMERIC := 100.00;
  running_equity NUMERIC := 100.00;
  trade_record RECORD;
BEGIN
  FOR trade_record IN 
    SELECT id, action_type, profit, execution_time
    FROM trade_history 
    WHERE action_type IN ('open', 'close', 'partial_close')
    ORDER BY execution_time ASC, created_at ASC
  LOOP
    UPDATE trade_history
    SET 
      balance_before = running_balance,
      equity_before = running_equity
    WHERE id = trade_record.id;
    
    IF trade_record.action_type IN ('close', 'partial_close') THEN
      running_balance := running_balance + COALESCE(trade_record.profit, 0);
      running_equity := running_balance;
    END IF;
    
    UPDATE trade_history
    SET 
      balance_after = running_balance,
      equity_after = running_equity
    WHERE id = trade_record.id;
  END LOOP;
  
  UPDATE global_trading_account
  SET 
    balance = running_balance,
    equity = running_equity
  WHERE id = '00000000-0000-0000-0000-000000000001';
END $$;