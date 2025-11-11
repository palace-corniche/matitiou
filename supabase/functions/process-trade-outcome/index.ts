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

    const { trade_id } = await req.json();
    
    console.log(`🧠 Processing trade outcome for trade: ${trade_id}`);

    // Get trade details
    const { data: trade, error: tradeError } = await supabaseClient
      .from('shadow_trades')
      .select('*')
      .eq('id', trade_id)
      .single();
    
    if (tradeError || !trade) {
      throw new Error(`Failed to fetch trade: ${tradeError?.message}`);
    }

    // Get signal info separately
    const { data: signal } = await supabaseClient
      .from('master_signals')
      .select('id, final_confidence, confluence_score, signal_strength, market_regime, contributing_modules')
      .eq('id', trade.signal_id)
      .single();


    // Calculate learned features
    const holdingMinutes = trade.exit_time && trade.entry_time
      ? (new Date(trade.exit_time).getTime() - new Date(trade.entry_time).getTime()) / 60000
      : 0;

    const entryAccuracy = trade.entry_price && trade.exit_price
      ? Math.abs((trade.exit_price - trade.entry_price) / trade.entry_price * 100)
      : 0;

    const learnedFeatures = {
      entry_price: trade.entry_price,
      exit_price: trade.exit_price,
      lot_size: trade.lot_size,
      stop_loss: trade.stop_loss,
      take_profit: trade.take_profit,
      break_even_triggered: trade.break_even_triggered,
      trailing_stop_triggered: trade.trailing_stop_triggered,
      exit_intelligence_score: trade.exit_intelligence_score,
      holding_minutes: holdingMinutes,
      entry_hour: new Date(trade.entry_time).getUTCHours(),
      exit_hour: trade.exit_time ? new Date(trade.exit_time).getUTCHours() : null,
    };

    // Update or create learning outcome
    // First check if outcome already exists
    const { data: existingOutcome } = await supabaseClient
      .from('learning_outcomes')
      .select('id')
      .eq('trade_id', trade.id)
      .single();

    let outcome;
    if (existingOutcome) {
      // Update existing outcome
      const { data: updated, error: updateError } = await supabaseClient
        .from('learning_outcomes')
        .update({
          signal_id: trade.signal_id,
          outcome_type: trade.pnl > 1 ? 'win' : trade.pnl < -1 ? 'loss' : 'breakeven',
          pnl: trade.pnl || 0,
          profit_pips: trade.profit_pips || 0,
          holding_time_minutes: holdingMinutes,
          signal_quality: trade.exit_intelligence_score,
          confluence_score: signal?.confluence_score || 0,
          entry_accuracy: entryAccuracy,
          exit_timing_score: trade.exit_intelligence_score,
          market_regime: signal?.market_regime || 'unknown',
          contributing_modules: signal?.contributing_modules || [],
          learned_features: learnedFeatures,
          processed: true,
        })
        .eq('id', existingOutcome.id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update learning outcome:', updateError);
      } else {
        outcome = updated;
      }
    } else {
      // Create new outcome
      const { data: created, error: createError } = await supabaseClient
        .from('learning_outcomes')
        .insert({
          trade_id: trade.id,
          signal_id: trade.signal_id,
          outcome_type: trade.pnl > 1 ? 'win' : trade.pnl < -1 ? 'loss' : 'breakeven',
          pnl: trade.pnl || 0,
          profit_pips: trade.profit_pips || 0,
          holding_time_minutes: holdingMinutes,
          signal_quality: trade.exit_intelligence_score,
          confluence_score: signal?.confluence_score || 0,
          entry_accuracy: entryAccuracy,
          exit_timing_score: trade.exit_intelligence_score,
          market_regime: signal?.market_regime || 'unknown',
          contributing_modules: signal?.contributing_modules || [],
          learned_features: learnedFeatures,
          processed: true,
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create learning outcome:', createError);
      } else {
        outcome = created;
      }
    }

    // Update module performance based on outcome
    if (signal?.contributing_modules && Array.isArray(signal.contributing_modules)) {
      const modules = signal.contributing_modules as string[];
      const wasSuccessful = trade.pnl > 0;
      
      for (const moduleId of modules) {
        await supabaseClient.rpc('update_module_performance_from_trade', {
          p_module_id: moduleId,
          p_signal_successful: wasSuccessful,
          p_confidence: signal.final_confidence || 0,
          p_strength: signal.signal_strength || 0,
          p_return: trade.pnl || 0,
        }).catch(err => {
          console.error(`Failed to update module ${moduleId}:`, err);
        });
      }
    }

    // Trigger pattern discovery if this was a winning trade
    if (trade.pnl > 5) {
      console.log('🎯 High-profit trade detected, triggering pattern discovery');
      // Pattern discovery will run on its own schedule, just log for now
    }

    console.log(`✅ Trade outcome processed: ${outcome?.outcome_type} ($${trade.pnl})`);

    return new Response(
      JSON.stringify({
        success: true,
        outcome: outcome,
        modules_updated: signal?.contributing_modules?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in process-trade-outcome:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
