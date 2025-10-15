-- =============================================
-- PHASE 1: EMERGENCY FIXES (Fixed Constraint Violation)
-- =============================================

-- Step 1: Add execution_path column
ALTER TABLE shadow_trades
ADD COLUMN IF NOT EXISTS execution_path TEXT DEFAULT 'legacy';

-- Step 2: Mark existing orphaned trades
UPDATE shadow_trades
SET 
  execution_path = 'legacy_orphaned',
  comment = COALESCE(comment, '') || ' [ORPHANED]'
WHERE master_signal_id IS NULL 
  AND (comment IS NULL OR comment NOT LIKE '%ORPHANED%');

-- Step 3: Create orphaned signals with valid strength value (1 instead of 0)
INSERT INTO master_signals (
  symbol, timeframe, signal_type, final_confidence, final_strength,
  confluence_score, recommended_entry, recommended_stop_loss, recommended_take_profit,
  contributing_modules, modular_signal_ids, fusion_algorithm, fusion_parameters,
  market_data_snapshot, analysis_id, status, created_at
) 
SELECT DISTINCT
  st.symbol, '15m', st.trade_type, 0.1, 1, 1,
  st.entry_price, st.stop_loss, st.take_profit,
  ARRAY['legacy_import']::TEXT[], ARRAY[]::UUID[], 'orphaned_legacy', '{"source": "legacy"}'::JSONB,
  '{}'::JSONB, gen_random_uuid(), 'executed', st.entry_time
FROM shadow_trades st
WHERE st.master_signal_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM master_signals ms WHERE ms.fusion_algorithm = 'orphaned_legacy' AND ms.symbol = st.symbol)
ON CONFLICT DO NOTHING;

-- Step 4: Link orphaned trades to signals
UPDATE shadow_trades st
SET master_signal_id = os.id
FROM (SELECT id, symbol FROM master_signals WHERE fusion_algorithm = 'orphaned_legacy') os
WHERE st.master_signal_id IS NULL AND st.symbol = os.symbol;

-- Step 5: Add constraint to require master_signal_id
ALTER TABLE shadow_trades
ADD CONSTRAINT require_master_signal_id CHECK (master_signal_id IS NOT NULL);

-- Step 6: Create trade execution log table
CREATE TABLE IF NOT EXISTS trade_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES shadow_trades(id),
  signal_id UUID REFERENCES master_signals(id),
  execution_path TEXT NOT NULL,
  execution_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_freshness_ms INTEGER,
  price_deviation_percent NUMERIC(10, 4),
  validation_results JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE trade_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage execution logs"
ON trade_execution_log FOR ALL
USING (true) WITH CHECK (true);