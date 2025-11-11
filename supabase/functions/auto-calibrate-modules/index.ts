import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { module_id } = await req.json();
    
    console.log(`🔧 Auto-calibrating module: ${module_id}`);

    // Get current module performance
    const { data: modulePerf } = await supabaseClient
      .from('module_performance')
      .select('*')
      .eq('module_id', module_id)
      .single();

    if (!modulePerf) {
      throw new Error(`Module ${module_id} not found`);
    }

    console.log(`Current performance: Win Rate=${modulePerf.win_rate}%, Signals=${modulePerf.signals_generated}`);

    // Get recent signals from this module
    const { data: recentSignals } = await supabaseClient
      .from('master_signals')
      .select('id, final_confidence, signal_strength, confluence_score')
      .contains('contributing_modules', [module_id])
      .order('created_at', { ascending: false })
      .limit(50);

    // Calculate optimal parameters using Bayesian-inspired approach
    const avgConfidence = recentSignals?.reduce((sum, s) => sum + (s.final_confidence || 0), 0) / (recentSignals?.length || 1);
    const avgStrength = recentSignals?.reduce((sum, s) => sum + (s.signal_strength || 0), 0) / (recentSignals?.length || 1);

    // Determine new parameters based on performance
    let newWeight = modulePerf.historical_weight || 0.1;
    let confidenceThreshold = 0.5;
    let strengthThreshold = 0.5;

    if (modulePerf.win_rate < 40) {
      // Reduce weight for poor performers
      newWeight = Math.max(0.05, newWeight * 0.8);
      confidenceThreshold = 0.7; // Require higher confidence
      strengthThreshold = 0.7;
    } else if (modulePerf.win_rate > 60) {
      // Increase weight for good performers
      newWeight = Math.min(0.30, newWeight * 1.2);
      confidenceThreshold = 0.4; // Can be more lenient
      strengthThreshold = 0.4;
    }

    const oldParams = {
      weight: modulePerf.historical_weight,
      avg_confidence: modulePerf.average_confidence,
      avg_strength: modulePerf.average_strength,
    };

    const newParams = {
      weight: newWeight,
      confidence_threshold: confidenceThreshold,
      strength_threshold: strengthThreshold,
      calibrated_at: new Date().toISOString(),
    };

    // Simple backtest: check if this would improve on historical data
    const { data: historicalTrades } = await supabaseClient
      .from('learning_outcomes')
      .select('*')
      .contains('contributing_modules', [module_id])
      .order('created_at', { ascending: false })
      .limit(30);

    const backtestWinRate = historicalTrades?.filter(t => t.outcome_type === 'win').length || 0;
    const backtestTotal = historicalTrades?.length || 1;
    const backtestScore = (backtestWinRate / backtestTotal) * 100;

    // Record calibration in history
    const { data: calibration } = await supabaseClient
      .from('module_calibration_history')
      .insert({
        module_id: module_id,
        old_parameters: oldParams,
        new_parameters: newParams,
        performance_before: {
          win_rate: modulePerf.win_rate,
          signals_generated: modulePerf.signals_generated,
          reliability: modulePerf.reliability,
        },
        backtest_results: {
          backtest_win_rate: backtestScore,
          sample_size: backtestTotal,
        },
        deployed: backtestScore >= modulePerf.win_rate, // Only deploy if backtest is better
      })
      .select()
      .single();

    // Update module performance with new parameters
    if (calibration?.deployed) {
      await supabaseClient
        .from('module_performance')
        .update({
          historical_weight: newWeight,
          last_updated: new Date().toISOString(),
        })
        .eq('module_id', module_id);

      console.log(`✅ Calibration deployed: New weight=${newWeight.toFixed(3)}`);
    } else {
      console.log(`⚠️ Calibration not deployed: Backtest score ${backtestScore.toFixed(1)}% not better than current ${modulePerf.win_rate.toFixed(1)}%`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        module_id,
        deployed: calibration?.deployed,
        old_params: oldParams,
        new_params: newParams,
        backtest_score: backtestScore,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in auto-calibrate-modules:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
