INSERT INTO public.trading_config (key, value)
VALUES 
  ('adaptive_sl', 'false'),
  ('adaptive_sl_multiplier', '1.3')
ON CONFLICT (key) DO NOTHING;