import axios from 'axios';

// Using Alpha Vantage free tier - you'll need to get an API key from https://www.alphavantage.co/support/#api-key
const API_KEY = 'demo'; // Replace with your actual API key
const BASE_URL = 'https://www.alphavantage.co/query';

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Mock data generator for demo purposes
const generateMockData = (days: number = 100): CandleData[] => {
  const data: CandleData[] = [];
  let basePrice = 1.0850; // Starting EUR/USD price
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Generate realistic price movement
    const volatility = 0.002;
    const change = (Math.random() - 0.5) * volatility;
    basePrice = Math.max(0.8, Math.min(1.3, basePrice + change));
    
    const open = basePrice;
    const high = open + Math.random() * 0.001;
    const low = open - Math.random() * 0.001;
    const close = low + Math.random() * (high - low);

    data.push({
      time: date.toISOString().split('T')[0],
      open: Number(open.toFixed(5)),
      high: Number(high.toFixed(5)),
      low: Number(low.toFixed(5)),
      close: Number(close.toFixed(5)),
      volume: Math.floor(Math.random() * 100000) + 50000
    });
  }

  return data;
};

// Generate intraday mock data
const generateIntradayMockData = (intervals: number, intervalMinutes: number): CandleData[] => {
  const data: CandleData[] = [];
  let basePrice = 1.0850;
  const now = new Date();

  for (let i = intervals; i >= 0; i--) {
    const date = new Date(now);
    date.setMinutes(date.getMinutes() - i * intervalMinutes);
    
    const volatility = 0.0005;
    const change = (Math.random() - 0.5) * volatility;
    basePrice = Math.max(0.8, Math.min(1.3, basePrice + change));
    
    const open = basePrice;
    const high = open + Math.random() * 0.0003;
    const low = open - Math.random() * 0.0003;
    const close = low + Math.random() * (high - low);

    data.push({
      time: Math.floor(date.getTime() / 1000).toString(),
      open: Number(open.toFixed(5)),
      high: Number(high.toFixed(5)),
      low: Number(low.toFixed(5)),
      close: Number(close.toFixed(5))
    });
  }

  return data;
};

export const getForexData = async (timeframe: string): Promise<CandleData[]> => {
  try {
    // For demo purposes, we'll use mock data
    // In production, you would make actual API calls to Alpha Vantage or another provider
    
    switch (timeframe) {
      case '15m':
        return generateIntradayMockData(96, 15); // Last 24 hours in 15min intervals
      case '1h':
        return generateIntradayMockData(168, 60); // Last week in 1h intervals
      case '4h':
        return generateIntradayMockData(180, 240); // Last month in 4h intervals
      case '1d':
        return generateMockData(365); // Last year in daily intervals
      default:
        return generateMockData(100);
    }

    /*
    // Uncomment and modify this section when you have a real API key
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'FX_DAILY',
        from_symbol: 'EUR',
        to_symbol: 'USD',
        apikey: API_KEY,
        outputsize: 'full'
      }
    });

    const timeSeries = response.data['Time Series (Daily)'];
    if (!timeSeries) {
      throw new Error('No data received from API');
    }

    const data: CandleData[] = Object.entries(timeSeries)
      .map(([date, values]: [string, any]) => ({
        time: date,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume'] || '0')
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    return data;
    */
  } catch (error) {
    console.error('Error fetching forex data:', error);
    // Fallback to mock data on error
    return generateMockData(100);
  }
};