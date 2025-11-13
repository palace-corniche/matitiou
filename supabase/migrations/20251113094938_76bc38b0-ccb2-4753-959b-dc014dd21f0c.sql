-- ============================================================================
-- COMPREHENSIVE PNL AND BALANCE FIX - END TO END
-- ============================================================================
-- This migration fixes all PnL, pips, and balance calculations system-wide
--
-- Key fixes:
-- 1. Enforce correct bid/ask spread on trade close
-- 2. Ensure pips calculation is always correct
-- 3. Fix balance tracking in trade_history
-- 4. Add validation and constraints
-- ============================================================================

-- 1. Create helper function to get correct close price with bid/ask spread
CREATE OR REPLACE FUNCTION get_close_price_with_spread(
  p_trade_type text,
  p_market_price numeric,
  p_spread numeric DEFAULT 0.00015
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
BEGIN
  -- BUY trades close at BID (market_price - spread/2)
  -- SELL trades close at ASK (market_price + spread/2)
  IF p_trade_type = 'buy' THEN
    RETURN p_market_price - (p_spread / 2);
  ELSE
    RETURN p_market_price + (p_spread / 2);
  END IF;
END;
$$;

-- 2. Updated close_shadow_trade with proper bid/ask handling
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
    final_close_price NUMERIC;
BEGIN
    -- Get trade details
    SELECT * INTO trade_record FROM shadow_trades WHERE id = p_trade_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trade not found';
    END IF;
    
    -- Apply bid/ask spread to close price
    -- BUY trades close at BID, SELL trades close at ASK
    final_close_price := get_close_price_with_spread(trade_record.trade_type, p_close_price);
    
    RAISE NOTICE 'Closing % trade: market=%, adjusted=%', 
      trade_record.trade_type, p_close_price, final_close_price;
    
    -- Get account details (portfolio or global)
    IF trade_record.portfolio_id IS NOT NULL THEN
        SELECT * INTO portfolio_record FROM shadow_portfolios WHERE id = trade_record.portfolio_id;
        balance_before := portfolio_record.balance;
        equity_before := portfolio_record.equity;
    ELSE
        SELECT * INTO global_account_record FROM global_trading_account 
        WHERE id = '00000000-0000-0000-0000-000000000001';
        balance_before := global_account_record.balance;
        equity_before := global_account_record.equity;
    END IF;
    
    -- Determine close lot size
    close_lot_size := COALESCE(p_close_lot_size, trade_record.remaining_lot_size);
    is_partial_close := close_lot_size < trade_record.remaining_lot_size;
    
    -- ========================================================================
    -- CRITICAL: Correct pip calculation for EUR/USD
    -- 1 pip = 0.0001 price movement
    -- BUY: profit when close > entry (close - entry) / 0.0001
    -- SELL: profit when close < entry (entry - close) / 0.0001
    -- ========================================================================
    IF trade_record.trade_type = 'buy' THEN
        pip_difference := (final_close_price - trade_record.entry_price) / 0.0001;
    ELSE
        pip_difference := (trade_record.entry_price - final_close_price) / 0.0001;
    END IF;
    
    -- ========================================================================
    -- CRITICAL: Correct PnL calculation
    -- For EUR/USD: $10 per pip per 1.0 lot
    -- pip_value = lot_size * $10
    -- profit = pips * pip_value
    -- ========================================================================
    pip_value_calc := close_lot_size * 10;
    profit_amount := pip_difference * pip_value_calc;
    
    -- Calculate fees
    commission_amount := close_lot_size * 0.5;  -- $0.50 per 0.01 lot
    swap_amount := 0;  -- Can be calculated based on holding time if needed
    
    net_profit := profit_amount - commission_amount - swap_amount;
    
    RAISE NOTICE 'PnL Calc: pips=%, pip_value=%, gross_profit=%, commission=%, net=%, balance_before=%', 
      pip_difference, pip_value_calc, profit_amount, commission_amount, net_profit, balance_before;
    
    -- Update account balance and stats
    IF trade_record.portfolio_id IS NOT NULL THEN
        UPDATE shadow_portfolios 
        SET 
            balance = balance + net_profit,
            equity = equity + net_profit,
            total_trades = CASE WHEN NOT is_partial_close THEN total_trades + 1 ELSE total_trades END,
            winning_trades = CASE WHEN net_profit > 0 AND NOT is_partial_close THEN winning_trades + 1 ELSE winning_trades END,
            losing_trades = CASE WHEN net_profit <= 0 AND NOT is_partial_close THEN losing_trades + 1 ELSE losing_trades END,
            win_rate = CASE 
                WHEN (total_trades + CASE WHEN NOT is_partial_close THEN 1 ELSE 0 END) > 0
                THEN (
                  CASE WHEN net_profit > 0 AND NOT is_partial_close 
                  THEN winning_trades + 1 
                  ELSE winning_trades END
                )::NUMERIC / (total_trades + CASE WHEN NOT is_partial_close THEN 1 ELSE 0 END)::NUMERIC * 100
                ELSE 0
            END,
            updated_at = now()
        WHERE id = trade_record.portfolio_id;
    ELSE
        UPDATE global_trading_account
        SET
            balance = balance + net_profit,
            equity = equity + net_profit,
            floating_pnl = floating_pnl - COALESCE(trade_record.profit, 0),
            total_trades = CASE WHEN NOT is_partial_close THEN total_trades + 1 ELSE total_trades END,
            winning_trades = CASE WHEN net_profit > 0 AND NOT is_partial_close THEN winning_trades + 1 ELSE winning_trades END,
            losing_trades = CASE WHEN net_profit <= 0 AND NOT is_partial_close THEN losing_trades + 1 ELSE losing_trades END,
            win_rate = CASE 
                WHEN (total_trades + CASE WHEN NOT is_partial_close THEN 1 ELSE 0 END) > 0 
                THEN (
                  CASE WHEN net_profit > 0 AND NOT is_partial_close 
                  THEN winning_trades + 1 
                  ELSE winning_trades END
                )::NUMERIC / (total_trades + CASE WHEN NOT is_partial_close THEN 1 ELSE 0 END)::NUMERIC * 100
                ELSE 0 
            END,
            updated_at = now()
        WHERE id = '00000000-0000-0000-0000-000000000001';
    END IF;
    
    -- Insert trade history record with CORRECT balance tracking
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
        final_close_price,
        net_profit, 
        pip_difference, 
        commission_amount, 
        swap_amount,
        balance_before, 
        balance_before + net_profit,  -- Correct balance_after
        equity_before, 
        equity_before + net_profit,   -- Correct equity_after
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
            exit_price = final_close_price,
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
    END IF;
    
    -- Return result
    result := json_build_object(
        'success', true,
        'trade_id', p_trade_id,
        'closed_lot_size', close_lot_size,
        'profit', net_profit,
        'profit_pips', pip_difference,
        'close_price', final_close_price,
        'balance_after', balance_before + net_profit,
        'equity_after', equity_before + net_profit,
        'portfolio_id', COALESCE(trade_record.portfolio_id, '00000000-0000-0000-0000-000000000001')
    );
    
    RETURN result;
END;
$function$;

-- 3. Add check constraints to ensure data integrity
ALTER TABLE shadow_trades DROP CONSTRAINT IF EXISTS check_entry_price_realistic;
ALTER TABLE shadow_trades ADD CONSTRAINT check_entry_price_realistic 
  CHECK (symbol != 'EUR/USD' OR (entry_price >= 0.9 AND entry_price <= 2.0));

ALTER TABLE shadow_trades DROP CONSTRAINT IF EXISTS check_lot_size_positive;
ALTER TABLE shadow_trades ADD CONSTRAINT check_lot_size_positive 
  CHECK (lot_size > 0 AND lot_size <= 100);

-- 4. Create verification function to check PnL calculations
CREATE OR REPLACE FUNCTION verify_pnl_calculation(p_trade_id uuid)
RETURNS TABLE(
  trade_id uuid,
  entry_price numeric,
  exit_price numeric,
  trade_type text,
  lot_size numeric,
  calculated_pips numeric,
  stored_pips numeric,
  calculated_pnl numeric,
  stored_pnl numeric,
  pips_match boolean,
  pnl_match boolean
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.entry_price,
    t.exit_price,
    t.trade_type,
    t.lot_size,
    -- Recalculate pips
    CASE 
      WHEN t.trade_type = 'buy' THEN (t.exit_price - t.entry_price) / 0.0001
      ELSE (t.entry_price - t.exit_price) / 0.0001
    END as calc_pips,
    t.profit_pips as stored_pips,
    -- Recalculate PnL
    (CASE 
      WHEN t.trade_type = 'buy' THEN (t.exit_price - t.entry_price) / 0.0001
      ELSE (t.entry_price - t.exit_price) / 0.0001
    END) * t.lot_size * 10 - COALESCE(t.commission, 0) - COALESCE(t.swap, 0) as calc_pnl,
    t.pnl as stored_pnl,
    -- Check if they match (within 0.1 pip tolerance)
    ABS((CASE 
      WHEN t.trade_type = 'buy' THEN (t.exit_price - t.entry_price) / 0.0001
      ELSE (t.entry_price - t.exit_price) / 0.0001
    END) - COALESCE(t.profit_pips, 0)) < 0.1 as pips_match,
    ABS((CASE 
      WHEN t.trade_type = 'buy' THEN (t.exit_price - t.entry_price) / 0.0001
      ELSE (t.entry_price - t.exit_price) / 0.0001
    END) * t.lot_size * 10 - COALESCE(t.commission, 0) - COALESCE(t.swap, 0) - COALESCE(t.pnl, 0)) < 0.01 as pnl_match
  FROM shadow_trades t
  WHERE t.id = p_trade_id AND t.status = 'closed';
END;
$$;

-- 5. Add comments for documentation
COMMENT ON FUNCTION close_shadow_trade IS 'Fixed PnL calculation with proper bid/ask spread handling, correct pip calculation, and accurate balance tracking';
COMMENT ON FUNCTION get_close_price_with_spread IS 'Applies correct bid/ask spread: BUY closes at BID (market - spread/2), SELL closes at ASK (market + spread/2)';
COMMENT ON FUNCTION verify_pnl_calculation IS 'Verifies PnL and pips calculations are correct for a closed trade';