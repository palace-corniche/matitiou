import { supabase } from '@/integrations/supabase/client';

export interface QuantData {
  backtestResults: {
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    totalTrades: number;
  };
  correlationMatrix: {
    [key: string]: number;
  };
  volatilityMetrics: {
    historicalVol: number;
    impliedVol: number;
    volPercentile: number;
    volRegime: string;
  };
  riskMetrics: {
    var95: number; // Value at Risk
    expectedShortfall: number;
    betaToMarket: number;
  };
}

export interface QuantitativeSignal {
  moduleId: string;
  symbol: string;
  timeframe: string;
  signalType: 'buy' | 'sell';
  confidence: number;
  strength: number;
  weight: number;
  triggerPrice: number;
  suggestedEntry: number;
  suggestedStopLoss: number;
  suggestedTakeProfit: number;
  quantData: QuantData;
  modelAccuracy: number;
  backtestScore: number;
  riskAdjustedReturn: number;
}

export class QuantitativeAnalysisAdapter {
  private moduleId = 'quantitative_analysis';
  private moduleVersion = '1.0.0';

  async analyze(symbol: string = 'EUR/USD', timeframe: string = '15m'): Promise<QuantitativeSignal | null> {
    try {
      // Get historical market data for quantitative analysis
      const { data: marketData } = await supabase
        .from('market_data_enhanced')
        .select('*')
        .eq('symbol', symbol)
        .eq('timeframe', timeframe)
        .order('timestamp', { ascending: false })
        .limit(200); // Need more data for quant analysis

      if (!marketData || marketData.length < 100) {
        console.log('Insufficient data for quantitative analysis');
        return null;
      }

      // Perform quantitative analysis
      const quantData = await this.performQuantAnalysis(marketData, symbol);
      
      // Generate signal based on quant models
      const analysis = this.generateQuantSignal(marketData, quantData);
      
      if (analysis.confidence > 0.6) {
        const signal = this.createSignal(marketData[0], analysis, quantData, symbol, timeframe);
        if (signal) {
          await this.saveSignal(signal);
          return signal;
        }
      }

      return null;
    } catch (error) {
      console.error('Quantitative analysis error:', error);
      return null;
    }
  }

  private async performQuantAnalysis(data: any[], symbol: string): Promise<QuantData> {
    const prices = data.map(d => d.close_price).reverse();
    const returns = this.calculateReturns(prices);
    
    // Backtest simulation
    const backtestResults = this.simulateBacktest(data.slice().reverse());
    
    // Correlation analysis
    const correlationMatrix = await this.calculateCorrelations(symbol);
    
    // Volatility analysis
    const volatilityMetrics = this.calculateVolatilityMetrics(returns, prices);
    
    // Risk metrics
    const riskMetrics = this.calculateRiskMetrics(returns);

    return {
      backtestResults,
      correlationMatrix,
      volatilityMetrics,
      riskMetrics
    };
  }

  private calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  }

  private simulateBacktest(data: any[]): QuantData['backtestResults'] {
    let wins = 0;
    let losses = 0;
    let totalProfit = 0;
    let totalLoss = 0;
    let totalTrades = 0;
    let equityCurve: number[] = [10000];
    let peak = 10000;
    let maxDrawdown = 0;

    // Simple momentum strategy simulation
    for (let i = 20; i < Math.min(data.length - 10, 100); i++) {
      const sma20 = this.calculateSMA(data.slice(i - 20, i).map(d => d.close_price), 20);
      const currentPrice = data[i].close_price;
      const futurePrice = data[i + 5]?.close_price || currentPrice;
      
      if (currentPrice > sma20) {
        // Long signal
        const returnPct = (futurePrice - currentPrice) / currentPrice;
        const tradeResult = returnPct * 10000; // Position size
        
        if (tradeResult > 0) {
          wins++;
          totalProfit += tradeResult;
        } else {
          losses++;
          totalLoss += Math.abs(tradeResult);
        }
        
        totalTrades++;
        const newEquity = equityCurve[equityCurve.length - 1] + tradeResult;
        equityCurve.push(newEquity);
        
        if (newEquity > peak) peak = newEquity;
        const drawdown = (peak - newEquity) / peak;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      }
    }

    const winRate = totalTrades > 0 ? wins / totalTrades : 0;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;
    const returns = equityCurve.slice(1).map((eq, i) => (eq - equityCurve[i]) / equityCurve[i]);
    const sharpeRatio = this.calculateSharpe(returns);

    return {
      winRate,
      profitFactor,
      sharpeRatio,
      maxDrawdown,
      totalTrades
    };
  }

  private async calculateCorrelations(symbol: string): Promise<{ [key: string]: number }> {
    // In a real implementation, this would calculate correlations with other instruments
    // For now, simulate some correlations
    const correlations: { [key: string]: number } = {
      'USD_INDEX': -0.85,
      'GOLD': 0.45,
      'OIL': 0.25,
      'SPY': 0.35,
      'BONDS': -0.65
    };

    return correlations;
  }

  private calculateVolatilityMetrics(returns: number[], prices: number[]): QuantData['volatilityMetrics'] {
    const historicalVol = this.calculateVolatility(returns) * Math.sqrt(252); // Annualized
    const impliedVol = historicalVol * (1 + (Math.random() - 0.5) * 0.2); // Simulate IV
    
    // Calculate volatility percentile
    const volHistory = returns.slice(-60).map((_, i) => 
      this.calculateVolatility(returns.slice(i, i + 20))
    );
    volHistory.sort((a, b) => a - b);
    const currentVolRank = volHistory.indexOf(this.calculateVolatility(returns.slice(-20)));
    const volPercentile = currentVolRank / volHistory.length * 100;
    
    let volRegime = 'normal';
    if (volPercentile > 80) volRegime = 'high';
    else if (volPercentile < 20) volRegime = 'low';

    return {
      historicalVol,
      impliedVol,
      volPercentile,
      volRegime
    };
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    return Math.sqrt(variance);
  }

  private calculateRiskMetrics(returns: number[]): QuantData['riskMetrics'] {
    if (returns.length < 10) {
      return { var95: 0, expectedShortfall: 0, betaToMarket: 0 };
    }

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const var95Index = Math.floor(returns.length * 0.05);
    const var95 = sortedReturns[var95Index];
    
    const tailReturns = sortedReturns.slice(0, var95Index);
    const expectedShortfall = tailReturns.length > 0 
      ? tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length
      : var95;
    
    // Simulate beta to market (would be calculated against market index)
    const betaToMarket = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2

    return {
      var95,
      expectedShortfall,
      betaToMarket
    };
  }

  private calculateSharpe(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const volatility = this.calculateVolatility(returns);
    
    return volatility > 0 ? meanReturn / volatility : 0;
  }

  private generateQuantSignal(data: any[], quantData: QuantData): {
    signalType: 'buy' | 'sell' | null;
    confidence: number;
    modelAccuracy: number;
    backtestScore: number;
    riskAdjustedReturn: number;
  } {
    let signalScore = 0;
    
    // Backtest performance scoring
    const backtestScore = this.scoreBacktest(quantData.backtestResults);
    signalScore += backtestScore * 0.4;
    
    // Volatility regime analysis
    if (quantData.volatilityMetrics.volRegime === 'low') {
      signalScore += 0.2; // Low vol = good entry conditions
    } else if (quantData.volatilityMetrics.volRegime === 'high') {
      signalScore -= 0.1; // High vol = risky
    }
    
    // Risk-adjusted metrics
    if (quantData.backtestResults.sharpeRatio > 1.0) {
      signalScore += 0.3;
    }
    
    if (quantData.backtestResults.maxDrawdown < 0.1) {
      signalScore += 0.2;
    }
    
    // Model confidence based on backtest stability
    const modelAccuracy = Math.min(quantData.backtestResults.winRate * 1.5, 1.0);
    
    // Current market momentum
    const recentPrices = data.slice(0, 10).map(d => d.close_price);
    const momentum = this.calculateMomentum(recentPrices);
    
    let signalType: 'buy' | 'sell' | null = null;
    if (momentum > 0.002 && signalScore > 0.5) {
      signalType = 'buy';
    } else if (momentum < -0.002 && signalScore > 0.5) {
      signalType = 'sell';
    }
    
    const confidence = Math.min(signalScore, 1.0);
    const riskAdjustedReturn = quantData.backtestResults.sharpeRatio * quantData.backtestResults.profitFactor;

    return {
      signalType,
      confidence,
      modelAccuracy,
      backtestScore,
      riskAdjustedReturn
    };
  }

  private scoreBacktest(results: QuantData['backtestResults']): number {
    let score = 0;
    
    // Win rate component
    score += Math.min(results.winRate, 0.8) * 0.3; // Cap at 80% to avoid overfitting
    
    // Profit factor component
    score += Math.min(results.profitFactor / 2, 0.5); // Normalize profit factor
    
    // Sharpe ratio component
    score += Math.min(results.sharpeRatio / 2, 0.3);
    
    // Drawdown penalty
    score -= results.maxDrawdown * 0.5;
    
    // Trade count requirement
    if (results.totalTrades < 10) {
      score *= 0.5; // Penalize insufficient sample size
    }
    
    return Math.max(0, Math.min(score, 1));
  }

  private calculateMomentum(prices: number[]): number {
    if (prices.length < 3) return 0;
    
    const recent = prices.slice(0, 3);
    const older = prices.slice(-3);
    
    const recentAvg = recent.reduce((sum, p) => sum + p, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p, 0) / older.length;
    
    return (recentAvg - olderAvg) / olderAvg;
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    return prices.slice(-period).reduce((sum, p) => sum + p, 0) / period;
  }

  private createSignal(
    currentBar: any,
    analysis: any,
    quantData: QuantData,
    symbol: string,
    timeframe: string
  ): QuantitativeSignal | null {
    if (!analysis.signalType) return null;

    const currentPrice = currentBar.close_price;
    const vol = quantData.volatilityMetrics.historicalVol;
    
    // Risk-based position sizing
    const riskBuffer = currentPrice * vol / Math.sqrt(252); // Daily vol
    const confidenceMultiplier = analysis.confidence;
    
    const suggestedEntry = analysis.signalType === 'buy'
      ? currentPrice + (riskBuffer * 0.5)
      : currentPrice - (riskBuffer * 0.5);
      
    // Tighter stops for quant signals due to higher precision
    const suggestedStopLoss = analysis.signalType === 'buy'
      ? currentPrice - (riskBuffer * 1.5 * confidenceMultiplier)
      : currentPrice + (riskBuffer * 1.5 * confidenceMultiplier);
      
    const suggestedTakeProfit = analysis.signalType === 'buy'
      ? currentPrice + (riskBuffer * 3 * confidenceMultiplier)
      : currentPrice - (riskBuffer * 3 * confidenceMultiplier);

    return {
      moduleId: this.moduleId,
      symbol,
      timeframe,
      signalType: analysis.signalType,
      confidence: analysis.confidence,
      strength: Math.round(analysis.confidence * 10),
      weight: 1.1, // Quant analysis gets slightly higher weight for precision
      triggerPrice: currentPrice,
      suggestedEntry,
      suggestedStopLoss,
      suggestedTakeProfit,
      quantData,
      modelAccuracy: analysis.modelAccuracy,
      backtestScore: analysis.backtestScore,
      riskAdjustedReturn: analysis.riskAdjustedReturn
    };
  }

  private async saveSignal(signal: QuantitativeSignal): Promise<void> {
    const analysisId = crypto.randomUUID();
    
    const { error } = await (supabase as any)
      .from('modular_signals')
      .insert({
        analysis_id: analysisId,
        module_id: signal.moduleId,
        symbol: signal.symbol,
        timeframe: signal.timeframe,
        signal_type: signal.signalType,
        confidence: signal.confidence,
        strength: signal.strength,
        weight: signal.weight,
        trigger_price: signal.triggerPrice,
        suggested_entry: signal.suggestedEntry,
        suggested_stop_loss: signal.suggestedStopLoss,
        suggested_take_profit: signal.suggestedTakeProfit,
        trend_context: signal.quantData.volatilityMetrics.volRegime,
        volatility_regime: signal.quantData.volatilityMetrics.volRegime,
        market_data_snapshot: {
          timestamp: new Date().toISOString(),
          price: signal.triggerPrice,
          quant_metrics: signal.quantData
        },
        calculation_parameters: {
          backtest_period: 100,
          volatility_lookback: 20,
          model_accuracy: signal.modelAccuracy,
          risk_adjusted_return: signal.riskAdjustedReturn
        },
        intermediate_values: {
          quant_data: signal.quantData,
          backtest_score: signal.backtestScore,
          model_metrics: {
            accuracy: signal.modelAccuracy,
            risk_adjusted_return: signal.riskAdjustedReturn
          }
        }
      });

    if (error) {
      console.error('Error saving quantitative signal:', error);
    }
  }
}