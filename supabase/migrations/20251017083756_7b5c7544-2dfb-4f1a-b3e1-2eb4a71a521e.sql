-- Phase 1 Fix: Temporarily extend signal freshness to 2 hours to clear backlog
-- This will be restored to 5 minutes after processing

CREATE OR REPLACE FUNCTION public.validate_signal_freshness(p_signal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  signal_age_seconds INTEGER;
  signal_status TEXT;
  max_age_seconds INTEGER := 7200; -- Temporarily 2 hours to clear backlog
BEGIN
  SELECT 
    EXTRACT(EPOCH FROM (now() - created_at))::INTEGER,
    status
  INTO signal_age_seconds, signal_status
  FROM master_signals
  WHERE id = p_signal_id;
  
  IF signal_age_seconds IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Signal not found');
  END IF;
  
  IF signal_status != 'pending' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Signal already executed or rejected', 'status', signal_status);
  END IF;
  
  IF signal_age_seconds > max_age_seconds THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Signal too old', 'age_seconds', signal_age_seconds, 'max_age_seconds', max_age_seconds);
  END IF;
  
  RETURN jsonb_build_object('valid', true, 'age_seconds', signal_age_seconds, 'max_age_seconds', max_age_seconds);
END;
$function$;

-- Add comment for restoration reminder
COMMENT ON FUNCTION public.validate_signal_freshness(uuid) IS 'TEMPORARY: Extended to 2 hours for backlog processing. Restore to 300 seconds after Phase 1 completion.';