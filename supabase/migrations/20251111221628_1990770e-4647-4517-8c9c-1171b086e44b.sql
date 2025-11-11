-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule existing periodic-cleanup job if it exists
DO $$
BEGIN
  PERFORM cron.unschedule('periodic-data-cleanup-hourly')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'periodic-data-cleanup-hourly'
  );
END $$;

-- Schedule periodic-data-cleanup to run every hour at minute 0
SELECT cron.schedule(
  'periodic-data-cleanup-hourly',
  '0 * * * *', -- Every hour at minute 0 (e.g., 1:00, 2:00, 3:00)
  $$
  SELECT net.http_post(
    url := 'https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/periodic-data-cleanup',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
    body := '{"source": "cron_hourly"}'::jsonb
  ) as request_id;
  $$
);

-- Insert verification log
INSERT INTO trading_diagnostics (diagnostic_type, severity_level, metadata)
VALUES (
  'cron_job_scheduled',
  'info',
  jsonb_build_object(
    'job_name', 'periodic-data-cleanup-hourly',
    'schedule', 'Every hour at minute 0',
    'timestamp', now()
  )
);