import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type CleanupAction = 'diagnose' | 'purge_non_real' | 'purge_all_simulated' | 'purge_legacy_live';

interface CleanupRequestBody {
  symbol?: string;
  action?: CleanupAction;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const body = (await req.json().catch(() => ({}))) as CleanupRequestBody
    const symbol = body.symbol || 'EUR/USD'
    const action: CleanupAction = body.action || 'purge_non_real'

    // Helper to count rows for a given filter
    async function countBy(filter: Record<string, string | boolean>) {
      const { count, error } = await supabase
        .from('tick_data')
        .select('*', { count: 'exact', head: true })
        .match({ symbol, ...filter })

      if (error) throw error
      return count || 0
    }

    // Gather diagnostics
    const [realCount, liveEngineCount, enhancedCount, weekendCount] = await Promise.all([
      countBy({ data_source: 'real_market_data' }),
      countBy({ data_source: 'live_engine' }),
      countBy({ data_source: 'enhanced_simulation' }),
      countBy({ data_source: 'weekend_simulation' }),
    ])

    // Fetch latest tick for quick context
    const { data: latestTick } = await supabase
      .from('tick_data')
      .select('*')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    const diagnostics = {
      symbol,
      counts: {
        real_market_data: realCount,
        live_engine: liveEngineCount,
        enhanced_simulation: enhancedCount,
        weekend_simulation: weekendCount,
      },
      latestTick,
    }

    let deleted = 0
    let details: Record<string, number> = {}

    if (action === 'purge_non_real' || action === 'purge_all_simulated') {
      const toDeleteSources = ['live_engine', 'enhanced_simulation']
      if (action === 'purge_all_simulated') {
        toDeleteSources.push('weekend_simulation')
      }

      // Delete and return count
      const { data: deletedRows, error: delErr } = await supabase
        .from('tick_data')
        .delete()
        .eq('symbol', symbol)
        .in('data_source', toDeleteSources)
        .select('id, data_source')

      if (delErr) throw delErr

      deleted = deletedRows?.length || 0

      // Aggregate deletion details
      details = deletedRows?.reduce((acc: Record<string, number>, row: any) => {
        acc[row.data_source] = (acc[row.data_source] || 0) + 1
        return acc
      }, {}) || {}
    } else if (action === 'purge_legacy_live') {
      console.log('🧹 Purging legacy "live" non-real ticks for', symbol);
      
      // Delete ticks marked as is_live=true but are NOT from real_market_data
      const { data: deletedRows, error: delErr } = await supabase
        .from('tick_data')
        .delete()
        .eq('symbol', symbol)
        .eq('is_live', true)
        .neq('data_source', 'real_market_data')
        .select('id, data_source');
      
      if (delErr) throw delErr;
      
      deleted = deletedRows?.length || 0;
      details = { 'legacy_live': deleted };
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        diagnostics,
        deleted,
        details,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err: any) {
    console.error('❌ Cleanup function error:', err)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})