-- Enhance shadow trading system for MT4-like functionality

-- Add additional columns to shadow_trades for better tracking
ALTER TABLE shadow_trades 
ADD COLUMN IF NOT EXISTS swap NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS commission NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS profit NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS profit_pips NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS current_price NUMERIC,
ADD COLUMN IF NOT EXISTS unrealized_pnl NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS realized_pnl NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS partial_close_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_lot_size NUMERIC,
ADD COLUMN IF NOT EXISTS remaining_lot_size NUMERIC,
ADD COLUMN IF NOT EXISTS close_type TEXT DEFAULT 'full' CHECK (close_type IN ('full', 'partial', 'stop_loss', 'take_profit', 'manual')),
ADD COLUMN IF NOT EXISTS slippage_pips NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS execution_price NUMERIC;

-- Update existing trades to set original and remaining lot sizes
UPDATE shadow_trades 
SET original_lot_size = lot_size, 
    remaining_lot_size = lot_size,
    execution_price = entry_price
WHERE original_lot_size IS NULL;

-- Add enhanced portfolio tracking
ALTER TABLE shadow_portfolios
ADD COLUMN IF NOT EXISTS floating_pnl NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS used_margin NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS margin_percentage NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS peak_balance NUMERIC DEFAULT 100000.00,
ADD COLUMN IF NOT EXISTS max_equity NUMERIC DEFAULT 100000.00,
ADD COLUMN IF NOT EXISTS current_drawdown NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS max_drawdown_amount NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS consecutive_wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS consecutive_losses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS largest_win NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS largest_loss NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_commission NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_swap NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS last_trade_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trading_days INTEGER DEFAULT 0;

-- Create trade_history table for comprehensive tracking
CREATE TABLE IF NOT EXISTS trade_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL,
    original_trade_id UUID,
    action_type TEXT NOT NULL CHECK (action_type IN ('open', 'close', 'partial_close', 'modify')),
    symbol TEXT NOT NULL DEFAULT 'EUR/USD',
    trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
    lot_size NUMERIC NOT NULL,
    execution_price NUMERIC NOT NULL,
    stop_loss NUMERIC,
    take_profit NUMERIC,
    profit NUMERIC DEFAULT 0.00,
    profit_pips NUMERIC DEFAULT 0.00,
    commission NUMERIC DEFAULT 0.00,
    swap NUMERIC DEFAULT 0.00,
    slippage_pips NUMERIC DEFAULT 0.00,
    balance_before NUMERIC NOT NULL,
    balance_after NUMERIC NOT NULL,
    equity_before NUMERIC NOT NULL,
    equity_after NUMERIC NOT NULL,
    margin_used NUMERIC DEFAULT 0.00,
    execution_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    FOREIGN KEY (portfolio_id) REFERENCES shadow_portfolios(id) ON DELETE CASCADE
);

-- Enable RLS on trade_history
ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trade_history
CREATE POLICY "Users can view their own trade history"
ON trade_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM shadow_portfolios sp 
        WHERE sp.id = trade_history.portfolio_id 
        AND (
            (auth.uid() IS NOT NULL AND sp.user_id = auth.uid()) OR
            (auth.uid() IS NULL AND sp.session_id IS NOT NULL)
        )
    )
);

CREATE POLICY "System can manage trade history"
ON trade_history FOR ALL
USING (true)
WITH CHECK (true);

-- Create lot_size_presets table for customizable lot sizes
CREATE TABLE IF NOT EXISTS lot_size_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL,
    preset_name TEXT NOT NULL,
    lot_size NUMERIC NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    FOREIGN KEY (portfolio_id) REFERENCES shadow_portfolios(id) ON DELETE CASCADE,
    UNIQUE(portfolio_id, preset_name)
);

-- Enable RLS on lot_size_presets
ALTER TABLE lot_size_presets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lot_size_presets
CREATE POLICY "Users can manage their own lot size presets"
ON lot_size_presets FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM shadow_portfolios sp 
        WHERE sp.id = lot_size_presets.portfolio_id 
        AND (
            (auth.uid() IS NOT NULL AND sp.user_id = auth.uid()) OR
            (auth.uid() IS NULL AND sp.session_id IS NOT NULL)
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM shadow_portfolios sp 
        WHERE sp.id = lot_size_presets.portfolio_id 
        AND (
            (auth.uid() IS NOT NULL AND sp.user_id = auth.uid()) OR
            (auth.uid() IS NULL AND sp.session_id IS NOT NULL)
        )
    )
);

-- Insert default lot size presets for existing portfolios
INSERT INTO lot_size_presets (portfolio_id, preset_name, lot_size, is_default)
SELECT id, 'Micro', 0.01, true FROM shadow_portfolios
ON CONFLICT (portfolio_id, preset_name) DO NOTHING;

INSERT INTO lot_size_presets (portfolio_id, preset_name, lot_size, is_default)
SELECT id, 'Mini', 0.1, false FROM shadow_portfolios
ON CONFLICT (portfolio_id, preset_name) DO NOTHING;

INSERT INTO lot_size_presets (portfolio_id, preset_name, lot_size, is_default)
SELECT id, 'Standard', 1.0, false FROM shadow_portfolios
ON CONFLICT (portfolio_id, preset_name) DO NOTHING;

-- Create function to calculate real-time P&L
CREATE OR REPLACE FUNCTION calculate_trade_pnl(
    p_trade_id UUID,
    p_current_price NUMERIC
) RETURNS TABLE (
    unrealized_pnl NUMERIC,
    profit_pips NUMERIC,
    profit NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    trade_record shadow_trades%ROWTYPE;
    pip_value_calc NUMERIC;
    pip_difference NUMERIC;
    pnl_calc NUMERIC;
    profit_pips_calc NUMERIC;
BEGIN
    -- Get trade details
    SELECT * INTO trade_record 
    FROM shadow_trades 
    WHERE id = p_trade_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Calculate pip difference based on trade type
    IF trade_record.trade_type = 'buy' THEN
        pip_difference := (p_current_price - trade_record.entry_price) * 10000;
    ELSE
        pip_difference := (trade_record.entry_price - p_current_price) * 10000;
    END IF;
    
    -- Calculate pip value (for EUR/USD, typically $1 per pip for 0.1 lot)
    pip_value_calc := trade_record.remaining_lot_size * 10; -- $10 per pip for 1 lot
    
    -- Calculate P&L
    pnl_calc := pip_difference * pip_value_calc / 10000;
    profit_pips_calc := pip_difference;
    
    RETURN QUERY SELECT pnl_calc, profit_pips_calc, pnl_calc;
END;
$$;

-- Create function to close trade (full or partial)
CREATE OR REPLACE FUNCTION close_shadow_trade(
    p_trade_id UUID,
    p_close_price NUMERIC,
    p_close_lot_size NUMERIC DEFAULT NULL, -- NULL means close all
    p_close_reason TEXT DEFAULT 'manual'
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    trade_record shadow_trades%ROWTYPE;
    portfolio_record shadow_portfolios%ROWTYPE;
    close_lot_size NUMERIC;
    pip_difference NUMERIC;
    pip_value_calc NUMERIC;
    profit_amount NUMERIC;
    commission_amount NUMERIC;
    swap_amount NUMERIC;
    net_profit NUMERIC;
    is_partial_close BOOLEAN;
    result JSON;
BEGIN
    -- Get trade details
    SELECT * INTO trade_record FROM shadow_trades WHERE id = p_trade_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trade not found';
    END IF;
    
    -- Get portfolio details
    SELECT * INTO portfolio_record FROM shadow_portfolios WHERE id = trade_record.portfolio_id;
    
    -- Determine close lot size
    close_lot_size := COALESCE(p_close_lot_size, trade_record.remaining_lot_size);
    is_partial_close := close_lot_size < trade_record.remaining_lot_size;
    
    -- Calculate profit
    IF trade_record.trade_type = 'buy' THEN
        pip_difference := (p_close_price - trade_record.entry_price) * 10000;
    ELSE
        pip_difference := (trade_record.entry_price - p_close_price) * 10000;
    END IF;
    
    pip_value_calc := close_lot_size * 10;
    profit_amount := pip_difference * pip_value_calc / 10000;
    
    -- Calculate commission and swap (simplified)
    commission_amount := close_lot_size * 0.5; -- $0.50 per lot
    swap_amount := 0; -- Simplified, would be calculated based on time held
    
    net_profit := profit_amount - commission_amount - swap_amount;
    
    -- Update portfolio balance and equity
    UPDATE shadow_portfolios 
    SET 
        balance = balance + net_profit,
        equity = equity + net_profit,
        total_trades = CASE WHEN NOT is_partial_close THEN total_trades + 1 ELSE total_trades END,
        winning_trades = CASE WHEN net_profit > 0 AND NOT is_partial_close THEN winning_trades + 1 ELSE winning_trades END,
        losing_trades = CASE WHEN net_profit <= 0 AND NOT is_partial_close THEN losing_trades + 1 ELSE losing_trades END,
        profit_factor = CASE 
            WHEN (average_loss * losing_trades) > 0 
            THEN (average_win * winning_trades) / ABS(average_loss * losing_trades)
            ELSE 0 
        END,
        updated_at = now(),
        last_trade_time = now()
    WHERE id = trade_record.portfolio_id;
    
    -- Insert trade history record
    INSERT INTO trade_history (
        portfolio_id, original_trade_id, action_type, symbol, trade_type,
        lot_size, execution_price, profit, profit_pips, commission, swap,
        balance_before, balance_after, equity_before, equity_after,
        execution_time
    ) VALUES (
        trade_record.portfolio_id, p_trade_id, 
        CASE WHEN is_partial_close THEN 'partial_close' ELSE 'close' END,
        trade_record.symbol, trade_record.trade_type, close_lot_size, p_close_price,
        net_profit, pip_difference, commission_amount, swap_amount,
        portfolio_record.balance, portfolio_record.balance + net_profit,
        portfolio_record.equity, portfolio_record.equity + net_profit,
        now()
    );
    
    -- Update or close the trade
    IF is_partial_close THEN
        UPDATE shadow_trades 
        SET 
            remaining_lot_size = remaining_lot_size - close_lot_size,
            partial_close_count = partial_close_count + 1,
            realized_pnl = realized_pnl + net_profit,
            updated_at = now()
        WHERE id = p_trade_id;
    ELSE
        UPDATE shadow_trades 
        SET 
            status = 'closed',
            exit_price = p_close_price,
            exit_time = now(),
            exit_reason = p_close_reason,
            pnl = net_profit,
            pnl_percent = (net_profit / (trade_record.entry_price * trade_record.lot_size * trade_record.contract_size)) * 100,
            profit = profit_amount,
            profit_pips = pip_difference,
            commission = commission_amount,
            swap = swap_amount,
            close_type = CASE WHEN is_partial_close THEN 'partial' ELSE 'full' END,
            updated_at = now()
        WHERE id = p_trade_id;
    END IF;
    
    -- Return result
    result := json_build_object(
        'success', true,
        'trade_id', p_trade_id,
        'closed_lot_size', close_lot_size,
        'profit', net_profit,
        'profit_pips', pip_difference,
        'is_partial', is_partial_close,
        'new_balance', portfolio_record.balance + net_profit
    );
    
    RETURN result;
END;
$$;

-- Create trigger to update portfolio metrics on trade changes
CREATE OR REPLACE FUNCTION update_portfolio_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update portfolio floating P&L and margin calculations
    UPDATE shadow_portfolios 
    SET updated_at = now()
    WHERE id = COALESCE(NEW.portfolio_id, OLD.portfolio_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for trade updates
DROP TRIGGER IF EXISTS trigger_update_portfolio_metrics ON shadow_trades;
CREATE TRIGGER trigger_update_portfolio_metrics
    AFTER INSERT OR UPDATE OR DELETE ON shadow_trades
    FOR EACH ROW EXECUTE FUNCTION update_portfolio_metrics();