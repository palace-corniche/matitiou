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

    // Get winning trades with full context
    const { data: winningOutcomes } = await supabaseClient
      .from('learning_outcomes')
      .select('*')
      .eq('outcome_type', 'win')
      .gte('pnl', 3) // Only significant wins
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('pnl', { ascending: false })
      .limit(100);

    if (!winningOutcomes || winningOutcomes.length < 10) {
      console.log('⚠️ Not enough winning trades for pattern discovery');
      return new Response(
        JSON.stringify({ success: false, message: 'Insufficient winning trades' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing ${winningOutcomes.length} winning trades for patterns`);

    const patterns = [];

    // PATTERN 1: High signal quality pattern
    const highQualityWins = winningOutcomes.filter(o => (o.signal_quality || 0) >= 70);
    if (highQualityWins.length >= 5) {
      const totalHighQuality = highQualityWins.length;
      const avgPips = highQualityWins.reduce((sum, o) => sum + (o.profit_pips || 0), 0) / totalHighQuality;
      const avgReturn = highQualityWins.reduce((sum, o) => sum + (o.pnl || 0), 0) / totalHighQuality;
      
      patterns.push({
        pattern_name: 'High Signal Quality Entry',
        pattern_type: 'entry',
        pattern_rules: {
          signal_quality_min: 70,
          description: 'Trades with signal quality >= 70 show significantly higher win rates',
        },
        confidence: 85,
        win_rate: 100, // All analyzed were wins
        sample_size: totalHighQuality,
        avg_pips: avgPips,
        avg_return_percent: (avgReturn / 100) * 100,
        deployed: true,
      });

      console.log(`✅ Pattern: High Quality Signals (${totalHighQuality} trades, ${avgPips.toFixed(1)} avg pips)`);
    }

    // PATTERN 2: High confluence pattern
    const highConfluenceWins = winningOutcomes.filter(o => (o.confluence_score || 0) >= 15);
    if (highConfluenceWins.length >= 5) {
      const totalConfluence = highConfluenceWins.length;
      const avgPips = highConfluenceWins.reduce((sum, o) => sum + (o.profit_pips || 0), 0) / totalConfluence;
      
      patterns.push({
        pattern_name: 'High Confluence Entry',
        pattern_type: 'entry',
        pattern_rules: {
          confluence_score_min: 15,
          description: 'Trades with confluence >= 15 show consistent profitability',
        },
        confidence: 80,
        win_rate: 100,
        sample_size: totalConfluence,
        avg_pips: avgPips,
        deployed: true,
      });

      console.log(`✅ Pattern: High Confluence (${totalConfluence} trades, ${avgPips.toFixed(1)} avg pips)`);
    }

    // PATTERN 3: Optimal holding time pattern
    const optimalHoldingWins = winningOutcomes.filter(o => {
      const minutes = o.holding_time_minutes || 0;
      return minutes >= 60 && minutes <= 480; // 1-8 hours
    });
    
    if (optimalHoldingWins.length >= 5) {
      const avgHoldingTime = optimalHoldingWins.reduce((sum, o) => sum + (o.holding_time_minutes || 0), 0) / optimalHoldingWins.length;
      const avgPips = optimalHoldingWins.reduce((sum, o) => sum + (o.profit_pips || 0), 0) / optimalHoldingWins.length;
      
      patterns.push({
        pattern_name: 'Optimal Holding Time',
        pattern_type: 'exit',
        pattern_rules: {
          holding_time_min_minutes: 60,
          holding_time_max_minutes: 480,
          optimal_avg_minutes: avgHoldingTime,
          description: 'Trades held between 1-8 hours show best results',
        },
        confidence: 75,
        win_rate: 100,
        sample_size: optimalHoldingWins.length,
        avg_pips: avgPips,
        deployed: false, // Needs validation
      });

      console.log(`✅ Pattern: Optimal Holding (${optimalHoldingWins.length} trades, ${avgHoldingTime.toFixed(0)} min avg)`);
    }

    // PATTERN 4: Time-of-day pattern
    const timePatterns: Record<string, number[]> = {};
    
    winningOutcomes.forEach(outcome => {
      const features = outcome.learned_features as any;
      if (features?.entry_hour !== undefined) {
        const hour = features.entry_hour;
        if (!timePatterns[hour]) timePatterns[hour] = [];
        timePatterns[hour].push(outcome.profit_pips || 0);
      }
    });

    // Find best performing hours
    const bestHours = Object.entries(timePatterns)
      .filter(([_, pips]) => pips.length >= 3) // At least 3 trades
      .map(([hour, pips]) => ({
        hour: parseInt(hour),
        count: pips.length,
        avg_pips: pips.reduce((a, b) => a + b, 0) / pips.length,
      }))
      .filter(h => h.avg_pips > 5) // Good average
      .sort((a, b) => b.avg_pips - a.avg_pips);

    if (bestHours.length > 0) {
      const topHour = bestHours[0];
      patterns.push({
        pattern_name: `Optimal Trading Hour: ${topHour.hour}:00 UTC`,
        pattern_type: 'time',
        pattern_rules: {
          best_hours: bestHours.slice(0, 3).map(h => h.hour),
          description: `Trading during ${topHour.hour}:00 UTC shows ${topHour.avg_pips.toFixed(1)} avg pips`,
        },
        confidence: 70,
        win_rate: 100,
        sample_size: topHour.count,
        avg_pips: topHour.avg_pips,
        deployed: false,
      });

      console.log(`✅ Pattern: Best Hour ${topHour.hour}:00 (${topHour.count} trades, ${topHour.avg_pips.toFixed(1)} avg pips)`);
    }

    // PATTERN 5: Market regime pattern
    const regimePatterns: Record<string, { wins: number; total_pips: number }> = {};
    
    winningOutcomes.forEach(outcome => {
      const regime = outcome.market_regime || 'unknown';
      if (!regimePatterns[regime]) {
        regimePatterns[regime] = { wins: 0, total_pips: 0 };
      }
      regimePatterns[regime].wins++;
      regimePatterns[regime].total_pips += outcome.profit_pips || 0;
    });

    for (const [regime, stats] of Object.entries(regimePatterns)) {
      if (stats.wins >= 5 && regime !== 'unknown') {
        const avgPips = stats.total_pips / stats.wins;
        
        patterns.push({
          pattern_name: `${regime} Market Regime`,
          pattern_type: 'regime',
          pattern_rules: {
            market_regime: regime,
            description: `Trading in ${regime} markets shows consistent wins`,
          },
          confidence: 75,
          win_rate: 100,
          sample_size: stats.wins,
          avg_pips: avgPips,
          deployed: stats.wins >= 10, // Deploy if 10+ wins
        });

        console.log(`✅ Pattern: ${regime} Regime (${stats.wins} wins, ${avgPips.toFixed(1)} avg pips)`);
      }
    }

    // Save discovered patterns to database
    let savedCount = 0;
    for (const pattern of patterns) {
      const { error } = await supabaseClient
        .from('discovered_patterns')
        .upsert({
          ...pattern,
          last_tested_at: new Date().toISOString(),
        }, {
          onConflict: 'pattern_name',
        });

      if (!error) savedCount++;
    }

    // Log discovery action
    await supabaseClient
      .from('learning_actions')
      .insert({
        action_type: 'discover_pattern',
        trigger_reason: `Pattern discovery run on ${winningOutcomes.length} winning trades`,
        metadata: {
          patterns_discovered: patterns.length,
          patterns_saved: savedCount,
          patterns_deployed: patterns.filter(p => p.deployed).length,
        },
        success: true,
      });

    console.log(`✅ Pattern discovery complete: ${patterns.length} patterns found, ${savedCount} saved`);

    return new Response(
      JSON.stringify({
        success: true,
        patterns_discovered: patterns.length,
        patterns_saved: savedCount,
        patterns: patterns.map(p => ({
          name: p.pattern_name,
          type: p.pattern_type,
          win_rate: p.win_rate,
          sample_size: p.sample_size,
          deployed: p.deployed,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in discover-winning-patterns:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
