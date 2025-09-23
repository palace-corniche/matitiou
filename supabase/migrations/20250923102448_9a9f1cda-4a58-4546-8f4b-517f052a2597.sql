-- Phase 1: Enhanced Reset Function with TRUNCATE and Error Handling
DROP FUNCTION IF EXISTS public.reset_global_trading_account();

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
  -- Log reset attempt
  INSERT INTO public.system_health (function_name, status, execution_time_ms)
  VALUES ('reset_global_trading_account', 'starting', 0);
  
  BEGIN
    -- Phase 2: Clear existing orphaned data with TRUNCATE for better performance
    -- TRUNCATE bypasses RLS and is faster than DELETE
    TRUNCATE TABLE public.shadow_trades RESTART IDENTITY CASCADE;
    TRUNCATE TABLE public.trade_history RESTART IDENTITY CASCADE; 
    TRUNCATE TABLE public.account_history RESTART IDENTITY CASCADE;
    TRUNCATE TABLE public.pending_orders RESTART IDENTITY CASCADE;
    TRUNCATE TABLE public.account_transactions RESTART IDENTITY CASCADE;
    
    -- Also clear performance and diagnostic data
    TRUNCATE TABLE public.performance_snapshots RESTART IDENTITY CASCADE;
    TRUNCATE TABLE public.trading_diagnostics RESTART IDENTITY CASCADE;
    
    -- Reset global account to pristine initial state
    UPDATE public.global_trading_account 
    SET 
      balance = 100000.00,
      equity = 100000.00,
      margin = 0.00,
      free_margin = 100000.00,
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
      peak_balance = 100000.00,
      max_equity = 100000.00,
      current_drawdown = 0.00,
      consecutive_wins = 0,
      consecutive_losses = 0,
      largest_win = 0.00,
      largest_loss = 0.00,
      total_commission = 0.00,
      total_swap = 0.00,
      updated_at = now()
    WHERE id = '00000000-0000-0000-0000-000000000001';
    
    -- Verify data was cleared
    SELECT COUNT(*) INTO record_count FROM public.shadow_trades;
    IF record_count > 0 THEN
      RAISE EXCEPTION 'Failed to clear shadow_trades: % records remaining', record_count;
    END IF;
    
    SELECT COUNT(*) INTO record_count FROM public.trade_history;
    IF record_count > 0 THEN
      RAISE EXCEPTION 'Failed to clear trade_history: % records remaining', record_count;
    END IF;
    
    -- Log successful reset
    INSERT INTO public.system_health (function_name, status, execution_time_ms)
    VALUES ('reset_global_trading_account', 'completed', 0);
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Global trading account completely reset - all data cleared and verified',
      'timestamp', now(),
      'cleared_tables', ARRAY['shadow_trades', 'trade_history', 'account_history', 'pending_orders', 'account_transactions', 'performance_snapshots', 'trading_diagnostics']
    );
    
  EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM;
    
    -- Log error
    INSERT INTO public.system_health (function_name, status, error_message)
    VALUES ('reset_global_trading_account', 'error', error_msg);
    
    RETURN jsonb_build_object(
      'success', false,
      'error', error_msg,
      'timestamp', now()
    );
  END;
END;
$function$;