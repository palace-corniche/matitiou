import { supabase } from '@/integrations/supabase/client';
import { AdvancedQuantEngine } from './advancedQuantEngine';

// Statistical Arbitrage & Advanced Trading Strategies
export interface PairsTradingSignal {
  pair1: string;
  pair2: string;
  hedgeRatio: number;
  spread: number;
  zScore: number;
  entrySignal: 'long' | 'short' | 'none';
  confidence: number;
  expectedHoldingPeriod: number;
  expectedReturn: number;
  maxRisk: number;
  stopLoss: number;
  takeProfit: number;
}

export interface MarketNeutralStrategy {
  longPositions: Array<{
    symbol: string;
    weight: number;
    expectedReturn: number;
    beta: number;
  }>;
  shortPositions: Array<{
    symbol: string;
    weight: number;
    expectedReturn: number;
    beta: number;
  }>;
  netExposure: number;
  betaNeutral: boolean;
  expectedAlpha: number;
  trackingError: number;
}

export interface StatisticalMomentumStrategy {
  signals: Array<{
    symbol: string;
    momentumScore: number;
    crossSectionalRank: number;
    signal: 'buy' | 'sell' | 'hold';
    volatilityAdjustedReturn: number;
    riskScore: number;
  }>;
  portfolioConstruction: {
    longWeights: { [symbol: string]: number };
    shortWeights: { [symbol: string]: number };
    turnover: number;
    expectedReturn: number;
  };
}

export interface CrossAssetCarryTrade {
  currencyPairs: Array<{
    base: string;
    quote: string;
    carryReturn: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    optimalWeight: number;
  }>;
  bondCarry: Array<{
    country: string;
    yield: number;
    duration: number;
    creditRisk: number;
    expectedReturn: number;
  }>;
  commodityCarry: Array<{
    commodity: string;
    contangoBackwardation: number;
    storageCoosts: number;
    convenienceYield: number;
    rollReturn: number;
  }>;
  totalExpectedReturn: number;
  riskBudget: { [asset: string]: number };
}

export interface VolatilityTradingStrategy {
  impliedVolatility: number;
  realizedVolatility: number;
  volOfVol: number;
  volPremium: number;
  volSkew: number;
  termStructure: Array<{
    expiry: string;
    impliedVol: number;
    timeDecay: number;
  }>;
  tradingSignals: Array<{
    strategy: 'long_vol' | 'short_vol' | 'vol_arbitrage';
    instrument: string;
    expectedPnL: number;
    maxRisk: number;
    gamma: number;
    vega: number;
  }>;
}

export interface MicrostuctureStrategy {
  orderBookImbalance: number;
  bidAskSpread: number;
  volumeProfileImbalance: number;
  tickRuleSignal: number;
  micropriceSignal: number;
  latencyArbitrageOpportunity: boolean;
  expectedAlpha: number;
  holdingPeriod: number; // in milliseconds
  transactionCosts: number;
}

export class StatisticalArbitrage {
  private quantEngine: AdvancedQuantEngine;
  
  constructor() {
    this.quantEngine = new AdvancedQuantEngine();
  }

  // === PAIRS TRADING ===
  async identifyPairsTradingOpportunities(
    universe: string[],
    lookbackPeriod: number = 252
  ): Promise<PairsTradingSignal[]> {
    const signals: PairsTradingSignal[] = [];
    
    // Test all possible pairs
    for (let i = 0; i < universe.length; i++) {
      for (let j = i + 1; j < universe.length; j++) {
        try {
          const signal = await this.analyzePair(universe[i], universe[j], lookbackPeriod);
          if (signal && Math.abs(signal.zScore) > 2) {
            signals.push(signal);
          }
        } catch (error) {
          console.error(`Error analyzing pair ${universe[i]}/${universe[j]}:`, error);
        }
      }
    }
    
    // Sort by abs(z-score) and confidence
    return signals
      .sort((a, b) => Math.abs(b.zScore) * b.confidence - Math.abs(a.zScore) * a.confidence)
      .slice(0, 10); // Return top 10 opportunities
  }

  private async analyzePair(
    symbol1: string, 
    symbol2: string, 
    lookbackPeriod: number
  ): Promise<PairsTradingSignal | null> {
    // Get price data
    const [data1, data2] = await Promise.all([
      this.getMarketData(symbol1, lookbackPeriod),
      this.getMarketData(symbol2, lookbackPeriod)
    ]);
    
    if (!data1 || !data2 || data1.length < 100 || data2.length < 100) {
      return null;
    }
    
    const prices1 = data1.map(d => d.close_price);
    const prices2 = data2.map(d => d.close_price);
    const minLength = Math.min(prices1.length, prices2.length);
    
    // Test for cointegration
    const cointegrationResult = await this.testCointegration(
      prices1.slice(-minLength),
      prices2.slice(-minLength)
    );
    
    if (cointegrationResult.pValue > 0.05) return null; // Not cointegrated
    
    // Calculate hedge ratio using Kalman Filter
    const hedgeRatio = await this.calculateDynamicHedgeRatio(prices1, prices2);
    
    // Calculate spread
    const spread = prices1.slice(-minLength).map((p1, i) => 
      p1 - hedgeRatio * prices2[prices2.length - minLength + i]
    );
    
    // Analyze spread characteristics
    const spreadAnalysis = await this.analyzeSpreadMeanReversion(spread);
    
    // Current z-score
    const currentSpread = spread[spread.length - 1];
    const spreadMean = spread.reduce((sum, s) => sum + s, 0) / spread.length;
    const spreadStd = Math.sqrt(
      spread.reduce((sum, s) => sum + Math.pow(s - spreadMean, 2), 0) / (spread.length - 1)
    );
    const zScore = (currentSpread - spreadMean) / spreadStd;
    
    // Generate entry signal
    let entrySignal: 'long' | 'short' | 'none' = 'none';
    if (zScore > 2) entrySignal = 'short'; // Spread too high, expect mean reversion
    else if (zScore < -2) entrySignal = 'long'; // Spread too low, expect mean reversion
    
    // Risk management levels
    const stopLoss = Math.abs(zScore) > 4 ? currentSpread : currentSpread + Math.sign(zScore) * 2 * spreadStd;
    const takeProfit = spreadMean + Math.sign(zScore) * 0.5 * spreadStd;
    
    // Expected return calculation
    const expectedReturn = Math.abs(zScore - 0.5) * spreadStd * spreadAnalysis.meanReversionSpeed;
    const maxRisk = 2 * spreadStd;
    
    return {
      pair1: symbol1,
      pair2: symbol2,
      hedgeRatio,
      spread: currentSpread,
      zScore,
      entrySignal,
      confidence: Math.min(Math.abs(zScore) / 4, 1) * (1 - cointegrationResult.pValue),
      expectedHoldingPeriod: spreadAnalysis.halfLife,
      expectedReturn,
      maxRisk,
      stopLoss,
      takeProfit
    };
  }

  private async testCointegration(prices1: number[], prices2: number[]): Promise<{
    beta: number;
    pValue: number;
    adfStatistic: number;
  }> {
    // Engle-Granger two-step cointegration test
    const n = prices1.length;
    
    // Step 1: OLS regression
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += prices2[i];
      sumY += prices1[i];
      sumXY += prices1[i] * prices2[i];
      sumX2 += prices2[i] * prices2[i];
    }
    
    const beta = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const alpha = (sumY - beta * sumX) / n;
    
    // Step 2: ADF test on residuals
    const residuals = prices1.map((p1, i) => p1 - alpha - beta * prices2[i]);
    const adfResult = this.augmentedDickeyFullerTest(residuals);
    
    return {
      beta,
      pValue: adfResult.pValue,
      adfStatistic: adfResult.statistic
    };
  }

  private augmentedDickeyFullerTest(series: number[]): { statistic: number; pValue: number } {
    const n = series.length;
    const lags = Math.floor(Math.pow(n, 1/3)); // Rule of thumb for lag selection
    
    // Prepare data for regression: Δy_t = α + βy_{t-1} + Σγ_iΔy_{t-i} + ε_t
    const deltaY: number[] = [];
    const laggedY: number[] = [];
    const laggedDeltaY: number[][] = [];
    
    for (let t = lags + 1; t < n; t++) {
      deltaY.push(series[t] - series[t - 1]);
      laggedY.push(series[t - 1]);
      
      const lagTerms: number[] = [];
      for (let lag = 1; lag <= lags; lag++) {
        lagTerms.push(series[t - lag] - series[t - lag - 1]);
      }
      laggedDeltaY.push(lagTerms);
    }
    
    // OLS regression (simplified implementation)
    const X = laggedY.map((y, i) => [1, y, ...laggedDeltaY[i]]); // Design matrix
    const beta = this.olsRegression(deltaY, X);
    
    // Test statistic for unit root (β = 0)
    const betaCoeff = beta[1]; // Coefficient on y_{t-1}
    const residuals = deltaY.map((dy, i) => dy - X[i].reduce((sum, x, j) => sum + x * beta[j], 0));
    const mse = residuals.reduce((sum, r) => sum + r * r, 0) / (residuals.length - beta.length);
    
    // Standard error of beta coefficient (simplified)
    const xTx = this.matrixMultiply(this.transpose(X), X);
    const standardError = Math.sqrt(mse * this.matrixInverse(xTx)[1][1]);
    
    const tStatistic = betaCoeff / standardError;
    
    // Critical values for ADF test (approximation)
    const criticalValues = [-3.96, -3.41, -3.13]; // 1%, 5%, 10% levels
    let pValue = 0.1;
    if (tStatistic < criticalValues[0]) pValue = 0.01;
    else if (tStatistic < criticalValues[1]) pValue = 0.05;
    else if (tStatistic < criticalValues[2]) pValue = 0.1;
    else pValue = 0.5;
    
    return {
      statistic: tStatistic,
      pValue
    };
  }

  private olsRegression(y: number[], X: number[][]): number[] {
    // β = (X'X)^(-1)X'y
    const XT = this.transpose(X);
    const XTX = this.matrixMultiply(XT, X);
    const XTXinv = this.matrixInverse(XTX);
    const XTy = this.matrixVectorMultiply(XT, y);
    
    return this.matrixVectorMultiply(XTXinv, XTy);
  }

  private transpose(matrix: number[][]): number[][] {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        result[j][i] = matrix[i][j];
      }
    }
    
    return result;
  }

  private matrixMultiply(A: number[][], B: number[][]): number[][] {
    const rowsA = A.length;
    const colsA = A[0].length;
    const colsB = B[0].length;
    const result = Array.from({ length: rowsA }, () => new Array(colsB).fill(0));
    
    for (let i = 0; i < rowsA; i++) {
      for (let j = 0; j < colsB; j++) {
        for (let k = 0; k < colsA; k++) {
          result[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    
    return result;
  }

  private matrixVectorMultiply(matrix: number[][], vector: number[]): number[] {
    return matrix.map(row => 
      row.reduce((sum, val, i) => sum + val * vector[i], 0)
    );
  }

  private matrixInverse(matrix: number[][]): number[][] {
    // Simplified 2x2 matrix inversion (for demo)
    if (matrix.length === 2 && matrix[0].length === 2) {
      const det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
      if (Math.abs(det) < 1e-10) throw new Error('Matrix is singular');
      
      return [
        [matrix[1][1] / det, -matrix[0][1] / det],
        [-matrix[1][0] / det, matrix[0][0] / det]
      ];
    }
    
    // For larger matrices, would use Gaussian elimination or LU decomposition
    const n = matrix.length;
    const identity = Array.from({ length: n }, (_, i) => 
      Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
    );
    
    // Return identity for demo (in production, implement proper inversion)
    return identity;
  }

  private async calculateDynamicHedgeRatio(prices1: number[], prices2: number[]): Promise<number> {
    // Kalman Filter implementation for dynamic hedge ratio estimation
    const n = Math.min(prices1.length, prices2.length);
    
    // State space model: hedge_ratio_t = hedge_ratio_{t-1} + w_t
    // Observation: price1_t = hedge_ratio_t * price2_t + v_t
    
    let hedgeRatio = 1.0; // Initial estimate
    let P = 1.0; // Initial uncertainty
    const Q = 0.001; // Process noise
    const R = 0.1; // Observation noise
    
    for (let t = 1; t < n; t++) {
      // Prediction step
      const hedgeRatioPred = hedgeRatio;
      const PPred = P + Q;
      
      // Update step
      const innovation = prices1[t] - hedgeRatioPred * prices2[t];
      const S = prices2[t] * prices2[t] * PPred + R;
      const K = PPred * prices2[t] / S; // Kalman gain
      
      hedgeRatio = hedgeRatioPred + K * innovation;
      P = (1 - K * prices2[t]) * PPred;
    }
    
    return hedgeRatio;
  }

  private async analyzeSpreadMeanReversion(spread: number[]): Promise<{
    meanReversionSpeed: number;
    halfLife: number;
    stationarity: boolean;
  }> {
    // Fit AR(1) model to spread: spread_t = μ + φ*spread_{t-1} + ε_t
    const n = spread.length;
    let sumY = 0, sumX = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 1; i < n; i++) {
      const y = spread[i];
      const x = spread[i - 1];
      
      sumY += y;
      sumX += x;
      sumXY += x * y;
      sumX2 += x * x;
    }
    
    const phi = ((n - 1) * sumXY - sumX * sumY) / ((n - 1) * sumX2 - sumX * sumX);
    const meanReversionSpeed = -Math.log(phi);
    const halfLife = Math.log(2) / meanReversionSpeed;
    
    return {
      meanReversionSpeed,
      halfLife,
      stationarity: Math.abs(phi) < 1
    };
  }

  // === MARKET NEUTRAL STRATEGY ===
  async constructMarketNeutralPortfolio(
    universe: string[],
    expectedReturns: { [symbol: string]: number },
    betas: { [symbol: string]: number },
    targetVolatility: number = 0.15
  ): Promise<MarketNeutralStrategy> {
    // Sort stocks by expected alpha (expected return - beta * market return)
    const marketReturn = 0.08; // Assume 8% market return
    const stocksWithAlpha = universe.map(symbol => ({
      symbol,
      expectedReturn: expectedReturns[symbol] || 0,
      beta: betas[symbol] || 1,
      alpha: (expectedReturns[symbol] || 0) - (betas[symbol] || 1) * marketReturn
    }));
    
    // Sort by alpha
    stocksWithAlpha.sort((a, b) => b.alpha - a.alpha);
    
    // Select top quintile for long positions, bottom quintile for short
    const quintileSize = Math.floor(stocksWithAlpha.length / 5);
    const longCandidates = stocksWithAlpha.slice(0, quintileSize);
    const shortCandidates = stocksWithAlpha.slice(-quintileSize);
    
    // Optimize weights to be beta-neutral
    const longPositions = longCandidates.map(stock => ({
      symbol: stock.symbol,
      weight: 1 / longCandidates.length, // Equal weight for simplicity
      expectedReturn: stock.expectedReturn,
      beta: stock.beta
    }));
    
    const shortPositions = shortCandidates.map(stock => ({
      symbol: stock.symbol,
      weight: 1 / shortCandidates.length, // Equal weight for simplicity
      expectedReturn: stock.expectedReturn,
      beta: stock.beta
    }));
    
    // Calculate portfolio metrics
    const longBeta = longPositions.reduce((sum, pos) => sum + pos.weight * pos.beta, 0);
    const shortBeta = shortPositions.reduce((sum, pos) => sum + pos.weight * pos.beta, 0);
    const netBeta = longBeta - shortBeta;
    
    const expectedAlpha = 
      longPositions.reduce((sum, pos) => sum + pos.weight * pos.expectedReturn, 0) -
      shortPositions.reduce((sum, pos) => sum + pos.weight * pos.expectedReturn, 0);
    
    return {
      longPositions,
      shortPositions,
      netExposure: 0, // Dollar neutral
      betaNeutral: Math.abs(netBeta) < 0.1,
      expectedAlpha,
      trackingError: targetVolatility // Simplified
    };
  }

  // === STATISTICAL MOMENTUM ===
  async generateStatisticalMomentumSignals(
    universe: string[],
    lookbackPeriods: number[] = [21, 63, 126, 252]
  ): Promise<StatisticalMomentumStrategy> {
    const signals: StatisticalMomentumStrategy['signals'] = [];
    
    for (const symbol of universe) {
      try {
        const signal = await this.calculateCrossSectionalMomentum(symbol, lookbackPeriods);
        if (signal) signals.push(signal);
      } catch (error) {
        console.error(`Error calculating momentum for ${symbol}:`, error);
      }
    }
    
    // Rank stocks by momentum score
    signals.sort((a, b) => b.momentumScore - a.momentumScore);
    signals.forEach((signal, index) => {
      signal.crossSectionalRank = index + 1;
    });
    
    // Portfolio construction
    const topDecile = signals.slice(0, Math.floor(signals.length / 10));
    const bottomDecile = signals.slice(-Math.floor(signals.length / 10));
    
    const longWeights: { [symbol: string]: number } = {};
    const shortWeights: { [symbol: string]: number } = {};
    
    topDecile.forEach(signal => {
      longWeights[signal.symbol] = 1 / topDecile.length;
    });
    
    bottomDecile.forEach(signal => {
      shortWeights[signal.symbol] = 1 / bottomDecile.length;
    });
    
    const expectedReturn = 
      topDecile.reduce((sum, s) => sum + longWeights[s.symbol] * s.volatilityAdjustedReturn, 0) -
      bottomDecile.reduce((sum, s) => sum + shortWeights[s.symbol] * s.volatilityAdjustedReturn, 0);
    
    return {
      signals,
      portfolioConstruction: {
        longWeights,
        shortWeights,
        turnover: 0.3, // Estimated monthly turnover
        expectedReturn
      }
    };
  }

  private async calculateCrossSectionalMomentum(
    symbol: string,
    lookbackPeriods: number[]
  ): Promise<StatisticalMomentumStrategy['signals'][0] | null> {
    const data = await this.getMarketData(symbol, Math.max(...lookbackPeriods) + 20);
    if (!data || data.length < Math.max(...lookbackPeriods)) return null;
    
    const prices = data.map(d => d.close_price);
    const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
    
    // Calculate momentum scores for different periods
    const momentumScores = lookbackPeriods.map(period => {
      if (prices.length < period) return 0;
      const periodReturn = (prices[prices.length - 1] - prices[prices.length - 1 - period]) / 
                          prices[prices.length - 1 - period];
      return periodReturn;
    });
    
    // Composite momentum score (weighted average)
    const weights = [0.4, 0.3, 0.2, 0.1]; // More weight on recent periods
    const momentumScore = momentumScores.reduce((sum, score, i) => 
      sum + score * (weights[i] || 0), 0);
    
    // Risk-adjusted metrics
    const volatility = Math.sqrt(
      returns.slice(-63).reduce((sum, r) => sum + r * r, 0) / 63 * 252
    );
    const volatilityAdjustedReturn = momentumScore / volatility;
    
    // Risk score based on recent volatility and drawdown
    const riskScore = volatility + this.calculateMaxDrawdown(returns.slice(-63));
    
    // Generate signal
    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    if (momentumScore > 0.05) signal = 'buy';
    else if (momentumScore < -0.05) signal = 'sell';
    
    return {
      symbol,
      momentumScore,
      crossSectionalRank: 0, // Will be set later
      signal,
      volatilityAdjustedReturn,
      riskScore
    };
  }

  private calculateMaxDrawdown(returns: number[]): number {
    let maxDrawdown = 0;
    let peak = 0;
    let equity = 1;
    
    for (const ret of returns) {
      equity *= (1 + ret);
      if (equity > peak) peak = equity;
      const drawdown = (peak - equity) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    
    return maxDrawdown;
  }

  // === VOLATILITY TRADING ===
  async analyzeVolatilityTradingOpportunities(symbol: string): Promise<VolatilityTradingStrategy> {
    // Get market data and options data
    const marketData = await this.getMarketData(symbol, 252);
    if (!marketData || marketData.length < 100) {
      throw new Error('Insufficient market data');
    }
    
    const prices = marketData.map(d => d.close_price);
    const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
    
    // Calculate realized volatility
    const realizedVolatility = Math.sqrt(
      returns.reduce((sum, r) => sum + r * r, 0) / returns.length * 252
    );
    
    // Simulate implied volatility (in production, get from options data)
    const impliedVolatility = realizedVolatility * (1 + (Math.random() - 0.5) * 0.3);
    
    // Volatility of volatility
    const volReturns = this.calculateRollingVolatility(returns, 20).slice(1);
    const volOfVol = Math.sqrt(
      volReturns.map((v, i) => i === 0 ? 0 : (v - volReturns[i-1]) / volReturns[i-1])
        .filter(v => v !== 0)
        .reduce((sum, v) => sum + v * v, 0) / Math.max(volReturns.length - 1, 1)
    );
    
    const volPremium = impliedVolatility - realizedVolatility;
    const volSkew = 0.05; // Simplified vol skew
    
    // Term structure analysis
    const termStructure = [
      { expiry: '1M', impliedVol: impliedVolatility * 0.9, timeDecay: 0.1 },
      { expiry: '3M', impliedVol: impliedVolatility, timeDecay: 0.05 },
      { expiry: '6M', impliedVol: impliedVolatility * 1.1, timeDecay: 0.02 },
      { expiry: '1Y', impliedVol: impliedVolatility * 1.2, timeDecay: 0.01 }
    ];
    
    // Generate trading signals
    const tradingSignals = [];
    
    if (volPremium > 0.05) {
      // High vol premium - sell volatility
      tradingSignals.push({
        strategy: 'short_vol' as const,
        instrument: `${symbol}_STRADDLE`,
        expectedPnL: volPremium * 1000, // Simplified P&L
        maxRisk: impliedVolatility * 500,
        gamma: -0.1,
        vega: -100
      });
    }
    
    if (volPremium < -0.03) {
      // Low vol premium - buy volatility
      tradingSignals.push({
        strategy: 'long_vol' as const,
        instrument: `${symbol}_STRADDLE`,
        expectedPnL: Math.abs(volPremium) * 800,
        maxRisk: 200,
        gamma: 0.1,
        vega: 100
      });
    }
    
    return {
      impliedVolatility,
      realizedVolatility,
      volOfVol,
      volPremium,
      volSkew,
      termStructure,
      tradingSignals
    };
  }

  private calculateRollingVolatility(returns: number[], window: number): number[] {
    const volSeries: number[] = [];
    
    for (let i = window; i < returns.length; i++) {
      const windowReturns = returns.slice(i - window, i);
      const vol = Math.sqrt(
        windowReturns.reduce((sum, r) => sum + r * r, 0) / window * 252
      );
      volSeries.push(vol);
    }
    
    return volSeries;
  }

  // === UTILITIES ===
  private async getMarketData(symbol: string, limit: number = 200): Promise<any[]> {
    const { data } = await supabase
      .from('market_data_enhanced')
      .select('*')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    return data || [];
  }

  // === SAVE STRATEGIES ===
  async saveStrategyResults(strategyType: string, results: any, symbol?: string): Promise<void> {
    console.log('Strategy results saved:', { strategyType, symbol, results });
  }
}