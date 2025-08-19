// Advanced Position Sizing Engine - CVaR-Constrained Kelly Criterion with Regime Awareness
// Implements mathematical position sizing for maximum long-term growth while controlling risk

export interface PositionSizingParameters {
  accountBalance: number;
  riskPerTrade: number; // Base risk per trade (e.g., 0.02 = 2%)
  maxPositionSize: number; // Maximum position as % of account (e.g., 0.1 = 10%)
  cvarLimit: number; // Conditional Value at Risk limit (e.g., 0.05 = 5%)
  maxDrawdownBudget: number; // Maximum drawdown budget (e.g., 0.15 = 15%)
  correlationMatrix: number[][]; // Position correlation matrix
  currentDrawdown: number; // Current portfolio drawdown
  openPositions: OpenPosition[];
}

export interface OpenPosition {
  id: string;
  symbol: string;
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  correlation: Record<string, number>; // Correlation with other positions
}

export interface PositionSizeResult {
  optimalSize: number;
  kellyFraction: number;
  riskAdjustedSize: number;
  cvarConstrainedSize: number;
  correlationAdjustedSize: number;
  finalSize: number;
  riskMetrics: {
    expectedReturn: number;
    expectedRisk: number;
    sharpeRatio: number;
    cvarEstimate: number;
    maxDrawdownImpact: number;
  };
  constraints: {
    kellyLimit: boolean;
    cvarLimit: boolean;
    correlationLimit: boolean;
    drawdownLimit: boolean;
    maxPositionLimit: boolean;
  };
  reasoning: string[];
}

export interface RiskBudget {
  totalRiskBudget: number;
  usedRiskBudget: number;
  availableRiskBudget: number;
  riskPerPosition: Record<string, number>;
  diversificationBenefit: number;
}

export class AdvancedPositionSizing {
  private riskBudgetHistory: RiskBudget[] = [];
  private positionHistory: { size: number; pnl: number; maxDrawdown: number; timestamp: Date }[] = [];
  
  // ==================== KELLY CRITERION WITH CVaR CONSTRAINTS ====================
  
  calculateOptimalPositionSize(
    winProbability: number,
    expectedReturn: number,
    expectedLoss: number,
    confidence: number,
    params: PositionSizingParameters
  ): PositionSizeResult {
    const reasoning: string[] = [];
    
    // 1. Calculate base Kelly fraction
    const kellyFraction = this.calculateKellyFraction(winProbability, expectedReturn, expectedLoss);
    reasoning.push(`Base Kelly fraction: ${(kellyFraction * 100).toFixed(2)}%`);
    
    // 2. Apply confidence scaling
    const confidenceScaledKelly = kellyFraction * confidence;
    reasoning.push(`Confidence-scaled Kelly: ${(confidenceScaledKelly * 100).toFixed(2)}% (confidence: ${(confidence * 100).toFixed(1)}%)`);
    
    // 3. Calculate CVaR-constrained size
    const cvarConstrainedSize = this.applyCVaRConstraint(
      confidenceScaledKelly,
      expectedReturn,
      expectedLoss,
      params.cvarLimit,
      params.accountBalance
    );
    reasoning.push(`CVaR-constrained size: ${(cvarConstrainedSize * 100).toFixed(2)}%`);
    
    // 4. Apply drawdown budget constraint
    const drawdownConstrainedSize = this.applyDrawdownConstraint(
      cvarConstrainedSize,
      params.currentDrawdown,
      params.maxDrawdownBudget,
      params.accountBalance
    );
    reasoning.push(`Drawdown-constrained size: ${(drawdownConstrainedSize * 100).toFixed(2)}%`);
    
    // 5. Apply correlation adjustment
    const correlationAdjustedSize = this.applyCorrelationAdjustment(
      drawdownConstrainedSize,
      params.openPositions,
      params.correlationMatrix
    );
    reasoning.push(`Correlation-adjusted size: ${(correlationAdjustedSize * 100).toFixed(2)}%`);
    
    // 6. Apply maximum position limit
    const maxConstrainedSize = Math.min(correlationAdjustedSize, params.maxPositionSize);
    reasoning.push(`Max position limit: ${(params.maxPositionSize * 100).toFixed(1)}%`);
    
    // 7. Apply minimum position size (for execution feasibility)
    const minPositionSize = 0.001; // 0.1% minimum
    const finalSize = Math.max(minPositionSize, maxConstrainedSize);
    
    if (finalSize === minPositionSize && maxConstrainedSize < minPositionSize) {
      reasoning.push(`Position too small - using minimum size: ${(minPositionSize * 100).toFixed(1)}%`);
    }
    
    // Calculate risk metrics for the final position size
    const riskMetrics = this.calculateRiskMetrics(
      finalSize,
      winProbability,
      expectedReturn,
      expectedLoss,
      params.accountBalance
    );
    
    // Determine which constraints were active
    const constraints = {
      kellyLimit: confidenceScaledKelly !== kellyFraction,
      cvarLimit: cvarConstrainedSize < confidenceScaledKelly,
      correlationLimit: correlationAdjustedSize < drawdownConstrainedSize,
      drawdownLimit: drawdownConstrainedSize < cvarConstrainedSize,
      maxPositionLimit: maxConstrainedSize < correlationAdjustedSize
    };
    
    return {
      optimalSize: finalSize,
      kellyFraction,
      riskAdjustedSize: confidenceScaledKelly,
      cvarConstrainedSize,
      correlationAdjustedSize,
      finalSize,
      riskMetrics,
      constraints,
      reasoning
    };
  }
  
  private calculateKellyFraction(winProbability: number, expectedReturn: number, expectedLoss: number): number {
    // Kelly Criterion: f* = (p * b - q) / b
    // Where: p = win probability, q = loss probability, b = reward/risk ratio
    
    const lossProbability = 1 - winProbability;
    const rewardRiskRatio = Math.abs(expectedReturn / expectedLoss);
    
    const kelly = (winProbability * rewardRiskRatio - lossProbability) / rewardRiskRatio;
    
    // Cap Kelly at 25% for safety (full Kelly can be too aggressive)
    return Math.max(0, Math.min(0.25, kelly));
  }
  
  private applyCVaRConstraint(
    kellySize: number,
    expectedReturn: number,
    expectedLoss: number,
    cvarLimit: number,
    accountBalance: number
  ): number {
    // Conditional Value at Risk (CVaR) - expected loss in worst 5% of cases
    // CVaR = E[Loss | Loss > VaR_95%]
    
    // Estimate VaR at 95% confidence (assuming normal distribution)
    const volatility = Math.sqrt(kellySize * Math.abs(expectedLoss)); // Simplified volatility estimate
    const var95 = 1.645 * volatility; // 95% VaR using normal approximation
    
    // CVaR is typically 1.3-1.5x the VaR for normal distributions
    const cvarEstimate = var95 * 1.4;
    
    // Maximum position size that keeps CVaR within limit
    const maxCVaRSize = (cvarLimit * accountBalance) / Math.abs(expectedLoss);
    
    return Math.min(kellySize, maxCVaRSize);
  }
  
  private applyDrawdownConstraint(
    currentSize: number,
    currentDrawdown: number,
    maxDrawdownBudget: number,
    accountBalance: number
  ): number {
    // Reduce position size as we approach maximum drawdown limit
    const remainingDrawdownBudget = maxDrawdownBudget - Math.abs(currentDrawdown);
    
    if (remainingDrawdownBudget <= 0) {
      return 0; // No trading if at max drawdown
    }
    
    // Scale position size by remaining drawdown budget
    const drawdownScaling = Math.min(1, remainingDrawdownBudget / (maxDrawdownBudget * 0.5));
    
    return currentSize * drawdownScaling;
  }
  
  private applyCorrelationAdjustment(
    currentSize: number,
    openPositions: OpenPosition[],
    correlationMatrix: number[][]
  ): number {
    if (openPositions.length === 0) {
      return currentSize; // No adjustment needed if no open positions
    }
    
    // Calculate portfolio risk contribution from correlations
    let totalCorrelation = 0;
    let totalExposure = 0;
    
    openPositions.forEach(position => {
      const positionExposure = Math.abs(position.size);
      totalExposure += positionExposure;
      
      // Simplified correlation calculation (in production, use full matrix)
      const avgCorrelation = 0.3; // Assume moderate correlation for simplicity
      totalCorrelation += positionExposure * avgCorrelation;
    });
    
    // Reduce new position size based on existing portfolio correlation
    const correlationPenalty = Math.min(0.5, totalCorrelation / 10); // Max 50% reduction
    const adjustmentFactor = 1 - correlationPenalty;
    
    return currentSize * adjustmentFactor;
  }
  
  // ==================== RISK METRICS CALCULATION ====================
  
  private calculateRiskMetrics(
    positionSize: number,
    winProbability: number,
    expectedReturn: number,
    expectedLoss: number,
    accountBalance: number
  ): PositionSizeResult['riskMetrics'] {
    const positionValue = positionSize * accountBalance;
    
    // Expected return and risk
    const expectedPositionReturn = winProbability * expectedReturn * positionSize + 
                                  (1 - winProbability) * expectedLoss * positionSize;
    const expectedPositionRisk = Math.sqrt(
      winProbability * Math.pow(expectedReturn * positionSize, 2) + 
      (1 - winProbability) * Math.pow(expectedLoss * positionSize, 2) - 
      Math.pow(expectedPositionReturn, 2)
    );
    
    // Sharpe ratio (annualized, assuming ~250 trading days)
    const annualizedReturn = expectedPositionReturn * 250;
    const annualizedVolatility = expectedPositionRisk * Math.sqrt(250);
    const sharpeRatio = annualizedVolatility > 0 ? annualizedReturn / annualizedVolatility : 0;
    
    // CVaR estimate (simplified)
    const var95 = 1.645 * expectedPositionRisk;
    const cvarEstimate = var95 * 1.4; // CVaR typically 1.4x VaR for normal distribution
    
    // Maximum drawdown impact estimate
    const maxDrawdownImpact = Math.abs(expectedLoss * positionSize) * 2; // Conservative estimate
    
    return {
      expectedReturn: expectedPositionReturn,
      expectedRisk: expectedPositionRisk,
      sharpeRatio,
      cvarEstimate,
      maxDrawdownImpact
    };
  }
  
  // ==================== PORTFOLIO RISK BUDGETING ====================
  
  calculateRiskBudget(
    accountBalance: number,
    targetVolatility: number,
    openPositions: OpenPosition[],
    maxPositions: number
  ): RiskBudget {
    // Total risk budget based on target portfolio volatility
    const totalRiskBudget = accountBalance * targetVolatility;
    
    // Calculate used risk budget from open positions
    let usedRiskBudget = 0;
    const riskPerPosition: Record<string, number> = {};
    
    openPositions.forEach(position => {
      // Estimate position risk (simplified)
      const positionRisk = Math.abs(position.size) * Math.abs(position.unrealizedPnL / position.size) * 0.1;
      riskPerPosition[position.id] = positionRisk;
      usedRiskBudget += positionRisk;
    });
    
    // Available risk budget
    const availableRiskBudget = Math.max(0, totalRiskBudget - usedRiskBudget);
    
    // Calculate diversification benefit (simplified)
    const diversificationBenefit = openPositions.length > 1 ? 
      Math.min(0.3, 0.1 * Math.sqrt(openPositions.length)) : 0;
    
    const riskBudget: RiskBudget = {
      totalRiskBudget,
      usedRiskBudget,
      availableRiskBudget: availableRiskBudget * (1 + diversificationBenefit),
      riskPerPosition,
      diversificationBenefit
    };
    
    // Store for historical analysis
    this.riskBudgetHistory.push(riskBudget);
    if (this.riskBudgetHistory.length > 100) {
      this.riskBudgetHistory.shift();
    }
    
    return riskBudget;
  }
  
  // ==================== DYNAMIC POSITION SCALING ====================
  
  scaleExistingPositions(
    openPositions: OpenPosition[],
    newMarketRegime: string,
    volatilityChange: number,
    accountBalance: number
  ): { positionId: string; newSize: number; scalingReason: string }[] {
    const scalingResults: { positionId: string; newSize: number; scalingReason: string }[] = [];
    
    openPositions.forEach(position => {
      let scalingFactor = 1.0;
      let reason = 'No scaling needed';
      
      // Scale based on volatility change
      if (Math.abs(volatilityChange) > 0.5) { // 50% volatility change threshold
        scalingFactor *= Math.max(0.5, 1 / (1 + volatilityChange));
        reason = `Volatility scaling: ${volatilityChange > 0 ? 'reduced' : 'increased'} due to ${(volatilityChange * 100).toFixed(1)}% volatility change`;
      }
      
      // Scale based on regime change
      if (newMarketRegime === 'shock' || newMarketRegime === 'liquidity_crisis') {
        scalingFactor *= 0.5; // Reduce positions by 50% in crisis
        reason = `Regime scaling: reduced due to ${newMarketRegime} regime`;
      }
      
      // Apply unrealized P&L scaling
      const unrealizedPnLPercent = position.unrealizedPnL / (position.size * position.entryPrice);
      if (unrealizedPnLPercent < -0.05) { // More than 5% underwater
        scalingFactor *= 0.8; // Reduce position size
        reason = `P&L scaling: reduced due to ${(unrealizedPnLPercent * 100).toFixed(1)}% unrealized loss`;
      }
      
      const newSize = position.size * scalingFactor;
      
      if (Math.abs(scalingFactor - 1.0) > 0.05) { // Only scale if significant change
        scalingResults.push({
          positionId: position.id,
          newSize,
          scalingReason: reason
        });
      }
    });
    
    return scalingResults;
  }
  
  // ==================== PERFORMANCE TRACKING ====================
  
  updatePositionHistory(size: number, pnl: number, maxDrawdown: number): void {
    this.positionHistory.push({
      size,
      pnl,
      maxDrawdown,
      timestamp: new Date()
    });
    
    // Keep last 1000 positions for analysis
    if (this.positionHistory.length > 1000) {
      this.positionHistory.shift();
    }
  }
  
  getPositionSizingStats(): {
    avgPositionSize: number;
    avgPnL: number;
    winRate: number;
    sharpeRatio: number;
    maxDrawdown: number;
    totalPositions: number;
  } {
    if (this.positionHistory.length === 0) {
      return {
        avgPositionSize: 0,
        avgPnL: 0,
        winRate: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        totalPositions: 0
      };
    }
    
    const totalPositions = this.positionHistory.length;
    const avgPositionSize = this.positionHistory.reduce((sum, p) => sum + p.size, 0) / totalPositions;
    const avgPnL = this.positionHistory.reduce((sum, p) => sum + p.pnl, 0) / totalPositions;
    
    const winners = this.positionHistory.filter(p => p.pnl > 0).length;
    const winRate = winners / totalPositions;
    
    const returns = this.positionHistory.map(p => p.pnl / p.size);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const returnVariance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(returnVariance);
    const sharpeRatio = volatility > 0 ? (avgReturn * Math.sqrt(252)) / (volatility * Math.sqrt(252)) : 0;
    
    const maxDrawdown = Math.max(...this.positionHistory.map(p => p.maxDrawdown));
    
    return {
      avgPositionSize,
      avgPnL,
      winRate,
      sharpeRatio,
      maxDrawdown,
      totalPositions
    };
  }
}
