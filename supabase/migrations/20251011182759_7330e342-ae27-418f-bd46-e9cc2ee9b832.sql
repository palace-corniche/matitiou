-- ============================================
-- FIX: Update exit_reason constraint with ALL valid values
-- ============================================

ALTER TABLE shadow_trades DROP CONSTRAINT IF EXISTS shadow_trades_exit_reason_check;

ALTER TABLE shadow_trades ADD CONSTRAINT shadow_trades_exit_reason_check 
CHECK (exit_reason IN (
  'stop_loss', 
  'take_profit', 
  'manual', 
  'trailing_stop', 
  'opposing_signal',
  'duplicate_cleanup',
  'system_cleanup',
  'timeout',
  'ai_exit',
  'volume_exit',
  'confluence_exit',
  'sr_rejection',
  'trend_reversal',
  'volatility_spike',
  'news_event'
));

-- ============================================
-- PHASE 1: Add Cron Job for Trade Management
-- ============================================

SELECT cron.schedule(
  'manage-shadow-trades-1min',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://gmpmpbuzlybajzrapdrr.supabase.co/functions/v1/manage-shadow-trades',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcG1wYnV6bHliYWp6cmFwZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM3MDAsImV4cCI6MjA3MDU2OTcwMH0.9cYpKsuHhrO4NFfVjpvCniUTRwRZRvhvsqXE22nM8a8"}'::jsonb,
    body:='{"trigger": "cron"}'::jsonb
  ) as request_id;
  $$
);

-- ============================================
-- PHASE 2: Data Cleanup & Sync
-- ============================================

UPDATE shadow_trades
SET 
  exit_reason = 'system_cleanup',
  pnl = (exit_price - entry_price) * lot_size * 100000 * (CASE WHEN trade_type = 'buy' THEN 1 ELSE -1 END),
  profit_pips = (exit_price - entry_price) * 10000 * (CASE WHEN trade_type = 'buy' THEN 1 ELSE -1 END)
WHERE exit_reason = 'duplicate_cleanup'
  AND exit_time::date = '2025-10-11'::date;

UPDATE global_trading_account
SET 
  total_trades = (SELECT COUNT(*) FROM shadow_trades WHERE status = 'closed' AND exit_reason != 'duplicate_cleanup'),
  winning_trades = (SELECT COUNT(*) FROM shadow_trades WHERE status = 'closed' AND exit_reason != 'duplicate_cleanup' AND pnl > 0),
  losing_trades = (SELECT COUNT(*) FROM shadow_trades WHERE status = 'closed' AND exit_reason != 'duplicate_cleanup' AND pnl <= 0),
  win_rate = (
    SELECT CASE WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE pnl > 0))::NUMERIC / COUNT(*) * 100 ELSE 0 END
    FROM shadow_trades WHERE status = 'closed' AND exit_reason != 'duplicate_cleanup'
  )
WHERE id = '00000000-0000-0000-0000-000000000001';

-- ============================================
-- PHASE 3: Monitoring
-- ============================================

CREATE OR REPLACE FUNCTION public.check_trade_integrity()
RETURNS TABLE (check_name TEXT, expected_count INTEGER, actual_count INTEGER, status TEXT, details TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT 'shadow_trades vs trade_history'::TEXT,
    (SELECT COUNT(*)::INTEGER FROM shadow_trades WHERE status = 'closed'),
    (SELECT COUNT(*)::INTEGER FROM trade_history),
    CASE WHEN ABS((SELECT COUNT(*) FROM shadow_trades WHERE status = 'closed') - (SELECT COUNT(*) FROM trade_history)) <= 5 
      THEN '✅ OK'::TEXT ELSE '⚠️ MISMATCH'::TEXT END,
    'Closed trades should match trade history'::TEXT;
  
  RETURN QUERY SELECT 'global_account vs actual'::TEXT,
    (SELECT total_trades::INTEGER FROM global_trading_account WHERE id = '00000000-0000-0000-0000-000000000001'),
    (SELECT COUNT(*)::INTEGER FROM shadow_trades WHERE status = 'closed' AND exit_reason != 'duplicate_cleanup'),
    CASE WHEN (SELECT total_trades FROM global_trading_account WHERE id = '00000000-0000-0000-0000-000000000001') = 
      (SELECT COUNT(*) FROM shadow_trades WHERE status = 'closed' AND exit_reason != 'duplicate_cleanup')
      THEN '✅ OK'::TEXT ELSE '⚠️ MISMATCH'::TEXT END,
    'Counter should match actual'::TEXT;
END;
$$;

SELECT cron.schedule('trade-integrity-check-15min', '*/15 * * * *',
  $$INSERT INTO trading_diagnostics (diagnostic_type, severity_level, metadata, created_at)
    SELECT 'trade_integrity_check',
      CASE WHEN status LIKE '%MISMATCH%' THEN 'warning' ELSE 'info' END,
      jsonb_build_object('check', check_name, 'expected', expected_count, 'actual', actual_count, 'status', status),
      NOW()
    FROM check_trade_integrity() WHERE status != '✅ OK';$$
);

-- ============================================
-- PHASE 4: Prevention
-- ============================================

DROP INDEX IF EXISTS idx_unique_open_trade_per_signal;
CREATE UNIQUE INDEX idx_unique_open_trade_per_signal ON shadow_trades (portfolio_id, symbol, trade_type, entry_price, status) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS public.trade_execution_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id TEXT,
  analysis_id UUID,
  portfolio_id UUID REFERENCES shadow_portfolios(id) ON DELETE CASCADE,
  execution_timestamp TIMESTAMPTZ DEFAULT NOW(),
  trade_id UUID REFERENCES shadow_trades(id) ON DELETE SET NULL,
  result TEXT NOT NULL CHECK (result IN ('executed', 'skipped_duplicate', 'skipped_validation', 'skipped_conditions', 'error')),
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON trade_execution_audit(execution_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_result ON trade_execution_audit(result);
CREATE INDEX IF NOT EXISTS idx_audit_signal ON trade_execution_audit(signal_id);

ALTER TABLE public.trade_execution_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can manage audit log" ON public.trade_execution_audit;
CREATE POLICY "System can manage audit log" ON public.trade_execution_audit FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view audit log" ON public.trade_execution_audit;
CREATE POLICY "Users can view audit log" ON public.trade_execution_audit FOR SELECT USING (true);