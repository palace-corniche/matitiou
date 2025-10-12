interface RedditSentiment {
  source: string;
  symbol: string;
  sentiment: number;
  volume: number;
  confidence: number;
  weight: number;
}

const FOREX_KEYWORDS = {
  bullish: ['buy', 'long', 'bullish', 'up', 'moon', 'pump', 'calls', 'breakout', 'rally'],
  bearish: ['sell', 'short', 'bearish', 'down', 'crash', 'dump', 'puts', 'breakdown', 'drop']
};

function analyzeSentimentFromText(text: string): number {
  const lowerText = text.toLowerCase();
  let score = 0;
  
  // Count bullish keywords
  for (const keyword of FOREX_KEYWORDS.bullish) {
    if (lowerText.includes(keyword)) score += 1;
  }
  
  // Count bearish keywords
  for (const keyword of FOREX_KEYWORDS.bearish) {
    if (lowerText.includes(keyword)) score -= 1;
  }
  
  // Normalize to -1 to +1
  return Math.max(-1, Math.min(1, score / 5));
}

export async function fetchRedditDirect(symbol: string): Promise<RedditSentiment | null> {
  try {
    const searchTerm = symbol.replace('/', '');
    const subreddits = ['forex', 'Forex', 'ForexForALL'];
    
    let totalSentiment = 0;
    let totalPosts = 0;

    for (const subreddit of subreddits) {
      try {
        const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${searchTerm}&restrict_sr=1&limit=25&t=day`;
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TradingBot/1.0)'
          }
        });

        if (!response.ok) continue;

        const data = await response.json();
        
        if (data?.data?.children) {
          for (const post of data.data.children) {
            const title = post.data.title || '';
            const selftext = post.data.selftext || '';
            const combinedText = `${title} ${selftext}`;
            
            const sentiment = analyzeSentimentFromText(combinedText);
            if (sentiment !== 0) {
              totalSentiment += sentiment;
              totalPosts++;
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching from r/${subreddit}:`, error);
      }
    }

    if (totalPosts === 0) {
      return null;
    }

    const avgSentiment = totalSentiment / totalPosts;
    const confidence = Math.min(totalPosts / 30, 0.8); // Max 0.8 confidence

    return {
      source: 'reddit_direct',
      symbol,
      sentiment: avgSentiment,
      volume: totalPosts,
      confidence: confidence,
      weight: 0.30
    };

  } catch (error) {
    console.error('Reddit direct fetch error:', error);
    return null;
  }
}

export async function fetchRedditViaApify(symbol: string): Promise<RedditSentiment | null> {
  // Apify integration (requires free account)
  // For now, fallback to direct scraping
  // Can be enhanced with Apify API key when user creates free account
  return null;
}
