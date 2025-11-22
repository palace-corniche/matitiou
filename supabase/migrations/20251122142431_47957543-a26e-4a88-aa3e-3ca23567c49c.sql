-- Add trade monitoring columns to shadow_trades
ALTER TABLE public.shadow_trades 
ADD COLUMN IF NOT EXISTS current_price NUMERIC,
ADD COLUMN IF NOT EXISTS last_pnl_update TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS exit_check_count INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shadow_trades_status_open 
ON public.shadow_trades(status) WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_shadow_trades_entry_time 
ON public.shadow_trades(entry_time);

-- Create function to update PnL for all open trades
CREATE OR REPLACE FUNCTION public.update_open_trades_pnl()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_price NUMERIC;
  v_trade RECORD;
  v_updated_count INTEGER := 0;
  v_pips NUMERIC;
  v_pip_value NUMERIC;
  v_gross_pnl NUMERIC;
  v_commission NUMERIC;
  v_net_pnl NUMERIC;
BEGIN
  -- Get latest EUR/USD price
  SELECT price INTO v_current_price
  FROM public.market_data_feed
  WHERE symbol = 'EUR/USD'
  ORDER BY timestamp DESC
  LIMIT 1;

  IF v_current_price IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No market price available'
    );
  END IF;

  -- Update all open trades
  FOR v_trade IN 
    SELECT * FROM public.shadow_trades 
    WHERE status = 'open'
  LOOP
    -- Calculate pips
    IF v_trade.trade_type = 'buy' THEN
      v_pips := (v_current_price - v_trade.entry_price) / 0.0001;
    ELSE
      v_pips := (v_trade.entry_price - v_current_price) / 0.0001;
    END IF;

    -- Calculate pip value and PnL
    v_pip_value := v_trade.lot_size * 10; -- $10 per pip per lot for EUR/USD
    v_gross_pnl := v_pips * v_pip_value;
    v_commission := v_trade.lot_size * 50; -- $50 per lot
    v_net_pnl := v_gross_pnl - v_commission;

    -- Update trade
    UPDATE public.shadow_trades
    SET 
      current_price = v_current_price,
      pnl = v_net_pnl,
      profit_pips = v_pips,
      last_pnl_update = NOW()
    WHERE id = v_trade.id;

    v_updated_count := v_updated_count + 1;
  END LOOP;

  -- Update global account equity
  UPDATE public.global_trading_account
  SET 
    equity = balance + (
      SELECT COALESCE(SUM(pnl), 0)
      FROM public.shadow_trades
      WHERE status = 'open'
    ),
    updated_at = NOW()
  WHERE id = '00000000-0000-0000-0000-000000000001';

  RETURN jsonb_build_object(
    'success', true,
    'trades_updated', v_updated_count,
    'current_price', v_current_price,
    'timestamp', NOW()
  );
END;
$$;

-- Set up cron jobs for trade monitoring
SELECT cron.schedule(
  'update-open-trades-pnl',
  '* * * * *', -- Every minute
  $$
  SELECT net.http_post(
    url := 'https://jnhyixrkevphmbkrkdjx.supabase.co/functions/v1/update-open-trades-pnl',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaHlpeHJrZXZwaG1ia3JrZGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyODAyNTYsImV4cCI6MjA3ODg1NjI1Nn0.3MM_IvEOvJt9dE6MPFCndFmsxtqd2bnD3RH0pGVEsCg"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'check-trade-exits',
  '* * * * *', -- Every minute
  $$
  SELECT net.http_post(
    url := 'https://jnhyixrkevphmbkrkdjx.supabase.co/functions/v1/check-trade-exits',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaHlpeHJrZXZwaG1ia3JrZGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyODAyNTYsImV4cCI6MjA3ODg1NjI1Nn0.3MM_IvEOvJt9dE6MPFCndFmsxtqd2bnD3RH0pGVEsCg"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'monitor-exit-intelligence',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://jnhyixrkevphmbkrkdjx.supabase.co/functions/v1/monitor-exit-intelligence',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaHlpeHJrZXZwaG1ia3JrZGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyODAyNTYsImV4cCI6MjA3ODg1NjI1Nn0.3MM_IvEOvJt9dE6MPFCndFmsxtqd2bnD3RH0pGVEsCg"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);