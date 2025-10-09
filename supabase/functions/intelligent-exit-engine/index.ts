import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExitIntelligence {
  overallExitScore: number;
  recommendation: 'FORCE_EXIT' | 'HOLD_CAUTION' | 'HOLD_CONFIDENT';
  factors: {
    confluenceScore: number;
    trendAlignment: number;
    sentimentScore: number;
    volatilityRegime: number;
    volumeProfile: number;
    correlationHealth: number;
    fundamentalBias: number;
    harmonicCompletion: number;
    marketStructure: number;
    regimeStrength: number;
  };
  reasoning: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { tradeId, currentPrice } = await req.json();

    if (!tradeId || !currentPrice) {
      return new Response(
        JSON.stringify({ error: 'Missing tradeId or currentPrice' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get trade details
    const { data: trade, error: tradeError } = await supabase
      .from('shadow_trades')
      .select('*')
      .eq('id', tradeId)
      .single();

    if (tradeError || !trade) {
      return new Response(
        JSON.stringify({ error: 'Trade not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get latest master signal for this trade (if exists)
    const { data: masterSignal } = await supabase
      .from('master_signals')
      .select('*')
      .eq('symbol', trade.symbol)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get latest modular signals
    const { data: modularSignals } = await supabase
      .from('modular_signals')
      .select('*')
      .eq('symbol', trade.symbol)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get latest market data
    const { data: marketData } = await supabase
      .from('market_data_feed')
      .select('*')
      .eq('symbol', trade.symbol)
      .order('timestamp', { ascending: false })
      .limit(30);

    // Get correlation data
    const { data: correlations } = await supabase
      .from('correlations')
      .select('*')
      .or(`asset_a.eq.${trade.symbol},asset_b.eq.${trade.symbol}`)
      .order('calculation_date', { ascending: false })
      .limit(5);

    // Get economic events
    const { data: economicEvents } = await supabase
      .from('economic_events')
      .select('*')
      .contains('symbol_impact', [trade.symbol])
      .gte('event_time', new Date().toISOString())
      .order('event_time', { ascending: true })
      .limit(5);

    // **PHASE 2: HOLISTIC EXIT SCORING ALGORITHM**
    const exitIntelligence = calculateExitIntelligence(
      trade,
      currentPrice,
      masterSignal,
      modularSignals || [],
      marketData || [],
      correlations || [],
      economicEvents || []
    );

    console.log(`📊 Exit Intelligence for ${tradeId}:`, exitIntelligence);

    return new Response(
      JSON.stringify({ success: true, exitIntelligence }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in intelligent-exit-engine:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateExitIntelligence(
  trade: any,
  currentPrice: number,
  masterSignal: any,
  modularSignals: any[],
  marketData: any[],
  correlations: any[],
  economicEvents: any[]
): ExitIntelligence {
  
  const factors = {
    confluenceScore: 0,
    trendAlignment: 0,
    sentimentScore: 0,
    volatilityRegime: 0,
    volumeProfile: 0,
    correlationHealth: 0,
    fundamentalBias: 0,
    harmonicCompletion: 0,
    marketStructure: 0,
    regimeStrength: 0
  };

  let reasoning = '';

  // 1. CONFLUENCE SCORE (Weight: 15%)
  if (masterSignal?.confluence_score) {
    factors.confluenceScore = Math.min(masterSignal.confluence_score / 20 * 100, 100);
  } else {
    const buySignals = modularSignals.filter(s => s.signal_type === 'buy').length;
    const sellSignals = modularSignals.filter(s => s.signal_type === 'sell').length;
    const totalSignals = buySignals + sellSignals;
    
    if (trade.trade_type === 'buy') {
      factors.confluenceScore = totalSignals > 0 ? (buySignals / totalSignals) * 100 : 50;
    } else {
      factors.confluenceScore = totalSignals > 0 ? (sellSignals / totalSignals) * 100 : 50;
    }
  }

  // 2. TREND ALIGNMENT (Weight: 15%)
  if (marketData.length >= 20) {
    const recentPrices = marketData.slice(0, 20).map(d => d.price);
    const sma20 = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    const currentTrend = currentPrice > sma20 ? 'bullish' : 'bearish';
    
    if ((trade.trade_type === 'buy' && currentTrend === 'bullish') ||
        (trade.trade_type === 'sell' && currentTrend === 'bearish')) {
      factors.trendAlignment = 100;
      reasoning += 'Trend aligned. ';
    } else {
      factors.trendAlignment = 30;
      reasoning += 'Trend diverging! ';
    }
  } else {
    factors.trendAlignment = 50;
  }

  // 3. SENTIMENT SCORE (Weight: 10%)
  const sentimentSignals = modularSignals.filter(s => 
    s.module_id.includes('sentiment') || s.module_id.includes('news')
  );
  
  if (sentimentSignals.length > 0) {
    const avgSentiment = sentimentSignals.reduce((sum, s) => sum + s.confidence, 0) / sentimentSignals.length;
    factors.sentimentScore = avgSentiment * 100;
  } else {
    factors.sentimentScore = 50;
  }

  // 4. VOLATILITY REGIME (Weight: 10%)
  if (marketData.length >= 10) {
    const recentCandles = marketData.slice(0, 10);
    const volatilities = recentCandles.map(c => Math.abs(c.high_price - c.low_price));
    const avgVolatility = volatilities.reduce((a, b) => a + b, 0) / volatilities.length;
    const currentVolatility = Math.abs(marketData[0].high_price - marketData[0].low_price);
    
    // Prefer moderate volatility (not too high, not too low)
    const volatilityRatio = currentVolatility / avgVolatility;
    if (volatilityRatio > 2) {
      factors.volatilityRegime = 40; // Too volatile
      reasoning += 'High volatility. ';
    } else if (volatilityRatio < 0.5) {
      factors.volatilityRegime = 60; // Too quiet
    } else {
      factors.volatilityRegime = 90; // Optimal
    }
  } else {
    factors.volatilityRegime = 50;
  }

  // 5. VOLUME PROFILE (Weight: 8%)
  if (marketData.length >= 5) {
    const recentVolumes = marketData.slice(0, 5).map(d => d.volume || 0);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const currentVolume = marketData[0].volume || 0;
    
    if (currentVolume > avgVolume * 1.5) {
      factors.volumeProfile = 85; // Strong volume support
    } else if (currentVolume < avgVolume * 0.5) {
      factors.volumeProfile = 40; // Weak volume
      reasoning += 'Volume declining. ';
    } else {
      factors.volumeProfile = 70;
    }
  } else {
    factors.volumeProfile = 50;
  }

  // 6. CORRELATION HEALTH (Weight: 8%)
  if (correlations.length > 0) {
    const avgCorrelation = correlations.reduce((sum, c) => sum + Math.abs(c.correlation_value), 0) / correlations.length;
    factors.correlationHealth = (1 - Math.abs(avgCorrelation - 0.5)) * 100; // Prefer moderate correlations
  } else {
    factors.correlationHealth = 50;
  }

  // 7. FUNDAMENTAL BIAS (Weight: 12%)
  if (economicEvents.length > 0) {
    const highImpactEvents = economicEvents.filter(e => e.impact_level === 'high').length;
    if (highImpactEvents > 0) {
      factors.fundamentalBias = 40; // Caution before major events
      reasoning += 'Major event approaching. ';
    } else {
      factors.fundamentalBias = 75;
    }
  } else {
    factors.fundamentalBias = 70;
  }

  // 8. HARMONIC COMPLETION (Weight: 7%)
  const harmonicSignals = modularSignals.filter(s => s.module_id.includes('harmonic'));
  if (harmonicSignals.length > 0) {
    const avgHarmonicConfidence = harmonicSignals.reduce((sum, s) => sum + s.confidence, 0) / harmonicSignals.length;
    factors.harmonicCompletion = avgHarmonicConfidence * 100;
  } else {
    factors.harmonicCompletion = 50;
  }

  // 9. MARKET STRUCTURE (Weight: 10%)
  const structureSignals = modularSignals.filter(s => s.module_id.includes('structure'));
  if (structureSignals.length > 0) {
    const avgStructure = structureSignals.reduce((sum, s) => sum + s.confidence, 0) / structureSignals.length;
    factors.marketStructure = avgStructure * 100;
  } else {
    factors.marketStructure = 50;
  }

  // 10. REGIME STRENGTH (Weight: 5%)
  if (masterSignal?.market_regime) {
    const regimeMap: Record<string, number> = {
      'trending': 90,
      'ranging': 60,
      'volatile': 40,
      'breakout': 85,
      'consolidation': 50
    };
    factors.regimeStrength = regimeMap[masterSignal.market_regime] || 50;
  } else {
    factors.regimeStrength = 50;
  }

  // **WEIGHTED OVERALL EXIT SCORE (0-100)**
  const weights = {
    confluenceScore: 0.15,
    trendAlignment: 0.15,
    sentimentScore: 0.10,
    volatilityRegime: 0.10,
    volumeProfile: 0.08,
    correlationHealth: 0.08,
    fundamentalBias: 0.12,
    harmonicCompletion: 0.07,
    marketStructure: 0.10,
    regimeStrength: 0.05
  };

  const overallExitScore = Object.keys(factors).reduce((score, key) => {
    return score + factors[key as keyof typeof factors] * weights[key as keyof typeof weights];
  }, 0);

  // **EXIT DECISION THRESHOLDS**
  let recommendation: 'FORCE_EXIT' | 'HOLD_CAUTION' | 'HOLD_CONFIDENT';
  
  if (overallExitScore < 30) {
    recommendation = 'FORCE_EXIT';
    reasoning += 'Multiple factors deteriorating - EXIT NOW.';
  } else if (overallExitScore < 60) {
    recommendation = 'HOLD_CAUTION';
    reasoning += 'Mixed signals - monitor closely.';
  } else {
    recommendation = 'HOLD_CONFIDENT';
    reasoning += 'Strong conditions - keep position open.';
  }

  return {
    overallExitScore: Math.round(overallExitScore * 100) / 100,
    recommendation,
    factors,
    reasoning: reasoning.trim()
  };
}
