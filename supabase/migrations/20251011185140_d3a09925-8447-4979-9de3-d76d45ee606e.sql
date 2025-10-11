-- Phase 2: Create calculate_global_performance_metrics function
CREATE OR REPLACE FUNCTION public.calculate_global_performance_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_profit NUMERIC;
  total_loss NUMERIC;
  avg_win NUMERIC;
  avg_loss NUMERIC;
  profit_factor_calc NUMERIC;
  largest_win_val NUMERIC;
  largest_loss_val NUMERIC;
  returns_array NUMERIC[];
  sharpe NUMERIC;
  current_balance NUMERIC;
  peak_balance_val NUMERIC;
  max_dd NUMERIC;
  current_dd NUMERIC;
BEGIN
  -- Get closed trades metrics from trade_history
  SELECT 
    COALESCE(SUM(CASE WHEN profit > 0 THEN profit ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN profit < 0 THEN ABS(profit) ELSE 0 END), 0),
    COALESCE(AVG(CASE WHEN profit > 0 THEN profit END), 0),
    COALESCE(AVG(CASE WHEN profit < 0 THEN ABS(profit) END), 0),
    COALESCE(MAX(profit), 0),
    COALESCE(MIN(profit), 0)
  INTO 
    total_profit, total_loss, avg_win, avg_loss, largest_win_val, largest_loss_val
  FROM trade_history
  WHERE portfolio_id = '00000000-0000-0000-0000-000000000001'
    AND action_type = 'close';
  
  -- Calculate profit factor
  profit_factor_calc := CASE 
    WHEN total_loss > 0 THEN total_profit / total_loss
    WHEN total_profit > 0 THEN total_profit
    ELSE 0 
  END;
  
  -- Get current balance from global account
  SELECT balance INTO current_balance
  FROM global_trading_account
  WHERE id = '00000000-0000-0000-0000-000000000001';
  
  -- Calculate peak balance from trade history
  SELECT COALESCE(MAX(balance_after), 100000) INTO peak_balance_val
  FROM trade_history
  WHERE portfolio_id = '00000000-0000-0000-0000-000000000001';
  
  -- Ensure peak is at least current balance
  peak_balance_val := GREATEST(peak_balance_val, current_balance, 100000);
  
  -- Calculate max drawdown
  max_dd := CASE
    WHEN peak_balance_val > 0 
    THEN ((peak_balance_val - current_balance) / peak_balance_val) * 100
    ELSE 0
  END;
  
  -- Current drawdown is same as max if we're at lowest point
  current_dd := max_dd;
  
  -- Calculate Sharpe Ratio from daily returns
  SELECT array_agg(profit) INTO returns_array
  FROM trade_history
  WHERE portfolio_id = '00000000-0000-0000-0000-000000000001'
    AND action_type = 'close';
  
  IF array_length(returns_array, 1) > 2 THEN
    SELECT 
      COALESCE(
        (AVG(ret) / NULLIF(STDDEV(ret), 0)) * SQRT(252), 
        0
      )
    INTO sharpe
    FROM unnest(returns_array) AS ret;
  ELSE
    sharpe := 0;
  END IF;
  
  -- Update global account with calculated metrics
  UPDATE global_trading_account
  SET
    average_win = avg_win,
    average_loss = avg_loss,
    profit_factor = profit_factor_calc,
    sharpe_ratio = sharpe,
    max_drawdown = GREATEST(max_drawdown, max_dd),
    current_drawdown = current_dd,
    peak_balance = peak_balance_val,
    max_equity = GREATEST(max_equity, equity),
    largest_win = largest_win_val,
    largest_loss = ABS(largest_loss_val),
    updated_at = now()
  WHERE id = '00000000-0000-0000-0000-000000000001';
  
  RAISE NOTICE 'Performance metrics updated: Profit Factor=%, Sharpe=%, Max DD=%', 
    profit_factor_calc, sharpe, max_dd;
END;
$$;

-- Phase 5: Update trigger to call performance metrics for global account
CREATE OR REPLACE FUNCTION public.update_portfolio_performance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    -- If this is the global account, call the dedicated function
    IF NEW.portfolio_id = '00000000-0000-0000-0000-000000000001' THEN
        PERFORM calculate_global_performance_metrics();
        RETURN NEW;
    END IF;
    
    -- Original logic for shadow_portfolios
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
$function$;