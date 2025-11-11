-- Fix execute_global_shadow_trade to include position_size in INSERT
-- This is CRITICAL - prevents NOT NULL constraint violations on shadow_trades.position_size

CREATE OR REPLACE FUNCTION execute_global_shadow_trade(
  p_symbol text,
  p_trade_type text,
  p_entry_price numeric,
  p_lot_size numeric,
  p_stop_loss numeric,
  p_take_profit numeric,
  p_comment text DEFAULT NULL,
  p_signal_id uuid DEFAULT NULL,
  p_master_signal_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trade_id uuid;
  v_account_id uuid := '00000000-0000-0000-0000-000000000001';
  v_margin_required numeric;
  v_account_record global_trading_account%ROWTYPE;
BEGIN
  -- Get account
  SELECT * INTO v_account_record 
  FROM global_trading_account 
  WHERE id = v_account_id;
  
  -- Calculate margin
  v_margin_required := p_lot_size * 100000 * p_entry_price / v_account_record.leverage;
  
  -- Check margin
  IF v_account_record.free_margin < v_margin_required THEN
    RAISE EXCEPTION 'Insufficient margin';
  END IF;
  
  -- Insert trade with signal_id AND position_size (CRITICAL FIX)
  INSERT INTO shadow_trades (
    portfolio_id,
    symbol,
    trade_type,
    entry_price,
    lot_size,
    remaining_lot_size,
    position_size,
    stop_loss,
    take_profit,
    status,
    entry_time,
    comment,
    signal_id,
    master_signal_id
  ) VALUES (
    NULL,  -- Global account
    p_symbol,
    p_trade_type,
    p_entry_price,
    p_lot_size,
    p_lot_size,
    p_lot_size,  -- CRITICAL: Set position_size equal to lot_size
    p_stop_loss,
    p_take_profit,
    'open',
    now(),
    p_comment,
    p_signal_id,
    p_master_signal_id
  ) RETURNING id INTO v_trade_id;
  
  -- Update account margin
  UPDATE global_trading_account
  SET 
    used_margin = used_margin + v_margin_required,
    free_margin = free_margin - v_margin_required,
    margin_level = CASE 
      WHEN (used_margin + v_margin_required) > 0 
      THEN (equity * 100.0) / (used_margin + v_margin_required)
      ELSE 0 
    END,
    updated_at = now()
  WHERE id = v_account_id;
  
  RETURN v_trade_id;
END;
$$;