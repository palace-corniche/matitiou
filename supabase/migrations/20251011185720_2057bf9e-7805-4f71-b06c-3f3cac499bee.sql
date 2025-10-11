-- Fix calculate_global_performance_metrics to sync all fields from trade_history
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
  total_trades_count INTEGER;
  winning_trades_count INTEGER;
  losing_trades_count INTEGER;
  win_rate_calc NUMERIC;
BEGIN
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
  
  -- Get current balance from trade_history (most recent balance_after)
  SELECT COALESCE(balance_after, 100000) INTO current_balance
  FROM trade_history
  WHERE portfolio_id = '00000000-0000-0000-0000-000000000001'
  ORDER BY execution_time DESC
  LIMIT 1;
  
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
  
  -- Update global account with ALL calculated metrics
  UPDATE global_trading_account
  SET
    balance = current_balance,
    equity = current_balance,
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
    peak_balance = peak_balance_val,
    max_equity = GREATEST(max_equity, current_balance),
    largest_win = largest_win_val,
    largest_loss = ABS(largest_loss_val),
    updated_at = now()
  WHERE id = '00000000-0000-0000-0000-000000000001';
END;
$$;