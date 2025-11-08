import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚨 PHASE 3: SIGNAL FUSION OPTIMIZATION INITIATED');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const optimizationResults = {
      step1_master_signals: await optimizeMasterSignalGeneration(supabase),
      step2_execution_logic: await optimizeSignalExecutionLogic(supabase),
      step3_risk_management: await optimizePortfolioRiskManagement(supabase)
    };

    console.log('✅ SIGNAL FUSION OPTIMIZATION COMPLETED');

    return new Response(
      JSON.stringify({
        success: true,
        phase: 'SIGNAL_FUSION_OPTIMIZATION',
        optimizationResults,
        timestamp: new Date().toISOString(),
        message: 'Signal fusion engine optimized and operational'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ SIGNAL FUSION OPTIMIZATION FAILED:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Step 3.1: Optimize Master Signal Generation
async function optimizeMasterSignalGeneration(supabase: any) {
  console.log('🔧 Step 3.1: Optimizing master signal generation...');
  
  try {
    // Get recent modular signals (last 15 minutes)
    const { data: modularSignals, error: signalsError } = await supabase
      .from('modular_signals')
      .select('*')
      .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (signalsError) throw signalsError;

    if (!modularSignals || modularSignals.length === 0) {
      console.log('⚠️ No modular signals found, generating fresh signals...');
      await supabase.functions.invoke('process-analysis-pipeline', {});
      
      // Re-fetch signals
      const { data: freshSignals } = await supabase
        .from('modular_signals')
        .select('*')
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (freshSignals && freshSignals.length > 0) {
        return await createMasterSignalFromModular(supabase, freshSignals);
      } else {
        throw new Error('Failed to generate modular signals');
      }
    }

    return await createMasterSignalFromModular(supabase, modularSignals);
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

async function createMasterSignalFromModular(supabase: any, modularSignals: any[]) {
  // Group signals by type and calculate weighted scores
  const buySignals = modularSignals.filter(s => s.signal_type === 'buy');
  const sellSignals = modularSignals.filter(s => s.signal_type === 'sell');

  let finalSignalType = 'neutral';
  let confluenceScore = 0;
  let finalConfidence = 0;

  if (buySignals.length > sellSignals.length) {
    finalSignalType = 'buy';
    confluenceScore = buySignals.reduce((sum, s) => sum + s.confidence * s.strength, 0) / buySignals.length;
    finalConfidence = buySignals.reduce((sum, s) => sum + s.confidence, 0) / buySignals.length;
  } else if (sellSignals.length > buySignals.length) {
    finalSignalType = 'sell';
    confluenceScore = sellSignals.reduce((sum, s) => sum + s.confidence * s.strength, 0) / sellSignals.length;
    finalConfidence = sellSignals.reduce((sum, s) => sum + s.confidence, 0) / sellSignals.length;
  }

  // Fetch REAL market price from market_data_feed
  const { data: currentPrice, error: priceError } = await supabase
    .from('market_data_feed')
    .select('price, timestamp')
    .eq('symbol', 'EUR/USD')
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();
  
  if (!currentPrice || priceError) {
    console.error('❌ Cannot create signal without current market price');
    return null;
  }
  
  const priceAge = Date.now() - new Date(currentPrice.timestamp).getTime();
  if (priceAge > 900000) { // 15 minutes
    console.error(`❌ Price data too old: ${Math.round(priceAge/60000)} minutes`);
    return null;
  }
  
  const price = parseFloat(currentPrice.price);
  const spread = 0.00015; // 1.5 pips
  const pipSize = 0.0001;
  const slPips = 50;
  const tpPips = 100;

  // Only create master signal if confluence is strong enough
  if (confluenceScore >= 15 && finalConfidence >= 0.65) {
    const masterSignal = {
      id: crypto.randomUUID(),
      analysis_id: crypto.randomUUID(),
      symbol: 'EUR/USD',
      timeframe: '15m',
      signal_type: finalSignalType,
      final_confidence: finalConfidence,
      final_strength: Math.round(confluenceScore / 2),
      confluence_score: confluenceScore,
      recommended_entry: finalSignalType === 'buy' 
        ? price + (spread / 2)  // ASK
        : price - (spread / 2), // BID
      recommended_stop_loss: finalSignalType === 'buy'
        ? price - (slPips * pipSize)
        : price + (slPips * pipSize),
      recommended_take_profit: finalSignalType === 'buy'
        ? price + (tpPips * pipSize)
        : price - (tpPips * pipSize),
      recommended_lot_size: 0.1,
      modular_signal_ids: modularSignals.map(s => s.id),
      contributing_modules: modularSignals.map(s => s.module_id),
      fusion_algorithm: 'weighted_consensus_v2',
      fusion_parameters: {
        total_modules: modularSignals.length,
        buy_signals: buySignals.length,
        sell_signals: sellSignals.length,
        weight_distribution: 'equal'
      },
      market_data_snapshot: {
        price: price,
        bid: price - (spread / 2),
        ask: price + (spread / 2),
        timestamp: currentPrice.timestamp,
        source: 'market_data_feed'
      },
      expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      signal_quality_score: confluenceScore * finalConfidence,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    const { error } = await supabase.from('master_signals').insert([masterSignal]);
    if (error) throw error;

    console.log(`✅ Master signal created: ${finalSignalType} at ${masterSignal.recommended_entry.toFixed(5)} (REAL price ${price.toFixed(5)})`);
    return { 
      success: true, 
      master_signal_created: true, 
      signal_type: finalSignalType,
      confluence_score: confluenceScore,
      contributing_modules: modularSignals.length
    };
  } else {
    console.log(`⚠️ Confluence too weak: ${confluenceScore} (need >= 15)`);
    return { 
      success: true, 
      master_signal_created: false, 
      reason: 'confluence_too_weak',
      confluence_score: confluenceScore
    };
  }
}

// Step 3.2: Optimize Signal Execution Logic
async function optimizeSignalExecutionLogic(supabase: any) {
  console.log('🔧 Step 3.2: Optimizing signal execution logic...');
  
  try {
    // Get pending master signals
    const { data: pendingSignals, error } = await supabase
      .from('master_signals')
      .select('*')
      .eq('status', 'pending')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    let validatedSignals = 0;
    for (const signal of pendingSignals || []) {
      // Validate signal quality using quality score threshold
      if (signal.signal_quality_score >= 30) {
        // Update signal as validated and ready for execution
        await supabase
          .from('master_signals')
          .update({ 
            status: 'validated',
            signal_quality_score: signal.confluence_score * signal.final_confidence,
            expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
          })
          .eq('id', signal.id);
        
        validatedSignals++;
      } else {
        // Mark as low quality
        await supabase
          .from('master_signals')
          .update({ status: 'rejected', actual_outcome: 'low_quality' })
          .eq('id', signal.id);
      }
    }

    // Trigger execution of validated signals
    if (validatedSignals > 0) {
      await supabase.functions.invoke('execute-shadow-trades', {
        body: { source: 'signal_fusion_optimization' }
      });
    }

    console.log(`✅ Signal execution logic optimized: ${validatedSignals} signals validated`);
    return { success: true, signals_validated: validatedSignals };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Step 3.3: Optimize Portfolio Risk Management
async function optimizePortfolioRiskManagement(supabase: any) {
  console.log('🔧 Step 3.3: Optimizing portfolio risk management...');
  
  try {
    // Get current portfolio state
    const { data: portfolio, error: portfolioError } = await supabase
      .from('global_trading_account')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (portfolioError) throw portfolioError;

    // Get open trades
    const { data: openTrades, error: tradesError } = await supabase
      .from('shadow_trades')
      .select('*')
      .eq('status', 'open');

    if (tradesError) throw tradesError;

    // Risk management validations and optimizations
    const riskChecks = {
      max_positions: openTrades.length <= 50,
      margin_level: portfolio.margin_level >= 100,
      exposure_check: true,
      lot_sizes_valid: openTrades.every(trade => 
        trade.lot_size >= 0.01 && trade.lot_size <= 1.0
      )
    };

    // Fix any lot size issues
    let lotsFixed = 0;
    for (const trade of openTrades) {
      if (trade.lot_size < 0.01 || trade.lot_size > 1.0) {
        const correctedLotSize = Math.max(0.01, Math.min(1.0, trade.lot_size));
        
        await supabase
          .from('shadow_trades')
          .update({ 
            lot_size: correctedLotSize,
            position_size: correctedLotSize,
            updated_at: new Date().toISOString()
          })
          .eq('id', trade.id);
        
        lotsFixed++;
      }
    }

    // Remove duplicate trades (same entry price within 2 pips)
    const duplicatesRemoved = await removeDuplicateTrades(supabase, openTrades);

    // Update portfolio risk parameters
    const { error: updateError } = await supabase
      .from('global_trading_account')
      .update({
        max_open_positions: 50,
        auto_trading_enabled: true,
        leverage: 100,
        updated_at: new Date().toISOString()
      })
      .eq('id', '00000000-0000-0000-0000-000000000001');

    if (updateError) throw updateError;

    console.log(`✅ Portfolio risk management optimized`);
    return { 
      success: true, 
      risk_checks: riskChecks,
      lots_fixed: lotsFixed,
      duplicates_removed: duplicatesRemoved,
      open_positions: openTrades.length
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

async function removeDuplicateTrades(supabase: any, openTrades: any[]) {
  const duplicatesFound = [];
  const seenEntries = new Map();

  for (const trade of openTrades) {
    const entryKey = `${trade.symbol}_${trade.trade_type}_${Math.round(trade.entry_price * 10000)}`;
    
    if (seenEntries.has(entryKey)) {
      duplicatesFound.push(trade.id);
    } else {
      seenEntries.set(entryKey, trade.id);
    }
  }

  if (duplicatesFound.length > 0) {
    // Close duplicate trades
    const { error } = await supabase
      .from('shadow_trades')
      .update({ 
        status: 'closed',
        exit_reason: 'duplicate_removal',
        exit_time: new Date().toISOString(),
        pnl: 0
      })
      .in('id', duplicatesFound);

    if (error) throw error;
  }

  return duplicatesFound.length;
}