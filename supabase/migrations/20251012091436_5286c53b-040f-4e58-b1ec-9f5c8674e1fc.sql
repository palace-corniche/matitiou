-- Fix balance reversion: Update calculate_global_performance_metrics to NOT recalculate balance
-- This prevents overwriting the correct balance from trade operations with stale values from history

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
  peak_balance_val NUMERIC;
  max_dd NUMERIC;
  current_dd NUMERIC;
  total_trades_count INTEGER;
  winning_trades_count INTEGER;
  losing_trades_count INTEGER;
  win_rate_calc NUMERIC;
  current_balance NUMERIC;
  current_equity NUMERIC;
BEGIN
  -- Get current balance/equity from the account (don't recalculate from history)
  SELECT balance, equity INTO current_balance, current_equity
  FROM global_trading_account
  WHERE id = '00000000-0000-0000-0000-000000000001';
  
  -- Get closed trades metrics from trade_history
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN profit > 0 THEN 1 END),
    COUNT(CASE WHEN profit < 0 THEN 1 END),
    COALESCE(SUM(CASE WHEN profit > 0 THEN profit ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN profit < 0 THEN ABS(profit) ELSE 0 END), 0),
    COALESCE(AVG(CASE WHEN profit > 0 THEN profit END), 0),
    COALESCE(AVG(CASE WHEN profit < 0 THEN ABS(profit) END), 0),
    COALESCE(MAX(profit), 0),
    COALESCE(MIN(profit), 0)
  INTO 
    total_trades_count,
    winning_trades_count,
    losing_trades_count,
    total_profit, 
    total_loss, 
    avg_win, 
    avg_loss, 
    largest_win_val, 
    largest_loss_val
  FROM trade_history
  WHERE portfolio_id = '00000000-0000-0000-0000-000000000001'
    AND action_type = 'close';
  
  -- Calculate win rate
  win_rate_calc := CASE 
    WHEN total_trades_count > 0 
    THEN (winning_trades_count::NUMERIC / total_trades_count::NUMERIC) * 100
    ELSE 0 
  END;
  
  -- Calculate profit factor
  profit_factor_calc := CASE 
    WHEN total_loss > 0 THEN total_profit / total_loss
    WHEN total_profit > 0 THEN total_profit
    ELSE 0 
  END;
  
  -- Calculate peak balance from trade history
  SELECT COALESCE(MAX(balance_after), current_balance) INTO peak_balance_val
  FROM trade_history
  WHERE portfolio_id = '00000000-0000-0000-0000-000000000001';
  
  -- Ensure peak is at least current balance
  peak_balance_val := GREATEST(peak_balance_val, current_balance);
  
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
  
  -- Update global account with performance metrics ONLY (NOT balance/equity)
  UPDATE global_trading_account
  SET
    -- DO NOT UPDATE balance/equity - they are maintained by trade operations only
    total_trades = total_trades_count,
    winning_trades = winning_trades_count,
    losing_trades = losing_trades_count,
    win_rate = win_rate_calc,
    average_win = avg_win,
    average_loss = avg_loss,
    profit_factor = profit_factor_calc,
    sharpe_ratio = sharpe,
    max_drawdown = GREATEST(max_drawdown, max_dd),
    current_drawdown = current_dd,
    peak_balance = GREATEST(peak_balance, peak_balance_val),
    max_equity = GREATEST(max_equity, current_equity),
    largest_win = GREATEST(largest_win, largest_win_val),
    largest_loss = GREATEST(largest_loss, ABS(largest_loss_val)),
    updated_at = now()
  WHERE id = '00000000-0000-0000-0000-000000000001';
END;
$$;

-- Add comment to document the fix
COMMENT ON FUNCTION public.calculate_global_performance_metrics() IS 
'Updates performance metrics only. Balance and equity are maintained solely by trade operations (close_shadow_trade) to prevent reversion to stale values from trade_history.';