-- ==========================================
-- PHASE 3: Schedule AI Recommendations Generation
-- ==========================================

-- Schedule AI recommendations (every 10 minutes)
SELECT cron.schedule(
  'generate-ai-recommendations-10min',
  '*/10 * * * *', -- Every 10 minutes
  $$
  SELECT net.http_post(
      url:='https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/generate-ai-recommendations',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
      body:='{}'::jsonb
  ) as request_id;
  $$
);

-- Trigger once now
SELECT net.http_post(
    url:='https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/generate-ai-recommendations',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
    body:='{}'::jsonb
);

-- Verify complete cron job list
SELECT jobname, schedule, active 
FROM cron.job 
WHERE active = true
ORDER BY jobname;