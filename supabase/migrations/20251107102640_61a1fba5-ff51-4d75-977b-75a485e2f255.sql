-- Phase 2: Backfill pnl = profit for closed trades and add trigger
-- This ensures pnl column always stays in sync with profit for closed trades

-- Backfill existing closed trades
UPDATE shadow_trades
SET pnl = profit
WHERE status = 'closed' 
  AND (pnl IS DISTINCT FROM profit OR pnl IS NULL);

-- Create trigger to auto-sync pnl with profit when trade closes
CREATE OR REPLACE FUNCTION sync_pnl_with_profit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'closed' THEN
    NEW.pnl := COALESCE(NEW.profit, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_pnl_with_profit ON shadow_trades;

-- Create trigger on shadow_trades
CREATE TRIGGER trigger_sync_pnl_with_profit
  BEFORE INSERT OR UPDATE ON shadow_trades
  FOR EACH ROW
  EXECUTE FUNCTION sync_pnl_with_profit();

-- Verify fix
DO $$
DECLARE
  zero_pnl_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO zero_pnl_count
  FROM shadow_trades
  WHERE status = 'closed'
    AND profit_pips != 0
    AND (pnl = 0 OR pnl IS NULL);
  
  RAISE NOTICE 'Remaining trades with profit_pips != 0 but pnl = 0: %', zero_pnl_count;
END $$;