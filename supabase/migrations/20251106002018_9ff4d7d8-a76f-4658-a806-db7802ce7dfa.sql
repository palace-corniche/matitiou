-- Direct UPDATE without DO blocks - Phase 2: Fix corrupted trade
UPDATE shadow_trades
SET 
  entry_price = 1.14800,
  profit_pips = 1.5,
  profit = 0.15
WHERE id = '64c62b49-cf41-4ebb-bd16-b98f1026c6ed';

UPDATE trade_history
SET 
  execution_price = 1.14800,
  exit_price = 1.14815,
  profit_pips = 1.5,
  profit = 0.15
WHERE original_trade_id = '64c62b49-cf41-4ebb-bd16-b98f1026c6ed'
  AND action_type = 'close';