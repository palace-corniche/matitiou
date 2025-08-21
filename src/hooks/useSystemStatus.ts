import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SystemStatus = 'active' | 'degraded' | 'failing' | 'offline';

export interface SystemStatusData {
  status: SystemStatus;
  lastSignal: string | null;
  lastMarketData: string | null;
  errorCount: number;
  successRate: number;
  details: string;
}

export const useSystemStatus = () => {
  const [statusData, setStatusData] = useState<SystemStatusData>({
    status: 'offline',
    lastSignal: null,
    lastMarketData: null,
    errorCount: 0,
    successRate: 0,
    details: 'Checking system status...'
  });
  const [loading, setLoading] = useState(true);

  const checkSystemHealth = async () => {
    try {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      
      // Check latest trading signals
      const { data: signals } = await supabase
        .from('trading_signals')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      // Check latest market data
      const { data: marketData } = await supabase
        .from('market_data_feed')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      // Check recent system health logs
      const { data: healthLogs } = await supabase
        .from('system_health')
        .select('status, created_at')
        .gte('created_at', thirtyMinutesAgo.toISOString())
        .order('created_at', { ascending: false });

      const lastSignal = signals?.[0]?.created_at || null;
      const lastMarket = marketData?.[0]?.created_at || null;
      
      // Calculate success rate from recent health logs
      const totalLogs = healthLogs?.length || 0;
      const successLogs = healthLogs?.filter(log => log.status === 'success')?.length || 0;
      const successRate = totalLogs > 0 ? (successLogs / totalLogs) * 100 : 0;
      const errorCount = totalLogs - successLogs;

      // Determine system status
      let status: SystemStatus = 'offline';
      let details = '';

      const hasRecentSignal = lastSignal && new Date(lastSignal) > thirtyMinutesAgo;
      const hasRecentMarketData = lastMarket && new Date(lastMarket) > thirtyMinutesAgo;
      const hasRecentActivity = totalLogs > 0;

      if (hasRecentSignal && hasRecentMarketData && successRate > 80) {
        status = 'active';
        details = `System operational. ${successLogs}/${totalLogs} successful operations.`;
      } else if (hasRecentActivity && successRate > 30) {
        status = 'degraded';
        details = `Partial functionality. ${errorCount} errors in last 30min.`;
      } else if (hasRecentActivity && successRate <= 30) {
        status = 'failing';
        details = `System struggling. ${errorCount}/${totalLogs} operations failed.`;
      } else {
        status = 'offline';
        details = hasRecentMarketData 
          ? 'No recent signals generated' 
          : 'No recent system activity detected';
      }

      setStatusData({
        status,
        lastSignal,
        lastMarketData: lastMarket,
        errorCount,
        successRate: Math.round(successRate),
        details
      });

    } catch (error) {
      console.error('Error checking system status:', error);
      setStatusData(prev => ({
        ...prev,
        status: 'failing',
        details: 'Error checking system health'
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return { statusData, loading, refetch: checkSystemHealth };
};