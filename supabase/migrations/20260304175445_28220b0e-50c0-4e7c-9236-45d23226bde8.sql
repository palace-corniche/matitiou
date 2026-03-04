
-- adaptive_thresholds table
CREATE TABLE public.adaptive_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  threshold_name TEXT NOT NULL,
  current_value NUMERIC DEFAULT 0,
  min_value NUMERIC DEFAULT 0,
  max_value NUMERIC DEFAULT 1,
  entropy_current NUMERIC DEFAULT 0,
  entropy_min NUMERIC DEFAULT 0,
  entropy_max NUMERIC DEFAULT 1,
  confluence_adaptive NUMERIC DEFAULT 0,
  confidence_adaptive NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.adaptive_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to adaptive_thresholds" ON public.adaptive_thresholds FOR ALL USING (true) WITH CHECK (true);

-- Missing columns on various tables
ALTER TABLE public.master_signals_fusion ADD COLUMN IF NOT EXISTS fusion_decision TEXT;
ALTER TABLE public.master_signals_fusion ADD COLUMN IF NOT EXISTS fusion_reasoning TEXT;
ALTER TABLE public.master_signals_fusion ADD COLUMN IF NOT EXISTS risk_assessment JSONB DEFAULT '{}';
ALTER TABLE public.master_signals_fusion ADD COLUMN IF NOT EXISTS market_conditions JSONB DEFAULT '{}';

ALTER TABLE public.winning_patterns ADD COLUMN IF NOT EXISTS avg_profit NUMERIC DEFAULT 0;
ALTER TABLE public.winning_patterns ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE public.intelligent_targets ADD COLUMN IF NOT EXISTS recommended_tp1 NUMERIC;
ALTER TABLE public.intelligent_targets ADD COLUMN IF NOT EXISTS recommended_tp2 NUMERIC;
ALTER TABLE public.intelligent_targets ADD COLUMN IF NOT EXISTS recommended_tp3 NUMERIC;
ALTER TABLE public.intelligent_targets ADD COLUMN IF NOT EXISTS actual_sl NUMERIC;
ALTER TABLE public.intelligent_targets ADD COLUMN IF NOT EXISTS risk_reward NUMERIC DEFAULT 0;
ALTER TABLE public.intelligent_targets ADD COLUMN IF NOT EXISTS market_context JSONB DEFAULT '{}';
ALTER TABLE public.intelligent_targets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.shadow_trades ADD COLUMN IF NOT EXISTS intelligence_exit_triggered BOOLEAN DEFAULT false;
ALTER TABLE public.shadow_trades ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

ALTER TABLE public.module_performance ADD COLUMN IF NOT EXISTS failed_signals INTEGER DEFAULT 0;
ALTER TABLE public.module_performance ADD COLUMN IF NOT EXISTS average_return NUMERIC DEFAULT 0;
ALTER TABLE public.module_performance ADD COLUMN IF NOT EXISTS sharpe_ratio NUMERIC DEFAULT 0;
ALTER TABLE public.module_performance ADD COLUMN IF NOT EXISTS max_drawdown NUMERIC DEFAULT 0;
ALTER TABLE public.module_performance ADD COLUMN IF NOT EXISTS information_ratio NUMERIC DEFAULT 0;

ALTER TABLE public.news_events ADD COLUMN IF NOT EXISTS sentiment_score NUMERIC DEFAULT 0;
ALTER TABLE public.news_events ADD COLUMN IF NOT EXISTS relevance_score NUMERIC DEFAULT 0;

ALTER TABLE public.market_data_enhanced ADD COLUMN IF NOT EXISTS close_price NUMERIC;

ALTER TABLE public.trade_performance_summary ADD COLUMN IF NOT EXISTS win_rate_percent NUMERIC DEFAULT 0;
ALTER TABLE public.trade_performance_summary ADD COLUMN IF NOT EXISTS avg_win_amount NUMERIC DEFAULT 0;
ALTER TABLE public.trade_performance_summary ADD COLUMN IF NOT EXISTS avg_loss_amount NUMERIC DEFAULT 0;
ALTER TABLE public.trade_performance_summary ADD COLUMN IF NOT EXISTS total_realized_pnl NUMERIC DEFAULT 0;
ALTER TABLE public.trade_performance_summary ADD COLUMN IF NOT EXISTS best_trade JSONB DEFAULT '{}';
ALTER TABLE public.trade_performance_summary ADD COLUMN IF NOT EXISTS worst_trade JSONB DEFAULT '{}';
ALTER TABLE public.trade_performance_summary ADD COLUMN IF NOT EXISTS monthly_returns JSONB DEFAULT '[]';
ALTER TABLE public.trade_performance_summary ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
