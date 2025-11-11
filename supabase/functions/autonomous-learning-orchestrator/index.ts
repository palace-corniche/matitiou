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

    console.log('🎯 Autonomous Learning Orchestrator Starting...');

    // Get recent performance metrics
    const { data: recentTrades } = await supabaseClient
      .from('shadow_trades')
      .select('pnl, profit_pips, status, exit_time')
      .eq('status', 'closed')
      .gte('exit_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('exit_time', { ascending: false });

    const totalTrades = recentTrades?.length || 0;
    const winningTrades = recentTrades?.filter(t => t.pnl > 0).length || 0;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgPnl = totalTrades > 0 ? recentTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / totalTrades : 0;
    
    // Get global account for drawdown check
    const { data: account } = await supabaseClient
      .from('global_trading_account')
      .select('balance, current_drawdown')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    const currentDrawdown = account?.current_drawdown || 0;

    console.log(`📊 Performance: Win Rate=${winRate.toFixed(1)}%, Avg P&L=$${avgPnl.toFixed(2)}, Drawdown=${currentDrawdown.toFixed(1)}%`);

    const actions = [];

    // DECISION MATRIX: Trigger learning actions based on performance

    // 1. Win rate too low → Retrain ML model + Tighten thresholds
    if (winRate < 45 && totalTrades >= 10) {
      console.log('⚠️ Low win rate detected, triggering ML retraining');
      
      // Trigger ML model retraining
      const { data: mlResult } = await supabaseClient.functions.invoke('train-exit-model', {
        body: { force_retrain: true, reason: 'low_win_rate' }
      });

      // Tighten thresholds
      const { data: thresholdResult } = await supabaseClient.functions.invoke('manage-adaptive-thresholds', {
        body: {
          action: 'adjust',
          adjustment: {
            type: 'tighten',
            intensity: 0.15,
            reason: `Win rate too low: ${winRate.toFixed(1)}%`
          }
        }
      });

      actions.push({
        action_type: 'retrain_model',
        trigger_reason: `Win rate below 45%: ${winRate.toFixed(1)}%`,
        success: mlResult?.success || false,
      });

      actions.push({
        action_type: 'adjust_threshold',
        trigger_reason: `Tightening due to low win rate`,
        success: thresholdResult?.success || false,
      });
    }

    // 2. Win rate good but low signal count → Relax thresholds
    const { data: recentSignals } = await supabaseClient
      .from('master_signals')
      .select('id')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const signalCount = recentSignals?.length || 0;
    
    if (winRate >= 50 && signalCount < 5) {
      console.log('📈 Good win rate but low signals, relaxing thresholds');
      
      const { data: thresholdResult } = await supabaseClient.functions.invoke('manage-adaptive-thresholds', {
        body: {
          action: 'adjust',
          adjustment: {
            type: 'relax',
            intensity: 0.10,
            reason: `Good win rate (${winRate.toFixed(1)}%) but only ${signalCount} signals in 24h`
          }
        }
      });

      actions.push({
        action_type: 'adjust_threshold',
        trigger_reason: `Relax thresholds: good performance, low signal count`,
        success: thresholdResult?.success || false,
      });
    }

    // 3. High drawdown → Reduce risk + Increase quality threshold
    if (currentDrawdown > 15) {
      console.log('🚨 High drawdown detected, reducing risk');
      
      // Update account defaults to reduce lot size
      const { data: currentDefaults } = await supabaseClient
        .from('account_defaults')
        .select('*')
        .is('portfolio_id', null)
        .single();

      if (currentDefaults) {
        await supabaseClient
          .from('account_defaults')
          .update({
            default_lot_size: Math.max(0.01, (currentDefaults.default_lot_size || 0.01) * 0.8),
            min_signal_quality: Math.min(90, (currentDefaults.min_signal_quality || 60) + 10),
          })
          .eq('id', currentDefaults.id);

        actions.push({
          action_type: 'self_heal',
          trigger_reason: `High drawdown: ${currentDrawdown.toFixed(1)}%`,
          parameters_before: { 
            lot_size: currentDefaults.default_lot_size,
            min_quality: currentDefaults.min_signal_quality
          },
          success: true,
        });
      }
    }

    // 4. Check module performance and trigger calibration
    const { data: modules } = await supabaseClient
      .from('module_performance')
      .select('module_id, win_rate, signals_generated')
      .gte('signals_generated', 10);

    const underperformingModules = modules?.filter(m => m.win_rate < 40) || [];
    
    if (underperformingModules.length > 0) {
      console.log(`🔧 ${underperformingModules.length} underperforming modules, triggering calibration`);
      
      for (const module of underperformingModules.slice(0, 3)) { // Calibrate max 3 at a time
        const { data: calibResult } = await supabaseClient.functions.invoke('auto-calibrate-modules', {
          body: { module_id: module.module_id }
        });

        actions.push({
          action_type: 'recalibrate_module',
          trigger_reason: `Module ${module.module_id} win rate: ${module.win_rate.toFixed(1)}%`,
          success: calibResult?.success || false,
        });
      }
    }

    // 5. Trigger pattern discovery if we have enough winning trades
    const recentWins = recentTrades?.filter(t => t.pnl > 5) || [];
    if (recentWins.length >= 5) {
      console.log('🎯 Triggering pattern discovery');
      
      const { data: patternResult } = await supabaseClient.functions.invoke('discover-winning-patterns', {
        body: { trade_count: recentWins.length }
      });

      if (patternResult?.patterns_discovered > 0) {
        actions.push({
          action_type: 'discover_pattern',
          trigger_reason: `${recentWins.length} recent wins available for analysis`,
          success: true,
          metadata: { patterns_found: patternResult.patterns_discovered }
        });
      }
    }

    // Save all learning actions
    if (actions.length > 0) {
      await supabaseClient
        .from('learning_actions')
        .insert(actions.map(a => ({
          ...a,
          parameters_before: a.parameters_before || {},
          parameters_after: a.parameters_after || {},
        })));
    }

    // Update system learning stats
    await supabaseClient.rpc('update_system_learning_stats');

    console.log(`✅ Orchestrator completed: ${actions.length} actions taken`);

    return new Response(
      JSON.stringify({
        success: true,
        actions_taken: actions.length,
        performance: { winRate, totalTrades, currentDrawdown, signalCount },
        actions: actions.map(a => a.action_type),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in autonomous-learning-orchestrator:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
