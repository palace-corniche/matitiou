-- ========================================
-- COMPLETE FIX: Signal Quality System
-- ========================================

-- 1. Fix constraint to accept 0-100 scale
ALTER TABLE master_signals 
DROP CONSTRAINT IF EXISTS master_signals_signal_quality_score_check;

ALTER TABLE master_signals 
ADD CONSTRAINT master_signals_signal_quality_score_check 
CHECK (signal_quality_score >= 0 AND signal_quality_score <= 100);

-- 2. Add quality threshold to account defaults
ALTER TABLE account_defaults 
ADD COLUMN IF NOT EXISTS min_signal_quality NUMERIC NOT NULL DEFAULT 60.0;

-- 3. Update global account with threshold
UPDATE account_defaults 
SET min_signal_quality = 60.0
WHERE portfolio_id IN (SELECT id FROM global_trading_account);

-- 4. Backfill quality scores for existing signals (in batches)
DO $$
DECLARE
  signal_record RECORD;
  calculated_quality NUMERIC;
  batch_count INTEGER := 0;
BEGIN
  FOR signal_record IN 
    SELECT id, confluence_score, market_regime 
    FROM master_signals 
    WHERE signal_quality_score IS NULL
    LIMIT 500
  LOOP
    -- Calculate quality score
    calculated_quality := calculate_trade_quality_score(
      signal_record.id,
      COALESCE(signal_record.confluence_score, 0),
      COALESCE(signal_record.market_regime, 'unknown'),
      50
    );
    
    -- Update signal
    UPDATE master_signals 
    SET signal_quality_score = calculated_quality
    WHERE id = signal_record.id;
    
    batch_count := batch_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Backfilled % signals with quality scores', batch_count;
END $$;

-- 5. Schedule ML training cron jobs
SELECT cron.schedule(
  'train-ml-exit-model-weekly',
  '0 2 * * 0',
  $$
  SELECT net.http_post(
    url:='https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/train-exit-model',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
    body:='{"auto_triggered": true, "trigger_reason": "weekly_schedule"}'::jsonb
  ) as request_id;
  $$
);

SELECT cron.schedule(
  'check-ml-model-freshness',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url:='https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/train-exit-model',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
    body:='{"auto_triggered": true, "trigger_reason": "staleness_check", "max_model_age_days": 7}'::jsonb
  ) as request_id;
  $$
);