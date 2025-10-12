interface StockTwitsSentiment {
  source: string;
  symbol: string;
  sentiment: number;
  volume: number;
  confidence: number;
  weight: number;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export async function fetchStockTwits(symbol: string): Promise<StockTwitsSentiment | null> {
  try {
    // StockTwits uses different naming for forex pairs
    const stocktwitsSymbol = symbol.replace('/', '').replace('USD', '.X');
    
    const url = `https://api.stocktwits.com/api/2/streams/symbol/${stocktwitsSymbol}.json`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`StockTwits API returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.messages || data.messages.length === 0) {
      console.warn('No StockTwits messages found');
      return null;
    }

    // Calculate sentiment from messages
    let bullishCount = 0;
    let bearishCount = 0;
    let totalMessages = 0;

    for (const message of data.messages.slice(0, 50)) {
      if (message.entities?.sentiment) {
        totalMessages++;
        if (message.entities.sentiment.basic === 'Bullish') {
          bullishCount++;
        } else if (message.entities.sentiment.basic === 'Bearish') {
          bearishCount++;
        }
      }
    }

    if (totalMessages === 0) {
      return null;
    }

    // Calculate sentiment score (-1 to +1)
    const sentimentScore = (bullishCount - bearishCount) / totalMessages;
    
    // Confidence based on volume (higher volume = higher confidence)
    const confidence = Math.min(totalMessages / 50, 1.0);

    return {
      source: 'stocktwits',
      symbol,
      sentiment: sentimentScore,
      volume: totalMessages,
      confidence: confidence,
      weight: 0.40 // Highest weight - forex-focused platform
    };

  } catch (error) {
    console.error('StockTwits fetch error:', error);
    return null;
  }
}
