-- Phase 3: Fix ALL zero-profit trades in trade_history
UPDATE trade_history
SET profit = ROUND((profit_pips * lot_size * 10.0)::numeric, 2)
WHERE action_type IN ('close', 'partial_close')
  AND ROUND(profit::numeric, 2) = 0
  AND profit_pips IS NOT NULL
  AND profit_pips != 0;