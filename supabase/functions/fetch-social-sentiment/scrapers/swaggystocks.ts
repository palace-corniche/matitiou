interface SwaggyStocksSentiment {
  source: string;
  symbol: string;
  sentiment: number;
  volume: number;
  confidence: number;
  weight: number;
}

export async function fetchSwaggyStocks(): Promise<SwaggyStocksSentiment | null> {
  try {
    // SwaggyStocks free API for WallStreetBets sentiment
    const url = 'https://api.swaggystocks.com/wsb/sentiment';
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`SwaggyStocks API returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    // SwaggyStocks focuses on stocks, but sometimes mentions forex
    // Look for general market sentiment
    if (!data || !Array.isArray(data)) {
      return null;
    }

    // Calculate overall market sentiment
    let totalSentiment = 0;
    let count = 0;

    for (const item of data.slice(0, 20)) {
      if (item.sentiment_score) {
        totalSentiment += item.sentiment_score;
        count++;
      }
    }

    if (count === 0) {
      return null;
    }

    const avgSentiment = totalSentiment / count;
    
    // Normalize to -1 to +1 range (SwaggyStocks uses different scale)
    const normalizedSentiment = Math.max(-1, Math.min(1, avgSentiment / 100));

    return {
      source: 'swaggystocks',
      symbol: 'GENERAL', // General market sentiment
      sentiment: normalizedSentiment,
      volume: count,
      confidence: 0.5, // Lower confidence for indirect sentiment
      weight: 0.15
    };

  } catch (error) {
    console.error('SwaggyStocks fetch error:', error);
    return null;
  }
}
