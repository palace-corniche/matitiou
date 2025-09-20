-- Create single global trading account
CREATE TABLE IF NOT EXISTS public.global_trading_account (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance NUMERIC NOT NULL DEFAULT 100000.00,
  equity NUMERIC NOT NULL DEFAULT 100000.00,
  margin NUMERIC NOT NULL DEFAULT 0.00,
  free_margin NUMERIC NOT NULL DEFAULT 100000.00,
  used_margin NUMERIC NOT NULL DEFAULT 0.00,
  margin_level NUMERIC NOT NULL DEFAULT 0.00,
  floating_pnl NUMERIC NOT NULL DEFAULT 0.00,
  total_trades INTEGER NOT NULL DEFAULT 0,
  winning_trades INTEGER NOT NULL DEFAULT 0,
  losing_trades INTEGER NOT NULL DEFAULT 0,
  win_rate NUMERIC NOT NULL DEFAULT 0.00,
  average_win NUMERIC NOT NULL DEFAULT 0.00,
  average_loss NUMERIC NOT NULL DEFAULT 0.00,
  profit_factor NUMERIC NOT NULL DEFAULT 0.00,
  max_drawdown NUMERIC NOT NULL DEFAULT 0.00,
  sharpe_ratio NUMERIC NOT NULL DEFAULT 0.00,
  peak_balance NUMERIC NOT NULL DEFAULT 100000.00,
  max_equity NUMERIC NOT NULL DEFAULT 100000.00,
  current_drawdown NUMERIC NOT NULL DEFAULT 0.00,
  consecutive_wins INTEGER NOT NULL DEFAULT 0,
  consecutive_losses INTEGER NOT NULL DEFAULT 0,
  largest_win NUMERIC NOT NULL DEFAULT 0.00,
  largest_loss NUMERIC NOT NULL DEFAULT 0.00,
  total_commission NUMERIC NOT NULL DEFAULT 0.00,
  total_swap NUMERIC NOT NULL DEFAULT 0.00,
  max_open_positions INTEGER NOT NULL DEFAULT 50,
  auto_trading_enabled BOOLEAN NOT NULL DEFAULT true,
  leverage INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS and allow public access
ALTER TABLE public.global_trading_account ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view global trading account" ON public.global_trading_account FOR SELECT USING (true);
CREATE POLICY "System can manage global trading account" ON public.global_trading_account FOR ALL USING (true);

-- Insert the single global account
INSERT INTO public.global_trading_account (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Remove portfolio_id dependency from shadow_trades
ALTER TABLE public.shadow_trades DROP CONSTRAINT IF EXISTS shadow_trades_portfolio_id_fkey;
ALTER TABLE public.shadow_trades ALTER COLUMN portfolio_id DROP NOT NULL;

-- Update existing trades to reference global account
UPDATE public.shadow_trades SET portfolio_id = '00000000-0000-0000-0000-000000000001';

-- Remove portfolio references from other tables
ALTER TABLE public.trade_history DROP CONSTRAINT IF EXISTS trade_history_portfolio_id_fkey;
ALTER TABLE public.trade_history ALTER COLUMN portfolio_id DROP NOT NULL;
UPDATE public.trade_history SET portfolio_id = '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.account_history DROP CONSTRAINT IF EXISTS account_history_portfolio_id_fkey;
ALTER TABLE public.account_history ALTER COLUMN portfolio_id DROP NOT NULL;
UPDATE public.account_history SET portfolio_id = '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.pending_orders DROP CONSTRAINT IF EXISTS pending_orders_portfolio_id_fkey;
ALTER TABLE public.pending_orders ALTER COLUMN portfolio_id DROP NOT NULL;
UPDATE public.pending_orders SET portfolio_id = '00000000-0000-0000-0000-000000000001';

-- Update RLS policies for global access
DROP POLICY IF EXISTS "Users can view their own trades" ON public.shadow_trades;
DROP POLICY IF EXISTS "Users can manage their own trades" ON public.shadow_trades;
CREATE POLICY "Anyone can view trades" ON public.shadow_trades FOR SELECT USING (true);
CREATE POLICY "System can manage trades" ON public.shadow_trades FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can view their own trade history" ON public.trade_history;
DROP POLICY IF EXISTS "System can manage trade history" ON public.trade_history;
CREATE POLICY "Anyone can view trade history" ON public.trade_history FOR SELECT USING (true);
CREATE POLICY "System can manage trade history" ON public.trade_history FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can view their pending orders" ON public.pending_orders;
DROP POLICY IF EXISTS "Users can manage their pending orders" ON public.pending_orders;
CREATE POLICY "Anyone can view pending orders" ON public.pending_orders FOR SELECT USING (true);
CREATE POLICY "System can manage pending orders" ON public.pending_orders FOR ALL USING (true);

-- Create function to get global account
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
AS $function$
BEGIN
  RETURN QUERY
  SELECT * FROM public.global_trading_account 
  WHERE global_trading_account.id = '00000000-0000-0000-0000-000000000001';
END;
$function$;

-- Create function to reset global account
CREATE OR REPLACE FUNCTION public.reset_global_trading_account()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Delete all trades and history
  DELETE FROM public.shadow_trades;
  DELETE FROM public.trade_history;
  DELETE FROM public.account_history;
  DELETE FROM public.pending_orders;
  
  -- Reset global account to initial state
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
    'message', 'Global trading account reset successfully'
  );
END;
$function$;