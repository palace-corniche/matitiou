
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.clean_unrealistic_trades()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer := 0;
  v_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_ids
  FROM public.shadow_trades
  WHERE status = 'closed'
    AND symbol = 'EUR/USD'
    AND ABS(COALESCE(profit_pips, 0)) > 200;

  IF v_ids IS NOT NULL AND array_length(v_ids,1) > 0 THEN
    DELETE FROM public.exit_intelligence WHERE trade_id = ANY(v_ids);
    DELETE FROM public.trade_execution_log WHERE trade_id = ANY(v_ids);
    BEGIN
      DELETE FROM public.signal_execution_attempts WHERE trade_id = ANY(v_ids);
    EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
    END;
    BEGIN
      DELETE FROM public.intelligent_targets WHERE trade_id = ANY(v_ids);
    EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
    END;
    DELETE FROM public.shadow_trades WHERE id = ANY(v_ids);
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('deleted', v_deleted, 'ids', COALESCE(v_ids, ARRAY[]::uuid[]));
END;
$$;

CREATE OR REPLACE FUNCTION public.rebuild_global_account_stats(p_starting_balance numeric DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acct_id uuid := '00000000-0000-0000-0000-000000000001';
  v_total_pnl numeric;
  v_wins integer; v_losses integer; v_total integer;
  v_largest_win numeric; v_largest_loss numeric;
  v_avg_win numeric; v_avg_loss numeric;
  v_pf numeric; v_new_balance numeric;
BEGIN
  SELECT
    COALESCE(SUM(pnl), 0),
    COUNT(*) FILTER (WHERE pnl > 0),
    COUNT(*) FILTER (WHERE pnl <= 0),
    COUNT(*),
    COALESCE(MAX(pnl) FILTER (WHERE pnl > 0), 0),
    COALESCE(MIN(pnl) FILTER (WHERE pnl <= 0), 0),
    COALESCE(AVG(pnl) FILTER (WHERE pnl > 0), 0),
    COALESCE(AVG(pnl) FILTER (WHERE pnl <= 0), 0)
  INTO v_total_pnl, v_wins, v_losses, v_total, v_largest_win, v_largest_loss, v_avg_win, v_avg_loss
  FROM public.shadow_trades WHERE status = 'closed';

  v_pf := CASE WHEN v_avg_loss <> 0 AND v_losses > 0
            THEN ABS((v_avg_win * v_wins) / NULLIF(v_avg_loss * v_losses, 0))
            ELSE 0 END;
  v_new_balance := p_starting_balance + v_total_pnl;

  UPDATE public.global_trading_account
  SET balance = v_new_balance, equity = v_new_balance,
      free_margin = v_new_balance, used_margin = 0, margin = 0, margin_level = 0,
      total_trades = v_total, winning_trades = v_wins, losing_trades = v_losses,
      win_rate = CASE WHEN v_total > 0 THEN (v_wins::numeric / v_total) * 100 ELSE 0 END,
      total_pnl = v_total_pnl, largest_win = v_largest_win, largest_loss = v_largest_loss,
      average_win = v_avg_win, average_loss = v_avg_loss, profit_factor = v_pf,
      peak_balance = GREATEST(COALESCE(peak_balance, 0), v_new_balance),
      updated_at = now()
  WHERE id = v_acct_id;

  RETURN jsonb_build_object('balance', v_new_balance, 'total_pnl', v_total_pnl,
    'trades', v_total, 'wins', v_wins, 'losses', v_losses);
END;
$$;

SELECT public.clean_unrealistic_trades();
SELECT public.rebuild_global_account_stats(100);

DO $$ BEGIN
  PERFORM cron.unschedule('cleanup-unrealistic-trades-15m');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'cleanup-unrealistic-trades-15m',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://gbqjwfgagkuemjntfazg.supabase.co/functions/v1/cleanup-unrealistic-trades',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdicWp3ZmdhZ2t1ZW1qbnRmYXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjY0NTIsImV4cCI6MjA4ODIwMjQ1Mn0.IQLhxNTtHiDFFGnMK-LqIKbmK8e9MlseasV6Fkln3vQ"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $$
);
