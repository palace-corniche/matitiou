import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketDataPoint {
  symbol: string;
  timeframe: string;
  price: number;
  open_price: number;
  high_price: number;
  low_price: number;
  volume?: number;
  timestamp: string;
  data_source: string;
  is_live: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let processedItems = 0;
  let status = 'success';
  let errorMessage = '';

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Starting market data fetch...');

    // Twelve Data API configuration
    const TWELVE_DATA_API_KEY = 'demo';
    const BASE_URL = 'https://api.twelvedata.com';
    const symbol = 'EUR/USD';
    const timeframes = ['15min', '1h', '4h', '1day'];

    const marketData: MarketDataPoint[] = [];

    // Fetch data for each timeframe
    for (const timeframe of timeframes) {
      try {
        const url = `${BASE_URL}/time_series?symbol=${symbol}&interval=${timeframe}&outputsize=50&apikey=${TWELVE_DATA_API_KEY}`;
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.code && data.code !== 200) {
          console.warn(`API error for ${timeframe}:`, data.message);
          continue;
        }
        
        if (!data.values || !Array.isArray(data.values)) {
          console.warn(`Invalid data format for ${timeframe}`);
          continue;
        }

        // Process the most recent candles (limit to 10 for efficiency)
        const recentCandles = data.values.slice(0, 10);
        
        for (let i = 0; i < recentCandles.length; i++) {
          const candle = recentCandles[i];
          
          // Map API timeframes to database format
          let dbTimeframe = timeframe;
          if (timeframe === '15min') dbTimeframe = '15m';
          else if (timeframe === '1h') dbTimeframe = 'H1';
          else if (timeframe === '4h') dbTimeframe = 'H4';
          else if (timeframe === '1day') dbTimeframe = 'D1';
          
          // For live/recent data, use current server time to avoid timezone issues
          // CRITICAL FIX: Clamp future timestamps to prevent "negative age" errors
          const isRecent = i === 0; // Most recent candle
          const now = new Date();
          const parsedTime = new Date(candle.datetime + 'Z'); // Force UTC with 'Z'
          
          // If timestamp is more than 1 minute in the future, clamp it to now
          const candleTimestamp = isRecent ? now.toISOString() : 
            (parsedTime > new Date(now.getTime() + 60000) ? now.toISOString() : parsedTime.toISOString());
          
          marketData.push({
            symbol,
            timeframe: dbTimeframe,
            price: parseFloat(candle.close),
            open_price: parseFloat(candle.open),
            high_price: parseFloat(candle.high),
            low_price: parseFloat(candle.low),
            volume: candle.volume ? parseInt(candle.volume) : undefined,
            timestamp: candleTimestamp,
            data_source: 'twelve_data',
            is_live: isRecent
          });
          processedItems++;
          
          console.log(`📊 ${dbTimeframe} candle: price=${candle.close}, time=${candleTimestamp}, is_live=${isRecent}`);
        }

        console.log(`✅ Fetched ${recentCandles.length} candles for ${timeframe}`);
        
        // Add a small delay between API calls to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error fetching ${timeframe} data:`, error);
        
        // Generate mock data as fallback
        const mockData = generateMockData(symbol, timeframe);
        marketData.push(...mockData);
        processedItems += mockData.length;
        console.log(`🎭 Generated ${mockData.length} mock candles for ${timeframe}`);
      }
    }

    // Clear ALL old data to start fresh (was keeping 24 hours, now clearing everything)
    console.log('🧹 Clearing all old market_data_feed data...');
    const { error: deleteError } = await supabase
      .from('market_data_feed')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy condition to allow delete all
    
    if (deleteError) {
      console.warn('Error cleaning old data:', deleteError);
    } else {
      console.log('✅ Cleared all old market data');
    }

    // Insert new market data
    if (marketData.length > 0) {
      // Use upsert to handle potential duplicates
      const { error: insertError } = await supabase
        .from('market_data_feed')
        .upsert(marketData, {
          onConflict: 'symbol,timeframe,timestamp',
          ignoreDuplicates: true
        });

      if (insertError) {
        console.error('Error inserting market data:', insertError);
        status = 'error';
        errorMessage = insertError.message;
      } else {
        console.log(`💾 Inserted ${marketData.length} market data points`);
        
        // CRITICAL: Update all open trades with new prices
        try {
          const { error: pnlError } = await supabase.rpc('update_eurusd_pnl');
          if (pnlError) {
            console.error('⚠️ Error updating P&L:', pnlError);
          } else {
            console.log('✅ P&L updated for open trades');
          }
        } catch (pnlUpdateError) {
          console.error('⚠️ Failed to update P&L:', pnlUpdateError);
        }
      }
    }

    // Log system health
    const executionTime = Date.now() - startTime;
    const { error: healthError } = await supabase
      .from('system_health')
      .insert({
        function_name: 'fetch-market-data',
        execution_time_ms: executionTime,
        status,
        error_message: errorMessage || null,
        processed_items: processedItems,
        memory_usage_mb: (performance as any).memory?.usedJSHeapSize ? 
          Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : null
      });

    if (healthError) {
      console.warn('Error logging system health:', healthError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedItems} market data points in ${executionTime}ms`,
        status,
        processedItems,
        executionTimeMs: executionTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: status === 'success' ? 200 : 500,
      }
    );

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ Critical error in fetch-market-data:', error);

    // Log critical error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.from('system_health').insert({
        function_name: 'fetch-market-data',
        execution_time_ms: executionTime,
        status: 'error',
        error_message: (error as Error).message,
        processed_items: processedItems
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message,
        processedItems,
        executionTimeMs: executionTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Generate realistic mock data as fallback
function generateMockData(symbol: string, timeframe: string): MarketDataPoint[] {
  const now = new Date();
  
  // Calculate interval in minutes
  let intervalMinutes: number;
  let dbTimeframe: string;
  
  switch (timeframe) {
    case '15min':
      intervalMinutes = 15;
      dbTimeframe = '15m';
      break;
    case '1h':
      intervalMinutes = 60;
      dbTimeframe = 'H1';
      break;
    case '4h':
      intervalMinutes = 240;
      dbTimeframe = 'H4';
      break;
    case '1day':
      intervalMinutes = 1440;
      dbTimeframe = 'D1';
      break;
    default:
      intervalMinutes = 60;
      dbTimeframe = timeframe;
  }
  
  const mockData: MarketDataPoint[] = [];
  
  // Generate 5 recent candles
  for (let i = 4; i >= 0; i--) {
    const candleTime = new Date(now.getTime() - (i * intervalMinutes * 60 * 1000));
    
    // Realistic EUR/USD mock prices with small variations
    const basePrice = 1.0890 + (Math.sin(Date.now() / 100000) * 0.001);
    const volatility = 0.0005 * (intervalMinutes / 60); // Scale volatility by timeframe
    
    const open = basePrice + (Math.random() - 0.5) * volatility;
    const close = open + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + (Math.random() * volatility * 0.5);
    const low = Math.min(open, close) - (Math.random() * volatility * 0.5);
    
    mockData.push({
      symbol,
      timeframe: dbTimeframe,
      price: parseFloat(close.toFixed(5)),
      open_price: parseFloat(open.toFixed(5)),
      high_price: parseFloat(high.toFixed(5)),
      low_price: parseFloat(low.toFixed(5)),
      volume: Math.floor(Math.random() * 50000) + 25000,
      timestamp: candleTime.toISOString(),
      data_source: 'mock_fallback',
      is_live: true
    });
  }
  
  return mockData;
}
