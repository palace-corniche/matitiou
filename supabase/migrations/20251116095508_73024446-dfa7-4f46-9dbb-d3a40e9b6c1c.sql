-- Add remaining missing columns

-- Add timeframe to master_signals
ALTER TABLE public.master_signals
ADD COLUMN IF NOT EXISTS timeframe TEXT;

-- Add missing columns to master_signals_fusion
ALTER TABLE public.master_signals_fusion
ADD COLUMN IF NOT EXISTS fusion_decision TEXT,
ADD COLUMN IF NOT EXISTS fusion_reasoning TEXT,
ADD COLUMN IF NOT EXISTS risk_assessment JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS market_conditions JSONB DEFAULT '{}'::jsonb;

-- Add is_live to tick_data
ALTER TABLE public.tick_data
ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT TRUE;

-- Add price_source to shadow_trades
ALTER TABLE public.shadow_trades
ADD COLUMN IF NOT EXISTS price_source TEXT DEFAULT 'live';

-- Add missing columns to module_performance
ALTER TABLE public.module_performance
ADD COLUMN IF NOT EXISTS module_id TEXT,
ADD COLUMN IF NOT EXISTS signals_generated INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS reliability DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS consistency DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS response_time DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS error_rate DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS uptime_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS last_error TEXT,
ADD COLUMN IF NOT EXISTS last_error_time TIMESTAMPTZ;

-- Add missing columns to module_health
ALTER TABLE public.module_health
ADD COLUMN IF NOT EXISTS last_run TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signals_generated_today INTEGER DEFAULT 0;

-- Create trading_signals table
CREATE TABLE IF NOT EXISTS public.trading_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('buy', 'sell', 'neutral')),
  confidence DECIMAL(5,4) NOT NULL,
  strength DECIMAL(5,2),
  confluence_score DECIMAL(5,2),
  timeframe TEXT,
  entry_price DECIMAL(10,5),
  stop_loss DECIMAL(10,5),
  take_profit DECIMAL(10,5),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_trading_signals_pair ON public.trading_signals(pair, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trading_signals_status ON public.trading_signals(status);

-- Update existing indexes
CREATE INDEX IF NOT EXISTS idx_shadow_trades_symbol_status ON public.shadow_trades(symbol, status);
CREATE INDEX IF NOT EXISTS idx_master_signals_symbol ON public.master_signals(symbol, created_at DESC);