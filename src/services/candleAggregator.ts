/**
 * Candle Aggregator Service
 * Converts real-time tick data into OHLC candles for various timeframes
 */

export interface TickData {
  timestamp: string;
  bid: number;
  ask: number;
  spread: number;
  tick_volume?: number;
}

export interface CandleData {
  timestamp: string;
  symbol: string;
  timeframe: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  tick_count: number;
  is_complete: boolean;
}

export class CandleAggregator {
  /**
   * Get timeframe duration in milliseconds
   */
  private static getTimeframeMs(timeframe: string): number {
    const map: Record<string, number> = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      'H1': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      'H4': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      'D1': 24 * 60 * 60 * 1000,
    };
    return map[timeframe] || 15 * 60 * 1000;
  }

  /**
   * Get candle open time (floor timestamp to timeframe boundary)
   */
  private static getCandleOpenTime(timestamp: Date, timeframe: string): Date {
    const ms = this.getTimeframeMs(timeframe);
    const time = timestamp.getTime();
    const candleStart = Math.floor(time / ms) * ms;
    return new Date(candleStart);
  }

  /**
   * Calculate midpoint from bid/ask
   */
  private static getMidPrice(tick: TickData): number {
    return (tick.bid + tick.ask) / 2;
  }

  /**
   * Aggregate ticks into a single candle for a time window
   */
  private static getCandleForTimeWindow(
    ticks: TickData[],
    windowStart: Date,
    windowEnd: Date,
    symbol: string,
    timeframe: string,
    isComplete: boolean
  ): CandleData | null {
    const windowTicks = ticks.filter(tick => {
      const tickTime = new Date(tick.timestamp).getTime();
      return tickTime >= windowStart.getTime() && tickTime < windowEnd.getTime();
    });

    if (windowTicks.length === 0) return null;

    const prices = windowTicks.map(t => this.getMidPrice(t));
    const volumes = windowTicks.map(t => t.tick_volume || 1);

    return {
      timestamp: windowStart.toISOString(),
      symbol,
      timeframe,
      open_price: prices[0],
      high_price: Math.max(...prices),
      low_price: Math.min(...prices),
      close_price: prices[prices.length - 1],
      volume: volumes.reduce((sum, v) => sum + v, 0),
      tick_count: windowTicks.length,
      is_complete: isComplete,
    };
  }

  /**
   * Aggregate ticks into candles for a specific timeframe
   */
  static aggregateTicksToCandles(
    ticks: TickData[],
    symbol: string,
    timeframe: string
  ): CandleData[] {
    if (ticks.length === 0) return [];

    // Sort ticks by timestamp
    const sortedTicks = [...ticks].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const firstTick = new Date(sortedTicks[0].timestamp);
    const lastTick = new Date(sortedTicks[sortedTicks.length - 1].timestamp);
    
    const firstCandleStart = this.getCandleOpenTime(firstTick, timeframe);
    const lastCandleStart = this.getCandleOpenTime(lastTick, timeframe);
    
    const timeframeMs = this.getTimeframeMs(timeframe);
    const candles: CandleData[] = [];
    
    const now = new Date();
    const currentCandleStart = this.getCandleOpenTime(now, timeframe);

    // Iterate through all candle periods
    for (
      let candleStart = firstCandleStart.getTime();
      candleStart <= lastCandleStart.getTime();
      candleStart += timeframeMs
    ) {
      const windowStart = new Date(candleStart);
      const windowEnd = new Date(candleStart + timeframeMs);
      
      // Check if this is the current incomplete candle
      const isComplete = windowStart.getTime() < currentCandleStart.getTime();
      
      const candle = this.getCandleForTimeWindow(
        sortedTicks,
        windowStart,
        windowEnd,
        symbol,
        timeframe,
        isComplete
      );
      
      if (candle) {
        candles.push(candle);
      }
    }

    return candles;
  }

  /**
   * Aggregate ticks for all standard timeframes
   */
  static aggregateAllTimeframes(
    ticks: TickData[],
    symbol: string = 'EUR/USD'
  ): Record<string, CandleData[]> {
    const timeframes = ['15m', '1h', '4h', '1d'];
    const result: Record<string, CandleData[]> = {};

    for (const timeframe of timeframes) {
      result[timeframe] = this.aggregateTicksToCandles(ticks, symbol, timeframe);
    }

    return result;
  }
}
