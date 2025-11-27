import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🎯 Checking for stop loss and take profit hits...')

    // Get current market price
    const { data: priceData, error: priceError } = await supabase
      .from('market_data_feed')
      .select('price')
      .eq('symbol', 'EUR/USD')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    if (priceError || !priceData) {
      console.error('❌ No market price available')
      throw new Error('No market price available')
    }

    const currentPrice = priceData.price
    console.log(`📊 Current EUR/USD price: ${currentPrice}`)

    // Get all open trades with SL or TP
    const { data: openTrades, error: tradesError } = await supabase
      .from('shadow_trades')
      .select('*')
      .eq('status', 'open')
      .or('stop_loss.not.is.null,take_profit.not.is.null')

    if (tradesError) throw tradesError

    if (!openTrades || openTrades.length === 0) {
      console.log('✅ No open trades with SL/TP to check')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No trades to check',
          checked: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔍 Checking ${openTrades.length} open trades...`)

    let closedCount = 0
    const results = []

    for (const trade of openTrades) {
      let shouldClose = false
      let closeReason = ''

      // Update exit check count
      await supabase
        .from('shadow_trades')
        .update({ exit_check_count: (trade.exit_check_count || 0) + 1 })
        .eq('id', trade.id)

      // **TIME-BASED EXIT: Force close after 3 hours**
      const entryTime = new Date(trade.entry_time).getTime()
      const currentTime = Date.now()
      const holdingHours = (currentTime - entryTime) / (1000 * 60 * 60)
      
      if (holdingHours >= 3) {
        shouldClose = true
        closeReason = 'max_hold_time_reached'
        console.log(`⏰ Trade ${trade.id} held for ${holdingHours.toFixed(1)}h - forcing exit`)
      }

      // Check stop loss
      if (trade.stop_loss) {
        if (trade.trade_type === 'buy' && currentPrice <= trade.stop_loss) {
          shouldClose = true
          closeReason = 'stop_loss_hit'
          console.log(`🛑 BUY trade ${trade.id} hit SL: ${currentPrice} <= ${trade.stop_loss}`)
        } else if (trade.trade_type === 'sell' && currentPrice >= trade.stop_loss) {
          shouldClose = true
          closeReason = 'stop_loss_hit'
          console.log(`🛑 SELL trade ${trade.id} hit SL: ${currentPrice} >= ${trade.stop_loss}`)
        }
      }

      // Check take profit
      if (!shouldClose && trade.take_profit) {
        if (trade.trade_type === 'buy' && currentPrice >= trade.take_profit) {
          shouldClose = true
          closeReason = 'take_profit_hit'
          console.log(`✅ BUY trade ${trade.id} hit TP: ${currentPrice} >= ${trade.take_profit}`)
        } else if (trade.trade_type === 'sell' && currentPrice <= trade.take_profit) {
          shouldClose = true
          closeReason = 'take_profit_hit'
          console.log(`✅ SELL trade ${trade.id} hit TP: ${currentPrice} <= ${trade.take_profit}`)
        }
      }

      if (shouldClose) {
        // Close the trade using the database function
        const { data: closeResult, error: closeError } = await supabase
          .rpc('close_shadow_trade', {
            p_trade_id: trade.id,
            p_close_price: currentPrice,
            p_close_lot_size: trade.lot_size,
            p_close_reason: closeReason
          })

        if (closeError) {
          console.error(`❌ Error closing trade ${trade.id}:`, closeError)
          results.push({
            trade_id: trade.id,
            success: false,
            error: closeError.message
          })
        } else {
          console.log(`✅ Trade ${trade.id} closed: ${closeReason}`)
          closedCount++
          results.push({
            trade_id: trade.id,
            success: true,
            reason: closeReason,
            close_price: currentPrice,
            pnl: closeResult.pnl
          })
        }
      }
    }

    console.log(`✅ Exit check complete: ${closedCount} trades closed out of ${openTrades.length}`)

    return new Response(
      JSON.stringify({
        success: true,
        checked: openTrades.length,
        closed: closedCount,
        current_price: currentPrice,
        results,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Fatal error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
