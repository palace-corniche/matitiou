import { supabase } from '@/integrations/supabase/client';
import { Decimal } from 'decimal.js';

export interface CalibrationParameters {
  module_id: string;
  timeframe: string;
  symbol: string;
  parameters: {
    rsi_overbought: number;
    rsi_oversold: number;
    macd_signal_threshold: number;
    bb_deviation: number;
    volume_threshold: number;
    support_resistance_strength: number;
    pattern_confidence_min: number;
    trend_strength_min: number;
  };
  performance_metrics: {
    win_rate: number;
    profit_factor: number;
    sharpe_ratio: number;
    max_drawdown: number;
    average_return: number;
    total_trades: number;
  };
  calibration_period: {
    start_date: string;
    end_date: string;
    total_ticks: number;
  };
  created_at: string;
  version: string;
}

export interface BacktestResult {
  module_id: string;
  timeframe: string;
  parameters: any;
  signals_generated: number;
  signals_profitable: number;
  total_pnl: number;
  win_rate: number;
  profit_factor: number;
  max_drawdown: number;
  sharpe_ratio: number;
  execution_time_ms: number;
}

class CalibrationEngine {
  private readonly timeframes = ['M1', 'M5', 'M15', 'H1', 'H4', 'D1'];
  private readonly modules = [
    'technical_analysis',
    'fundamental_analysis', 
    'sentiment_analysis',
    'quantitative_analysis',
    'intermarket_analysis',
    'specialized_analysis'
  ];

  async runCalibration(
    module_id: string, 
    timeframe: string = 'M15',
    startDate: string = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: string = new Date().toISOString()
  ): Promise<CalibrationParameters> {
    console.log(`🔧 Starting calibration for ${module_id} on ${timeframe}...`);
    
    // Fetch historical tick data for backtesting
    const historicalTicks = await this.fetchHistoricalTicks(startDate, endDate);
    console.log(`📊 Loaded ${historicalTicks.length} historical ticks`);

    // Generate parameter combinations to test
    const parameterSets = this.generateParameterCombinations(module_id);
    console.log(`🧪 Testing ${parameterSets.length} parameter combinations`);

    let bestParameters: any = null;
    let bestPerformance = { sharpe_ratio: -999, profit_factor: 0 };

    // Backtest each parameter combination
    for (let i = 0; i < parameterSets.length; i++) {
      const params = parameterSets[i];
      console.log(`⚡ Testing combination ${i + 1}/${parameterSets.length}`);

      const result = await this.backtestParameters(
        module_id,
        timeframe,
        params,
        historicalTicks
      );

      // Check if this is the best performing combination
      if (this.isBetterPerformance(result, bestPerformance)) {
        bestPerformance = {
          sharpe_ratio: result.sharpe_ratio,
          profit_factor: result.profit_factor
        };
        bestParameters = {
          parameters: params,
          performance: result
        };
      }
    }

    // Create calibration result
    const calibration: CalibrationParameters = {
      module_id,
      timeframe,
      symbol: 'EURUSD',
      parameters: bestParameters.parameters,
      performance_metrics: {
        win_rate: bestParameters.performance.win_rate,
        profit_factor: bestParameters.performance.profit_factor,
        sharpe_ratio: bestParameters.performance.sharpe_ratio,
        max_drawdown: bestParameters.performance.max_drawdown,
        average_return: bestParameters.performance.total_pnl / bestParameters.performance.signals_generated,
        total_trades: bestParameters.performance.signals_generated
      },
      calibration_period: {
        start_date: startDate,
        end_date: endDate,
        total_ticks: historicalTicks.length
      },
      created_at: new Date().toISOString(),
      version: '1.0.0'
    };

    // Save calibration results
    await this.saveCalibrationResults(calibration);
    
    // Log calibration in audit trail
    await this.logCalibrationAudit(calibration);

    console.log(`✅ Calibration complete for ${module_id}. Best Sharpe: ${bestParameters.performance.sharpe_ratio.toFixed(3)}`);
    
    return calibration;
  }

  private async fetchHistoricalTicks(startDate: string, endDate: string) {
    try {
      const { data, error } = await supabase
        .from('tick_data')
        .select('*')
        .eq('symbol', 'EUR/USD')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: true })
        .limit(10000); // Limit for performance

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching historical ticks:', error);
      return [];
    }
  }

  private generateParameterCombinations(module_id: string): any[] {
    switch (module_id) {
      case 'technical_analysis':
        return [
          { rsi_overbought: 70, rsi_oversold: 30, macd_signal_threshold: 0.0001, bb_deviation: 2.0 },
          { rsi_overbought: 75, rsi_oversold: 25, macd_signal_threshold: 0.0002, bb_deviation: 2.2 },
          { rsi_overbought: 80, rsi_oversold: 20, macd_signal_threshold: 0.0003, bb_deviation: 2.5 },
          { rsi_overbought: 65, rsi_oversold: 35, macd_signal_threshold: 0.00005, bb_deviation: 1.8 },
          { rsi_overbought: 85, rsi_oversold: 15, macd_signal_threshold: 0.0004, bb_deviation: 3.0 }
        ];
      case 'fundamental_analysis':
        return [
          { news_impact_threshold: 0.7, event_importance_min: 'medium', sentiment_weight: 0.6 },
          { news_impact_threshold: 0.8, event_importance_min: 'high', sentiment_weight: 0.7 },
          { news_impact_threshold: 0.6, event_importance_min: 'low', sentiment_weight: 0.5 },
          { news_impact_threshold: 0.9, event_importance_min: 'high', sentiment_weight: 0.8 }
        ];
      case 'sentiment_analysis':
        return [
          { retail_positioning_threshold: 60, cot_threshold: 0.7, fear_greed_weight: 0.5 },
          { retail_positioning_threshold: 70, cot_threshold: 0.8, fear_greed_weight: 0.6 },
          { retail_positioning_threshold: 50, cot_threshold: 0.6, fear_greed_weight: 0.4 },
          { retail_positioning_threshold: 80, cot_threshold: 0.9, fear_greed_weight: 0.7 }
        ];
      default:
        return [
          { confidence_threshold: 0.7, strength_min: 6, weight_factor: 1.0 },
          { confidence_threshold: 0.8, strength_min: 7, weight_factor: 1.2 },
          { confidence_threshold: 0.6, strength_min: 5, weight_factor: 0.8 }
        ];
    }
  }

  private async backtestParameters(
    module_id: string,
    timeframe: string,
    parameters: any,
    historicalTicks: any[]
  ): Promise<BacktestResult> {
    const startTime = Date.now();
    let signals_generated = 0;
    let signals_profitable = 0;
    let total_pnl = new Decimal(0);
    let trades: Array<{ entry: number, exit: number, pnl: number }> = [];

    // Simulate signal generation and trading
    for (let i = 100; i < historicalTicks.length - 100; i += 50) { // Skip every 50 ticks for performance
      const tick = historicalTicks[i];
      const futurePrice = historicalTicks[i + 50]?.bid || tick.bid;
      
      // Generate signal based on parameters and module logic
      const signal = this.generateSignalWithParameters(module_id, parameters, tick, historicalTicks.slice(i-100, i));
      
      if (signal) {
        signals_generated++;
        
        // Simulate trade execution
        const trade = this.simulateTrade(signal, tick.bid, futurePrice);
        trades.push(trade);
        
        total_pnl = total_pnl.plus(trade.pnl);
        
        if (trade.pnl > 0) {
          signals_profitable++;
        }
      }
    }

    const win_rate = signals_generated > 0 ? signals_profitable / signals_generated : 0;
    const profit_factor = this.calculateProfitFactor(trades);
    const max_drawdown = this.calculateMaxDrawdown(trades);
    const sharpe_ratio = this.calculateSharpeRatio(trades);

    return {
      module_id,
      timeframe,
      parameters,
      signals_generated,
      signals_profitable,
      total_pnl: total_pnl.toNumber(),
      win_rate,
      profit_factor,
      max_drawdown,
      sharpe_ratio,
      execution_time_ms: Date.now() - startTime
    };
  }

  private generateSignalWithParameters(module_id: string, parameters: any, currentTick: any, historicalData: any[]): any {
    // Simplified signal generation based on parameters
    const rsi = this.calculateRSI(historicalData.slice(-14));
    const price = currentTick.bid;
    
    switch (module_id) {
      case 'technical_analysis':
        if (rsi < parameters.rsi_oversold && Math.random() > 0.7) {
          return { type: 'buy', confidence: 0.8, entry: price };
        }
        if (rsi > parameters.rsi_overbought && Math.random() > 0.7) {
          return { type: 'sell', confidence: 0.8, entry: price };
        }
        break;
      default:
        if (Math.random() > 0.85) { // 15% signal generation rate
          return { 
            type: Math.random() > 0.5 ? 'buy' : 'sell', 
            confidence: 0.6 + Math.random() * 0.3,
            entry: price 
          };
        }
    }
    
    return null;
  }

  private calculateRSI(prices: any[]): number {
    if (prices.length < 14) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i].bid - prices[i-1].bid;
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / 13;
    const avgLoss = losses / 13;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private simulateTrade(signal: any, entryPrice: number, exitPrice: number): { entry: number, exit: number, pnl: number } {
    const pips = signal.type === 'buy' 
      ? (exitPrice - entryPrice) / 0.0001
      : (entryPrice - exitPrice) / 0.0001;
    
    const pnl = pips * 1; // $1 per pip for 0.1 lot
    
    return {
      entry: entryPrice,
      exit: exitPrice,
      pnl: pnl
    };
  }

  private calculateProfitFactor(trades: Array<{ pnl: number }>): number {
    const profits = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const losses = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    
    return losses > 0 ? profits / losses : profits > 0 ? profits : 0;
  }

  private calculateMaxDrawdown(trades: Array<{ pnl: number }>): number {
    let peak = 0;
    let maxDrawdown = 0;
    let runningPnL = 0;
    
    for (const trade of trades) {
      runningPnL += trade.pnl;
      if (runningPnL > peak) {
        peak = runningPnL;
      }
      const drawdown = peak - runningPnL;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown;
  }

  private calculateSharpeRatio(trades: Array<{ pnl: number }>): number {
    if (trades.length === 0) return 0;
    
    const returns = trades.map(t => t.pnl);
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? mean / stdDev : 0;
  }

  private isBetterPerformance(current: BacktestResult, best: { sharpe_ratio: number, profit_factor: number }): boolean {
    // Prioritize Sharpe ratio, then profit factor
    if (current.sharpe_ratio > best.sharpe_ratio) return true;
    if (current.sharpe_ratio === best.sharpe_ratio && current.profit_factor > best.profit_factor) return true;
    return false;
  }

  private async saveCalibrationResults(calibration: CalibrationParameters): Promise<void> {
    try {
      // Mock implementation - will be replaced when database types are updated
      console.log(`💾 Mock: Calibration results would be saved for ${calibration.module_id}`);
      console.log('Parameters:', calibration.parameters);
      console.log('Performance:', calibration.performance_metrics);
    } catch (error) {
      console.error('Error saving calibration results:', error);
    }
  }

  private async logCalibrationAudit(calibration: CalibrationParameters): Promise<void> {
    try {
      // Mock implementation - will be replaced when database types are updated  
      console.log(`📝 Mock: Calibration audit would be logged for ${calibration.module_id}`);
      console.log('Audit data:', {
        module_id: calibration.module_id,
        timeframe: calibration.timeframe,
        best_sharpe_ratio: calibration.performance_metrics.sharpe_ratio,
        best_win_rate: calibration.performance_metrics.win_rate
      });
    } catch (error) {
      console.error('Error logging calibration audit:', error);
    }
  }

  async calibrateAllModules(): Promise<CalibrationParameters[]> {
    console.log('🚀 Starting full system calibration...');
    const results: CalibrationParameters[] = [];

    for (const module of this.modules) {
      for (const timeframe of ['M15', 'H1', 'H4']) { // Focus on key timeframes
        try {
          const calibration = await this.runCalibration(module, timeframe);
          results.push(calibration);
          
          // Small delay between calibrations
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Calibration failed for ${module} ${timeframe}:`, error);
        }
      }
    }

    console.log(`✅ Full system calibration complete. ${results.length} modules calibrated.`);
    return results;
  }

  async getLatestCalibration(module_id: string, timeframe: string): Promise<CalibrationParameters | null> {
    try {
      // Mock implementation - return sample calibration data
      const mockCalibration: CalibrationParameters = {
        module_id,
        timeframe,
        symbol: 'EURUSD',
        parameters: {
          rsi_overbought: 75,
          rsi_oversold: 25,
          macd_signal_threshold: 0.0002,
          bb_deviation: 2.2,
          volume_threshold: 1000,
          support_resistance_strength: 0.8,
          pattern_confidence_min: 0.7,
          trend_strength_min: 0.6
        },
        performance_metrics: {
          win_rate: 0.68,
          profit_factor: 1.45,
          sharpe_ratio: 1.23,
          max_drawdown: 0.08,
          average_return: 0.015,
          total_trades: 150
        },
        calibration_period: {
          start_date: '2024-01-01T00:00:00Z',
          end_date: '2024-12-01T00:00:00Z',
          total_ticks: 8500
        },
        created_at: new Date().toISOString(),
        version: '1.0.0'
      };
      
      return mockCalibration;
    } catch (error) {
      console.error('Error fetching latest calibration:', error);
      return null;
    }
  }
}

export const calibrationEngine = new CalibrationEngine();