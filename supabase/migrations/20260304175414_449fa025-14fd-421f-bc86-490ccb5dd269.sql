
-- Missing tables
CREATE TABLE public.trade_performance_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total_closed_trades INTEGER DEFAULT 0,
  total_open_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  total_pnl NUMERIC DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  profit_factor NUMERIC DEFAULT 0,
  average_win NUMERIC DEFAULT 0,
  average_loss NUMERIC DEFAULT 0,
  largest_win NUMERIC DEFAULT 0,
  largest_loss NUMERIC DEFAULT 0,
  max_drawdown NUMERIC DEFAULT 0,
  sharpe_ratio NUMERIC DEFAULT 0,
  avg_trade_duration_minutes NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.trade_performance_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to trade_performance_summary" ON public.trade_performance_summary FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.winning_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_type TEXT,
  pattern_criteria JSONB DEFAULT '{}',
  win_rate NUMERIC DEFAULT 0,
  sample_size INTEGER DEFAULT 0,
  avg_pnl NUMERIC DEFAULT 0,
  avg_pips NUMERIC DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.winning_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to winning_patterns" ON public.winning_patterns FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.intelligent_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID,
  suggested_tp NUMERIC,
  suggested_sl NUMERIC,
  confidence NUMERIC DEFAULT 0,
  reasoning TEXT,
  factors JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.intelligent_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to intelligent_targets" ON public.intelligent_targets FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.intelligence_backtests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  strategy_name TEXT,
  timeframe TEXT,
  symbol TEXT DEFAULT 'EUR/USD',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  total_trades INTEGER DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  profit_factor NUMERIC DEFAULT 0,
  total_pnl NUMERIC DEFAULT 0,
  max_drawdown NUMERIC DEFAULT 0,
  sharpe_ratio NUMERIC DEFAULT 0,
  parameters JSONB DEFAULT '{}',
  results JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.intelligence_backtests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to intelligence_backtests" ON public.intelligence_backtests FOR ALL USING (true) WITH CHECK (true);

-- Missing columns
ALTER TABLE public.tick_data ADD COLUMN IF NOT EXISTS data_source TEXT;
ALTER TABLE public.shadow_trades ADD COLUMN IF NOT EXISTS price_timestamp TIMESTAMPTZ;
ALTER TABLE public.shadow_trades ADD COLUMN IF NOT EXISTS exit_intelligence_score NUMERIC DEFAULT 0;
ALTER TABLE public.trade_execution_log ADD COLUMN IF NOT EXISTS signal_id UUID;
ALTER TABLE public.trade_execution_log ADD COLUMN IF NOT EXISTS execution_path TEXT;
ALTER TABLE public.trade_execution_log ADD COLUMN IF NOT EXISTS data_freshness_ms NUMERIC DEFAULT 0;
ALTER TABLE public.trade_execution_log ADD COLUMN IF NOT EXISTS price_deviation_percent NUMERIC DEFAULT 0;
ALTER TABLE public.trade_execution_log ADD COLUMN IF NOT EXISTS validation_results JSONB DEFAULT '{}';
ALTER TABLE public.module_health ADD COLUMN IF NOT EXISTS last_run TIMESTAMPTZ;
ALTER TABLE public.module_health ADD COLUMN IF NOT EXISTS performance_score NUMERIC DEFAULT 0;
ALTER TABLE public.module_health ADD COLUMN IF NOT EXISTS signals_generated_today INTEGER DEFAULT 0;
ALTER TABLE public.market_data_feed ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.economic_calendar ADD COLUMN IF NOT EXISTS actual_value NUMERIC;
ALTER TABLE public.economic_calendar ADD COLUMN IF NOT EXISTS forecast_value NUMERIC;
ALTER TABLE public.economic_calendar ADD COLUMN IF NOT EXISTS previous_value NUMERIC;
ALTER TABLE public.module_performance ADD COLUMN IF NOT EXISTS module_name TEXT;
