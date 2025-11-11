import { supabase } from '@/integrations/supabase/client';

export interface DataFreshnessCheck {
  source: string;
  isFresh: boolean;
  age_minutes: number;
  lastUpdate: string;
  status: 'current' | 'stale' | 'ancient';
}

export class DataFreshnessValidator {
  // Define freshness thresholds (in minutes)
  static FRESHNESS_THRESHOLDS = {
    market_data_feed: 5,    // 5 minutes
    aggregated_candles: 20, // 20 minutes (1 aggregation cycle + buffer)
    master_signals: 120,    // 2 hours for master signals
    system_health: 10,      // 10 minutes
  };

  static async validateDataFreshness(table: string): Promise<DataFreshnessCheck> {
    try {
      let data: any = null;
      let error: any = null;

      // Query based on table name
      if (table === 'market_data_feed') {
        const result = await supabase
          .from('market_data_feed')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        data = result.data;
        error = result.error;
      } else if (table === 'aggregated_candles') {
        const result = await supabase
          .from('aggregated_candles')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        data = result.data;
        error = result.error;
      } else if (table === 'master_signals') {
        const result = await supabase
          .from('master_signals')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        data = result.data;
        error = result.error;
      } else if (table === 'system_health') {
        const result = await supabase
          .from('system_health')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        data = result.data;
        error = result.error;
      }

      if (error || !data) {
        return {
          source: table,
          isFresh: false,
          age_minutes: Infinity,
          lastUpdate: 'never',
          status: 'ancient'
        };
      }

      const ageMs = Date.now() - new Date(data.created_at).getTime();
      const ageMinutes = Math.floor(ageMs / 60000);
      const threshold = this.FRESHNESS_THRESHOLDS[table as keyof typeof this.FRESHNESS_THRESHOLDS] || 60;

      return {
        source: table,
        isFresh: ageMinutes <= threshold,
        age_minutes: ageMinutes,
        lastUpdate: data.created_at,
        status: ageMinutes <= threshold ? 'current' : ageMinutes <= threshold * 10 ? 'stale' : 'ancient'
      };
    } catch (error) {
      console.error(`Error validating ${table}:`, error);
      return {
        source: table,
        isFresh: false,
        age_minutes: Infinity,
        lastUpdate: 'error',
        status: 'ancient'
      };
    }
  }

  static async validateAllSources(): Promise<DataFreshnessCheck[]> {
    return Promise.all([
      this.validateDataFreshness('market_data_feed'),
      this.validateDataFreshness('aggregated_candles'),
      this.validateDataFreshness('master_signals'),
      this.validateDataFreshness('system_health')
    ]);
  }

  static async getDataState(): Promise<'building' | 'limited' | 'operational'> {
    const checks = await this.validateAllSources();
    
    const signalsFresh = checks.find(c => c.source === 'master_signals')?.isFresh;
    const candlesFresh = checks.find(c => c.source === 'aggregated_candles')?.isFresh;
    
    if (!signalsFresh && !candlesFresh) {
      return 'building';
    } else if (candlesFresh && !signalsFresh) {
      return 'limited';
    } else {
      return 'operational';
    }
  }
}
