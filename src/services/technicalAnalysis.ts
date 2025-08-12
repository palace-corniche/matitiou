import { 
  SMA, EMA, WMA, MACD, RSI, BollingerBands, 
  StochasticOscillator, CCI, ROC, 
  ATR, OBV, ADX
} from 'trading-signals';

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorResult {
  name: string;
  value: number | null;
  signal: 'buy' | 'sell' | 'neutral';
  strength: number; // 1-10
}

export interface TechnicalAnalysisResult {
  indicators: IndicatorResult[];
  overallSignal: 'buy' | 'sell' | 'neutral';
  overallStrength: number;
}

// Trend Indicators
export class TrendIndicators {
  static calculateSMA(data: number[], period: number = 20): number[] {
    const sma = new SMA(period);
    return data.map(price => {
      sma.update(price);
      const result = sma.getResult();
      return result ? Number(result) : 0;
    });
  }

  static calculateEMA(data: number[], period: number = 20): number[] {
    const ema = new EMA(period);
    return data.map(price => {
      ema.update(price);
      const result = ema.getResult();
      return result ? Number(result) : 0;
    });
  }

  static calculateMACD(data: number[]): Array<{macd: number, signal: number, histogram: number}> {
    const macd = new MACD({ fast: 12, slow: 26, signal: 9 });
    return data.map(price => {
      macd.update(price);
      const result = macd.getResult();
      return {
        macd: result.macd || 0,
        signal: result.signal || 0,
        histogram: result.histogram || 0
      };
    });
  }

  static calculateADX(candles: CandleData[], period: number = 14): number[] {
    const adx = new ADX(period);
    return candles.map(candle => {
      adx.update({ high: candle.high, low: candle.low, close: candle.close });
      return adx.getResult() || 0;
    });
  }

  static calculateParabolicSAR(candles: CandleData[]): number[] {
    const sar = new ParabolicSAR();
    return candles.map(candle => {
      sar.update({ high: candle.high, low: candle.low });
      return sar.getResult() || 0;
    });
  }
}

// Momentum Indicators
export class MomentumIndicators {
  static calculateRSI(data: number[], period: number = 14): number[] {
    const rsi = new RSI(period);
    return data.map(price => {
      rsi.update(price);
      return rsi.getResult() || 50;
    });
  }

  static calculateStochastic(candles: CandleData[], period: number = 14): Array<{k: number, d: number}> {
    const stoch = new StochasticOscillator(period, 3);
    return candles.map(candle => {
      stoch.update({ high: candle.high, low: candle.low, close: candle.close });
      const result = stoch.getResult();
      return {
        k: result.stochK || 50,
        d: result.stochD || 50
      };
    });
  }

  static calculateWilliamsR(candles: CandleData[], period: number = 14): number[] {
    const wr = new WilliamsR(period);
    return candles.map(candle => {
      wr.update({ high: candle.high, low: candle.low, close: candle.close });
      return wr.getResult() || -50;
    });
  }

  static calculateCCI(candles: CandleData[], period: number = 20): number[] {
    const cci = new CCI(period);
    return candles.map(candle => {
      cci.update({ high: candle.high, low: candle.low, close: candle.close });
      return cci.getResult() || 0;
    });
  }

  static calculateROC(data: number[], period: number = 12): number[] {
    const roc = new ROC(period);
    return data.map(price => {
      roc.update(price);
      return roc.getResult() || 0;
    });
  }
}

// Volatility Indicators
export class VolatilityIndicators {
  static calculateBollingerBands(data: number[], period: number = 20): Array<{upper: number, middle: number, lower: number}> {
    const bb = new BollingerBands(period, 2);
    return data.map(price => {
      bb.update(price);
      const result = bb.getResult();
      return {
        upper: result.upper || 0,
        middle: result.middle || 0,
        lower: result.lower || 0
      };
    });
  }

  static calculateATR(candles: CandleData[], period: number = 14): number[] {
    const atr = new ATR(period);
    return candles.map(candle => {
      atr.update({ high: candle.high, low: candle.low, close: candle.close });
      return atr.getResult() || 0;
    });
  }
}

// Volume Indicators
export class VolumeIndicators {
  static calculateOBV(candles: CandleData[]): number[] {
    const obv = new OBV();
    return candles.map(candle => {
      obv.update({ close: candle.close, volume: candle.volume });
      return obv.getResult() || 0;
    });
  }

  static calculateVWAP(candles: CandleData[]): number[] {
    let cumulativePriceVolume = 0;
    let cumulativeVolume = 0;
    
    return candles.map(candle => {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      cumulativePriceVolume += typicalPrice * candle.volume;
      cumulativeVolume += candle.volume;
      
      return cumulativeVolume > 0 ? cumulativePriceVolume / cumulativeVolume : 0;
    });
  }
}

// Main Technical Analysis Engine
export class TechnicalAnalysisEngine {
  static analyzeCandles(candles: CandleData[]): TechnicalAnalysisResult {
    if (candles.length < 50) {
      return {
        indicators: [],
        overallSignal: 'neutral',
        overallStrength: 0
      };
    }

    const closePrices = candles.map(c => c.close);
    const indicators: IndicatorResult[] = [];

    try {
      // RSI Analysis
      const rsi = MomentumIndicators.calculateRSI(closePrices);
      const latestRSI = rsi[rsi.length - 1];
      indicators.push({
        name: 'RSI',
        value: latestRSI,
        signal: latestRSI > 70 ? 'sell' : latestRSI < 30 ? 'buy' : 'neutral',
        strength: latestRSI > 80 || latestRSI < 20 ? 9 : latestRSI > 70 || latestRSI < 30 ? 7 : 3
      });

      // MACD Analysis
      const macd = TrendIndicators.calculateMACD(closePrices);
      const latestMACD = macd[macd.length - 1];
      const prevMACD = macd[macd.length - 2];
      const macdCrossover = latestMACD.macd > latestMACD.signal && prevMACD.macd <= prevMACD.signal;
      const macdCrossunder = latestMACD.macd < latestMACD.signal && prevMACD.macd >= prevMACD.signal;
      
      indicators.push({
        name: 'MACD',
        value: latestMACD.histogram,
        signal: macdCrossover ? 'buy' : macdCrossunder ? 'sell' : 'neutral',
        strength: macdCrossover || macdCrossunder ? 8 : Math.abs(latestMACD.histogram) > 0.001 ? 5 : 2
      });

      // Bollinger Bands Analysis
      const bb = VolatilityIndicators.calculateBollingerBands(closePrices);
      const latestBB = bb[bb.length - 1];
      const currentPrice = closePrices[closePrices.length - 1];
      const bbPosition = (currentPrice - latestBB.lower) / (latestBB.upper - latestBB.lower);
      
      indicators.push({
        name: 'Bollinger Bands',
        value: bbPosition,
        signal: bbPosition > 0.8 ? 'sell' : bbPosition < 0.2 ? 'buy' : 'neutral',
        strength: bbPosition > 0.9 || bbPosition < 0.1 ? 8 : bbPosition > 0.8 || bbPosition < 0.2 ? 6 : 3
      });

      // SMA Crossover Analysis
      const sma20 = TrendIndicators.calculateSMA(closePrices, 20);
      const sma50 = TrendIndicators.calculateSMA(closePrices, 50);
      const sma20Current = sma20[sma20.length - 1];
      const sma50Current = sma50[sma50.length - 1];
      const sma20Prev = sma20[sma20.length - 2];
      const sma50Prev = sma50[sma50.length - 2];
      
      const goldenCross = sma20Current > sma50Current && sma20Prev <= sma50Prev;
      const deathCross = sma20Current < sma50Current && sma20Prev >= sma50Prev;
      
      indicators.push({
        name: 'SMA Crossover',
        value: sma20Current - sma50Current,
        signal: goldenCross ? 'buy' : deathCross ? 'sell' : sma20Current > sma50Current ? 'buy' : 'sell',
        strength: goldenCross || deathCross ? 9 : 4
      });

      // Stochastic Analysis
      const stoch = MomentumIndicators.calculateStochastic(candles);
      const latestStoch = stoch[stoch.length - 1];
      indicators.push({
        name: 'Stochastic',
        value: latestStoch.k,
        signal: latestStoch.k > 80 ? 'sell' : latestStoch.k < 20 ? 'buy' : 'neutral',
        strength: latestStoch.k > 90 || latestStoch.k < 10 ? 8 : latestStoch.k > 80 || latestStoch.k < 20 ? 6 : 3
      });

    } catch (error) {
      console.error('Error in technical analysis:', error);
    }

    // Calculate overall signal
    const buySignals = indicators.filter(i => i.signal === 'buy');
    const sellSignals = indicators.filter(i => i.signal === 'sell');
    const buyStrength = buySignals.reduce((sum, i) => sum + i.strength, 0);
    const sellStrength = sellSignals.reduce((sum, i) => sum + i.strength, 0);

    let overallSignal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let overallStrength = 0;

    if (buyStrength > sellStrength && buyStrength > 15) {
      overallSignal = 'buy';
      overallStrength = Math.min(10, Math.round(buyStrength / buySignals.length));
    } else if (sellStrength > buyStrength && sellStrength > 15) {
      overallSignal = 'sell';
      overallStrength = Math.min(10, Math.round(sellStrength / sellSignals.length));
    } else {
      overallStrength = 3;
    }

    return {
      indicators,
      overallSignal,
      overallStrength
    };
  }
}

export default TechnicalAnalysisEngine;