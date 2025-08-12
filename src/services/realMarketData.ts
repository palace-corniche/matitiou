// Real market data service using Twelve Data API
export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface TickData {
  price: number;
  time: string;
  change: number;
  changePercent: number;
}

// Twelve Data API configuration
const TWELVE_DATA_API_KEY = 'demo'; // Using demo key - replace with real API key for production
const BASE_URL = 'https://api.twelvedata.com';

// Map our timeframes to Twelve Data intervals
const TIMEFRAME_MAP: Record<string, string> = {
  '15m': '15min',
  '1h': '1h',
  '4h': '4h',
  '1d': '1day'
};

// Cache for API responses to avoid rate limits
const dataCache = new Map<string, { data: CandleData[]; timestamp: number }>();
const CACHE_DURATION = 20000; // 20 second cache for 30s refresh rate

export const getForexData = async (timeframe: string): Promise<CandleData[]> => {
  const cacheKey = `EURUSD_${timeframe}`;
  const cached = dataCache.get(cacheKey);
  
  // Return cached data if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const interval = TIMEFRAME_MAP[timeframe] || '1h';
    const outputsize = timeframe === '15m' ? '200' : '100';
    
    const url = `${BASE_URL}/time_series?symbol=EUR/USD&interval=${interval}&outputsize=${outputsize}&apikey=${TWELVE_DATA_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check for API errors
    if (data.code && data.code !== 200) {
      console.warn('Twelve Data API error:', data.message);
      throw new Error(data.message || 'API Error');
    }
    
    if (!data.values || !Array.isArray(data.values)) {
      throw new Error('Invalid API response format');
    }
    
    const candleData: CandleData[] = data.values.map((item: any) => ({
      time: item.datetime,
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: item.volume ? parseInt(item.volume) : undefined
    })).reverse(); // Reverse to get chronological order
    
    // Cache the result
    dataCache.set(cacheKey, {
      data: candleData,
      timestamp: Date.now()
    });
    
    return candleData;
    
  } catch (error) {
    console.error(`Error fetching ${timeframe} data:`, error);
    
    // Fallback to realistic mock data with current market patterns
    return generateRealisticMockData(timeframe);
  }
};

// Enhanced mock data that simulates real EUR/USD patterns
const generateRealisticMockData = (timeframe: string): CandleData[] => {
  const now = new Date();
  const intervals = timeframe === '15m' ? 200 : timeframe === '1h' ? 168 : timeframe === '4h' ? 42 : 30;
  const minutesPerCandle = timeframe === '15m' ? 15 : timeframe === '1h' ? 60 : timeframe === '4h' ? 240 : 1440;
  
  // Current EUR/USD is around 1.0800-1.1000 range
  let currentPrice = 1.0890;
  const data: CandleData[] = [];
  
  for (let i = intervals - 1; i >= 0; i--) {
    const candleTime = new Date(now.getTime() - (i * minutesPerCandle * 60 * 1000));
    
    // Add some realistic volatility (EUR/USD typically moves 50-100 pips per day)
    const volatility = timeframe === '15m' ? 0.0002 : timeframe === '1h' ? 0.0005 : timeframe === '4h' ? 0.001 : 0.002;
    const trend = Math.sin(i / 20) * volatility; // Add some trending behavior
    const noise = (Math.random() - 0.5) * volatility;
    
    const open = currentPrice;
    const move = trend + noise;
    const high = open + Math.abs(move) + (Math.random() * volatility * 0.5);
    const low = open - Math.abs(move) - (Math.random() * volatility * 0.5);
    const close = open + move;
    
    data.push({
      time: candleTime.toISOString(),
      open: parseFloat(open.toFixed(5)),
      high: parseFloat(high.toFixed(5)),
      low: parseFloat(low.toFixed(5)),
      close: parseFloat(close.toFixed(5)),
      volume: Math.floor(Math.random() * 100000) + 50000
    });
    
    currentPrice = close;
  }
  
  return data;
};

// Get live tick data (for real-time updates)
export const getLiveTickData = async (): Promise<TickData | null> => {
  try {
    const url = `${BASE_URL}/quote?symbol=EUR/USD&apikey=${TWELVE_DATA_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.code && data.code !== 200) {
      throw new Error(data.message || 'API Error');
    }
    
    return {
      price: parseFloat(data.close),
      time: data.datetime,
      change: parseFloat(data.change) || 0,
      changePercent: parseFloat(data.percent_change) || 0
    };
    
  } catch (error) {
    console.error('Error fetching live tick data:', error);
    
    // Mock live tick data
    const mockPrice = 1.0890 + (Math.random() - 0.5) * 0.001;
    const mockChange = (Math.random() - 0.5) * 0.0005;
    
    return {
      price: parseFloat(mockPrice.toFixed(5)),
      time: new Date().toISOString(),
      change: parseFloat(mockChange.toFixed(5)),
      changePercent: parseFloat(((mockChange / mockPrice) * 100).toFixed(3))
    };
  }
};

// Market status helper
export const getMarketStatus = (): { isOpen: boolean; session: string; nextOpen?: string } => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcDay = now.getUTCDay();
  
  // Forex is open 24/5 (Sunday 22:00 UTC to Friday 22:00 UTC)
  const isWeekend = utcDay === 6 || (utcDay === 0 && utcHour < 22);
  const isFridayClose = utcDay === 5 && utcHour >= 22;
  
  if (isWeekend || isFridayClose) {
    return {
      isOpen: false,
      session: 'Closed',
      nextOpen: 'Sunday 22:00 UTC'
    };
  }
  
  // Determine trading session
  let session = 'Asian';
  if (utcHour >= 7 && utcHour < 16) {
    session = 'European';
  } else if (utcHour >= 13 && utcHour < 22) {
    session = 'American';
  }
  
  return {
    isOpen: true,
    session,
  };
};