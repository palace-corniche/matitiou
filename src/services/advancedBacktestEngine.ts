// ============= PHASE B: ADVANCED BACKTESTING & OPTIMIZATION ENGINE =============
import { AdvancedQuantEngine } from './advancedQuantEngine';
import { MachineLearningModels } from './machinelearningModels';
import { supabase } from '@/integrations/supabase/client';

interface BacktestConfig {
  startDate: Date;
  endDate: Date;
  symbol: string;
  timeframe: string;
  initialCapital: number;
  riskPerTrade: number;
  maxPositions: number;
  strategy: string;
  parameters: Record<string, any>;
}

interface BacktestResult {
  id: string;
  config: BacktestConfig;
  performance: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    totalTrades: number;
    avgTradeReturn: number;
    volatility: number;
    calmarRatio: number;
    sortinoRatio: number;
  };
  trades: BacktestTrade[];
  equity_curve: { date: Date; equity: number; drawdown: number }[];
  monthlyReturns: { month: string; return: number }[];
  statistics: any;
}

interface BacktestTrade {
  entryDate: Date;
  exitDate: Date;
  entryPrice: number;
  exitPrice: number;
  size: number;
  side: 'long' | 'short';
  pnl: number;
  pnlPercent: number;
  holdingPeriod: number;
  exitReason: string;
}

interface OptimizationResult {
  parameters: Record<string, any>;
  fitness: number;
  backtest: BacktestResult;
  generation: number;
}

interface WalkForwardResult {
  period: { start: Date; end: Date };
  inSample: BacktestResult;
  outOfSample: BacktestResult;
  optimization: OptimizationResult;
  degradation: number;
}

class AdvancedBacktestEngine {
  private quantEngine: AdvancedQuantEngine;
  private mlModels: MachineLearningModels;

  constructor() {
    this.quantEngine = new AdvancedQuantEngine();
    this.mlModels = new MachineLearningModels();
  }

  // ============= WALK-FORWARD ANALYSIS =============
  async runWalkForwardAnalysis(
    config: BacktestConfig,
    parameterRanges: Record<string, any[]>,
    windowSize: number = 252, // 1 year
    stepSize: number = 63,    // 3 months
    outOfSampleRatio: number = 0.25
  ): Promise<WalkForwardResult[]> {
    
    const results: WalkForwardResult[] = [];
    const marketData = await this.getMarketData(config.symbol, config.startDate, config.endDate);
    
    let currentStart = 0;
    const inSampleSize = Math.floor(windowSize * (1 - outOfSampleRatio));
    const outOfSampleSize = windowSize - inSampleSize;

    while (currentStart + windowSize < marketData.length) {
      console.log(`📊 Walk-forward period ${results.length + 1}: ${currentStart} to ${currentStart + windowSize}`);
      
      // Split data
      const inSampleData = marketData.slice(currentStart, currentStart + inSampleSize);
      const outOfSampleData = marketData.slice(currentStart + inSampleSize, currentStart + windowSize);
      
      // Optimize on in-sample data
      const optimization = await this.optimizeParameters(
        { ...config, startDate: inSampleData[0].timestamp, endDate: inSampleData[inSampleData.length - 1].timestamp },
        parameterRanges,
        'genetic',
        50 // generations
      );

      // Test on in-sample data with optimized parameters
      const inSampleBacktest = await this.runBacktest({
        ...config,
        parameters: optimization.parameters,
        startDate: inSampleData[0].timestamp,
        endDate: inSampleData[inSampleData.length - 1].timestamp
      });

      // Test on out-of-sample data
      const outOfSampleBacktest = await this.runBacktest({
        ...config,
        parameters: optimization.parameters,
        startDate: outOfSampleData[0].timestamp,
        endDate: outOfSampleData[outOfSampleData.length - 1].timestamp
      });

      // Calculate performance degradation
      const degradation = (inSampleBacktest.performance.sharpeRatio - outOfSampleBacktest.performance.sharpeRatio) / 
                         Math.abs(inSampleBacktest.performance.sharpeRatio);

      results.push({
        period: {
          start: inSampleData[0].timestamp,
          end: outOfSampleData[outOfSampleData.length - 1].timestamp
        },
        inSample: inSampleBacktest,
        outOfSample: outOfSampleBacktest,
        optimization,
        degradation
      });

      currentStart += stepSize;
    }

    // Save walk-forward results
    await this.saveWalkForwardResults(results);
    
    return results;
  }

  // ============= MONTE CARLO SIMULATION =============
  async runMonteCarloSimulation(
    backtest: BacktestResult,
    numSimulations: number = 1000,
    confidenceLevel: number = 0.95
  ): Promise<{
    simulations: number[][];
    statistics: {
      expectedReturn: number;
      standardDeviation: number;
      valueAtRisk: number;
      expectedShortfall: number;
      probabilityOfLoss: number;
      confidenceInterval: [number, number];
    };
  }> {
    
    const tradeReturns = backtest.trades.map(trade => trade.pnlPercent);
    const simulations: number[][] = [];

    // Run Monte Carlo simulations
    for (let sim = 0; sim < numSimulations; sim++) {
      const equityCurve = [backtest.config.initialCapital];
      let currentEquity = backtest.config.initialCapital;

      // Randomly sample from historical trade returns
      for (let i = 0; i < backtest.trades.length; i++) {
        const randomReturn = tradeReturns[Math.floor(Math.random() * tradeReturns.length)];
        currentEquity *= (1 + randomReturn);
        equityCurve.push(currentEquity);
      }

      simulations.push(equityCurve);
    }

    // Calculate statistics
    const finalReturns = simulations.map(sim => (sim[sim.length - 1] / sim[0]) - 1);
    finalReturns.sort((a, b) => a - b);

    const expectedReturn = finalReturns.reduce((sum, ret) => sum + ret, 0) / finalReturns.length;
    const variance = finalReturns.reduce((sum, ret) => sum + Math.pow(ret - expectedReturn, 2), 0) / finalReturns.length;
    const standardDeviation = Math.sqrt(variance);

    const varIndex = Math.floor((1 - confidenceLevel) * numSimulations);
    const valueAtRisk = -finalReturns[varIndex];
    
    const expectedShortfall = -finalReturns.slice(0, varIndex).reduce((sum, ret) => sum + ret, 0) / varIndex;
    const probabilityOfLoss = finalReturns.filter(ret => ret < 0).length / numSimulations;

    const ciLower = finalReturns[Math.floor((1 - confidenceLevel) / 2 * numSimulations)];
    const ciUpper = finalReturns[Math.floor((1 + confidenceLevel) / 2 * numSimulations)];

    return {
      simulations,
      statistics: {
        expectedReturn,
        standardDeviation,
        valueAtRisk,
        expectedShortfall,
        probabilityOfLoss,
        confidenceInterval: [ciLower, ciUpper]
      }
    };
  }

  // ============= GENETIC ALGORITHM OPTIMIZATION =============
  async optimizeParameters(
    config: BacktestConfig,
    parameterRanges: Record<string, any[]>,
    algorithm: 'genetic' | 'grid' | 'random' = 'genetic',
    maxGenerations: number = 100
  ): Promise<OptimizationResult> {

    if (algorithm === 'genetic') {
      return this.geneticOptimization(config, parameterRanges, maxGenerations);
    } else if (algorithm === 'grid') {
      return this.gridSearchOptimization(config, parameterRanges);
    } else {
      return this.randomSearchOptimization(config, parameterRanges, maxGenerations);
    }
  }

  private async geneticOptimization(
    config: BacktestConfig,
    parameterRanges: Record<string, any[]>,
    maxGenerations: number
  ): Promise<OptimizationResult> {
    
    const populationSize = 50;
    const mutationRate = 0.1;
    const crossoverRate = 0.8;
    const eliteSize = 5;

    // Initialize population
    let population = this.createRandomPopulation(parameterRanges, populationSize);
    let bestResult: OptimizationResult | null = null;

    for (let generation = 0; generation < maxGenerations; generation++) {
      console.log(`🧬 Genetic optimization generation ${generation + 1}/${maxGenerations}`);

      // Evaluate fitness for each individual
      const fitness = await Promise.all(
        population.map(async (individual) => {
          const backtest = await this.runBacktest({ ...config, parameters: individual });
          const fitness = this.calculateFitness(backtest);
          
          if (!bestResult || fitness > bestResult.fitness) {
            bestResult = { parameters: individual, fitness, backtest, generation };
          }
          
          return { individual, fitness, backtest };
        })
      );

      // Sort by fitness
      fitness.sort((a, b) => b.fitness - a.fitness);

      // Selection and reproduction
      const newPopulation = [];

      // Elite selection
      for (let i = 0; i < eliteSize; i++) {
        newPopulation.push(fitness[i].individual);
      }

      // Crossover and mutation
      while (newPopulation.length < populationSize) {
        const parent1 = this.tournamentSelection(fitness, 3);
        const parent2 = this.tournamentSelection(fitness, 3);

        if (Math.random() < crossoverRate) {
          const [child1, child2] = this.crossover(parent1.individual, parent2.individual, parameterRanges);
          newPopulation.push(this.mutate(child1, parameterRanges, mutationRate));
          if (newPopulation.length < populationSize) {
            newPopulation.push(this.mutate(child2, parameterRanges, mutationRate));
          }
        } else {
          newPopulation.push(this.mutate(parent1.individual, parameterRanges, mutationRate));
        }
      }

      population = newPopulation;
    }

    return bestResult!;
  }

  // ============= REGIME-BASED BACKTESTING =============
  async runRegimeBasedBacktest(
    config: BacktestConfig,
    regimeIndicators: string[] = ['volatility', 'trend', 'correlation']
  ): Promise<{
    overall: BacktestResult;
    regimes: { [regime: string]: BacktestResult };
    transitions: { from: string; to: string; date: Date; impact: number }[];
  }> {
    
    const marketData = await this.getMarketData(config.symbol, config.startDate, config.endDate);
    
    // Detect market regimes
    const regimes = await this.detectMarketRegimes(marketData, regimeIndicators);
    
    // Run overall backtest
    const overallBacktest = await this.runBacktest(config);
    
    // Run regime-specific backtests
    const regimeBacktests: { [regime: string]: BacktestResult } = {};
    const uniqueRegimes = [...new Set(regimes.map(r => r.regime))];
    
    for (const regime of uniqueRegimes) {
      const regimePeriods = regimes.filter(r => r.regime === regime);
      if (regimePeriods.length === 0) continue;
      
      // Create regime-specific config
      const regimeConfig = { ...config };
      const regimeBacktest = await this.runRegimeSpecificBacktest(regimeConfig, regimePeriods);
      regimeBacktests[regime] = regimeBacktest;
    }
    
    // Detect regime transitions and their impact
    const transitions = this.analyzeRegimeTransitions(regimes, overallBacktest.trades);
    
    return {
      overall: overallBacktest,
      regimes: regimeBacktests,
      transitions
    };
  }

  // ============= CORE BACKTESTING ENGINE =============
  async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    const marketData = await this.getMarketData(config.symbol, config.startDate, config.endDate);
    
    if (marketData.length === 0) {
      throw new Error('No market data available for backtest period');
    }

    const trades: BacktestTrade[] = [];
    const equityCurve: { date: Date; equity: number; drawdown: number }[] = [];
    let currentEquity = config.initialCapital;
    let peakEquity = config.initialCapital;
    let openPositions: any[] = [];

    // Generate signals based on strategy
    const signals = await this.generateBacktestSignals(config, marketData);

    for (let i = 0; i < marketData.length; i++) {
      const bar = marketData[i];
      const currentSignals = signals.filter(s => s.timestamp === bar.timestamp);

      // Process exits first
      openPositions = openPositions.filter(position => {
        if (this.shouldExit(position, bar, config)) {
          const trade = this.closePosition(position, bar);
          trades.push(trade);
          currentEquity += trade.pnl;
          return false;
        }
        return true;
      });

      // Process new entries
      for (const signal of currentSignals) {
        if (openPositions.length < config.maxPositions) {
          const position = this.openPosition(signal, bar, config, currentEquity);
          if (position) {
            openPositions.push(position);
          }
        }
      }

      // Update equity curve
      const unrealizedPnL = openPositions.reduce((sum, pos) => {
        return sum + this.calculateUnrealizedPnL(pos, bar);
      }, 0);

      const totalEquity = currentEquity + unrealizedPnL;
      peakEquity = Math.max(peakEquity, totalEquity);
      const drawdown = (peakEquity - totalEquity) / peakEquity;

      equityCurve.push({
        date: bar.timestamp,
        equity: totalEquity,
        drawdown
      });
    }

    // Close any remaining positions
    for (const position of openPositions) {
      const trade = this.closePosition(position, marketData[marketData.length - 1]);
      trades.push(trade);
      currentEquity += trade.pnl;
    }

    // Calculate performance metrics
    const performance = this.calculatePerformanceMetrics(trades, equityCurve, config.initialCapital);
    const monthlyReturns = this.calculateMonthlyReturns(equityCurve);
    const statistics = this.calculateAdditionalStatistics(trades, equityCurve);

    const result: BacktestResult = {
      id: `backtest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      config,
      performance,
      trades,
      equity_curve: equityCurve,
      monthlyReturns,
      statistics
    };

    // Save backtest result
    await this.saveBacktestResult(result);

    return result;
  }

  // ============= HELPER METHODS =============
  private async getMarketData(symbol: string, startDate: Date, endDate: Date) {
    const { data } = await supabase
      .from('market_data_enhanced')
      .select('*')
      .eq('symbol', symbol)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: true });

    return (data || []).map(d => ({
      ...d,
      timestamp: new Date(d.timestamp)
    }));
  }

  private async generateBacktestSignals(config: BacktestConfig, marketData: any[]) {
    // This would implement the specific strategy logic
    // For now, using a simple moving average crossover
    const signals = [];
    const shortMA = 10;
    const longMA = 30;

    for (let i = longMA; i < marketData.length; i++) {
      const shortSMA = marketData.slice(i - shortMA, i).reduce((sum, d) => sum + d.close, 0) / shortMA;
      const longSMA = marketData.slice(i - longMA, i).reduce((sum, d) => sum + d.close, 0) / longMA;
      const prevShortSMA = marketData.slice(i - shortMA - 1, i - 1).reduce((sum, d) => sum + d.close, 0) / shortMA;
      const prevLongSMA = marketData.slice(i - longMA - 1, i - 1).reduce((sum, d) => sum + d.close, 0) / longMA;

      // Bullish crossover
      if (shortSMA > longSMA && prevShortSMA <= prevLongSMA) {
        signals.push({
          timestamp: marketData[i].timestamp,
          type: 'buy',
          price: marketData[i].close,
          confidence: 0.7
        });
      }
      // Bearish crossover
      else if (shortSMA < longSMA && prevShortSMA >= prevLongSMA) {
        signals.push({
          timestamp: marketData[i].timestamp,
          type: 'sell',
          price: marketData[i].close,
          confidence: 0.7
        });
      }
    }

    return signals;
  }

  private calculatePerformanceMetrics(trades: BacktestTrade[], equityCurve: any[], initialCapital: number) {
    const totalReturn = (equityCurve[equityCurve.length - 1].equity / initialCapital) - 1;
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);
    
    const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length : 0;
    const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;
    
    const maxDrawdown = Math.max(...equityCurve.map(e => e.drawdown));
    
    // Calculate returns for Sharpe ratio
    const dailyReturns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const dailyReturn = (equityCurve[i].equity / equityCurve[i-1].equity) - 1;
      dailyReturns.push(dailyReturn);
    }
    
    const avgDailyReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
    const dailyReturnStd = Math.sqrt(dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) / dailyReturns.length);
    const sharpeRatio = dailyReturnStd !== 0 ? (avgDailyReturn / dailyReturnStd) * Math.sqrt(252) : 0;

    const volatility = dailyReturnStd * Math.sqrt(252);
    const calmarRatio = maxDrawdown !== 0 ? totalReturn / maxDrawdown : 0;
    
    // Sortino ratio (downside deviation)
    const downsideReturns = dailyReturns.filter(r => r < 0);
    const downsideStd = Math.sqrt(downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length);
    const sortinoRatio = downsideStd !== 0 ? (avgDailyReturn / downsideStd) * Math.sqrt(252) : 0;

    return {
      totalReturn,
      sharpeRatio,
      maxDrawdown,
      winRate,
      profitFactor,
      totalTrades: trades.length,
      avgTradeReturn: trades.length > 0 ? trades.reduce((sum, t) => sum + t.pnlPercent, 0) / trades.length : 0,
      volatility,
      calmarRatio,
      sortinoRatio
    };
  }

  private shouldExit(position: any, bar: any, config: BacktestConfig): boolean {
    // Simple exit logic - can be enhanced
    const holdingPeriod = (bar.timestamp.getTime() - position.entryDate.getTime()) / (1000 * 60 * 60 * 24);
    return holdingPeriod > 5; // Exit after 5 days
  }

  private openPosition(signal: any, bar: any, config: BacktestConfig, currentEquity: number) {
    const riskAmount = currentEquity * config.riskPerTrade;
    const size = riskAmount / bar.close; // Simplified position sizing
    
    return {
      entryDate: bar.timestamp,
      entryPrice: bar.close,
      size,
      side: signal.type === 'buy' ? 'long' : 'short',
      signal
    };
  }

  private closePosition(position: any, bar: any): BacktestTrade {
    const exitPrice = bar.close;
    const pnl = position.side === 'long' 
      ? (exitPrice - position.entryPrice) * position.size
      : (position.entryPrice - exitPrice) * position.size;
    
    const pnlPercent = pnl / (position.entryPrice * position.size);
    const holdingPeriod = (bar.timestamp.getTime() - position.entryDate.getTime()) / (1000 * 60 * 60 * 24);

    return {
      entryDate: position.entryDate,
      exitDate: bar.timestamp,
      entryPrice: position.entryPrice,
      exitPrice,
      size: position.size,
      side: position.side,
      pnl,
      pnlPercent,
      holdingPeriod,
      exitReason: 'time_exit'
    };
  }

  private calculateUnrealizedPnL(position: any, bar: any): number {
    return position.side === 'long'
      ? (bar.close - position.entryPrice) * position.size
      : (position.entryPrice - bar.close) * position.size;
  }

  private calculateMonthlyReturns(equityCurve: any[]) {
    // Group by month and calculate returns
    const monthlyData = new Map();
    
    for (const point of equityCurve) {
      const monthKey = `${point.date.getFullYear()}-${point.date.getMonth() + 1}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { start: point.equity, end: point.equity });
      } else {
        monthlyData.get(monthKey).end = point.equity;
      }
    }
    
    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      return: (data.end / data.start) - 1
    }));
  }

  private calculateAdditionalStatistics(trades: BacktestTrade[], equityCurve: any[]) {
    return {
      maxConsecutiveWins: this.calculateMaxConsecutive(trades, true),
      maxConsecutiveLosses: this.calculateMaxConsecutive(trades, false),
      avgHoldingPeriod: trades.reduce((sum, t) => sum + t.holdingPeriod, 0) / trades.length,
      largestWin: Math.max(...trades.map(t => t.pnl)),
      largestLoss: Math.min(...trades.map(t => t.pnl)),
      recoveryFactor: equityCurve.length > 0 ? 
        (equityCurve[equityCurve.length - 1].equity / Math.max(...equityCurve.map(e => e.drawdown))) : 0
    };
  }

  private calculateMaxConsecutive(trades: BacktestTrade[], wins: boolean): number {
    let maxStreak = 0;
    let currentStreak = 0;
    
    for (const trade of trades) {
      if ((wins && trade.pnl > 0) || (!wins && trade.pnl <= 0)) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    
    return maxStreak;
  }

  private calculateFitness(backtest: BacktestResult): number {
    // Multi-objective fitness function
    const sharpe = backtest.performance.sharpeRatio;
    const calmar = backtest.performance.calmarRatio;
    const winRate = backtest.performance.winRate;
    const profitFactor = backtest.performance.profitFactor;
    
    // Weighted combination of metrics
    return (sharpe * 0.4) + (calmar * 0.3) + (winRate * 0.2) + (Math.log(profitFactor) * 0.1);
  }

  private createRandomPopulation(parameterRanges: Record<string, any[]>, size: number) {
    const population = [];
    
    for (let i = 0; i < size; i++) {
      const individual: Record<string, any> = {};
      
      for (const [param, range] of Object.entries(parameterRanges)) {
        individual[param] = range[Math.floor(Math.random() * range.length)];
      }
      
      population.push(individual);
    }
    
    return population;
  }

  private tournamentSelection(fitness: any[], tournamentSize: number) {
    const tournament = [];
    
    for (let i = 0; i < tournamentSize; i++) {
      tournament.push(fitness[Math.floor(Math.random() * fitness.length)]);
    }
    
    return tournament.reduce((best, current) => 
      current.fitness > best.fitness ? current : best
    );
  }

  private crossover(parent1: any, parent2: any, parameterRanges: Record<string, any[]>) {
    const child1 = { ...parent1 };
    const child2 = { ...parent2 };
    
    // Single-point crossover
    const crossoverPoint = Math.floor(Math.random() * Object.keys(parent1).length);
    const keys = Object.keys(parent1);
    
    for (let i = crossoverPoint; i < keys.length; i++) {
      const key = keys[i];
      [child1[key], child2[key]] = [child2[key], child1[key]];
    }
    
    return [child1, child2];
  }

  private mutate(individual: any, parameterRanges: Record<string, any[]>, mutationRate: number) {
    const mutated = { ...individual };
    
    for (const [param, range] of Object.entries(parameterRanges)) {
      if (Math.random() < mutationRate) {
        mutated[param] = range[Math.floor(Math.random() * range.length)];
      }
    }
    
    return mutated;
  }

  private async detectMarketRegimes(marketData: any[], indicators: string[]) {
    // Simplified regime detection
    const regimes = [];
    
    for (let i = 20; i < marketData.length; i++) {
      const recentData = marketData.slice(i - 20, i);
      const volatility = this.calculateVolatility(recentData);
      const trend = this.calculateTrend(recentData);
      
      let regime = 'normal';
      if (volatility > 0.02) regime = 'high_volatility';
      else if (volatility < 0.005) regime = 'low_volatility';
      
      if (Math.abs(trend) > 0.001) {
        regime += trend > 0 ? '_bullish' : '_bearish';
      }
      
      regimes.push({
        date: marketData[i].timestamp,
        regime,
        volatility,
        trend
      });
    }
    
    return regimes;
  }

  private calculateVolatility(data: any[]): number {
    const returns = [];
    for (let i = 1; i < data.length; i++) {
      returns.push(Math.log(data[i].close / data[i-1].close));
    }
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance * 252); // Annualized
  }

  private calculateTrend(data: any[]): number {
    const firstPrice = data[0].close;
    const lastPrice = data[data.length - 1].close;
    return (lastPrice - firstPrice) / firstPrice;
  }

  private async runRegimeSpecificBacktest(config: BacktestConfig, regimePeriods: any[]): Promise<BacktestResult> {
    // This would run backtests only during specific regime periods
    // Simplified implementation
    return this.runBacktest(config);
  }

  private analyzeRegimeTransitions(regimes: any[], trades: BacktestTrade[]) {
    const transitions = [];
    
    for (let i = 1; i < regimes.length; i++) {
      if (regimes[i].regime !== regimes[i-1].regime) {
        // Find trades around this transition
        const transitionDate = regimes[i].date;
        const nearbyTrades = trades.filter(trade => 
          Math.abs(trade.entryDate.getTime() - transitionDate.getTime()) < 7 * 24 * 60 * 60 * 1000 // 7 days
        );
        
        const avgImpact = nearbyTrades.length > 0 
          ? nearbyTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / nearbyTrades.length
          : 0;
        
        transitions.push({
          from: regimes[i-1].regime,
          to: regimes[i].regime,
          date: transitionDate,
          impact: avgImpact
        });
      }
    }
    
    return transitions;
  }

  private async gridSearchOptimization(config: BacktestConfig, parameterRanges: Record<string, any[]>): Promise<OptimizationResult> {
    let bestResult: OptimizationResult | null = null;
    const parameterKeys = Object.keys(parameterRanges);
    
    // Generate all combinations
    const combinations = this.generateParameterCombinations(parameterRanges);
    
    for (let i = 0; i < combinations.length; i++) {
      console.log(`🔍 Grid search: ${i + 1}/${combinations.length}`);
      
      const backtest = await this.runBacktest({ ...config, parameters: combinations[i] });
      const fitness = this.calculateFitness(backtest);
      
      if (!bestResult || fitness > bestResult.fitness) {
        bestResult = {
          parameters: combinations[i],
          fitness,
          backtest,
          generation: i
        };
      }
    }
    
    return bestResult!;
  }

  private async randomSearchOptimization(config: BacktestConfig, parameterRanges: Record<string, any[]>, iterations: number): Promise<OptimizationResult> {
    let bestResult: OptimizationResult | null = null;
    
    for (let i = 0; i < iterations; i++) {
      console.log(`🎲 Random search: ${i + 1}/${iterations}`);
      
      const randomParams: Record<string, any> = {};
      for (const [param, range] of Object.entries(parameterRanges)) {
        randomParams[param] = range[Math.floor(Math.random() * range.length)];
      }
      
      const backtest = await this.runBacktest({ ...config, parameters: randomParams });
      const fitness = this.calculateFitness(backtest);
      
      if (!bestResult || fitness > bestResult.fitness) {
        bestResult = {
          parameters: randomParams,
          fitness,
          backtest,
          generation: i
        };
      }
    }
    
    return bestResult!;
  }

  private generateParameterCombinations(parameterRanges: Record<string, any[]>): Record<string, any>[] {
    const keys = Object.keys(parameterRanges);
    const combinations: Record<string, any>[] = [];
    
    const generateCombos = (index: number, current: Record<string, any>) => {
      if (index === keys.length) {
        combinations.push({ ...current });
        return;
      }
      
      const key = keys[index];
      for (const value of parameterRanges[key]) {
        current[key] = value;
        generateCombos(index + 1, current);
      }
    };
    
    generateCombos(0, {});
    return combinations;
  }

  private async saveBacktestResult(result: BacktestResult) {
    await supabase
      .from('intelligence_backtests')
      .insert({
        test_name: `${result.config.strategy}_${Date.now()}`,
        symbol: result.config.symbol,
        timeframe: result.config.timeframe,
        start_date: result.config.startDate.toISOString().split('T')[0],
        end_date: result.config.endDate.toISOString().split('T')[0],
        intelligence_config: result.config.parameters,
        total_trades: result.performance.totalTrades,
        winning_trades: Math.round(result.performance.totalTrades * result.performance.winRate),
        total_return: result.performance.totalReturn,
        max_drawdown: result.performance.maxDrawdown,
        sharpe_ratio: result.performance.sharpeRatio,
        win_rate: result.performance.winRate,
        detailed_results: JSON.parse(JSON.stringify({
          trades: result.trades.slice(0, 100), // Limit for database
          monthly_returns: result.monthlyReturns,
          statistics: result.statistics
        }))
      });
  }

  private async saveWalkForwardResults(results: WalkForwardResult[]) {
    for (const result of results) {
      await supabase
        .from('intelligence_backtests')
        .insert({
          test_name: `walk_forward_${Date.now()}`,
          symbol: 'EUR/USD',
          timeframe: '15m',
          start_date: result.period.start.toISOString().split('T')[0],
          end_date: result.period.end.toISOString().split('T')[0],
          intelligence_config: result.optimization.parameters,
          total_trades: result.outOfSample.performance.totalTrades,
          winning_trades: Math.round(result.outOfSample.performance.totalTrades * result.outOfSample.performance.winRate),
          total_return: result.outOfSample.performance.totalReturn,
          max_drawdown: result.outOfSample.performance.maxDrawdown,
          sharpe_ratio: result.outOfSample.performance.sharpeRatio,
          win_rate: result.outOfSample.performance.winRate,
          detailed_results: JSON.parse(JSON.stringify({
            walk_forward: true,
            degradation: result.degradation,
            summary: 'Walk-forward analysis result'
          }))
        });
    }
  }
}

export { AdvancedBacktestEngine, type BacktestConfig, type BacktestResult, type OptimizationResult, type WalkForwardResult };