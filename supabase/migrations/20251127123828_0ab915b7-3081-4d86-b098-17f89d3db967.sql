-- Create account defaults for faster trade exits with $2-3 targets
INSERT INTO account_defaults (
  default_lot_size,
  default_stop_loss_pips,
  default_take_profit_pips,
  risk_percentage,
  max_open_positions,
  max_daily_trades
) VALUES (
  0.01,  -- $0.10 per pip
  20,    -- 20 pip SL = $2 risk
  25,    -- 25 pip TP = $2.50 profit (optimized for fast 2-3 USD targets)
  1.0,   -- 1% risk per trade
  3,     -- Max 3 positions
  10     -- Max 10 trades per day
) ON CONFLICT DO NOTHING;