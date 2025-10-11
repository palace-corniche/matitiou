import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔄 Starting trade_history backfill for orphan trades...');

    // Get latest balance_after for global portfolio
    const { data: latestHistory } = await supabase
      .from('trade_history')
      .select('balance_after, equity_after')
      .eq('portfolio_id', '00000000-0000-0000-0000-000000000001')
      .order('execution_time', { ascending: false })
      .limit(1)
      .single();

    let runningBalance = latestHistory?.balance_after ?? 100000;
    let runningEquity = latestHistory?.equity_after ?? 100000;

    console.log(`📊 Starting balance: ${runningBalance}`);

    // Get orphan closed trades without trade_history (non-zero PnL only)
    const { data: orphans, error: orphanError } = await supabase
      .from('shadow_trades')
      .select('*')
      .eq('status', 'closed')
      .neq('pnl', 0)
      .order('exit_time', { ascending: true });

    if (orphanError) throw orphanError;

    // Filter out trades that already have trade_history
    const { data: existingHistory } = await supabase
      .from('trade_history')
      .select('original_trade_id')
      .in('action_type', ['close', 'partial_close']);

    const existingIds = new Set(existingHistory?.map(h => h.original_trade_id) ?? []);
    const trueOrphans = orphans?.filter(t => !existingIds.has(t.id)) ?? [];

    console.log(`📋 Found ${trueOrphans.length} orphan trades to backfill`);

    const backfilled = [];

    for (const trade of trueOrphans) {
      const commission = trade.commission ?? 0;
      const swap = trade.swap ?? 0;
      const netProfit = (trade.pnl ?? 0) - commission - swap;

      const balanceBefore = runningBalance;
      const equityBefore = runningEquity;
      const balanceAfter = runningBalance + netProfit;
      const equityAfter = runningEquity + netProfit;

      const { error: insertError } = await supabase
        .from('trade_history')
        .insert({
          portfolio_id: '00000000-0000-0000-0000-000000000001',
          original_trade_id: trade.id,
          action_type: 'close',
          symbol: trade.symbol,
          trade_type: trade.trade_type,
          lot_size: trade.lot_size,
          execution_price: trade.exit_price ?? trade.entry_price,
          profit: netProfit,
          profit_pips: trade.profit_pips ?? 0,
          commission,
          swap,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          equity_before: equityBefore,
          equity_after: equityAfter,
          execution_time: trade.exit_time ?? new Date().toISOString(),
        });

      if (insertError) {
        console.error(`❌ Failed to backfill trade ${trade.id}:`, insertError);
      } else {
        console.log(`✅ Backfilled trade ${trade.id}: ${netProfit.toFixed(2)}`);
        backfilled.push({
          trade_id: trade.id,
          symbol: trade.symbol,
          profit: netProfit,
          pips: trade.profit_pips,
        });
        runningBalance = balanceAfter;
        runningEquity = equityAfter;
      }
    }

    console.log(`✅ Backfill complete: ${backfilled.length} trades added`);

    return new Response(
      JSON.stringify({
        success: true,
        backfilled_count: backfilled.length,
        trades: backfilled,
        final_balance: runningBalance,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Backfill error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
