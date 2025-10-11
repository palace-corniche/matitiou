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

    console.log('🔄 Syncing global_trading_account from trade_history...');

    // Call the calculation function
    const { error: calcError } = await supabase.rpc('calculate_global_performance_metrics');

    if (calcError) {
      console.error('❌ Calculation error:', calcError);
      throw calcError;
    }

    // Get updated account state
    const { data: account, error: accountError } = await supabase
      .from('global_trading_account')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (accountError) throw accountError;

    console.log('✅ Global account synced:', {
      balance: account.balance,
      total_trades: account.total_trades,
      win_rate: account.win_rate,
    });

    return new Response(
      JSON.stringify({
        success: true,
        account,
        synced_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
