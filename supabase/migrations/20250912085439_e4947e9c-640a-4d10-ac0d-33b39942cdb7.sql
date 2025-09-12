-- Create account_defaults table for Phase 3
CREATE TABLE IF NOT EXISTS public.account_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL UNIQUE,
    
    -- Position sizing
    default_lot_size NUMERIC NOT NULL DEFAULT 0.01 CHECK (default_lot_size > 0),
    risk_per_trade_percent NUMERIC NOT NULL DEFAULT 2.0 CHECK (risk_per_trade_percent > 0 AND risk_per_trade_percent <= 100),
    auto_lot_sizing BOOLEAN NOT NULL DEFAULT false,
    
    -- Risk management
    max_spread_pips NUMERIC NOT NULL DEFAULT 3.0 CHECK (max_spread_pips > 0),
    auto_sl_tp BOOLEAN NOT NULL DEFAULT false,
    default_sl_pips INTEGER NOT NULL DEFAULT 50 CHECK (default_sl_pips > 0),
    default_tp_pips INTEGER NOT NULL DEFAULT 100 CHECK (default_tp_pips > 0),
    max_open_trades INTEGER NOT NULL DEFAULT 10 CHECK (max_open_trades > 0),
    
    -- Trading hours
    trading_hours_enabled BOOLEAN NOT NULL DEFAULT false,
    trading_start_hour INTEGER NOT NULL DEFAULT 8 CHECK (trading_start_hour >= 0 AND trading_start_hour <= 23),
    trading_end_hour INTEGER NOT NULL DEFAULT 17 CHECK (trading_end_hour >= 0 AND trading_end_hour <= 23),
    
    -- Symbol filters
    allowed_symbols TEXT[] NOT NULL DEFAULT ARRAY['EUR/USD', 'GBP/USD', 'USD/JPY'],
    blacklist_symbols TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_account_defaults_portfolio_id ON public.account_defaults(portfolio_id);

-- Enable RLS
ALTER TABLE public.account_defaults ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own account defaults" 
ON public.account_defaults FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM shadow_portfolios sp 
        WHERE sp.id = account_defaults.portfolio_id 
        AND (
            (auth.uid() IS NOT NULL AND sp.user_id = auth.uid()) 
            OR 
            (auth.uid() IS NULL AND sp.session_id IS NOT NULL)
        )
    )
);

-- Update trigger
CREATE TRIGGER update_account_defaults_updated_at
    BEFORE UPDATE ON public.account_defaults
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get account defaults with fallbacks
CREATE OR REPLACE FUNCTION public.get_account_defaults(p_portfolio_id UUID)
RETURNS TABLE(
    default_lot_size NUMERIC,
    risk_per_trade_percent NUMERIC,
    max_spread_pips NUMERIC,
    auto_lot_sizing BOOLEAN,
    auto_sl_tp BOOLEAN,
    default_sl_pips INTEGER,
    default_tp_pips INTEGER,
    max_open_trades INTEGER,
    trading_hours_enabled BOOLEAN,
    trading_start_hour INTEGER,
    trading_end_hour INTEGER,
    allowed_symbols TEXT[],
    blacklist_symbols TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ad.default_lot_size, 0.01),
        COALESCE(ad.risk_per_trade_percent, 2.0),
        COALESCE(ad.max_spread_pips, 3.0),
        COALESCE(ad.auto_lot_sizing, false),
        COALESCE(ad.auto_sl_tp, false),
        COALESCE(ad.default_sl_pips, 50),
        COALESCE(ad.default_tp_pips, 100),
        COALESCE(ad.max_open_trades, 10),
        COALESCE(ad.trading_hours_enabled, false),
        COALESCE(ad.trading_start_hour, 8),
        COALESCE(ad.trading_end_hour, 17),
        COALESCE(ad.allowed_symbols, ARRAY['EUR/USD', 'GBP/USD', 'USD/JPY']),
        COALESCE(ad.blacklist_symbols, ARRAY[]::TEXT[])
    FROM public.account_defaults ad
    WHERE ad.portfolio_id = p_portfolio_id
    
    UNION ALL
    
    SELECT 
        0.01::NUMERIC,
        2.0::NUMERIC, 
        3.0::NUMERIC,
        false,
        false,
        50,
        100,
        10,
        false,
        8,
        17,
        ARRAY['EUR/USD', 'GBP/USD', 'USD/JPY'],
        ARRAY[]::TEXT[]
    WHERE NOT EXISTS (
        SELECT 1 FROM public.account_defaults 
        WHERE portfolio_id = p_portfolio_id
    )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Insert sample defaults for existing portfolios
INSERT INTO public.account_defaults (portfolio_id, default_lot_size, risk_per_trade_percent)
SELECT id, 0.01, 2.0 
FROM public.shadow_portfolios 
WHERE id NOT IN (SELECT portfolio_id FROM public.account_defaults)
ON CONFLICT (portfolio_id) DO NOTHING;