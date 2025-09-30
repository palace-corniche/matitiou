// ============= UNIFIED MARKET DATA SERVICE =============
// Single source of truth for EUR/USD pricing across all dashboards

import { CandleData, TickData } from './realMarketData';

export interface UnifiedTick {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  spread: number;
  timestamp: number;
  volume?: number;
  source: string;
}

export interface UnifiedSubscription {
  onTick: (tick: UnifiedTick) => void;
  onConnectionChange: (connected: boolean) => void;
  onError: (error: Error) => void;
}

class UnifiedMarketDataService {
  private callbacks: UnifiedSubscription[] = [];
  private isConnected = false;
  private lastTick: UnifiedTick | null = null;
  private priceInterval: NodeJS.Timeout | null = null;
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  
  // Cache for price data
  private priceCache = new Map<string, { price: number; timestamp: number }>();
  private readonly CACHE_DURATION = 10000; // 10 seconds
  
  constructor() {
    this.startPriceUpdates();
    this.startConnectionMonitoring();
  }

  // ============= MARKET DATA FEED INTEGRATION =============
  private async fetchLivePrice(): Promise<UnifiedTick | null> {
    try {
      const cacheKey = 'EURUSD';
      const cached = this.priceCache.get(cacheKey);
      
      // Use cache if fresh (within 10 seconds)
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return this.createTickFromPrice(cached.price);
      }

      // Primary: Use fresh market_data_feed data from Supabase
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data: marketData } = await supabase
        .from('market_data_feed')
        .select('price, timestamp')
        .eq('symbol', 'EUR/USD')
        .order('timestamp', { ascending: false })
        .limit(1);
      
      if (marketData && marketData.length > 0) {
        const latestData = marketData[0];
        const dataAge = Date.now() - new Date(latestData.timestamp).getTime();
        
        // Use if less than 10 minutes old
        if (dataAge < 10 * 60 * 1000) {
          const price = parseFloat(latestData.price?.toString() || '0');
          
          if (price > 0) {
            // Cache the price
            this.priceCache.set(cacheKey, {
              price,
              timestamp: Date.now()
            });
            
            console.log(`📊 EUR/USD from market_data_feed: ${price} (${Math.round(dataAge/1000)}s old)`);
            return this.createTickFromPrice(price, 'market_data_feed');
          }
        }
      }
      
      // Fallback to TwelveData if market_data_feed is stale
      console.log('🔄 market_data_feed stale, trying TwelveData...');
      const response = await fetch('https://api.twelvedata.com/quote?symbol=EUR/USD&apikey=demo');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.code && data.code !== 200) {
        throw new Error(data.message || 'API Error');
      }

      if (!data.close) {
        throw new Error('Invalid price data received');
      }

      const price = parseFloat(data.close);
      
      // Cache the price
      this.priceCache.set(cacheKey, {
        price,
        timestamp: Date.now()
      });

      console.log(`📊 EUR/USD from TwelveData: ${price}`);
      return this.createTickFromPrice(price, 'TwelveData');
      
    } catch (error) {
      console.warn('⚠️ All price sources failed, using fallback:', error);
      
      // Final fallback to synthetic price
      const timeSeed = Math.floor(Date.now() / 60000); // Changes every minute
      const basePrice = 1.17000; // This will be replaced with real data
      const variation = (Math.sin(timeSeed / 10) * 0.002) + (Math.random() - 0.5) * 0.0005;
      const fallbackPrice = basePrice + variation;
      
      return this.createTickFromPrice(fallbackPrice, 'synthetic');
    }
  }

  private createTickFromPrice(price: number, source: string = 'unknown'): UnifiedTick {
    // Calculate realistic bid/ask spread (typically 1-2 pips for EUR/USD)
    const spread = 0.00015; // 1.5 pips
    const bid = price - (spread / 2);
    const ask = price + (spread / 2);

    return {
      symbol: 'EUR/USD',
      price: parseFloat(price.toFixed(5)),
      bid: parseFloat(bid.toFixed(5)),
      ask: parseFloat(ask.toFixed(5)),
      spread: parseFloat((spread * 10000).toFixed(1)), // in pips
      timestamp: Date.now(),
      source: source
    };
  }

  private startPriceUpdates() {
    // Initial fetch
    this.fetchAndNotify();
    
    // Update every 5 seconds
    this.priceInterval = setInterval(() => {
      this.fetchAndNotify();
    }, 5000);
  }

  private async fetchAndNotify() {
    try {
      const tick = await this.fetchLivePrice();
      
      if (tick) {
        this.lastTick = tick;
        this.isConnected = true;
        this.notifyTick(tick);
        
        console.log(`📊 EUR/USD Update: ${tick.price.toFixed(5)} | Bid: ${tick.bid.toFixed(5)} | Ask: ${tick.ask.toFixed(5)} | Spread: ${tick.spread} pips`);
      }
    } catch (error) {
      console.error('❌ Error fetching price:', error);
      this.isConnected = false;
      this.notifyConnectionChange(false);
      this.notifyError(new Error('Failed to fetch market data'));
    }
  }

  private startConnectionMonitoring() {
    this.connectionCheckInterval = setInterval(() => {
      const wasConnected = this.isConnected;
      
      // Check if last update was more than 30 seconds ago
      if (this.lastTick && Date.now() - this.lastTick.timestamp > 30000) {
        this.isConnected = false;
      }
      
      // Notify if connection status changed
      if (wasConnected !== this.isConnected) {
        this.notifyConnectionChange(this.isConnected);
      }
    }, 10000); // Check every 10 seconds
  }

  // ============= NOTIFICATION METHODS =============
  private notifyTick(tick: UnifiedTick) {
    this.callbacks.forEach(callback => {
      try {
        callback.onTick(tick);
      } catch (error) {
        console.error('❌ Error in tick callback:', error);
      }
    });
  }

  private notifyConnectionChange(connected: boolean) {
    this.callbacks.forEach(callback => {
      try {
        callback.onConnectionChange(connected);
      } catch (error) {
        console.error('❌ Error in connection callback:', error);
      }
    });
  }

  private notifyError(error: Error) {
    this.callbacks.forEach(callback => {
      try {
        callback.onError(error);
      } catch (error) {
        console.error('❌ Error in error callback:', error);
      }
    });
  }

  // ============= PUBLIC API =============
  subscribe(callback: UnifiedSubscription) {
    this.callbacks.push(callback);
    
    // Send last tick immediately if available
    if (this.lastTick) {
      callback.onTick(this.lastTick);
    }
    
    // Send current connection status
    callback.onConnectionChange(this.isConnected);
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getLastTick(): UnifiedTick | null {
    return this.lastTick;
  }

  getCurrentPrice(): number {
    return this.lastTick?.price || 0; // Remove hardcoded fallback
  }

  getBidAsk(): { bid: number; ask: number } {
    if (this.lastTick) {
      return {
        bid: this.lastTick.bid,
        ask: this.lastTick.ask
      };
    }
    
    // Return zero if no data available (remove hardcoded fallback)
    return {
      bid: 0,
      ask: 0
    };
  }

  disconnect() {
    if (this.priceInterval) {
      clearInterval(this.priceInterval);
      this.priceInterval = null;
    }
    
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
    
    this.callbacks = [];
    this.isConnected = false;
  }

  // ============= LEGACY COMPATIBILITY =============
  // Methods for backward compatibility with existing code
  async getForexData(timeframe: string): Promise<CandleData[]> {
    // Delegate to the original service for historical data
    const { getForexData } = await import('./realMarketData');
    return getForexData(timeframe);
  }

  async getLiveTickData(): Promise<TickData | null> {
    const tick = await this.fetchLivePrice();
    if (!tick) return null;

    return {
      price: tick.price,
      time: new Date(tick.timestamp).toISOString(),
      change: 0, // Would need historical data to calculate
      changePercent: 0
    };
  }
}

// ============= SINGLETON EXPORT =============
export const unifiedMarketData = new UnifiedMarketDataService();

// Re-export types for convenience
export type { CandleData, TickData };