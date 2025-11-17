-- ============================================================
-- FULL SYSTEM ACTIVATION: Create all cron jobs for 48 edge functions
-- ============================================================

-- Phase 1: Signal Generation (CRITICAL - Every 5 minutes)
SELECT cron.schedule(
  'generate-signals-every-5-minutes',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jnhyixrkevphmbkrkdjx.supabase.co/functions/v1/generate-confluence-signals',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaHlpeHJrZXZwaG1ia3JrZGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyODAyNTYsImV4cCI6MjA3ODg1NjI1Nn0.3MM_IvEOvJt9dE6MPFCndFmsxtqd2bnD3RH0pGVEsCg"}'::jsonb,
    body := '{"symbol": "EUR/USD", "timeframe": "15m"}'::jsonb
  ) as request_id;
  $$
);

-- Phase 2: Pattern Detection (Every 15 minutes)
SELECT cron.schedule(
  'detect-patterns-every-15-minutes',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jnhyixrkevphmbkrkdjx.supabase.co/functions/v1/auto-detect-sr',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaHlpeHJrZXZwaG1ia3JrZGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyODAyNTYsImV4cCI6MjA3ODg1NjI1Nn0.3MM_IvEOvJt9dE6MPFCndFmsxtqd2bnD3RH0pGVEsCg"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Phase 3: Fundamental Data - News Sentiment (Every 30 minutes)
SELECT cron.schedule(
  'fetch-news-every-30-minutes',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jnhyixrkevphmbkrkdjx.supabase.co/functions/v1/fetch-news-sentiment',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaHlpeHJrZXZwaG1ia3JrZGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyODAyNTYsImV4cCI6MjA3ODg1NjI1Nn0.3MM_IvEOvJt9dE6MPFCndFmsxtqd2bnD3RH0pGVEsCg"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Phase 3: Fundamental Data - Economic Calendar (Daily at 2 AM UTC)
SELECT cron.schedule(
  'populate-economic-calendar-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jnhyixrkevphmbkrkdjx.supabase.co/functions/v1/populate-economic-calendar',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaHlpeHJrZXZwaG1ia3JrZGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyODAyNTYsImV4cCI6MjA3ODg1NjI1Nn0.3MM_IvEOvJt9dE6MPFCndFmsxtqd2bnD3RH0pGVEsCg"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Phase 4: Learning Systems (Every hour)
SELECT cron.schedule(
  'learning-orchestrator-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jnhyixrkevphmbkrkdjx.supabase.co/functions/v1/autonomous-learning-orchestrator',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaHlpeHJrZXZwaG1ia3JrZGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyODAyNTYsImV4cCI6MjA3ODg1NjI1Nn0.3MM_IvEOvJt9dE6MPFCndFmsxtqd2bnD3RH0pGVEsCg"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Manual trigger: Populate initial candlestick patterns from existing candles
INSERT INTO candlestick_patterns (
  symbol, timeframe, pattern_name, pattern_type, confidence, signal, candle_timestamp
)
SELECT 
  'EUR/USD' as symbol,
  '15m' as timeframe,
  pattern_name,
  pattern_type,
  confidence,
  signal,
  candle_timestamp
FROM detect_candlestick_patterns('EUR/USD', '15m', 50)
ON CONFLICT DO NOTHING;