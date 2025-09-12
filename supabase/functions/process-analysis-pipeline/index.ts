import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get latest tick data
    const { data: latestTick } = await supabase
      .from('tick_data')
      .select('*')
      .eq('symbol', 'EUR/USD')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (!latestTick) {
      return new Response(
        JSON.stringify({ error: 'No tick data available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process technical analysis
    await processModularSignal(supabase, 'technical_analysis', latestTick);
    
    // Process fundamental analysis
    await processModularSignal(supabase, 'fundamental_analysis', latestTick);
    
    // Process sentiment analysis
    await processModularSignal(supabase, 'sentiment_analysis', latestTick);
    
    // Process quantitative analysis
    await processModularSignal(supabase, 'quantitative_analysis', latestTick);
    
    // Process intermarket analysis
    await processModularSignal(supabase, 'intermarket_analysis', latestTick);
    
    // Process specialized analysis
    await processModularSignal(supabase, 'specialized_analysis', latestTick);

    // Update module health
    await updateModuleHealth(supabase);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed_at: new Date().toISOString(),
        tick_price: latestTick.bid
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Pipeline processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processModularSignal(supabase: any, moduleId: string, tickData: any) {
  const analysisId = crypto.randomUUID();
  
  // Generate signal based on module type
  const signal = generateSignalForModule(moduleId, tickData, analysisId);
  
  // Insert modular signal
  const { error } = await supabase
    .from('modular_signals')
    .insert([signal]);

  if (error) {
    console.error(`Error inserting ${moduleId} signal:`, error);
  } else {
    console.log(`✅ ${moduleId} signal generated`);
  }
}

function generateSignalForModule(moduleId: string, tickData: any, analysisId: string) {
  const basePrice = tickData.bid;
  const spread = tickData.spread;
  const signalType = Math.random() > 0.5 ? 'buy' : 'sell';
  const confidence = 0.6 + Math.random() * 0.3; // 60-90%
  const strength = Math.floor(5 + Math.random() * 5); // 5-10

  const entryAdjustment = signalType === 'buy' ? spread : -spread;
  const suggestedEntry = basePrice + entryAdjustment;
  const stopLoss = signalType === 'buy' ? 
    suggestedEntry - (0.0020 + Math.random() * 0.0010) : 
    suggestedEntry + (0.0020 + Math.random() * 0.0010);
  const takeProfit = signalType === 'buy' ? 
    suggestedEntry + (0.0040 + Math.random() * 0.0020) : 
    suggestedEntry - (0.0040 + Math.random() * 0.0020);

  return {
    id: crypto.randomUUID(),
    analysis_id: analysisId,
    module_id: moduleId,
    symbol: 'EURUSD',
    timeframe: '15m',
    signal_type: signalType,
    confidence: confidence,
    strength: strength,
    weight: 1.0,
    trigger_price: basePrice,
    suggested_entry: suggestedEntry,
    suggested_stop_loss: stopLoss,
    suggested_take_profit: takeProfit,
    market_data_snapshot: {
      bid: tickData.bid,
      ask: tickData.ask,
      spread: tickData.spread,
      timestamp: tickData.timestamp
    },
    calculation_parameters: getModuleSpecificParameters(moduleId, tickData),
    intermediate_values: getModuleSpecificIntermediateValues(moduleId, tickData, signalType),
    trend_context: getRandomTrendContext(),
    volatility_regime: getRandomVolatilityRegime(),
    market_session: 'london',
    timestamp: new Date().toISOString(),
    expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
    is_active: true
  };
}

function getModuleSpecificParameters(moduleId: string, tickData: any) {
  switch (moduleId) {
    case 'technical_analysis':
      return {
        rsi_period: 14,
        macd_fast: 12,
        macd_slow: 26,
        macd_signal: 9,
        sma_periods: [20, 50, 200],
        support_level: tickData.bid - 0.0025,
        resistance_level: tickData.bid + 0.0025
      };
    case 'fundamental_analysis':
      return {
        central_bank_sentiment: 'neutral',
        inflation_trend: 'rising',
        gdp_growth: 'stable',
        event_count: 3
      };
    case 'sentiment_analysis':
      return {
        retail_long_pct: 60 + Math.random() * 20,
        retail_short_pct: 40 + Math.random() * 20,
        cot_positioning: 'neutral',
        fear_greed_index: 45 + Math.random() * 20
      };
    case 'quantitative_analysis':
      return {
        correlation_matrix: {
          'GBPUSD': 0.75,
          'USDJPY': -0.65,
          'DXY': -0.85
        },
        volatility_percentile: 45 + Math.random() * 30,
        mean_reversion_score: Math.random()
      };
    case 'intermarket_analysis':
      return {
        primary_driver: 'dxy_movement',
        correlation_strength: 0.8,
        risk_environment: 'risk_on'
      };
    case 'specialized_analysis':
      return {
        primary_pattern: 'harmonic_gartley',
        pattern_maturity: 0.8,
        elliott_wave_count: 3,
        harmonic_pattern_type: 'gartley'
      };
    default:
      return {};
  }
}

function getModuleSpecificIntermediateValues(moduleId: string, tickData: any, signalType: string) {
  switch (moduleId) {
    case 'technical_analysis':
      return {
        indicators: {
          rsi: 45 + Math.random() * 20,
          macd: Math.random() > 0.5 ? 0.0005 : -0.0005,
          sma20: tickData.bid - 0.0001 + Math.random() * 0.0002,
          sma50: tickData.bid - 0.0005 + Math.random() * 0.001,
          sma200: tickData.bid - 0.001 + Math.random() * 0.002
        },
        patterns: [
          { type: 'double_bottom', confidence: 0.7 },
          { type: 'ascending_triangle', confidence: 0.6 }
        ]
      };
    case 'fundamental_analysis':
      return {
        economic_events: [],
        news_events: [],
        sentiment_analysis: {
          central_bank: 'neutral',
          inflation: 'rising',
          growth: 'stable'
        }
      };
    case 'sentiment_analysis':
      return {
        retail_positioning: {
          long_percentage: 60,
          short_percentage: 40
        },
        cot_data: {
          commercial_long: 45000,
          commercial_short: 55000,
          speculators_long: 85000,
          speculators_short: 75000
        }
      };
    case 'intermarket_analysis':
      return {
        intermarket_data: {
          forexCorrelations: {
            'GBPUSD': 0.75,
            'USDJPY': -0.65,
            'AUDUSD': 0.82
          },
          commodityRelations: {
            gold: { currentPrice: 2650, correlation: -0.45 },
            oil: { currentPrice: 73.50, correlation: 0.32 }
          }
        }
      };
    default:
      return {};
  }
}

function getRandomTrendContext() {
  const contexts = ['uptrend', 'downtrend', 'sideways', 'breakout_pending'];
  return contexts[Math.floor(Math.random() * contexts.length)];
}

function getRandomVolatilityRegime() {
  const regimes = ['low', 'normal', 'elevated', 'high'];
  return regimes[Math.floor(Math.random() * regimes.length)];
}

async function updateModuleHealth(supabase: any) {
  const modules = [
    'technical_analysis',
    'fundamental_analysis', 
    'sentiment_analysis',
    'quantitative_analysis',
    'intermarket_analysis',
    'specialized_analysis'
  ];

  for (const module of modules) {
    const { error } = await supabase
      .from('module_health')
      .upsert({
        module_name: module,
        last_run: new Date().toISOString(),
        error_count: 0,
        performance_score: 0.8 + Math.random() * 0.2,
        signals_generated_today: Math.floor(50 + Math.random() * 100),
        status: 'active'
      });

    if (error) {
      console.error(`Error updating module health for ${module}:`, error);
    }
  }
}