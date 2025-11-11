-- ============================================
-- AUTONOMOUS SELF-LEARNING SYSTEM DATABASE
-- ============================================

-- 1. Learning Outcomes Table - Stores processed trade outcomes for learning
CREATE TABLE IF NOT EXISTS public.learning_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES public.shadow_trades(id) ON DELETE CASCADE,
  signal_id UUID REFERENCES public.master_signals(id) ON DELETE SET NULL,
  outcome_type TEXT NOT NULL CHECK (outcome_type IN ('win', 'loss', 'breakeven')),
  pnl NUMERIC NOT NULL,
  profit_pips NUMERIC NOT NULL,
  holding_time_minutes NUMERIC NOT NULL,
  signal_quality NUMERIC,
  confluence_score NUMERIC,
  entry_accuracy NUMERIC,
  exit_timing_score NUMERIC,
  market_regime TEXT,
  contributing_modules JSONB DEFAULT '[]'::JSONB,
  learned_features JSONB DEFAULT '{}'::JSONB,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_outcomes_trade_id ON public.learning_outcomes(trade_id);
CREATE INDEX IF NOT EXISTS idx_learning_outcomes_processed ON public.learning_outcomes(processed);
CREATE INDEX IF NOT EXISTS idx_learning_outcomes_outcome_type ON public.learning_outcomes(outcome_type);
CREATE INDEX IF NOT EXISTS idx_learning_outcomes_created_at ON public.learning_outcomes(created_at DESC);

-- 2. Learning Actions Table - Tracks all autonomous learning actions
CREATE TABLE IF NOT EXISTS public.learning_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL CHECK (action_type IN ('retrain_model', 'adjust_threshold', 'recalibrate_module', 'create_rule', 'self_heal', 'update_weights', 'discover_pattern')),
  trigger_reason TEXT NOT NULL,
  parameters_before JSONB DEFAULT '{}'::JSONB,
  parameters_after JSONB DEFAULT '{}'::JSONB,
  expected_improvement NUMERIC,
  actual_improvement NUMERIC,
  success BOOLEAN,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_learning_actions_action_type ON public.learning_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_learning_actions_created_at ON public.learning_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_actions_success ON public.learning_actions(success);

-- 3. Module Calibration History - Tracks module recalibrations
CREATE TABLE IF NOT EXISTS public.module_calibration_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL,
  old_parameters JSONB NOT NULL DEFAULT '{}'::JSONB,
  new_parameters JSONB NOT NULL DEFAULT '{}'::JSONB,
  performance_before JSONB NOT NULL DEFAULT '{}'::JSONB,
  performance_after JSONB DEFAULT '{}'::JSONB,
  backtest_results JSONB DEFAULT '{}'::JSONB,
  deployed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deployed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_module_calibration_module_id ON public.module_calibration_history(module_id);
CREATE INDEX IF NOT EXISTS idx_module_calibration_deployed ON public.module_calibration_history(deployed);
CREATE INDEX IF NOT EXISTS idx_module_calibration_created_at ON public.module_calibration_history(created_at DESC);

-- 4. Discovered Patterns - Stores automatically discovered winning patterns
CREATE TABLE IF NOT EXISTS public.discovered_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name TEXT NOT NULL,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('entry', 'exit', 'regime', 'combination', 'time', 'module_synergy')),
  pattern_rules JSONB NOT NULL DEFAULT '{}'::JSONB,
  confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  win_rate NUMERIC NOT NULL,
  sample_size INTEGER NOT NULL CHECK (sample_size >= 0),
  profit_factor NUMERIC,
  avg_pips NUMERIC,
  avg_return_percent NUMERIC,
  deployed BOOLEAN DEFAULT FALSE,
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deployed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_discovered_patterns_pattern_type ON public.discovered_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_discovered_patterns_deployed ON public.discovered_patterns(deployed);
CREATE INDEX IF NOT EXISTS idx_discovered_patterns_win_rate ON public.discovered_patterns(win_rate DESC);
CREATE INDEX IF NOT EXISTS idx_discovered_patterns_created_at ON public.discovered_patterns(created_at DESC);

-- 5. System Learning Stats - Tracks overall learning system performance
CREATE TABLE IF NOT EXISTS public.system_learning_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  win_rate NUMERIC,
  profit_factor NUMERIC,
  sharpe_ratio NUMERIC,
  total_actions_today INTEGER DEFAULT 0,
  successful_actions_today INTEGER DEFAULT 0,
  patterns_discovered_total INTEGER DEFAULT 0,
  active_patterns INTEGER DEFAULT 0,
  modules_recalibrated_today INTEGER DEFAULT 0,
  thresholds_adjusted_today INTEGER DEFAULT 0,
  models_retrained_today INTEGER DEFAULT 0,
  self_healing_actions_today INTEGER DEFAULT 0,
  learning_effectiveness_score NUMERIC,
  metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_system_learning_stats_timestamp ON public.system_learning_stats(timestamp DESC);

-- ============================================
-- DATABASE TRIGGERS FOR AUTONOMOUS LEARNING
-- ============================================

-- Trigger function to process trade outcome when trade closes
CREATE OR REPLACE FUNCTION public.trigger_learning_on_trade_close()
RETURNS TRIGGER AS $$
DECLARE
  outcome_type TEXT;
  holding_minutes NUMERIC;
BEGIN
  -- Only process when trade transitions from open to closed
  IF NEW.status = 'closed' AND OLD.status = 'open' THEN
    
    -- Determine outcome type
    IF NEW.pnl > 1.0 THEN
      outcome_type := 'win';
    ELSIF NEW.pnl < -1.0 THEN
      outcome_type := 'loss';
    ELSE
      outcome_type := 'breakeven';
    END IF;
    
    -- Calculate holding time
    holding_minutes := EXTRACT(EPOCH FROM (NEW.exit_time - NEW.entry_time)) / 60;
    
    -- Insert learning outcome record
    INSERT INTO public.learning_outcomes (
      trade_id,
      signal_id,
      outcome_type,
      pnl,
      profit_pips,
      holding_time_minutes,
      signal_quality,
      confluence_score,
      market_regime,
      processed
    ) VALUES (
      NEW.id,
      NEW.signal_id,
      outcome_type,
      NEW.pnl,
      NEW.profit_pips,
      holding_minutes,
      NEW.exit_intelligence_score,
      COALESCE((SELECT confluence_score FROM public.master_signals WHERE id = NEW.signal_id), 0),
      'unknown',
      FALSE
    );
    
    -- Log the trigger
    RAISE NOTICE 'Learning outcome created for trade %: % ($% / % pips)', NEW.id, outcome_type, NEW.pnl, NEW.profit_pips;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on shadow_trades
DROP TRIGGER IF EXISTS trade_closed_learning_trigger ON public.shadow_trades;
CREATE TRIGGER trade_closed_learning_trigger
AFTER UPDATE ON public.shadow_trades
FOR EACH ROW
EXECUTE FUNCTION public.trigger_learning_on_trade_close();

-- Function to update system learning stats (called by orchestrator)
CREATE OR REPLACE FUNCTION public.update_system_learning_stats()
RETURNS VOID AS $$
DECLARE
  current_win_rate NUMERIC;
  current_pf NUMERIC;
  actions_today INTEGER;
  successful_actions INTEGER;
  patterns_total INTEGER;
  patterns_active INTEGER;
BEGIN
  -- Calculate current performance metrics
  SELECT 
    CASE WHEN COUNT(*) > 0 THEN
      (COUNT(*) FILTER (WHERE pnl > 0))::NUMERIC / COUNT(*) * 100
    ELSE 0 END,
    CASE WHEN SUM(CASE WHEN pnl < 0 THEN ABS(pnl) ELSE 0 END) > 0 THEN
      SUM(CASE WHEN pnl > 0 THEN pnl ELSE 0 END) / SUM(CASE WHEN pnl < 0 THEN ABS(pnl) ELSE 0 END)
    ELSE 0 END
  INTO current_win_rate, current_pf
  FROM public.shadow_trades
  WHERE status = 'closed'
    AND exit_time > NOW() - INTERVAL '7 days';
  
  -- Count learning actions today
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE success = TRUE)
  INTO actions_today, successful_actions
  FROM public.learning_actions
  WHERE created_at::DATE = CURRENT_DATE;
  
  -- Count patterns
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE deployed = TRUE)
  INTO patterns_total, patterns_active
  FROM public.discovered_patterns;
  
  -- Insert stats record
  INSERT INTO public.system_learning_stats (
    timestamp,
    win_rate,
    profit_factor,
    total_actions_today,
    successful_actions_today,
    patterns_discovered_total,
    active_patterns,
    learning_effectiveness_score
  ) VALUES (
    NOW(),
    current_win_rate,
    current_pf,
    actions_today,
    successful_actions,
    patterns_total,
    patterns_active,
    CASE WHEN actions_today > 0 THEN (successful_actions::NUMERIC / actions_today * 100) ELSE 0 END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON public.learning_outcomes TO authenticated, anon, service_role;
GRANT ALL ON public.learning_actions TO authenticated, anon, service_role;
GRANT ALL ON public.module_calibration_history TO authenticated, anon, service_role;
GRANT ALL ON public.discovered_patterns TO authenticated, anon, service_role;
GRANT ALL ON public.system_learning_stats TO authenticated, anon, service_role;

-- Enable RLS (public data for now, can be restricted later)
ALTER TABLE public.learning_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_calibration_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovered_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_learning_stats ENABLE ROW LEVEL SECURITY;

-- Allow read access for all
CREATE POLICY "Allow read access to learning_outcomes" ON public.learning_outcomes FOR SELECT USING (true);
CREATE POLICY "Allow read access to learning_actions" ON public.learning_actions FOR SELECT USING (true);
CREATE POLICY "Allow read access to module_calibration_history" ON public.module_calibration_history FOR SELECT USING (true);
CREATE POLICY "Allow read access to discovered_patterns" ON public.discovered_patterns FOR SELECT USING (true);
CREATE POLICY "Allow read access to system_learning_stats" ON public.system_learning_stats FOR SELECT USING (true);

COMMENT ON TABLE public.learning_outcomes IS 'Stores processed trade outcomes for autonomous learning system';
COMMENT ON TABLE public.learning_actions IS 'Tracks all autonomous learning actions and their effectiveness';
COMMENT ON TABLE public.module_calibration_history IS 'History of module parameter recalibrations';
COMMENT ON TABLE public.discovered_patterns IS 'Automatically discovered winning trading patterns';
COMMENT ON TABLE public.system_learning_stats IS 'Overall learning system performance metrics';