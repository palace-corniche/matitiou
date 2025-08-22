-- Extend shadow_portfolios table with MetaTrader-like features
ALTER TABLE public.shadow_portfolios 
ADD COLUMN account_currency text NOT NULL DEFAULT 'USD',
ADD COLUMN leverage integer NOT NULL DEFAULT 100,
ADD COLUMN account_type text NOT NULL DEFAULT 'standard',
ADD COLUMN initial_deposit numeric NOT NULL DEFAULT 100000.00,
ADD COLUMN deposits_total numeric NOT NULL DEFAULT 0.00,
ADD COLUMN withdrawals_total numeric NOT NULL DEFAULT 0.00,
ADD COLUMN daily_loss_limit numeric NOT NULL DEFAULT 5000.00,
ADD COLUMN max_drawdown_limit numeric NOT NULL DEFAULT 20.00,
ADD COLUMN lot_size_type text NOT NULL DEFAULT 'standard',
ADD COLUMN custom_lot_multiplier numeric NOT NULL DEFAULT 1.0,
ADD COLUMN margin_call_level numeric NOT NULL DEFAULT 100.00,
ADD COLUMN stop_out_level numeric NOT NULL DEFAULT 20.00,
ADD COLUMN daily_pnl_today numeric NOT NULL DEFAULT 0.00,
ADD COLUMN last_daily_reset timestamp with time zone DEFAULT now();

-- Create account_transactions table for deposit/withdrawal history
CREATE TABLE public.account_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id uuid NOT NULL,
  transaction_type text NOT NULL, -- 'deposit', 'withdrawal', 'interest', 'rollover'
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  exchange_rate numeric DEFAULT 1.0,
  amount_in_account_currency numeric NOT NULL,
  description text,
  reference_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on account_transactions
ALTER TABLE public.account_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for account_transactions
CREATE POLICY "Users can view their own transactions" 
ON public.account_transactions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM shadow_portfolios sp 
  WHERE sp.id = account_transactions.portfolio_id 
  AND (
    (auth.uid() IS NOT NULL AND sp.user_id = auth.uid()) 
    OR (auth.uid() IS NULL AND sp.session_id IS NOT NULL)
  )
));

CREATE POLICY "Users can create their own transactions" 
ON public.account_transactions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM shadow_portfolios sp 
  WHERE sp.id = account_transactions.portfolio_id 
  AND (
    (auth.uid() IS NOT NULL AND sp.user_id = auth.uid()) 
    OR (auth.uid() IS NULL AND sp.session_id IS NOT NULL)
  )
));

-- Create trigger for updated_at on account_transactions
CREATE TRIGGER update_account_transactions_updated_at
BEFORE UPDATE ON public.account_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update shadow_trades table to include lot-based information
ALTER TABLE public.shadow_trades 
ADD COLUMN lot_size numeric NOT NULL DEFAULT 0.01,
ADD COLUMN pip_value numeric,
ADD COLUMN pip_pnl numeric,
ADD COLUMN margin_required numeric,
ADD COLUMN contract_size numeric NOT NULL DEFAULT 100000;