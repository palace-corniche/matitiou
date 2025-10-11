-- Update reset_global_trading_account function to use $100 instead of $100,000
CREATE OR REPLACE FUNCTION public.reset_global_trading_account()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  record_count INTEGER;
  error_msg TEXT;
BEGIN
  BEGIN
    -- Clear data fast with TRUNCATE (bypasses RLS)
    TRUNCATE TABLE public.shadow_trades RESTART IDENTITY CASCADE;
    TRUNCATE TABLE public.trade_history RESTART IDENTITY CASCADE; 
    TRUNCATE TABLE public.account_history RESTART IDENTITY CASCADE;
    TRUNCATE TABLE public.pending_orders RESTART IDENTITY CASCADE;
    TRUNCATE TABLE public.account_transactions RESTART IDENTITY CASCADE;
    TRUNCATE TABLE public.performance_snapshots RESTART IDENTITY CASCADE;
    TRUNCATE TABLE public.trading_diagnostics RESTART IDENTITY CASCADE;

    -- Reset global account state to $100
    UPDATE public.global_trading_account 
    SET 
      balance = 100.00,
      equity = 100.00,
      margin = 0.00,
      free_margin = 100.00,
      used_margin = 0.00,
      margin_level = 0.00,
      floating_pnl = 0.00,
      total_trades = 0,
      winning_trades = 0,
      losing_trades = 0,
      win_rate = 0.00,
      average_win = 0.00,
      average_loss = 0.00,
      profit_factor = 0.00,
      max_drawdown = 0.00,
      sharpe_ratio = 0.00,
      peak_balance = 100.00,
      max_equity = 100.00,
      current_drawdown = 0.00,
      consecutive_wins = 0,
      consecutive_losses = 0,
      largest_win = 0.00,
      largest_loss = 0.00,
      total_commission = 0.00,
      total_swap = 0.00,
      updated_at = now()
    WHERE id = '00000000-0000-0000-0000-000000000001';

    -- Verify critical tables are clear
    SELECT COUNT(*) INTO record_count FROM public.shadow_trades;
    IF record_count > 0 THEN
      RAISE EXCEPTION 'Failed to clear shadow_trades: % records remaining', record_count;
    END IF;

    SELECT COUNT(*) INTO record_count FROM public.trade_history;
    IF record_count > 0 THEN
      RAISE EXCEPTION 'Failed to clear trade_history: % records remaining', record_count;
    END IF;

    -- Safe diagnostic log
    INSERT INTO public.trading_diagnostics (diagnostic_type, severity_level, metadata)
    VALUES ('reset_global_trading_account', 'info', jsonb_build_object('status','ok','timestamp', now()));

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Global trading account reset to $100 - all data cleared and verified',
      'timestamp', now()
    );

  EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM;

    -- Log error safely
    INSERT INTO public.trading_diagnostics (diagnostic_type, severity_level, error_message, metadata)
    VALUES ('reset_global_trading_account', 'error', error_msg, jsonb_build_object('timestamp', now()));

    RETURN jsonb_build_object(
      'success', false,
      'error', error_msg,
      'timestamp', now()
    );
  END;
END;
$function$;

-- Update current global account record to $100
UPDATE public.global_trading_account 
SET 
  balance = 100.00,
  equity = 100.00,
  free_margin = 100.00,
  peak_balance = 100.00,
  max_equity = 100.00,
  updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Update table column defaults for consistency
ALTER TABLE public.global_trading_account 
  ALTER COLUMN balance SET DEFAULT 100.00,
  ALTER COLUMN equity SET DEFAULT 100.00,
  ALTER COLUMN free_margin SET DEFAULT 100.00,
  ALTER COLUMN peak_balance SET DEFAULT 100.00,
  ALTER COLUMN max_equity SET DEFAULT 100.00;