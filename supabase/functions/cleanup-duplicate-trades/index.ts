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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🧹 Starting duplicate trade cleanup...');

    // Find all duplicate groups (same entry price, symbol, trade type)
    const { data: duplicateGroups, error: fetchError } = await supabase
      .from('shadow_trades')
      .select('symbol, trade_type, entry_price, id, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: true }); // Keep oldest trade

    if (fetchError) {
      throw fetchError;
    }

    if (!duplicateGroups?.length) {
      console.log('✅ No trades found to process');
      return new Response(
        JSON.stringify({ success: true, message: 'No trades to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group trades by entry criteria
    const groups = new Map();
    duplicateGroups.forEach(trade => {
      const key = `${trade.symbol}-${trade.trade_type}-${trade.entry_price}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(trade);
    });

    let tradesRemoved = 0;
    let duplicateGroupsFound = 0;

    // Process each group and keep only the first (oldest) trade
    for (const [key, trades] of groups) {
      if (trades.length > 1) {
        duplicateGroupsFound++;
        const keepTrade = trades[0]; // Keep oldest
        const removeTrades = trades.slice(1); // Remove newer duplicates
        
        console.log(`🎯 Found ${trades.length} duplicate trades for ${key}`);
        console.log(`✅ Keeping trade ${keepTrade.id} (${keepTrade.created_at})`);
        
        for (const trade of removeTrades) {
          console.log(`🗑️ Removing duplicate trade ${trade.id} (${trade.created_at})`);
          
          // Close the duplicate trade with zero P&L (using 'manual' exit_reason as allowed by constraint)
          const { error: closeError } = await supabase
            .from('shadow_trades')
            .update({
              status: 'closed',
              exit_price: trade.entry_price,
              exit_time: new Date().toISOString(),
              exit_reason: 'manual', // Using 'manual' as allowed by shadow_trades_exit_reason_check constraint
              pnl: 0,
              pnl_percent: 0,
              profit_pips: 0,
              updated_at: new Date().toISOString()
            })
            .eq('id', trade.id);

          if (closeError) {
            console.error(`❌ Error closing trade ${trade.id}:`, closeError);
          } else {
            tradesRemoved++;
            console.log(`✅ Closed duplicate trade ${trade.id}`);
          }
        }
      }
    }

    // Reset global trading account margin state
    console.log('🔄 Resetting global trading account margin state...');
    
    // Get current open trades after cleanup
    const { data: remainingTrades } = await supabase
      .from('shadow_trades')
      .select('margin_required, lot_size')
      .eq('status', 'open');

    const totalMargin = remainingTrades?.reduce((sum, trade) => 
      sum + parseFloat(trade.margin_required?.toString() || '0'), 0) || 0;

    // Update global trading account
    const { error: updateError } = await supabase
      .from('global_trading_account')
      .update({
        used_margin: totalMargin,
        free_margin: 100000 - totalMargin,
        margin_level: totalMargin > 0 ? (100000 / totalMargin) * 100 : 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', '00000000-0000-0000-0000-000000000001');

    if (updateError) {
      console.error('❌ Error updating global account:', updateError);
    } else {
      console.log('✅ Global trading account margin state reset');
    }

    console.log(`🎉 Cleanup completed: ${tradesRemoved} duplicate trades removed from ${duplicateGroupsFound} groups`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleanup completed successfully`,
        duplicateGroupsFound,
        tradesRemoved,
        totalMarginAfterCleanup: totalMargin,
        remainingOpenTrades: remainingTrades?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in cleanup-duplicate-trades:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
