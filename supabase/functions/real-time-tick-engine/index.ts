import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TickData {
  symbol: string;
  timestamp: string;
  bid: number;
  ask: number;
  spread: number;
  tick_volume: number;
  data_source: string;
  session_type: string;
  is_live: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // DISABLED: This fake tick engine has been replaced with real market_data_feed
  return new Response(JSON.stringify({
    disabled: true,
    message: "Fake real-time tick engine disabled - system now uses real market_data_feed instead",
    timestamp: new Date().toISOString()
  }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
});

// ============= PHASE 1 & 2: MULTI-API REAL MARKET DATA =============

interface MarketDataAPI {
  name: string;
  url: string;
  priority: number;
  parseResponse: (response: any) => number | null;
}

const MARKET_DATA_APIS: MarketDataAPI[] = [
  {
    name: 'YahooFinance',
    url: 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=EURUSD=X',
    priority: 1,
    parseResponse: (data) => {
      try {
        const result = data?.quoteResponse?.result?.[0];
        const price = result?.regularMarketPrice;
        return (typeof price === 'number' && price > 0) ? price : null;
      } catch {
        return null;
      }
    }
  },
  {
    name: 'Frankfurter',
    url: 'https://api.frankfurter.dev/latest?from=EUR&to=USD',
    priority: 2,
    parseResponse: (data) => data?.rates?.USD || null
  },
  {
    name: 'ExchangeRate-API',
    url: 'https://api.exchangerate-api.com/v4/latest/EUR',
    priority: 3,
    parseResponse: (data) => data?.rates?.USD || null
  },
  {
    name: 'CurrencyAPI',
    url: 'https://api.currencyapi.com/v3/latest?apikey=free&currencies=USD&base_currency=EUR',
    priority: 4,
    parseResponse: (data) => data?.data?.USD?.value || null
  }
];

// ============= PHASE 3: SMART CACHING =============
let lastRealPrice: number | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 2000; // 2 seconds cache for near-real-time updates

async function fetchRealEURUSDPrice(): Promise<number | null> {
  const now = Date.now();
  
  // Return cached price if still fresh
  if (lastRealPrice && (now - lastFetchTime) < CACHE_DURATION) {
    console.log('📦 Using cached EUR/USD price:', lastRealPrice);
    return lastRealPrice;
  }

  console.log('🌐 Fetching fresh EUR/USD price from APIs...');

  // ============= PHASE 4: FAILOVER & REDUNDANCY =============
  for (const api of MARKET_DATA_APIS) {
    try {
      console.log(`🔍 Trying ${api.name}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const response = await fetch(api.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Trading-Bot/1.0',
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const price = api.parseResponse(data);
      
      if (price && price > 0) {
        lastRealPrice = price;
        lastFetchTime = now;
        console.log(`✅ Got real EUR/USD price from ${api.name}: ${price}`);
        return price;
      }
      
    } catch (error) {
      console.warn(`⚠️ ${api.name} failed:`, (error as Error).message);
      continue;
    }
  }
  
  console.warn('❌ All real APIs failed, using fallback');
  return null;
}

function isMarketOpen(): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const dayOfWeek = now.getUTCDay();
  
  // Market closed on weekends
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  
  // Market open 24/5, but very quiet outside main sessions
  // Consider market "open" during major trading sessions
  return (utcHour >= 0 && utcHour < 23); // Allow almost all hours except brief Sunday close
}

async function generateRealisticEURUSDTick(): Promise<TickData> {
  const now = new Date();
  const marketOpen = isMarketOpen();
  
  let midPrice: number;
  let dataSource: string;
  
  // ============= PHASE 5: ENHANCED REALISM =============
  if (marketOpen) {
    // Try to get real market price
    const realPrice = await fetchRealEURUSDPrice();
    
if (realPrice) {
      // Use the real price as-is (no artificial variance)
      midPrice = realPrice;
      dataSource = 'real_market_data';
      console.log(`📊 Using real market price: ${realPrice} → ${midPrice}`);
    } else {
      // Fallback to enhanced simulation using last known real price
      const basePrice = lastRealPrice || 1.7194; // Current market level
      const dailyVariance = (Math.random() - 0.5) * 0.004; // ±40 pips daily range
      const tickVariance = (Math.random() - 0.5) * 0.00005; // ±0.5 pips per tick
      midPrice = basePrice + dailyVariance + tickVariance;
      dataSource = 'enhanced_simulation';
      console.log(`🎯 Using enhanced simulation from base: ${basePrice} → ${midPrice}`);
    }
  } else {
    // Weekend/holiday - use simulation based on last known price
    const basePrice = lastRealPrice || 1.7194;
    const gapSize = (Math.random() - 0.5) * 0.001; // Small weekend gaps
    midPrice = basePrice + gapSize;
    dataSource = 'weekend_simulation';
    console.log(`🛌 Weekend mode - simulating from: ${basePrice} → ${midPrice}`);
  }
  
  // Apply realistic spreads based on trading session
  const spreadPips = getSpreadForSession(now);
  const spread = spreadPips * 0.0001;
  
  const bid = Number((midPrice - spread / 2).toFixed(5));
  const ask = Number((midPrice + spread / 2).toFixed(5));
  
  // Realistic volume based on session and time
  const baseVolume = getSessionVolume(now);
  const volumeVariance = Math.floor(Math.random() * 30);
  const tick_volume = baseVolume + volumeVariance;
  
  return {
    symbol: 'EUR/USD',
    timestamp: now.toISOString(),
    bid,
    ask,
    spread: Number(spread.toFixed(5)),
    tick_volume,
    data_source: dataSource,
    session_type: getSessionType(now),
    is_live: dataSource === 'real_market_data'
  };
}

function getSpreadForSession(timestamp: Date): number {
  const utcHour = timestamp.getUTCHours();
  const dayOfWeek = timestamp.getUTCDay();
  
  // Weekend spreads are wider
  if (dayOfWeek === 0 || dayOfWeek === 6) return 3.0;
  
  // London/NY overlap (13-17 UTC): Tightest spreads
  if (utcHour >= 13 && utcHour < 17) return 0.6;
  
  // London session (8-17 UTC): Tight spreads
  if (utcHour >= 8 && utcHour < 17) return 0.8;
  
  // New York session (13-22 UTC): Tight spreads  
  if (utcHour >= 13 && utcHour < 22) return 1.0;
  
  // Tokyo session (0-9 UTC): Medium spreads
  if (utcHour >= 0 && utcHour < 9) return 1.2;
  
  // Sydney session (22-7 UTC): Medium spreads
  if (utcHour >= 22 || utcHour < 7) return 1.5;
  
  // Off hours: Wider spreads
  return 2.5;
}

function getSessionVolume(timestamp: Date): number {
  const utcHour = timestamp.getUTCHours();
  const dayOfWeek = timestamp.getUTCDay();
  
  // Weekend volume is very low
  if (dayOfWeek === 0 || dayOfWeek === 6) return 5;
  
  // London/NY overlap: Highest volume
  if (utcHour >= 13 && utcHour < 17) return 40;
  
  // London session: High volume
  if (utcHour >= 8 && utcHour < 17) return 30;
  
  // New York session: High volume
  if (utcHour >= 13 && utcHour < 22) return 25;
  
  // Tokyo session: Medium volume
  if (utcHour >= 0 && utcHour < 9) return 20;
  
  // Sydney/Asian session: Lower volume
  if (utcHour >= 22 || utcHour < 7) return 15;
  
  // Off hours: Low volume
  return 10;
}

function getSessionType(timestamp: Date): string {
  const utcHour = timestamp.getUTCHours();
  
  if (utcHour >= 13 && utcHour < 17) return 'london_ny_overlap';
  if (utcHour >= 8 && utcHour < 17) return 'london';
  if (utcHour >= 13 && utcHour < 22) return 'new_york';
  if (utcHour >= 0 && utcHour < 9) return 'tokyo';
  if (utcHour >= 22 || utcHour < 7) return 'sydney';
  
  return 'off_hours';
}
