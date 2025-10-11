-- Drop existing 15-minute cron jobs if they exist
SELECT cron.unschedule('fetch-market-data-every-15min');
SELECT cron.unschedule('generate-signals-every-15min');

-- Create new 5-minute pipeline cron job
SELECT cron.schedule(
  'auto-pipeline-5min',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/process-analysis-pipeline',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
    body := '{"auto_scheduled": true}'::jsonb
  ) as request_id;
  $$
);

-- Update market data fetch to also run every 5 minutes
SELECT cron.schedule(
  'fetch-market-data-5min',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/fetch-market-data',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Update signal generation to run every 5 minutes
SELECT cron.schedule(
  'generate-signals-5min',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/generate-confluence-signals',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Update news sentiment to run every 15 minutes (to respect API limits)
SELECT cron.unschedule('news-sentiment-update');
SELECT cron.schedule(
  'news-sentiment-15min',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/fetch-news-sentiment',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  ) as request_id;
  $$
);

-- Log the cron setup
INSERT INTO trading_diagnostics (diagnostic_type, severity_level, metadata) 
VALUES (
  'cron_setup',
  'info',
  jsonb_build_object(
    'message', 'Auto-pipeline scheduled for 5-minute intervals',
    'timestamp', now()
  )
);