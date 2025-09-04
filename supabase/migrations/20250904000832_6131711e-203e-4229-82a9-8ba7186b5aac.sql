-- Update max_open_positions to 50 for all existing portfolios
UPDATE shadow_portfolios 
SET max_open_positions = 50 
WHERE max_open_positions = 5;

-- Enhanced portfolio update trigger that properly calculates performance metrics
CREATE OR REPLACE FUNCTION public.update_portfolio_performance()
RETURNS TRIGGER AS $$
DECLARE
    portfolio_record shadow_portfolios%ROWTYPE;
    total_profit NUMERIC;
    total_loss NUMERIC;
    closed_trades_count INTEGER;
    winning_trades_count INTEGER;
    losing_trades_count INTEGER;
    largest_win_amount NUMERIC;
    largest_loss_amount NUMERIC;
    avg_win_amount NUMERIC;
    avg_loss_amount NUMERIC;
    profit_factor_calc NUMERIC;
    win_rate_calc NUMERIC;
    returns_array NUMERIC[];
    avg_return NUMERIC;
    return_variance NUMERIC;
    return_std_dev NUMERIC;
    sharpe_calc NUMERIC;
    max_drawdown_calc NUMERIC;
    peak_equity NUMERIC;
    current_drawdown NUMERIC;
    trade_record RECORD;
    running_equity NUMERIC;
BEGIN
    -- Get portfolio details
    SELECT * INTO portfolio_record FROM shadow_portfolios WHERE id = NEW.portfolio_id;
    
    -- Calculate all metrics from closed trades
    SELECT 
        COALESCE(SUM(CASE WHEN pnl > 0 THEN pnl ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN pnl <= 0 THEN ABS(pnl) ELSE 0 END), 0),
        COUNT(*),
        COUNT(CASE WHEN pnl > 0 THEN 1 END),
        COUNT(CASE WHEN pnl <= 0 THEN 1 END),
        COALESCE(MAX(CASE WHEN pnl > 0 THEN pnl END), 0),
        COALESCE(MIN(CASE WHEN pnl <= 0 THEN pnl END), 0),
        COALESCE(AVG(CASE WHEN pnl > 0 THEN pnl END), 0),
        COALESCE(AVG(CASE WHEN pnl <= 0 THEN ABS(pnl) END), 0)
    INTO 
        total_profit, total_loss, closed_trades_count, winning_trades_count, 
        losing_trades_count, largest_win_amount, largest_loss_amount, 
        avg_win_amount, avg_loss_amount
    FROM shadow_trades 
    WHERE portfolio_id = NEW.portfolio_id AND status = 'closed';
    
    -- Calculate win rate
    win_rate_calc := CASE 
        WHEN closed_trades_count > 0 THEN (winning_trades_count::NUMERIC / closed_trades_count::NUMERIC) * 100 
        ELSE 0 
    END;
    
    -- Calculate profit factor
    profit_factor_calc := CASE 
        WHEN total_loss > 0 THEN total_profit / total_loss 
        WHEN total_profit > 0 THEN total_profit 
        ELSE 0 
    END;
    
    -- Calculate Sharpe ratio (simplified)
    IF closed_trades_count > 2 THEN
        SELECT array_agg((pnl / portfolio_record.initial_deposit) * 100) 
        INTO returns_array
        FROM shadow_trades 
        WHERE portfolio_id = NEW.portfolio_id AND status = 'closed';
        
        SELECT AVG(ret), VARIANCE(ret) 
        INTO avg_return, return_variance
        FROM unnest(returns_array) AS ret;
        
        return_std_dev := SQRT(return_variance);
        sharpe_calc := CASE 
            WHEN return_std_dev > 0 THEN avg_return / return_std_dev 
            ELSE 0 
        END;
    ELSE
        sharpe_calc := 0;
    END IF;
    
    -- Calculate max drawdown using simpler approach
    SELECT COALESCE(MAX(
        CASE 
            WHEN peak_balance > 0 THEN ((peak_balance - balance) / peak_balance) * 100 
            ELSE 0 
        END
    ), 0) INTO max_drawdown_calc
    FROM shadow_portfolios WHERE id = NEW.portfolio_id;
    
    -- Update portfolio with calculated metrics
    UPDATE shadow_portfolios 
    SET 
        total_trades = closed_trades_count,
        winning_trades = winning_trades_count,
        losing_trades = losing_trades_count,
        win_rate = win_rate_calc,
        average_win = avg_win_amount,
        average_loss = avg_loss_amount,
        profit_factor = profit_factor_calc,
        max_drawdown = GREATEST(max_drawdown, max_drawdown_calc),
        sharpe_ratio = sharpe_calc,
        largest_win = largest_win_amount,
        largest_loss = ABS(largest_loss_amount),
        peak_balance = GREATEST(peak_balance, balance),
        max_equity = GREATEST(max_equity, equity),
        current_drawdown = CASE 
            WHEN peak_balance > 0 THEN ((peak_balance - balance) / peak_balance) * 100 
            ELSE 0 
        END,
        updated_at = now()
    WHERE id = NEW.portfolio_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS update_portfolio_metrics_on_trade_close ON shadow_trades;
CREATE TRIGGER update_portfolio_metrics_on_trade_close
    AFTER UPDATE OF status ON shadow_trades
    FOR EACH ROW
    WHEN (NEW.status = 'closed' AND OLD.status != 'closed')
    EXECUTE FUNCTION public.update_portfolio_performance();