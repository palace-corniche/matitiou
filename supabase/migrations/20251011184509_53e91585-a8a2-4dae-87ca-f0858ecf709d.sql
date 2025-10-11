-- ML Exit Optimization Tables

-- Store ML model versions and parameters
CREATE TABLE IF NOT EXISTS public.ml_exit_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version TEXT NOT NULL,
  model_type TEXT NOT NULL DEFAULT 'gradient_boost',
  training_samples INTEGER NOT NULL DEFAULT 0,
  accuracy_score NUMERIC NOT NULL DEFAULT 0,
  feature_importance JSONB NOT NULL DEFAULT '{}',
  model_parameters JSONB NOT NULL DEFAULT '{}',
  training_period JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT false
);

-- Store ML predictions for each trade
CREATE TABLE IF NOT EXISTS public.ml_exit_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES shadow_trades(id) ON DELETE CASCADE,
  model_version TEXT NOT NULL,
  predicted_exit_time TIMESTAMPTZ,
  predicted_exit_price NUMERIC,
  predicted_profit_pips NUMERIC,
  confidence_score NUMERIC NOT NULL,
  feature_values JSONB NOT NULL,
  actual_exit_time TIMESTAMPTZ,
  actual_exit_price NUMERIC,
  actual_profit_pips NUMERIC,
  prediction_error NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ml_exit_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_exit_predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "System can manage ML models"
  ON public.ml_exit_models
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view ML models"
  ON public.ml_exit_models
  FOR SELECT
  USING (true);

CREATE POLICY "System can manage ML predictions"
  ON public.ml_exit_predictions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view ML predictions"
  ON public.ml_exit_predictions
  FOR SELECT
  USING (true);

-- Indexes for performance
CREATE INDEX idx_ml_models_active ON public.ml_exit_models(is_active) WHERE is_active = true;
CREATE INDEX idx_ml_predictions_trade ON public.ml_exit_predictions(trade_id);
CREATE INDEX idx_ml_predictions_created ON public.ml_exit_predictions(created_at DESC);