-- Fix the reset function with proper WHERE clauses
DROP FUNCTION IF EXISTS public.reset_global_trading_account();

CREATE OR REPLACE FUNCTION public.reset_global_trading_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete ALL trades and history with proper WHERE clauses
  DELETE FROM public.shadow_trades WHERE id IS NOT NULL;
  DELETE FROM public.trade_history WHERE id IS NOT NULL;
  DELETE FROM public.account_history WHERE id IS NOT NULL;
  DELETE FROM public.pending_orders WHERE id IS NOT NULL;
  DELETE FROM public.account_transactions WHERE id IS NOT NULL;
  
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
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Global trading account completely reset - all data cleared',
    'timestamp', now()
  );
END;
$function$;