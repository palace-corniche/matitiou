
-- Add missing columns to tick_data
ALTER TABLE public.tick_data ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false;

-- Add missing columns to shadow_trades
ALTER TABLE public.shadow_trades ADD COLUMN IF NOT EXISTS price_source TEXT;
ALTER TABLE public.shadow_trades ADD COLUMN IF NOT EXISTS profit NUMERIC DEFAULT 0;

-- Add missing columns to trading_signals
ALTER TABLE public.trading_signals ADD COLUMN IF NOT EXISTS pair TEXT;
ALTER TABLE public.trading_signals ADD COLUMN IF NOT EXISTS confluence_score NUMERIC DEFAULT 0;
ALTER TABLE public.trading_signals ADD COLUMN IF NOT EXISTS strength INTEGER DEFAULT 0;
ALTER TABLE public.trading_signals ADD COLUMN IF NOT EXISTS alert_level TEXT;
ALTER TABLE public.trading_signals ADD COLUMN IF NOT EXISTS factors JSONB DEFAULT '[]';
ALTER TABLE public.trading_signals ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.trading_signals ADD COLUMN IF NOT EXISTS risk_reward_ratio NUMERIC DEFAULT 0;

-- Add missing columns to learning_actions
ALTER TABLE public.learning_actions ADD COLUMN IF NOT EXISTS trigger_reason TEXT;
ALTER TABLE public.learning_actions ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT false;

-- Add missing columns to discovered_patterns
ALTER TABLE public.discovered_patterns ADD COLUMN IF NOT EXISTS pattern_name TEXT;
ALTER TABLE public.discovered_patterns ADD COLUMN IF NOT EXISTS win_rate NUMERIC DEFAULT 0;
ALTER TABLE public.discovered_patterns ADD COLUMN IF NOT EXISTS sample_size INTEGER DEFAULT 0;
ALTER TABLE public.discovered_patterns ADD COLUMN IF NOT EXISTS deployed BOOLEAN DEFAULT false;

-- Add missing columns to master_signals_fusion
ALTER TABLE public.master_signals_fusion ADD COLUMN IF NOT EXISTS analysis_id UUID;
ALTER TABLE public.master_signals_fusion ADD COLUMN IF NOT EXISTS confidence_score NUMERIC DEFAULT 0;
ALTER TABLE public.master_signals_fusion ADD COLUMN IF NOT EXISTS weighted_score NUMERIC DEFAULT 0;
ALTER TABLE public.master_signals_fusion ADD COLUMN IF NOT EXISTS contributing_signals JSONB DEFAULT '[]';
ALTER TABLE public.master_signals_fusion ADD COLUMN IF NOT EXISTS signal_type TEXT;
ALTER TABLE public.master_signals_fusion ADD COLUMN IF NOT EXISTS symbol TEXT DEFAULT 'EUR/USD';
ALTER TABLE public.master_signals_fusion ADD COLUMN IF NOT EXISTS timeframe TEXT DEFAULT '15m';
ALTER TABLE public.master_signals_fusion ADD COLUMN IF NOT EXISTS fusion_details JSONB DEFAULT '{}';
