import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tradeId, reason } = await req.json();
    
    console.log(`🧪 Manual test: Closing trade ${tradeId}`);

    // Get current market price
    const { data: marketData } = await supabaseClient
      .from('market_data_feed')
      .select('price')
      .eq('symbol', 'EUR/USD')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    const closePrice = marketData?.price || 1.15851;

    // Close the trade using RPC
    const { data: result, error } = await supabaseClient
      .rpc('close_shadow_trade', {
        p_trade_id: tradeId,
        p_close_price: closePrice,
        p_close_lot_size: 0.01,
        p_close_reason: reason || 'Manual test closure'
      });

    if (error) throw error;

    console.log(`✅ Trade closed successfully. Waiting for learning pipeline...`);

    // Wait a moment for trigger to fire
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if learning outcome was created
    const { data: outcome } = await supabaseClient
      .from('learning_outcomes')
      .select('*')
      .eq('trade_id', tradeId)
      .single();

    console.log(`📊 Learning outcome:`, outcome ? 'Created ✅' : 'Not yet created ⏳');

    return new Response(
      JSON.stringify({
        success: true,
        trade_closed: result,
        close_price: closePrice,
        learning_outcome_created: !!outcome,
        outcome: outcome,
        message: 'Trade closed successfully. Learning pipeline triggered.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error closing trade:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
