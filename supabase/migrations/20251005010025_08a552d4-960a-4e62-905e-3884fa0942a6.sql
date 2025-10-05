-- ==========================================
-- PHASE 1 STEP 1: Fix insert_master_signal Function
-- ==========================================

-- Drop existing function
DROP FUNCTION IF EXISTS insert_master_signal(uuid, text, numeric, integer, numeric, numeric, numeric, numeric, numeric, text, text[], uuid[], jsonb, jsonb);

-- Create enhanced function with detailed error logging
CREATE OR REPLACE FUNCTION insert_master_signal(
  p_analysis_id UUID,
  p_signal_type TEXT,
  p_confidence NUMERIC,
  p_strength INTEGER,
  p_confluence_score NUMERIC,
  p_entry NUMERIC,
  p_sl NUMERIC,
  p_tp NUMERIC,
  p_lot_size NUMERIC,
  p_timeframe TEXT,
  p_modules TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_modular_ids UUID[] DEFAULT ARRAY[]::UUID[],
  p_fusion_params JSONB DEFAULT '{}'::JSONB,
  p_market_snapshot JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_signal_id UUID;
  signal_hash_val TEXT;
  error_details TEXT;
BEGIN
  -- Validate required fields BEFORE attempting INSERT
  IF p_analysis_id IS NULL THEN
    RAISE EXCEPTION 'analysis_id cannot be NULL';
  END IF;
  
  IF p_signal_type NOT IN ('buy', 'sell') THEN
    RAISE EXCEPTION 'signal_type must be buy or sell, got: %', p_signal_type;
  END IF;
  
  IF p_confidence < 0 OR p_confidence > 1 THEN
    RAISE EXCEPTION 'confidence must be between 0 and 1, got: %', p_confidence;
  END IF;
  
  IF p_strength < 1 OR p_strength > 10 THEN
    RAISE EXCEPTION 'strength must be between 1 and 10, got: %', p_strength;
  END IF;

  -- Generate unique signal hash (don't use analysis_id in hash to avoid conflicts)
  signal_hash_val := md5(
    p_signal_type || 
    p_confidence::TEXT || 
    p_entry::TEXT ||
    clock_timestamp()::TEXT ||
    random()::TEXT
  );

  -- Insert master signal with all required fields
  BEGIN
    INSERT INTO master_signals (
      analysis_id,
      signal_type,
      final_confidence,
      final_strength,
      confluence_score,
      recommended_entry,
      recommended_stop_loss,
      recommended_take_profit,
      recommended_lot_size,
      timeframe,
      symbol,
      contributing_modules,
      modular_signal_ids,
      fusion_parameters,
      market_data_snapshot,
      signal_hash,
      fusion_algorithm,
      status
    ) VALUES (
      p_analysis_id,
      p_signal_type,
      p_confidence,
      p_strength,
      p_confluence_score,
      p_entry,
      p_sl,
      p_tp,
      COALESCE(p_lot_size, 0.01),
      p_timeframe,
      'EUR/USD',
      COALESCE(p_modules, ARRAY[]::TEXT[]),
      COALESCE(p_modular_ids, ARRAY[]::UUID[]),
      COALESCE(p_fusion_params, '{}'::JSONB),
      COALESCE(p_market_snapshot, '{}'::JSONB),
      signal_hash_val,
      'bayesian_fusion_v2',
      'pending'
    )
    RETURNING id INTO new_signal_id;

    -- Log successful insertion
    INSERT INTO signal_audit (
      signal_id, signal_table, analysis_id, action_type,
      new_values, system_component, timestamp
    ) VALUES (
      new_signal_id, 'master_signals', p_analysis_id, 'created',
      jsonb_build_object(
        'signal_type', p_signal_type,
        'confidence', p_confidence,
        'entry', p_entry
      ),
      'insert_master_signal_function',
      now()
    );

    RETURN new_signal_id;

  EXCEPTION 
    WHEN unique_violation THEN
      error_details := format('Duplicate signal: analysis_id=%s already exists', p_analysis_id);
      RAISE EXCEPTION '%', error_details;
    
    WHEN foreign_key_violation THEN
      error_details := format('Foreign key violation: Invalid reference in signal data');
      RAISE EXCEPTION '%', error_details;
    
    WHEN check_violation THEN
      error_details := format('Check constraint violation: %', SQLERRM);
      RAISE EXCEPTION '%', error_details;
    
    WHEN OTHERS THEN
      error_details := format('INSERT failed: %s (SQLSTATE: %s)', SQLERRM, SQLSTATE);
      
      -- Log the error for debugging
      INSERT INTO signal_audit (
        signal_id, signal_table, analysis_id, action_type,
        old_values, system_component, timestamp
      ) VALUES (
        gen_random_uuid(), 'master_signals', p_analysis_id, 'error',
        jsonb_build_object(
          'error', error_details,
          'signal_type', p_signal_type,
          'confidence', p_confidence
        ),
        'insert_master_signal_function',
        now()
      );
      
      RAISE EXCEPTION '%', error_details;
  END;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION insert_master_signal TO service_role;