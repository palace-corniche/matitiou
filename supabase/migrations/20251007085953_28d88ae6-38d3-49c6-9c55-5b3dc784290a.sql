-- **PHASE 2: Create account_defaults for global trading account**
INSERT INTO public.account_defaults (
  portfolio_id,
  default_lot_size,
  risk_per_trade_percent,
  max_spread_pips,
  auto_lot_sizing,
  auto_sl_tp,
  default_sl_pips,
  default_tp_pips,
  max_open_trades,
  trading_hours_enabled,
  trading_start_hour,
  trading_end_hour,
  allowed_symbols,
  blacklist_symbols
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  0.01,  -- Max 0.01 lot size
  0.5,   -- 0.5% risk per trade (conservative)
  3.0,
  false,
  false,
  50,
  100,
  10,
  false,
  8,
  17,
  ARRAY['EUR/USD', 'GBP/USD', 'USD/JPY'],
  ARRAY[]::text[]
)
ON CONFLICT (portfolio_id) 
DO UPDATE SET
  default_lot_size = 0.01,
  risk_per_trade_percent = 0.5,
  updated_at = now();