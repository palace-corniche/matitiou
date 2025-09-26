-- Ensure Global Trading Account has auto_trading_enabled = true
UPDATE shadow_portfolios 
SET auto_trading_enabled = true,
    updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Insert Global Trading Account if it doesn't exist
INSERT INTO shadow_portfolios (
    id, 
    portfolio_name, 
    balance, 
    equity, 
    auto_trading_enabled,
    created_at, 
    updated_at
) 
SELECT 
    '00000000-0000-0000-0000-000000000001',
    'Global Trading Account',
    100000.00,
    100000.00,
    true,
    now(),
    now()
WHERE NOT EXISTS (
    SELECT 1 FROM shadow_portfolios 
    WHERE id = '00000000-0000-0000-0000-000000000001'
);