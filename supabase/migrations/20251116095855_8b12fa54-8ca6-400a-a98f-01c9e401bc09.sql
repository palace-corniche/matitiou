-- Absolute final missing elements

-- Add spread to tick_data
ALTER TABLE public.tick_data
ADD COLUMN IF NOT EXISTS spread DECIMAL(10,5);

-- Add trigger_price to pending_orders  
ALTER TABLE public.pending_orders
ADD COLUMN IF NOT EXISTS trigger_price DECIMAL(10,5),
ADD COLUMN IF NOT EXISTS trade_type TEXT;

-- Add auto_trading_enabled to global_trading_account
ALTER TABLE public.global_trading_account
ADD COLUMN IF NOT EXISTS auto_trading_enabled BOOLEAN DEFAULT FALSE;

-- Create ml_exit_models table
CREATE TABLE IF NOT EXISTS public.ml_exit_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_version TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  accuracy DECIMAL(5,4),
  precision_score DECIMAL(5,4),
  recall_score DECIMAL(5,4),
  f1_score DECIMAL(5,4),
  training_samples INTEGER,
  features JSONB DEFAULT '[]'::jsonb,
  hyperparameters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create get_ml_performance_analytics RPC function
CREATE OR REPLACE FUNCTION public.get_ml_performance_analytics()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  v_result := jsonb_build_object(
    'total_models', (SELECT COUNT(*) FROM public.ml_exit_models),
    'active_model', (SELECT model_version FROM public.ml_exit_models WHERE is_active = TRUE LIMIT 1),
    'best_accuracy', (SELECT MAX(accuracy) FROM public.ml_exit_models),
    'timestamp', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable RLS on ml_exit_models
ALTER TABLE public.ml_exit_models ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all access to ml_exit_models" ON public.ml_exit_models FOR ALL USING (true);