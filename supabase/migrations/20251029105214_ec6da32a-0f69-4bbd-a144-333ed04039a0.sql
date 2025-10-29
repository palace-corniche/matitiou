-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule real-time-tick-engine to run every minute
SELECT cron.schedule(
  'real-time-tick-engine-every-minute',
  '*/1 * * * *', -- Every 1 minute
  $$
  SELECT
    net.http_post(
        url:='https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/real-time-tick-engine',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);