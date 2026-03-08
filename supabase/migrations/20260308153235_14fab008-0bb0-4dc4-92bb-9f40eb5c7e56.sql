CREATE OR REPLACE FUNCTION public.calculate_trade_quality_score(p_signal_id uuid, p_confluence_score numeric, p_market_regime text, p_volatility_percentile numeric DEFAULT 50)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_quality_score numeric := 0;
  v_regime_bonus numeric := 0;
  v_volatility_bonus numeric := 0;
BEGIN
  v_quality_score := LEAST(p_confluence_score * 2, 50);
  
  IF p_market_regime = 'trending' THEN
    v_regime_bonus := 25;
  ELSIF p_market_regime = 'volatile' THEN
    v_regime_bonus := 15;
  ELSIF p_market_regime = 'ranging' THEN
    v_regime_bonus := 10;
  ELSE
    v_regime_bonus := 5;
  END IF;
  
  IF p_volatility_percentile BETWEEN 30 AND 70 THEN
    v_volatility_bonus := 25;
  ELSIF p_volatility_percentile BETWEEN 20 AND 80 THEN
    v_volatility_bonus := 15;
  ELSE
    v_volatility_bonus := 5;
  END IF;
  
  v_quality_score := v_quality_score + v_regime_bonus + v_volatility_bonus;
  
  UPDATE public.master_signals
  SET signal_quality_score = v_quality_score
  WHERE id = p_signal_id;
  
  RETURN v_quality_score;
END;
$function$