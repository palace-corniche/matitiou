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
              trade_id: trade.id,
              force_analysis: true
            }
          }
        )

        if (exitError) {
          console.error(`❌ Error analyzing trade ${trade.id}:`, exitError)
          continue
        }

        analyzedCount++
        console.log(`📊 Trade ${trade.id} analysis:`, exitAnalysis.recommendation)

        // If recommendation is FORCE_EXIT, close the trade
        if (exitAnalysis.recommendation === 'FORCE_EXIT') {
          const currentPrice = exitAnalysis.recommended_exit_price || trade.current_price

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
                exit_confidence: exitAnalysis.confidence,
                exit_intelligence_score: exitAnalysis.overall_score,
                exit_reasoning: exitAnalysis.reasoning
              })
              .eq('id', trade.id)

            exitedCount++
            console.log(`✅ Trade ${trade.id} closed via intelligent exit`)
            
            results.push({
              trade_id: trade.id,
              action: 'closed',
              reason: exitAnalysis.reasoning,
              confidence: exitAnalysis.confidence,
              pnl: closeResult.pnl
            })
          }
        } else {
          results.push({
            trade_id: trade.id,
            action: 'hold',
            recommendation: exitAnalysis.recommendation,
            confidence: exitAnalysis.confidence,
            score: exitAnalysis.overall_score
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
