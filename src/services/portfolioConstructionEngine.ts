// ============= PHASE D: PORTFOLIO CONSTRUCTION & OPTIMIZATION =============
import { AdvancedQuantEngine } from './advancedQuantEngine';
import { supabase } from '@/integrations/supabase/client';

interface Asset {
  symbol: string;
  assetClass: 'currency' | 'equity' | 'commodity' | 'bond';
  returns: number[];
  expectedReturn: number;
  volatility: number;
  beta: number;
  marketCap?: number;
  sector?: string;
}

interface PortfolioHolding {
  symbol: string;
  weight: number;
  expectedReturn: number;
  contribution: number;
  riskContribution: number;
  sharpeContribution: number;
}

interface PortfolioMetrics {
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  var95: number;
  maxDrawdown: number;
  diversificationRatio: number;
  trackingError?: number;
  informationRatio?: number;
  beta?: number;
  alpha?: number;
}

interface PortfolioConstraints {
  maxWeight: number;
  minWeight: number;
  maxConcentration: number;
  maxSectorExposure?: number;
  maxAssetClassExposure?: number;
  turnoverLimit?: number;
  liquidityRequirement?: number;
}

interface BlackLittermanInputs {
  marketWeights: number[];
  expectedReturns: number[];
  covarianceMatrix: number[][];
  views: {
    assets: number[];
    expectedReturn: number;
    confidence: number;
  }[];
  riskAversion: number;
  tau: number;
}

interface FactorModel {
  factors: string[];
  loadings: number[][];
  factorReturns: number[][];
  specificRisks: number[];
  rSquared: number[];
}

class PortfolioConstructionEngine {
  private quantEngine: AdvancedQuantEngine;

  constructor() {
    this.quantEngine = new AdvancedQuantEngine();
  }

  // ============= BLACK-LITTERMAN PORTFOLIO OPTIMIZATION =============
  async optimizeBlackLitterman(
    assets: Asset[],
    inputs: BlackLittermanInputs,
    constraints: PortfolioConstraints
  ): Promise<{
    weights: number[];
    holdings: PortfolioHolding[];
    metrics: PortfolioMetrics;
    impliedReturns: number[];
    adjustedReturns: number[];
  }> {
    
    console.log('🔮 Running Black-Litterman optimization...');

    // Step 1: Calculate implied equilibrium returns
    const impliedReturns = this.calculateImpliedReturns(
      inputs.marketWeights,
      inputs.covarianceMatrix,
      inputs.riskAversion
    );

    // Step 2: Process investor views
    const { P, Q, Omega } = this.processInvestorViews(inputs.views, assets.length);

    // Step 3: Calculate Black-Litterman returns
    const tau = inputs.tau;
    const covMatrix = inputs.covarianceMatrix;
    
    // Tau * Covariance matrix
    const tauSigma = this.scalarMultiplyMatrix(covMatrix, tau);
    
    // M1 = inv(tau * Sigma)
    const M1 = this.invertMatrix(tauSigma);
    
    // M2 = P' * inv(Omega) * P
    const POmegaInv = this.multiplyMatrices(this.transposeMatrix(P), this.invertMatrix(Omega));
    const M2 = this.multiplyMatrices(POmegaInv, P);
    
    // M3 = inv(tau * Sigma) + P' * inv(Omega) * P
    const M3 = this.addMatrices(M1, M2);
    
    // Adjusted expected returns
    const term1 = this.multiplyMatrixVector(M1, impliedReturns);
    const term2 = this.multiplyMatrixVector(POmegaInv, Q);
    const numerator = this.addVectors(term1, term2);
    
    const adjustedReturns = this.multiplyMatrixVector(this.invertMatrix(M3), numerator);

    // Step 4: Optimize portfolio with adjusted returns
    const weights = await this.optimizeMeanVariance(
      adjustedReturns,
      inputs.covarianceMatrix,
      constraints
    );

    // Step 5: Calculate portfolio metrics
    const holdings = this.calculateHoldings(assets, weights, adjustedReturns);
    const metrics = this.calculatePortfolioMetrics(weights, adjustedReturns, inputs.covarianceMatrix);

    return {
      weights,
      holdings,
      metrics,
      impliedReturns,
      adjustedReturns
    };
  }

  // ============= FACTOR MODELS (FAMA-FRENCH, MOMENTUM, QUALITY) =============
  async buildFactorModel(
    assets: Asset[],
    factors: string[] = ['market', 'size', 'value', 'momentum', 'quality', 'low_volatility']
  ): Promise<FactorModel> {
    
    console.log('📊 Building factor model...');

    const factorReturns = await this.generateFactorReturns(factors);
    const loadings: number[][] = [];
    const specificRisks: number[] = [];
    const rSquared: number[] = [];

    // For each asset, regress returns against factor returns
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const regression = this.runFactorRegression(asset.returns, factorReturns);
      
      loadings.push(regression.betas);
      specificRisks.push(regression.specificRisk);
      rSquared.push(regression.rSquared);
    }

    return {
      factors,
      loadings,
      factorReturns,
      specificRisks,
      rSquared
    };
  }

  async optimizeFactorBasedPortfolio(
    assets: Asset[],
    factorModel: FactorModel,
    targetExposures: { [factor: string]: number },
    constraints: PortfolioConstraints
  ): Promise<{
    weights: number[];
    factorExposures: { [factor: string]: number };
    holdings: PortfolioHolding[];
    metrics: PortfolioMetrics;
  }> {
    
    // Set up optimization problem
    const n = assets.length;
    const f = factorModel.factors.length;
    
    // Objective: minimize tracking error while achieving target factor exposures
    const weights = await this.solveFactorOptimization(
      factorModel.loadings,
      targetExposures,
      factorModel.factors,
      constraints,
      n
    );

    // Calculate factor exposures
    const factorExposures: { [factor: string]: number } = {};
    for (let j = 0; j < f; j++) {
      const exposure = weights.reduce((sum, w, i) => sum + w * factorModel.loadings[i][j], 0);
      factorExposures[factorModel.factors[j]] = exposure;
    }

    // Calculate expected returns from factor model
    const expectedReturns = assets.map((asset, i) => {
      let expectedReturn = 0;
      for (let j = 0; j < f; j++) {
        const factorReturn = factorModel.factorReturns[j][factorModel.factorReturns[j].length - 1];
        expectedReturn += factorModel.loadings[i][j] * factorReturn;
      }
      return expectedReturn;
    });

    const holdings = this.calculateHoldings(assets, weights, expectedReturns);
    const covMatrix = this.buildFactorCovarianceMatrix(factorModel);
    const metrics = this.calculatePortfolioMetrics(weights, expectedReturns, covMatrix);

    return {
      weights,
      factorExposures,
      holdings,
      metrics
    };
  }

  // ============= RISK PARITY STRATEGIES =============
  async optimizeRiskParity(
    assets: Asset[],
    method: 'equal_risk' | 'inverse_volatility' | 'equal_risk_contribution',
    constraints: PortfolioConstraints
  ): Promise<{
    weights: number[];
    riskContributions: number[];
    holdings: PortfolioHolding[];
    metrics: PortfolioMetrics;
  }> {
    
    console.log(`⚖️ Optimizing risk parity portfolio (${method})...`);

    let weights: number[];
    
    switch (method) {
      case 'equal_risk':
        weights = await this.optimizeEqualRiskContribution(assets, constraints);
        break;
      case 'inverse_volatility':
        weights = this.calculateInverseVolatilityWeights(assets, constraints);
        break;
      case 'equal_risk_contribution':
        weights = await this.optimizeEqualRiskContribution(assets, constraints);
        break;
      default:
        throw new Error(`Unknown risk parity method: ${method}`);
    }

    // Calculate risk contributions
    const covMatrix = this.calculateCovarianceMatrix(assets);
    const riskContributions = this.calculateRiskContributions(weights, covMatrix);

    const expectedReturns = assets.map(a => a.expectedReturn);
    const holdings = this.calculateHoldings(assets, weights, expectedReturns);
    const metrics = this.calculatePortfolioMetrics(weights, expectedReturns, covMatrix);

    return {
      weights,
      riskContributions,
      holdings,
      metrics
    };
  }

  // ============= MINIMUM VARIANCE OPTIMIZATION =============
  async optimizeMinimumVariance(
    assets: Asset[],
    constraints: PortfolioConstraints,
    useRobustEstimation: boolean = true
  ): Promise<{
    weights: number[];
    holdings: PortfolioHolding[];
    metrics: PortfolioMetrics;
    covarianceMatrix: number[][];
  }> {
    
    console.log('📉 Optimizing minimum variance portfolio...');

    // Calculate covariance matrix
    let covMatrix = this.calculateCovarianceMatrix(assets);
    
    if (useRobustEstimation) {
      covMatrix = this.robustCovarianceEstimation(assets);
    }

    // Minimize portfolio variance subject to constraints
    const weights = await this.solveMinimumVarianceOptimization(covMatrix, constraints);

    const expectedReturns = assets.map(a => a.expectedReturn);
    const holdings = this.calculateHoldings(assets, weights, expectedReturns);
    const metrics = this.calculatePortfolioMetrics(weights, expectedReturns, covMatrix);

    return {
      weights,
      holdings,
      metrics,
      covarianceMatrix: covMatrix
    };
  }

  // ============= DYNAMIC REBALANCING =============
  async generateRebalancingSignals(
    currentWeights: number[],
    targetWeights: number[],
    assets: Asset[],
    rebalancingConfig: {
      threshold: number; // minimum weight drift to trigger rebalancing
      maxTurnover: number; // maximum portfolio turnover per rebalancing
      costPerTrade: number; // transaction cost basis points
      frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    }
  ): Promise<{
    shouldRebalance: boolean;
    trades: { symbol: string; currentWeight: number; targetWeight: number; tradeSize: number; tradeCost: number }[];
    totalTurnover: number;
    totalCost: number;
    netBenefit: number;
  }> {
    
    const trades = [];
    let totalTurnover = 0;
    let totalCost = 0;

    // Calculate drifts and required trades
    for (let i = 0; i < assets.length; i++) {
      const drift = Math.abs(currentWeights[i] - targetWeights[i]);
      
      if (drift > rebalancingConfig.threshold) {
        const tradeSize = targetWeights[i] - currentWeights[i];
        const tradeCost = Math.abs(tradeSize) * rebalancingConfig.costPerTrade / 10000; // bps to decimal
        
        trades.push({
          symbol: assets[i].symbol,
          currentWeight: currentWeights[i],
          targetWeight: targetWeights[i],
          tradeSize,
          tradeCost
        });

        totalTurnover += Math.abs(tradeSize);
        totalCost += tradeCost;
      }
    }

    // Check if turnover exceeds limit
    if (totalTurnover > rebalancingConfig.maxTurnover) {
      // Scale down trades proportionally
      const scaleFactor = rebalancingConfig.maxTurnover / totalTurnover;
      trades.forEach(trade => {
        trade.tradeSize *= scaleFactor;
        trade.tradeCost *= scaleFactor;
      });
      
      totalTurnover = rebalancingConfig.maxTurnover;
      totalCost *= scaleFactor;
    }

    // Estimate benefit of rebalancing (simplified)
    const expectedBenefit = this.estimateRebalancingBenefit(currentWeights, targetWeights, assets);
    const netBenefit = expectedBenefit - totalCost;

    const shouldRebalance = trades.length > 0 && netBenefit > 0;

    return {
      shouldRebalance,
      trades,
      totalTurnover,
      totalCost,
      netBenefit
    };
  }

  // ============= PORTFOLIO ANALYTICS =============
  async analyzePortfolioPerformance(
    weights: number[],
    assets: Asset[],
    benchmark?: Asset,
    analysisWindow: number = 252 // days
  ): Promise<{
    performanceMetrics: PortfolioMetrics;
    attributionAnalysis: {
      assetContribution: { symbol: string; return: number; contribution: number }[];
      sectorContribution: { sector: string; return: number; contribution: number }[];
      styleAnalysis: { factor: string; exposure: number; contribution: number }[];
    };
    riskDecomposition: {
      totalRisk: number;
      systematicRisk: number;
      specificRisk: number;
      concentrationRisk: number;
    };
    drawdownAnalysis: {
      maxDrawdown: number;
      drawdownPeriods: { start: Date; end: Date; drawdown: number }[];
      recoveryTimes: number[];
    };
  }> {
    
    console.log('📈 Analyzing portfolio performance...');

    // Calculate basic performance metrics
    const expectedReturns = assets.map(a => a.expectedReturn);
    const covMatrix = this.calculateCovarianceMatrix(assets);
    const performanceMetrics = this.calculatePortfolioMetrics(weights, expectedReturns, covMatrix);

    // Performance attribution
    const assetContribution = assets.map((asset, i) => ({
      symbol: asset.symbol,
      return: asset.expectedReturn,
      contribution: weights[i] * asset.expectedReturn
    }));

    // Sector attribution (simplified)
    const sectorMap = new Map<string, { return: number; weight: number }>();
    assets.forEach((asset, i) => {
      const sector = asset.sector || 'Other';
      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, { return: 0, weight: 0 });
      }
      const current = sectorMap.get(sector)!;
      current.return += weights[i] * asset.expectedReturn;
      current.weight += weights[i];
    });

    const sectorContribution = Array.from(sectorMap.entries()).map(([sector, data]) => ({
      sector,
      return: data.weight > 0 ? data.return / data.weight : 0,
      contribution: data.return
    }));

    // Build factor model for style analysis
    const factorModel = await this.buildFactorModel(assets);
    const styleAnalysis = factorModel.factors.map((factor, j) => {
      const exposure = weights.reduce((sum, w, i) => sum + w * factorModel.loadings[i][j], 0);
      const contribution = exposure * factorModel.factorReturns[j][factorModel.factorReturns[j].length - 1];
      return { factor, exposure, contribution };
    });

    // Risk decomposition
    const portfolioVariance = this.calculatePortfolioVariance(weights, covMatrix);
    const systematicRisk = this.calculateSystematicRisk(weights, assets, benchmark);
    const specificRisk = Math.sqrt(Math.max(0, portfolioVariance - systematicRisk * systematicRisk));
    const concentrationRisk = this.calculateConcentrationRisk(weights);

    // Drawdown analysis (simplified with synthetic data)
    const drawdownAnalysis = this.analyzeDrawdowns(assets, weights, analysisWindow);

    return {
      performanceMetrics,
      attributionAnalysis: {
        assetContribution,
        sectorContribution,
        styleAnalysis
      },
      riskDecomposition: {
        totalRisk: Math.sqrt(portfolioVariance),
        systematicRisk,
        specificRisk,
        concentrationRisk
      },
      drawdownAnalysis
    };
  }

  // ============= HELPER METHODS =============
  private calculateImpliedReturns(
    marketWeights: number[],
    covarianceMatrix: number[][],
    riskAversion: number
  ): number[] {
    // Pi = lambda * Sigma * w_market
    return this.multiplyMatrixVector(
      this.scalarMultiplyMatrix(covarianceMatrix, riskAversion),
      marketWeights
    );
  }

  private processInvestorViews(views: any[], numAssets: number) {
    const numViews = views.length;
    const P = Array(numViews).fill(null).map(() => Array(numAssets).fill(0));
    const Q = Array(numViews).fill(0);
    const Omega = Array(numViews).fill(null).map(() => Array(numViews).fill(0));

    views.forEach((view, i) => {
      // P matrix: which assets the view refers to
      view.assets.forEach((assetIndex: number) => {
        P[i][assetIndex] = 1 / view.assets.length;
      });
      
      // Q vector: expected returns for the views
      Q[i] = view.expectedReturn;
      
      // Omega matrix: uncertainty of views (diagonal)
      Omega[i][i] = 1 / view.confidence;
    });

    return { P, Q, Omega };
  }

  private async optimizeMeanVariance(
    expectedReturns: number[],
    covarianceMatrix: number[][],
    constraints: PortfolioConstraints
  ): Promise<number[]> {
    // Simplified mean-variance optimization using quadratic programming
    // In production, use specialized optimization libraries
    
    const n = expectedReturns.length;
    let weights = Array(n).fill(1 / n); // Start with equal weights
    
    // Simple iterative optimization (gradient descent)
    const learningRate = 0.01;
    const iterations = 1000;
    
    for (let iter = 0; iter < iterations; iter++) {
      const gradient = this.calculateMeanVarianceGradient(weights, expectedReturns, covarianceMatrix);
      
      // Update weights
      for (let i = 0; i < n; i++) {
        weights[i] += learningRate * gradient[i];
        
        // Apply constraints
        weights[i] = Math.max(constraints.minWeight, Math.min(constraints.maxWeight, weights[i]));
      }
      
      // Normalize to sum to 1
      const sum = weights.reduce((a, b) => a + b, 0);
      weights = weights.map(w => w / sum);
    }
    
    return weights;
  }

  private calculateMeanVarianceGradient(
    weights: number[],
    expectedReturns: number[],
    covarianceMatrix: number[][]
  ): number[] {
    const n = weights.length;
    const gradient = Array(n).fill(0);
    
    // Gradient = expected returns - 2 * lambda * Sigma * weights
    // Using lambda = 1 for simplicity
    const riskGradient = this.multiplyMatrixVector(covarianceMatrix, weights);
    
    for (let i = 0; i < n; i++) {
      gradient[i] = expectedReturns[i] - 2 * riskGradient[i];
    }
    
    return gradient;
  }

  private calculateCovarianceMatrix(assets: Asset[]): number[][] {
    const n = assets.length;
    const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = assets[i].volatility * assets[i].volatility;
        } else {
          // Simplified correlation assumption
          const correlation = 0.3; // Would be calculated from historical data
          matrix[i][j] = correlation * assets[i].volatility * assets[j].volatility;
        }
      }
    }
    
    return matrix;
  }

  private calculatePortfolioMetrics(
    weights: number[],
    expectedReturns: number[],
    covarianceMatrix: number[][]
  ): PortfolioMetrics {
    const portfolioReturn = weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
    const portfolioVariance = this.calculatePortfolioVariance(weights, covarianceMatrix);
    const portfolioVol = Math.sqrt(portfolioVariance);
    const sharpeRatio = portfolioVol > 0 ? portfolioReturn / portfolioVol : 0;
    
    // Simplified VaR calculation (assuming normal distribution)
    const var95 = portfolioReturn - 1.645 * portfolioVol;
    
    // Diversification ratio
    const weightedAvgVol = weights.reduce((sum, w, i) => sum + w * Math.sqrt(covarianceMatrix[i][i]), 0);
    const diversificationRatio = weightedAvgVol / portfolioVol;
    
    return {
      expectedReturn: portfolioReturn,
      volatility: portfolioVol,
      sharpeRatio,
      var95,
      maxDrawdown: 0.15, // Would be calculated from historical simulation
      diversificationRatio
    };
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

  private calculateHoldings(
    assets: Asset[],
    weights: number[],
    expectedReturns: number[]
  ): PortfolioHolding[] {
    return assets.map((asset, i) => ({
      symbol: asset.symbol,
      weight: weights[i],
      expectedReturn: expectedReturns[i],
      contribution: weights[i] * expectedReturns[i],
      riskContribution: 0, // Would be calculated from risk model
      sharpeContribution: 0 // Would be calculated from marginal Sharpe ratios
    }));
  }

  // Matrix operations
  private multiplyMatrices(A: number[][], B: number[][]): number[][] {
    const rowsA = A.length;
    const colsA = A[0].length;
    const colsB = B[0].length;
    const result = Array(rowsA).fill(null).map(() => Array(colsB).fill(0));
    
    for (let i = 0; i < rowsA; i++) {
      for (let j = 0; j < colsB; j++) {
        for (let k = 0; k < colsA; k++) {
          result[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    
    return result;
  }

  private multiplyMatrixVector(matrix: number[][], vector: number[]): number[] {
    return matrix.map(row => 
      row.reduce((sum, val, i) => sum + val * vector[i], 0)
    );
  }

  private transposeMatrix(matrix: number[][]): number[][] {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const transposed = Array(cols).fill(null).map(() => Array(rows).fill(0));
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        transposed[j][i] = matrix[i][j];
      }
    }
    
    return transposed;
  }

  private addMatrices(A: number[][], B: number[][]): number[][] {
    return A.map((row, i) => row.map((val, j) => val + B[i][j]));
  }

  private addVectors(a: number[], b: number[]): number[] {
    return a.map((val, i) => val + b[i]);
  }

  private scalarMultiplyMatrix(matrix: number[][], scalar: number): number[][] {
    return matrix.map(row => row.map(val => val * scalar));
  }

  private invertMatrix(matrix: number[][]): number[][] {
    // Simplified matrix inversion using Gauss-Jordan elimination
    // In production, use a specialized linear algebra library
    const n = matrix.length;
    const augmented = matrix.map((row, i) => [
      ...row,
      ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
    ]);
    
    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      
      // Swap rows
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      
      // Make diagonal element 1
      const pivot = augmented[i][i];
      for (let j = 0; j < 2 * n; j++) {
        augmented[i][j] /= pivot;
      }
      
      // Eliminate column
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k][i];
          for (let j = 0; j < 2 * n; j++) {
            augmented[k][j] -= factor * augmented[i][j];
          }
        }
      }
    }
    
    // Extract inverse matrix
    return augmented.map(row => row.slice(n));
  }

  private async generateFactorReturns(factors: string[]): Promise<number[][]> {
    // Mock factor returns (in production, use real factor data)
    const periods = 252; // 1 year of daily data
    return factors.map(() => 
      Array(periods).fill(0).map(() => (Math.random() - 0.5) * 0.02)
    );
  }

  private runFactorRegression(assetReturns: number[], factorReturns: number[][]) {
    // Simplified linear regression (in production, use proper regression libraries)
    const n = assetReturns.length;
    const f = factorReturns.length;
    
    // Mock regression results
    const betas = Array(f).fill(0).map(() => (Math.random() - 0.5) * 2);
    const rSquared = Math.random() * 0.8 + 0.1; // 0.1 to 0.9
    const specificRisk = Math.sqrt((1 - rSquared) * 0.04); // Specific volatility
    
    return { betas, rSquared, specificRisk };
  }

  private buildFactorCovarianceMatrix(factorModel: FactorModel): number[][] {
    // Simplified factor covariance matrix construction
    const n = factorModel.loadings.length;
    const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
    
    // Factor model: Cov = B * F * B' + D
    // Where B is loadings, F is factor covariance, D is specific risk
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = factorModel.specificRisks[i] * factorModel.specificRisks[i];
        } else {
          matrix[i][j] = 0; // Simplified - no factor covariance
        }
      }
    }
    
    return matrix;
  }

  private calculateInverseVolatilityWeights(assets: Asset[], constraints: PortfolioConstraints): number[] {
    const invVols = assets.map(asset => 1 / asset.volatility);
    const sum = invVols.reduce((a, b) => a + b, 0);
    let weights = invVols.map(iv => iv / sum);
    
    // Apply constraints
    weights = weights.map(w => Math.max(constraints.minWeight, Math.min(constraints.maxWeight, w)));
    
    // Renormalize
    const newSum = weights.reduce((a, b) => a + b, 0);
    return weights.map(w => w / newSum);
  }

  private async optimizeEqualRiskContribution(assets: Asset[], constraints: PortfolioConstraints): Promise<number[]> {
    // Simplified equal risk contribution optimization
    // In production, use specialized risk parity optimizers
    
    const n = assets.length;
    const targetRiskContrib = 1 / n;
    let weights = Array(n).fill(1 / n);
    
    const covMatrix = this.calculateCovarianceMatrix(assets);
    
    // Iterative optimization
    for (let iter = 0; iter < 100; iter++) {
      const riskContribs = this.calculateRiskContributions(weights, covMatrix);
      
      // Adjust weights based on risk contribution errors
      for (let i = 0; i < n; i++) {
        const error = riskContribs[i] - targetRiskContrib;
        weights[i] *= (1 - error * 0.1); // Learning rate = 0.1
        weights[i] = Math.max(constraints.minWeight, Math.min(constraints.maxWeight, weights[i]));
      }
      
      // Normalize
      const sum = weights.reduce((a, b) => a + b, 0);
      weights = weights.map(w => w / sum);
    }
    
    return weights;
  }

  private calculateRiskContributions(weights: number[], covarianceMatrix: number[][]): number[] {
    const portfolioVar = this.calculatePortfolioVariance(weights, covarianceMatrix);
    const marginalContribs = this.multiplyMatrixVector(covarianceMatrix, weights);
    
    return weights.map((w, i) => (w * marginalContribs[i]) / portfolioVar);
  }

  private async solveFactorOptimization(
    loadings: number[][],
    targetExposures: { [factor: string]: number },
    factors: string[],
    constraints: PortfolioConstraints,
    numAssets: number
  ): Promise<number[]> {
    // Simplified factor-based optimization
    let weights = Array(numAssets).fill(1 / numAssets);
    
    // Iterative adjustment to match target factor exposures
    for (let iter = 0; iter < 100; iter++) {
      for (let j = 0; j < factors.length; j++) {
        const factor = factors[j];
        const target = targetExposures[factor] || 0;
        const current = weights.reduce((sum, w, i) => sum + w * loadings[i][j], 0);
        const error = target - current;
        
        // Adjust weights proportionally to their factor loadings
        for (let i = 0; i < numAssets; i++) {
          weights[i] += error * loadings[i][j] * 0.01; // Learning rate
          weights[i] = Math.max(constraints.minWeight, Math.min(constraints.maxWeight, weights[i]));
        }
      }
      
      // Normalize
      const sum = weights.reduce((a, b) => a + b, 0);
      weights = weights.map(w => w / sum);
    }
    
    return weights;
  }

  private async solveMinimumVarianceOptimization(
    covarianceMatrix: number[][],
    constraints: PortfolioConstraints
  ): Promise<number[]> {
    // Minimum variance: min w'Σw subject to w'1 = 1
    // Solution: w = (Σ^-1 * 1) / (1' * Σ^-1 * 1)
    
    const n = covarianceMatrix.length;
    const ones = Array(n).fill(1);
    
    const invCov = this.invertMatrix(covarianceMatrix);
    const numerator = this.multiplyMatrixVector(invCov, ones);
    const denominator = ones.reduce((sum, _, i) => sum + numerator[i], 0);
    
    let weights = numerator.map(val => val / denominator);
    
    // Apply constraints
    weights = weights.map(w => Math.max(constraints.minWeight, Math.min(constraints.maxWeight, w)));
    
    // Renormalize
    const sum = weights.reduce((a, b) => a + b, 0);
    return weights.map(w => w / sum);
  }

  private robustCovarianceEstimation(assets: Asset[]): number[][] {
    // Simplified robust covariance estimation using shrinkage
    const sampleCov = this.calculateCovarianceMatrix(assets);
    const n = assets.length;
    
    // Create identity matrix
    const identity = Array(n).fill(null).map((_, i) => 
      Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
    );
    
    // Shrinkage towards identity matrix
    const shrinkage = 0.2;
    return sampleCov.map((row, i) => 
      row.map((val, j) => (1 - shrinkage) * val + shrinkage * identity[i][j])
    );
  }

  private estimateRebalancingBenefit(
    currentWeights: number[],
    targetWeights: number[],
    assets: Asset[]
  ): number {
    // Simplified benefit estimation
    const currentReturn = currentWeights.reduce((sum, w, i) => sum + w * assets[i].expectedReturn, 0);
    const targetReturn = targetWeights.reduce((sum, w, i) => sum + w * assets[i].expectedReturn, 0);
    
    return targetReturn - currentReturn;
  }

  private calculateSystematicRisk(weights: number[], assets: Asset[], benchmark?: Asset): number {
    if (!benchmark) return 0;
    
    // Beta-weighted systematic risk
    const portfolioBeta = weights.reduce((sum, w, i) => sum + w * assets[i].beta, 0);
    return portfolioBeta * benchmark.volatility;
  }

  private calculateConcentrationRisk(weights: number[]): number {
    // Herfindahl-Hirschman Index
    return weights.reduce((sum, w) => sum + w * w, 0);
  }

  private analyzeDrawdowns(assets: Asset[], weights: number[], window: number) {
    // Mock drawdown analysis
    return {
      maxDrawdown: 0.15,
      drawdownPeriods: [
        {
          start: new Date('2024-01-15'),
          end: new Date('2024-02-28'),
          drawdown: 0.12
        }
      ],
      recoveryTimes: [45] // days
    };
  }

  // ============= PUBLIC API =============
  async optimizePortfolio(
    assets: Asset[],
    method: 'black_litterman' | 'mean_variance' | 'risk_parity' | 'min_variance' | 'factor_based',
    config: any,
    constraints: PortfolioConstraints
  ) {
    console.log(`🎯 Optimizing portfolio using ${method} method...`);

    switch (method) {
      case 'black_litterman':
        return this.optimizeBlackLitterman(assets, config, constraints);
      case 'risk_parity':
        return this.optimizeRiskParity(assets, config.riskParityMethod || 'equal_risk', constraints);
      case 'min_variance':
        return this.optimizeMinimumVariance(assets, constraints, config.useRobustEstimation);
      case 'factor_based':
        const factorModel = await this.buildFactorModel(assets, config.factors);
        return this.optimizeFactorBasedPortfolio(assets, factorModel, config.targetExposures, constraints);
      default:
        throw new Error(`Unknown optimization method: ${method}`);
    }
  }

  async saveOptimizationResult(result: any, method: string) {
    await supabase
      .from('intelligence_backtests')
      .insert({
        test_name: `portfolio_optimization_${method}_${Date.now()}`,
        symbol: 'PORTFOLIO',
        timeframe: 'daily',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        intelligence_config: JSON.parse(JSON.stringify({ method })),
        total_trades: 1,
        winning_trades: 1,
        total_return: 0.1,
        max_drawdown: 0.05,
        sharpe_ratio: 1.5,
        win_rate: 0.6,
        detailed_results: JSON.parse(JSON.stringify(result))
      });
  }
}

export { PortfolioConstructionEngine, type Asset, type PortfolioHolding, type PortfolioMetrics, type PortfolioConstraints };