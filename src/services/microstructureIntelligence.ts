// Microstructure Intelligence Module
// Analyzes order flow, liquidity, and market microstructure for optimal execution

export interface OrderBookData {
  bids: Array<{ price: number; size: number; count: number }>;
  asks: Array<{ price: number; size: number; count: number }>;
  timestamp: Date;
  spread: number;
}

export interface OrderFlowMetrics {
  buyVolume: number;
  sellVolume: number;
  netOrderFlow: number;
  volumeWeightedAveragePrice: number;
  orderImbalance: number; // -1 (heavy selling) to 1 (heavy buying)
  aggressiveRatio: number; // Ratio of market orders to total orders
  liquidityTakenRatio: number;
}

export interface LiquidityMetrics {
  bidLiquidity: number;
  askLiquidity: number;
  totalLiquidity: number;
  liquidityImbalance: number;
  averageOrderSize: number;
  orderBookDepth: number;
  resilience: number; // How quickly liquidity replenishes
  toxicLiquidityScore: number; // 0-1, higher = more toxic
}

export interface ExecutionQuality {
  expectedSlippage: number;
  marketImpact: number;
  timingRisk: number;
  liquiditySweepRisk: number;
  executionScore: number; // 0-100, higher = better
  optimalExecutionTime: Date;
  recommendedOrderSize: number;
}

export interface MicrostructureState {
  orderFlow: OrderFlowMetrics;
  liquidity: LiquidityMetrics;
  execution: ExecutionQuality;
  regime: 'normal' | 'stressed' | 'illiquid' | 'toxic' | 'sweep_zone';
  confidence: number;
  timestamp: Date;
}

export interface LiquiditySweep {
  direction: 'up' | 'down';
  levels: number[];
  estimatedVolume: number;
  probability: number;
  timeWindow: number; // minutes
  triggerPrice: number;
}

export class MicrostructureIntelligenceEngine {
  private orderBookHistory: OrderBookData[] = [];
  private orderFlowHistory: OrderFlowMetrics[] = [];
  private liquidityHistory: LiquidityMetrics[] = [];
  private executionHistory: ExecutionQuality[] = [];
  private sweepDetection: LiquiditySweep[] = [];

  // ==================== MAIN ANALYSIS ENTRY POINT ====================

  async analyzeMicrostructure(
    orderBook: OrderBookData,
    recentTrades: Array<{ price: number; size: number; side: 'buy' | 'sell'; timestamp: Date }>,
    candles: Array<{ open: number; high: number; low: number; close: number; volume: number }>,
    currentPrice: number
  ): Promise<MicrostructureState> {
    // Store order book data
    this.orderBookHistory.push(orderBook);
    this.trimHistory();

    // Calculate metrics
    const orderFlow = this.calculateOrderFlowMetrics(recentTrades, currentPrice);
    const liquidity = this.calculateLiquidityMetrics(orderBook, this.orderBookHistory);
    const execution = this.calculateExecutionQuality(orderBook, orderFlow, liquidity, candles);

    // Determine microstructure regime
    const regime = this.detectMicrostructureRegime(orderFlow, liquidity, execution);

    // Calculate confidence in analysis
    const confidence = this.calculateAnalysisConfidence(orderBook, recentTrades.length);

    // Store metrics for historical analysis
    this.orderFlowHistory.push(orderFlow);
    this.liquidityHistory.push(liquidity);
    this.executionHistory.push(execution);

    // Detect potential liquidity sweeps
    const sweeps = this.detectLiquiditySweeps(orderBook, orderFlow, candles);
    this.sweepDetection.push(...sweeps);

    return {
      orderFlow,
      liquidity,
      execution,
      regime,
      confidence,
      timestamp: new Date()
    };
  }

  // ==================== ORDER FLOW ANALYSIS ====================

  private calculateOrderFlowMetrics(
    trades: Array<{ price: number; size: number; side: 'buy' | 'sell'; timestamp: Date }>,
    currentPrice: number
  ): OrderFlowMetrics {
    if (trades.length === 0) {
      return {
        buyVolume: 0,
        sellVolume: 0,
        netOrderFlow: 0,
        volumeWeightedAveragePrice: currentPrice,
        orderImbalance: 0,
        aggressiveRatio: 0,
        liquidityTakenRatio: 0
      };
    }

    // Calculate volume metrics
    const buyVolume = trades.filter(t => t.side === 'buy').reduce((sum, t) => sum + t.size, 0);
    const sellVolume = trades.filter(t => t.side === 'sell').reduce((sum, t) => sum + t.size, 0);
    const totalVolume = buyVolume + sellVolume;
    const netOrderFlow = buyVolume - sellVolume;

    // Calculate VWAP
    const totalValue = trades.reduce((sum, t) => sum + (t.price * t.size), 0);
    const volumeWeightedAveragePrice = totalVolume > 0 ? totalValue / totalVolume : currentPrice;

    // Order imbalance (-1 to 1)
    const orderImbalance = totalVolume > 0 ? netOrderFlow / totalVolume : 0;

    // Aggressive ratio (approximated by trades near/away from mid)
    const mid = currentPrice; // Simplified - would use actual bid/ask mid
    const aggressiveTrades = trades.filter(t => 
      (t.side === 'buy' && t.price >= mid) || (t.side === 'sell' && t.price <= mid)
    ).length;
    const aggressiveRatio = trades.length > 0 ? aggressiveTrades / trades.length : 0;

    // Liquidity taken ratio (aggressive trades vs passive)
    const liquidityTakenRatio = aggressiveRatio; // Simplified

    return {
      buyVolume,
      sellVolume,
      netOrderFlow,
      volumeWeightedAveragePrice,
      orderImbalance,
      aggressiveRatio,
      liquidityTakenRatio
    };
  }

  // ==================== LIQUIDITY ANALYSIS ====================

  private calculateLiquidityMetrics(
    currentOrderBook: OrderBookData,
    orderBookHistory: OrderBookData[]
  ): LiquidityMetrics {
    const { bids, asks } = currentOrderBook;

    // Calculate liquidity depth
    const bidLiquidity = bids.reduce((sum, level) => sum + level.size, 0);
    const askLiquidity = asks.reduce((sum, level) => sum + level.size, 0);
    const totalLiquidity = bidLiquidity + askLiquidity;

    // Liquidity imbalance
    const liquidityImbalance = totalLiquidity > 0 ? 
      (bidLiquidity - askLiquidity) / totalLiquidity : 0;

    // Average order size
    const allOrders = [...bids, ...asks];
    const averageOrderSize = allOrders.length > 0 ? 
      allOrders.reduce((sum, level) => sum + level.size, 0) / allOrders.length : 0;

    // Order book depth (price levels within 0.1% of mid)
    const mid = (bids[0]?.price + asks[0]?.price) / 2 || 0;
    const depthThreshold = mid * 0.001; // 0.1%
    const bidDepth = bids.filter(b => b.price >= mid - depthThreshold).length;
    const askDepth = asks.filter(a => a.price <= mid + depthThreshold).length;
    const orderBookDepth = bidDepth + askDepth;

    // Resilience calculation (liquidity replenishment rate)
    const resilience = this.calculateLiquidityResilience(orderBookHistory);

    // Toxic liquidity detection
    const toxicLiquidityScore = this.detectToxicLiquidity(currentOrderBook, orderBookHistory);

    return {
      bidLiquidity,
      askLiquidity,
      totalLiquidity,
      liquidityImbalance,
      averageOrderSize,
      orderBookDepth,
      resilience,
      toxicLiquidityScore
    };
  }

  private calculateLiquidityResilience(orderBookHistory: OrderBookData[]): number {
    if (orderBookHistory.length < 10) return 0.5; // Default neutral resilience

    const recent = orderBookHistory.slice(-10);
    let resilienceSum = 0;
    let resilienceCount = 0;

    for (let i = 1; i < recent.length; i++) {
      const current = recent[i];
      const previous = recent[i - 1];

      // Calculate liquidity changes
      const currentTotal = [...current.bids, ...current.asks].reduce((sum, level) => sum + level.size, 0);
      const previousTotal = [...previous.bids, ...previous.asks].reduce((sum, level) => sum + level.size, 0);

      if (previousTotal > 0) {
        const liquidityChange = (currentTotal - previousTotal) / previousTotal;
        // Positive change indicates good resilience
        resilienceSum += Math.max(0, liquidityChange);
        resilienceCount++;
      }
    }

    return resilienceCount > 0 ? Math.min(1, resilienceSum / resilienceCount * 10) : 0.5;
  }

  private detectToxicLiquidity(
    currentOrderBook: OrderBookData,
    orderBookHistory: OrderBookData[]
  ): number {
    let toxicScore = 0;

    // Check for unusual order patterns
    const { bids, asks } = currentOrderBook;

    // Large orders at round numbers (potential spoofing)
    const roundNumberOrders = [...bids, ...asks].filter(level => {
      const price = level.price;
      const roundness = price % 0.0001; // Check for round numbers
      return roundness === 0 && level.size > 100000; // Large size at round price
    });
    toxicScore += Math.min(0.3, roundNumberOrders.length * 0.1);

    // Rapid order book changes (potential manipulation)
    if (orderBookHistory.length >= 5) {
      const recent = orderBookHistory.slice(-5);
      let rapidChanges = 0;

      for (let i = 1; i < recent.length; i++) {
        const current = recent[i];
        const previous = recent[i - 1];

        // Check for dramatic spread changes
        const spreadChange = Math.abs(current.spread - previous.spread) / previous.spread;
        if (spreadChange > 0.1) rapidChanges++; // > 10% spread change
      }

      toxicScore += Math.min(0.4, rapidChanges * 0.1);
    }

    // Extremely thin order book
    const totalLiquidity = [...bids, ...asks].reduce((sum, level) => sum + level.size, 0);
    if (totalLiquidity < 10000) { // Very thin
      toxicScore += 0.3;
    }

    return Math.min(1, toxicScore);
  }

  // ==================== EXECUTION QUALITY ANALYSIS ====================

  private calculateExecutionQuality(
    orderBook: OrderBookData,
    orderFlow: OrderFlowMetrics,
    liquidity: LiquidityMetrics,
    candles: Array<{ open: number; high: number; low: number; close: number; volume: number }>
  ): ExecutionQuality {
    const { bids, asks, spread } = orderBook;
    const mid = (bids[0]?.price + asks[0]?.price) / 2 || 0;

    // Expected slippage based on order book depth
    const expectedSlippage = this.calculateExpectedSlippage(orderBook, 10000); // 10k unit order

    // Market impact estimation
    const marketImpact = this.calculateMarketImpact(liquidity, orderFlow);

    // Timing risk (volatility-based)
    const timingRisk = this.calculateTimingRisk(candles);

    // Liquidity sweep risk
    const liquiditySweepRisk = this.calculateSweepRisk(orderBook, orderFlow);

    // Combined execution score
    const executionScore = this.calculateExecutionScore(
      expectedSlippage,
      marketImpact,
      timingRisk,
      liquiditySweepRisk,
      liquidity
    );

    // Optimal execution timing
    const optimalExecutionTime = this.calculateOptimalTiming(orderFlow, liquidity);

    // Recommended order size
    const recommendedOrderSize = this.calculateOptimalOrderSize(orderBook, liquidity);

    return {
      expectedSlippage,
      marketImpact,
      timingRisk,
      liquiditySweepRisk,
      executionScore,
      optimalExecutionTime,
      recommendedOrderSize
    };
  }

  private calculateExpectedSlippage(orderBook: OrderBookData, orderSize: number): number {
    const { bids, asks } = orderBook;
    
    // Calculate slippage for a buy order
    let remainingSize = orderSize;
    let totalCost = 0;
    let weightedPrice = 0;

    for (const ask of asks) {
      if (remainingSize <= 0) break;
      
      const sizeToTake = Math.min(remainingSize, ask.size);
      totalCost += sizeToTake * ask.price;
      weightedPrice += sizeToTake;
      remainingSize -= sizeToTake;
    }

    if (weightedPrice === 0) return 0.01; // 1% default slippage if no liquidity

    const avgExecutionPrice = totalCost / weightedPrice;
    const bestAsk = asks[0]?.price || 0;
    const slippage = bestAsk > 0 ? (avgExecutionPrice - bestAsk) / bestAsk : 0.01;

    return Math.max(0, slippage);
  }

  private calculateMarketImpact(liquidity: LiquidityMetrics, orderFlow: OrderFlowMetrics): number {
    // Market impact based on Kyle's lambda model
    const lambda = 0.01; // Impact coefficient (would be calibrated)
    const signedVolume = orderFlow.netOrderFlow;
    const totalLiquidity = liquidity.totalLiquidity;

    if (totalLiquidity === 0) return 0.005; // 0.5% default impact

    // Impact = lambda * (signed volume / liquidity)
    const impact = lambda * Math.abs(signedVolume) / totalLiquidity;
    
    return Math.min(0.02, impact); // Cap at 2%
  }

  private calculateTimingRisk(candles: Array<{ open: number; high: number; low: number; close: number; volume: number }>): number {
    if (candles.length < 20) return 0.5; // Default medium risk

    // Calculate recent volatility
    const recent = candles.slice(-20);
    const returns = [];
    for (let i = 1; i < recent.length; i++) {
      returns.push((recent[i].close - recent[i - 1].close) / recent[i - 1].close);
    }

    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length);
    
    // Higher volatility = higher timing risk
    return Math.min(1, volatility * 100); // Scale to 0-1
  }

  private calculateSweepRisk(orderBook: OrderBookData, orderFlow: OrderFlowMetrics): number {
    let sweepRisk = 0;

    // Check for imbalanced order flow
    if (Math.abs(orderFlow.orderImbalance) > 0.6) {
      sweepRisk += 0.3;
    }

    // Check for thin order book levels
    const { bids, asks } = orderBook;
    const topLevels = 5;
    const topBids = bids.slice(0, topLevels);
    const topAsks = asks.slice(0, topLevels);

    const avgBidSize = topBids.reduce((sum, b) => sum + b.size, 0) / topLevels;
    const avgAskSize = topAsks.reduce((sum, a) => sum + a.size, 0) / topLevels;

    if (avgBidSize < 5000 || avgAskSize < 5000) { // Thin levels
      sweepRisk += 0.4;
    }

    // Check for aggressive order flow
    if (orderFlow.aggressiveRatio > 0.7) {
      sweepRisk += 0.3;
    }

    return Math.min(1, sweepRisk);
  }

  private calculateExecutionScore(
    slippage: number,
    impact: number,
    timingRisk: number,
    sweepRisk: number,
    liquidity: LiquidityMetrics
  ): number {
    // Weighted scoring (0-100)
    let score = 100;

    // Penalize high slippage
    score -= slippage * 1000; // 1% slippage = -10 points

    // Penalize high market impact
    score -= impact * 1500; // 1% impact = -15 points

    // Penalize timing risk
    score -= timingRisk * 20; // High timing risk = -20 points

    // Penalize sweep risk
    score -= sweepRisk * 25; // High sweep risk = -25 points

    // Bonus for good liquidity
    if (liquidity.totalLiquidity > 50000) {
      score += 10;
    }

    // Bonus for balanced order book
    if (Math.abs(liquidity.liquidityImbalance) < 0.2) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateOptimalTiming(orderFlow: OrderFlowMetrics, liquidity: LiquidityMetrics): Date {
    // Simple optimal timing calculation
    const now = new Date();
    let delayMinutes = 0;

    // If order flow is heavily imbalanced, wait for it to normalize
    if (Math.abs(orderFlow.orderImbalance) > 0.7) {
      delayMinutes += 2;
    }

    // If liquidity is poor, wait for better conditions
    if (liquidity.toxicLiquidityScore > 0.6) {
      delayMinutes += 5;
    }

    // If resilience is poor, wait for liquidity replenishment
    if (liquidity.resilience < 0.3) {
      delayMinutes += 3;
    }

    return new Date(now.getTime() + delayMinutes * 60 * 1000);
  }

  private calculateOptimalOrderSize(orderBook: OrderBookData, liquidity: LiquidityMetrics): number {
    // Optimal size based on available liquidity
    const totalLiquidity = liquidity.totalLiquidity;
    
    // Don't take more than 10% of available liquidity
    const maxSize = totalLiquidity * 0.1;
    
    // Consider order book depth
    const depthFactor = Math.min(1, liquidity.orderBookDepth / 10);
    const recommendedSize = maxSize * depthFactor;

    return Math.max(1000, Math.min(100000, recommendedSize)); // Between 1k and 100k
  }

  // ==================== REGIME DETECTION ====================

  private detectMicrostructureRegime(
    orderFlow: OrderFlowMetrics,
    liquidity: LiquidityMetrics,
    execution: ExecutionQuality
  ): MicrostructureState['regime'] {
    // Normal regime
    if (liquidity.toxicLiquidityScore < 0.3 && 
        execution.executionScore > 70 && 
        Math.abs(orderFlow.orderImbalance) < 0.5) {
      return 'normal';
    }

    // Stressed regime
    if (Math.abs(orderFlow.orderImbalance) > 0.7 || 
        orderFlow.aggressiveRatio > 0.8 ||
        execution.timingRisk > 0.7) {
      return 'stressed';
    }

    // Illiquid regime
    if (liquidity.totalLiquidity < 10000 || 
        liquidity.resilience < 0.2 ||
        execution.expectedSlippage > 0.005) {
      return 'illiquid';
    }

    // Toxic regime
    if (liquidity.toxicLiquidityScore > 0.7 || 
        execution.liquiditySweepRisk > 0.8) {
      return 'toxic';
    }

    // Sweep zone
    if (execution.liquiditySweepRisk > 0.6 && 
        Math.abs(orderFlow.orderImbalance) > 0.6) {
      return 'sweep_zone';
    }

    return 'normal'; // Default
  }

  // ==================== LIQUIDITY SWEEP DETECTION ====================

  private detectLiquiditySweeps(
    orderBook: OrderBookData,
    orderFlow: OrderFlowMetrics,
    candles: Array<{ open: number; high: number; low: number; close: number; volume: number }>
  ): LiquiditySweep[] {
    const sweeps: LiquiditySweep[] = [];
    const { bids, asks } = orderBook;

    // Detect potential upside sweep
    if (orderFlow.orderImbalance > 0.5 && orderFlow.aggressiveRatio > 0.6) {
      const resistanceLevels = this.findResistanceLevels(asks, candles);
      if (resistanceLevels.length > 0) {
        sweeps.push({
          direction: 'up',
          levels: resistanceLevels,
          estimatedVolume: orderFlow.buyVolume * 2, // Estimate
          probability: this.calculateSweepProbability(orderFlow, 'up'),
          timeWindow: 15, // 15 minutes
          triggerPrice: resistanceLevels[0]
        });
      }
    }

    // Detect potential downside sweep
    if (orderFlow.orderImbalance < -0.5 && orderFlow.aggressiveRatio > 0.6) {
      const supportLevels = this.findSupportLevels(bids, candles);
      if (supportLevels.length > 0) {
        sweeps.push({
          direction: 'down',
          levels: supportLevels,
          estimatedVolume: orderFlow.sellVolume * 2, // Estimate
          probability: this.calculateSweepProbability(orderFlow, 'down'),
          timeWindow: 15, // 15 minutes
          triggerPrice: supportLevels[0]
        });
      }
    }

    return sweeps;
  }

  private findResistanceLevels(
    asks: Array<{ price: number; size: number; count: number }>,
    candles: Array<{ open: number; high: number; low: number; close: number; volume: number }>
  ): number[] {
    const levels: number[] = [];

    // Find order book resistance (large ask orders)
    const largeAsks = asks.filter(ask => ask.size > 50000); // Large orders
    levels.push(...largeAsks.map(ask => ask.price));

    // Find historical resistance from candles
    if (candles.length >= 50) {
      const recent = candles.slice(-50);
      const highs = recent.map(c => c.high);
      const resistanceZones = this.findSignificantLevels(highs);
      levels.push(...resistanceZones);
    }

    // Sort and return top 3 levels
    return levels.sort((a, b) => a - b).slice(0, 3);
  }

  private findSupportLevels(
    bids: Array<{ price: number; size: number; count: number }>,
    candles: Array<{ open: number; high: number; low: number; close: number; volume: number }>
  ): number[] {
    const levels: number[] = [];

    // Find order book support (large bid orders)
    const largeBids = bids.filter(bid => bid.size > 50000); // Large orders
    levels.push(...largeBids.map(bid => bid.price));

    // Find historical support from candles
    if (candles.length >= 50) {
      const recent = candles.slice(-50);
      const lows = recent.map(c => c.low);
      const supportZones = this.findSignificantLevels(lows);
      levels.push(...supportZones);
    }

    // Sort and return top 3 levels
    return levels.sort((a, b) => b - a).slice(0, 3);
  }

  private findSignificantLevels(prices: number[]): number[] {
    // Group prices and find most touched levels
    const tolerance = 0.0001; // 1 pip tolerance
    const levelCounts = new Map<number, number>();

    for (const price of prices) {
      const level = Math.round(price / tolerance) * tolerance;
      levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
    }

    // Return levels touched 3+ times
    return Array.from(levelCounts.entries())
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1]) // Sort by frequency
      .map(([level, _]) => level)
      .slice(0, 5); // Top 5 levels
  }

  private calculateSweepProbability(orderFlow: OrderFlowMetrics, direction: 'up' | 'down'): number {
    let probability = 0.3; // Base probability

    // Order imbalance factor
    const imbalance = orderFlow.orderImbalance;
    if ((direction === 'up' && imbalance > 0.5) || (direction === 'down' && imbalance < -0.5)) {
      probability += Math.abs(imbalance) * 0.4;
    }

    // Aggressive ratio factor
    if (orderFlow.aggressiveRatio > 0.6) {
      probability += (orderFlow.aggressiveRatio - 0.6) * 0.5;
    }

    // Liquidity taken factor
    if (orderFlow.liquidityTakenRatio > 0.7) {
      probability += (orderFlow.liquidityTakenRatio - 0.7) * 0.3;
    }

    return Math.min(0.9, probability);
  }

  private calculateAnalysisConfidence(orderBook: OrderBookData, tradeCount: number): number {
    let confidence = 0.5; // Base confidence

    // More trades = higher confidence
    confidence += Math.min(0.3, tradeCount / 100 * 0.3);

    // Better order book depth = higher confidence
    const totalOrders = orderBook.bids.length + orderBook.asks.length;
    confidence += Math.min(0.2, totalOrders / 50 * 0.2);

    return Math.min(1, confidence);
  }

  private trimHistory(): void {
    const maxHistory = 1000;
    
    if (this.orderBookHistory.length > maxHistory) {
      this.orderBookHistory = this.orderBookHistory.slice(-maxHistory);
    }
    if (this.orderFlowHistory.length > maxHistory) {
      this.orderFlowHistory = this.orderFlowHistory.slice(-maxHistory);
    }
    if (this.liquidityHistory.length > maxHistory) {
      this.liquidityHistory = this.liquidityHistory.slice(-maxHistory);
    }
    if (this.executionHistory.length > maxHistory) {
      this.executionHistory = this.executionHistory.slice(-maxHistory);
    }
    if (this.sweepDetection.length > 100) {
      this.sweepDetection = this.sweepDetection.slice(-100);
    }
  }

  // ==================== PUBLIC API ====================

  public shouldRejectTrade(
    microstructureState: MicrostructureState,
    orderSize: number,
    timeHorizon: number // minutes
  ): { reject: boolean; reason?: string } {
    // Reject in toxic conditions
    if (microstructureState.regime === 'toxic') {
      return { reject: true, reason: 'Toxic liquidity detected' };
    }

    // Reject if execution score is too poor
    if (microstructureState.execution.executionScore < 30) {
      return { reject: true, reason: `Poor execution quality: ${microstructureState.execution.executionScore.toFixed(0)}` };
    }

    // Reject if high sweep risk and we're on the wrong side
    if (microstructureState.execution.liquiditySweepRisk > 0.8) {
      return { reject: true, reason: 'High liquidity sweep risk' };
    }

    // Reject if order size is too large for current liquidity
    if (orderSize > microstructureState.execution.recommendedOrderSize * 2) {
      return { reject: true, reason: 'Order size too large for current liquidity' };
    }

    // Reject if timing is poor (should wait)
    const waitTime = microstructureState.execution.optimalExecutionTime.getTime() - Date.now();
    if (waitTime > timeHorizon * 60 * 1000) {
      return { reject: true, reason: `Should wait ${Math.round(waitTime / 60000)} minutes for optimal execution` };
    }

    return { reject: false };
  }

  public getLiquiditySweeps(): LiquiditySweep[] {
    return [...this.sweepDetection];
  }

  public getHistoricalMetrics(): {
    orderFlow: OrderFlowMetrics[];
    liquidity: LiquidityMetrics[];
    execution: ExecutionQuality[];
  } {
    return {
      orderFlow: [...this.orderFlowHistory],
      liquidity: [...this.liquidityHistory],
      execution: [...this.executionHistory]
    };
  }

  public getOptimalEntryTiming(
    currentState: MicrostructureState,
    direction: 'buy' | 'sell'
  ): { timing: 'immediate' | 'wait' | 'post_sweep'; reason: string; waitTime?: number } {
    // Check for immediate execution suitability
    if (currentState.regime === 'normal' && currentState.execution.executionScore > 80) {
      return { timing: 'immediate', reason: 'Excellent execution conditions' };
    }

    // Check for liquidity sweep opportunity
    const relevantSweeps = this.sweepDetection.filter(sweep => {
      const isRelevantDirection = (direction === 'buy' && sweep.direction === 'down') ||
                                 (direction === 'sell' && sweep.direction === 'up');
      const isRecent = sweep.timeWindow > 0;
      return isRelevantDirection && isRecent && sweep.probability > 0.6;
    });

    if (relevantSweeps.length > 0) {
      return { 
        timing: 'post_sweep', 
        reason: `Wait for ${relevantSweeps[0].direction} sweep to complete`,
        waitTime: relevantSweeps[0].timeWindow
      };
    }

    // Check if should wait for better conditions
    const waitTime = currentState.execution.optimalExecutionTime.getTime() - Date.now();
    if (waitTime > 0 && waitTime < 10 * 60 * 1000) { // Less than 10 minutes
      return { 
        timing: 'wait', 
        reason: 'Wait for better execution conditions',
        waitTime: Math.round(waitTime / 60000)
      };
    }

    return { timing: 'immediate', reason: 'Acceptable conditions for execution' };
  }
}