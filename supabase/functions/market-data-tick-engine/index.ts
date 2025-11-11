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

  // DISABLED: This fake tick engine has been replaced with real market_data_feed
  return new Response(JSON.stringify({
    disabled: true,
    message: "Fake tick engine disabled - system now uses real market_data_feed instead",
    timestamp: new Date().toISOString()
  }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
});

function generateRealisticTickData() {
  const now = new Date();
  const tickData = [];
  
  // Base EUR/USD price around current market levels
  const basePrice = 1.17000 + (Math.random() * 0.01); // 1.1700 - 1.1800 range
  
  // Generate 20 ticks with realistic price movement
  for (let i = 0; i < 20; i++) {
    const timestamp = new Date(now.getTime() - i * 3000); // 3-second intervals
    
    // Create realistic price movement (-5 to +5 pips)
    const priceMov = (Math.random() - 0.5) * 0.0005; // ±5 pips
    const currentPrice = basePrice + priceMov;
    
    // EUR/USD spread: 1.5-2.5 pips during normal sessions
    const sessionSpread = getSpreadForSession(timestamp);
    const spread = sessionSpread * 0.0001; // Convert pips to price
    
    const bid = Number((currentPrice - spread / 2).toFixed(5));
    const ask = Number((currentPrice + spread / 2).toFixed(5));

    tickData.push({
      symbol: 'EUR/USD',
      timestamp: timestamp.toISOString(),
      bid: bid,
      ask: ask,
      spread: Number(spread.toFixed(5)),
      tick_volume: Math.floor(Math.random() * 100) + 20, // 20-120 volume
      data_source: 'synthetic_mt4',
      session_type: getSessionType(timestamp),
      is_live: true
    });
  }
  
  return tickData.reverse(); // Oldest first
}

function getSpreadForSession(timestamp: Date): number {
  const hour = timestamp.getUTCHours();
  
  // London session (8-17 UTC): tight spreads
  if (hour >= 8 && hour < 17) return 1.5;
  
  // New York session (13-22 UTC): tight spreads
  if (hour >= 13 && hour < 22) return 1.5;
  
  // Tokyo session (1-10 UTC): medium spreads
  if (hour >= 1 && hour < 10) return 2.0;
  
  // Sydney session (22-7 UTC): wider spreads
  if (hour >= 22 || hour < 7) return 2.5;
  
  // Off-market hours: very wide spreads
  return 3.0;
}

function getSessionType(timestamp: Date): string {
  const hour = timestamp.getUTCHours();
  
  // Trading sessions (UTC)
  if (hour >= 22 || hour < 7) return 'sydney';
  if (hour >= 1 && hour < 10) return 'tokyo';
  if (hour >= 8 && hour < 17) return 'london';
  if (hour >= 13 && hour < 22) return 'new_york';
  
  // Overlap sessions
  if (hour >= 8 && hour < 10) return 'tokyo_london';
  if (hour >= 13 && hour < 17) return 'london_new_york';
  
  return 'off_market';
}
