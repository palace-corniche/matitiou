import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TickData {
  timestamp: string;
  symbol: string;
  bid: number;
  ask: number;
  tick_volume?: number;
}

interface MarketDataFeed {
  timestamp: string;
  symbol: string;
  timeframe: string;
  price: number;
  open_price: number;
  high_price: number;
  low_price: number;
  is_live: boolean;
}

interface CandleData {
  timestamp: string;
  symbol: string;
  timeframe: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  tick_count: number;
  is_complete: boolean;
}

class CandleAggregator {
  static getTimeframeMs(timeframe: string): number {
    const map: Record<string, number> = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      'H1': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      'H4': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      'D1': 24 * 60 * 60 * 1000,
    };
    return map[timeframe] || 15 * 60 * 1000;
  }

  private static getCandleOpenTime(timestamp: Date, timeframe: string): Date {
    const ms = this.getTimeframeMs(timeframe);
    const time = timestamp.getTime();
    const candleStart = Math.floor(time / ms) * ms;
    return new Date(candleStart);
  }

  private static getMidPrice(tick: TickData): number {
    return (tick.bid + tick.ask) / 2;
  }

  private static getCandleForTimeWindow(
    ticks: TickData[],
    windowStart: Date,
    windowEnd: Date,
    symbol: string,
    timeframe: string,
    isComplete: boolean
  ): CandleData | null {
    const windowTicks = ticks.filter(tick => {
      const tickTime = new Date(tick.timestamp).getTime();
      return tickTime >= windowStart.getTime() && tickTime < windowEnd.getTime();
    });

    if (windowTicks.length === 0) return null;

    const prices = windowTicks.map(t => this.getMidPrice(t));
    const volumes = windowTicks.map(t => t.tick_volume || 1);

    return {
      timestamp: windowStart.toISOString(),
      symbol,
      timeframe,
      open_price: prices[0],
      high_price: Math.max(...prices),
      low_price: Math.min(...prices),
      close_price: prices[prices.length - 1],
      volume: volumes.reduce((sum, v) => sum + v, 0),
      tick_count: windowTicks.length,
      is_complete: isComplete,
    };
  }

  static aggregateTicksToCandles(
    ticks: TickData[],
    symbol: string,
    timeframe: string
  ): CandleData[] {
    if (ticks.length === 0) return [];

    const sortedTicks = [...ticks].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const firstTick = new Date(sortedTicks[0].timestamp);
    const lastTick = new Date(sortedTicks[sortedTicks.length - 1].timestamp);
    
    const firstCandleStart = this.getCandleOpenTime(firstTick, timeframe);
    const lastCandleStart = this.getCandleOpenTime(lastTick, timeframe);
    
    const timeframeMs = this.getTimeframeMs(timeframe);
    const candles: CandleData[] = [];
    
    const now = new Date();
    const currentCandleStart = this.getCandleOpenTime(now, timeframe);

    for (
      let candleStart = firstCandleStart.getTime();
      candleStart <= lastCandleStart.getTime();
      candleStart += timeframeMs
    ) {
      const windowStart = new Date(candleStart);
      const windowEnd = new Date(candleStart + timeframeMs);
      
      const isComplete = windowStart.getTime() < currentCandleStart.getTime();
      
      const candle = this.getCandleForTimeWindow(
        sortedTicks,
        windowStart,
        windowEnd,
        symbol,
        timeframe,
        isComplete
      );
      
      if (candle) {
        candles.push(candle);
      }
    }

    return candles;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const startTime = Date.now();
    console.log('🕐 Starting candle sync from market_data_feed...');

    // Fetch fresh OHLC data from market_data_feed (already has candles per timeframe)
    const lookbackHours = 48;
    const lookbackTime = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

    const { data: marketData, error: fetchError } = await supabase
      .from('market_data_feed')
      .select('timestamp, symbol, price, metadata')
      .eq('symbol', 'EUR/USD')
      .gte('timestamp', lookbackTime.toISOString())
      .order('timestamp', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch market data: ${fetchError.message}`);
    }

    if (!marketData || marketData.length === 0) {
      console.log('⚠️ No market data available for sync');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No market data available',
          dataCount: 0,
          candlesGenerated: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Processing ${marketData.length} market data points from last ${lookbackHours} hours`);

    // Convert market_data_feed to aggregated_candles format
    const timeframes = ['15m', '1h', 'H1', '4h', 'H4', '1d', 'D1'];
    const symbol = 'EUR/USD';
    let totalCandlesInserted = 0;

    // Group by timeframe and convert to candles
    const candlesByTimeframe = new Map<string, CandleData[]>();
    
    for (const data of marketData) {
      // Extract metadata (OHLC data stored in JSON field)
      const metadata = data.metadata as any;
      if (!metadata || !metadata.timeframe) {
        console.warn('⚠️ Skipping data point with missing metadata:', data.timestamp);
        continue;
      }

      // Normalize timeframe names (H1 -> 1h, H4 -> 4h, D1 -> 1d)
      const normalizedTf = metadata.timeframe
        .replace('H1', '1h')
        .replace('H4', '4h')
        .replace('D1', '1d');
      
      if (!candlesByTimeframe.has(normalizedTf)) {
        candlesByTimeframe.set(normalizedTf, []);
      }

      // Determine if candle is complete (not the current live candle)
      const now = new Date();
      const candleTime = new Date(data.timestamp);
      const timeframeMs = CandleAggregator.getTimeframeMs(normalizedTf);
      const currentCandleStart = Math.floor(now.getTime() / timeframeMs) * timeframeMs;
      const isComplete = candleTime.getTime() < currentCandleStart;

      candlesByTimeframe.get(normalizedTf)!.push({
        timestamp: data.timestamp,
        symbol: symbol,
        timeframe: normalizedTf,
        open_price: metadata.open,      // Extract from metadata
        high_price: metadata.high,      // Extract from metadata
        low_price: metadata.low,        // Extract from metadata
        close_price: metadata.close,    // Extract from metadata (not 'price')
        volume: metadata.volume || 0,   // Extract from metadata
        tick_count: 1,
        is_complete: metadata.is_live === false ? true : isComplete,  // Use metadata flag
      });
    }

    // Upsert candles for each timeframe (deduplicate by timestamp)
    for (const [timeframe, candles] of candlesByTimeframe.entries()) {
      if (candles.length > 0) {
        // Deduplicate candles by timestamp (keep latest)
        const uniqueCandles = Array.from(
          candles.reduce((map, candle) => {
            const key = candle.timestamp;
            if (!map.has(key) || new Date(candle.timestamp) > new Date(map.get(key)!.timestamp)) {
              map.set(key, candle);
            }
            return map;
          }, new Map<string, CandleData>()).values()
        );

        const { error: upsertError } = await supabase
          .from('aggregated_candles')
          .upsert(uniqueCandles, {
            onConflict: 'symbol,timeframe,timestamp',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error(`❌ Error upserting ${timeframe} candles:`, upsertError);
        } else {
          console.log(`✅ ${timeframe}: ${candles.length} candles (${candles.filter(c => c.is_complete).length} complete)`);
          totalCandlesInserted += candles.length;
        }
      }
    }

    const executionTime = Date.now() - startTime;
    console.log(`✅ Candle sync complete in ${executionTime}ms`);

    // Log to system health
    await supabase.from('system_health').insert({
      function_name: 'aggregate-candles',
      status: 'success',
      execution_time_ms: executionTime,
      processed_items: totalCandlesInserted,
      details: {
        data_points_processed: marketData.length,
        candles_generated: totalCandlesInserted,
        lookback_hours: lookbackHours,
        source: 'market_data_feed'
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        dataCount: marketData.length,
        candlesGenerated: totalCandlesInserted,
        executionTimeMs: executionTime,
        source: 'market_data_feed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Candle aggregation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
