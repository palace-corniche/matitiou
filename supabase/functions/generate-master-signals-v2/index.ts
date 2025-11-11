import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MasterSignal {
  analysis_id: string;
  symbol: string;
  timeframe: string;
  signal_type: 'buy' | 'sell';
  final_confidence: number;
  final_strength: number;
  confluence_score: number;
  recommended_entry: number;
  recommended_stop_loss: number;
  recommended_take_profit: number;
  recommended_lot_size: number;
  risk_reward_ratio: number;
  modular_signal_ids: string[];
  contributing_modules: string[];
  fusion_algorithm: string;
  fusion_parameters: any;
  market_data_snapshot: any;
  signal_hash: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // DISABLED: This fake signal generator has been replaced with real generate-confluence-signals
  return new Response(JSON.stringify({
    disabled: true,
    message: "Fake signal generator disabled - system now uses real generate-confluence-signals instead",
    timestamp: new Date().toISOString()
  }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  });
});

async function generateModularSignals(supabase: any, currentPrice: number, tickData: any): Promise<any[]> {
  const signals = [];
  const analysisId = crypto.randomUUID();
  const modules = [
    'technical_analysis',
    'momentum_analysis', 
    'trend_analysis',
    'support_resistance',
    'volume_analysis',
    'pattern_recognition',
    'sentiment_analysis',
    'risk_analysis'
  ];

  for (const moduleId of modules) {
    const signal = generateSignalForModule(moduleId, currentPrice, tickData, analysisId);
    
    // Insert modular signal
    const { data: insertedSignal, error } = await supabase
      .from('modular_signals')
      .insert(signal)
      .select('*')
      .single();

    if (!error && insertedSignal) {
      signals.push(insertedSignal);
    }
  }

  return signals;
}

function generateSignalForModule(moduleId: string, currentPrice: number, tickData: any, analysisId: string): any {
  // Generate realistic signal parameters based on module type
  const signalTypes = ['buy', 'sell'];
  const signalType = signalTypes[Math.floor(Math.random() * signalTypes.length)];
  
  // Base confidence varies by module
  const moduleConfidenceMap: Record<string, number> = {
    'technical_analysis': 0.75,
    'momentum_analysis': 0.65,
    'trend_analysis': 0.80,
    'support_resistance': 0.70,
    'volume_analysis': 0.60,
    'pattern_recognition': 0.85,
    'sentiment_analysis': 0.55,
    'risk_analysis': 0.50
  };

  const baseConfidence = moduleConfidenceMap[moduleId] || 0.60;
  const confidence = baseConfidence + (Math.random() - 0.5) * 0.3; // ±15% variance
  
  const strength = Math.floor(confidence * 10); // 1-10 scale
  const weight = Math.random() * 0.5 + 0.5; // 0.5-1.0

  // Generate realistic entry/SL/TP based on signal type
  const pipVariance = 20; // ±20 pips
  const entryVariance = (Math.random() - 0.5) * pipVariance * 0.0001;
  const suggestedEntry = currentPrice + entryVariance;

  let suggestedStopLoss, suggestedTakeProfit;
  if (signalType === 'buy') {
    suggestedStopLoss = suggestedEntry - (30 + Math.random() * 20) * 0.0001; // 30-50 pip SL
    suggestedTakeProfit = suggestedEntry + (60 + Math.random() * 40) * 0.0001; // 60-100 pip TP
  } else {
    suggestedStopLoss = suggestedEntry + (30 + Math.random() * 20) * 0.0001;
    suggestedTakeProfit = suggestedEntry - (60 + Math.random() * 40) * 0.0001;
  }

  return {
    analysis_id: analysisId,
    module_id: moduleId,
    module_version: '2.0.0',
    symbol: 'EUR/USD',
    timeframe: '15m',
    signal_type: signalType,
    confidence: Math.max(0.1, Math.min(1.0, confidence)),
    strength: Math.max(1, Math.min(10, strength)),
    weight: weight,
    trigger_price: currentPrice,
    suggested_entry: suggestedEntry,
    suggested_stop_loss: suggestedStopLoss,
    suggested_take_profit: suggestedTakeProfit,
    market_data_snapshot: {
      bid: tickData.bid,
      ask: tickData.ask,
      spread: tickData.spread,
      session: tickData.session_type,
      timestamp: tickData.timestamp
    },
    calculation_parameters: {
      module_type: moduleId,
      timeframe: '15m',
      lookback_periods: 50,
      calculation_method: 'enhanced_v2'
    },
    market_session: tickData.session_type,
    volatility_regime: 'normal',
    trend_context: signalType === 'buy' ? 'bullish' : 'bearish'
  };
}

async function fuseSignals(modularSignals: any[], currentPrice: number, tickData: any): Promise<MasterSignal | null> {
  if (modularSignals.length < 3) {
    console.log('❌ Insufficient signals for fusion (minimum 3 required)');
    return null;
  }

  // Calculate weighted average confidence
  const totalWeight = modularSignals.reduce((sum, signal) => sum + signal.weight, 0);
  const weightedConfidence = modularSignals.reduce((sum, signal) => 
    sum + (signal.confidence * signal.weight), 0) / totalWeight;

  // Determine dominant signal type
  const buySignals = modularSignals.filter(s => s.signal_type === 'buy');
  const sellSignals = modularSignals.filter(s => s.signal_type === 'sell');
  
  const dominantType = buySignals.length > sellSignals.length ? 'buy' : 'sell';
  const dominantSignals = dominantType === 'buy' ? buySignals : sellSignals;

  // Calculate confluence score (agreement between signals)
  const confluenceScore = (dominantSignals.length / modularSignals.length) * 100;

  // Check minimum fusion criteria
  if (weightedConfidence < 0.6 || confluenceScore < 60) {
    console.log(`❌ Fusion criteria not met: confidence=${weightedConfidence.toFixed(2)}, confluence=${confluenceScore.toFixed(1)}%`);
    return null;
  }

  // Calculate weighted averages for entry/SL/TP
  const weightedEntry = dominantSignals.reduce((sum, signal) => 
    sum + (signal.suggested_entry * signal.weight), 0) / dominantSignals.reduce((sum, signal) => sum + signal.weight, 0);

  const weightedStopLoss = dominantSignals.reduce((sum, signal) => 
    sum + (signal.suggested_stop_loss * signal.weight), 0) / dominantSignals.reduce((sum, signal) => sum + signal.weight, 0);

  const weightedTakeProfit = dominantSignals.reduce((sum, signal) => 
    sum + (signal.suggested_take_profit * signal.weight), 0) / dominantSignals.reduce((sum, signal) => sum + signal.weight, 0);

  // Calculate risk-reward ratio
  const riskPips = Math.abs(weightedEntry - weightedStopLoss) / 0.0001;
  const rewardPips = Math.abs(weightedTakeProfit - weightedEntry) / 0.0001;
  const riskRewardRatio = rewardPips / riskPips;

  // Calculate recommended lot size (2% risk)
  const riskAmount = 10000 * 0.02; // $200 risk on $10k account
  const dollarRisk = riskPips * 10; // $10 per pip for 1 lot EUR/USD
  const recommendedLotSize = Math.min(0.1, Math.max(0.01, riskAmount / dollarRisk));

  const masterSignal: MasterSignal = {
    analysis_id: modularSignals[0].analysis_id,
    symbol: 'EUR/USD',
    timeframe: '15m',
    signal_type: dominantType,
    final_confidence: weightedConfidence,
    final_strength: Math.round(weightedConfidence * 10),
    confluence_score: confluenceScore,
    recommended_entry: weightedEntry,
    recommended_stop_loss: weightedStopLoss,
    recommended_take_profit: weightedTakeProfit,
    recommended_lot_size: Math.round(recommendedLotSize * 100) / 100,
    risk_reward_ratio: Math.round(riskRewardRatio * 100) / 100,
    modular_signal_ids: modularSignals.map(s => s.id),
    contributing_modules: modularSignals.map(s => s.module_id),
    fusion_algorithm: 'weighted_consensus_v2',
    fusion_parameters: {
      min_signals: 3,
      min_confidence: 0.6,
      min_confluence: 60,
      weight_method: 'module_reliability',
      fusion_timestamp: new Date().toISOString()
    },
    market_data_snapshot: {
      current_price: currentPrice,
      bid: tickData.bid,
      ask: tickData.ask,
      spread: tickData.spread,
      session: tickData.session_type,
      tick_timestamp: tickData.timestamp
    },
    signal_hash: crypto.randomUUID()
  };

  return masterSignal;
}

async function updateModulePerformance(supabase: any, modularSignals: any[]): Promise<void> {
  for (const signal of modularSignals) {
    // Update or insert module performance
    const { error } = await supabase
      .from('module_performance')
      .upsert({
        module_id: signal.module_id,
        signals_generated: 1,
        reliability: signal.confidence,
        average_confidence: signal.confidence,
        average_strength: signal.strength,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'module_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error(`❌ Error updating performance for ${signal.module_id}:`, error);
    }
  }
}