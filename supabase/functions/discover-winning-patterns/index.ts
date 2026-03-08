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

    console.log('🎯 Pattern Discovery System Starting...');

    // Query closed trades directly (learning_outcomes may not be populated yet)
    const { data: closedTrades } = await supabaseClient
      .from('shadow_trades')
      .select('*, master_signal_id')
      .eq('status', 'closed')
      .gte('exit_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('pnl', { ascending: false })
      .limit(200);

    if (!closedTrades || closedTrades.length < 10) {
      console.log(`⚠️ Not enough closed trades for pattern discovery (${closedTrades?.length || 0})`);
      return new Response(
        JSON.stringify({ success: false, message: 'Insufficient closed trades', count: closedTrades?.length || 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = closedTrades.filter(t => (t.pnl || 0) <= 0);
    const overallWinRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

    console.log(`📊 Analyzing ${closedTrades.length} trades (${winningTrades.length} wins, ${losingTrades.length} losses)`);

    const patterns: any[] = [];

    // PATTERN 1: Direction bias
    const buyTrades = closedTrades.filter(t => t.trade_type === 'buy');
    const sellTrades = closedTrades.filter(t => t.trade_type === 'sell');

    if (buyTrades.length >= 5) {
      const buyWins = buyTrades.filter(t => (t.pnl || 0) > 0).length;
      const buyWinRate = (buyWins / buyTrades.length) * 100;
      const buyAvgPnl = buyTrades.reduce((s, t) => s + (t.pnl || 0), 0) / buyTrades.length;
      if (buyWinRate >= 55) {
        patterns.push({
          pattern_name: 'Buy Direction Advantage',
          pattern_type: 'direction',
          confidence: buyWinRate,
          win_rate: buyWinRate,
          sample_size: buyTrades.length,
          description: `Buy trades: ${buyWinRate.toFixed(1)}% win rate, avg $${buyAvgPnl.toFixed(2)}`,
          parameters: { trade_type: 'buy', avg_pnl: buyAvgPnl },
          is_active: true,
          deployed: buyTrades.length >= 20,
        });
      }
    }

    if (sellTrades.length >= 5) {
      const sellWins = sellTrades.filter(t => (t.pnl || 0) > 0).length;
      const sellWinRate = (sellWins / sellTrades.length) * 100;
      const sellAvgPnl = sellTrades.reduce((s, t) => s + (t.pnl || 0), 0) / sellTrades.length;
      if (sellWinRate >= 55) {
        patterns.push({
          pattern_name: 'Sell Direction Advantage',
          pattern_type: 'direction',
          confidence: sellWinRate,
          win_rate: sellWinRate,
          sample_size: sellTrades.length,
          description: `Sell trades: ${sellWinRate.toFixed(1)}% win rate, avg $${sellAvgPnl.toFixed(2)}`,
          parameters: { trade_type: 'sell', avg_pnl: sellAvgPnl },
          is_active: true,
          deployed: sellTrades.length >= 20,
        });
      }
    }

    // PATTERN 2: Optimal holding time
    const tradesWithDuration = closedTrades.filter(t => t.entry_time && t.exit_time);
    if (tradesWithDuration.length >= 10) {
      const durations = tradesWithDuration.map(t => ({
        minutes: (new Date(t.exit_time).getTime() - new Date(t.entry_time).getTime()) / 60000,
        pnl: t.pnl || 0,
      }));

      // Bucket into short (<60m), medium (60-180m), long (>180m)
      const buckets = [
        { label: 'Short (<1h)', trades: durations.filter(d => d.minutes < 60) },
        { label: 'Medium (1-3h)', trades: durations.filter(d => d.minutes >= 60 && d.minutes < 180) },
        { label: 'Long (3h+)', trades: durations.filter(d => d.minutes >= 180) },
      ];

      for (const bucket of buckets) {
        if (bucket.trades.length >= 5) {
          const wins = bucket.trades.filter(d => d.pnl > 0).length;
          const wr = (wins / bucket.trades.length) * 100;
          const avgPnl = bucket.trades.reduce((s, d) => s + d.pnl, 0) / bucket.trades.length;
          if (wr >= 55 && avgPnl > 0) {
            patterns.push({
              pattern_name: `${bucket.label} Holding Advantage`,
              pattern_type: 'holding_time',
              confidence: wr,
              win_rate: wr,
              sample_size: bucket.trades.length,
              description: `${bucket.label}: ${wr.toFixed(1)}% win rate, avg $${avgPnl.toFixed(2)}`,
              parameters: { bucket: bucket.label, avg_pnl: avgPnl },
              is_active: true,
              deployed: false,
            });
          }
        }
      }
    }

    // PATTERN 3: Entry hour analysis
    const hourStats: Record<number, { wins: number; total: number; pnl: number }> = {};
    closedTrades.forEach(t => {
      const hour = new Date(t.entry_time).getUTCHours();
      if (!hourStats[hour]) hourStats[hour] = { wins: 0, total: 0, pnl: 0 };
      hourStats[hour].total++;
      hourStats[hour].pnl += t.pnl || 0;
      if ((t.pnl || 0) > 0) hourStats[hour].wins++;
    });

    const bestHours = Object.entries(hourStats)
      .filter(([_, s]) => s.total >= 3 && (s.wins / s.total) >= 0.6)
      .map(([h, s]) => ({ hour: parseInt(h), winRate: (s.wins / s.total) * 100, avgPnl: s.pnl / s.total, count: s.total }))
      .sort((a, b) => b.avgPnl - a.avgPnl);

    if (bestHours.length > 0) {
      patterns.push({
        pattern_name: `Best Hours: ${bestHours.slice(0, 3).map(h => `${h.hour}:00`).join(', ')} UTC`,
        pattern_type: 'time',
        confidence: bestHours[0].winRate,
        win_rate: bestHours[0].winRate,
        sample_size: bestHours.reduce((s, h) => s + h.count, 0),
        description: `Top trading hours with ${bestHours[0].winRate.toFixed(1)}% win rate`,
        parameters: { best_hours: bestHours.slice(0, 3) },
        is_active: true,
        deployed: false,
      });
    }

    // Save patterns
    let savedCount = 0;
    for (const pattern of patterns) {
      const { error } = await supabaseClient
        .from('discovered_patterns')
        .insert(pattern);
      if (!error) savedCount++;
      else console.warn(`Failed to save pattern ${pattern.pattern_name}:`, error.message);
    }

    // Also seed learning_outcomes from closed trades that don't have one yet
    const { data: existingOutcomes } = await supabaseClient
      .from('learning_outcomes')
      .select('trade_id');
    
    const existingTradeIds = new Set((existingOutcomes || []).map(o => o.trade_id));
    const newOutcomes = closedTrades
      .filter(t => !existingTradeIds.has(t.id))
      .map(t => ({
        trade_id: t.id,
        signal_id: t.signal_id,
        outcome_type: (t.pnl || 0) > 1 ? 'win' : (t.pnl || 0) < -1 ? 'loss' : 'breakeven',
        pnl: t.pnl || 0,
        profit_pips: t.profit_pips || 0,
        holding_time_minutes: t.entry_time && t.exit_time
          ? (new Date(t.exit_time).getTime() - new Date(t.entry_time).getTime()) / 60000
          : 0,
        confluence_score: 0,
        market_regime: 'unknown',
        processed: true,
      }));

    if (newOutcomes.length > 0) {
      await supabaseClient.from('learning_outcomes').insert(newOutcomes);
      console.log(`📝 Seeded ${newOutcomes.length} learning outcomes from closed trades`);
    }

    // Log action
    await supabaseClient.from('learning_actions').insert({
      action_type: 'discover_pattern',
      trigger_reason: `Analyzed ${closedTrades.length} trades, found ${patterns.length} patterns`,
      success: true,
    });

    console.log(`✅ Pattern discovery complete: ${patterns.length} patterns found, ${savedCount} saved`);

    return new Response(
      JSON.stringify({
        success: true,
        patterns_discovered: patterns.length,
        patterns_saved: savedCount,
        outcomes_seeded: newOutcomes.length,
        overall_win_rate: overallWinRate,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in discover-winning-patterns:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
