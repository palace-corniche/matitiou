-- Create signal_rejection_logs table for tracking rejected signals
CREATE TABLE IF NOT EXISTS public.signal_rejection_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT NOT NULL,
  value NUMERIC NOT NULL,
  threshold NUMERIC NOT NULL,
  signal_type TEXT NOT NULL,
  factors_count INTEGER NOT NULL DEFAULT 0,
  entropy NUMERIC,
  probability NUMERIC,
  confluence_score NUMERIC,
  net_edge NUMERIC,
  market_regime TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for signal_rejection_logs
ALTER TABLE public.signal_rejection_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow system to manage rejection logs
CREATE POLICY "System can manage rejection logs" 
ON public.signal_rejection_logs 
FOR ALL 
USING (true);

-- Create adaptive_thresholds table for storing current thresholds
CREATE TABLE IF NOT EXISTS public.adaptive_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entropy_min NUMERIC NOT NULL DEFAULT 0.7,
  entropy_max NUMERIC NOT NULL DEFAULT 0.95,
  entropy_current NUMERIC NOT NULL DEFAULT 0.85,
  probability_buy NUMERIC NOT NULL DEFAULT 0.58,
  probability_sell NUMERIC NOT NULL DEFAULT 0.42,
  confluence_min NUMERIC NOT NULL DEFAULT 10,
  confluence_adaptive NUMERIC NOT NULL DEFAULT 15,
  edge_min NUMERIC NOT NULL DEFAULT -0.0001,
  edge_adaptive NUMERIC NOT NULL DEFAULT 0.0001,
  last_adaptation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for adaptive_thresholds
ALTER TABLE public.adaptive_thresholds ENABLE ROW LEVEL SECURITY;

-- Create policy to allow system to manage adaptive thresholds
CREATE POLICY "System can manage adaptive thresholds" 
ON public.adaptive_thresholds 
FOR ALL 
USING (true);

-- Create policy to allow users to view adaptive thresholds
CREATE POLICY "Users can view adaptive thresholds" 
ON public.adaptive_thresholds 
FOR SELECT 
USING (true);

-- Insert initial adaptive thresholds record
INSERT INTO public.adaptive_thresholds (
  entropy_min, entropy_max, entropy_current,
  probability_buy, probability_sell,
  confluence_min, confluence_adaptive,
  edge_min, edge_adaptive
) VALUES (
  0.7, 0.95, 0.80,  -- Relaxed entropy from 0.85 to 0.80
  0.56, 0.44,       -- Relaxed probability thresholds
  8, 12,             -- Relaxed confluence thresholds
  -0.0002, 0.00005   -- More permissive edge thresholds
) ON CONFLICT DO NOTHING;

-- Add debug mode flag to system configuration
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for system_config
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Create policy to allow system to manage config
CREATE POLICY "System can manage config" 
ON public.system_config 
FOR ALL 
USING (true);

-- Create policy to allow users to view config
CREATE POLICY "Users can view config" 
ON public.system_config 
FOR SELECT 
USING (true);

-- Insert debug mode configuration
INSERT INTO public.system_config (config_key, config_value, description)
VALUES (
  'debug_mode',
  '{"enabled": false, "accept_all_signals": false, "log_level": "info"}',
  'Debug mode configuration for signal generation'
) ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = now();

-- Insert signal generation configuration
INSERT INTO public.system_config (config_key, config_value, description)
VALUES (
  'signal_generation',
  '{"adaptive_enabled": true, "learning_rate": 0.1, "target_signals_per_hour": 2, "force_generation": false}',
  'Signal generation optimization settings'
) ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = now();