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

    console.log('🔧 Starting entry price and P&L rebuild...');

    // Get all closed trades
    const { data: trades, error: tradesError } = await supabase
      .from('shadow_trades')
      .select('*')
      .eq('status', 'closed')
      .order('entry_time', { ascending: true });

    if (tradesError) throw tradesError;

    const results = {
      total: trades?.length || 0,
      corrected: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    };

    for (const trade of trades || []) {
      try {
        // Skip if entry price looks valid and P&L matches
        const expectedProfit = trade.profit_pips * trade.lot_size * 10.0;
        const profitMatches = Math.abs((trade.profit || 0) - expectedProfit) < 0.5;
        
        if (trade.entry_price > 0 && trade.entry_price < 10 && profitMatches) {
          results.skipped++;
          continue;
        }

        // Try to find accurate entry price from market data sources (in order of accuracy)
        let entryPrice = trade.entry_price;
        let dataSource = 'existing';
        
        const entryTime = new Date(trade.entry_time);
        const timeWindow = new Date(entryTime.getTime() - 120000); // 2 min before

        // Try market_data_feed first (most reliable real data)
        const { data: feedData } = await supabase
          .from('market_data_feed')
          .select('price, timestamp')
          .eq('symbol', trade.symbol)
          .gte('timestamp', timeWindow.toISOString())
          .lte('timestamp', entryTime.toISOString())
          .order('timestamp', { ascending: false })
          .limit(1);

        if (feedData && feedData.length > 0) {
          entryPrice = feedData[0].price;
          dataSource = 'market_data_feed';
        } else {
          // Try market_data_enhanced as fallback
          const { data: enhancedData } = await supabase
            .from('market_data_enhanced')
            .select('open_price, high_price, low_price, close_price, timestamp')
            .eq('symbol', trade.symbol)
            .gte('timestamp', timeWindow.toISOString())
            .lte('timestamp', entryTime.toISOString())
            .order('timestamp', { ascending: false })
            .limit(1);

          if (enhancedData && enhancedData.length > 0) {
            // Use average of OHLC as reasonable estimate
            const candle = enhancedData[0];
            entryPrice = (candle.open_price + candle.high_price + candle.low_price + candle.close_price) / 4;
            dataSource = 'market_data_enhanced';
          }
        }

        // Recalculate P&L
        const exitPrice = trade.exit_price || trade.entry_price;
        let profitPips = 0;
        
        if (trade.trade_type === 'buy') {
          profitPips = (exitPrice - entryPrice) / 0.0001;
        } else {
          profitPips = (entryPrice - exitPrice) / 0.0001;
        }

        const profit = profitPips * trade.lot_size * 10.0;
        const netProfit = profit - (trade.commission || 0) - (trade.swap || 0);

        // Update shadow_trades
        const { error: updateError } = await supabase
          .from('shadow_trades')
          .update({
            entry_price: entryPrice,
            profit_pips: profitPips,
            profit: netProfit,
            pnl: netProfit,
            updated_at: new Date().toISOString()
          })
          .eq('id', trade.id);

        if (updateError) throw updateError;

        // Update trade_history
        await supabase
          .from('trade_history')
          .update({
            execution_price: entryPrice,
            profit_pips: profitPips,
            profit: netProfit
          })
          .eq('original_trade_id', trade.id)
          .eq('action_type', 'close');

        results.corrected++;
        results.details.push({
          trade_id: trade.id,
          symbol: trade.symbol,
          old_entry: trade.entry_price,
          new_entry: entryPrice,
          old_profit: trade.profit,
          new_profit: netProfit,
          data_source: dataSource
        });

      } catch (error) {
        results.errors++;
        console.error(`Error processing trade ${trade.id}:`, error);
      }
    }

    console.log('✅ Rebuild complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Processed ${results.total} trades: ${results.corrected} corrected, ${results.skipped} skipped, ${results.errors} errors`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Rebuild failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
