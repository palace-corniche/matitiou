-- Complete MetaTrader 4 Implementation - Phase 1: Enhanced Database Schema
-- This migration adds all necessary tables and enhancements for full MT4 functionality

-- 1. Add order management system
CREATE TABLE IF NOT EXISTS order_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

INSERT INTO order_types (name, description) VALUES 
('market', 'Market order - execute immediately at current price'),
('limit', 'Limit order - execute when price reaches specified level'),
('stop', 'Stop order - execute when price moves against position'),
('stop_limit', 'Stop limit order - stop order that becomes limit order'),
('trailing_stop', 'Trailing stop - dynamic stop that follows price'),
('if_done', 'If done order - secondary order activated after primary fills'),
('one_cancels_other', 'OCO order - cancel one when other fills')
ON CONFLICT (name) DO NOTHING;

-- 2. Create pending orders table
CREATE TABLE IF NOT EXISTS pending_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL,
    symbol TEXT NOT NULL DEFAULT 'EUR/USD',
    order_type TEXT NOT NULL REFERENCES order_types(name),
    trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
    lot_size NUMERIC NOT NULL DEFAULT 0.01,
    trigger_price NUMERIC NOT NULL,
    stop_loss NUMERIC,
    take_profit NUMERIC,
    expiry_time TIMESTAMP WITH TIME ZONE,
    expiry_type TEXT DEFAULT 'gtc' CHECK (expiry_type IN ('gtc', 'day', 'specified')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'cancelled', 'expired')),
    slippage_tolerance NUMERIC DEFAULT 3.0,
    partial_fill_allowed BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    filled_at TIMESTAMP WITH TIME ZONE,
    filled_price NUMERIC,
    filled_lot_size NUMERIC DEFAULT 0,
    commission NUMERIC DEFAULT 0,
    notes TEXT
);

-- 3. Create comprehensive instruments table
CREATE TABLE IF NOT EXISTS trading_instruments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    instrument_type TEXT NOT NULL CHECK (instrument_type IN ('forex', 'index', 'commodity', 'crypto', 'stock')),
    base_currency TEXT NOT NULL,
    quote_currency TEXT NOT NULL,
    pip_size NUMERIC NOT NULL DEFAULT 0.0001,
    tick_size NUMERIC NOT NULL DEFAULT 0.0001,
    tick_value NUMERIC NOT NULL DEFAULT 1.0,
    contract_size NUMERIC NOT NULL DEFAULT 100000,
    min_lot_size NUMERIC NOT NULL DEFAULT 0.01,
    max_lot_size NUMERIC NOT NULL DEFAULT 100.0,
    lot_step NUMERIC NOT NULL DEFAULT 0.01,
    typical_spread NUMERIC NOT NULL DEFAULT 1.5,
    swap_long NUMERIC DEFAULT 0,
    swap_short NUMERIC DEFAULT 0,
    swap_type TEXT DEFAULT 'points' CHECK (swap_type IN ('points', 'percentage', 'currency')),
    commission_type TEXT DEFAULT 'per_lot' CHECK (commission_type IN ('per_lot', 'percentage', 'fixed')),
    commission_value NUMERIC DEFAULT 0,
    margin_percentage NUMERIC DEFAULT 1.0,
    trading_sessions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert major forex pairs
INSERT INTO trading_instruments (symbol, display_name, instrument_type, base_currency, quote_currency, typical_spread, swap_long, swap_short) VALUES
('EUR/USD', 'Euro vs US Dollar', 'forex', 'EUR', 'USD', 1.2, -0.65, -0.35),
('GBP/USD', 'British Pound vs US Dollar', 'forex', 'GBP', 'USD', 1.5, -0.78, -0.42),
('USD/JPY', 'US Dollar vs Japanese Yen', 'forex', 'USD', 'JPY', 1.1, -0.55, -0.25),
('USD/CHF', 'US Dollar vs Swiss Franc', 'forex', 'USD', 'CHF', 1.8, -0.85, -0.45),
('AUD/USD', 'Australian Dollar vs US Dollar', 'forex', 'AUD', 'USD', 1.4, -0.70, -0.30),
('USD/CAD', 'US Dollar vs Canadian Dollar', 'forex', 'USD', 'CAD', 1.6, -0.60, -0.40),
('NZD/USD', 'New Zealand Dollar vs US Dollar', 'forex', 'NZD', 'USD', 1.8, -0.75, -0.35),
('EUR/GBP', 'Euro vs British Pound', 'forex', 'EUR', 'GBP', 1.5, -0.80, -0.50),
('EUR/JPY', 'Euro vs Japanese Yen', 'forex', 'EUR', 'JPY', 1.4, -0.90, -0.60),
('GBP/JPY', 'British Pound vs Japanese Yen', 'forex', 'GBP', 'JPY', 2.1, -1.20, -0.80)
ON CONFLICT (symbol) DO UPDATE SET
display_name = EXCLUDED.display_name,
typical_spread = EXCLUDED.typical_spread,
swap_long = EXCLUDED.swap_long,
swap_short = EXCLUDED.swap_short;

-- Insert major indices
INSERT INTO trading_instruments (symbol, display_name, instrument_type, base_currency, quote_currency, pip_size, tick_size, contract_size, typical_spread) VALUES
('SPX500', 'S&P 500 Index', 'index', 'USD', 'USD', 0.1, 0.1, 1, 0.5),
('NAS100', 'NASDAQ 100 Index', 'index', 'USD', 'USD', 0.1, 0.1, 1, 1.0),
('GER40', 'German DAX 40', 'index', 'EUR', 'EUR', 0.1, 0.1, 1, 1.5),
('UK100', 'FTSE 100 Index', 'index', 'GBP', 'GBP', 0.1, 0.1, 1, 1.2),
('JPN225', 'Nikkei 225', 'index', 'JPY', 'JPY', 1, 1, 1, 8.0)
ON CONFLICT (symbol) DO NOTHING;

-- Insert major commodities
INSERT INTO trading_instruments (symbol, display_name, instrument_type, base_currency, quote_currency, pip_size, tick_size, contract_size, typical_spread) VALUES
('XAUUSD', 'Gold vs US Dollar', 'commodity', 'XAU', 'USD', 0.01, 0.01, 100, 0.35),
('XAGUSD', 'Silver vs US Dollar', 'commodity', 'XAG', 'USD', 0.001, 0.001, 5000, 0.03),
('XTIUSD', 'Crude Oil WTI', 'commodity', 'XTI', 'USD', 0.01, 0.01, 1000, 0.05),
('XBRUSD', 'Crude Oil Brent', 'commodity', 'XBR', 'USD', 0.01, 0.01, 1000, 0.05)
ON CONFLICT (symbol) DO NOTHING;

-- 4. Enhance shadow_trades table with advanced features
ALTER TABLE shadow_trades ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'market';
ALTER TABLE shadow_trades ADD COLUMN IF NOT EXISTS magic_number INTEGER DEFAULT 0;
ALTER TABLE shadow_trades ADD COLUMN IF NOT EXISTS comment TEXT DEFAULT '';
ALTER TABLE shadow_trades ADD COLUMN IF NOT EXISTS expert_advisor TEXT;
ALTER TABLE shadow_trades ADD COLUMN IF NOT EXISTS trailing_stop_distance NUMERIC DEFAULT 0;
ALTER TABLE shadow_trades ADD COLUMN IF NOT EXISTS trailing_stop_triggered BOOLEAN DEFAULT false;
ALTER TABLE shadow_trades ADD COLUMN IF NOT EXISTS break_even_triggered BOOLEAN DEFAULT false;
ALTER TABLE shadow_trades ADD COLUMN IF NOT EXISTS partial_closes_count INTEGER DEFAULT 0;
ALTER TABLE shadow_trades ADD COLUMN IF NOT EXISTS original_stop_loss NUMERIC;
ALTER TABLE shadow_trades ADD COLUMN IF NOT EXISTS original_take_profit NUMERIC;
ALTER TABLE shadow_trades ADD COLUMN IF NOT EXISTS max_profit NUMERIC DEFAULT 0;
ALTER TABLE shadow_trades ADD COLUMN IF NOT EXISTS max_loss NUMERIC DEFAULT 0;
ALTER TABLE shadow_trades ADD COLUMN IF NOT EXISTS tick_value NUMERIC;
ALTER TABLE shadow_trades ADD COLUMN IF NOT EXISTS point_value NUMERIC;

-- 5. Enhance shadow_portfolios with advanced account features
ALTER TABLE shadow_portfolios ADD COLUMN IF NOT EXISTS account_server TEXT DEFAULT 'Demo Server';
ALTER TABLE shadow_portfolios ADD COLUMN IF NOT EXISTS account_company TEXT DEFAULT 'MetaTrader Demo';
ALTER TABLE shadow_portfolios ADD COLUMN IF NOT EXISTS account_name TEXT DEFAULT 'Demo Account';
ALTER TABLE shadow_portfolios ADD COLUMN IF NOT EXISTS account_number BIGINT DEFAULT floor(random() * 9000000000 + 1000000000);
ALTER TABLE shadow_portfolios ADD COLUMN IF NOT EXISTS credit NUMERIC DEFAULT 0;
ALTER TABLE shadow_portfolios ADD COLUMN IF NOT EXISTS bonus NUMERIC DEFAULT 0;
ALTER TABLE shadow_portfolios ADD COLUMN IF NOT EXISTS spread_multiplier NUMERIC DEFAULT 1.0;
ALTER TABLE shadow_portfolios ADD COLUMN IF NOT EXISTS commission_per_lot NUMERIC DEFAULT 0;
ALTER TABLE shadow_portfolios ADD COLUMN IF NOT EXISTS swap_free BOOLEAN DEFAULT false;
ALTER TABLE shadow_portfolios ADD COLUMN IF NOT EXISTS hedge_mode BOOLEAN DEFAULT false;
ALTER TABLE shadow_portfolios ADD COLUMN IF NOT EXISTS fifo_mode BOOLEAN DEFAULT true;
ALTER TABLE shadow_portfolios ADD COLUMN IF NOT EXISTS trading_allowed BOOLEAN DEFAULT true;
ALTER TABLE shadow_portfolios ADD COLUMN IF NOT EXISTS ea_allowed BOOLEAN DEFAULT true;
ALTER TABLE shadow_portfolios ADD COLUMN IF NOT EXISTS dll_allowed BOOLEAN DEFAULT false;
ALTER TABLE shadow_portfolios ADD COLUMN IF NOT EXISTS trade_context_busy BOOLEAN DEFAULT false;
ALTER TABLE shadow_portfolios ADD COLUMN IF NOT EXISTS max_orders INTEGER DEFAULT 200;
ALTER TABLE shadow_portfolios ADD COLUMN IF NOT EXISTS symbols_total INTEGER DEFAULT 0;
ALTER TABLE shadow_portfolios ADD COLUMN IF NOT EXISTS symbols_list TEXT[] DEFAULT '{}';

-- 6. Create market data enhanced table
CREATE TABLE IF NOT EXISTS market_data_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    open_price NUMERIC NOT NULL,
    high_price NUMERIC NOT NULL,
    low_price NUMERIC NOT NULL,
    close_price NUMERIC NOT NULL,
    bid_price NUMERIC NOT NULL,
    ask_price NUMERIC NOT NULL,
    spread NUMERIC NOT NULL,
    volume BIGINT DEFAULT 0,
    tick_volume INTEGER DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    session_type TEXT CHECK (session_type IN ('asian', 'european', 'american', 'overlap')),
    is_holiday BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(symbol, timeframe, timestamp)
);

-- 7. Create trade signals enhanced table
CREATE TABLE IF NOT EXISTS trade_signals_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID,
    symbol TEXT NOT NULL,
    signal_type TEXT NOT NULL CHECK (signal_type IN ('buy', 'sell', 'buy_limit', 'sell_limit', 'buy_stop', 'sell_stop')),
    entry_price NUMERIC NOT NULL,
    stop_loss NUMERIC,
    take_profit NUMERIC,
    lot_size NUMERIC NOT NULL DEFAULT 0.01,
    confidence_score NUMERIC NOT NULL DEFAULT 0.5,
    risk_reward_ratio NUMERIC,
    timeframe TEXT NOT NULL,
    strategy_name TEXT,
    indicators_used TEXT[],
    signal_strength INTEGER DEFAULT 5,
    expiry_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'executed', 'expired', 'cancelled')),
    execution_type TEXT DEFAULT 'manual' CHECK (execution_type IN ('manual', 'auto', 'copy')),
    source TEXT DEFAULT 'analysis',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Create account history table
CREATE TABLE IF NOT EXISTS account_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('deposit', 'withdrawal', 'credit', 'debit', 'bonus', 'commission', 'swap', 'dividend')),
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    balance_before NUMERIC NOT NULL,
    balance_after NUMERIC NOT NULL,
    description TEXT,
    reference_number TEXT,
    payment_method TEXT,
    transaction_fee NUMERIC DEFAULT 0,
    exchange_rate NUMERIC DEFAULT 1.0,
    processed_by TEXT DEFAULT 'system',
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. Create news and events table
CREATE TABLE IF NOT EXISTS economic_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name TEXT NOT NULL,
    currency TEXT NOT NULL,
    impact_level TEXT NOT NULL CHECK (impact_level IN ('low', 'medium', 'high')),
    event_time TIMESTAMP WITH TIME ZONE NOT NULL,
    previous_value TEXT,
    forecast_value TEXT,
    actual_value TEXT,
    description TEXT,
    affected_instruments TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. Create position correlation table
CREATE TABLE IF NOT EXISTS position_correlations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL,
    symbol_a TEXT NOT NULL,
    symbol_b TEXT NOT NULL,
    correlation_coefficient NUMERIC NOT NULL,
    risk_exposure NUMERIC NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(portfolio_id, symbol_a, symbol_b)
);

-- 11. Create expert advisor logs table
CREATE TABLE IF NOT EXISTS ea_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL,
    ea_name TEXT NOT NULL,
    log_level TEXT NOT NULL CHECK (log_level IN ('info', 'warning', 'error', 'debug')),
    message TEXT NOT NULL,
    trade_id UUID,
    symbol TEXT,
    execution_time_ms INTEGER,
    memory_usage_kb INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 12. Add RLS policies for all new tables
ALTER TABLE pending_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their pending orders" ON pending_orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM shadow_portfolios sp 
            WHERE sp.id = pending_orders.portfolio_id 
            AND (
                (auth.uid() IS NOT NULL AND sp.user_id = auth.uid()) 
                OR (auth.uid() IS NULL AND sp.session_id IS NOT NULL)
            )
        )
    );

ALTER TABLE trading_instruments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view trading instruments" ON trading_instruments
    FOR SELECT USING (true);
CREATE POLICY "System can manage instruments" ON trading_instruments
    FOR ALL USING (true);

ALTER TABLE market_data_enhanced ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view enhanced market data" ON market_data_enhanced
    FOR SELECT USING (true);
CREATE POLICY "System can manage enhanced market data" ON market_data_enhanced
    FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update enhanced market data" ON market_data_enhanced
    FOR UPDATE USING (true);

ALTER TABLE trade_signals_enhanced ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their enhanced signals" ON trade_signals_enhanced
    FOR ALL USING (
        portfolio_id IS NULL OR EXISTS (
            SELECT 1 FROM shadow_portfolios sp 
            WHERE sp.id = trade_signals_enhanced.portfolio_id 
            AND (
                (auth.uid() IS NOT NULL AND sp.user_id = auth.uid()) 
                OR (auth.uid() IS NULL AND sp.session_id IS NOT NULL)
            )
        )
    );

ALTER TABLE account_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their account history" ON account_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shadow_portfolios sp 
            WHERE sp.id = account_history.portfolio_id 
            AND (
                (auth.uid() IS NOT NULL AND sp.user_id = auth.uid()) 
                OR (auth.uid() IS NULL AND sp.session_id IS NOT NULL)
            )
        )
    );
CREATE POLICY "System can manage account history" ON account_history
    FOR INSERT WITH CHECK (true);

ALTER TABLE economic_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view economic calendar" ON economic_calendar
    FOR SELECT USING (true);
CREATE POLICY "System can manage economic calendar" ON economic_calendar
    FOR ALL USING (true);

ALTER TABLE position_correlations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their position correlations" ON position_correlations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shadow_portfolios sp 
            WHERE sp.id = position_correlations.portfolio_id 
            AND (
                (auth.uid() IS NOT NULL AND sp.user_id = auth.uid()) 
                OR (auth.uid() IS NULL AND sp.session_id IS NOT NULL)
            )
        )
    );
CREATE POLICY "System can manage position correlations" ON position_correlations
    FOR ALL USING (true);

ALTER TABLE ea_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their EA logs" ON ea_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shadow_portfolios sp 
            WHERE sp.id = ea_logs.portfolio_id 
            AND (
                (auth.uid() IS NOT NULL AND sp.user_id = auth.uid()) 
                OR (auth.uid() IS NULL AND sp.session_id IS NOT NULL)
            )
        )
    );
CREATE POLICY "System can manage EA logs" ON ea_logs
    FOR INSERT WITH CHECK (true);

-- 13. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_orders_portfolio_status ON pending_orders(portfolio_id, status);
CREATE INDEX IF NOT EXISTS idx_pending_orders_symbol_trigger ON pending_orders(symbol, trigger_price) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_market_data_enhanced_symbol_time ON market_data_enhanced(symbol, timeframe, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trade_signals_enhanced_portfolio_status ON trade_signals_enhanced(portfolio_id, status);
CREATE INDEX IF NOT EXISTS idx_account_history_portfolio_time ON account_history(portfolio_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_economic_calendar_time_impact ON economic_calendar(event_time, impact_level);
CREATE INDEX IF NOT EXISTS idx_ea_logs_portfolio_time ON ea_logs(portfolio_id, created_at DESC);

-- 14. Update triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pending_orders_updated_at BEFORE UPDATE ON pending_orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_instruments_updated_at BEFORE UPDATE ON trading_instruments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trade_signals_enhanced_updated_at BEFORE UPDATE ON trade_signals_enhanced
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_economic_calendar_updated_at BEFORE UPDATE ON economic_calendar
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();