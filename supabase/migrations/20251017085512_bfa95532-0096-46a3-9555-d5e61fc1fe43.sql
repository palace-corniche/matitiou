-- Phase 3: Fix ambiguous status variable in check_trade_integrity()
-- First drop the existing function
DROP FUNCTION IF EXISTS public.check_trade_integrity();

-- Recreate with fixed status references
CREATE OR REPLACE FUNCTION public.check_trade_integrity()
RETURNS TABLE(check_name text, expected_count integer, actual_count integer, check_status text, details text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check 1: Closed trades vs trade history
  RETURN QUERY 
  SELECT 
    'shadow_trades vs trade_history'::TEXT,
    (SELECT COUNT(*)::INTEGER FROM shadow_trades st WHERE st.status = 'closed'),
    (SELECT COUNT(*)::INTEGER FROM trade_history),
    CASE 
      WHEN ABS((SELECT COUNT(*) FROM shadow_trades st WHERE st.status = 'closed') - 
               (SELECT COUNT(*) FROM trade_history)) <= 5 
      THEN '✅ OK'::TEXT 
      ELSE '⚠️ MISMATCH'::TEXT 
    END,
    'Closed trades should match trade history'::TEXT;
  
  -- Check 2: Global account counter vs actual closed trades
  RETURN QUERY 
  SELECT 
    'global_account vs actual'::TEXT,
    (SELECT total_trades::INTEGER FROM global_trading_account WHERE id = '00000000-0000-0000-0000-000000000001'),
    (SELECT COUNT(*)::INTEGER FROM shadow_trades st WHERE st.status = 'closed' AND st.exit_reason != 'duplicate_cleanup'),
    CASE 
      WHEN (SELECT total_trades FROM global_trading_account WHERE id = '00000000-0000-0000-0000-000000000001') = 
           (SELECT COUNT(*) FROM shadow_trades st WHERE st.status = 'closed' AND st.exit_reason != 'duplicate_cleanup')
      THEN '✅ OK'::TEXT 
      ELSE '⚠️ MISMATCH'::TEXT 
    END,
    'Counter should match actual'::TEXT;
    
  -- Check 3: PnL consistency
  RETURN QUERY 
  SELECT 
    'pnl_consistency'::TEXT,
    (SELECT COUNT(*)::INTEGER FROM shadow_trades st WHERE st.status = 'closed' AND st.profit_pips > 0),
    (SELECT COUNT(*)::INTEGER FROM shadow_trades st WHERE st.status = 'closed' AND st.profit_pips > 0 AND st.pnl > 0),
    CASE 
      WHEN (SELECT COUNT(*) FROM shadow_trades st WHERE st.status = 'closed' AND st.profit_pips > 0 AND st.pnl = 0) = 0
      THEN '✅ OK'::TEXT 
      ELSE '⚠️ BUG_DETECTED'::TEXT 
    END,
    'Positive profit_pips should have positive pnl'::TEXT;
END;
$function$;