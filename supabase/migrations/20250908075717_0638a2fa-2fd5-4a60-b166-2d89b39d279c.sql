-- Fix security issues: Add search_path to functions and enable RLS

-- Fix function search path issues
ALTER FUNCTION public.update_portfolio_performance() SET search_path = 'public';
ALTER FUNCTION public.update_portfolio_metrics() SET search_path = 'public';

-- Enable RLS on any new tables or update existing ones that might be missing
-- Most tables already have RLS enabled, but let's ensure all are covered

-- Check and ensure RLS is enabled on all relevant tables
ALTER TABLE IF EXISTS public.account_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ea_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lot_size_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.position_correlations ENABLE ROW LEVEL SECURITY;