-- Create signal_execution_attempts table (missing, causes execute-shadow-trades to crash)
CREATE TABLE public.signal_execution_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid,
  attempt_number integer DEFAULT 1,
  lock_acquired boolean DEFAULT false,
  execution_stage text,
  failure_reason text,
  market_price numeric,
  attempted_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.signal_execution_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to signal_execution_attempts"
  ON public.signal_execution_attempts FOR ALL
  USING (true) WITH CHECK (true);

-- Create calculate_trade_quality_score RPC (missing, logs errors in generate-confluence-signals)
CREATE OR REPLACE FUNCTION public.calculate_trade_quality_score(
  p_signal_id uuid,
  p_confluence_score numeric,
  p_market_regime text,
  p_volatility_percentile numeric DEFAULT 50
)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_quality_score numeric := 0;
  v_regime_bonus numeric := 0;
  v_volatility_bonus numeric := 0;
BEGIN
  -- Base score from confluence (max 50 points)
  v_quality_score := LEAST(p_confluence_score * 2, 50);
  
  -- Regime bonus (max 25 points)
  IF p_market_regime = 'trending' THEN
    v_regime_bonus := 25;
  ELSIF p_market_regime = 'volatile' THEN
    v_regime_bonus := 15;
  ELSIF p_market_regime = 'ranging' THEN
    v_regime_bonus := 10;
  ELSE
    v_regime_bonus := 5;
  END IF;
  
  -- Volatility bonus (max 25 points)
  IF p_volatility_percentile BETWEEN 30 AND 70 THEN
    v_volatility_bonus := 25;
  ELSIF p_volatility_percentile BETWEEN 20 AND 80 THEN
    v_volatility_bonus := 15;
  ELSE
    v_volatility_bonus := 5;
  END IF;
  
  v_quality_score := v_quality_score + v_regime_bonus + v_volatility_bonus;
  
  -- Update the master signal with the quality score
  UPDATE public.master_signals
  SET signal_quality_score = v_quality_score
  WHERE id = p_signal_id;
  
  RETURN v_quality_score;
END;
$$;