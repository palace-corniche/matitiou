-- ============================================================
-- ML EXIT MODEL AUTOMATION - COMPLETE SYSTEM
-- ============================================================

-- Step 1: Create ML Training Logs Table
CREATE TABLE IF NOT EXISTS ml_training_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- 'manual', 'cron_weekly', 'cron_staleness', 'milestone'
  training_samples INTEGER,
  success BOOLEAN,
  error_message TEXT,
  training_duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ml_training_logs_created ON ml_training_logs(created_at DESC);
CREATE INDEX idx_ml_training_logs_success ON ml_training_logs(success);

-- Step 2: Create ML Performance Cache Table
CREATE TABLE IF NOT EXISTS ml_performance_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL, -- 'comparison', 'version_performance', 'exit_timing'
  metric_data JSONB NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ
);

CREATE INDEX idx_ml_perf_cache_type ON ml_performance_cache(metric_type);
CREATE INDEX idx_ml_perf_cache_validity ON ml_performance_cache(valid_until);

-- Step 3: Analytics Function - ML vs Traditional Exit Performance
CREATE OR REPLACE FUNCTION get_ml_performance_analytics(p_days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  metric_name TEXT,
  ml_exits NUMERIC,
  traditional_exits NUMERIC,
  improvement_percent NUMERIC,
  sample_size INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH ml_closed_trades AS (
    SELECT 
      st.*,
      CASE 
        WHEN st.exit_reason = 'ml_optimized_exit' THEN 'ml'
        ELSE 'traditional'
      END as exit_type
    FROM shadow_trades st
    WHERE st.status = 'closed'
      AND st.exit_time > now() - (p_days_back || ' days')::INTERVAL
  ),
  ml_stats AS (
    SELECT
      AVG(CASE WHEN exit_type = 'ml' THEN profit_pips END) as ml_avg_pips,
      AVG(CASE WHEN exit_type = 'traditional' THEN profit_pips END) as trad_avg_pips,
      COUNT(CASE WHEN exit_type = 'ml' THEN 1 END) as ml_count,
      COUNT(CASE WHEN exit_type = 'traditional' THEN 1 END) as trad_count,
      COUNT(CASE WHEN exit_type = 'ml' AND pnl > 0 THEN 1 END)::NUMERIC / 
        NULLIF(COUNT(CASE WHEN exit_type = 'ml' THEN 1 END), 0) * 100 as ml_win_rate,
      COUNT(CASE WHEN exit_type = 'traditional' AND pnl > 0 THEN 1 END)::NUMERIC / 
        NULLIF(COUNT(CASE WHEN exit_type = 'traditional' THEN 1 END), 0) * 100 as trad_win_rate,
      AVG(CASE WHEN exit_type = 'ml' THEN EXTRACT(EPOCH FROM (exit_time - entry_time)) / 60 END) as ml_avg_minutes,
      AVG(CASE WHEN exit_type = 'traditional' THEN EXTRACT(EPOCH FROM (exit_time - entry_time)) / 60 END) as trad_avg_minutes
    FROM ml_closed_trades
  )
  SELECT 
    'Average Profit (pips)'::TEXT,
    COALESCE(ml_avg_pips, 0),
    COALESCE(trad_avg_pips, 0),
    CASE 
      WHEN trad_avg_pips IS NOT NULL AND trad_avg_pips != 0 THEN
        ((ml_avg_pips - trad_avg_pips) / trad_avg_pips) * 100
      ELSE 0
    END,
    (ml_count + trad_count)::INTEGER
  FROM ml_stats
  
  UNION ALL
  
  SELECT 
    'Win Rate (%)'::TEXT,
    COALESCE(ml_win_rate, 0),
    COALESCE(trad_win_rate, 0),
    COALESCE(ml_win_rate - trad_win_rate, 0),
    (ml_count + trad_count)::INTEGER
  FROM ml_stats
  
  UNION ALL
  
  SELECT 
    'Avg Holding Time (min)'::TEXT,
    COALESCE(ml_avg_minutes, 0),
    COALESCE(trad_avg_minutes, 0),
    CASE 
      WHEN trad_avg_minutes IS NOT NULL AND trad_avg_minutes != 0 THEN
        ((trad_avg_minutes - ml_avg_minutes) / trad_avg_minutes) * 100
      ELSE 0
    END,
    (ml_count + trad_count)::INTEGER
  FROM ml_stats;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Analytics Function - Model Version Performance Tracking
CREATE OR REPLACE FUNCTION get_ml_model_versions_performance()
RETURNS TABLE(
  model_version TEXT,
  trained_date TIMESTAMPTZ,
  training_samples INTEGER,
  training_win_rate NUMERIC,
  actual_win_rate NUMERIC,
  avg_profit_pips NUMERIC,
  trades_executed INTEGER,
  days_active INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.model_version,
    m.created_at,
    m.training_samples,
    (m.accuracy_score * 100)::NUMERIC as training_win_rate,
    (
      COUNT(CASE WHEN st.pnl > 0 THEN 1 END)::NUMERIC / 
      NULLIF(COUNT(*), 0) * 100
    )::NUMERIC as actual_win_rate,
    COALESCE(AVG(st.profit_pips), 0)::NUMERIC,
    COUNT(*)::INTEGER as trades_executed,
    EXTRACT(DAY FROM (now() - m.created_at))::INTEGER,
    CASE 
      WHEN m.is_active THEN 'Active'
      ELSE 'Retired'
    END
  FROM ml_exit_models m
  LEFT JOIN shadow_trades st ON st.exit_reason = 'ml_optimized_exit'
    AND st.exit_time >= m.created_at
    AND st.exit_time < COALESCE(
      (SELECT created_at FROM ml_exit_models WHERE created_at > m.created_at ORDER BY created_at ASC LIMIT 1),
      now()
    )
  GROUP BY m.model_version, m.created_at, m.training_samples, m.accuracy_score, m.is_active
  ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Analytics Function - ML Exit Timing Analysis
CREATE OR REPLACE FUNCTION analyze_ml_exit_timing(p_days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  exit_scenario TEXT,
  avg_profit_pips NUMERIC,
  trade_count INTEGER,
  win_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH ml_exits AS (
    SELECT
      st.*,
      CASE
        WHEN st.profit_pips >= 40 THEN 'High Profit (>40 pips)'
        WHEN st.profit_pips >= 20 THEN 'Medium Profit (20-40 pips)'
        WHEN st.profit_pips >= 0 THEN 'Small Profit (0-20 pips)'
        ELSE 'Loss'
      END as profit_category
    FROM shadow_trades st
    WHERE st.status = 'closed'
      AND st.exit_reason = 'ml_optimized_exit'
      AND st.exit_time > now() - (p_days_back || ' days')::INTERVAL
  )
  SELECT
    profit_category,
    COALESCE(AVG(profit_pips), 0)::NUMERIC,
    COUNT(*)::INTEGER,
    (COUNT(CASE WHEN pnl > 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100)::NUMERIC
  FROM ml_exits
  GROUP BY profit_category
  ORDER BY AVG(profit_pips) DESC;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create Automated Training Cron Jobs
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