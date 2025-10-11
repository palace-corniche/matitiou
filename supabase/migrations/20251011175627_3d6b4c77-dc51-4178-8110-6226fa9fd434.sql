-- CRITICAL FIXES - Complete Solution
-- Fix all ambiguous column references across all functions

-- Step 1: Update exit_reason constraint
ALTER TABLE public.shadow_trades DROP CONSTRAINT IF EXISTS shadow_trades_exit_reason_check;
ALTER TABLE public.shadow_trades 
ADD CONSTRAINT shadow_trades_exit_reason_check 
CHECK (exit_reason IN (
  'manual', 'stop_loss', 'take_profit', 'opposing_signal', 'sr_rejection',
  'trend_reversal', 'news_event', 'volatility_spike', 'quick_profit_10',
  'trailing_stop', '15_pips_profit', 'adaptive_time_exit', 'intelligence_exit',
  'duplicate_cleanup', 'time_exit'
));

-- Step 2: Fix update_eurusd_pnl with fully qualified columns
DROP FUNCTION IF EXISTS public.update_eurusd_pnl();

CREATE OR REPLACE FUNCTION public.update_eurusd_pnl()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trade_rec RECORD;
  latest_price NUMERIC;
  pips NUMERIC;
  pip_val NUMERIC;
  unrealized_calc NUMERIC;
BEGIN
  SELECT mdf.price INTO latest_price
  FROM public.market_data_feed mdf
  WHERE mdf.symbol = 'EUR/USD'
  ORDER BY mdf.timestamp DESC
  LIMIT 1;

  IF latest_price IS NULL THEN RETURN; END IF;

  FOR trade_rec IN 
    SELECT st.* FROM public.shadow_trades st
    WHERE st.status = 'open' AND st.symbol = 'EUR/USD'
  LOOP
    IF trade_rec.trade_type = 'buy' THEN
      pips := (latest_price - trade_rec.entry_price) / 0.0001;
    ELSE
      pips := (trade_rec.entry_price - latest_price) / 0.0001;
    END IF;
    
    pip_val := trade_rec.remaining_lot_size * 10;
    unrealized_calc := pips * pip_val;
    
    UPDATE public.shadow_trades
    SET 
      current_price = latest_price,
      unrealized_pnl = unrealized_calc,
      profit_pips = pips,
      updated_at = now()
    WHERE id = trade_rec.id;
  END LOOP;
  
  UPDATE public.shadow_portfolios sp
  SET 
    equity = sp.balance + COALESCE((
      SELECT SUM(st.unrealized_pnl)
      FROM public.shadow_trades st
      WHERE st.portfolio_id = sp.id AND st.status = 'open'
    ), 0),
    updated_at = now()
  WHERE EXISTS (
    SELECT 1 FROM public.shadow_trades st2
    WHERE st2.portfolio_id = sp.id AND st2.status = 'open'
  );
  
  UPDATE public.global_trading_account gta
  SET 
    equity = gta.balance + COALESCE((
      SELECT SUM(st.unrealized_pnl)
      FROM public.shadow_trades st
      WHERE st.portfolio_id = gta.id AND st.status = 'open'
    ), 0),
    floating_pnl = COALESCE((
      SELECT SUM(st.unrealized_pnl)
      FROM public.shadow_trades st
      WHERE st.portfolio_id = gta.id AND st.status = 'open'
    ), 0),
    updated_at = now()
  WHERE gta.id = '00000000-0000-0000-0000-000000000001';
END;
$$;

-- Step 3: Fix global account trigger with fully qualified columns
DROP TRIGGER IF EXISTS update_global_trading_account_metrics ON public.shadow_trades;

CREATE OR REPLACE FUNCTION public.update_global_trading_account_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.portfolio_id = '00000000-0000-0000-0000-000000000001' 
     AND NEW.status = 'closed' 
     AND (OLD IS NULL OR OLD.status != 'closed') THEN
    
    UPDATE public.global_trading_account gta
    SET 
      balance = gta.balance + COALESCE(NEW.pnl, 0),
      equity = gta.equity + COALESCE(NEW.pnl, 0),
      total_trades = gta.total_trades + 1,
      winning_trades = CASE WHEN COALESCE(NEW.pnl, 0) > 0 THEN gta.winning_trades + 1 ELSE gta.winning_trades END,
      losing_trades = CASE WHEN COALESCE(NEW.pnl, 0) <= 0 THEN gta.losing_trades + 1 ELSE gta.losing_trades END,
      win_rate = CASE 
        WHEN (gta.total_trades + 1) > 0 
        THEN (CASE WHEN COALESCE(NEW.pnl, 0) > 0 THEN gta.winning_trades + 1 ELSE gta.winning_trades END)::NUMERIC / (gta.total_trades + 1)::NUMERIC * 100
        ELSE 0 
      END,
      largest_win = GREATEST(gta.largest_win, COALESCE(NEW.pnl, 0)),
      largest_loss = LEAST(gta.largest_loss, COALESCE(NEW.pnl, 0)),
      peak_balance = GREATEST(gta.peak_balance, gta.balance + COALESCE(NEW.pnl, 0)),
      updated_at = now()
    WHERE gta.id = '00000000-0000-0000-0000-000000000001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_global_trading_account_metrics
  AFTER INSERT OR UPDATE ON public.shadow_trades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_global_trading_account_metrics();

-- Step 4: Close duplicate trades
WITH duplicates AS (
  SELECT 
    id,
    entry_price,
    ROW_NUMBER() OVER (
      PARTITION BY portfolio_id, symbol, trade_type, entry_price 
      ORDER BY entry_time ASC
    ) as rn
  FROM public.shadow_trades
  WHERE status = 'open'
)
UPDATE public.shadow_trades st
SET 
  status = 'closed',
  exit_time = now(),
  exit_price = d.entry_price,
  exit_reason = 'duplicate_cleanup',
  pnl = 0,
  updated_at = now()
FROM duplicates d
WHERE st.id = d.id AND d.rn > 1;

-- Step 5: Prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_open_trade_per_signal
ON public.shadow_trades (portfolio_id, symbol, trade_type, entry_price)
WHERE status = 'open';

DO $$
DECLARE
  closed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO closed_count
  FROM public.shadow_trades
  WHERE status = 'closed' AND exit_reason = 'duplicate_cleanup';
  
  RAISE NOTICE '✅ CRITICAL FIXES COMPLETE';
  RAISE NOTICE '  Closed % duplicate trades', closed_count;
  RAISE NOTICE '  unrealized_pnl ambiguity: FIXED';
  RAISE NOTICE '  Global account trigger: ACTIVE';
  RAISE NOTICE '  Duplicate prevention: ENABLED';
END $$;