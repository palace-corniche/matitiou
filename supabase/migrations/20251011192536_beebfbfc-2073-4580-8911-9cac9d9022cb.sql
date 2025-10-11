-- Add master_signal_id to shadow_trades for outcome tracking
ALTER TABLE shadow_trades ADD COLUMN IF NOT EXISTS master_signal_id UUID REFERENCES master_signals(id);

-- Create index for performance queries
CREATE INDEX IF NOT EXISTS idx_shadow_trades_master_signal ON shadow_trades(master_signal_id) WHERE master_signal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shadow_trades_closed ON shadow_trades(status, exit_time) WHERE status = 'closed';

-- Function to calculate and update module performance based on closed trades
CREATE OR REPLACE FUNCTION public.calculate_module_performance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  trade_record RECORD;
  signal_record RECORD;
  module_name TEXT;
  success_rate NUMERIC;
  avg_return NUMERIC;
  current_weight NUMERIC;
  new_weight NUMERIC;
  learning_rate NUMERIC := 0.3; -- 30% weight to recent performance
BEGIN
  -- Process trades closed in the last 24 hours with linked signals
  FOR trade_record IN 
    SELECT 
      st.id,
      st.master_signal_id,
      st.pnl,
      st.profit_pips,
      st.exit_time,
      st.entry_time,
      CASE WHEN st.pnl > 0 THEN true ELSE false END as was_successful
    FROM shadow_trades st
    WHERE st.status = 'closed'
      AND st.master_signal_id IS NOT NULL
      AND st.exit_time > now() - interval '24 hours'
  LOOP
    -- Get the master signal and its contributing modules
    SELECT * INTO signal_record
    FROM master_signals
    WHERE id = trade_record.master_signal_id;
    
    IF FOUND THEN
      -- Update performance for each contributing module
      FOREACH module_name IN ARRAY signal_record.contributing_modules
      LOOP
        -- Calculate recent performance metrics for this module
        SELECT 
          CASE WHEN COUNT(*) > 0 THEN 
            COUNT(CASE WHEN st2.pnl > 0 THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC 
          ELSE 0.5 END,
          COALESCE(AVG(st2.pnl), 0)
        INTO success_rate, avg_return
        FROM shadow_trades st2
        JOIN master_signals ms2 ON st2.master_signal_id = ms2.id
        WHERE st2.status = 'closed'
          AND module_name = ANY(ms2.contributing_modules)
          AND st2.exit_time > now() - interval '7 days';
        
        -- Get current weight
        SELECT COALESCE(historical_weight, 0.1) INTO current_weight
        FROM module_performance
        WHERE module_id = module_name;
        
        -- Apply exponential moving average: new_weight = 0.7 * old + 0.3 * performance
        new_weight := (1 - learning_rate) * current_weight + learning_rate * success_rate;
        
        -- Ensure weight stays in reasonable bounds [0.05, 0.25]
        new_weight := GREATEST(0.05, LEAST(0.25, new_weight));
        
        -- Update module performance
        INSERT INTO module_performance (
          module_id,
          signals_generated,
          successful_signals,
          failed_signals,
          average_return,
          win_rate,
          reliability,
          historical_weight,
          last_updated
        )
        VALUES (
          module_name,
          1,
          CASE WHEN trade_record.was_successful THEN 1 ELSE 0 END,
          CASE WHEN NOT trade_record.was_successful THEN 1 ELSE 0 END,
          avg_return,
          success_rate * 100,
          success_rate,
          new_weight,
          now()
        )
        ON CONFLICT (module_id) 
        DO UPDATE SET
          signals_generated = module_performance.signals_generated + 1,
          successful_signals = module_performance.successful_signals + 
            CASE WHEN trade_record.was_successful THEN 1 ELSE 0 END,
          failed_signals = module_performance.failed_signals + 
            CASE WHEN NOT trade_record.was_successful THEN 1 ELSE 0 END,
          average_return = avg_return,
          win_rate = success_rate * 100,
          reliability = success_rate,
          historical_weight = new_weight,
          last_updated = now();
      END LOOP;
    END IF;
  END LOOP;
  
  -- Log the performance update
  INSERT INTO trading_diagnostics (
    diagnostic_type,
    severity_level,
    metadata
  ) VALUES (
    'module_performance_update',
    'info',
    jsonb_build_object(
      'timestamp', now(),
      'trades_processed', (
        SELECT COUNT(*) 
        FROM shadow_trades 
        WHERE status = 'closed' 
          AND master_signal_id IS NOT NULL 
          AND exit_time > now() - interval '24 hours'
      )
    )
  );
END;
$$;

-- Update close_shadow_trade function to trigger performance calculation
CREATE OR REPLACE FUNCTION public.close_shadow_trade(p_trade_id uuid, p_close_price numeric, p_close_lot_size numeric DEFAULT NULL::numeric, p_close_reason text DEFAULT 'manual'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    trade_record shadow_trades%ROWTYPE;
    portfolio_record shadow_portfolios%ROWTYPE;
    global_account_record global_trading_account%ROWTYPE;
    close_lot_size NUMERIC;
    pip_difference NUMERIC;
    pip_value_calc NUMERIC;
    profit_amount NUMERIC;
    commission_amount NUMERIC;
    swap_amount NUMERIC;
    net_profit NUMERIC;
    is_partial_close BOOLEAN;
    result JSON;
    balance_before NUMERIC;
    equity_before NUMERIC;
BEGIN
    -- Get trade details
    SELECT * INTO trade_record FROM shadow_trades WHERE id = p_trade_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trade not found';
    END IF;
    
    -- Get account details (portfolio or global)
    IF trade_record.portfolio_id IS NOT NULL THEN
        SELECT * INTO portfolio_record FROM shadow_portfolios WHERE id = trade_record.portfolio_id;
        balance_before := portfolio_record.balance;
        equity_before := portfolio_record.equity;
    ELSE
        SELECT * INTO global_account_record FROM global_trading_account WHERE id = '00000000-0000-0000-0000-000000000001';
        balance_before := global_account_record.balance;
        equity_before := global_account_record.equity;
    END IF;
    
    -- Determine close lot size
    close_lot_size := COALESCE(p_close_lot_size, trade_record.remaining_lot_size);
    is_partial_close := close_lot_size < trade_record.remaining_lot_size;
    
    -- Calculate profit using correct pip calculation
    IF trade_record.trade_type = 'buy' THEN
        pip_difference := (p_close_price - trade_record.entry_price) / 0.0001;
    ELSE
        pip_difference := (trade_record.entry_price - p_close_price) / 0.0001;
    END IF;
    
    pip_value_calc := close_lot_size * 10;
    profit_amount := pip_difference * pip_value_calc;
    
    -- Calculate commission and swap
    commission_amount := close_lot_size * 0.5;
    swap_amount := 0;
    
    net_profit := profit_amount - commission_amount - swap_amount;
    
    -- Update account balance and stats
    IF trade_record.portfolio_id IS NOT NULL THEN
        UPDATE shadow_portfolios 
        SET 
            balance = balance + net_profit,
            equity = equity + net_profit,
            total_trades = CASE WHEN NOT is_partial_close THEN total_trades + 1 ELSE total_trades END,
            winning_trades = CASE WHEN net_profit > 0 AND NOT is_partial_close THEN winning_trades + 1 ELSE winning_trades END,
            losing_trades = CASE WHEN net_profit <= 0 AND NOT is_partial_close THEN losing_trades + 1 ELSE losing_trades END,
            updated_at = now()
        WHERE id = trade_record.portfolio_id;
    ELSE
        UPDATE global_trading_account
        SET
            balance = balance + net_profit,
            equity = equity + net_profit,
            total_trades = CASE WHEN NOT is_partial_close THEN total_trades + 1 ELSE total_trades END,
            winning_trades = CASE WHEN net_profit > 0 AND NOT is_partial_close THEN winning_trades + 1 ELSE winning_trades END,
            losing_trades = CASE WHEN net_profit <= 0 AND NOT is_partial_close THEN losing_trades + 1 ELSE losing_trades END,
            win_rate = CASE 
                WHEN (total_trades + 1) > 0 
                THEN (CASE WHEN net_profit > 0 THEN winning_trades + 1 ELSE winning_trades END)::NUMERIC / (total_trades + 1)::NUMERIC * 100
                ELSE 0 
            END,
            updated_at = now()
        WHERE id = '00000000-0000-0000-0000-000000000001';
    END IF;
    
    -- Insert trade history record
    INSERT INTO trade_history (
        portfolio_id, original_trade_id, action_type, symbol, trade_type,
        lot_size, execution_price, profit, profit_pips, commission, swap,
        balance_before, balance_after, equity_before, equity_after,
        execution_time
    ) VALUES (
        COALESCE(trade_record.portfolio_id, '00000000-0000-0000-0000-000000000001'),
        p_trade_id, 
        CASE WHEN is_partial_close THEN 'partial_close' ELSE 'close' END,
        trade_record.symbol, 
        trade_record.trade_type, 
        close_lot_size, 
        p_close_price,
        net_profit, 
        pip_difference, 
        commission_amount, 
        swap_amount,
        balance_before, 
        balance_before + net_profit,
        equity_before, 
        equity_before + net_profit,
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
            pnl_percent = (net_profit / (trade_record.entry_price * trade_record.lot_size * 100000)) * 100,
            profit = profit_amount,
            profit_pips = pip_difference,
            commission = commission_amount,
            swap = swap_amount,
            close_type = 'full',
            updated_at = now()
        WHERE id = p_trade_id;
        
        -- Trigger performance calculation for closed trades with signals
        IF trade_record.master_signal_id IS NOT NULL THEN
          PERFORM calculate_module_performance();
        END IF;
    END IF;
    
    -- Return result
    result := json_build_object(
        'success', true,
        'trade_id', p_trade_id,
        'closed_lot_size', close_lot_size,
        'profit', net_profit,
        'profit_pips', pip_difference,
        'is_partial', is_partial_close,
        'new_balance', balance_before + net_profit,
        'close_reason', p_close_reason
    );
    
    RETURN result;
END;
$function$;

-- Schedule daily performance review using pg_cron
SELECT cron.schedule(
  'module-performance-update',
  '0 0 * * *',  -- Daily at midnight UTC
  $$SELECT public.calculate_module_performance()$$
);