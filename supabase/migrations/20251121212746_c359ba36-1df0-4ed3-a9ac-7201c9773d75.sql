-- Add missing contract_size and position_size columns to shadow_trades table
ALTER TABLE public.shadow_trades 
ADD COLUMN IF NOT EXISTS contract_size NUMERIC DEFAULT 100000,
ADD COLUMN IF NOT EXISTS position_size NUMERIC;

-- Add comment explaining these fields
COMMENT ON COLUMN public.shadow_trades.contract_size IS 'Standard contract size for the instrument (e.g., 100000 for forex standard lot)';
COMMENT ON COLUMN public.shadow_trades.position_size IS 'Calculated position size = lot_size * contract_size * entry_price';