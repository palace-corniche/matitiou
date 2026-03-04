
ALTER TABLE public.trade_performance_summary ADD COLUMN IF NOT EXISTS total_unrealized_pnl NUMERIC DEFAULT 0;
ALTER TABLE public.trade_performance_summary ADD COLUMN IF NOT EXISTS avg_win_pips NUMERIC DEFAULT 0;
ALTER TABLE public.trade_performance_summary ADD COLUMN IF NOT EXISTS avg_loss_pips NUMERIC DEFAULT 0;
ALTER TABLE public.trade_performance_summary ADD COLUMN IF NOT EXISTS avg_trade_duration_hours NUMERIC DEFAULT 0;

ALTER TABLE public.intelligent_targets ADD COLUMN IF NOT EXISTS actual_tp NUMERIC;
ALTER TABLE public.intelligent_targets ADD COLUMN IF NOT EXISTS entry_price NUMERIC;
ALTER TABLE public.intelligent_targets ADD COLUMN IF NOT EXISTS key_levels JSONB DEFAULT '[]';
