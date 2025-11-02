-- ✅ FIX #3: Add cron job to update module performance every hour
-- This enables continuous learning from trade outcomes

-- First, ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule module performance calculation every hour at minute 0
SELECT cron.schedule(
  'update-module-performance-hourly',
  '0 * * * *',  -- Every hour at minute 0
  $$
  SELECT public.calculate_module_performance();
  $$
);

-- Add a daily snapshot creation at midnight
SELECT cron.schedule(
  'create-daily-performance-snapshot',
  '0 0 * * *',  -- Every day at midnight
  $$
  SELECT public.create_daily_performance_snapshot();
  $$
);

-- Log the cron job creation
INSERT INTO public.trading_diagnostics (
  diagnostic_type,
  severity_level,
  metadata
) VALUES (
  'cron_job_created',
  'info',
  jsonb_build_object(
    'jobs', ARRAY['update-module-performance-hourly', 'create-daily-performance-snapshot'],
    'description', 'Automated module performance learning enabled',
    'frequency', 'hourly + daily snapshot',
    'timestamp', now()
  )
);