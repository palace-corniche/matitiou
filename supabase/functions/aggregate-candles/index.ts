import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TickData {
  timestamp: string;
  bid: number;
  ask: number;
  spread: number;
  tick_volume?: number;
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
  private static getTimeframeMs(timeframe: string): number {
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
    console.log('🕐 Starting candle aggregation...');

    // Fetch ticks from last 48 hours (to ensure we have enough data)
    const lookbackHours = 48;
    const lookbackTime = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

    const { data: ticks, error: tickError } = await supabase
      .from('tick_data')
      .select('timestamp, bid, ask, spread, tick_volume')
      .eq('symbol', 'EUR/USD')
      .gte('timestamp', lookbackTime.toISOString())
      .order('timestamp', { ascending: true });

    if (tickError) {
      throw new Error(`Failed to fetch ticks: ${tickError.message}`);
    }

    if (!ticks || ticks.length === 0) {
      console.log('⚠️ No tick data available for aggregation');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No tick data available',
          tickCount: 0,
          candlesGenerated: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Processing ${ticks.length} ticks from last ${lookbackHours} hours`);

    // Aggregate for all timeframes
    const timeframes = ['15m', '1h', '4h', '1d'];
    const symbol = 'EUR/USD';
    let totalCandlesInserted = 0;

    for (const timeframe of timeframes) {
      const candles = CandleAggregator.aggregateTicksToCandles(ticks, symbol, timeframe);
      
      if (candles.length > 0) {
        // Upsert candles to database
        const { error: upsertError } = await supabase
          .from('aggregated_candles')
          .upsert(candles, {
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
    console.log(`✅ Aggregation complete in ${executionTime}ms`);

    // Log to system health
    await supabase.from('system_health').insert({
      component: 'candle_aggregator',
      status: 'healthy',
      metrics: {
        execution_time_ms: executionTime,
        ticks_processed: ticks.length,
        candles_generated: totalCandlesInserted,
        lookback_hours: lookbackHours
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        tickCount: ticks.length,
        candlesGenerated: totalCandlesInserted,
        executionTimeMs: executionTime,
        timeframes: timeframes
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Candle aggregation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
