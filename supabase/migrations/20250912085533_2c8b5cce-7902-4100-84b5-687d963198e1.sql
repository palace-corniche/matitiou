-- Add RPC function to safely upsert account defaults
CREATE OR REPLACE FUNCTION public.upsert_account_defaults(
    p_portfolio_id UUID,
    p_default_lot_size NUMERIC,
    p_risk_per_trade_percent NUMERIC,
    p_max_spread_pips NUMERIC,
    p_auto_lot_sizing BOOLEAN,
    p_auto_sl_tp BOOLEAN,
    p_default_sl_pips INTEGER,
    p_default_tp_pips INTEGER,
    p_max_open_trades INTEGER,
    p_trading_hours_enabled BOOLEAN,
    p_trading_start_hour INTEGER,
    p_trading_end_hour INTEGER,
    p_allowed_symbols TEXT[],
    p_blacklist_symbols TEXT[]
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.account_defaults (
        portfolio_id,
        default_lot_size,
        risk_per_trade_percent,
        max_spread_pips,
        auto_lot_sizing,
        auto_sl_tp,
        default_sl_pips,
        default_tp_pips,
        max_open_trades,
        trading_hours_enabled,
        trading_start_hour,
        trading_end_hour,
        allowed_symbols,
        blacklist_symbols,
        updated_at
    ) VALUES (
        p_portfolio_id,
        p_default_lot_size,
        p_risk_per_trade_percent,
        p_max_spread_pips,
        p_auto_lot_sizing,
        p_auto_sl_tp,
        p_default_sl_pips,
        p_default_tp_pips,
        p_max_open_trades,
        p_trading_hours_enabled,
        p_trading_start_hour,
        p_trading_end_hour,
        p_allowed_symbols,
        p_blacklist_symbols,
        now()
    )
    ON CONFLICT (portfolio_id) 
    DO UPDATE SET
        default_lot_size = p_default_lot_size,
        risk_per_trade_percent = p_risk_per_trade_percent,
        max_spread_pips = p_max_spread_pips,
        auto_lot_sizing = p_auto_lot_sizing,
        auto_sl_tp = p_auto_sl_tp,
        default_sl_pips = p_default_sl_pips,
        default_tp_pips = p_default_tp_pips,
        max_open_trades = p_max_open_trades,
        trading_hours_enabled = p_trading_hours_enabled,
        trading_start_hour = p_trading_start_hour,
        trading_end_hour = p_trading_end_hour,
        allowed_symbols = p_allowed_symbols,
        blacklist_symbols = p_blacklist_symbols,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;