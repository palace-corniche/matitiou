-- Add max_tp_pips to account_defaults
ALTER TABLE account_defaults
ADD COLUMN max_tp_pips INTEGER DEFAULT 20;

-- Set default for existing records
UPDATE account_defaults
SET max_tp_pips = 20
WHERE max_tp_pips IS NULL;

-- Create intelligent_targets table for historical tracking
CREATE TABLE intelligent_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES shadow_trades(id) ON DELETE CASCADE,
  signal_id UUID REFERENCES master_signals(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  entry_price NUMERIC NOT NULL,
  recommended_sl NUMERIC NOT NULL,
  recommended_tp1 NUMERIC NOT NULL,
  recommended_tp2 NUMERIC,
  recommended_tp3 NUMERIC,
  actual_sl NUMERIC,
  actual_tp NUMERIC,
  confidence NUMERIC,
  reasoning TEXT,
  key_levels JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create exit_intelligence table for historical tracking
CREATE TABLE exit_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES shadow_trades(id) ON DELETE CASCADE,
  check_timestamp TIMESTAMPTZ DEFAULT NOW(),
  current_price NUMERIC NOT NULL,
  holding_time_minutes NUMERIC,
  overall_score NUMERIC NOT NULL,
  recommendation TEXT CHECK (recommendation IN ('FORCE_EXIT', 'HOLD_CAUTION', 'HOLD_CONFIDENT')),
  factors JSONB NOT NULL,
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_intelligent_targets_trade_id ON intelligent_targets(trade_id);
CREATE INDEX idx_intelligent_targets_signal_id ON intelligent_targets(signal_id);
CREATE INDEX idx_exit_intelligence_trade_id ON exit_intelligence(trade_id);
CREATE INDEX idx_exit_intelligence_timestamp ON exit_intelligence(check_timestamp);

-- Enable RLS
ALTER TABLE intelligent_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_intelligence ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view intelligent targets"
  ON intelligent_targets FOR SELECT
  USING (true);

CREATE POLICY "System can manage intelligent targets"
  ON intelligent_targets FOR ALL
  USING (true);

CREATE POLICY "Anyone can view exit intelligence"
  ON exit_intelligence FOR SELECT
  USING (true);

CREATE POLICY "System can manage exit intelligence"
  ON exit_intelligence FOR ALL
  USING (true);