-- Final sentiment analysis tables

-- Create COT reports table
CREATE TABLE IF NOT EXISTS public.cot_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  report_date DATE NOT NULL,
  commercial_long INTEGER DEFAULT 0,
  commercial_short INTEGER DEFAULT 0,
  non_commercial_long INTEGER DEFAULT 0,
  non_commercial_short INTEGER DEFAULT 0,
  net_position INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(symbol, report_date)
);

-- Create retail positions table  
CREATE TABLE IF NOT EXISTS public.retail_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  long_percentage DECIMAL(5,2) NOT NULL,
  short_percentage DECIMAL(5,2) NOT NULL,
  snapshot_time TIMESTAMPTZ DEFAULT NOW(),
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to modular_signals for intermarket analysis
ALTER TABLE public.modular_signals
ADD COLUMN IF NOT EXISTS trigger_price DECIMAL(10,5),
ADD COLUMN IF NOT EXISTS trend_context TEXT,
ADD COLUMN IF NOT EXISTS volatility_regime TEXT,
ADD COLUMN IF NOT EXISTS calculation_parameters JSONB DEFAULT '{}'::jsonb;

-- Add missing column to trade_performance_summary
ALTER TABLE public.trade_performance_summary
ADD COLUMN IF NOT EXISTS avg_trade_duration_hours DECIMAL(10,2);

-- Add change_percentage_24h as alias to market_snapshot
ALTER TABLE public.market_snapshot
ADD COLUMN IF NOT EXISTS change_percentage_24h DECIMAL(10,4) GENERATED ALWAYS AS (change_percent) STORED;

-- Enable RLS
ALTER TABLE public.cot_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_positions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all access to cot_reports" ON public.cot_reports FOR ALL USING (true);
CREATE POLICY "Allow all access to retail_positions" ON public.retail_positions FOR ALL USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cot_reports_symbol ON public.cot_reports(symbol, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_retail_positions_symbol ON public.retail_positions(symbol, snapshot_time DESC);