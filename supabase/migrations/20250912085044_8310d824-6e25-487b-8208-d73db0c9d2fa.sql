-- Phase 2: Database Schema & Data Contracts
-- Adding modular_signals, signal_audit, and master_signals tables with strict reproducibility

-- =============================================
-- Table 1: modular_signals
-- Stores individual signals from different trading modules/indicators
-- =============================================
CREATE TABLE IF NOT EXISTS public.modular_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core identification
    analysis_id UUID NOT NULL, -- Links signals from same analysis run
    module_id TEXT NOT NULL, -- e.g., 'rsi_divergence', 'macd_crossover', 'fibonacci_retracement'
    module_version TEXT NOT NULL DEFAULT '1.0.0', -- For tracking module updates
    
    -- Market data
    symbol TEXT NOT NULL DEFAULT 'EUR/USD',
    timeframe TEXT NOT NULL, -- e.g., '1m', '5m', '15m', '1h', '4h', '1d'
    
    -- Signal properties
    signal_type TEXT NOT NULL CHECK (signal_type IN ('buy', 'sell', 'neutral')),
    confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    strength INTEGER NOT NULL CHECK (strength >= 1 AND strength <= 10),
    weight NUMERIC NOT NULL DEFAULT 1.0 CHECK (weight >= 0),
    
    -- Pricing and execution
    trigger_price NUMERIC NOT NULL,
    suggested_entry NUMERIC,
    suggested_stop_loss NUMERIC,
    suggested_take_profit NUMERIC,
    
    -- Reproducibility requirements
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    market_data_snapshot JSONB NOT NULL, -- Raw market data used for signal
    calculation_parameters JSONB NOT NULL, -- All parameters used in calculation
    intermediate_values JSONB, -- Step-by-step calculation results
    
    -- Metadata
    market_session TEXT, -- 'london', 'new_york', 'tokyo', 'sydney'
    volatility_regime TEXT, -- 'low', 'medium', 'high'
    trend_context TEXT, -- 'uptrend', 'downtrend', 'sideways'
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Signal expiration
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Indexing for performance
    CONSTRAINT unique_module_analysis UNIQUE (analysis_id, module_id, timestamp)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_modular_signals_analysis_id ON public.modular_signals(analysis_id);
CREATE INDEX IF NOT EXISTS idx_modular_signals_symbol_timeframe ON public.modular_signals(symbol, timeframe);
CREATE INDEX IF NOT EXISTS idx_modular_signals_timestamp ON public.modular_signals(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_modular_signals_active ON public.modular_signals(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.modular_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view modular signals" 
ON public.modular_signals FOR SELECT 
USING (true);

CREATE POLICY "System can manage modular signals" 
ON public.modular_signals FOR ALL 
USING (true);

-- =============================================
-- Table 2: signal_audit
-- Tracks all changes and decisions made on signals for compliance
-- =============================================
CREATE TABLE IF NOT EXISTS public.signal_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to signal
    signal_id UUID, -- Can be from modular_signals or master_signals
    signal_table TEXT NOT NULL CHECK (signal_table IN ('modular_signals', 'master_signals', 'trading_signals')),
    analysis_id UUID NOT NULL,
    
    -- Audit action
    action_type TEXT NOT NULL CHECK (action_type IN ('created', 'updated', 'deleted', 'expired', 'executed', 'rejected')),
    action_reason TEXT,
    
    -- Change tracking
    old_values JSONB, -- Previous state before change
    new_values JSONB, -- New state after change
    changed_fields TEXT[], -- Array of field names that changed
    
    -- Context
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    user_id UUID, -- If human action
    system_component TEXT, -- If automated action (e.g., 'signal_engine', 'risk_manager')
    
    -- Environment snapshot
    market_conditions JSONB, -- Market state when action occurred
    system_state JSONB, -- System configuration at time of action
    
    -- Compliance fields
    compliance_notes TEXT,
    risk_assessment JSONB,
    regulatory_flags TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_signal_audit_signal_id ON public.signal_audit(signal_id);
CREATE INDEX IF NOT EXISTS idx_signal_audit_analysis_id ON public.signal_audit(analysis_id);
CREATE INDEX IF NOT EXISTS idx_signal_audit_timestamp ON public.signal_audit(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_signal_audit_action_type ON public.signal_audit(action_type);

-- Enable RLS
ALTER TABLE public.signal_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view signal audit" 
ON public.signal_audit FOR SELECT 
USING (true);

CREATE POLICY "System can manage signal audit" 
ON public.signal_audit FOR ALL 
USING (true);

-- =============================================
-- Table 3: master_signals
-- Stores final processed signals after combining modular signals
-- =============================================
CREATE TABLE IF NOT EXISTS public.master_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core identification
    analysis_id UUID NOT NULL UNIQUE, -- One master signal per analysis
    signal_hash TEXT NOT NULL UNIQUE, -- Hash of all contributing factors for uniqueness
    
    -- Market data
    symbol TEXT NOT NULL DEFAULT 'EUR/USD',
    timeframe TEXT NOT NULL,
    
    -- Final signal decision
    signal_type TEXT NOT NULL CHECK (signal_type IN ('buy', 'sell', 'neutral')),
    final_confidence NUMERIC NOT NULL CHECK (final_confidence >= 0 AND final_confidence <= 1),
    final_strength INTEGER NOT NULL CHECK (final_strength >= 1 AND final_strength <= 10),
    confluence_score NUMERIC NOT NULL DEFAULT 0,
    
    -- Execution details
    recommended_entry NUMERIC NOT NULL,
    recommended_stop_loss NUMERIC NOT NULL,
    recommended_take_profit NUMERIC NOT NULL,
    recommended_lot_size NUMERIC NOT NULL DEFAULT 0.01,
    risk_reward_ratio NUMERIC,
    
    -- Contributing factors (for reproducibility)
    contributing_modules TEXT[] NOT NULL, -- List of module_ids that contributed
    modular_signal_ids UUID[] NOT NULL, -- IDs of all modular signals used
    fusion_algorithm TEXT NOT NULL, -- Algorithm used to combine signals
    fusion_parameters JSONB NOT NULL, -- Parameters used in fusion
    
    -- Quality metrics
    signal_quality_score NUMERIC CHECK (signal_quality_score >= 0 AND signal_quality_score <= 1),
    uncertainty_measure NUMERIC, -- Measure of signal uncertainty
    edge_probability NUMERIC, -- Calculated probability of edge
    
    -- Market context snapshot
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    market_data_snapshot JSONB NOT NULL,
    market_regime TEXT, -- 'trending', 'ranging', 'volatile', 'calm'
    volatility_percentile NUMERIC, -- Current volatility vs historical
    
    -- Execution tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'expired', 'cancelled')),
    execution_timestamp TIMESTAMP WITH TIME ZONE,
    execution_price NUMERIC,
    execution_slippage NUMERIC,
    
    -- Performance tracking (filled after signal closes)
    actual_outcome TEXT CHECK (actual_outcome IN ('win', 'loss', 'breakeven')),
    actual_pnl NUMERIC,
    actual_pips NUMERIC,
    holding_duration INTERVAL,
    
    -- Reproducibility and audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    tags TEXT[],
    notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_master_signals_analysis_id ON public.master_signals(analysis_id);
CREATE INDEX IF NOT EXISTS idx_master_signals_symbol_timeframe ON public.master_signals(symbol, timeframe);
CREATE INDEX IF NOT EXISTS idx_master_signals_timestamp ON public.master_signals(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_master_signals_status ON public.master_signals(status);
CREATE INDEX IF NOT EXISTS idx_master_signals_signal_type ON public.master_signals(signal_type);

-- Enable RLS
ALTER TABLE public.master_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view master signals" 
ON public.master_signals FOR SELECT 
USING (true);

CREATE POLICY "System can manage master signals" 
ON public.master_signals FOR ALL 
USING (true);

-- =============================================
-- Triggers for automated audit logging
-- =============================================

-- Function to create audit logs
CREATE OR REPLACE FUNCTION public.create_signal_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    analysis_id_val UUID;
    changed_fields_arr TEXT[];
BEGIN
    -- Determine analysis_id based on table
    IF TG_TABLE_NAME = 'modular_signals' THEN
        analysis_id_val := COALESCE(NEW.analysis_id, OLD.analysis_id);
    ELSIF TG_TABLE_NAME = 'master_signals' THEN
        analysis_id_val := COALESCE(NEW.analysis_id, OLD.analysis_id);
    END IF;
    
    -- Determine changed fields for UPDATE operations
    IF TG_OP = 'UPDATE' THEN
        changed_fields_arr := ARRAY[]::TEXT[];
        
        -- This is a simplified version - in production you'd check each field
        IF OLD.signal_type != NEW.signal_type THEN
            changed_fields_arr := array_append(changed_fields_arr, 'signal_type');
        END IF;
        IF OLD.confidence != NEW.confidence THEN
            changed_fields_arr := array_append(changed_fields_arr, 'confidence');
        END IF;
    END IF;
    
    -- Insert audit record
    INSERT INTO public.signal_audit (
        signal_id,
        signal_table,
        analysis_id,
        action_type,
        old_values,
        new_values,
        changed_fields,
        system_component,
        timestamp
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        TG_TABLE_NAME,
        analysis_id_val,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'created'
            WHEN TG_OP = 'UPDATE' THEN 'updated'
            WHEN TG_OP = 'DELETE' THEN 'deleted'
        END,
        CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        changed_fields_arr,
        'database_trigger',
        now()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for audit logging
DROP TRIGGER IF EXISTS modular_signals_audit_trigger ON public.modular_signals;
CREATE TRIGGER modular_signals_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.modular_signals
    FOR EACH ROW EXECUTE FUNCTION public.create_signal_audit_log();

DROP TRIGGER IF EXISTS master_signals_audit_trigger ON public.master_signals;
CREATE TRIGGER master_signals_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.master_signals
    FOR EACH ROW EXECUTE FUNCTION public.create_signal_audit_log();

-- =============================================
-- Helper functions for data integrity
-- =============================================

-- Function to validate signal reproducibility
CREATE OR REPLACE FUNCTION public.validate_signal_reproducibility(
    p_analysis_id UUID,
    p_signal_table TEXT DEFAULT 'modular_signals'
)
RETURNS JSONB AS $$
DECLARE
    signal_record RECORD;
    validation_result JSONB := '{"valid": true, "errors": []}'::JSONB;
    errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Get signal record
    IF p_signal_table = 'modular_signals' THEN
        SELECT * INTO signal_record 
        FROM public.modular_signals 
        WHERE analysis_id = p_analysis_id 
        LIMIT 1;
    ELSIF p_signal_table = 'master_signals' THEN
        SELECT * INTO signal_record 
        FROM public.master_signals 
        WHERE analysis_id = p_analysis_id;
    END IF;
    
    IF NOT FOUND THEN
        errors := array_append(errors, 'Signal not found for analysis_id: ' || p_analysis_id);
    ELSE
        -- Check required reproducibility fields
        IF signal_record.market_data_snapshot IS NULL THEN
            errors := array_append(errors, 'Missing market_data_snapshot');
        END IF;
        
        IF p_signal_table = 'modular_signals' AND signal_record.calculation_parameters IS NULL THEN
            errors := array_append(errors, 'Missing calculation_parameters');
        END IF;
        
        IF signal_record.timestamp IS NULL THEN
            errors := array_append(errors, 'Missing timestamp');
        END IF;
    END IF;
    
    -- Build result
    IF array_length(errors, 1) > 0 THEN
        validation_result := jsonb_build_object(
            'valid', false,
            'errors', to_jsonb(errors),
            'analysis_id', p_analysis_id
        );
    ELSE
        validation_result := jsonb_build_object(
            'valid', true,
            'analysis_id', p_analysis_id,
            'message', 'Signal passes reproducibility validation'
        );
    END IF;
    
    RETURN validation_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Rollback preparation
-- =============================================

-- Store migration info for potential rollback
INSERT INTO public.system_config (config_key, config_value, description) VALUES 
(
    'migration_phase_2_schema',
    jsonb_build_object(
        'version', '2.0.0',
        'timestamp', now(),
        'tables_created', ARRAY['modular_signals', 'signal_audit', 'master_signals'],
        'functions_created', ARRAY['create_signal_audit_log', 'validate_signal_reproducibility'],
        'can_rollback', true
    ),
    'Phase 2 database schema migration tracking'
)
ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = now();

-- Add some sample data for testing
INSERT INTO public.modular_signals (
    analysis_id,
    module_id,
    module_version,
    symbol,
    timeframe,
    signal_type,
    confidence,
    strength,
    trigger_price,
    market_data_snapshot,
    calculation_parameters
) VALUES 
(
    gen_random_uuid(),
    'rsi_divergence',
    '1.0.0',
    'EUR/USD',
    '1h',
    'buy',
    0.75,
    7,
    1.17234,
    '{"bid": 1.17234, "ask": 1.17236, "rsi": 35.2, "price_history": [1.17180, 1.17195, 1.17210, 1.17234]}'::JSONB,
    '{"rsi_period": 14, "divergence_lookback": 20, "min_confidence": 0.7}'::JSONB
);