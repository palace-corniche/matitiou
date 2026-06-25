// Periodically purges unrealistic closed trades (|pips| > 200 on EUR/USD)
// and rebuilds the global account stats so insights reflect realistic history only.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: cleanRes, error: cleanErr } = await supabase.rpc('clean_unrealistic_trades');
    if (cleanErr) throw cleanErr;

    let rebuildRes: any = null;
    const deleted = (cleanRes as any)?.deleted ?? 0;
    if (deleted > 0) {
      const { data, error } = await supabase.rpc('rebuild_global_account_stats', { p_starting_balance: 100 });
      if (error) throw error;
      rebuildRes = data;
    }

    console.log(`🧹 cleanup-unrealistic-trades: deleted=${deleted}`, rebuildRes);

    return new Response(
      JSON.stringify({ success: true, deleted, rebuilt: rebuildRes, ts: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('cleanup-unrealistic-trades error:', err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
