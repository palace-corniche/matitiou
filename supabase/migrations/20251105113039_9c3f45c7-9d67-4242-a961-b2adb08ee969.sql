-- PHASE 3: Fix Signal Linkage

-- Add signal_id column to shadow_trades if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shadow_trades' AND column_name = 'signal_id'
  ) THEN
    ALTER TABLE shadow_trades ADD COLUMN signal_id uuid;
  END IF;
END $$;

-- Add foreign key constraint to master_signals
ALTER TABLE shadow_trades
  DROP CONSTRAINT IF EXISTS fk_shadow_trades_signal,
  ADD CONSTRAINT fk_shadow_trades_signal 
  FOREIGN KEY (signal_id) 
  REFERENCES master_signals(id) 
  ON DELETE SET NULL;

-- Create index for faster signal queries
CREATE INDEX IF NOT EXISTS idx_shadow_trades_signal_id 
  ON shadow_trades(signal_id);

-- Add master_signal_id to trade_history for complete tracking
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trade_history' AND column_name = 'master_signal_id'
  ) THEN
    ALTER TABLE trade_history ADD COLUMN master_signal_id uuid;
  END IF;
END $$;

-- Backfill signal_id for recent trades based on timestamp and symbol match
UPDATE shadow_trades st
SET signal_id = ms.id
FROM master_signals ms
WHERE st.signal_id IS NULL
  AND st.symbol = ms.symbol
  AND st.trade_type = ms.signal_type
  AND st.entry_time BETWEEN (ms.timestamp - interval '30 seconds') AND (ms.timestamp + interval '2 minutes')
  AND ABS(st.entry_price - ms.recommended_entry) < 0.001
  AND ms.status = 'executed';

-- Update execute_global_shadow_trade to accept signal_id
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
  
  -- Insert trade with signal_id
  INSERT INTO shadow_trades (
    portfolio_id,
    symbol,
    trade_type,
    entry_price,
    lot_size,
    remaining_lot_size,
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
      THEN (equity / (used_margin + v_margin_required)) * 100 
      ELSE 0 
    END,
    updated_at = now()
  WHERE id = v_account_id;
  
  RETURN v_trade_id;
END;
$$;