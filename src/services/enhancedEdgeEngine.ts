import type { CandleData } from './technicalAnalysis';

export interface EdgeComponents {
  baseEdge: number;
  executionCosts: number;
  opportunityCosts: number;
  microstructureCosts: number;
  slippageCosts: number;
  regimeAdjustment: number;
  volatilityAdjustment: number;
  liquidityAdjustment: number;
  timingPenalty: number;
  netEdge: number;
}

export interface ExecutionQuality {
  expectedSlippage: number;
  marketImpact: number;
  timingScore: number; // 0-1, 1 = perfect timing
  liquidityScore: number; // 0-1, 1 = high liquidity
  microstructureScore: number; // 0-1, 1 = favorable microstructure
}

export interface VolumeProfile {
  averageVolume: number;
  currentVolume: number;
  volumeRatio: number;
  volumeTrend: 'increasing' | 'decreasing' | 'stable';
  liquidityEstimate: number;
}

export interface RegimeContext {
  type: 'trending' | 'ranging' | 'shock' | 'news_driven';
  strength: number; // 0-1
  persistence: number; // Expected duration in minutes
  volatility: number;
  uncertainty: number; // 0-1, higher = more uncertain
}

export class EnhancedEdgeEngine {
  private readonly DEFAULT_SPREAD = 0.0001; // 1 pip for EUR/USD
  private readonly DEFAULT_COMMISSION = 0.00003; // 0.3 pips round-trip
  private readonly MAX_SLIPPAGE = 0.0005; // 5 pips max slippage

  calculateEnhancedEdge(
    baseWinProbability: number,
    expectedReturn: number,
    expectedLoss: number,
    candles: CandleData[],
    regime: RegimeContext,
    currentPrice: number,
    positionSize: number
  ): EdgeComponents {
    
    // 1. Calculate base edge (traditional Kelly-style)
    const baseEdge = baseWinProbability * expectedReturn - (1 - baseWinProbability) * expectedLoss;
    
    // 2. Calculate execution quality factors
    const volumeProfile = this.analyzeVolumeProfile(candles);
    const executionQuality = this.assessExecutionQuality(candles, volumeProfile, regime);
    
    // 3. Calculate cost components
    const executionCosts = this.calculateExecutionCosts(positionSize, currentPrice);
    const slippageCosts = this.calculateSlippageCosts(positionSize, executionQuality, volumeProfile);
    const microstructureCosts = this.calculateMicrostructureCosts(candles, regime);
    
    // 4. Calculate opportunity costs
    const opportunityCosts = this.calculateOpportunityCosts(regime, candles);
    
    // 5. Calculate regime-based adjustments
    const regimeAdjustment = this.calculateRegimeAdjustment(regime, baseEdge);
    const volatilityAdjustment = this.calculateVolatilityAdjustment(candles, regime);
    const liquidityAdjustment = this.calculateLiquidityAdjustment(volumeProfile, positionSize);
    
    // 6. Calculate timing penalty
    const timingPenalty = this.calculateTimingPenalty(candles, regime);
    
    // 7. Combine all components
    const netEdge = baseEdge + regimeAdjustment + volatilityAdjustment + liquidityAdjustment
                   - executionCosts - slippageCosts - microstructureCosts 
                   - opportunityCosts - timingPenalty;

    return {
      baseEdge,
      executionCosts,
      opportunityCosts,
      microstructureCosts,
      slippageCosts,
      regimeAdjustment,
      volatilityAdjustment,
      liquidityAdjustment,
      timingPenalty,
      netEdge
    };
  }

  private analyzeVolumeProfile(candles: CandleData[]): VolumeProfile {
    if (candles.length < 20) {
      return {
        averageVolume: 1000,
        currentVolume: 1000,
        volumeRatio: 1.0,
        volumeTrend: 'stable',
        liquidityEstimate: 0.7
      };
    }

    const volumes = candles.map(c => c.volume || 1000);
    const recentVolumes = volumes.slice(-10);
    const historicalVolumes = volumes.slice(-50, -10);
    
    const avgRecent = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const avgHistorical = historicalVolumes.reduce((a, b) => a + b, 0) / historicalVolumes.length;
    const currentVolume = volumes[volumes.length - 1];
    
    const volumeRatio = avgRecent / avgHistorical;
    
    // Determine trend
    let volumeTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    const trend = recentVolumes.slice(-5).reduce((sum, vol, i, arr) => {
      if (i === 0) return 0;
      return sum + (vol > arr[i - 1] ? 1 : -1);
    }, 0);
    
    if (trend >= 2) volumeTrend = 'increasing';
    else if (trend <= -2) volumeTrend = 'decreasing';
    
    // Estimate liquidity (higher volume = higher liquidity)
    const liquidityEstimate = Math.min(1, Math.max(0.3, volumeRatio * 0.7));

    return {
      averageVolume: avgHistorical,
      currentVolume,
      volumeRatio,
      volumeTrend,
      liquidityEstimate
    };
  }

  private assessExecutionQuality(
    candles: CandleData[], 
    volumeProfile: VolumeProfile, 
    regime: RegimeContext
  ): ExecutionQuality {
    
    // Expected slippage based on regime and liquidity
    let expectedSlippage = this.DEFAULT_SPREAD * 0.5; // Base slippage
    
    if (regime.type === 'shock') {
      expectedSlippage *= 3; // High slippage during shock events
    } else if (regime.type === 'news_driven') {
      expectedSlippage *= 2; // Moderate slippage during news
    }
    
    expectedSlippage *= (2 - volumeProfile.liquidityEstimate); // Lower liquidity = higher slippage
    
    // Market impact (function of position size and liquidity)
    const marketImpact = Math.min(this.MAX_SLIPPAGE, expectedSlippage * 1.5);
    
    // Timing score (better during stable regimes)
    const timingScore = regime.type === 'ranging' ? 0.9 : 
                       regime.type === 'trending' ? 0.8 : 
                       regime.type === 'news_driven' ? 0.4 : 0.3;
    
    return {
      expectedSlippage: Math.min(this.MAX_SLIPPAGE, expectedSlippage),
      marketImpact,
      timingScore,
      liquidityScore: volumeProfile.liquidityEstimate,
      microstructureScore: this.calculateMicrostructureScore(candles)
    };
  }

  private calculateMicrostructureScore(candles: CandleData[]): number {
    if (candles.length < 5) return 0.5;
    
    const recent = candles.slice(-5);
    let score = 0.5;
    
    // Check for price stability (lower volatility = better microstructure)
    const priceChanges = recent.map((c, i) => {
      if (i === 0) return 0;
      return Math.abs(c.close - recent[i - 1].close) / recent[i - 1].close;
    });
    
    const avgChange = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
    score += (0.001 - Math.min(0.001, avgChange)) * 500; // Better score for lower volatility
    
    // Check for bid-ask spread stability (estimated from high-low range)
    const spreads = recent.map(c => (c.high - c.low) / c.close);
    const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;
    score += (0.002 - Math.min(0.002, avgSpread)) * 250; // Better score for tighter spreads
    
    return Math.min(1, Math.max(0.1, score));
  }

  private calculateExecutionCosts(positionSize: number, currentPrice: number): number {
    // Fixed costs: spread + commission
    const spreadCost = this.DEFAULT_SPREAD * (positionSize / currentPrice);
    const commissionCost = this.DEFAULT_COMMISSION * (positionSize / currentPrice);
    
    return spreadCost + commissionCost;
  }

  private calculateSlippageCosts(
    positionSize: number, 
    executionQuality: ExecutionQuality, 
    volumeProfile: VolumeProfile
  ): number {
    
    // Base slippage
    let slippageCost = executionQuality.expectedSlippage;
    
    // Add market impact based on position size relative to typical volume
    const relativeSize = positionSize / (volumeProfile.averageVolume * 1000); // Rough estimate
    const impactMultiplier = 1 + Math.min(5, relativeSize * 10); // Larger orders = more impact
    
    slippageCost *= impactMultiplier;
    
    return Math.min(this.MAX_SLIPPAGE, slippageCost);
  }

  private calculateMicrostructureCosts(candles: CandleData[], regime: RegimeContext): number {
    // Costs associated with adverse selection and information asymmetry
    let microCost = 0.00001; // Base microstructure cost
    
    // Higher costs during uncertain regimes
    microCost *= (1 + regime.uncertainty * 2);
    
    // Higher costs during high volatility periods
    if (candles.length >= 20) {
      const returns = candles.slice(-20).map((c, i, arr) => {
        if (i === 0) return 0;
        return (c.close - arr[i - 1].close) / arr[i - 1].close;
      });
      
      const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length);
      microCost *= (1 + volatility * 100); // Scale by volatility
    }
    
    return Math.min(0.0002, microCost); // Cap at 2 pips
  }

  private calculateOpportunityCosts(regime: RegimeContext, candles: CandleData[]): number {
    // Cost of missing other opportunities while in this trade
    let opCost = 0.00005; // Base opportunity cost
    
    // Higher opportunity cost in trending markets (more signals available)
    if (regime.type === 'trending') {
      opCost *= 1.5;
    }
    
    // Lower opportunity cost in ranging markets (fewer opportunities)
    if (regime.type === 'ranging') {
      opCost *= 0.7;
    }
    
    // Adjust for market activity level
    if (candles.length >= 10) {
      const recentActivity = candles.slice(-10).reduce((sum, c) => {
        return sum + ((c.high - c.low) / c.close);
      }, 0) / 10;
      
      opCost *= (1 + recentActivity * 100); // Higher activity = higher opportunity cost
    }
    
    return Math.min(0.0001, opCost); // Cap at 1 pip
  }

  private calculateRegimeAdjustment(regime: RegimeContext, baseEdge: number): number {
    // Adjust edge based on regime characteristics
    let adjustment = 0;
    
    switch (regime.type) {
      case 'trending':
        // Trending markets favor momentum strategies
        adjustment = baseEdge * 0.2 * regime.strength;
        break;
      case 'ranging':
        // Ranging markets favor mean reversion
        adjustment = baseEdge * 0.1 * regime.strength;
        break;
      case 'shock':
        // Shock regimes are unpredictable, reduce edge
        adjustment = -baseEdge * 0.3 * regime.strength;
        break;
      case 'news_driven':
        // News-driven markets have information asymmetry
        adjustment = -baseEdge * 0.15 * regime.strength;
        break;
    }
    
    return adjustment;
  }

  private calculateVolatilityAdjustment(candles: CandleData[], regime: RegimeContext): number {
    if (candles.length < 20) return 0;
    
    // Calculate recent volatility
    const returns = candles.slice(-20).map((c, i, arr) => {
      if (i === 0) return 0;
      return (c.close - arr[i - 1].close) / arr[i - 1].close;
    });
    
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length);
    
    // Optimal volatility range for trading
    const optimalVol = 0.001; // 0.1% per period
    const volDeviation = Math.abs(volatility - optimalVol);
    
    // Penalize extreme volatility
    let adjustment = -volDeviation * 0.5;
    
    // But reward moderate volatility in trending regimes
    if (regime.type === 'trending' && volatility > 0.0005 && volatility < 0.002) {
      adjustment += 0.00005;
    }
    
    return adjustment;
  }

  private calculateLiquidityAdjustment(volumeProfile: VolumeProfile, positionSize: number): number {
    // Reward high liquidity scenarios
    let adjustment = (volumeProfile.liquidityEstimate - 0.5) * 0.0001;
    
    // Penalize large positions in low liquidity
    const sizeImpact = Math.min(1, positionSize / 100000); // Relative to $100k
    if (volumeProfile.liquidityEstimate < 0.5) {
      adjustment -= sizeImpact * 0.0001;
    }
    
    return adjustment;
  }

  private calculateTimingPenalty(candles: CandleData[], regime: RegimeContext): number {
    // Penalty for poor timing (e.g., trading at support/resistance levels)
    let penalty = 0;
    
    if (candles.length >= 20) {
      const current = candles[candles.length - 1];
      const recent = candles.slice(-20);
      
      // Check if current price is near recent highs or lows
      const highs = recent.map(c => c.high);
      const lows = recent.map(c => c.low);
      const maxHigh = Math.max(...highs);
      const minLow = Math.min(...lows);
      
      const range = maxHigh - minLow;
      const position = (current.close - minLow) / range;
      
      // Penalty for trading at extremes (0 or 1 position in range)
      const extremeDistance = Math.min(position, 1 - position);
      if (extremeDistance < 0.1) {
        penalty = 0.00005; // Small penalty for poor timing
      }
      
      // Additional penalty during uncertain regimes
      penalty *= (1 + regime.uncertainty);
    }
    
    return penalty;
  }

  // Public utility methods
  getEdgeBreakdown(edgeComponents: EdgeComponents): Array<{ component: string; value: number; impact: 'positive' | 'negative' }> {
    return [
      { component: 'Base Edge', value: edgeComponents.baseEdge, impact: (edgeComponents.baseEdge > 0 ? 'positive' : 'negative') as 'positive' | 'negative' },
      { component: 'Regime Adjustment', value: edgeComponents.regimeAdjustment, impact: (edgeComponents.regimeAdjustment > 0 ? 'positive' : 'negative') as 'positive' | 'negative' },
      { component: 'Volatility Adjustment', value: edgeComponents.volatilityAdjustment, impact: (edgeComponents.volatilityAdjustment > 0 ? 'positive' : 'negative') as 'positive' | 'negative' },
      { component: 'Liquidity Adjustment', value: edgeComponents.liquidityAdjustment, impact: (edgeComponents.liquidityAdjustment > 0 ? 'positive' : 'negative') as 'positive' | 'negative' },
      { component: 'Execution Costs', value: -edgeComponents.executionCosts, impact: 'negative' as 'negative' },
      { component: 'Slippage Costs', value: -edgeComponents.slippageCosts, impact: 'negative' as 'negative' },
      { component: 'Microstructure Costs', value: -edgeComponents.microstructureCosts, impact: 'negative' as 'negative' },
      { component: 'Opportunity Costs', value: -edgeComponents.opportunityCosts, impact: 'negative' as 'negative' },
      { component: 'Timing Penalty', value: -edgeComponents.timingPenalty, impact: 'negative' as 'negative' }
    ].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }

  getExecutionRecommendations(executionQuality: ExecutionQuality, regime: RegimeContext): string[] {
    const recommendations = [];
    
    if (executionQuality.timingScore < 0.5) {
      recommendations.push(`Poor timing (score: ${executionQuality.timingScore.toFixed(2)}) - consider waiting for better entry`);
    }
    
    if (executionQuality.liquidityScore < 0.4) {
      recommendations.push(`Low liquidity (score: ${executionQuality.liquidityScore.toFixed(2)}) - reduce position size`);
    }
    
    if (executionQuality.expectedSlippage > 0.0002) {
      recommendations.push(`High slippage expected (${(executionQuality.expectedSlippage * 10000).toFixed(1)} pips) - use limit orders`);
    }
    
    if (regime.uncertainty > 0.7) {
      recommendations.push(`High uncertainty (${(regime.uncertainty * 100).toFixed(0)}%) - reduce position size or wait`);
    }
    
    if (regime.type === 'shock') {
      recommendations.push('Shock regime detected - consider avoiding entry or using very tight stops');
    }
    
    return recommendations;
  }
}