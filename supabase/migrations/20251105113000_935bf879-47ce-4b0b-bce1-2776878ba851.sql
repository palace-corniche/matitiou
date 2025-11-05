-- PHASE 1: Fix PnL Calculation & Storage

-- Step 1: Add NOT NULL constraints with defaults to trade_history
ALTER TABLE trade_history 
  ALTER COLUMN profit SET NOT NULL,
  ALTER COLUMN profit SET DEFAULT 0,
  ALTER COLUMN profit_pips SET NOT NULL,
  ALTER COLUMN profit_pips SET DEFAULT 0;

-- Step 2: Create validation trigger for trade_history profit
CREATE OR REPLACE FUNCTION validate_trade_profit()
RETURNS TRIGGER AS $$
BEGIN
  -- Log all inserts for debugging
  RAISE NOTICE 'Inserting trade_history: trade_id=%, profit=%, profit_pips=%, action=%', 
    NEW.original_trade_id, NEW.profit, NEW.profit_pips, NEW.action_type;
  
  -- Validate that profit was calculated for closed trades
  IF NEW.action_type IN ('close', 'partial_close') AND 
     (NEW.profit IS NULL OR NEW.profit_pips IS NULL) THEN
    RAISE EXCEPTION 'Profit and profit_pips cannot be NULL for closed trades';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trade_history_profit_validation
  BEFORE INSERT ON trade_history
  FOR EACH ROW
  EXECUTE FUNCTION validate_trade_profit();

-- Step 3: Update close_shadow_trade function to fix PnL mapping
CREATE OR REPLACE FUNCTION public.close_shadow_trade(
  p_trade_id uuid, 
  p_close_price numeric, 
  p_close_lot_size numeric DEFAULT NULL::numeric, 
  p_close_reason text DEFAULT 'manual'::text
)
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
    
    -- Get account details
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
    
    -- Calculate profit using CORRECT pip calculation
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
    
    -- LOG ALL CALCULATIONS FOR DEBUGGING
    RAISE NOTICE 'PnL Calculation: trade_type=%, entry=%, exit=%, lot=%, pip_diff=%, pip_value=%, profit=%, commission=%, net=%',
      trade_record.trade_type, trade_record.entry_price, p_close_price, close_lot_size, 
      pip_difference, pip_value_calc, profit_amount, commission_amount, net_profit;
    
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
    
    -- Insert trade history with EXPLICIT column mapping
    INSERT INTO trade_history (
        portfolio_id, 
        original_trade_id, 
        action_type, 
        symbol, 
        trade_type,
        lot_size, 
        execution_price, 
        profit,           -- EXPLICIT
        profit_pips,      -- EXPLICIT
        commission, 
        swap,
        balance_before, 
        balance_after, 
        equity_before, 
        equity_after,
        execution_time
    ) VALUES (
        COALESCE(trade_record.portfolio_id, '00000000-0000-0000-0000-000000000001'),
        p_trade_id, 
        CASE WHEN is_partial_close THEN 'partial_close' ELSE 'close' END,
        trade_record.symbol, 
        trade_record.trade_type, 
        close_lot_size, 
        p_close_price,
        net_profit,       -- EXPLICIT: use net_profit
        pip_difference,   -- EXPLICIT: use pip_difference
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
        
        -- Trigger performance calculation
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

-- Step 4: Backfill missing PnL for existing closed trades
UPDATE trade_history th
SET 
  profit = COALESCE(st.pnl, 0),
  profit_pips = COALESCE(st.profit_pips, 0)
FROM shadow_trades st
WHERE th.original_trade_id = st.id
  AND th.action_type IN ('close', 'partial_close')
  AND (th.profit = 0 OR th.profit IS NULL OR th.profit_pips = 0 OR th.profit_pips IS NULL)
  AND st.status = 'closed';