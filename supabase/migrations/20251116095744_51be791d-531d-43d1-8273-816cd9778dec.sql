-- Add final missing columns and tables

-- Add comment to shadow_trades
ALTER TABLE public.shadow_trades
ADD COLUMN IF NOT EXISTS comment TEXT;

-- Add missing columns to trade_execution_log
ALTER TABLE public.trade_execution_log
ADD COLUMN IF NOT EXISTS signal_id UUID,
ADD COLUMN IF NOT EXISTS execution_path TEXT,
ADD COLUMN IF NOT EXISTS data_freshness_ms INTEGER,
ADD COLUMN IF NOT EXISTS price_deviation_percent DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS validation_results JSONB DEFAULT '{}'::jsonb;

-- Create missing tables
CREATE TABLE IF NOT EXISTS public.trade_performance_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  total_closed_trades INTEGER DEFAULT 0,
  total_open_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2),
  total_profit DECIMAL(15,2),
  average_profit DECIMAL(15,2),
  profit_factor DECIMAL(10,2),
  sharpe_ratio DECIMAL(10,4),
  max_drawdown DECIMAL(15,2),
  recovery_factor DECIMAL(10,2),
  average_hold_time_minutes INTEGER,
  best_trade DECIMAL(15,2),
  worst_trade DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lot_size_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  preset_name TEXT NOT NULL,
  lot_size DECIMAL(10,2) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default lot size presets
INSERT INTO public.lot_size_presets (preset_name, lot_size, is_default) VALUES
  ('Micro', 0.01, TRUE),
  ('Mini', 0.1, FALSE),
  ('Standard', 1.0, FALSE)
ON CONFLICT DO NOTHING;

-- Create RPC functions that components expect
CREATE OR REPLACE FUNCTION public.run_trading_diagnostics()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Basic diagnostics
  v_result := jsonb_build_object(
    'database_status', 'healthy',
    'tables_count', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'),
    'functions_count', (SELECT COUNT(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace),
    'timestamp', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.analyze_trade_performance()
RETURNS TABLE (
  performance_patterns JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_array(
    jsonb_build_object(
      'pattern', 'win_rate',
      'value', COALESCE(
        (SELECT win_rate FROM public.global_trading_account WHERE id = '00000000-0000-0000-0000-000000000001'),
        0
      )
    )
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable RLS on new tables
ALTER TABLE public.trade_performance_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lot_size_presets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all access to trade_performance_summary" ON public.trade_performance_summary FOR ALL USING (true);
CREATE POLICY "Allow all access to lot_size_presets" ON public.lot_size_presets FOR ALL USING (true);