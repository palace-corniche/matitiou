import { supabase } from '@/integrations/supabase/client';

export interface TechnicalIndicators {
  rsi: number;
  macd: { macd: number; signal: number; histogram: number };
  sma20: number;
  sma50: number;
  ema20: number;
  bollinger: { upper: number; middle: number; lower: number };
  stochastic: { k: number; d: number };
  supportResistance: { support: number[]; resistance: number[] };
}

export interface TechnicalSignal {
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
  indicators: TechnicalIndicators;
  trendContext: string;
  volatilityRegime: string;
}

export class TechnicalAnalysisAdapter {
  private moduleId = 'technical_analysis';
  private moduleVersion = '1.0.0';

  async analyze(symbol: string = 'EUR/USD', timeframe: string = '15m'): Promise<TechnicalSignal | null> {
    try {
      // Get recent market data
      const { data: marketData, error } = await supabase
        .from('market_data_enhanced')
        .select('*')
        .eq('symbol', symbol)
        .eq('timeframe', timeframe)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error || !marketData || marketData.length < 20) {
        console.log('Insufficient market data for technical analysis');
        return null;
      }

      // Calculate technical indicators
      const indicators = this.calculateIndicators(marketData);
      
      // Determine signal based on indicators
      const signal = this.generateSignal(marketData[0], indicators, symbol, timeframe);
      
      if (signal) {
        // Write to modular_signals table
        await this.saveSignal(signal);
        return signal;
      }

      return null;
    } catch (error) {
      console.error('Technical analysis error:', error);
      return null;
    }
  }

  private calculateIndicators(data: any[]): TechnicalIndicators {
    const closes = data.map(d => d.close_price).reverse();
    const highs = data.map(d => d.high_price).reverse();
    const lows = data.map(d => d.low_price).reverse();

    // RSI calculation (simplified)
    const rsi = this.calculateRSI(closes, 14);
    
    // MACD calculation
    const macd = this.calculateMACD(closes);
    
    // Moving averages
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const ema20 = this.calculateEMA(closes, 20);
    
    // Bollinger Bands
    const bollinger = this.calculateBollingerBands(closes, 20, 2);
    
    // Stochastic
    const stochastic = this.calculateStochastic(highs, lows, closes, 14);
    
    // Support/Resistance
    const supportResistance = this.findSupportResistance(highs, lows);

    return {
      rsi,
      macd,
      sma20,
      sma50,
      ema20,
      bollinger,
      stochastic,
      supportResistance
    };
  }

  private generateSignal(currentBar: any, indicators: TechnicalIndicators, symbol: string, timeframe: string): TechnicalSignal | null {
    let signalType: 'buy' | 'sell' | null = null;
    let confidence = 0;
    let strength = 5;

    // ===== CRITICAL TREND FILTER =====
    // Determine overall trend using 50/200 SMA
    const isTrendingUp = indicators.sma20 > indicators.sma50;
    const isTrendingDown = indicators.sma20 < indicators.sma50;
    const trendStrength = Math.abs(indicators.sma20 - indicators.sma50) / indicators.sma50;
    
    // ONLY allow signals that align with trend direction
    // In downtrend: ONLY sell signals allowed
    // In uptrend: ONLY buy signals allowed
    
    // RSI signals (WITH TREND FILTER)
    if (indicators.rsi < 30 && isTrendingUp) {
      signalType = 'buy';
      confidence += 0.25; // Increased confidence when trend-aligned
      strength += 2;
    } else if (indicators.rsi > 70 && isTrendingDown) {
      signalType = 'sell';
      confidence += 0.25; // Increased confidence when trend-aligned
      strength += 2;
    }

    // MACD signals (WITH TREND FILTER)
    if (indicators.macd.macd > indicators.macd.signal && indicators.macd.histogram > 0 && isTrendingUp) {
      if (signalType === 'buy' || signalType === null) {
        signalType = 'buy';
        confidence += 0.2;
        strength += 2;
      }
    } else if (indicators.macd.macd < indicators.macd.signal && indicators.macd.histogram < 0 && isTrendingDown) {
      if (signalType === 'sell' || signalType === null) {
        signalType = 'sell';
        confidence += 0.2;
        strength += 2;
      }
    }

    // Moving average trend confirmation (STRENGTHENED)
    if (currentBar.close_price > indicators.sma20 && indicators.sma20 > indicators.sma50 && isTrendingUp) {
      if (signalType === 'buy' || signalType === null) {
        signalType = 'buy';
        confidence += 0.15;
        strength += 1;
      }
    } else if (currentBar.close_price < indicators.sma20 && indicators.sma20 < indicators.sma50 && isTrendingDown) {
      if (signalType === 'sell' || signalType === null) {
        signalType = 'sell';
        confidence += 0.15;
        strength += 1;
      }
    }

    // Bollinger Bands (WITH TREND FILTER)
    if (currentBar.close_price < indicators.bollinger.lower && isTrendingUp) {
      if (signalType === 'buy' || signalType === null) {
        signalType = 'buy';
        confidence += 0.15;
        strength += 1;
      }
    } else if (currentBar.close_price > indicators.bollinger.upper && isTrendingDown) {
      if (signalType === 'sell' || signalType === null) {
        signalType = 'sell';
        confidence += 0.15;
        strength += 1;
      }
    }

    // CRITICAL: Reject counter-trend signals
    if (signalType === 'buy' && isTrendingDown) {
      console.log('❌ REJECTED: Buy signal in downtrend');
      return null;
    }
    if (signalType === 'sell' && isTrendingUp) {
      console.log('❌ REJECTED: Sell signal in uptrend');
      return null;
    }

    // Minimum confidence threshold
    if (!signalType || confidence < 0.4) {
      return null;
    }

    // Calculate entry and exit levels
    const currentPrice = currentBar.close_price;
    const atr = this.calculateATR([currentBar], 14);
    
    const suggestedEntry = signalType === 'buy' ? currentPrice + (atr * 0.2) : currentPrice - (atr * 0.2);
    const suggestedStopLoss = signalType === 'buy' ? currentPrice - (atr * 1.5) : currentPrice + (atr * 1.5);
    const suggestedTakeProfit = signalType === 'buy' ? currentPrice + (atr * 2.5) : currentPrice - (atr * 2.5);

    return {
      moduleId: this.moduleId,
      symbol,
      timeframe,
      signalType,
      confidence: Math.min(confidence, 1.0),
      strength: Math.min(strength, 10),
      weight: 1.0,
      triggerPrice: currentPrice,
      suggestedEntry,
      suggestedStopLoss,
      suggestedTakeProfit,
      indicators,
      trendContext: this.determineTrend(indicators),
      volatilityRegime: this.determineVolatility(currentBar, atr)
    };
  }

  private async saveSignal(signal: TechnicalSignal): Promise<void> {
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
        trend_context: signal.trendContext,
        volatility_regime: signal.volatilityRegime,
        market_data_snapshot: {
          timestamp: new Date().toISOString(),
          price: signal.triggerPrice,
          indicators: signal.indicators
        },
        calculation_parameters: {
          rsi_period: 14,
          macd_fast: 12,
          macd_slow: 26,
          macd_signal: 9,
          sma_periods: [20, 50],
          bollinger_period: 20,
          bollinger_deviation: 2
        },
        intermediate_values: signal.indicators
      });

    if (error) {
      console.error('Error saving technical signal:', error);
    }
  }

  // Technical indicator calculation methods
  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    
    // Simplified signal line (normally EMA of MACD)
    const signal = macd * 0.9;
    const histogram = macd - signal;
    
    return { macd, signal, histogram };
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const slice = prices.slice(-period);
    return slice.reduce((sum, price) => sum + price, 0) / period;
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < Math.min(prices.length, period + 10); i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  private calculateBollingerBands(prices: number[], period: number, deviation: number): { upper: number; middle: number; lower: number } {
    const sma = this.calculateSMA(prices, period);
    
    if (prices.length < period) {
      return { upper: sma, middle: sma, lower: sma };
    }
    
    const slice = prices.slice(-period);
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    return {
      upper: sma + (stdDev * deviation),
      middle: sma,
      lower: sma - (stdDev * deviation)
    };
  }

  private calculateStochastic(highs: number[], lows: number[], closes: number[], period: number): { k: number; d: number } {
    if (highs.length < period) return { k: 50, d: 50 };
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const currentClose = closes[closes.length - 1];
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    const d = k * 0.9; // Simplified D line
    
    return { k, d };
  }

  private findSupportResistance(highs: number[], lows: number[]): { support: number[]; resistance: number[] } {
    // Simplified support/resistance finder
    const support = [Math.min(...lows.slice(-20))];
    const resistance = [Math.max(...highs.slice(-20))];
    
    return { support, resistance };
  }

  private calculateATR(data: any[], period: number): number {
    if (data.length === 0) return 0.001;
    
    // Simplified ATR calculation
    const currentBar = data[0];
    return (currentBar.high_price - currentBar.low_price) || 0.001;
  }

  private determineTrend(indicators: TechnicalIndicators): string {
    if (indicators.sma20 > indicators.sma50 && indicators.macd.macd > 0) {
      return 'uptrend';
    } else if (indicators.sma20 < indicators.sma50 && indicators.macd.macd < 0) {
      return 'downtrend';
    }
    return 'sideways';
  }

  private determineVolatility(currentBar: any, atr: number): string {
    const spread = currentBar.high_price - currentBar.low_price;
    if (spread > atr * 1.5) return 'high';
    if (spread < atr * 0.5) return 'low';
    return 'normal';
  }
}