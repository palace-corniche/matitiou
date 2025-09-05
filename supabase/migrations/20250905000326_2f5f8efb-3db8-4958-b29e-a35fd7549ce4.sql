-- Insert test trading signals for validation
INSERT INTO trading_signals (
    signal_id, pair, signal_type, confluence_score, strength, confidence, 
    entry_price, stop_loss, take_profit, risk_reward_ratio, 
    factors, description, alert_level, session_id
) VALUES 
(
    'test_signal_001', 'EUR/USD', 'buy', 75, 8, 82, 
    1.08450, 1.08200, 1.09000, 2.2,
    '[{"source": "technical_analysis", "weight": 0.35, "value": 0.75}, {"source": "pattern_recognition", "weight": 0.25, "value": 0.68}]'::jsonb,
    'Strong BUY signal with high confluence score', 'high', 'test_session'
),
(
    'test_signal_002', 'EUR/USD', 'sell', 68, 7, 75, 
    1.08200, 1.08450, 1.07800, 1.8,
    '[{"source": "sentiment_analysis", "weight": 0.30, "value": 0.65}, {"source": "strategies_module", "weight": 0.20, "value": 0.72}]'::jsonb,
    'SELL signal with moderate confluence', 'medium', 'test_session'
);

-- Insert test rejection logs for analytics
INSERT INTO signal_rejection_logs (
    signal_type, reason, value, threshold, factors_count, 
    confluence_score, market_regime
) VALUES 
('buy', 'low_confluence_score', 45, 50, 3, 45, 'trending'),
('sell', 'insufficient_entropy', 0.2, 0.3, 5, 62, 'ranging'),
('buy', 'edge_threshold_not_met', -0.001, 0.001, 4, 55, 'volatile');

-- Update system health with test data  
INSERT INTO system_health (
    function_name, status, execution_time_ms, processed_items
) VALUES 
('generate-confluence-signals', 'success', 245, 8),
('generate-confluence-signals', 'success', 190, 12),
('generate-confluence-signals', 'success', 320, 6);