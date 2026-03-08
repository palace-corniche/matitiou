
-- Fix Bug 1: update_module_performance_from_trade - add total_signals increment
CREATE OR REPLACE FUNCTION public.update_module_performance_from_trade(p_module_id text, p_signal_successful boolean, p_confidence numeric, p_strength numeric, p_return numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.module_performance
  SET 
    total_signals = total_signals + 1,
    successful_signals = CASE WHEN p_signal_successful THEN successful_signals + 1 ELSE successful_signals END,
    failed_signals = CASE WHEN NOT p_signal_successful THEN failed_signals + 1 ELSE failed_signals END,
    win_rate = CASE 
      WHEN (successful_signals + failed_signals + 1) > 0 
      THEN (CASE WHEN p_signal_successful THEN successful_signals + 1 ELSE successful_signals END)::numeric 
           / (successful_signals + failed_signals + 1) * 100
      ELSE 0 END,
    average_return = CASE 
      WHEN total_signals > 0 
      THEN ((average_return * total_signals) + p_return) / (total_signals + 1)
      ELSE p_return END,
    last_updated = now()
  WHERE module_id = p_module_id;
END;
$function$;

-- Fix Bug 3: close_shadow_trade - add margin release
CREATE OR REPLACE FUNCTION public.close_shadow_trade(p_trade_id uuid, p_close_price numeric, p_close_lot_size numeric DEFAULT NULL::numeric, p_close_reason text DEFAULT 'manual'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_trade RECORD;
  v_pips NUMERIC;
  v_pnl NUMERIC;
  v_account RECORD;
  v_margin_to_release NUMERIC;
BEGIN
  SELECT * INTO v_trade FROM public.shadow_trades WHERE id = p_trade_id AND status = 'open';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trade not found or already closed');
  END IF;

  IF v_trade.trade_type = 'buy' THEN
    v_pips := (p_close_price - v_trade.entry_price) * 10000;
  ELSE
    v_pips := (v_trade.entry_price - p_close_price) * 10000;
  END IF;

  v_pnl := v_pips * COALESCE(p_close_lot_size, v_trade.lot_size) * 10;

  UPDATE public.shadow_trades
  SET status = 'closed',
      exit_price = p_close_price,
      exit_time = now(),
      exit_reason = p_close_reason,
      profit_pips = v_pips,
      pnl = v_pnl,
      current_price = p_close_price,
      updated_at = now()
  WHERE id = p_trade_id;

  SELECT * INTO v_account FROM public.global_trading_account LIMIT 1;
  
  -- Calculate margin to release
  v_margin_to_release := COALESCE(v_trade.position_size, COALESCE(p_close_lot_size, v_trade.lot_size) * 100000) / COALESCE(v_account.leverage, 100);

  UPDATE public.global_trading_account
  SET balance = balance + v_pnl,
      equity = equity + v_pnl,
      used_margin = GREATEST(0, used_margin - v_margin_to_release),
      free_margin = LEAST(balance + v_pnl, free_margin + v_margin_to_release + v_pnl),
      margin = GREATEST(0, margin - v_margin_to_release),
      margin_level = CASE WHEN GREATEST(0, used_margin - v_margin_to_release) > 0 
        THEN ((equity + v_pnl) / GREATEST(0.01, used_margin - v_margin_to_release)) * 100 
        ELSE 0 END,
      total_trades = total_trades + 1,
      winning_trades = CASE WHEN v_pnl > 0 THEN winning_trades + 1 ELSE winning_trades END,
      losing_trades = CASE WHEN v_pnl <= 0 THEN losing_trades + 1 ELSE losing_trades END,
      win_rate = CASE WHEN (total_trades + 1) > 0
        THEN (CASE WHEN v_pnl > 0 THEN winning_trades + 1 ELSE winning_trades END)::NUMERIC / (total_trades + 1) * 100
        ELSE 0 END,
      peak_balance = GREATEST(peak_balance, balance + v_pnl),
      largest_win = CASE WHEN v_pnl > largest_win THEN v_pnl ELSE largest_win END,
      largest_loss = CASE WHEN v_pnl < largest_loss THEN v_pnl ELSE largest_loss END,
      updated_at = now()
  WHERE id = v_account.id;

  INSERT INTO public.trade_execution_log (trade_id, action, details, execution_timestamp)
  VALUES (p_trade_id, 'close', jsonb_build_object(
    'close_price', p_close_price,
    'pips', v_pips,
    'pnl', v_pnl,
    'reason', p_close_reason,
    'margin_released', v_margin_to_release
  ), now());

  RETURN jsonb_build_object('success', true, 'pips', v_pips, 'pnl', v_pnl, 'margin_released', v_margin_to_release);
END;
$function$;
