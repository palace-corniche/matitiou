-- Create the missing shadow_portfolios table needed for trade execution
CREATE TABLE IF NOT EXISTS public.shadow_portfolios (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    portfolio_name TEXT NOT NULL DEFAULT 'Global Trading Account',
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
    max_open_positions INTEGER NOT NULL DEFAULT 10,
    auto_trading_enabled BOOLEAN NOT NULL DEFAULT true,
    leverage INTEGER NOT NULL DEFAULT 100,
    initial_deposit NUMERIC NOT NULL DEFAULT 100000.00,
    last_trade_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on shadow_portfolios
ALTER TABLE public.shadow_portfolios ENABLE ROW LEVEL SECURITY;

-- Create policies for shadow_portfolios
CREATE POLICY "System can manage shadow portfolios" 
ON public.shadow_portfolios 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view shadow portfolios" 
ON public.shadow_portfolios 
FOR SELECT 
USING (true);

-- Insert the default global trading account
INSERT INTO public.shadow_portfolios (
    id, 
    portfolio_name, 
    balance, 
    equity, 
    free_margin, 
    peak_balance, 
    max_equity,
    initial_deposit
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Global Trading Account',
    100000.00,
    100000.00,
    100000.00,
    100000.00,
    100000.00,
    100000.00
) ON CONFLICT (id) DO NOTHING;