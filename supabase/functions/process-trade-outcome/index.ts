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

    // 1. Get trade details
    const { data: trade, error: tradeError } = await supabaseClient
      .from('shadow_trades')
      .select('*')
      .eq('id', trade_id)
      .single();
    
    if (tradeError || !trade) {
      throw new Error(`Failed to fetch trade: ${tradeError?.message}`);
    }

    // 2. Get signal info
    const { data: signal } = await supabaseClient
      .from('master_signals')
      .select('id, final_confidence, confluence_score, signal_strength, market_regime, contributing_modules, signal_type, recommended_entry, recommended_stop_loss, recommended_take_profit, fusion_parameters')
      .eq('id', trade.signal_id)
      .single();

    // 3. Fetch the fusion record for detailed signal breakdown (the "WHY")
    let fusionDetails = null;
    if (signal?.id) {
      const { data: fusion } = await supabaseClient
        .from('master_signals_fusion')
        .select('contributing_signals, fusion_details, weights, input_signals, fusion_reasoning, market_conditions')
        .eq('master_signal_id', signal.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      fusionDetails = fusion;
    }

    // 4. Fetch individual modular signals that contributed to this master signal
    let moduleSignals: any[] = [];
    if (signal?.id) {
      const { data: modSignals } = await supabaseClient
        .from('modular_signals')
        .select('module_id, signal_type, confidence, strength, suggested_entry, suggested_stop_loss, suggested_take_profit')
        .eq('analysis_id', signal.id)
        .order('created_at', { ascending: false })
        .limit(20);
      moduleSignals = modSignals || [];
    }

    // 5. Calculate learned features
    const holdingMinutes = trade.exit_time && trade.entry_time
      ? (new Date(trade.exit_time).getTime() - new Date(trade.entry_time).getTime()) / 60000
      : 0;

    const wasWin = trade.pnl > 0;
    const actualDirection = trade.pnl > 0 
      ? trade.trade_type  // correct direction
      : (trade.trade_type === 'buy' ? 'sell' : 'buy'); // wrong direction

    // 6. Build per-module accuracy breakdown (the "WHY")
    const moduleBreakdown: Record<string, any> = {};
    for (const ms of moduleSignals) {
      const moduleVotedCorrectly = ms.signal_type === trade.trade_type ? wasWin : !wasWin;
      moduleBreakdown[ms.module_id] = {
        signal_direction: ms.signal_type,
        confidence: ms.confidence,
        strength: ms.strength,
        voted_correctly: moduleVotedCorrectly,
        agreed_with_trade: ms.signal_type === trade.trade_type,
      };
    }

    // 7. Loss analysis — categorize WHY the trade lost
    let lossAnalysis = null;
    if (trade.pnl < 0) {
      const priceMoveFromEntry = trade.trade_type === 'buy'
        ? (trade.exit_price - trade.entry_price) * 10000
        : (trade.entry_price - trade.exit_price) * 10000;

      // Check price at midpoint of trade to see if direction was ever right
      const slDistance = trade.stop_loss 
        ? Math.abs(trade.entry_price - trade.stop_loss) * 10000 
        : 0;
      const tpDistance = trade.take_profit
        ? Math.abs(trade.take_profit - trade.entry_price) * 10000
        : 0;

      let lossCategory = 'unknown';
      if (trade.exit_reason === 'stop_loss_hit') {
        // Was SL too tight? Check if TP was eventually reachable
        lossCategory = slDistance < 15 ? 'sl_too_tight' : 'wrong_direction';
      } else if (trade.exit_reason === 'max_hold_time_reached') {
        lossCategory = priceMoveFromEntry > -5 ? 'too_slow' : 'wrong_direction';
      } else if (trade.exit_reason === 'take_profit_hit') {
        lossCategory = 'unexpected'; // TP hit but still lost? Edge case
      } else {
        lossCategory = 'manual_or_intelligence_exit';
      }

      // Count how many modules agreed vs disagreed
      const agreeing = Object.values(moduleBreakdown).filter((m: any) => m.agreed_with_trade).length;
      const disagreeing = Object.values(moduleBreakdown).filter((m: any) => !m.agreed_with_trade).length;

      lossAnalysis = {
        category: lossCategory,
        pips_moved: priceMoveFromEntry,
        sl_distance_pips: slDistance,
        tp_distance_pips: tpDistance,
        exit_reason: trade.exit_reason,
        modules_agreeing: agreeing,
        modules_disagreeing: disagreeing,
        holding_minutes: holdingMinutes,
        was_direction_wrong: priceMoveFromEntry < -2,
        was_sl_too_tight: lossCategory === 'sl_too_tight',
        was_too_slow: lossCategory === 'too_slow',
      };

      console.log(`📉 Loss analysis: ${lossCategory} | ${priceMoveFromEntry.toFixed(1)} pips | ${agreeing} modules agreed, ${disagreeing} disagreed`);
    }

    // 8. Build comprehensive learned_features
    const learnedFeatures = {
      entry_price: trade.entry_price,
      exit_price: trade.exit_price,
      lot_size: trade.lot_size,
      stop_loss: trade.stop_loss,
      take_profit: trade.take_profit,
      exit_reason: trade.exit_reason,
      holding_minutes: holdingMinutes,
      entry_hour: new Date(trade.entry_time).getUTCHours(),
      exit_hour: trade.exit_time ? new Date(trade.exit_time).getUTCHours() : null,
      entry_day: new Date(trade.entry_time).getUTCDay(),
      // Signal breakdown — the "WHY"
      signal_breakdown: moduleBreakdown,
      fusion_weights: fusionDetails?.weights || {},
      fusion_reasoning: fusionDetails?.fusion_reasoning || '',
      market_conditions: fusionDetails?.market_conditions || {},
      // Loss-specific analysis
      loss_analysis: lossAnalysis,
    };

    // 9. Upsert learning outcome
    const outcomeType = trade.pnl > 1 ? 'win' : trade.pnl < -1 ? 'loss' : 'breakeven';
    
    const { data: existingOutcome } = await supabaseClient
      .from('learning_outcomes')
      .select('id')
      .eq('trade_id', trade.id)
      .single();

    const outcomeData = {
      signal_id: trade.signal_id,
      outcome_type: outcomeType,
      pnl: trade.pnl || 0,
      profit_pips: trade.profit_pips || 0,
      holding_time_minutes: holdingMinutes,
      signal_quality: trade.exit_intelligence_score,
      confluence_score: signal?.confluence_score || 0,
      entry_accuracy: Math.abs((trade.exit_price - trade.entry_price) / trade.entry_price * 100),
      exit_timing_score: trade.exit_intelligence_score,
      market_regime: signal?.market_regime || 'unknown',
      contributing_modules: signal?.contributing_modules || [],
      learned_features: learnedFeatures,
      processed: true,
    };

    let outcome;
    if (existingOutcome) {
      const { data: updated, error: updateError } = await supabaseClient
        .from('learning_outcomes')
        .update(outcomeData)
        .eq('id', existingOutcome.id)
        .select()
        .single();
      if (updateError) console.error('Failed to update learning outcome:', updateError);
      else outcome = updated;
    } else {
      const { data: created, error: createError } = await supabaseClient
        .from('learning_outcomes')
        .insert({ trade_id: trade.id, ...outcomeData })
        .select()
        .single();
      if (createError) console.error('Failed to create learning outcome:', createError);
      else outcome = created;
    }

    // 10. Update module performance for EACH contributing module
    if (signal?.contributing_modules && Array.isArray(signal.contributing_modules)) {
      const modules = signal.contributing_modules as string[];
      
      for (const moduleId of modules) {
        // Use the per-module accuracy we calculated
        const moduleData = moduleBreakdown[moduleId];
        const moduleWasCorrect = moduleData?.voted_correctly ?? wasWin;
        
        const { error: updateError } = await supabaseClient.rpc('update_module_performance_from_trade', {
          p_module_id: moduleId,
          p_signal_successful: moduleWasCorrect,
          p_confidence: signal.final_confidence || 0,
          p_strength: signal.signal_strength || 0,
          p_return: trade.pnl || 0,
        });
        
        if (updateError) {
          console.error(`Failed to update module ${moduleId}:`, updateError);
        } else {
          console.log(`📊 Module ${moduleId}: ${moduleWasCorrect ? '✅ correct' : '❌ wrong'}`);
        }
      }
    }

    // 11. Trigger pattern discovery for high-profit trades
    if (trade.pnl > 5) {
      console.log('🎯 High-profit trade detected, will be picked up by pattern discovery');
    }

    console.log(`✅ Trade outcome processed: ${outcomeType} ($${trade.pnl?.toFixed(2)}) | ${Object.keys(moduleBreakdown).length} modules analyzed`);

    return new Response(
      JSON.stringify({
        success: true,
        outcome_type: outcomeType,
        pnl: trade.pnl,
        modules_analyzed: Object.keys(moduleBreakdown).length,
        loss_category: lossAnalysis?.category || null,
        modules_updated: signal?.contributing_modules?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in process-trade-outcome:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
