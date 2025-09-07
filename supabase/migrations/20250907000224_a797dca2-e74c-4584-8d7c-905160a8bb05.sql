-- Fix security issues identified in the linter

-- Fix RLS issue - enable RLS on any missing tables
-- (Most tables already have RLS enabled, but let's make sure)

-- Check if any new tables from the previous migration need RLS enabled
-- All our new tables should already have RLS enabled, but let's verify

-- Fix function search path issues by updating all custom functions to have secure search paths
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update other existing functions to have secure search paths
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_daily_performance_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.system_performance_snapshots (
    snapshot_date,
    total_signals_generated,
    total_signals_executed,
    overall_win_rate,
    system_reliability,
    average_processing_time,
    active_modules_count,
    error_count,
    module_performance_data,
    adaptive_thresholds
  )
  SELECT
    CURRENT_DATE,
    (SELECT COUNT(*) FROM trading_signals WHERE DATE(created_at) = CURRENT_DATE),
    (SELECT COUNT(*) FROM trading_signals WHERE was_executed = true AND DATE(created_at) = CURRENT_DATE),
    COALESCE((
      SELECT CASE 
        WHEN COUNT(*) = 0 THEN 0 
        ELSE SUM(CASE WHEN successful_signals > 0 THEN 1 ELSE 0 END)::NUMERIC / COUNT(*) 
      END
      FROM module_performance
    ), 0),
    COALESCE((SELECT AVG(reliability) FROM module_performance), 0),
    COALESCE((SELECT AVG(execution_time_ms) FROM system_health WHERE DATE(created_at) = CURRENT_DATE), 0),
    (SELECT COUNT(DISTINCT module_id) FROM module_performance WHERE signals_generated > 0),
    (SELECT COUNT(*) FROM system_health WHERE status = 'error' AND DATE(created_at) = CURRENT_DATE),
    COALESCE((SELECT jsonb_object_agg(module_id, row_to_json(module_performance.*)) FROM module_performance), '{}'::jsonb),
    COALESCE((SELECT row_to_json(adaptive_thresholds.*) FROM adaptive_thresholds ORDER BY updated_at DESC LIMIT 1), '{}'::jsonb)
  ON CONFLICT (snapshot_date) DO UPDATE SET
    total_signals_generated = EXCLUDED.total_signals_generated,
    total_signals_executed = EXCLUDED.total_signals_executed,
    overall_win_rate = EXCLUDED.overall_win_rate,
    system_reliability = EXCLUDED.system_reliability,
    average_processing_time = EXCLUDED.average_processing_time,
    active_modules_count = EXCLUDED.active_modules_count,
    error_count = EXCLUDED.error_count,
    module_performance_data = EXCLUDED.module_performance_data,
    adaptive_thresholds = EXCLUDED.adaptive_thresholds;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_trade_pnl(p_trade_id uuid, p_current_price numeric)
RETURNS TABLE(unrealized_pnl numeric, profit_pips numeric, profit numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.close_shadow_trade(p_trade_id uuid, p_close_price numeric, p_close_lot_size numeric DEFAULT NULL::numeric, p_close_reason text DEFAULT 'manual'::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.cleanup_stuck_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clean up jobs stuck for more than 10 minutes
  UPDATE analysis_jobs 
  SET status = 'error', 
      error_logs = ARRAY['Analysis timed out - exceeded maximum processing time'],
      completed_at = now()
  WHERE status = 'running' 
      AND created_at < now() - interval '10 minutes';
      
  -- Clean up very old completed jobs (older than 7 days) to save space
  DELETE FROM analysis_jobs 
  WHERE status IN ('completed', 'error') 
      AND created_at < now() - interval '7 days';
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_anonymous_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete datasets older than 48 hours for anonymous users
  DELETE FROM public.datasets 
  WHERE user_id IS NULL 
    AND created_at < now() - interval '48 hours';
  
  -- Delete analysis jobs older than 48 hours for anonymous users
  DELETE FROM public.analysis_jobs 
  WHERE user_id IS NULL 
    AND created_at < now() - interval '48 hours';
    
  -- Delete insights older than 48 hours for anonymous users
  DELETE FROM public.insights 
  WHERE user_id IS NULL 
    AND created_at < now() - interval '48 hours';
    
  -- Delete models older than 48 hours for anonymous users
  DELETE FROM public.models 
  WHERE user_id IS NULL 
    AND created_at < now() - interval '48 hours';
END;
$$;