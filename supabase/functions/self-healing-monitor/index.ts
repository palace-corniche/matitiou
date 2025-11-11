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

    console.log('🏥 Self-Healing Monitor Starting...');

    const issues = [];
    const healingActions = [];

    // CHECK 1: Signal generation health
    const { data: recentSignals } = await supabaseClient
      .from('master_signals')
      .select('id')
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()); // Last 2 hours

    const signalCount = recentSignals?.length || 0;
    
    if (signalCount === 0) {
      issues.push('No signals generated in last 2 hours');
      console.log('⚠️ ISSUE: No signals in 2 hours, relaxing thresholds');

      // Healing action: Relax thresholds by 20%
      const { data: relaxResult } = await supabaseClient.functions.invoke('manage-adaptive-thresholds', {
        body: {
          action: 'adjust',
          adjustment: {
            type: 'relax',
            intensity: 0.20,
            reason: 'Self-healing: No signals for 2 hours'
          }
        }
      });

      healingActions.push({
        issue: 'no_signals_2h',
        action: 'relax_thresholds',
        success: relaxResult?.success || false,
      });
    }

    // CHECK 2: Market data freshness
    const { data: latestTick } = await supabaseClient
      .from('tick_data')
      .select('timestamp')
      .eq('symbol', 'EUR/USD')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (latestTick) {
      const tickAge = Date.now() - new Date(latestTick.timestamp).getTime();
      const tickAgeMinutes = tickAge / 60000;

      if (tickAgeMinutes > 30) {
        issues.push(`Market data stale: ${tickAgeMinutes.toFixed(1)} minutes old`);
        console.log('⚠️ ISSUE: Stale market data');

        // Healing action: Trigger market data refresh
        const { error: refreshError } = await supabaseClient.functions.invoke('real-time-tick-engine', {
          body: { force_refresh: true }
        });

        healingActions.push({
          issue: 'stale_market_data',
          action: 'trigger_data_refresh',
          success: !refreshError,
        });
      }
    }

    // CHECK 3: Open trades health check
    const { data: openTrades } = await supabaseClient
      .from('shadow_trades')
      .select('id, entry_time, unrealized_pnl')
      .eq('status', 'open');

    const stuckTrades = openTrades?.filter(t => {
      const ageHours = (Date.now() - new Date(t.entry_time).getTime()) / (1000 * 60 * 60);
      return ageHours > 48; // Trades open > 48 hours
    }) || [];

    if (stuckTrades.length > 0) {
      issues.push(`${stuckTrades.length} trades open > 48 hours`);
      console.log(`⚠️ ISSUE: ${stuckTrades.length} potentially stuck trades`);

      // Log for manual review but don't auto-close (too risky)
      healingActions.push({
        issue: 'stuck_trades',
        action: 'flagged_for_review',
        success: true,
        metadata: { trade_count: stuckTrades.length },
      });
    }

    // CHECK 4: Module performance degradation
    const { data: modules } = await supabaseClient
      .from('module_performance')
      .select('module_id, win_rate, reliability')
      .eq('status', 'active');

    const degradedModules = modules?.filter(m => 
      m.reliability < 0.3 || m.win_rate < 30
    ) || [];

    if (degradedModules.length > 0) {
      issues.push(`${degradedModules.length} modules underperforming`);
      console.log(`⚠️ ISSUE: ${degradedModules.length} degraded modules`);

      // Healing action: Reduce weight for degraded modules
      for (const module of degradedModules) {
        await supabaseClient
          .from('module_performance')
          .update({
            historical_weight: Math.max(0.05, (module.reliability || 0.1) * 0.5),
            status: 'degraded',
          })
          .eq('module_id', module.module_id);
      }

      healingActions.push({
        issue: 'degraded_modules',
        action: 'reduce_module_weights',
        success: true,
        metadata: { modules: degradedModules.map(m => m.module_id) },
      });
    }

    // CHECK 5: ML model performance
    const { data: latestModel } = await supabaseClient
      .from('ml_exit_models')
      .select('*')
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (latestModel) {
      const modelAge = Date.now() - new Date(latestModel.created_at).getTime();
      const modelAgeDays = modelAge / (1000 * 60 * 60 * 24);

      if (modelAgeDays > 10) {
        issues.push(`ML model is ${modelAgeDays.toFixed(1)} days old`);
        console.log('⚠️ ISSUE: Stale ML model');

        // Healing action: Trigger retraining
        const { data: retrainResult } = await supabaseClient.functions.invoke('train-exit-model', {
          body: { force_retrain: true, reason: 'model_stale' }
        });

        healingActions.push({
          issue: 'stale_ml_model',
          action: 'retrain_model',
          success: retrainResult?.success || false,
        });
      }
    }

    // CHECK 6: System error rate
    const { data: recentErrors } = await supabaseClient
      .from('system_health')
      .select('id')
      .eq('status', 'error')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

    const errorCount = recentErrors?.length || 0;
    
    if (errorCount > 5) {
      issues.push(`High error rate: ${errorCount} errors in last hour`);
      console.log(`⚠️ ISSUE: High error rate (${errorCount})`);

      healingActions.push({
        issue: 'high_error_rate',
        action: 'alert_admin',
        success: true,
        metadata: { error_count: errorCount },
      });
    }

    // Save healing actions
    if (healingActions.length > 0) {
      await supabaseClient
        .from('learning_actions')
        .insert(healingActions.map(action => ({
          action_type: 'self_heal',
          trigger_reason: action.issue,
          metadata: action.metadata || { action: action.action },
          success: action.success,
        })));
    }

    // Log system health check
    await supabaseClient
      .from('system_health')
      .insert({
        component: 'self_healing_monitor',
        status: issues.length === 0 ? 'healthy' : 'warning',
        message: issues.length === 0 ? 'All systems healthy' : `${issues.length} issues detected`,
        metadata: {
          issues: issues,
          healing_actions: healingActions.length,
          signal_count: signalCount,
        },
      });

    const status = issues.length === 0 ? 'healthy' : 'issues_detected';
    console.log(`✅ Self-healing check complete: ${status} (${healingActions.length} actions taken)`);

    return new Response(
      JSON.stringify({
        success: true,
        status: status,
        issues_found: issues.length,
        healing_actions_taken: healingActions.length,
        issues: issues,
        actions: healingActions,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in self-healing-monitor:', error);
    
    // Try to log the error
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabaseClient
        .from('system_health')
        .insert({
          component: 'self_healing_monitor',
          status: 'error',
          message: error.message,
        });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
