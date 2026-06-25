CREATE POLICY "trading_config writable by all" ON public.trading_config FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trading_config TO anon, authenticated;
GRANT ALL ON public.trading_config TO service_role;