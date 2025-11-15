-- PHASE 2 FIX: Recalculate ALL historical closed trades with correct formulas
-- This fixes the broken PnL calculations and adds missing commissions

-- Step 1: Recalculate profit_pips using the correct formula
UPDATE shadow_trades
SET profit_pips = CASE 
  WHEN trade_type = 'buy' THEN 
    ROUND(((exit_price - entry_price) / 0.0001)::numeric, 1)
  WHEN trade_type = 'sell' THEN 
    ROUND(((entry_price - exit_price) / 0.0001)::numeric, 1)
  ELSE 0
END
WHERE status = 'closed' 
  AND exit_price IS NOT NULL 
  AND entry_price IS NOT NULL;

-- Step 2: Add missing commission ($50 per full lot = $0.50 per 0.01 lot)
UPDATE shadow_trades
SET commission = lot_size * 50
WHERE status = 'closed' 
  AND (commission IS NULL OR commission = 0);

-- Step 3: Recalculate pnl = (pips × $10/pip × lot_size) - commission
UPDATE shadow_trades
SET pnl = (profit_pips * 10 * lot_size) - commission
WHERE status = 'closed' 
  AND profit_pips IS NOT NULL 
  AND commission IS NOT NULL;

-- Step 4: Fix trades where pnl is zero but price moved
UPDATE shadow_trades
SET 
  profit_pips = CASE 
    WHEN trade_type = 'buy' THEN 
      ROUND(((exit_price - entry_price) / 0.0001)::numeric, 1)
    WHEN trade_type = 'sell' THEN 
      ROUND(((entry_price - exit_price) / 0.0001)::numeric, 1)
    ELSE 0
  END,
  commission = lot_size * 50,
  pnl = (
    CASE 
      WHEN trade_type = 'buy' THEN 
        ((exit_price - entry_price) / 0.0001) * 10 * lot_size
      WHEN trade_type = 'sell' THEN 
        ((entry_price - exit_price) / 0.0001) * 10 * lot_size
      ELSE 0
    END
  ) - (lot_size * 50)
WHERE status = 'closed' 
  AND exit_price IS NOT NULL
  AND (pnl IS NULL OR pnl = 0)
  AND ABS(exit_price - entry_price) > 0.00001;