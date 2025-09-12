-- Phase 6: Calibration Engine Tables

-- Table for storing calibration results
CREATE TABLE IF NOT EXISTS public.calibration_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    symbol TEXT NOT NULL DEFAULT 'EURUSD',
    parameters JSONB NOT NULL,
    performance_metrics JSONB NOT NULL,
    calibration_period JSONB NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(module_id, timeframe, symbol, version)
);

-- Table for calibration audit trail
CREATE TABLE IF NOT EXISTS public.calibration_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    action TEXT NOT NULL,
    parameters_tested INTEGER DEFAULT 0,
    best_sharpe_ratio NUMERIC DEFAULT 0,
    best_win_rate NUMERIC DEFAULT 0,
    calibration_duration_ms INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for master signals (Phase 7)
CREATE TABLE IF NOT EXISTS public.master_signals_fusion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL,
    fusion_decision TEXT NOT NULL CHECK (fusion_decision IN ('BUY', 'SELL', 'NEUTRAL')),
    confidence_score NUMERIC NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    contributing_signals JSONB NOT NULL,
    weighted_score NUMERIC NOT NULL,
    signal_weights JSONB NOT NULL,
    fusion_reasoning TEXT,
    override_reason TEXT,
    symbol TEXT NOT NULL DEFAULT 'EURUSD',
    timeframe TEXT NOT NULL,
    recommended_entry NUMERIC,
    recommended_stop_loss NUMERIC,
    recommended_take_profit NUMERIC,
    recommended_lot_size NUMERIC DEFAULT 0.01,
    risk_assessment JSONB,
    market_conditions JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'expired', 'cancelled'))
);

-- Enable RLS on new tables
ALTER TABLE public.calibration_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_signals_fusion ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "System can manage calibration results" ON public.calibration_results
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view calibration results" ON public.calibration_results
    FOR SELECT USING (true);

CREATE POLICY "System can manage calibration audit" ON public.calibration_audit
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System can manage master signals fusion" ON public.master_signals_fusion
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view master signals fusion" ON public.master_signals_fusion
    FOR SELECT USING (true);

-- Indexes for performance
CREATE INDEX idx_calibration_results_module_timeframe ON public.calibration_results(module_id, timeframe);
CREATE INDEX idx_calibration_audit_module ON public.calibration_audit(module_id);
CREATE INDEX idx_master_signals_fusion_created_at ON public.master_signals_fusion(created_at);

-- Insert sample calibration data
INSERT INTO public.calibration_results (module_id, timeframe, symbol, parameters, performance_metrics, calibration_period) VALUES
('technical_analysis', 'M15', 'EURUSD', 
 '{"rsi_overbought": 75, "rsi_oversold": 25, "macd_signal_threshold": 0.0002, "bb_deviation": 2.2}',
 '{"win_rate": 0.68, "profit_factor": 1.45, "sharpe_ratio": 1.23, "max_drawdown": 0.08, "average_return": 0.015, "total_trades": 150}',
 '{"start_date": "2024-01-01T00:00:00Z", "end_date": "2024-12-01T00:00:00Z", "total_ticks": 8500}'),
('fundamental_analysis', 'H1', 'EURUSD',
 '{"news_impact_threshold": 0.8, "event_importance_min": "high", "sentiment_weight": 0.7}',
 '{"win_rate": 0.72, "profit_factor": 1.58, "sharpe_ratio": 0.95, "max_drawdown": 0.12, "average_return": 0.022, "total_trades": 89}',
 '{"start_date": "2024-01-01T00:00:00Z", "end_date": "2024-12-01T00:00:00Z", "total_ticks": 4200}'),
('sentiment_analysis', 'H4', 'EURUSD',
 '{"retail_positioning_threshold": 70, "cot_threshold": 0.8, "fear_greed_weight": 0.6}',
 '{"win_rate": 0.65, "profit_factor": 1.38, "sharpe_ratio": 1.05, "max_drawdown": 0.15, "average_return": 0.018, "total_trades": 67}',
 '{"start_date": "2024-01-01T00:00:00Z", "end_date": "2024-12-01T00:00:00Z", "total_ticks": 2100}');