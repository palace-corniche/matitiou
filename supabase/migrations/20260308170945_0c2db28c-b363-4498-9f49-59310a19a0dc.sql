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
      total_pnl = total_pnl + v_pnl,
      average_win = CASE WHEN v_pnl > 0 
        THEN (average_win * winning_trades + v_pnl) / (winning_trades + 1) 
        ELSE average_win END,
      average_loss = CASE WHEN v_pnl <= 0 
        THEN CASE WHEN losing_trades > 0 
          THEN (average_loss * losing_trades + v_pnl) / (losing_trades + 1) 
          ELSE v_pnl END 
        ELSE average_loss END,
      profit_factor = CASE WHEN (CASE WHEN v_pnl <= 0 THEN losing_trades + 1 ELSE losing_trades END) > 0
        THEN ABS(
          (CASE WHEN v_pnl > 0 THEN average_win * winning_trades + v_pnl ELSE average_win * winning_trades END) /
          GREATEST(0.01, ABS(CASE WHEN v_pnl <= 0 THEN average_loss * losing_trades + v_pnl ELSE average_loss * losing_trades END))
        ) ELSE 0 END,
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