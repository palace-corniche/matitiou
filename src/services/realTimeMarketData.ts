import { supabase } from '@/integrations/supabase/client';

export interface TickData {
  id?: string;
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

export interface MarketDataSubscription {
  onTick: (tick: TickData) => void;
  onError: (error: Error) => void;
}

class RealTimeMarketDataService {
  private subscription: any = null;
  private isConnected = false;
  private callbacks: MarketDataSubscription[] = [];

  constructor() {
    this.startTickEngine();
    this.setupRealtimeSubscription();
  }

  private async startTickEngine() {
    // DISABLED: Using TradingView WebSocket feed instead
    console.log('ℹ️ Legacy tick engine disabled - using TradingView feed');
  }

  private setupRealtimeSubscription() {
    this.subscription = supabase
      .channel('market_data_ticks')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tick_data',
          filter: 'symbol=eq.EUR/USD'
        },
        (payload) => {
          console.log('📊 New tick received:', payload.new);
const tick = payload.new as TickData;
          // Only propagate truly live ticks from the real data source
          if (tick?.is_live && tick?.data_source === 'real_market_data') {
            this.callbacks.forEach(callback => {
              try {
                callback.onTick(tick);
              } catch (error) {
                callback.onError(error as Error);
              }
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Market data subscription status:', status);
        this.isConnected = status === 'SUBSCRIBED';
      });
  }

  subscribe(callback: MarketDataSubscription) {
    this.callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  async getLatestTick(symbol: string = 'EUR/USD'): Promise<TickData | null> {
    try {
const { data, error } = await supabase
        .from('tick_data')
        .select('*')
        .eq('symbol', symbol)
        .eq('data_source', 'real_market_data')
        .eq('is_live', true)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as TickData;
    } catch (error) {
      console.error('❌ Failed to get latest tick:', error);
      return null;
    }
  }

  async getTickHistory(symbol: string = 'EUR/USD', minutes: number = 60): Promise<TickData[]> {
    try {
      const since = new Date(Date.now() - minutes * 60000).toISOString();
      
      const { data, error } = await supabase
        .from('tick_data')
        .select('*')
        .eq('symbol', symbol)
        .gte('timestamp', since)
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (error) throw error;
      return data as TickData[];
    } catch (error) {
      console.error('❌ Failed to get tick history:', error);
      return [];
    }
  }

  calculatePnL(tradeType: 'buy' | 'sell', entryPrice: number, currentTick: TickData, lotSize: number): {
    pnl: number;
    pips: number;
    pipValue: number;
  } {
    const currentPrice = tradeType === 'buy' ? currentTick.bid : currentTick.ask;
    const pipDifference = tradeType === 'buy' 
      ? (currentPrice - entryPrice) / 0.0001
      : (entryPrice - currentPrice) / 0.0001;
    
    const pipValue = lotSize * 10; // $10 per pip for 1 lot EUR/USD
    const pnl = pipDifference * pipValue;

    return {
      pnl: Number(pnl.toFixed(2)),
      pips: Number(pipDifference.toFixed(1)),
      pipValue: Number(pipValue.toFixed(2))
    };
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  disconnect() {
    if (this.subscription) {
      supabase.removeChannel(this.subscription);
      this.subscription = null;
      this.isConnected = false;
    }
    this.callbacks = [];
  }
}

// Singleton instance
export const marketDataService = new RealTimeMarketDataService();