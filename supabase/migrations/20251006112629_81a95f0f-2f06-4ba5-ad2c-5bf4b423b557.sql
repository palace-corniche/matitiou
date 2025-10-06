-- ==========================================
-- PHASE 2: Performance Tracking Tables & Functions
-- ==========================================

-- Create AI recommendations table
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('trade', 'exit', 'risk_adjust', 'market_condition')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  action TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  confidence_score NUMERIC NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  data_sources JSONB NOT NULL DEFAULT '[]'::JSONB,
  metrics JSONB,
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'executed', 'expired', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Add RLS
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view recommendations"
ON ai_recommendations FOR SELECT
USING (true);

CREATE POLICY "System can manage recommendations"
ON ai_recommendations FOR ALL
USING (true);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_status ON ai_recommendations(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_priority ON ai_recommendations(priority, created_at DESC);

-- Function to update module performance after signal outcome
CREATE OR REPLACE FUNCTION update_module_performance_from_trade(
  p_module_id TEXT,
  p_signal_successful BOOLEAN,
  p_confidence NUMERIC,
  p_strength NUMERIC,
  p_return NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_signals INTEGER;
  current_successful INTEGER;
  current_failed INTEGER;
  new_win_rate NUMERIC;
  new_avg_confidence NUMERIC;
  new_avg_strength NUMERIC;
  new_avg_return NUMERIC;
BEGIN
  -- Get current stats
  SELECT 
    signals_generated,
    successful_signals,
    failed_signals
  INTO 
    current_signals,
    current_successful,
    current_failed
  FROM module_performance
  WHERE module_id = p_module_id;

  -- Update or insert
  IF FOUND THEN
    -- Calculate new averages
    IF p_signal_successful THEN
      new_win_rate := (current_successful + 1)::NUMERIC / (current_signals + 1)::NUMERIC;
    ELSE
      new_win_rate := current_successful::NUMERIC / (current_signals + 1)::NUMERIC;
    END IF;

    UPDATE module_performance
    SET
      signals_generated = signals_generated + 1,
      successful_signals = CASE WHEN p_signal_successful THEN successful_signals + 1 ELSE successful_signals END,
      failed_signals = CASE WHEN NOT p_signal_successful THEN failed_signals + 1 ELSE failed_signals END,
      win_rate = new_win_rate,
      average_confidence = ((average_confidence * current_signals) + p_confidence) / (current_signals + 1),
      average_strength = ((average_strength * current_signals) + p_strength) / (current_signals + 1),
      average_return = ((average_return * current_signals) + p_return) / (current_signals + 1),
      reliability = CASE 
        WHEN new_win_rate >= 0.6 THEN 0.9
        WHEN new_win_rate >= 0.5 THEN 0.7
        ELSE 0.5
      END,
      last_updated = now(),
      status = 'active'
    WHERE module_id = p_module_id;
  ELSE
    -- Insert new module performance record
    INSERT INTO module_performance (
      module_id,
      signals_generated,
      successful_signals,
      failed_signals,
      win_rate,
      average_confidence,
      average_strength,
      average_return,
      reliability,
      status,
      created_at,
      last_updated
    ) VALUES (
      p_module_id,
      1,
      CASE WHEN p_signal_successful THEN 1 ELSE 0 END,
      CASE WHEN NOT p_signal_successful THEN 1 ELSE 0 END,
      CASE WHEN p_signal_successful THEN 1.0 ELSE 0.0 END,
      p_confidence,
      p_strength,
      p_return,
      CASE WHEN p_signal_successful THEN 0.7 ELSE 0.5 END,
      'active',
      now(),
      now()
    );
  END IF;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION update_module_performance_from_trade TO service_role;