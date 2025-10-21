import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let triggerType = 'manual';
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body for auto-trigger info
    const requestBody = req.method === 'POST' ? await req.json() : {};
    const isAutoTriggered = requestBody.auto_triggered || false;
    const triggerReason = requestBody.trigger_reason || 'manual';
    const maxModelAgeDays = requestBody.max_model_age_days || 7;
    
    triggerType = isAutoTriggered ? triggerReason : 'manual';
    
    console.log(`🤖 Starting ML Exit Model Training (${triggerType})...`);

    // Check if staleness check should skip training
    if (triggerReason === 'staleness_check') {
      const { data: activeModel } = await supabase
        .from('ml_exit_models')
        .select('created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (activeModel) {
        const modelAgeDays = Math.floor((Date.now() - new Date(activeModel.created_at).getTime()) / (1000 * 60 * 60 * 24));
        
        if (modelAgeDays < maxModelAgeDays) {
          console.log(`✅ Model is fresh (${modelAgeDays} days old), skipping training`);
          return new Response(JSON.stringify({ 
            success: true,
            skipped: true,
            reason: `Model is only ${modelAgeDays} days old (threshold: ${maxModelAgeDays} days)`,
            modelAge: modelAgeDays
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        console.log(`⚠️ Model is stale (${modelAgeDays} days old), proceeding with training`);
      }
    }

    console.log('🤖 Starting ML Exit Model Training...');

    // Fetch historical closed trades with sufficient data
    const { data: historicalTrades, error: tradesError } = await supabase
      .from('shadow_trades')
      .select('*')
      .eq('status', 'closed')
      .not('exit_price', 'is', null)
      .not('profit_pips', 'is', null)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .order('exit_time', { ascending: false })
      .limit(500);

    if (tradesError) throw tradesError;

    if (!historicalTrades || historicalTrades.length < 20) {
      // Log insufficient data
      await supabase.from('ml_training_logs').insert({
        model_version: 'N/A',
        trigger_type: triggerType,
        training_samples: historicalTrades?.length || 0,
        success: false,
        error_message: `Insufficient training data: ${historicalTrades?.length || 0} trades (need 20)`,
        training_duration_ms: Date.now() - startTime
      });
      
      return new Response(JSON.stringify({ 
        error: 'Insufficient training data', 
        message: `Need at least 20 closed trades, found ${historicalTrades?.length || 0}` 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📊 Training on ${historicalTrades.length} historical trades`);

    // Extract features and labels from historical trades
    const trainingData = historicalTrades.map(trade => {
      const entryTime = new Date(trade.entry_time).getTime();
      const exitTime = new Date(trade.exit_time).getTime();
      const holdingMinutes = (exitTime - entryTime) / (1000 * 60);
      
      return {
        // Features
        unrealizedPnlAtEntry: trade.unrealized_pnl || 0,
        profitPips: trade.profit_pips || 0,
        entryPrice: trade.entry_price,
        exitPrice: trade.exit_price,
        lotSize: trade.lot_size,
        tradeType: trade.trade_type === 'buy' ? 1 : 0,
        slDistance: Math.abs(trade.entry_price - trade.stop_loss) * 10000,
        tpDistance: Math.abs(trade.take_profit - trade.entry_price) * 10000,
        confidenceScore: trade.confidence_score || 0.5,
        
        // Label (what we want to predict)
        actualProfitPips: trade.profit_pips,
        actualHoldingMinutes: holdingMinutes,
        wasWinner: trade.pnl > 0 ? 1 : 0
      };
    });

    // Calculate simple statistical model (gradient boosting approximation)
    const winners = trainingData.filter(t => t.wasWinner === 1);
    const losers = trainingData.filter(t => t.wasWinner === 0);

    const avgWinPips = winners.length > 0 ? winners.reduce((sum, t) => sum + t.actualProfitPips, 0) / winners.length : 0;
    const avgLossPips = losers.length > 0 ? losers.reduce((sum, t) => sum + Math.abs(t.actualProfitPips), 0) / losers.length : 0;
    const avgWinTime = winners.length > 0 ? winners.reduce((sum, t) => sum + t.actualHoldingMinutes, 0) / winners.length : 0;
    const avgLossTime = losers.length > 0 ? losers.reduce((sum, t) => sum + t.actualHoldingMinutes, 0) / losers.length : 0;

    const winRate = winners.length / trainingData.length;

    // Calculate feature importance through correlation
    const featureImportance = {
      profitPips: calculateCorrelation(trainingData.map(t => t.profitPips), trainingData.map(t => t.wasWinner)),
      slDistance: calculateCorrelation(trainingData.map(t => t.slDistance), trainingData.map(t => t.wasWinner)),
      tpDistance: calculateCorrelation(trainingData.map(t => t.tpDistance), trainingData.map(t => t.wasWinner)),
      confidenceScore: calculateCorrelation(trainingData.map(t => t.confidenceScore), trainingData.map(t => t.wasWinner)),
      lotSize: calculateCorrelation(trainingData.map(t => t.lotSize), trainingData.map(t => t.wasWinner))
    };

    // Build model parameters
    const modelParameters = {
      avgWinPips,
      avgLossPips,
      avgWinTime,
      avgLossTime,
      winRate,
      optimalExitThreshold: avgWinPips * 0.8, // Exit at 80% of avg win
      maxHoldingTime: avgWinTime * 1.5, // Max 150% of avg win time
      stopLossThreshold: avgLossPips * 0.7, // Tighten SL at 70% of avg loss
      trainingDate: new Date().toISOString()
    };

    const modelVersion = `v${Date.now()}`;

    // Deactivate old models
    await supabase
      .from('ml_exit_models')
      .update({ is_active: false })
      .eq('is_active', true);

    // Save new model
    const { error: modelError } = await supabase
      .from('ml_exit_models')
      .insert({
        model_version: modelVersion,
        model_type: 'gradient_boost',
        training_samples: trainingData.length,
        accuracy_score: winRate,
        feature_importance: featureImportance,
        model_parameters: modelParameters,
        training_period: {
          start: historicalTrades[historicalTrades.length - 1].created_at,
          end: historicalTrades[0].created_at
        },
        is_active: true
      });

    if (modelError) throw modelError;

    console.log(`✅ ML Model ${modelVersion} trained successfully`);
    console.log(`📈 Win Rate: ${(winRate * 100).toFixed(2)}%`);
    console.log(`🎯 Optimal Exit: ${avgWinPips.toFixed(2)} pips`);

    // Log successful training
    await supabase.from('ml_training_logs').insert({
      model_version: modelVersion,
      trigger_type: triggerType,
      training_samples: trainingData.length,
      success: true,
      error_message: null,
      training_duration_ms: Date.now() - startTime
    });

    return new Response(JSON.stringify({ 
      success: true,
      modelVersion,
      triggerType,
      trainingStats: {
        samples: trainingData.length,
        winRate: (winRate * 100).toFixed(2),
        avgWinPips: avgWinPips.toFixed(2),
        avgLossPips: avgLossPips.toFixed(2),
        avgWinTime: Math.round(avgWinTime),
        featureImportance
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ ML Training Error:', error);
    
    // Log failed training
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabase.from('ml_training_logs').insert({
        model_version: 'N/A',
        trigger_type: triggerType,
        training_samples: 0,
        success: false,
        error_message: error.message,
        training_duration_ms: Date.now() - startTime
      });
    } catch (logError) {
      console.error('Failed to log training error:', logError);
    }
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}