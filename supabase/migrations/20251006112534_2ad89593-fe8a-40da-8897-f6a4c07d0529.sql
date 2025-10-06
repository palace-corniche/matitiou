-- ==========================================
-- PHASE 1 STEP 2 & 3: Schedule Data Population Crons
-- ==========================================

-- Schedule economic calendar population (daily at midnight)
SELECT cron.schedule(
  'populate-economic-calendar-daily',
  '0 0 * * *', -- Daily at midnight UTC
  $$
  SELECT net.http_post(
      url:='https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/populate-economic-calendar',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
      body:='{}'::jsonb
  ) as request_id;
  $$
);

-- Schedule correlation calculation (daily at 1 AM)
SELECT cron.schedule(
  'calculate-correlations-daily',
  '0 1 * * *', -- Daily at 1 AM UTC
  $$
  SELECT net.http_post(
      url:='https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/calculate-correlations',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
      body:='{}'::jsonb
  ) as request_id;
  $$
);

-- Manually trigger once now to populate immediately
SELECT net.http_post(
    url:='https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/populate-economic-calendar',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
    body:='{}'::jsonb
);

SELECT net.http_post(
    url:='https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/calculate-correlations',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
    body:='{}'::jsonb
);

-- Verify all active cron jobs
SELECT jobname, schedule, active 
FROM cron.job 
WHERE jobname IN (
  'auto-detect-sr-15min', 
  'update-pnl-30s',
  'populate-economic-calendar-daily',
  'calculate-correlations-daily'
)
ORDER BY jobname;