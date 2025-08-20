-- Enable required extensions for automation
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to fetch market data every 15 minutes
SELECT cron.schedule(
  'fetch-market-data-every-15min',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/fetch-market-data',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);

-- Create cron job to generate confluence signals every 15 minutes (offset by 2 minutes)
SELECT cron.schedule(
  'generate-signals-every-15min',
  '2,17,32,47 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/generate-confluence-signals',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);

-- Create cron job to execute shadow trades every 15 minutes (offset by 5 minutes)
SELECT cron.schedule(
  'execute-trades-every-15min',
  '5,20,35,50 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/execute-shadow-trades',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);