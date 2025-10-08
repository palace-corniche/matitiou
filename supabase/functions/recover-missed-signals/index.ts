import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Starting signal recovery process...');

    // **PHASE 2: Fetch unexecuted signals from trading_signals (last 7 days)**
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: missedSignals, error: fetchError } = await supabase
      .from('trading_signals')
      .select('*')
      .eq('was_executed', false)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching missed signals:', fetchError);
      throw fetchError;
    }

    if (!missedSignals?.length) {
      console.log('✅ No missed signals to recover');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No missed signals found',
          recovered: 0,
          executionTimeMs: Date.now() - startTime
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Found ${missedSignals.length} unexecuted signals to evaluate`);

    // Get current market price for validation
    const { data: latestPrice } = await supabase
      .from('market_data_feed')
      .select('price')
      .eq('symbol', 'EUR/USD')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    const currentPrice = latestPrice?.price || 1.16500;
    console.log(`💹 Current market price: ${currentPrice}`);

    let recoveredCount = 0;
    let rejectedCount = 0;
    const recoveryResults = [];

    // Process each missed signal
    for (const signal of missedSignals) {
      try {
        // **Quality validation**
        const confluenceScore = signal.confluence_score || 0;
        const confidenceScore = signal.confidence_score || 0;
        
        if (confluenceScore < 15) {
          console.log(`⏭️ Skipping signal ${signal.id.slice(0, 8)} - low confluence (${confluenceScore})`);
          rejectedCount++;
          continue;
        }

        if (confidenceScore < 0.6) {
          console.log(`⏭️ Skipping signal ${signal.id.slice(0, 8)} - low confidence (${confidenceScore})`);
          rejectedCount++;
          continue;
        }

        // **Price deviation validation**
        const entryPrice = signal.entry_price || signal.trigger_price || currentPrice;
        const priceDeviation = Math.abs(entryPrice - currentPrice) / currentPrice * 100;

        if (priceDeviation > 0.5) {
          console.log(`⏭️ Skipping signal ${signal.id.slice(0, 8)} - price moved too much (${priceDeviation.toFixed(2)}%)`);
          rejectedCount++;
          continue;
        }

        // **Signal is valid - migrate to master_signals**
        const masterSignal = {
          symbol: signal.pair || 'EUR/USD',
          timeframe: signal.timeframe || '15m',
          signal_type: signal.signal_type,
          final_confidence: confidenceScore,
          final_strength: signal.strength || 5,
          confluence_score: confluenceScore,
          recommended_entry: entryPrice,
          recommended_stop_loss: signal.stop_loss || entryPrice * 0.98,
          recommended_take_profit: signal.take_profit || entryPrice * 1.02,
          recommended_lot_size: 0.01,
          status: 'pending',
          analysis_id: signal.analysis_id || crypto.randomUUID(),
          fusion_algorithm: 'recovery_pipeline',
          contributing_modules: ['recovery'],
          modular_signal_ids: [signal.id],
          market_regime: signal.market_regime || 'unknown',
          market_data_snapshot: signal.market_data_snapshot || {},
          fusion_parameters: {
            recovered_from: 'trading_signals',
            original_created_at: signal.created_at,
            recovery_timestamp: new Date().toISOString(),
            price_deviation_percent: priceDeviation
          },
          timestamp: new Date().toISOString()
        };

        const { data: insertedSignal, error: insertError } = await supabase
          .from('master_signals')
          .insert(masterSignal)
          .select()
          .single();

        if (insertError) {
          console.error(`❌ Failed to migrate signal ${signal.id.slice(0, 8)}:`, insertError);
          rejectedCount++;
          continue;
        }

        // Mark original signal as executed
        await supabase
          .from('trading_signals')
          .update({ 
            was_executed: true,
            notes: `Recovered to master_signals: ${insertedSignal.id}`
          })
          .eq('id', signal.id);

        console.log(`✅ Recovered signal ${signal.id.slice(0, 8)} → master_signals ${insertedSignal.id.slice(0, 8)}`);
        
        recoveredCount++;
        recoveryResults.push({
          original_id: signal.id,
          master_signal_id: insertedSignal.id,
          confluence: confluenceScore,
          confidence: confidenceScore,
          price_deviation: priceDeviation
        });

      } catch (signalError) {
        console.error(`❌ Error processing signal ${signal.id}:`, signalError);
        rejectedCount++;
      }
    }

    // Log to system health
    await supabase.from('system_health').insert({
      function_name: 'recover-missed-signals',
      execution_time_ms: Date.now() - startTime,
      status: 'success',
      processed_items: recoveredCount,
      metadata: {
        total_evaluated: missedSignals.length,
        recovered: recoveredCount,
        rejected: rejectedCount,
        current_price: currentPrice
      }
    });

    console.log(`🎉 Signal recovery completed: ${recoveredCount} recovered, ${rejectedCount} rejected`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Recovered ${recoveredCount} signals from ${missedSignals.length} candidates`,
        recovered: recoveredCount,
        rejected: rejectedCount,
        total_evaluated: missedSignals.length,
        recovery_details: recoveryResults,
        executionTimeMs: Date.now() - startTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in recover-missed-signals:', error);

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.from('system_health').insert({
        function_name: 'recover-missed-signals',
        execution_time_ms: Date.now() - startTime,
        status: 'error',
        error_message: (error as Error).message
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message,
        executionTimeMs: Date.now() - startTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
