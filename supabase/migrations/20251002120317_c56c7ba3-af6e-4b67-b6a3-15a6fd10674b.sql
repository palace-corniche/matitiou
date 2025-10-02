-- Fix the 1.0 lot size trade
UPDATE shadow_trades
SET 
  lot_size = 0.01,
  position_size = 0.01,
  remaining_lot_size = 0.01,
  updated_at = now()
WHERE id = '6c387cf3-e025-4857-b1ee-f4d2bbb59251';

-- Add validation function to prevent lot sizes > 0.01 for global account
CREATE OR REPLACE FUNCTION validate_global_account_lot_size()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is a global account trade (portfolio_id is the global account UUID)
  IF NEW.portfolio_id = '00000000-0000-0000-0000-000000000001' THEN
    -- Enforce max lot size of 0.01 for global account
    IF NEW.lot_size > 0.01 THEN
      RAISE EXCEPTION 'Global account lot size cannot exceed 0.01 (attempted: %)', NEW.lot_size;
    END IF;
    
    IF NEW.position_size > 0.01 THEN
      RAISE EXCEPTION 'Global account position size cannot exceed 0.01 (attempted: %)', NEW.position_size;
    END IF;
    
    IF NEW.remaining_lot_size > 0.01 THEN
      RAISE EXCEPTION 'Global account remaining lot size cannot exceed 0.01 (attempted: %)', NEW.remaining_lot_size;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT operations
CREATE TRIGGER validate_global_lot_size_insert
  BEFORE INSERT ON shadow_trades
  FOR EACH ROW
  EXECUTE FUNCTION validate_global_account_lot_size();

-- Create trigger for UPDATE operations
CREATE TRIGGER validate_global_lot_size_update
  BEFORE UPDATE ON shadow_trades
  FOR EACH ROW
  EXECUTE FUNCTION validate_global_account_lot_size();