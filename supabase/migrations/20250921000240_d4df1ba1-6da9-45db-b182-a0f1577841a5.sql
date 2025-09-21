-- Drop shadow_portfolios table completely
DROP TABLE IF EXISTS public.shadow_portfolios CASCADE;

-- Update functions to use proper search path
CREATE OR REPLACE FUNCTION public.get_global_trading_account()
RETURNS TABLE(
  id UUID,
  balance NUMERIC,
  equity NUMERIC,
  margin NUMERIC,
  free_margin NUMERIC,
  used_margin NUMERIC,
  margin_level NUMERIC,
  floating_pnl NUMERIC,
  total_trades INTEGER,
  winning_trades INTEGER,
  losing_trades INTEGER,
  win_rate NUMERIC,
  average_win NUMERIC,
  average_loss NUMERIC,
  profit_factor NUMERIC,
  max_drawdown NUMERIC,
  sharpe_ratio NUMERIC,
  peak_balance NUMERIC,
  max_equity NUMERIC,
  current_drawdown NUMERIC,
  consecutive_wins INTEGER,
  consecutive_losses INTEGER,
  largest_win NUMERIC,
  largest_loss NUMERIC,
  total_commission NUMERIC,
  total_swap NUMERIC,
  max_open_positions INTEGER,
  auto_trading_enabled BOOLEAN,
  leverage INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT * FROM public.global_trading_account 
  WHERE global_trading_account.id = '00000000-0000-0000-0000-000000000001';
END;
$function$;