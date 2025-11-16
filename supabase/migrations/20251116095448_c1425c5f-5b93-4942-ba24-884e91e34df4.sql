-- Add missing columns to existing tables

-- Add missing columns to trade_execution_log
ALTER TABLE public.trade_execution_log 
ADD COLUMN IF NOT EXISTS execution_timestamp TIMESTAMPTZ DEFAULT NOW();

-- Add missing columns to aggregated_candles
ALTER TABLE public.aggregated_candles
ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT TRUE;

-- Add missing columns to system_health
ALTER TABLE public.system_health
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'healthy';

-- Add missing columns to master_signals
ALTER TABLE public.master_signals
ADD COLUMN IF NOT EXISTS actual_outcome TEXT,
ADD COLUMN IF NOT EXISTS analysis_id UUID,
ADD COLUMN IF NOT EXISTS final_strength DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS recommended_entry DECIMAL(10,5),
ADD COLUMN IF NOT EXISTS recommended_stop_loss DECIMAL(10,5),
ADD COLUMN IF NOT EXISTS recommended_take_profit DECIMAL(10,5),
ADD COLUMN IF NOT EXISTS risk_reward DECIMAL(10,2);

-- Add missing columns to modular_signals  
ALTER TABLE public.modular_signals
ADD COLUMN IF NOT EXISTS intermediate_values JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS suggested_entry DECIMAL(10,5),
ADD COLUMN IF NOT EXISTS suggested_stop_loss DECIMAL(10,5),
ADD COLUMN IF NOT EXISTS suggested_take_profit DECIMAL(10,5);

-- Add missing columns to elliott_waves
ALTER TABLE public.elliott_waves
ADD COLUMN IF NOT EXISTS wave_label TEXT,
ADD COLUMN IF NOT EXISTS pattern_type TEXT,
ADD COLUMN IF NOT EXISTS wave_degree TEXT,
ADD COLUMN IF NOT EXISTS start_price DECIMAL(10,5),
ADD COLUMN IF NOT EXISTS end_price DECIMAL(10,5);

-- Add missing columns to discovered_patterns
ALTER TABLE public.discovered_patterns
ADD COLUMN IF NOT EXISTS win_rate DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS deployed BOOLEAN DEFAULT FALSE;

-- Add missing columns to module_performance
ALTER TABLE public.module_performance
ADD COLUMN IF NOT EXISTS accuracy DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS precision DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS recall DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS f1_score DECIMAL(5,4);

-- Create master_signals_fusion table if not exists
CREATE TABLE IF NOT EXISTS public.master_signals_fusion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID,
  confidence_score DECIMAL(5,4) NOT NULL,
  weighted_score DECIMAL(5,4),
  contributing_signals JSONB DEFAULT '[]'::jsonb,
  fusion_method TEXT,
  final_signal TEXT CHECK (final_signal IN ('buy', 'sell', 'neutral')),
  execution_quality DECIMAL(5,2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trade_execution_log_timestamp ON public.trade_execution_log(execution_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_master_signals_analysis ON public.master_signals(analysis_id);
CREATE INDEX IF NOT EXISTS idx_master_signals_fusion_analysis ON public.master_signals_fusion(analysis_id);