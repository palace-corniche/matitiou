import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

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

    console.log('🔄 Syncing aggregated_candles → market_data_enhanced...');

    // Get latest candles from aggregated_candles
    const { data: candles, error: fetchError } = await supabase
      .from('aggregated_candles')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(500);

    if (fetchError) throw fetchError;
    if (!candles || candles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, message: 'No candles to sync' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map to market_data_enhanced schema
    const enhanced = candles.map(c => ({
      symbol: c.symbol,
      timeframe: c.timeframe,
      timestamp: c.timestamp,
      open: c.open_price,
      high: c.high_price,
      low: c.low_price,
      close: c.close_price,
      close_price: c.close_price,
      volume: c.volume || 0,
      indicators: {},
    }));

    // Upsert into market_data_enhanced (avoid duplicates by symbol+timeframe+timestamp)
    // Delete old data first, then insert fresh
    const oldestTimestamp = candles[candles.length - 1].timestamp;
    
    await supabase
      .from('market_data_enhanced')
      .delete()
      .eq('symbol', 'EUR/USD')
      .gte('timestamp', oldestTimestamp);

    const { error: insertError } = await supabase
      .from('market_data_enhanced')
      .insert(enhanced);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log(`✅ Synced ${enhanced.length} candles to market_data_enhanced`);

    return new Response(
      JSON.stringify({ success: true, synced: enhanced.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error syncing market data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
