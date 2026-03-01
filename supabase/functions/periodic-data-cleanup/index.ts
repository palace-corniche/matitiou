// Phase 4: Periodic Data Cleanup Function
// Automatically cleans up orphaned data and prevents accumulation

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("🧹 Starting periodic data cleanup...");
    const results: Record<string, number> = {};

    // 1. Delete old executed/rejected master_signals (keep last 3 days)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { count: oldSignals } = await supabase
      .from('master_signals')
      .delete({ count: 'exact' })
      .in('status', ['executed', 'rejected', 'expired'])
      .lt('created_at', threeDaysAgo);
    results.master_signals_deleted = oldSignals || 0;

    // 2. Delete old exit_intelligence (keep last 3 days)
    const { count: oldExitIntel } = await supabase
      .from('exit_intelligence')
      .delete({ count: 'exact' })
      .lt('created_at', threeDaysAgo);
    results.exit_intelligence_deleted = oldExitIntel || 0;

    // 3. Delete old learning_actions (keep last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: oldLearning } = await supabase
      .from('learning_actions')
      .delete({ count: 'exact' })
      .lt('created_at', sevenDaysAgo);
    results.learning_actions_deleted = oldLearning || 0;

    // 4. Delete old aggregated_candles (keep last 7 days)
    const { count: oldCandles } = await supabase
      .from('aggregated_candles')
      .delete({ count: 'exact' })
      .lt('created_at', sevenDaysAgo);
    results.aggregated_candles_deleted = oldCandles || 0;

    // 5. Delete old market_data_feed (keep last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: oldMarketData } = await supabase
      .from('market_data_feed')
      .delete({ count: 'exact' })
      .lt('created_at', oneDayAgo);
    results.market_data_feed_deleted = oldMarketData || 0;

    // 6. Delete old signal_rejection_logs (keep last 3 days)
    const { count: oldRejections } = await supabase
      .from('signal_rejection_logs')
      .delete({ count: 'exact' })
      .lt('created_at', threeDaysAgo);
    results.signal_rejection_logs_deleted = oldRejections || 0;

    // 7. Delete old master_signals_fusion (keep last 3 days)
    const { count: oldFusion } = await supabase
      .from('master_signals_fusion')
      .delete({ count: 'exact' })
      .lt('created_at', threeDaysAgo);
    results.master_signals_fusion_deleted = oldFusion || 0;

    // 8. Delete old closed trades (keep last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: oldClosedTrades } = await supabase
      .from('shadow_trades')
      .delete({ count: 'exact' })
      .eq('status', 'closed')
      .lt('created_at', thirtyDaysAgo);
    results.old_closed_trades_deleted = oldClosedTrades || 0;

    // 9. Delete old learning_outcomes (keep last 30 days)
    const { count: oldOutcomes } = await supabase
      .from('learning_outcomes')
      .delete({ count: 'exact' })
      .lt('created_at', thirtyDaysAgo);
    results.learning_outcomes_deleted = oldOutcomes || 0;

    // 10. Clean up stale function_execution_locks (older than 10 min)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: staleLocks } = await supabase
      .from('function_execution_locks')
      .delete({ count: 'exact' })
      .lt('locked_at', tenMinAgo);
    results.stale_locks_deleted = staleLocks || 0;

    // 11. Close duplicate open trades (keep oldest)
    const { data: openTrades } = await supabase
      .from('shadow_trades')
      .select('id, symbol, trade_type, entry_price, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: true });

    let duplicatesRemoved = 0;
    if (openTrades && openTrades.length > 1) {
      const seen = new Map<string, string>();
      for (const trade of openTrades) {
        const key = `${trade.symbol}-${trade.trade_type}-${Math.round(trade.entry_price * 10000)}`;
        if (seen.has(key)) {
          // Close duplicate
          await supabase
            .from('shadow_trades')
            .update({
              status: 'closed',
              exit_price: trade.entry_price,
              exit_time: new Date().toISOString(),
              exit_reason: 'manual',
              pnl: 0,
              profit_pips: 0,
              updated_at: new Date().toISOString()
            })
            .eq('id', trade.id);
          duplicatesRemoved++;
        } else {
          seen.set(key, trade.id);
        }
      }
    }
    results.duplicate_trades_closed = duplicatesRemoved;

    const totalCleaned = Object.values(results).reduce((a, b) => a + b, 0);
    console.log(`✅ Cleanup complete. Total records cleaned: ${totalCleaned}`);
    console.log('📊 Details:', results);

    return new Response(JSON.stringify({
      success: true,
      message: `Cleanup complete: ${totalCleaned} records processed`,
      details: results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
