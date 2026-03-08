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
    const startTime = Date.now();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { tradeId, currentPrice, trigger } = body;

    // CRON MODE: fetch all open trades and evaluate each
    if (trigger === 'cron' || (!tradeId && !currentPrice)) {
      console.log('🔄 [Exit Engine] CRON mode - fetching all open trades...');
      
      const { data: openTrades, error: tradesErr } = await supabase
        .from('shadow_trades')
        .select('*')
        .eq('status', 'open');

      if (tradesErr || !openTrades || openTrades.length === 0) {
        console.log(`✅ [Exit Engine] No open trades to evaluate`);
        return new Response(
          JSON.stringify({ success: true, message: 'No open trades', tradesEvaluated: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get current price from market data
      const { data: latestPrice } = await supabase
        .from('market_data_feed')
        .select('price')
        .eq('symbol', 'EUR/USD')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      const price = latestPrice?.price;
      if (!price) {
        console.error('❌ [Exit Engine] No market price available');
        return new Response(
          JSON.stringify({ success: false, error: 'No market price available' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`📊 [Exit Engine] Evaluating ${openTrades.length} open trades at price ${price}`);
      const results = [];

      for (const trade of openTrades) {
        const exitIntelligence = await evaluateTrade(supabase, trade, price);
        results.push({ tradeId: trade.id, ...exitIntelligence });

        // Store exit intelligence
        await supabase.from('exit_intelligence').insert({
          trade_id: trade.id,
          overall_score: exitIntelligence.overallExitScore,
          recommendation: exitIntelligence.recommendation,
          factors: exitIntelligence.factors,
          reasoning: exitIntelligence.reasoning,
          holding_time_minutes: (Date.now() - new Date(trade.entry_time).getTime()) / 60000,
          confidence: exitIntelligence.overallExitScore / 100,
        });

        // Execute FORCE_EXIT
        if (exitIntelligence.recommendation === 'FORCE_EXIT') {
          console.log(`🚨 [Exit Engine] FORCE_EXIT on trade ${trade.id.slice(0, 8)} - Score: ${exitIntelligence.overallExitScore}`);
          
          const { data: closeResult } = await supabase.rpc('close_shadow_trade', {
            p_trade_id: trade.id,
            p_close_price: price,
            p_close_reason: `intelligence_exit (score: ${exitIntelligence.overallExitScore.toFixed(1)})`,
          });

          // Update trade with exit intelligence metadata
          await supabase.from('shadow_trades').update({
            intelligence_exit_triggered: true,
            exit_intelligence_score: exitIntelligence.overallExitScore,
          }).eq('id', trade.id);

          console.log(`✅ [Exit Engine] Trade ${trade.id.slice(0, 8)} closed:`, closeResult);
        }
      }

      const executionTime = Date.now() - startTime;
      console.log(`✅ [Exit Engine] CRON complete - ${results.length} trades evaluated in ${executionTime}ms`);

      return new Response(
        JSON.stringify({ success: true, tradesEvaluated: results.length, results, executionTimeMs: executionTime }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SINGLE TRADE MODE (called from check-trade-exits or UI)
    console.log(`🔍 [Exit Engine] Called for trade ${tradeId?.slice(0, 8)} at price ${currentPrice}`);

    if (!tradeId || !currentPrice) {
      console.error('❌ [Exit Engine] Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'Missing tradeId or currentPrice' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: trade, error: tradeError } = await supabase
      .from('shadow_trades')
      .select('*')
      .eq('id', tradeId)
      .single();

    if (tradeError || !trade) {
      console.error('❌ [Exit Engine] Trade not found:', tradeError);
      return new Response(
        JSON.stringify({ error: 'Trade not found', details: tradeError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const exitIntelligence = await evaluateTrade(supabase, trade, currentPrice);

    const executionTime = Date.now() - startTime;
    console.log(`✅ [Exit Engine] Score: ${exitIntelligence.overallExitScore.toFixed(2)}, Rec: ${exitIntelligence.recommendation} (${executionTime}ms)`);

    return new Response(
      JSON.stringify({ success: true, exitIntelligence, executionTimeMs: executionTime }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [Exit Engine] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message, timestamp: new Date().toISOString() }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function evaluateTrade(supabase: any, trade: any, currentPrice: number): Promise<ExitIntelligence> {
  // Fetch all data in parallel
  const [masterSignalRes, modularSignalsRes, marketDataRes, correlationsRes, economicEventsRes] = await Promise.all([
    supabase.from('master_signals').select('*').eq('symbol', trade.symbol).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('modular_signals').select('*').eq('symbol', trade.symbol).order('created_at', { ascending: false }).limit(20),
    supabase.from('market_data_feed').select('*').eq('symbol', trade.symbol).order('timestamp', { ascending: false }).limit(30),
    supabase.from('correlations').select('*').ilike('symbol_pair', `%${trade.symbol}%`).order('calculated_at', { ascending: false }).limit(5),
    supabase.from('economic_events').select('*').eq('currency', 'USD').gte('event_time', new Date().toISOString()).order('event_time', { ascending: true }).limit(5),
  ]);

  return calculateExitIntelligence(
    trade, currentPrice,
    masterSignalRes.data,
    modularSignalsRes.data || [],
    marketDataRes.data || [],
    correlationsRes.data || [],
    economicEventsRes.data || []
  );
}

function calculateExitIntelligence(
  trade: any, currentPrice: number, masterSignal: any,
  modularSignals: any[], marketData: any[], correlations: any[], economicEvents: any[]
): ExitIntelligence {
  const factors = {
    confluenceScore: 0, trendAlignment: 0, sentimentScore: 0, volatilityRegime: 0,
    volumeProfile: 0, correlationHealth: 0, fundamentalBias: 0,
    harmonicCompletion: 0, marketStructure: 0, regimeStrength: 0
  };
  let reasoning = '';

  // 1. CONFLUENCE SCORE (15%)
  if (masterSignal?.confluence_score) {
    factors.confluenceScore = Math.min(masterSignal.confluence_score / 20 * 100, 100);
  } else {
    const buySignals = modularSignals.filter(s => s.signal_type === 'buy').length;
    const sellSignals = modularSignals.filter(s => s.signal_type === 'sell').length;
    const total = buySignals + sellSignals;
    factors.confluenceScore = total > 0
      ? (trade.trade_type === 'buy' ? buySignals / total : sellSignals / total) * 100
      : 50;
  }

  // 2. TREND ALIGNMENT (15%)
  if (marketData.length >= 20) {
    const sma20 = marketData.slice(0, 20).reduce((a: number, b: any) => a + b.price, 0) / 20;
    const aligned = (trade.trade_type === 'buy' && currentPrice > sma20) || (trade.trade_type === 'sell' && currentPrice < sma20);
    factors.trendAlignment = aligned ? 100 : 30;
    reasoning += aligned ? 'Trend aligned. ' : 'Trend diverging! ';
  } else { factors.trendAlignment = 50; }

  // 3. SENTIMENT (10%)
  const sentimentSignals = modularSignals.filter(s => s.module_id?.includes('sentiment') || s.module_id?.includes('news'));
  factors.sentimentScore = sentimentSignals.length > 0
    ? sentimentSignals.reduce((sum: number, s: any) => sum + s.confidence, 0) / sentimentSignals.length * 100
    : 50;

  // 4. VOLATILITY (10%)
  if (marketData.length >= 10) {
    const candles = marketData.slice(0, 10);
    const vols = candles.map((c: any) => Math.abs((c.high_price || c.price) - (c.low_price || c.price)));
    const avgVol = vols.reduce((a: number, b: number) => a + b, 0) / vols.length;
    const curVol = Math.abs((marketData[0].high_price || marketData[0].price) - (marketData[0].low_price || marketData[0].price));
    const ratio = avgVol > 0 ? curVol / avgVol : 1;
    if (ratio > 2) { factors.volatilityRegime = 40; reasoning += 'High volatility. '; }
    else if (ratio < 0.5) { factors.volatilityRegime = 60; }
    else { factors.volatilityRegime = 90; }
  } else { factors.volatilityRegime = 50; }

  // 5. VOLUME (8%)
  if (marketData.length >= 5) {
    const avgVol = marketData.slice(0, 5).reduce((a: number, d: any) => a + (d.volume || 0), 0) / 5;
    const curVol = marketData[0].volume || 0;
    if (curVol > avgVol * 1.5) factors.volumeProfile = 85;
    else if (curVol < avgVol * 0.5) { factors.volumeProfile = 40; reasoning += 'Volume declining. '; }
    else factors.volumeProfile = 70;
  } else { factors.volumeProfile = 50; }

  // 6. CORRELATION (8%)
  factors.correlationHealth = correlations.length > 0
    ? (1 - Math.abs(correlations.reduce((s: number, c: any) => s + Math.abs(c.correlation_coefficient), 0) / correlations.length - 0.5)) * 100
    : 50;

  // 7. FUNDAMENTAL (12%)
  if (economicEvents.length > 0) {
    const highImpact = economicEvents.filter((e: any) => e.impact === 'high').length;
    if (highImpact > 0) { factors.fundamentalBias = 40; reasoning += 'Major event approaching. '; }
    else factors.fundamentalBias = 75;
  } else { factors.fundamentalBias = 70; }

  // 8. HARMONIC (7%)
  const harmonicSignals = modularSignals.filter(s => s.module_id?.includes('harmonic'));
  factors.harmonicCompletion = harmonicSignals.length > 0
    ? harmonicSignals.reduce((s: number, h: any) => s + h.confidence, 0) / harmonicSignals.length * 100 : 50;

  // 9. MARKET STRUCTURE (10%)
  const structureSignals = modularSignals.filter(s => s.module_id?.includes('structure'));
  factors.marketStructure = structureSignals.length > 0
    ? structureSignals.reduce((s: number, st: any) => s + st.confidence, 0) / structureSignals.length * 100 : 50;

  // 10. REGIME (5%)
  const regimeMap: Record<string, number> = { trending: 90, ranging: 60, volatile: 40, breakout: 85, consolidation: 50 };
  factors.regimeStrength = masterSignal?.market_regime ? (regimeMap[masterSignal.market_regime] || 50) : 50;

  // WEIGHTED SCORE
  const weights: Record<string, number> = {
    confluenceScore: 0.15, trendAlignment: 0.15, sentimentScore: 0.10, volatilityRegime: 0.10,
    volumeProfile: 0.08, correlationHealth: 0.08, fundamentalBias: 0.12,
    harmonicCompletion: 0.07, marketStructure: 0.10, regimeStrength: 0.05
  };

  const overallExitScore = Object.keys(factors).reduce((score, key) => {
    return score + factors[key as keyof typeof factors] * weights[key];
  }, 0);

  // TIME-BASED + DECISION
  const holdingMinutes = (Date.now() - new Date(trade.entry_time).getTime()) / 60000;
  let recommendation: 'FORCE_EXIT' | 'HOLD_CAUTION' | 'HOLD_CONFIDENT';

  if (holdingMinutes >= 150) {
    recommendation = 'FORCE_EXIT';
    reasoning += `Trade held ${(holdingMinutes/60).toFixed(1)}h - TIME LIMIT. `;
  } else if (overallExitScore < 40) {
    recommendation = 'FORCE_EXIT';
    reasoning += 'Multiple factors deteriorating - EXIT NOW.';
  } else if (overallExitScore < 65) {
    recommendation = 'HOLD_CAUTION';
    reasoning += 'Mixed signals - monitor closely.';
  } else {
    recommendation = 'HOLD_CONFIDENT';
    reasoning += 'Strong conditions - keep position open.';
  }

  return {
    overallExitScore: Math.round(overallExitScore * 100) / 100,
    recommendation, factors, reasoning: reasoning.trim()
  };
}
