-- Phase 0: Create missing tables for comprehensive analysis pages

-- Pattern signals table for chart patterns and technical patterns
CREATE TABLE IF NOT EXISTS pattern_signals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol text NOT NULL DEFAULT 'EUR/USD',
    pattern_type text NOT NULL,
    entry_price numeric,
    stop_loss numeric,
    take_profit numeric,
    confidence numeric,
    strength integer DEFAULT 5,
    detected_at timestamptz NOT NULL DEFAULT now(),
    timeframe text DEFAULT '15m',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Harmonic pattern potential reversal zones
CREATE TABLE IF NOT EXISTS harmonic_prz (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol text NOT NULL DEFAULT 'EUR/USD',
    pattern text NOT NULL,
    prz_low numeric NOT NULL,
    prz_high numeric NOT NULL,
    confidence numeric,
    completion_level numeric,
    detected_at timestamptz NOT NULL DEFAULT now(),
    timeframe text DEFAULT '15m',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Support and resistance levels
CREATE TABLE IF NOT EXISTS support_resistance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol text NOT NULL DEFAULT 'EUR/USD',
    level_price numeric NOT NULL,
    level_type text CHECK(level_type IN ('support','resistance')) NOT NULL,
    strength integer DEFAULT 1,
    touches_count integer DEFAULT 1,
    detected_at timestamptz NOT NULL DEFAULT now(),
    timeframe text DEFAULT '15m',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Module health tracking
CREATE TABLE IF NOT EXISTS module_health (
    module_name text PRIMARY KEY,
    last_run timestamptz,
    last_output_id uuid,
    error_count integer DEFAULT 0,
    last_error text,
    status text DEFAULT 'active',
    performance_score numeric DEFAULT 0.5,
    signals_generated_today integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Economic events for fundamental analysis
CREATE TABLE IF NOT EXISTS economic_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name text NOT NULL,
    country text NOT NULL,
    currency text NOT NULL,
    event_time timestamptz NOT NULL,
    impact_level text CHECK(impact_level IN ('low','medium','high')) DEFAULT 'medium',
    actual_value text,
    forecast_value text,
    previous_value text,
    symbol_impact text[] DEFAULT ARRAY['EUR/USD'],
    volatility_impact numeric DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- News events for sentiment analysis
CREATE TABLE IF NOT EXISTS news_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content text,
    source text NOT NULL,
    published_at timestamptz NOT NULL,
    symbol text NOT NULL DEFAULT 'EUR/USD',
    sentiment_score numeric DEFAULT 0,
    relevance_score numeric DEFAULT 0,
    impact_score numeric DEFAULT 0,
    category text DEFAULT 'general',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- COT (Commitment of Traders) reports for sentiment
CREATE TABLE IF NOT EXISTS cot_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pair text NOT NULL DEFAULT 'EUR/USD',
    report_date date NOT NULL,
    commercial_long bigint DEFAULT 0,
    commercial_short bigint DEFAULT 0,
    large_traders_long bigint DEFAULT 0,
    large_traders_short bigint DEFAULT 0,
    retail_long bigint DEFAULT 0,
    retail_short bigint DEFAULT 0,
    net_long bigint DEFAULT 0,
    net_short bigint DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(pair, report_date)
);

-- Retail positioning data
CREATE TABLE IF NOT EXISTS retail_positions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    broker text NOT NULL,
    symbol text NOT NULL DEFAULT 'EUR/USD',
    long_percentage numeric DEFAULT 50.0,
    short_percentage numeric DEFAULT 50.0,
    long_traders_count integer DEFAULT 0,
    short_traders_count integer DEFAULT 0,
    as_of timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Correlations for quantitative analysis  
CREATE TABLE IF NOT EXISTS correlations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_a text NOT NULL,
    asset_b text NOT NULL,
    correlation_value numeric NOT NULL,
    window_period text DEFAULT '30d',
    calculation_date date NOT NULL DEFAULT CURRENT_DATE,
    timeframe text DEFAULT '1d',
    sample_size integer DEFAULT 30,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(asset_a, asset_b, window_period, calculation_date)
);

-- Volatility metrics for quantitative analysis
CREATE TABLE IF NOT EXISTS volatility_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol text NOT NULL DEFAULT 'EUR/USD',
    timeframe text NOT NULL DEFAULT '1d',
    atr numeric,
    realized_volatility numeric,
    implied_volatility numeric,
    volatility_percentile numeric,
    calculation_date date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(symbol, timeframe, calculation_date)
);

-- Market snapshot for intermarket analysis
CREATE TABLE IF NOT EXISTS market_snapshot (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol text NOT NULL,
    last_price numeric NOT NULL,
    change_24h numeric DEFAULT 0,
    change_percentage_24h numeric DEFAULT 0,
    volume_24h bigint DEFAULT 0,
    market_cap bigint,
    snapshot_time timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Elliott wave analysis for specialized analysis
CREATE TABLE IF NOT EXISTS elliott_waves (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol text NOT NULL DEFAULT 'EUR/USD',
    timeframe text NOT NULL DEFAULT '1h',
    wave_degree text NOT NULL,
    wave_label text NOT NULL,
    start_price numeric NOT NULL,
    end_price numeric NOT NULL,
    start_time timestamptz NOT NULL,
    end_time timestamptz NOT NULL,
    confidence numeric DEFAULT 0.5,
    pattern_type text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE pattern_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE harmonic_prz ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_resistance ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cot_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE volatility_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE elliott_waves ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (analysis data)
CREATE POLICY "Anyone can view pattern signals" ON pattern_signals FOR SELECT USING (true);
CREATE POLICY "Anyone can view harmonic PRZ" ON harmonic_prz FOR SELECT USING (true);
CREATE POLICY "Anyone can view support/resistance" ON support_resistance FOR SELECT USING (true);
CREATE POLICY "Anyone can view module health" ON module_health FOR SELECT USING (true);
CREATE POLICY "Anyone can view economic events" ON economic_events FOR SELECT USING (true);
CREATE POLICY "Anyone can view news events" ON news_events FOR SELECT USING (true);
CREATE POLICY "Anyone can view COT reports" ON cot_reports FOR SELECT USING (true);
CREATE POLICY "Anyone can view retail positions" ON retail_positions FOR SELECT USING (true);
CREATE POLICY "Anyone can view correlations" ON correlations FOR SELECT USING (true);
CREATE POLICY "Anyone can view volatility metrics" ON volatility_metrics FOR SELECT USING (true);
CREATE POLICY "Anyone can view market snapshot" ON market_snapshot FOR SELECT USING (true);
CREATE POLICY "Anyone can view Elliott waves" ON elliott_waves FOR SELECT USING (true);

-- System policies for data management
CREATE POLICY "System can manage pattern signals" ON pattern_signals FOR ALL USING (true);
CREATE POLICY "System can manage harmonic PRZ" ON harmonic_prz FOR ALL USING (true);
CREATE POLICY "System can manage support/resistance" ON support_resistance FOR ALL USING (true);
CREATE POLICY "System can manage module health" ON module_health FOR ALL USING (true);
CREATE POLICY "System can manage economic events" ON economic_events FOR ALL USING (true);
CREATE POLICY "System can manage news events" ON news_events FOR ALL USING (true);
CREATE POLICY "System can manage COT reports" ON cot_reports FOR ALL USING (true);
CREATE POLICY "System can manage retail positions" ON retail_positions FOR ALL USING (true);
CREATE POLICY "System can manage correlations" ON correlations FOR ALL USING (true);
CREATE POLICY "System can manage volatility metrics" ON volatility_metrics FOR ALL USING (true);
CREATE POLICY "System can manage market snapshot" ON market_snapshot FOR ALL USING (true);
CREATE POLICY "System can manage Elliott waves" ON elliott_waves FOR ALL USING (true);