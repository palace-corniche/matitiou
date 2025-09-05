-- Create test closed trades to validate performance metrics calculation
-- First, get a portfolio ID to work with
DO $$
DECLARE
    portfolio_uuid UUID;
    trade_uuid UUID;
BEGIN
    -- Get or create a test portfolio
    SELECT id INTO portfolio_uuid FROM shadow_portfolios LIMIT 1;
    
    IF portfolio_uuid IS NULL THEN
        INSERT INTO shadow_portfolios (
            session_id, balance, equity, max_open_positions
        ) VALUES (
            'test_performance', 100000, 100000, 50
        ) RETURNING id INTO portfolio_uuid;
    END IF;
    
    -- Insert test closed trades with realistic P&L
    INSERT INTO shadow_trades (
        portfolio_id, symbol, trade_type, entry_price, exit_price, lot_size,
        entry_time, exit_time, pnl, status, position_size, 
        confluence_score, stop_loss, take_profit
    ) VALUES 
    (
        portfolio_uuid, 'EUR/USD', 'buy', 1.08400, 1.08650, 0.10,
        NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', 250.00, 'closed', 10000,
        75, 1.08200, 1.08800
    ),
    (
        portfolio_uuid, 'EUR/USD', 'sell', 1.08500, 1.08300, 0.15,
        NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours', 300.00, 'closed', 15000,
        68, 1.08700, 1.08100
    ),
    (
        portfolio_uuid, 'EUR/USD', 'buy', 1.08200, 1.08150, 0.08,
        NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 hours', -40.00, 'closed', 8000,
        55, 1.08000, 1.08600
    ),
    (
        portfolio_uuid, 'EUR/USD', 'sell', 1.08300, 1.08450, 0.12,
        NOW() - INTERVAL '8 hours', NOW() - INTERVAL '7 hours', -180.00, 'closed', 12000,
        62, 1.08500, 1.08100
    ),
    (
        portfolio_uuid, 'EUR/USD', 'buy', 1.08100, 1.08400, 0.20,
        NOW() - INTERVAL '10 hours', NOW() - INTERVAL '9 hours', 600.00, 'closed', 20000,
        80, 1.07900, 1.08500
    );
    
    -- Update portfolio balance to reflect trade results
    UPDATE shadow_portfolios 
    SET 
        balance = balance + 930.00,  -- Total P&L: 250 + 300 - 40 - 180 + 600 = 930
        equity = equity + 930.00,
        updated_at = NOW()
    WHERE id = portfolio_uuid;
    
END $$;