import { supabase } from '@/integrations/supabase/client';

interface TickData {
  symbol: string;
  timestamp: string;
  bid: number;
  ask: number;
  spread: number;
  tick_volume: number;
  data_source: string;
  session_type: string;
  is_live: boolean;
}

class RealTimeTickEngine {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private tickCallbacks: Array<(tick: TickData) => void> = [];

  async start() {
    if (this.isRunning) {
      console.log('⚠️ Tick engine already running (DISABLED - using market_data_feed)');
      return;
    }

    console.log('⚠️ Real-time tick engine is DISABLED - system uses market_data_feed instead');
    // Engine disabled - all price data comes from market_data_feed via fetch-market-data
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Real-time tick engine stopped');
  }

  subscribe(callback: (tick: TickData) => void) {
    this.tickCallbacks.push(callback);
    return () => {
      this.tickCallbacks = this.tickCallbacks.filter(cb => cb !== callback);
    };
  }

  private async generateTick() {
    // Disabled - no longer generating fake ticks
    console.warn('generateTick called but engine is disabled');
  }

  async getLatestTick(): Promise<TickData | null> {
    try {
      // Now uses market_data_feed instead of tick_data
      const { data, error } = await supabase
        .from('market_data_feed')
        .select('*')
        .eq('symbol', 'EUR/USD')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ Error getting latest market data:', error);
        return null;
      }

      if (!data) return null;

      // Convert market_data_feed to TickData format
      const spread = 0.00015; // 1.5 pip spread
      return {
        symbol: data.symbol,
        timestamp: data.timestamp,
        bid: data.price - (spread / 2),
        ask: data.price + (spread / 2),
        spread: spread,
        tick_volume: data.volume || 1000,
        data_source: 'market_data_feed',
        session_type: this.getSessionType(new Date(data.timestamp)),
        is_live: true
      };
    } catch (error) {
      console.error('❌ Error fetching latest market data:', error);
      return null;
    }
  }

  private getSessionType(date: Date): string {
    const hour = date.getUTCHours();
    if (hour >= 22 || hour < 7) return 'sydney';
    if (hour >= 1 && hour < 10) return 'tokyo';
    if (hour >= 8 && hour < 17) return 'london';
    if (hour >= 13 && hour < 22) return 'new_york';
    return 'off_market';
  }

  async getDataSourceStatus(): Promise<{
    isLive: boolean;
    dataSource: string;
    lastUpdate: string;
    marketOpen: boolean;
  }> {
    try {
      const latestTick = await this.getLatestTick();
      
      if (!latestTick) {
        return {
          isLive: false,
          dataSource: 'none',
          lastUpdate: 'never',
          marketOpen: false
        };
      }

      const lastUpdate = new Date(latestTick.timestamp);
      const now = new Date();
      const timeDiff = now.getTime() - lastUpdate.getTime();
      const isRecent = timeDiff < 60000; // Data is fresh if less than 1 minute old

      return {
        isLive: isRecent && latestTick.is_live,
        dataSource: latestTick.data_source,
        lastUpdate: latestTick.timestamp,
        marketOpen: this.isMarketOpen()
      };
    } catch (error) {
      console.error('❌ Error getting data source status:', error);
      return {
        isLive: false,
        dataSource: 'error',
        lastUpdate: 'error',
        marketOpen: false
      };
    }
  }

  private isMarketOpen(): boolean {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const dayOfWeek = now.getUTCDay();
    
    // Market closed on weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    
    // Market open 24/5 during weekdays
    return true;
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

export const realTimeTickEngine = new RealTimeTickEngine();