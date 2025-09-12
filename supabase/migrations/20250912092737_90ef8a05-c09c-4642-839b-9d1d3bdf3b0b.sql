-- Phase 1: Backfill sample data for all analysis pages 

-- Insert sample pattern signals for Technical Analysis page
INSERT INTO pattern_signals (symbol, pattern_type, entry_price, stop_loss, take_profit, confidence, strength, timeframe, detected_at) VALUES
('EUR/USD', 'Double Top', 1.17045, 1.16900, 1.17200, 0.82, 8, '15m', now() - interval '45 minutes'),
('EUR/USD', 'Bullish Flag', 1.17065, 1.16950, 1.17180, 0.75, 7, '15m', now() - interval '2 hours'),
('EUR/USD', 'Head and Shoulders', 1.17020, 1.16850, 1.17250, 0.88, 9, '1h', now() - interval '3 hours'),
('EUR/USD', 'Triangle Breakout', 1.17080, 1.16980, 1.17220, 0.71, 6, '15m', now() - interval '1 hour'),
('EUR/USD', 'Support Bounce', 1.17055, 1.16950, 1.17150, 0.79, 7, '5m', now() - interval '30 minutes');

-- Insert harmonic patterns for Specialized Analysis page
INSERT INTO harmonic_prz (symbol, pattern, prz_low, prz_high, confidence, completion_level, timeframe, detected_at) VALUES
('EUR/USD', 'Bullish Bat', 1.16980, 1.17020, 0.85, 0.886, '1h', now() - interval '2 hours'),
('EUR/USD', 'Bearish Gartley', 1.17150, 1.17180, 0.78, 0.786, '15m', now() - interval '1 hour'),
('EUR/USD', 'Bullish Butterfly', 1.16950, 1.16990, 0.92, 1.272, '4h', now() - interval '4 hours'),
('EUR/USD', 'Bearish Crab', 1.17200, 1.17250, 0.81, 1.618, '1h', now() - interval '30 minutes');

-- Insert support/resistance levels for Technical Analysis page
INSERT INTO support_resistance (symbol, level_price, level_type, strength, touches_count, timeframe, detected_at) VALUES
('EUR/USD', 1.16950, 'support', 8, 5, '15m', now() - interval '1 hour'),
('EUR/USD', 1.17200, 'resistance', 9, 7, '15m', now() - interval '2 hours'),
('EUR/USD', 1.17000, 'support', 6, 3, '15m', now() - interval '45 minutes'),
('EUR/USD', 1.17150, 'resistance', 7, 4, '15m', now() - interval '30 minutes'),
('EUR/USD', 1.16900, 'support', 10, 8, '1h', now() - interval '3 hours');

-- Insert module health status
INSERT INTO module_health (module_name, last_run, status, performance_score, signals_generated_today, error_count, last_error) VALUES
('technical_analysis', now() - interval '5 minutes', 'active', 0.85, 12, 0, null),
('fundamental_analysis', now() - interval '10 minutes', 'active', 0.78, 4, 0, null),
('sentiment_analysis', now() - interval '8 minutes', 'active', 0.72, 6, 1, 'Minor timeout on news feed'),
('quantitative_analysis', now() - interval '15 minutes', 'active', 0.91, 8, 0, null),
('intermarket_analysis', now() - interval '12 minutes', 'active', 0.68, 3, 0, null),
('specialized_analysis', now() - interval '7 minutes', 'active', 0.89, 5, 0, null),
('pattern_recognition', now() - interval '3 minutes', 'active', 0.93, 15, 0, null),
('harmonic_scanner', now() - interval '6 minutes', 'active', 0.87, 7, 0, null);

-- Insert economic events for Fundamental Analysis page
INSERT INTO economic_events (event_name, country, currency, event_time, impact_level, actual_value, forecast_value, previous_value, symbol_impact, volatility_impact) VALUES
('Non-Farm Payrolls', 'US', 'USD', now() + interval '2 hours', 'high', null, '200K', '180K', ARRAY['EUR/USD', 'GBP/USD', 'USD/JPY'], 85.0),
('ECB Interest Rate Decision', 'EU', 'EUR', now() + interval '1 day', 'high', null, '4.50%', '4.50%', ARRAY['EUR/USD', 'EUR/GBP'], 92.0),
('German GDP (QoQ)', 'DE', 'EUR', now() - interval '2 hours', 'medium', '0.2%', '0.1%', '0.0%', ARRAY['EUR/USD'], 45.0),
('US CPI (YoY)', 'US', 'USD', now() - interval '1 day', 'high', '3.2%', '3.4%', '3.7%', ARRAY['EUR/USD', 'GBP/USD'], 78.0),
('Federal Reserve Speech', 'US', 'USD', now() + interval '6 hours', 'medium', null, null, null, ARRAY['EUR/USD'], 55.0);

-- Insert news events for Sentiment Analysis page
INSERT INTO news_events (title, content, source, published_at, symbol, sentiment_score, relevance_score, impact_score, category) VALUES
('ECB Maintains Hawkish Stance on Inflation', 'European Central Bank officials signal continued vigilance against inflation risks...', 'Reuters', now() - interval '2 hours', 'EUR/USD', 25.0, 95.0, 70.0, 'central_bank'),
('US Dollar Strengthens on Fed Remarks', 'Federal Reserve hints at maintaining restrictive policy longer than expected...', 'Bloomberg', now() - interval '45 minutes', 'EUR/USD', -35.0, 88.0, 65.0, 'monetary_policy'),
('European Economic Data Shows Resilience', 'Latest PMI data suggests eurozone economy maintaining momentum despite challenges...', 'Financial Times', now() - interval '3 hours', 'EUR/USD', 18.0, 82.0, 45.0, 'economic_data'),
('Geopolitical Tensions Support Safe Haven Demand', 'Rising tensions in Eastern Europe boost demand for safe haven currencies...', 'Wall Street Journal', now() - interval '1 hour', 'EUR/USD', -12.0, 75.0, 55.0, 'geopolitical'),
('Oil Prices Surge on Supply Concerns', 'Crude oil prices climb as OPEC+ signals production cuts continuation...', 'CNBC', now() - interval '30 minutes', 'EUR/USD', 8.0, 65.0, 40.0, 'commodities');

-- Insert COT data for Sentiment Analysis page
INSERT INTO cot_reports (pair, report_date, commercial_long, commercial_short, large_traders_long, large_traders_short, retail_long, retail_short, net_long, net_short) VALUES
('EUR/USD', CURRENT_DATE - 1, 125000, 89000, 78000, 92000, 45000, 67000, 36000, -14000),
('EUR/USD', CURRENT_DATE - 8, 118000, 95000, 82000, 88000, 42000, 70000, 23000, -6000),
('EUR/USD', CURRENT_DATE - 15, 132000, 85000, 75000, 95000, 48000, 64000, 47000, -20000);

-- Insert retail positioning for Sentiment Analysis page
INSERT INTO retail_positions (broker, symbol, long_percentage, short_percentage, long_traders_count, short_traders_count, as_of) VALUES
('OANDA', 'EUR/USD', 68.5, 31.5, 15420, 7180, now() - interval '1 hour'),
('IG Group', 'EUR/USD', 72.3, 27.7, 28950, 10780, now() - interval '2 hours'),
('FXCM', 'EUR/USD', 65.8, 34.2, 12340, 6420, now() - interval '45 minutes'),
('Plus500', 'EUR/USD', 70.1, 29.9, 18750, 7930, now() - interval '30 minutes');

-- Insert correlations for Quantitative Analysis page
INSERT INTO correlations (asset_a, asset_b, correlation_value, window_period, timeframe, sample_size) VALUES
('EUR/USD', 'DXY', -0.892, '30d', '1d', 30),
('EUR/USD', 'XAUUSD', 0.234, '30d', '1d', 30),
('EUR/USD', 'WTI', 0.156, '30d', '1d', 30),
('EUR/USD', 'SPX', 0.445, '30d', '1d', 30),
('EUR/USD', 'GBP/USD', 0.678, '30d', '1d', 30),
('EUR/USD', 'USD/JPY', -0.523, '30d', '1d', 30),
('EUR/USD', 'VIX', -0.387, '30d', '1d', 30);

-- Insert volatility metrics for Quantitative Analysis page
INSERT INTO volatility_metrics (symbol, timeframe, atr, realized_volatility, implied_volatility, volatility_percentile) VALUES
('EUR/USD', '1d', 0.00085, 12.4, 11.8, 65.2),
('EUR/USD', '4h', 0.00034, 8.9, 9.2, 58.7),
('EUR/USD', '1h', 0.00015, 15.6, 14.8, 72.1);

-- Insert market snapshot for Intermarket Analysis page
INSERT INTO market_snapshot (symbol, last_price, change_24h, change_percentage_24h, volume_24h) VALUES
('DXY', 103.45, -0.25, -0.24, 0),
('XAUUSD', 2034.50, 15.80, 0.78, 125000),
('WTI', 78.92, 2.34, 3.06, 89000),
('SPX', 4485.50, 22.75, 0.51, 2340000),
('BTCUSD', 43250.00, -850.00, -1.93, 28000),
('EURGBP', 0.8645, 0.0012, 0.14, 45000),
('USDJPY', 149.85, 0.45, 0.30, 67000);

-- Insert Elliott waves for Specialized Analysis page
INSERT INTO elliott_waves (symbol, timeframe, wave_degree, wave_label, start_price, end_price, start_time, end_time, confidence, pattern_type) VALUES
('EUR/USD', '1h', 'Minor', 'Wave 1', 1.16950, 1.17080, now() - interval '4 hours', now() - interval '3 hours', 0.85, 'Impulse'),
('EUR/USD', '1h', 'Minor', 'Wave 2', 1.17080, 1.17020, now() - interval '3 hours', now() - interval '2 hours', 0.78, 'Corrective'),
('EUR/USD', '1h', 'Minor', 'Wave 3', 1.17020, 1.17150, now() - interval '2 hours', now() - interval '1 hour', 0.92, 'Impulse'),
('EUR/USD', '4h', 'Intermediate', 'Wave A', 1.16850, 1.17200, now() - interval '8 hours', now() - interval '4 hours', 0.87, 'Impulse'),
('EUR/USD', '4h', 'Intermediate', 'Wave B', 1.17200, 1.17050, now() - interval '4 hours', now() - interval '2 hours', 0.74, 'Corrective');