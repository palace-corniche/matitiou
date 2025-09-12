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
      console.log('⚠️ Tick engine already running');
      return;
    }

    console.log('🚀 Starting real-time tick engine...');
    this.isRunning = true;

    // Start immediate tick
    await this.generateTick();

    // Generate ticks every 500ms (2 ticks per second for high frequency)
    this.intervalId = setInterval(async () => {
      if (this.isRunning) {
        await this.generateTick();
      }
    }, 500);
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
    try {
      // Call the edge function to generate real-time tick
      const { data, error } = await supabase.functions.invoke('real-time-tick-engine', {
        body: {}
      });

      if (error) {
        console.error('❌ Error generating tick:', error);
        return;
      }

      if (data?.success && data?.tick) {
        // Notify all subscribers
        this.tickCallbacks.forEach(callback => {
          try {
            callback(data.tick);
          } catch (callbackError) {
            console.error('❌ Error in tick callback:', callbackError);
          }
        });
      }
    } catch (error) {
      console.error('❌ Error in tick engine:', error);
    }
  }

  async getLatestTick(): Promise<TickData | null> {
    try {
      const { data, error } = await supabase
        .from('tick_data')
        .select('*')
        .eq('symbol', 'EUR/USD')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('❌ Error getting latest tick:', error);
        return null;
      }

      return data as TickData;
    } catch (error) {
      console.error('❌ Error fetching latest tick:', error);
      return null;
    }
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

export const realTimeTickEngine = new RealTimeTickEngine();