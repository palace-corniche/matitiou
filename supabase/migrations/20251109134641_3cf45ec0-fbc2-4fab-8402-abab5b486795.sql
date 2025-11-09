-- Phase 1: Update analyze_trade_performance() with real patterns
CREATE OR REPLACE FUNCTION public.analyze_trade_performance()
RETURNS TABLE(
  pattern_type TEXT,
  win_rate NUMERIC,
  avg_profit NUMERIC,
  sample_size BIGINT,
  recommendation TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  
  -- Pattern 1: SELL Trade Direction
  SELECT 
    'SELL Trades' as pattern_type,
    (COUNT(CASE WHEN profit > 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100) as win_rate,
    AVG(profit) as avg_profit,
    COUNT(*) as sample_size,
    CASE 
      WHEN COUNT(*) < 5 THEN 'Insufficient data for SELL trades'
      WHEN (COUNT(CASE WHEN profit > 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) > 0.7 THEN 'PRIORITIZE SELL signals - High win rate detected'
      WHEN (COUNT(CASE WHEN profit > 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) < 0.3 THEN 'REDUCE SELL trades - Poor performance'
      ELSE 'MAINTAIN SELL strategy'
    END as recommendation
  FROM shadow_trades
  WHERE status = 'closed' AND trade_type = 'sell'
  
  UNION ALL
  
  -- Pattern 2: BUY Trade Direction
  SELECT 
    'BUY Trades' as pattern_type,
    (COUNT(CASE WHEN profit > 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100) as win_rate,
    AVG(profit) as avg_profit,
    COUNT(*) as sample_size,
    CASE 
      WHEN COUNT(*) < 5 THEN 'Insufficient data for BUY trades'
      WHEN (COUNT(CASE WHEN profit > 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) > 0.7 THEN 'PRIORITIZE BUY signals - High win rate detected'
      WHEN (COUNT(CASE WHEN profit > 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) < 0.3 THEN 'REDUCE BUY trades - Poor performance'
      ELSE 'MAINTAIN BUY strategy'
    END as recommendation
  FROM shadow_trades
  WHERE status = 'closed' AND trade_type = 'buy'
  
  UNION ALL
  
  -- Pattern 3: Take Profit Exits
  SELECT 
    'Take Profit Exits' as pattern_type,
    (COUNT(CASE WHEN profit > 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100) as win_rate,
    AVG(profit) as avg_profit,
    COUNT(*) as sample_size,
    CASE 
      WHEN COUNT(*) < 5 THEN 'Need more Take Profit exits for analysis'
      WHEN (COUNT(CASE WHEN profit > 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) > 0.8 THEN 'Excellent TP placement - Continue current TP levels'
      WHEN (COUNT(CASE WHEN profit > 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) < 0.5 THEN 'Review TP levels - Too many TP exits are losses'
      ELSE 'TP strategy is balanced'
    END as recommendation
  FROM shadow_trades
  WHERE status = 'closed' AND exit_reason = 'take_profit'
  
  UNION ALL
  
  -- Pattern 4: Stop Loss Exits
  SELECT 
    'Stop Loss Exits' as pattern_type,
    (COUNT(CASE WHEN profit > 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100) as win_rate,
    AVG(profit) as avg_profit,
    COUNT(*) as sample_size,
    CASE 
      WHEN COUNT(*) < 5 THEN 'Need more Stop Loss data'
      WHEN COUNT(*)::NUMERIC / NULLIF((SELECT COUNT(*) FROM shadow_trades WHERE status = 'closed'), 0) > 0.7 THEN 'Too many SL hits - Review entry timing and SL placement'
      WHEN (COUNT(CASE WHEN profit > 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) < 0.3 THEN 'SL exits rarely profitable - Consider wider stops or better entries'
      ELSE 'SL strategy acceptable'
    END as recommendation
  FROM shadow_trades
  WHERE status = 'closed' AND exit_reason = 'stop_loss'
  
  UNION ALL
  
  -- Pattern 5: Peak Hours (14-15 UTC)
  SELECT 
    'Peak Hours (14-15 UTC)' as pattern_type,
    (COUNT(CASE WHEN profit > 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100) as win_rate,
    AVG(profit) as avg_profit,
    COUNT(*) as sample_size,
    CASE 
      WHEN COUNT(*) < 3 THEN 'Insufficient data for these hours'
      WHEN (COUNT(CASE WHEN profit > 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) > 0.7 THEN 'INCREASE trading activity during 14-15 UTC - High success rate'
      WHEN (COUNT(CASE WHEN profit > 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) < 0.3 THEN 'AVOID trading during 14-15 UTC - Poor performance'
      ELSE 'Neutral performance during these hours'
    END as recommendation
  FROM shadow_trades
  WHERE status = 'closed' 
    AND EXTRACT(HOUR FROM entry_time AT TIME ZONE 'UTC') IN (14, 15)
  
  UNION ALL
  
  -- Pattern 6: Evening Hours (20-21 UTC)
  SELECT 
    'Evening Hours (20-21 UTC)' as pattern_type,
    (COUNT(CASE WHEN profit > 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100) as win_rate,
    AVG(profit) as avg_profit,
    COUNT(*) as sample_size,
    CASE 
      WHEN COUNT(*) < 3 THEN 'Insufficient data for these hours'
      WHEN (COUNT(CASE WHEN profit > 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) > 0.7 THEN 'INCREASE trading activity during 20-21 UTC - High success rate'
      WHEN (COUNT(CASE WHEN profit > 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) < 0.3 THEN 'AVOID trading during 20-21 UTC - Poor performance'
      ELSE 'Neutral performance during these hours'
    END as recommendation
  FROM shadow_trades
  WHERE status = 'closed' 
    AND EXTRACT(HOUR FROM entry_time AT TIME ZONE 'UTC') IN (20, 21);
END;
$$;