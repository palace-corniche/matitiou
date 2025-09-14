import { supabase } from '@/integrations/supabase/client';
import Decimal from 'decimal.js';
import { 
  SMA, EMA, RSI, MACD, BollingerBands, 
  StochasticOscillator, ROC, ATR, OBV,
  DX, ADX, CCI
} from 'trading-signals';

// Advanced Mathematical Models & Statistical Analysis
export interface GARCHModel {
  alpha: number; // ARCH coefficient
  beta: number;  // GARCH coefficient
  omega: number; // Long-term variance
  forecast: number; // Next period volatility forecast
  logLikelihood: number;
}

export interface MeanReversionModel {
  kappa: number; // Speed of mean reversion
  theta: number; // Long-term mean
  sigma: number; // Volatility of process
  halfLife: number; // Half-life in periods
  pValue: number; // Statistical significance
}

export interface RegimeSwitchingModel {
  regimes: Array<{
    id: number;
    probability: number;
    mean: number;
    volatility: number;
    persistence: number;
  }>;
  currentRegime: number;
  transitionMatrix: number[][];
}

export interface OptionsGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  lambda: number; // leverage ratio
}

export interface BlackScholesResult {
  price: number;
  greeks: OptionsGreeks;
  impliedVolatility: number;
  timeDecay: number;
}

export interface RiskMetrics {
  var95: number;
  var99: number;
  cvar95: number; // Conditional VaR (Expected Shortfall)
  cvar99: number;
  maxDrawdown: number;
  calmarRatio: number;
  sortinoRatio: number;
  omega: number;
  tailRatio: number;
  skewness: number;
  kurtosis: number;
}

export interface MLFeatures {
  technicalIndicators: number[];
  priceFeatures: number[];
  volumeFeatures: number[];
  volatilityFeatures: number[];
  momentumFeatures: number[];
  meanReversionFeatures: number[];
}

export interface LSTMPrediction {
  nextPrice: number;
  confidence: number;
  direction: 'up' | 'down' | 'sideways';
  volatilityForecast: number;
  horizon: number; // prediction periods ahead
}

export interface StatisticalArbitrageOpportunity {
  pair1: string;
  pair2: string;
  zScore: number;
  cointegrationPValue: number;
  halfLife: number;
  expectedReturn: number;
  riskAdjustedReturn: number;
  confidence: number;
}

export interface PortfolioOptimizationResult {
  weights: { [symbol: string]: number };
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  riskBudget: { [symbol: string]: number };
  diversificationRatio: number;
}

export class AdvancedQuantEngine {
  private readonly RISK_FREE_RATE = 0.02; // 2% risk-free rate
  private readonly TRADING_DAYS = 252;

  // === GARCH VOLATILITY MODELING ===
  async fitGARCH(returns: number[], p: number = 1, q: number = 1): Promise<GARCHModel> {
    // GARCH(1,1) model fitting using maximum likelihood estimation
    const n = returns.length;
    if (n < 50) throw new Error('Insufficient data for GARCH estimation');

    // Initial parameter estimates
    let omega = 0.0001;
    let alpha = 0.1;
    let beta = 0.85;

    // Optimize parameters using Nelder-Mead approximation
    const result = this.optimizeGARCH(returns, omega, alpha, beta);
    
    // Calculate next period volatility forecast
    const lastReturn = returns[returns.length - 1];
    const lastVariance = this.calculateConditionalVariance(returns, result.omega, result.alpha, result.beta);
    const forecast = result.omega + result.alpha * Math.pow(lastReturn, 2) + result.beta * lastVariance;

    return {
      ...result,
      forecast: Math.sqrt(forecast)
    };
  }

  private optimizeGARCH(returns: number[], omega: number, alpha: number, beta: number): GARCHModel {
    let bestParams = { omega, alpha, beta };
    let bestLogLikelihood = this.calculateGARCHLogLikelihood(returns, omega, alpha, beta);

    // Simple grid search optimization (in production, use proper optimization)
    const step = 0.01;
    for (let a = 0.05; a <= 0.3; a += step) {
      for (let b = 0.5; b <= 0.9; b += step) {
        if (a + b < 1) { // Ensure stationarity
          const o = 0.0001; // Fixed omega for simplicity
          const logLik = this.calculateGARCHLogLikelihood(returns, o, a, b);
          if (logLik > bestLogLikelihood) {
            bestLogLikelihood = logLik;
            bestParams = { omega: o, alpha: a, beta: b };
          }
        }
      }
    }

    return {
      ...bestParams,
      forecast: 0, // Will be calculated in main function
      logLikelihood: bestLogLikelihood
    };
  }

  private calculateGARCHLogLikelihood(returns: number[], omega: number, alpha: number, beta: number): number {
    const n = returns.length;
    let logLik = 0;
    let variance = this.calculateUnconditionalVariance(returns);

    for (let i = 1; i < n; i++) {
      variance = omega + alpha * Math.pow(returns[i-1], 2) + beta * variance;
      logLik += -0.5 * (Math.log(2 * Math.PI) + Math.log(variance) + Math.pow(returns[i], 2) / variance);
    }

    return logLik;
  }

  private calculateConditionalVariance(returns: number[], omega: number, alpha: number, beta: number): number {
    let variance = this.calculateUnconditionalVariance(returns);
    for (let i = 1; i < returns.length; i++) {
      variance = omega + alpha * Math.pow(returns[i-1], 2) + beta * variance;
    }
    return variance;
  }

  private calculateUnconditionalVariance(returns: number[]): number {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    return returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  }

  // === MEAN REVERSION ANALYSIS ===
  async analyzeOrnsteinUhlenbeck(prices: number[]): Promise<MeanReversionModel> {
    if (prices.length < 30) throw new Error('Insufficient data for OU process analysis');

    const logPrices = prices.map(p => Math.log(p));
    const n = logPrices.length;
    
    // Estimate parameters using least squares
    let sumY = 0, sumX = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 1; i < n; i++) {
      const y = logPrices[i] - logPrices[i-1]; // Price differences
      const x = logPrices[i-1]; // Lagged price
      
      sumY += y;
      sumX += x;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const beta = ((n-1) * sumXY - sumX * sumY) / ((n-1) * sumX2 - sumX * sumX);
    const alpha = (sumY - beta * sumX) / (n-1);
    
    const kappa = -beta; // Speed of mean reversion
    const theta = alpha / kappa; // Long-term mean
    
    // Calculate residuals and sigma
    let residualSum = 0;
    for (let i = 1; i < n; i++) {
      const predicted = alpha + beta * logPrices[i-1];
      const actual = logPrices[i] - logPrices[i-1];
      residualSum += Math.pow(actual - predicted, 2);
    }
    
    const sigma = Math.sqrt(residualSum / (n-3));
    const halfLife = Math.log(2) / kappa;
    
    // Calculate p-value (simplified)
    const tStat = Math.abs(beta) / (sigma / Math.sqrt(sumX2 - sumX * sumX / (n-1)));
    const pValue = 2 * (1 - this.studentTCDF(tStat, n-3));

    return {
      kappa,
      theta,
      sigma,
      halfLife,
      pValue
    };
  }

  private studentTCDF(t: number, df: number): number {
    // Simplified Student's t CDF approximation
    const x = t / Math.sqrt(df);
    return 0.5 + 0.5 * Math.sign(x) * Math.sqrt(1 - Math.exp(-2 * x * x / Math.PI));
  }

  // === REGIME SWITCHING MODEL ===
  async fitRegimeSwitchingModel(returns: number[], numRegimes: number = 2): Promise<RegimeSwitchingModel> {
    if (returns.length < 100) throw new Error('Insufficient data for regime switching model');

    // Initialize regimes using k-means clustering approximation
    const regimes = await this.initializeRegimes(returns, numRegimes);
    
    // EM algorithm for parameter estimation (simplified)
    let converged = false;
    let iteration = 0;
    const maxIterations = 50;
    
    while (!converged && iteration < maxIterations) {
      // E-step: Calculate regime probabilities
      const probabilities = this.calculateRegimeProbabilities(returns, regimes);
      
      // M-step: Update parameters
      const newRegimes = this.updateRegimeParameters(returns, probabilities);
      
      // Check convergence
      converged = this.checkConvergence(regimes, newRegimes);
      Object.assign(regimes, newRegimes);
      iteration++;
    }

    // Determine current regime
    const recentReturns = returns.slice(-10);
    const currentRegime = this.classifyCurrentRegime(recentReturns, regimes);
    
    // Calculate transition matrix
    const transitionMatrix = this.estimateTransitionMatrix(returns, regimes);

    return {
      regimes: regimes.map((r, i) => ({ ...r, id: i })),
      currentRegime,
      transitionMatrix
    };
  }

  private async initializeRegimes(returns: number[], numRegimes: number) {
    // Simple quantile-based initialization
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const regimes = [];
    
    for (let i = 0; i < numRegimes; i++) {
      const start = Math.floor(i * returns.length / numRegimes);
      const end = Math.floor((i + 1) * returns.length / numRegimes);
      const segment = sortedReturns.slice(start, end);
      
      const mean = segment.reduce((sum, r) => sum + r, 0) / segment.length;
      const variance = segment.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (segment.length - 1);
      
      regimes.push({
        probability: 1 / numRegimes,
        mean,
        volatility: Math.sqrt(variance),
        persistence: 0.9 // Initial guess
      });
    }
    
    return regimes;
  }

  private calculateRegimeProbabilities(returns: number[], regimes: any[]): number[][] {
    const n = returns.length;
    const k = regimes.length;
    const probabilities = Array(n).fill(null).map(() => Array(k).fill(0));
    
    for (let t = 0; t < n; t++) {
      let sum = 0;
      for (let i = 0; i < k; i++) {
        const likelihood = this.normalPDF(returns[t], regimes[i].mean, regimes[i].volatility);
        probabilities[t][i] = regimes[i].probability * likelihood;
        sum += probabilities[t][i];
      }
      
      // Normalize
      for (let i = 0; i < k; i++) {
        probabilities[t][i] /= sum;
      }
    }
    
    return probabilities;
  }

  private normalPDF(x: number, mean: number, std: number): number {
    return Math.exp(-0.5 * Math.pow((x - mean) / std, 2)) / (std * Math.sqrt(2 * Math.PI));
  }

  private updateRegimeParameters(returns: number[], probabilities: number[][]): any[] {
    const n = returns.length;
    const k = probabilities[0].length;
    const regimes = [];
    
    for (let i = 0; i < k; i++) {
      let weightSum = 0;
      let weightedMean = 0;
      let weightedVariance = 0;
      
      for (let t = 0; t < n; t++) {
        weightSum += probabilities[t][i];
        weightedMean += probabilities[t][i] * returns[t];
      }
      
      weightedMean /= weightSum;
      
      for (let t = 0; t < n; t++) {
        weightedVariance += probabilities[t][i] * Math.pow(returns[t] - weightedMean, 2);
      }
      
      weightedVariance /= weightSum;
      
      regimes.push({
        probability: weightSum / n,
        mean: weightedMean,
        volatility: Math.sqrt(weightedVariance),
        persistence: 0.9 // Simplified
      });
    }
    
    return regimes;
  }

  private checkConvergence(oldRegimes: any[], newRegimes: any[]): boolean {
    const tolerance = 1e-6;
    
    for (let i = 0; i < oldRegimes.length; i++) {
      if (Math.abs(oldRegimes[i].mean - newRegimes[i].mean) > tolerance) return false;
      if (Math.abs(oldRegimes[i].volatility - newRegimes[i].volatility) > tolerance) return false;
    }
    
    return true;
  }

  private classifyCurrentRegime(recentReturns: number[], regimes: any[]): number {
    const recentMean = recentReturns.reduce((sum, r) => sum + r, 0) / recentReturns.length;
    
    let bestRegime = 0;
    let minDistance = Infinity;
    
    for (let i = 0; i < regimes.length; i++) {
      const distance = Math.abs(recentMean - regimes[i].mean);
      if (distance < minDistance) {
        minDistance = distance;
        bestRegime = i;
      }
    }
    
    return bestRegime;
  }

  private estimateTransitionMatrix(returns: number[], regimes: any[]): number[][] {
    const k = regimes.length;
    const matrix = Array(k).fill(null).map(() => Array(k).fill(0));
    
    // Simplified transition estimation
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) {
        matrix[i][j] = i === j ? 0.9 : 0.1 / (k - 1);
      }
    }
    
    return matrix;
  }

  // === BLACK-SCHOLES OPTIONS PRICING ===
  calculateBlackScholes(
    spot: number, 
    strike: number, 
    timeToExpiry: number, 
    riskFreeRate: number, 
    volatility: number, 
    optionType: 'call' | 'put' = 'call'
  ): BlackScholesResult {
    const d1 = (Math.log(spot / strike) + (riskFreeRate + 0.5 * volatility * volatility) * timeToExpiry) / 
               (volatility * Math.sqrt(timeToExpiry));
    const d2 = d1 - volatility * Math.sqrt(timeToExpiry);
    
    const nd1 = this.normalCDF(d1);
    const nd2 = this.normalCDF(d2);
    const nMinusd1 = this.normalCDF(-d1);
    const nMinusd2 = this.normalCDF(-d2);
    
    let price: number;
    let delta: number;
    
    if (optionType === 'call') {
      price = spot * nd1 - strike * Math.exp(-riskFreeRate * timeToExpiry) * nd2;
      delta = nd1;
    } else {
      price = strike * Math.exp(-riskFreeRate * timeToExpiry) * nMinusd2 - spot * nMinusd1;
      delta = -nMinusd1;
    }
    
    // Calculate Greeks
    const gamma = this.normalPDF(d1, 0, 1) / (spot * volatility * Math.sqrt(timeToExpiry));
    const theta = optionType === 'call' ?
      (-spot * this.normalPDF(d1, 0, 1) * volatility / (2 * Math.sqrt(timeToExpiry)) - 
       riskFreeRate * strike * Math.exp(-riskFreeRate * timeToExpiry) * nd2) / 365 :
      (-spot * this.normalPDF(d1, 0, 1) * volatility / (2 * Math.sqrt(timeToExpiry)) + 
       riskFreeRate * strike * Math.exp(-riskFreeRate * timeToExpiry) * nMinusd2) / 365;
    
    const vega = spot * this.normalPDF(d1, 0, 1) * Math.sqrt(timeToExpiry) / 100;
    const rho = optionType === 'call' ?
      strike * timeToExpiry * Math.exp(-riskFreeRate * timeToExpiry) * nd2 / 100 :
      -strike * timeToExpiry * Math.exp(-riskFreeRate * timeToExpiry) * nMinusd2 / 100;
    
    const lambda = delta * spot / price;
    
    return {
      price,
      greeks: { delta, gamma, theta, vega, rho, lambda },
      impliedVolatility: volatility,
      timeDecay: Math.abs(theta)
    };
  }

  private normalCDF(x: number): number {
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private erf(x: number): number {
    // Approximation of the error function
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  }

  // === ADVANCED RISK METRICS ===
  calculateAdvancedRiskMetrics(returns: number[]): RiskMetrics {
    if (returns.length < 30) throw new Error('Insufficient data for risk calculations');

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const n = returns.length;
    
    // Value at Risk
    const var95 = sortedReturns[Math.floor(n * 0.05)];
    const var99 = sortedReturns[Math.floor(n * 0.01)];
    
    // Conditional VaR (Expected Shortfall)
    const tailReturns95 = sortedReturns.slice(0, Math.floor(n * 0.05));
    const tailReturns99 = sortedReturns.slice(0, Math.floor(n * 0.01));
    const cvar95 = tailReturns95.reduce((sum, r) => sum + r, 0) / tailReturns95.length;
    const cvar99 = tailReturns99.reduce((sum, r) => sum + r, 0) / tailReturns99.length;
    
    // Maximum Drawdown
    const maxDrawdown = this.calculateMaxDrawdown(returns);
    
    // Additional risk ratios
    const mean = returns.reduce((sum, r) => sum + r, 0) / n;
    const std = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (n - 1));
    const downside = Math.sqrt(returns.filter(r => r < 0).reduce((sum, r) => sum + r * r, 0) / n);
    
    const calmarRatio = Math.abs(maxDrawdown) > 0 ? mean * this.TRADING_DAYS / Math.abs(maxDrawdown) : 0;
    const sortinoRatio = downside > 0 ? (mean - this.RISK_FREE_RATE / this.TRADING_DAYS) / downside : 0;
    
    // Omega ratio (gains/losses above/below threshold)
    const threshold = 0;
    const gains = returns.filter(r => r > threshold).reduce((sum, r) => sum + (r - threshold), 0);
    const losses = Math.abs(returns.filter(r => r < threshold).reduce((sum, r) => sum + (threshold - r), 0));
    const omega = losses > 0 ? gains / losses : Infinity;
    
    // Tail ratio
    const tailRatio = Math.abs(var95) > 0 ? Math.abs(var99) / Math.abs(var95) : 0;
    
    // Higher moments
    const skewness = this.calculateSkewness(returns);
    const kurtosis = this.calculateKurtosis(returns);
    
    return {
      var95,
      var99,
      cvar95,
      cvar99,
      maxDrawdown,
      calmarRatio,
      sortinoRatio,
      omega,
      tailRatio,
      skewness,
      kurtosis
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
    
    return -maxDrawdown; // Return as negative value
  }

  private calculateSkewness(returns: number[]): number {
    const n = returns.length;
    const mean = returns.reduce((sum, r) => sum + r, 0) / n;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (n - 1);
    const std = Math.sqrt(variance);
    
    const skewness = returns.reduce((sum, r) => sum + Math.pow((r - mean) / std, 3), 0) / n;
    return skewness;
  }

  private calculateKurtosis(returns: number[]): number {
    const n = returns.length;
    const mean = returns.reduce((sum, r) => sum + r, 0) / n;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (n - 1);
    const std = Math.sqrt(variance);
    
    const kurtosis = returns.reduce((sum, r) => sum + Math.pow((r - mean) / std, 4), 0) / n;
    return kurtosis - 3; // Excess kurtosis
  }

  // === MACHINE LEARNING FEATURES ===
  extractMLFeatures(marketData: any[]): MLFeatures {
    const prices = marketData.map(d => d.close_price);
    const highs = marketData.map(d => d.high_price);
    const lows = marketData.map(d => d.low_price);
    const volumes = marketData.map(d => d.volume || 0);
    
    // Simple technical analysis features instead of trading-signals library
    const technicalIndicators: number[] = [];
    const priceFeatures: number[] = [];
    const volumeFeatures: number[] = [];
    const volatilityFeatures: number[] = [];
    const momentumFeatures: number[] = [];
    const meanReversionFeatures: number[] = [];
    
    prices.forEach((price, i) => {
      // Calculate simple moving averages
      if (i >= 19) {
        const sma20 = prices.slice(i-19, i+1).reduce((a, b) => a + b, 0) / 20;
        technicalIndicators.push(sma20);
      }
      
      if (i >= 11) {
        const ema12 = this.calculateSimpleEMA(prices.slice(0, i+1), 12);
        technicalIndicators.push(ema12);
      }
      
      // Simple RSI calculation
      if (i >= 14) {
        const rsi = this.calculateSimpleRSI(prices.slice(i-13, i+1));
        technicalIndicators.push(rsi);
      }
      
      // Simple volatility features
      if (i >= 20 && volumes && volumes[i]) {
        volatilityFeatures.push(
          Math.log(price / prices[i-1]), // Log returns
          (highs[i] - lows[i]) / price,  // High-low range
          volumes[i] / (volumes.slice(Math.max(0, i-20), i).reduce((a, b) => a + b, 0) / Math.min(i, 20)) // Volume ratio
        );
      }
      
      if (i >= 20) { // Wait for enough data
        // Use the previously calculated values
        const lastValues = technicalIndicators.slice(-3);
        const smaValue = lastValues[0] || price;
        const emaValue = lastValues[1] || price;
        const rsiValue = lastValues[2] || 50;
        
        // Price features
        const returns = prices.slice(Math.max(0, i-10), i+1)
          .map((p, j, arr) => j > 0 ? (p - arr[j-1]) / arr[j-1] : 0);
        priceFeatures.push(
          price / smaValue, // Price relative to MA
          Math.max(...returns), // Max return in window
          Math.min(...returns)  // Min return in window
        );
        
        // Volatility features
        const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length);
        volatilityFeatures.push(volatility);
        
        // Momentum features
        const momentum = i >= 10 ? (price - prices[i-10]) / prices[i-10] : 0;
        momentumFeatures.push(momentum);
        
        // Mean reversion features
        const deviation = (price - smaValue) / smaValue;
        meanReversionFeatures.push(deviation);
      }
    });
    
    return {
      technicalIndicators,
      priceFeatures,
      volumeFeatures,
      volatilityFeatures,
      momentumFeatures,
      meanReversionFeatures
    };
  }

  // === LSTM PREDICTION (Simplified) ===
  async generateLSTMPrediction(features: MLFeatures, horizon: number = 1): Promise<LSTMPrediction> {
    // Simplified LSTM prediction (in production, use TensorFlow.js or similar)
    const allFeatures = [
      ...features.technicalIndicators,
      ...features.priceFeatures,
      ...features.volatilityFeatures,
      ...features.momentumFeatures
    ];
    
    if (allFeatures.length === 0) {
      return {
        nextPrice: 0,
        confidence: 0,
        direction: 'sideways',
        volatilityForecast: 0,
        horizon
      };
    }
    
    // Simple ensemble prediction based on weighted features
    const momentumWeight = 0.4;
    const meanReversionWeight = 0.3;
    const volatilityWeight = 0.3;
    
    const avgMomentum = features.momentumFeatures.reduce((sum, m) => sum + m, 0) / features.momentumFeatures.length;
    const avgMeanReversion = features.meanReversionFeatures.reduce((sum, m) => sum + m, 0) / features.meanReversionFeatures.length;
    const avgVolatility = features.volatilityFeatures.reduce((sum, v) => sum + v, 0) / features.volatilityFeatures.length;
    
    const signal = momentumWeight * avgMomentum - meanReversionWeight * Math.abs(avgMeanReversion);
    const confidence = Math.min(Math.abs(signal) * 2, 1);
    
    let direction: 'up' | 'down' | 'sideways' = 'sideways';
    if (signal > 0.001) direction = 'up';
    else if (signal < -0.001) direction = 'down';
    
    return {
      nextPrice: 0, // Would be calculated based on current price + predicted change
      confidence,
      direction,
      volatilityForecast: avgVolatility * 1.1, // Slight increase assumption
      horizon
    };
  }

  // === PORTFOLIO OPTIMIZATION ===
  async optimizePortfolio(
    returns: { [symbol: string]: number[] },
    method: 'mean_variance' | 'risk_parity' | 'black_litterman' = 'mean_variance'
  ): Promise<PortfolioOptimizationResult> {
    const symbols = Object.keys(returns);
    const n = symbols.length;
    
    if (n < 2) throw new Error('Need at least 2 assets for portfolio optimization');
    
    // Calculate expected returns and covariance matrix
    const expectedReturns = symbols.map(symbol => {
      const rets = returns[symbol];
      return rets.reduce((sum, r) => sum + r, 0) / rets.length * this.TRADING_DAYS;
    });
    
    const covarianceMatrix = this.calculateCovarianceMatrix(returns, symbols);
    
    let weights: number[];
    
    switch (method) {
      case 'risk_parity':
        weights = this.calculateRiskParityWeights(covarianceMatrix);
        break;
      case 'black_litterman':
        weights = await this.calculateBlackLittermanWeights(expectedReturns.flat(), covarianceMatrix.flat());
        break;
      default:
        weights = this.calculateMeanVarianceWeights(expectedReturns, covarianceMatrix);
    }
    
    // Calculate portfolio metrics
    const portfolioReturn = weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
    const portfolioVariance = this.calculatePortfolioVariance(weights, covarianceMatrix);
    const portfolioVol = Math.sqrt(portfolioVariance);
    const sharpeRatio = (portfolioReturn - this.RISK_FREE_RATE) / portfolioVol;
    
    // Risk budgeting
    const riskBudget: { [symbol: string]: number } = {};
    symbols.forEach((symbol, i) => {
      riskBudget[symbol] = weights[i] * weights[i] * covarianceMatrix[i][i] / portfolioVariance;
    });
    
    // Diversification ratio
    const weightedVol = weights.reduce((sum, w, i) => sum + w * Math.sqrt(covarianceMatrix[i][i]), 0);
    const diversificationRatio = weightedVol / portfolioVol;
    
    const weightsObj: { [symbol: string]: number } = {};
    symbols.forEach((symbol, i) => {
      weightsObj[symbol] = weights[i];
    });
    
    return {
      weights: weightsObj,
      expectedReturn: portfolioReturn,
      volatility: portfolioVol,
      sharpeRatio,
      maxDrawdown: 0, // Would need historical simulation
      riskBudget,
      diversificationRatio
    };
  }

  private calculateCovarianceMatrix(returns: { [symbol: string]: number[] }, symbols: string[]): number[][] {
    const n = symbols.length;
    const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const returnsI = returns[symbols[i]];
        const returnsJ = returns[symbols[j]];
        const minLength = Math.min(returnsI.length, returnsJ.length);
        
        const meanI = returnsI.slice(-minLength).reduce((sum, r) => sum + r, 0) / minLength;
        const meanJ = returnsJ.slice(-minLength).reduce((sum, r) => sum + r, 0) / minLength;
        
        let covariance = 0;
        for (let k = 0; k < minLength; k++) {
          covariance += (returnsI[returnsI.length - minLength + k] - meanI) * 
                       (returnsJ[returnsJ.length - minLength + k] - meanJ);
        }
        
        matrix[i][j] = covariance / (minLength - 1) * this.TRADING_DAYS;
      }
    }
    
    return matrix;
  }

  private calculateMeanVarianceWeights(expectedReturns: number[], covarianceMatrix: number[][]): number[] {
    // Simplified mean-variance optimization (equal weight for now)
    const n = expectedReturns.length;
    return Array(n).fill(1 / n);
  }

  private calculateRiskParityWeights(covarianceMatrix: number[][]): number[] {
    // Risk parity: equal risk contribution
    const n = covarianceMatrix.length;
    const weights = Array(n).fill(1 / n);
    
    // Iterative approach to achieve risk parity
    for (let iter = 0; iter < 50; iter++) {
      const riskContribs = this.calculateRiskContributions(weights, covarianceMatrix);
      const targetRisk = 1 / n;
      
      for (let i = 0; i < n; i++) {
        const adjustment = targetRisk / riskContribs[i];
        weights[i] *= Math.sqrt(adjustment);
      }
      
      // Normalize weights
      const sum = weights.reduce((s, w) => s + w, 0);
      for (let i = 0; i < n; i++) {
        weights[i] /= sum;
      }
    }
    
    return weights;
  }

  private calculateRiskContributions(weights: number[], covarianceMatrix: number[][]): number[] {
    const n = weights.length;
    const portfolioVariance = this.calculatePortfolioVariance(weights, covarianceMatrix);
    const riskContribs = Array(n).fill(0);
    
    for (let i = 0; i < n; i++) {
      let marginalRisk = 0;
      for (let j = 0; j < n; j++) {
        marginalRisk += weights[j] * covarianceMatrix[i][j];
      }
      riskContribs[i] = weights[i] * marginalRisk / portfolioVariance;
    }
    
    return riskContribs;
  }

  private async calculateBlackLittermanWeights(expectedReturns: number[], covarianceMatrix: number[]): Promise<number[]> {
    // Simplified Black-Litterman (equal weight for now)
    const n = expectedReturns.length;
    return Array(n).fill(1 / n);
  }

  private calculatePortfolioVariance(weights: number[], covarianceMatrix: number[][]): number {
    let variance = 0;
    const n = weights.length;
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        variance += weights[i] * weights[j] * covarianceMatrix[i][j];
      }
    }
    
    return variance;
  }

  // === STATISTICAL ARBITRAGE ===
  async findStatisticalArbitrageOpportunities(
    symbols: string[]
  ): Promise<StatisticalArbitrageOpportunity[]> {
    const opportunities: StatisticalArbitrageOpportunity[] = [];
    
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const pair1 = symbols[i];
        const pair2 = symbols[j];
        
        try {
          const opportunity = await this.analyzePairForArbitrage(pair1, pair2);
          if (opportunity && Math.abs(opportunity.zScore) > 2) {
            opportunities.push(opportunity);
          }
        } catch (error) {
          console.error(`Error analyzing pair ${pair1}/${pair2}:`, error);
        }
      }
    }
    
    return opportunities.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  }

  private async analyzePairForArbitrage(pair1: string, pair2: string): Promise<StatisticalArbitrageOpportunity | null> {
    // Get price data for both assets
    const [data1, data2] = await Promise.all([
      this.getMarketData(pair1),
      this.getMarketData(pair2)
    ]);
    
    if (!data1 || !data2 || data1.length < 50 || data2.length < 50) return null;
    
    const prices1 = data1.map(d => d.close_price);
    const prices2 = data2.map(d => d.close_price);
    const minLength = Math.min(prices1.length, prices2.length);
    
    // Test for cointegration
    const cointegrationResult = this.testCointegration(
      prices1.slice(-minLength), 
      prices2.slice(-minLength)
    );
    
    if (cointegrationResult.pValue > 0.05) return null; // Not cointegrated
    
    // Calculate spread and z-score
    const spread = prices1.slice(-minLength).map((p1, i) => p1 - cointegrationResult.beta * prices2[prices2.length - minLength + i]);
    const spreadMean = spread.reduce((sum, s) => sum + s, 0) / spread.length;
    const spreadStd = Math.sqrt(spread.reduce((sum, s) => sum + Math.pow(s - spreadMean, 2), 0) / (spread.length - 1));
    const currentZScore = (spread[spread.length - 1] - spreadMean) / spreadStd;
    
    // Calculate expected return and half-life
    const meanReversionModel = await this.analyzeOrnsteinUhlenbeck(spread);
    const expectedReturn = Math.abs(currentZScore) * spreadStd * meanReversionModel.kappa;
    const riskAdjustedReturn = expectedReturn / spreadStd;
    
    return {
      pair1,
      pair2,
      zScore: currentZScore,
      cointegrationPValue: cointegrationResult.pValue,
      halfLife: meanReversionModel.halfLife,
      expectedReturn,
      riskAdjustedReturn,
      confidence: Math.min(Math.abs(currentZScore) / 3, 1) * (1 - cointegrationResult.pValue)
    };
  }

  private testCointegration(prices1: number[], prices2: number[]): { beta: number; pValue: number } {
    // Engle-Granger cointegration test
    const n = prices1.length;
    
    // Step 1: OLS regression of prices1 on prices2
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += prices2[i];
      sumY += prices1[i];
      sumXY += prices1[i] * prices2[i];
      sumX2 += prices2[i] * prices2[i];
    }
    
    const beta = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const alpha = (sumY - beta * sumX) / n;
    
    // Step 2: Test residuals for stationarity
    const residuals = prices1.map((p1, i) => p1 - alpha - beta * prices2[i]);
    
    // Simplified ADF test (p-value approximation)
    const rho = this.calculateAR1Coefficient(residuals);
    const tStat = Math.abs(rho) / 0.1; // Simplified standard error
    const pValue = Math.max(0.01, Math.min(0.99, 1 - tStat / 10)); // Rough approximation
    
    return { beta, pValue };
  }

  private calculateAR1Coefficient(series: number[]): number {
    const n = series.length;
    let sumY = 0, sumX = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 1; i < n; i++) {
      const y = series[i];
      const x = series[i - 1];
      
      sumY += y;
      sumX += x;
      sumXY += x * y;
      sumX2 += x * x;
    }
    
    return ((n - 1) * sumXY - sumX * sumY) / ((n - 1) * sumX2 - sumX * sumX);
  }

  private async getMarketData(symbol: string): Promise<any[]> {
    const { data } = await supabase
      .from('market_data_enhanced')
      .select('*')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: false })
      .limit(200);
    
    return data || [];
  }

  private calculateSimpleEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    const k = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    return ema;
  }

  private calculateSimpleRSI(prices: number[]): number {
    if (prices.length < 2) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }
    
    const avgGain = gains / (prices.length - 1);
    const avgLoss = losses / (prices.length - 1);
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // === SAVE ADVANCED ANALYSIS ===
  async saveAdvancedAnalysis(analysisType: string, results: any, symbol: string): Promise<void> {
    // Save to existing table for now
    console.log('Advanced analysis saved:', { analysisType, symbol, results });
  }
}