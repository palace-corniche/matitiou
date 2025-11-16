-- Final missing columns to match frontend expectations

-- Add missing columns to adaptive_thresholds
ALTER TABLE public.adaptive_thresholds
ADD COLUMN IF NOT EXISTS entropy_min DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS entropy_max DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS entropy_current DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS probability_buy DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS probability_sell DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS confluence_min DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS confluence_adaptive DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS edge_min DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS edge_adaptive DECIMAL(5,4);

-- Add config_value as alias to value in system_config
ALTER TABLE public.system_config
ADD COLUMN IF NOT EXISTS config_value TEXT GENERATED ALWAYS AS (value) STORED;

-- Add profit alias to shadow_trades (maps to pnl)
ALTER TABLE public.shadow_trades
ADD COLUMN IF NOT EXISTS profit DECIMAL(15,2) GENERATED ALWAYS AS (pnl) STORED;

-- Add missing columns to module_performance
ALTER TABLE public.module_performance
ADD COLUMN IF NOT EXISTS average_return DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS information_ratio DECIMAL(10,4);

-- Add signal_id to trading_signals
ALTER TABLE public.trading_signals
ADD COLUMN IF NOT EXISTS signal_id UUID;

CREATE INDEX IF NOT EXISTS idx_trading_signals_signal_id ON public.trading_signals(signal_id);