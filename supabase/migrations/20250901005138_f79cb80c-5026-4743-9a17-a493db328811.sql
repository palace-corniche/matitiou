-- Create module performance tracking table
CREATE TABLE IF NOT EXISTS public.module_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL UNIQUE,
  signals_generated INTEGER DEFAULT 0,
  successful_signals INTEGER DEFAULT 0,
  failed_signals INTEGER DEFAULT 0,
  win_rate NUMERIC DEFAULT 0.5,
  average_return NUMERIC DEFAULT 0,
  sharpe_ratio NUMERIC DEFAULT 0,
  max_drawdown NUMERIC DEFAULT 0,
  reliability NUMERIC DEFAULT 0.7,
  information_ratio NUMERIC DEFAULT 0,
  average_confidence NUMERIC DEFAULT 0.5,
  average_strength NUMERIC DEFAULT 5,
  recent_performance JSONB DEFAULT '[]'::jsonb,
  trend TEXT DEFAULT 'stable' CHECK (trend IN ('improving', 'declining', 'stable')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'underperforming', 'excellent')),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create module correlations table for tracking signal dependencies
CREATE TABLE IF NOT EXISTS public.module_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_a TEXT NOT NULL,
  module_b TEXT NOT NULL,
  correlation_value NUMERIC NOT NULL DEFAULT 0,
  sample_size INTEGER DEFAULT 0,
  confidence_interval NUMERIC[] DEFAULT ARRAY[0, 0],
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(module_a, module_b)
);

-- Create performance snapshots for historical tracking
CREATE TABLE IF NOT EXISTS public.system_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_signals_generated INTEGER DEFAULT 0,
  total_signals_executed INTEGER DEFAULT 0,
  overall_win_rate NUMERIC DEFAULT 0,
  system_reliability NUMERIC DEFAULT 0,
  average_processing_time NUMERIC DEFAULT 0,
  active_modules_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  module_performance_data JSONB DEFAULT '{}'::jsonb,
  adaptive_thresholds JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(snapshot_date)
);

-- Enable RLS on all performance tables
ALTER TABLE public.module_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_performance_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies for system access to performance data
CREATE POLICY "System can manage module performance"
  ON public.module_performance
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view module performance"
  ON public.module_performance
  FOR SELECT
  USING (true);

CREATE POLICY "System can manage correlations"
  ON public.module_correlations
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view correlations"
  ON public.module_correlations
  FOR SELECT
  USING (true);

CREATE POLICY "System can manage performance snapshots"
  ON public.system_performance_snapshots
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view performance snapshots"
  ON public.system_performance_snapshots
  FOR SELECT
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_module_performance_module_id ON public.module_performance(module_id);
CREATE INDEX IF NOT EXISTS idx_module_performance_last_updated ON public.module_performance(last_updated);
CREATE INDEX IF NOT EXISTS idx_module_correlations_modules ON public.module_correlations(module_a, module_b);
CREATE INDEX IF NOT EXISTS idx_system_snapshots_date ON public.system_performance_snapshots(snapshot_date);

-- Create function to automatically create daily performance snapshots
CREATE OR REPLACE FUNCTION public.create_daily_performance_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.system_performance_snapshots (
    snapshot_date,
    total_signals_generated,
    total_signals_executed,
    overall_win_rate,
    system_reliability,
    average_processing_time,
    active_modules_count,
    error_count,
    module_performance_data,
    adaptive_thresholds
  )
  SELECT
    CURRENT_DATE,
    (SELECT COUNT(*) FROM trading_signals WHERE DATE(created_at) = CURRENT_DATE),
    (SELECT COUNT(*) FROM trading_signals WHERE was_executed = true AND DATE(created_at) = CURRENT_DATE),
    COALESCE((
      SELECT CASE 
        WHEN COUNT(*) = 0 THEN 0 
        ELSE SUM(CASE WHEN successful_signals > 0 THEN 1 ELSE 0 END)::NUMERIC / COUNT(*) 
      END
      FROM module_performance
    ), 0),
    COALESCE((SELECT AVG(reliability) FROM module_performance), 0),
    COALESCE((SELECT AVG(execution_time_ms) FROM system_health WHERE DATE(created_at) = CURRENT_DATE), 0),
    (SELECT COUNT(DISTINCT module_id) FROM module_performance WHERE signals_generated > 0),
    (SELECT COUNT(*) FROM system_health WHERE status = 'error' AND DATE(created_at) = CURRENT_DATE),
    COALESCE((SELECT jsonb_object_agg(module_id, row_to_json(module_performance.*)) FROM module_performance), '{}'::jsonb),
    COALESCE((SELECT row_to_json(adaptive_thresholds.*) FROM adaptive_thresholds ORDER BY updated_at DESC LIMIT 1), '{}'::jsonb)
  ON CONFLICT (snapshot_date) DO UPDATE SET
    total_signals_generated = EXCLUDED.total_signals_generated,
    total_signals_executed = EXCLUDED.total_signals_executed,
    overall_win_rate = EXCLUDED.overall_win_rate,
    system_reliability = EXCLUDED.system_reliability,
    average_processing_time = EXCLUDED.average_processing_time,
    active_modules_count = EXCLUDED.active_modules_count,
    error_count = EXCLUDED.error_count,
    module_performance_data = EXCLUDED.module_performance_data,
    adaptive_thresholds = EXCLUDED.adaptive_thresholds;
END;
$function$;

-- Set up realtime for performance tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.module_performance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.module_correlations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_performance_snapshots;

-- Initialize default module performance records
INSERT INTO public.module_performance (module_id, reliability) VALUES
  ('technical', 0.8),
  ('fundamental', 0.7),
  ('sentiment', 0.6),
  ('multiTimeframe', 0.75),
  ('patterns', 0.85),
  ('strategies', 0.78)
ON CONFLICT (module_id) DO NOTHING;