import { untypedSupabase as supabase } from '@/integrations/supabase/untypedClient';

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Timeframe mapping for database queries
const TIMEFRAME_MAP: Record<string, string> = {
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d'
};

// Cache for data to reduce database calls
const dataCache = new Map<string, { data: CandleData[]; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute cache

export const getForexData = async (timeframe: string): Promise<CandleData[]> => {
  const cacheKey = `EURUSD_${timeframe}`;
  const cached = dataCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const dbTimeframe = TIMEFRAME_MAP[timeframe] || '1h';
    const limit = timeframe === '15m' ? 200 : timeframe === '1h' ? 168 : timeframe === '4h' ? 180 : 365;

    const { data, error } = await supabase
      .from('aggregated_candles')
      .select('timestamp, open_price, high_price, low_price, close_price, volume')
      .eq('symbol', 'EUR/USD')
      .eq('timeframe', dbTimeframe)
      .order('timestamp', { ascending: true })
      .limit(limit);

    if (!error && data && data.length > 0) {
      const candles: CandleData[] = data.map((c: any) => ({
        time: c.timestamp,
        open: Number(c.open_price),
        high: Number(c.high_price),
        low: Number(c.low_price),
        close: Number(c.close_price),
        volume: Number(c.volume || 0)
      }));

      dataCache.set(cacheKey, { data: candles, timestamp: Date.now() });
      return candles;
    }

    // Fallback: try any available timeframe
    const { data: fallback } = await supabase
      .from('aggregated_candles')
      .select('timestamp, open_price, high_price, low_price, close_price, volume')
      .eq('symbol', 'EUR/USD')
      .order('timestamp', { ascending: true })
      .limit(limit);

    if (fallback && fallback.length > 0) {
      const candles: CandleData[] = fallback.map((c: any) => ({
        time: c.timestamp,
        open: Number(c.open_price),
        high: Number(c.high_price),
        low: Number(c.low_price),
        close: Number(c.close_price),
        volume: Number(c.volume || 0)
      }));

      dataCache.set(cacheKey, { data: candles, timestamp: Date.now() });
      return candles;
    }

    console.warn('No candle data available in database');
    return [];
  } catch (error) {
    console.error('Error fetching forex data:', error);
    return [];
  }
};
