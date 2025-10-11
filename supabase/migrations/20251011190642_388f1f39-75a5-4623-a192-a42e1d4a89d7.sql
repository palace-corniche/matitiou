-- Delete orphan closed trades with zero PnL (test noise)
DELETE FROM shadow_trades 
WHERE status = 'closed' 
  AND NOT EXISTS (
    SELECT 1 FROM trade_history 
    WHERE original_trade_id = shadow_trades.id 
      AND action_type IN ('close', 'partial_close')
  )
  AND COALESCE(pnl, 0) = 0 
  AND COALESCE(profit_pips, 0) = 0;

-- Create helper function for auto-sync trigger
CREATE OR REPLACE FUNCTION public._recalc_global_after_trade_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only sync for global portfolio closes
  IF NEW.portfolio_id = '00000000-0000-0000-0000-000000000001' 
     AND NEW.action_type IN ('close', 'partial_close') THEN
    PERFORM calculate_global_performance_metrics();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-sync on trade_history inserts
DROP TRIGGER IF EXISTS trigger_sync_global_on_trade_close ON trade_history;
CREATE TRIGGER trigger_sync_global_on_trade_close
  AFTER INSERT ON trade_history
  FOR EACH ROW
  EXECUTE FUNCTION _recalc_global_after_trade_history();

-- Run initial sync to current state
SELECT calculate_global_performance_metrics();