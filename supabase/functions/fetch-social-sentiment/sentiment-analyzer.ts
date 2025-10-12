interface SentimentData {
  source: string;
  symbol: string;
  sentiment: number;
  volume: number;
  confidence: number;
  weight: number;
}

interface AggregatedSentiment {
  sentiment_score: number;
  confidence: number;
  message_volume: number;
  sources_used: string[];
}

export function analyzeSentiment(text: string): number {
  const FOREX_KEYWORDS = {
    bullish: ['buy', 'long', 'bullish', 'up', 'moon', 'pump', 'calls', 'breakout', 'rally', 'support'],
    bearish: ['sell', 'short', 'bearish', 'down', 'crash', 'dump', 'puts', 'breakdown', 'resistance'],
    strong: ['massive', 'huge', 'explosion', 'rocket', 'parabolic'],
    weak: ['consolidation', 'range', 'sideways', 'choppy']
  };

  const lowerText = text.toLowerCase();
  let score = 0;
  let intensity = 1;

  // Count bullish keywords
  for (const keyword of FOREX_KEYWORDS.bullish) {
    if (lowerText.includes(keyword)) score += 1;
  }

  // Count bearish keywords
  for (const keyword of FOREX_KEYWORDS.bearish) {
    if (lowerText.includes(keyword)) score -= 1;
  }

  // Apply intensity multipliers
  for (const keyword of FOREX_KEYWORDS.strong) {
    if (lowerText.includes(keyword)) intensity *= 1.5;
  }

  // Normalize to -1 to +1
  const normalizedScore = Math.max(-1, Math.min(1, (score / 5) * intensity));
  
  return normalizedScore;
}

export function aggregateMultiSource(results: SentimentData[]): AggregatedSentiment {
  if (results.length === 0) {
    return {
      sentiment_score: 0,
      confidence: 0,
      message_volume: 0,
      sources_used: []
    };
  }

  let weightedSentiment = 0;
  let totalWeight = 0;
  let totalVolume = 0;
  let totalConfidence = 0;
  const sourcesUsed: string[] = [];

  // Apply minimum volume thresholds
  const MIN_VOLUMES: Record<string, number> = {
    stocktwits: 20,
    reddit_direct: 10,
    reddit_forex: 10,
    swaggystocks: 0
  };

  for (const result of results) {
    const minVolume = MIN_VOLUMES[result.source] || 0;
    
    // Skip if below minimum volume
    if (result.volume < minVolume) {
      console.log(`⚠️ ${result.source} below min volume (${result.volume} < ${minVolume})`);
      continue;
    }

    // Weight by source reliability and confidence
    const effectiveWeight = result.weight * result.confidence;
    
    weightedSentiment += result.sentiment * effectiveWeight;
    totalWeight += effectiveWeight;
    totalVolume += result.volume;
    totalConfidence += result.confidence;
    sourcesUsed.push(result.source);
  }

  if (totalWeight === 0) {
    return {
      sentiment_score: 0,
      confidence: 0,
      message_volume: 0,
      sources_used: []
    };
  }

  const aggregatedSentiment = weightedSentiment / totalWeight;
  const avgConfidence = totalConfidence / sourcesUsed.length;

  // Boost confidence if multiple sources agree
  let agreementBonus = 0;
  if (sourcesUsed.length >= 2) {
    const allPositive = results.every(r => r.sentiment > 0.2);
    const allNegative = results.every(r => r.sentiment < -0.2);
    
    if (allPositive || allNegative) {
      agreementBonus = 0.2; // +20% confidence when sources agree
    }
  }

  const finalConfidence = Math.min(1.0, avgConfidence + agreementBonus);

  // Apply recency decay (assume all data is recent)
  // This could be enhanced with timestamp tracking

  return {
    sentiment_score: aggregatedSentiment,
    confidence: finalConfidence,
    message_volume: totalVolume,
    sources_used: sourcesUsed
  };
}
