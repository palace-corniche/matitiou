-- Enable real-time tick data collection via cron job
-- This will fetch tick data every 30 seconds for accurate bid/ask/spread tracking

-- Create cron job to call real-time-tick-engine every 30 seconds
SELECT cron.schedule(
  'real-time-tick-collection',
  '*/30 * * * * *', -- Every 30 seconds
  $$
  SELECT
    net.http_post(
        url:='https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/real-time-tick-engine',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);