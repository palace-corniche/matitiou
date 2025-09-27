-- Update a signal to have qualifying confluence score for testing
UPDATE trading_signals 
SET confluence_score = 16 
WHERE signal_id = 'master_1758851223843_r06r24izp' 
  AND confluence_score = 14;

-- Insert test tick data to ensure market data is available
INSERT INTO tick_data (symbol, timestamp, bid, ask, spread, tick_volume, data_source, session_type, is_live) VALUES
('EUR/USD', now(), 1.1680, 1.1682, 0.0002, 50, 'system_test', 'london', true),
('EUR/USD', now() - interval '1 minute', 1.1679, 1.1681, 0.0002, 45, 'system_test', 'london', true),
('EUR/USD', now() - interval '2 minutes', 1.1678, 1.1680, 0.0002, 52, 'system_test', 'london', true);

-- Ensure Global Trading Account is properly configured
UPDATE shadow_portfolios 
SET auto_trading_enabled = true,
    balance = 100000.00,
    equity = 100000.00,
    free_margin = 100000.00,
    used_margin = 0.00,
    margin_level = 0.00,
    floating_pnl = 0.00,
    updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001';