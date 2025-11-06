-- Phase 3: Fix ALL zero-profit trades in shadow_trades
UPDATE shadow_trades
SET profit = ROUND((profit_pips * lot_size * 10.0)::numeric, 2)
WHERE status = 'closed' 
  AND ROUND(profit::numeric, 2) = 0
  AND profit_pips IS NOT NULL
  AND profit_pips != 0;