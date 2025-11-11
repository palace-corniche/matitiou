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

    console.log('🔗 Cross-Module Learning Engine Starting...');

    // Get all learning outcomes with module data
    const { data: outcomes } = await supabaseClient
      .from('learning_outcomes')
      .select('id, outcome_type, contributing_modules, pnl, profit_pips, confluence_score')
      .not('contributing_modules', 'is', null)
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

    if (!outcomes || outcomes.length < 10) {
      console.log('⚠️ Not enough data for cross-module learning');
      return new Response(
        JSON.stringify({ success: false, message: 'Insufficient data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing ${outcomes.length} outcomes for module synergies`);

    // Build module combination matrix
    const combinations: Record<string, { wins: number; losses: number; total_pips: number }> = {};

    for (const outcome of outcomes) {
      const modules = outcome.contributing_modules as string[];
      if (!modules || modules.length < 2) continue;

      // Sort for consistent key
      const key = modules.sort().join('+');
      
      if (!combinations[key]) {
        combinations[key] = { wins: 0, losses: 0, total_pips: 0 };
      }

      combinations[key].total_pips += outcome.profit_pips || 0;
      
      if (outcome.outcome_type === 'win') {
        combinations[key].wins++;
      } else if (outcome.outcome_type === 'loss') {
        combinations[key].losses++;
      }
    }

    // Find high-performing combinations
    const synergies = [];
    
    for (const [combo, stats] of Object.entries(combinations)) {
      const total = stats.wins + stats.losses;
      if (total < 5) continue; // Need at least 5 samples

      const winRate = (stats.wins / total) * 100;
      const avgPips = stats.total_pips / total;

      if (winRate >= 60) {
        synergies.push({
          combination: combo,
          win_rate: winRate,
          sample_size: total,
          avg_pips: avgPips,
          modules: combo.split('+'),
        });

        console.log(`🎯 Strong synergy found: ${combo} (${winRate.toFixed(1)}% WR, ${total} trades)`);
      }
    }

    // Update module weights based on synergies
    const weightUpdates = [];

    for (const synergy of synergies) {
      for (const moduleId of synergy.modules) {
        // Get current weight
        const { data: modulePerf } = await supabaseClient
          .from('module_performance')
          .select('historical_weight')
          .eq('module_id', moduleId)
          .single();

        const currentWeight = modulePerf?.historical_weight || 0.1;
        const boost = synergy.win_rate > 70 ? 1.15 : 1.10; // 10-15% boost
        const newWeight = Math.min(0.30, currentWeight * boost);

        weightUpdates.push({
          module_id: moduleId,
          old_weight: currentWeight,
          new_weight: newWeight,
          reason: `Strong synergy with ${synergy.combination}`,
        });

        // Update in database
        await supabaseClient
          .from('module_performance')
          .update({ historical_weight: newWeight })
          .eq('module_id', moduleId);
      }
    }

    // Store discovered synergies as patterns
    for (const synergy of synergies) {
      await supabaseClient
        .from('discovered_patterns')
        .insert({
          pattern_name: `Module Synergy: ${synergy.combination}`,
          pattern_type: 'module_synergy',
          pattern_rules: {
            modules: synergy.modules,
            required_all: true,
          },
          confidence: Math.min(95, synergy.win_rate + 10),
          win_rate: synergy.win_rate,
          sample_size: synergy.sample_size,
          avg_pips: synergy.avg_pips,
          deployed: synergy.win_rate >= 65,
        });
    }

    // Log learning action
    if (weightUpdates.length > 0) {
      await supabaseClient
        .from('learning_actions')
        .insert({
          action_type: 'update_weights',
          trigger_reason: `Cross-module synergies discovered: ${synergies.length} patterns`,
          metadata: { 
            synergies_found: synergies.length,
            weights_updated: weightUpdates.length,
          },
          success: true,
        });
    }

    console.log(`✅ Cross-module learning complete: ${synergies.length} synergies, ${weightUpdates.length} weights updated`);

    return new Response(
      JSON.stringify({
        success: true,
        synergies_discovered: synergies.length,
        weights_updated: weightUpdates.length,
        top_synergies: synergies.slice(0, 5),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in cross-module-learning:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
