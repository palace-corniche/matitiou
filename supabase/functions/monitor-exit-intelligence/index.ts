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

    console.log('🧠 Running intelligent exit analysis...')

    // Get open trades that have been open for at least 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    const { data: openTrades, error: tradesError } = await supabase
      .from('shadow_trades')
      .select('*')
      .eq('status', 'open')
      .lt('entry_time', fiveMinutesAgo)

    if (tradesError) throw tradesError

    if (!openTrades || openTrades.length === 0) {
      console.log('✅ No eligible trades for exit analysis')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No trades to analyze',
          analyzed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔍 Analyzing ${openTrades.length} trades for intelligent exits...`)

    let analyzedCount = 0
    let exitedCount = 0
    const results = []

    for (const trade of openTrades) {
      try {
        // Call the intelligent exit engine
        const { data: exitAnalysis, error: exitError } = await supabase.functions.invoke(
          'intelligent-exit-engine',
          {
            body: { 
              tradeId: trade.id,
              currentPrice: trade.current_price || trade.entry_price,
              force_analysis: true
            }
          }
        )

        if (exitError) {
          console.error(`❌ Error analyzing trade ${trade.id}:`, exitError)
          continue
        }

        if (!exitAnalysis?.exitIntelligence) {
          console.error(`❌ Invalid exit analysis response for trade ${trade.id}`)
          continue
        }

        // Store exit intelligence in database
        const { error: insertError } = await supabase
          .from('exit_intelligence')
          .insert({
            trade_id: trade.id,
            overall_score: exitAnalysis.exitIntelligence.overallExitScore,
            recommendation: exitAnalysis.exitIntelligence.recommendation,
            reasoning: exitAnalysis.exitIntelligence.reasoning,
            confidence: exitAnalysis.exitIntelligence.overallExitScore / 100,
            factors: exitAnalysis.exitIntelligence.factors,
            check_timestamp: new Date().toISOString(),
            holding_time_minutes: Math.floor((Date.now() - new Date(trade.entry_time).getTime()) / 60000)
          })

        if (insertError) {
          console.error(`❌ Error storing exit intelligence for trade ${trade.id}:`, insertError)
        }

        analyzedCount++
        console.log(`📊 Trade ${trade.id} analysis: ${exitAnalysis.exitIntelligence.recommendation} (score: ${exitAnalysis.exitIntelligence.overallExitScore.toFixed(1)})`)

        // If recommendation is FORCE_EXIT, close the trade
        if (exitAnalysis.exitIntelligence.recommendation === 'FORCE_EXIT') {
          const currentPrice = trade.current_price || trade.entry_price

          console.log(`🔴 FORCE EXIT triggered for trade ${trade.id} at ${currentPrice}`)

          const { data: closeResult, error: closeError } = await supabase
            .rpc('close_shadow_trade', {
              p_trade_id: trade.id,
              p_close_price: currentPrice,
              p_close_lot_size: trade.lot_size,
              p_close_reason: 'intelligent_exit'
            })

          if (closeError) {
            console.error(`❌ Error closing trade ${trade.id}:`, closeError)
          } else {
            // Update trade with exit intelligence info
            await supabase
              .from('shadow_trades')
              .update({
                intelligence_exit_triggered: true,
                exit_confidence: exitAnalysis.exitIntelligence.overallExitScore / 100,
                exit_intelligence_score: exitAnalysis.exitIntelligence.overallExitScore,
                exit_reasoning: exitAnalysis.exitIntelligence.reasoning
              })
              .eq('id', trade.id)

            exitedCount++
            console.log(`✅ Trade ${trade.id} closed via intelligent exit`)

            // Send Telegram notification (fire-and-forget)
            try {
              const pnlValue = closeResult?.pnl ?? 0;
              const pipsValue = closeResult?.pips ?? 0;
              const pnlEmoji = pnlValue >= 0 ? '💰' : '📉';
              const telegramMsg = `📊 <b>TRADE CLOSED</b>\nType: ${trade.trade_type.toUpperCase()}\nEntry: ${trade.entry_price} → Exit: ${currentPrice}\nReason: 🧠 Intelligent Exit\n${pnlEmoji} PnL: $${pnlValue.toFixed(2)} (${pipsValue.toFixed(1)} pips)\nConfidence: ${(exitAnalysis.exitIntelligence.overallExitScore).toFixed(0)}%`;
              await supabase.functions.invoke('send-telegram-notification', {
                body: { message: telegramMsg }
              });
            } catch (tgErr) {
              console.warn('⚠️ Telegram notification failed:', tgErr);
            }

            results.push({
              trade_id: trade.id,
              action: 'closed',
              reason: exitAnalysis.exitIntelligence.reasoning,
              confidence: exitAnalysis.exitIntelligence.overallExitScore / 100,
              pnl: closeResult.pnl
            })
          }
        } else {
          results.push({
            trade_id: trade.id,
            action: 'hold',
            recommendation: exitAnalysis.exitIntelligence.recommendation,
            confidence: exitAnalysis.exitIntelligence.overallExitScore / 100,
            score: exitAnalysis.exitIntelligence.overallExitScore
          })
        }

      } catch (error) {
        console.error(`❌ Error processing trade ${trade.id}:`, error)
        continue
      }
    }

    console.log(`✅ Exit intelligence complete: ${analyzedCount} analyzed, ${exitedCount} exited`)

    return new Response(
      JSON.stringify({
        success: true,
        analyzed: analyzedCount,
        exited: exitedCount,
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
