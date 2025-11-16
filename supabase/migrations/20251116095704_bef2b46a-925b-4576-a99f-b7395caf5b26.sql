-- Add all remaining missing columns

-- Add data_source to tick_data
ALTER TABLE public.tick_data
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'live';

-- Add price_timestamp to shadow_trades
ALTER TABLE public.shadow_trades
ADD COLUMN IF NOT EXISTS price_timestamp TIMESTAMPTZ;

-- Add missing columns to trading_signals
ALTER TABLE public.trading_signals
ADD COLUMN IF NOT EXISTS factors JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS alert_level TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS was_executed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS risk_reward_ratio DECIMAL(10,2);

-- Add missing columns to system_health
ALTER TABLE public.system_health
ADD COLUMN IF NOT EXISTS function_name TEXT,
ADD COLUMN IF NOT EXISTS execution_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS processed_items INTEGER DEFAULT 0;

-- Create get_global_trading_account RPC function
CREATE OR REPLACE FUNCTION public.get_global_trading_account()
RETURNS TABLE (
  id UUID,
  balance DECIMAL(15,2),
  equity DECIMAL(15,2),
  total_trades INTEGER,
  winning_trades INTEGER,
  losing_trades INTEGER,
  win_rate DECIMAL(5,2),
  total_pnl DECIMAL(15,2),
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gta.id,
    gta.balance,
    gta.equity,
    gta.total_trades,
    gta.winning_trades,
    gta.losing_trades,
    gta.win_rate,
    gta.total_pnl,
    gta.updated_at
  FROM public.global_trading_account gta
  WHERE gta.id = '00000000-0000-0000-0000-000000000001'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add missing columns for module_performance (aliases for existing columns)
ALTER TABLE public.module_performance
ADD COLUMN IF NOT EXISTS average_confidence DECIMAL(5,4) GENERATED ALWAYS AS (avg_confidence) STORED,
ADD COLUMN IF NOT EXISTS average_strength DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS successful_signals INTEGER GENERATED ALWAYS AS (winning_signals) STORED,
ADD COLUMN IF NOT EXISTS failed_signals INTEGER GENERATED ALWAYS AS (losing_signals) STORED,
ADD COLUMN IF NOT EXISTS total_profit DECIMAL(15,2) GENERATED ALWAYS AS (total_pnl) STORED,
ADD COLUMN IF NOT EXISTS profit_factor DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS max_drawdown DECIMAL(15,2);

-- Enable RLS on new tables
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_signals_fusion ENABLE ROW LEVEL SECURITY;

-- Create policies for new tables
CREATE POLICY "Allow all access to trading_signals" ON public.trading_signals FOR ALL USING (true);
CREATE POLICY "Allow all access to master_signals_fusion" ON public.master_signals_fusion FOR ALL USING (true);