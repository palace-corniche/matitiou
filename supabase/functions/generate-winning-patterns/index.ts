import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("🔍 Analyzing trade patterns...");

    // Analyze trade direction patterns
    const { data: directionStats, error: dirError } = await supabaseAdmin
      .from('shadow_trades')
      .select('trade_type, profit, profit_pips')
      .eq('status', 'closed');

    if (dirError) throw dirError;

    const patterns: any[] = [];

    if (directionStats && directionStats.length >= 5) {
      // Group by trade type
      const buyTrades = directionStats.filter(t => t.trade_type === 'buy');
      const sellTrades = directionStats.filter(t => t.trade_type === 'sell');

      // Calculate BUY pattern
      if (buyTrades.length >= 5) {
        const buyWins = buyTrades.filter(t => t.profit > 0).length;
        const buyWinRate = (buyWins / buyTrades.length) * 100;
        const buyAvgProfit = buyTrades.reduce((sum, t) => sum + t.profit, 0) / buyTrades.length;
        const buyAvgPips = buyTrades.reduce((sum, t) => sum + (t.profit_pips || 0), 0) / buyTrades.length;

        if (buyWinRate >= 60) {
          patterns.push({
            pattern_type: 'BUY Trade Direction',
            pattern_criteria: {
              trade_type: 'buy',
              min_trades: 5,
              threshold_win_rate: 60
            },
            win_rate: buyWinRate,
            sample_size: buyTrades.length,
            avg_profit: buyAvgProfit,
            avg_pips: buyAvgPips,
            is_active: true
          });
        }
      }

      // Calculate SELL pattern
      if (sellTrades.length >= 5) {
        const sellWins = sellTrades.filter(t => t.profit > 0).length;
        const sellWinRate = (sellWins / sellTrades.length) * 100;
        const sellAvgProfit = sellTrades.reduce((sum, t) => sum + t.profit, 0) / sellTrades.length;
        const sellAvgPips = sellTrades.reduce((sum, t) => sum + (t.profit_pips || 0), 0) / sellTrades.length;

        if (sellWinRate >= 60) {
          patterns.push({
            pattern_type: 'SELL Trade Direction',
            pattern_criteria: {
              trade_type: 'sell',
              min_trades: 5,
              threshold_win_rate: 60
            },
            win_rate: sellWinRate,
            sample_size: sellTrades.length,
            avg_profit: sellAvgProfit,
            avg_pips: sellAvgPips,
            is_active: true
          });
        }
      }
    }

    console.log(`✅ Identified ${patterns.length} winning patterns`);

    // Clear old patterns and insert new ones
    await supabaseAdmin
      .from('winning_patterns')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (patterns.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('winning_patterns')
        .insert(patterns);
      
      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        patterns_identified: patterns.length,
        patterns 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
