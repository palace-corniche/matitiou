-- Phase 4: Ensure proper portfolio defaults for new portfolios
-- Update shadow_portfolios table to ensure proper default values

-- First, let's make sure max_open_positions has a proper default
ALTER TABLE shadow_portfolios 
ALTER COLUMN max_open_positions SET DEFAULT 50;

-- Update any existing portfolios that might have NULL or 0 max_open_positions
UPDATE shadow_portfolios 
SET max_open_positions = 50 
WHERE max_open_positions IS NULL OR max_open_positions = 0;

-- Ensure proper defaults for other critical fields
ALTER TABLE shadow_portfolios 
ALTER COLUMN risk_per_trade SET DEFAULT 0.02;

ALTER TABLE shadow_portfolios 
ALTER COLUMN auto_trading_enabled SET DEFAULT true;

ALTER TABLE shadow_portfolios 
ALTER COLUMN is_active SET DEFAULT true;

ALTER TABLE shadow_portfolios 
ALTER COLUMN account_type SET DEFAULT 'demo';

ALTER TABLE shadow_portfolios 
ALTER COLUMN leverage SET DEFAULT 100;

ALTER TABLE shadow_portfolios 
ALTER COLUMN daily_loss_limit SET DEFAULT 5000.00;

ALTER TABLE shadow_portfolios 
ALTER COLUMN max_drawdown_limit SET DEFAULT 20.00;

-- Update any existing portfolios with missing values
UPDATE shadow_portfolios 
SET 
  risk_per_trade = COALESCE(risk_per_trade, 0.02),
  auto_trading_enabled = COALESCE(auto_trading_enabled, true),
  is_active = COALESCE(is_active, true),
  account_type = COALESCE(account_type, 'demo'),
  leverage = COALESCE(leverage, 100),
  daily_loss_limit = COALESCE(daily_loss_limit, 5000.00),
  max_drawdown_limit = COALESCE(max_drawdown_limit, 20.00),
  peak_balance = COALESCE(peak_balance, balance),
  max_equity = COALESCE(max_equity, equity)
WHERE 
  risk_per_trade IS NULL OR 
  auto_trading_enabled IS NULL OR 
  is_active IS NULL OR 
  account_type IS NULL OR 
  leverage IS NULL OR 
  daily_loss_limit IS NULL OR 
  max_drawdown_limit IS NULL OR
  peak_balance IS NULL OR
  max_equity IS NULL;