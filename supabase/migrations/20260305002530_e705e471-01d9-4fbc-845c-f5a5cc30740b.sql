
-- Create execute_global_shadow_trade RPC
CREATE OR REPLACE FUNCTION public.execute_global_shadow_trade(
  p_symbol text,
  p_trade_type text,
  p_entry_price numeric,
  p_lot_size numeric,
  p_stop_loss numeric,
  p_take_profit numeric,
  p_comment text DEFAULT '',
  p_signal_id uuid DEFAULT NULL,
  p_master_signal_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_trade_id uuid;
  v_account RECORD;
  v_position_size numeric;
  v_margin_required numeric;
BEGIN
  -- Get global account
  SELECT * INTO v_account FROM public.global_trading_account LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Global trading account not found';
  END IF;

  -- Calculate position size and margin
  v_position_size := p_lot_size * 100000; -- Standard lot = 100,000 units
  v_margin_required := v_position_size / v_account.leverage;

  -- Check margin availability
  IF v_margin_required > v_account.free_margin THEN
    RAISE EXCEPTION 'Insufficient margin: required=%, available=%', v_margin_required, v_account.free_margin;
  END IF;

  -- Insert the trade
  INSERT INTO public.shadow_trades (
    symbol, trade_type, entry_price, lot_size, position_size, contract_size,
    stop_loss, take_profit, comment, signal_id, master_signal_id,
    portfolio_id, status, entry_time, execution_timestamp,
    order_type, price_source
  ) VALUES (
    p_symbol, p_trade_type, p_entry_price, p_lot_size, v_position_size, 100000,
    p_stop_loss, p_take_profit, p_comment, p_signal_id, p_master_signal_id,
    '00000000-0000-0000-0000-000000000001', 'open', now(), now(),
    'market', 'market_data_feed'
  )
  RETURNING id INTO v_trade_id;

  -- Update account margin
  UPDATE public.global_trading_account
  SET used_margin = used_margin + v_margin_required,
      free_margin = free_margin - v_margin_required,
      margin = margin + v_margin_required,
      margin_level = CASE WHEN (used_margin + v_margin_required) > 0 
        THEN (equity / (used_margin + v_margin_required)) * 100 
        ELSE 0 END,
      updated_at = now()
  WHERE id = v_account.id;

  -- Update master signal status
  IF p_master_signal_id IS NOT NULL THEN
    UPDATE public.master_signals
    SET status = 'executed', updated_at = now()
    WHERE id = p_master_signal_id;
  END IF;

  -- Log execution
  INSERT INTO public.trade_execution_log (trade_id, signal_id, action, details, execution_timestamp)
  VALUES (v_trade_id, p_signal_id, 'open', jsonb_build_object(
    'entry_price', p_entry_price,
    'lot_size', p_lot_size,
    'stop_loss', p_stop_loss,
    'take_profit', p_take_profit,
    'trade_type', p_trade_type,
    'comment', p_comment
  ), now());

  RETURN v_trade_id;
END;
$$;
