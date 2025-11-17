-- Enable pg_cron and pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to run aggregate-candles every minute
SELECT cron.schedule(
  'aggregate-candles-every-minute',
  '* * * * *',  -- Every minute
  $$
  SELECT net.http_post(
    url := 'https://jnhyixrkevphmbkrkdjx.supabase.co/functions/v1/aggregate-candles',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaHlpeHJrZXZwaG1ia3JrZGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyODAyNTYsImV4cCI6MjA3ODg1NjI1Nn0.3MM_IvEOvJt9dE6MPFCndFmsxtqd2bnD3RH0pGVEsCg"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);