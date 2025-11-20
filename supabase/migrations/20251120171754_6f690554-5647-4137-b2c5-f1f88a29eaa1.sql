-- Create execute_global_shadow_trade function for trade execution
CREATE OR REPLACE FUNCTION public.execute_global_shadow_trade(
  p_symbol TEXT,
  p_trade_type TEXT,
  p_entry_price NUMERIC,
  p_lot_size NUMERIC,
  p_stop_loss NUMERIC,
  p_take_profit NUMERIC,
  p_comment TEXT DEFAULT NULL,
  p_signal_id UUID DEFAULT NULL,
  p_master_signal_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade_id UUID;
  v_contract_size NUMERIC := 100000;
  v_position_size NUMERIC;
BEGIN
  -- Calculate position size
  v_position_size := p_lot_size * v_contract_size * p_entry_price;
  
  -- Insert trade
  INSERT INTO public.shadow_trades (
    portfolio_id,
    symbol,
    trade_type,
    lot_size,
    entry_price,
    stop_loss,
    take_profit,
    status,
    order_type,
    signal_id,
    comment,
    contract_size,
    position_size,
    entry_time,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID,
    p_symbol,
    p_trade_type,
    p_lot_size,
    p_entry_price,
    p_stop_loss,
    p_take_profit,
    'open',
    'market',
    p_signal_id,
    p_comment,
    v_contract_size,
    v_position_size,
    NOW(),
    NOW(),
    NOW()
  ) RETURNING id INTO v_trade_id;
  
  -- Update signal status
  IF p_signal_id IS NOT NULL THEN
    UPDATE public.master_signals
    SET status = 'executed',
        updated_at = NOW()
    WHERE id = p_signal_id;
  END IF;
  
  RETURN v_trade_id;
END;
$$;