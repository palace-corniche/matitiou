-- Step 1: Enable auto-trading
UPDATE global_trading_account
SET auto_trading_enabled = TRUE
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Step 2: Expire stale signals (older than 1 hour)
UPDATE master_signals
SET 
  status = 'expired',
  rejection_reason = 'Signal expired - older than 1 hour'
WHERE 
  status = 'pending'
  AND created_at < NOW() - INTERVAL '1 hour';

-- Step 3: Create cron job for executing trades every minute
SELECT cron.schedule(
  'execute-pending-trades-every-minute',
  '*/1 * * * *', -- Every 1 minute
  $$
  SELECT net.http_post(
    url := 'https://jnhyixrkevphmbkrkdjx.supabase.co/functions/v1/execute-shadow-trades',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaHlpeHJrZXZwaG1ia3JrZGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyODAyNTYsImV4cCI6MjA3ODg1NjI1Nn0.3MM_IvEOvJt9dE6MPFCndFmsxtqd2bnD3RH0pGVEsCg'
    ),
    body := jsonb_build_object('automated', true, 'timestamp', NOW())
  ) as request_id;
  $$
);