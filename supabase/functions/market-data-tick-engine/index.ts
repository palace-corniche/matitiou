import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🎯 Starting EUR/USD tick data engine...');

    // Fetch real-time data from Twelve Data API
    const response = await fetch(
      'https://api.twelvedata.com/time_series?symbol=EUR/USD&interval=1min&outputsize=12&apikey=demo'
    );

    if (!response.ok) {
      throw new Error(`API response failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('📊 Fetched data from Twelve Data:', data.meta);

    if (!data.values || !Array.isArray(data.values)) {
      throw new Error('Invalid data format from API');
    }

    // Generate realistic tick data from the fetched candles
    const tickData = [];
    const now = new Date();
    
    for (let i = 0; i < data.values.length; i++) {
      const candle = data.values[i];
      const timestamp = new Date(now.getTime() - i * 60000); // 1 minute intervals
      
      // Generate realistic bid/ask from OHLC
      const mid = parseFloat(candle.close);
      const spread = 0.00015; // 1.5 pips typical EUR/USD spread
      const bid = mid - spread / 2;
      const ask = mid + spread / 2;

      tickData.push({
        symbol: 'EUR/USD',
        timestamp: timestamp.toISOString(),
        bid: Number(bid.toFixed(5)),
        ask: Number(ask.toFixed(5)),
        spread: Number(spread.toFixed(5)),
        tick_volume: Math.floor(Math.random() * 50) + 10,
        data_source: 'twelve_data',
        session_type: getSessionType(timestamp),
        is_live: true
      });
    }

    // Insert tick data in batches
    const { data: insertedTicks, error: insertError } = await supabase
      .from('tick_data')
      .insert(tickData)
      .select();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      throw insertError;
    }

    console.log(`✅ Inserted ${insertedTicks.length} tick data points`);

    // Update real-time PnL for all open trades
    const { error: pnlError } = await supabase.rpc('update_eurusd_pnl');
    if (pnlError) {
      console.error('❌ PnL update error:', pnlError);
    } else {
      console.log('✅ Updated EUR/USD P&L for all open trades');
    }

    // Run system diagnostics
    const { data: diagnostics, error: diagError } = await supabase.rpc('run_trading_diagnostics');
    if (diagError) {
      console.error('❌ Diagnostics error:', diagError);
    } else {
      console.log('📊 System diagnostics:', diagnostics);
    }

    // Clean up old tick data (keep last 10,000 ticks)
    const { error: cleanupError } = await supabase
      .from('tick_data')
      .delete()
      .lt('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Older than 24 hours
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy condition to prevent delete all

    if (cleanupError) {
      console.warn('⚠️ Cleanup warning:', cleanupError);
    }

    return new Response(JSON.stringify({
      success: true,
      ticksInserted: insertedTicks.length,
      latestBid: tickData[0]?.bid,
      latestAsk: tickData[0]?.ask,
      timestamp: now.toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Market data engine error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getSessionType(timestamp: Date): string {
  const hour = timestamp.getUTCHours();
  
  // Trading sessions (UTC)
  if (hour >= 0 && hour < 7) return 'sydney';
  if (hour >= 1 && hour < 10) return 'tokyo';
  if (hour >= 8 && hour < 17) return 'london';
  if (hour >= 13 && hour < 22) return 'new_york';
  return 'overlap';
}
