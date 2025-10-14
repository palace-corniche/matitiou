// Fix 2: Real-Time Price Validation Service
import { supabase } from '@/integrations/supabase/client';

export interface ValidatedPrice {
  price: number;
  bid: number;
  ask: number;
  source: 'tick' | 'market_feed' | 'fallback';
  age_ms: number;
  timestamp: string;
  spread_pips: number;
}

export interface PriceValidationResult {
  valid: boolean;
  price?: ValidatedPrice;
  error?: string;
  rejectionReason?: string;
}

const PRICE_FRESHNESS_THRESHOLDS = {
  tick: 5000,        // 5 seconds for tick data
  market_feed: 300000 // 5 minutes for market data feed
};

const PRICE_DEVIATION_THRESHOLDS = {
  market: 0.001,     // 0.1% for market orders
  pending: 0.003     // 0.3% for pending orders
};

export class PriceValidationService {
  /**
   * Get validated real-time price with data freshness checks
   */
  static async getValidatedPrice(symbol: string): Promise<PriceValidationResult> {
    try {
      // Priority 1: Try tick data (< 5 seconds old)
      const tickResult = await this.fetchLatestTick(symbol);
      if (tickResult.valid) {
        return tickResult;
      }

      // Priority 2: Try market data feed (< 5 minutes old)
      const marketResult = await this.fetchLatestMarketData(symbol);
      if (marketResult.valid) {
        return marketResult;
      }

      // Priority 3: REJECT - data too stale
      return {
        valid: false,
        error: 'No fresh price data available',
        rejectionReason: `Data too stale. Tick: ${tickResult.error}, Market: ${marketResult.error}`
      };
    } catch (error) {
      console.error('Price validation error:', error);
      return {
        valid: false,
        error: 'Price validation failed',
        rejectionReason: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Fetch latest tick data
   */
  private static async fetchLatestTick(symbol: string): Promise<PriceValidationResult> {
    try {
      const { data, error } = await supabase
        .from('tick_data')
        .select('bid, ask, timestamp, spread')
        .eq('symbol', symbol)
        .eq('is_live', true)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return { valid: false, error: `Tick query error: ${error.message}` };
      }

      if (!data) {
        return { valid: false, error: 'No tick data available' };
      }

      const ageMs = Date.now() - new Date(data.timestamp).getTime();

      if (ageMs > PRICE_FRESHNESS_THRESHOLDS.tick) {
        return { 
          valid: false, 
          error: `Tick data too old: ${ageMs}ms (max ${PRICE_FRESHNESS_THRESHOLDS.tick}ms)` 
        };
      }

      // Calculate mid price from bid/ask
      const midPrice = (data.bid + data.ask) / 2;

      return {
        valid: true,
        price: {
          price: midPrice,
          bid: data.bid,
          ask: data.ask,
          source: 'tick',
          age_ms: ageMs,
          timestamp: data.timestamp,
          spread_pips: data.spread * 10000
        }
      };
    } catch (error) {
      return { 
        valid: false, 
        error: `Tick fetch error: ${error instanceof Error ? error.message : 'Unknown'}` 
      };
    }
  }

  /**
   * Fetch latest market data feed
   */
  private static async fetchLatestMarketData(symbol: string): Promise<PriceValidationResult> {
    try {
      const { data, error } = await supabase
        .from('market_data_feed')
        .select('price, high_price, low_price, timestamp')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return { valid: false, error: `Market data query error: ${error.message}` };
      }

      if (!data) {
        return { valid: false, error: 'No market data available' };
      }

      const ageMs = Date.now() - new Date(data.timestamp).getTime();

      if (ageMs > PRICE_FRESHNESS_THRESHOLDS.market_feed) {
        return { 
          valid: false, 
          error: `Market data too old: ${ageMs}ms (max ${PRICE_FRESHNESS_THRESHOLDS.market_feed}ms)` 
        };
      }

      // Estimate bid/ask from high/low
      const spread = (data.high_price - data.low_price) / 2;
      const bid = data.price - spread / 2;
      const ask = data.price + spread / 2;

      return {
        valid: true,
        price: {
          price: data.price,
          bid,
          ask,
          source: 'market_feed',
          age_ms: ageMs,
          timestamp: data.timestamp,
          spread_pips: spread * 10000
        }
      };
    } catch (error) {
      return { 
        valid: false, 
        error: `Market data fetch error: ${error instanceof Error ? error.message : 'Unknown'}` 
      };
    }
  }

  /**
   * Validate price deviation from signal price
   */
  static validatePriceDeviation(
    signalPrice: number,
    currentPrice: number,
    orderType: 'market' | 'pending'
  ): { valid: boolean; deviation: number; error?: string } {
    const deviation = Math.abs(currentPrice - signalPrice) / signalPrice;
    const threshold = PRICE_DEVIATION_THRESHOLDS[orderType];

    if (deviation > threshold) {
      return {
        valid: false,
        deviation: deviation * 100,
        error: `Price deviation ${(deviation * 100).toFixed(2)}% exceeds ${(threshold * 100).toFixed(1)}% threshold`
      };
    }

    return { valid: true, deviation: deviation * 100 };
  }

  /**
   * Complete validation for trade execution
   */
  static async validateTradeExecution(
    symbol: string,
    signalPrice: number,
    orderType: 'market' | 'pending' = 'market'
  ): Promise<{
    valid: boolean;
    price?: ValidatedPrice;
    deviation?: number;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Step 1: Get validated current price
    const priceResult = await this.getValidatedPrice(symbol);
    if (!priceResult.valid) {
      errors.push(priceResult.error || 'Invalid price');
      return { valid: false, errors };
    }

    // Step 2: Validate price deviation
    const deviationCheck = this.validatePriceDeviation(
      signalPrice,
      priceResult.price!.price,
      orderType
    );

    if (!deviationCheck.valid) {
      errors.push(deviationCheck.error || 'Price deviation too high');
    }

    return {
      valid: errors.length === 0,
      price: priceResult.price,
      deviation: deviationCheck.deviation,
      errors
    };
  }
}
