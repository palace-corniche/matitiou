// Lightweight regime detection for edge function
// Simplified version of the full RegimeDetectionEngine

export interface MarketRegime {
  type: 'trending_bullish' | 'trending_bearish' | 'ranging_tight' | 'ranging_volatile' | 'shock_up' | 'shock_down' | 'consolidation' | 'breakout';
  strength: number;
  confidence: number;
  volatility: number;
  momentum: number;
}

export class RegimeDetectionEngine {
  async detectCurrentRegime(
    candles: any[],
    volume: number[],
    technicalIndicators: any[],
    news: any[] = []
  ): Promise<MarketRegime> {
    if (!candles || candles.length < 20) {
      return this.getDefaultRegime();
    }

    const prices = candles.map((c: any) => c.close || c.price);
    const highs = candles.map((c: any) => c.high || c.close);
    const lows = candles.map((c: any) => c.low || c.close);
    
    // Calculate momentum
    const momentum = this.calculateMomentum(prices);
    
    // Calculate volatility
    const volatility = this.calculateVolatility(prices);
    
    // Calculate trend strength
    const trendStrength = this.calculateTrendStrength(prices);
    
    // Determine regime
    let regimeType: MarketRegime['type'];
    let confidence = 0.7;
    
    // Trending regimes
    if (Math.abs(trendStrength) > 0.6 && volatility < 0.015) {
      regimeType = trendStrength > 0 ? 'trending_bullish' : 'trending_bearish';
      confidence = 0.8;
    }
    // Shock regimes
    else if (volatility > 0.02 && Math.abs(momentum) > 0.8) {
      regimeType = momentum > 0 ? 'shock_up' : 'shock_down';
      confidence = 0.75;
    }
    // Ranging regimes
    else if (Math.abs(trendStrength) < 0.3 && volatility < 0.01) {
      regimeType = 'ranging_tight';
      confidence = 0.7;
    }
    else if (Math.abs(trendStrength) < 0.3 && volatility >= 0.01) {
      regimeType = 'ranging_volatile';
      confidence = 0.65;
    }
    // Breakout
    else if (volatility > 0.015 && Math.abs(momentum) > 0.6) {
      regimeType = 'breakout';
      confidence = 0.7;
    }
    // Consolidation (default)
    else {
      regimeType = 'consolidation';
      confidence = 0.6;
    }

    return {
      type: regimeType,
      strength: Math.abs(trendStrength),
      confidence,
      volatility,
      momentum
    };
  }

  private calculateMomentum(prices: number[]): number {
    if (prices.length < 10) return 0;
    
    const recent = prices.slice(-10);
    const older = prices.slice(-20, -10);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    return (recentAvg - olderAvg) / olderAvg * 100;
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  private calculateTrendStrength(prices: number[]): number {
    if (prices.length < 10) return 0;
    
    const x = Array.from({ length: prices.length }, (_, i) => i);
    const y = prices;
    const n = prices.length;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const avgPrice = sumY / n;
    
    // Normalize slope by average price
    return slope / avgPrice * 1000; // Scale for readability
  }

  private getDefaultRegime(): MarketRegime {
    return {
      type: 'ranging_tight',
      strength: 0.5,
      confidence: 0.5,
      volatility: 0.01,
      momentum: 0
    };
  }
}
