
CREATE TABLE IF NOT EXISTS public.trading_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.trading_config TO anon, authenticated;
GRANT ALL ON public.trading_config TO service_role;

ALTER TABLE public.trading_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trading_config readable by all"
  ON public.trading_config FOR SELECT
  USING (true);

CREATE TRIGGER trading_config_set_updated_at
  BEFORE UPDATE ON public.trading_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.trading_config (key, value)
VALUES ('invert_signals', 'false')
ON CONFLICT (key) DO NOTHING;
