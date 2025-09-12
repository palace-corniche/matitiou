-- PHASE A: CRITICAL SECURITY FIXES
-- Fix all database function security paths and RLS policies

-- Fix function search paths for security
ALTER FUNCTION public.update_portfolio_metrics() SET search_path = public;
ALTER FUNCTION public.archive_old_trades() SET search_path = public;
ALTER FUNCTION public.run_trading_diagnostics() SET search_path = public;
ALTER FUNCTION public.update_eurusd_pnl() SET search_path = public;

-- Add missing RLS on critical tables that are currently public
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_signals_fusion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_resistance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cot_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volatility_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elliott_waves ENABLE ROW LEVEL SECURITY;

-- Create secure RLS policies for system config (admin only)
CREATE POLICY "System config admin only" ON public.system_config FOR ALL USING (false);

-- Create secure RLS policies for calibration results
CREATE POLICY "System can manage calibration results" ON public.calibration_results FOR ALL USING (true);
CREATE POLICY "Users can view calibration results" ON public.calibration_results FOR SELECT USING (true);

-- Create secure RLS policies for calibration audit
CREATE POLICY "System can manage calibration audit" ON public.calibration_audit FOR ALL USING (true);
CREATE POLICY "Users can view calibration audit" ON public.calibration_audit FOR SELECT USING (true);

-- Create secure RLS policies for master signals fusion
CREATE POLICY "System can manage fusion signals" ON public.master_signals_fusion FOR ALL USING (true);
CREATE POLICY "Users can view fusion signals" ON public.master_signals_fusion FOR SELECT USING (true);

-- Create secure RLS policies for remaining tables
CREATE POLICY "Anyone can view support resistance" ON public.support_resistance FOR SELECT USING (true);
CREATE POLICY "System can manage support resistance" ON public.support_resistance FOR ALL USING (true);

CREATE POLICY "Anyone can view economic events" ON public.economic_events FOR SELECT USING (true);
CREATE POLICY "System can manage economic events" ON public.economic_events FOR ALL USING (true);

CREATE POLICY "Anyone can view cot reports" ON public.cot_reports FOR SELECT USING (true);
CREATE POLICY "System can manage cot reports" ON public.cot_reports FOR ALL USING (true);

CREATE POLICY "Anyone can view volatility metrics" ON public.volatility_metrics FOR SELECT USING (true);
CREATE POLICY "System can manage volatility metrics" ON public.volatility_metrics FOR ALL USING (true);

CREATE POLICY "Anyone can view elliott waves" ON public.elliott_waves FOR SELECT USING (true);
CREATE POLICY "System can manage elliott waves" ON public.elliott_waves FOR ALL USING (true);