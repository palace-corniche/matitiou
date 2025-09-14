import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi, WifiOff, Clock, Activity } from 'lucide-react';
import { multiApiManager } from '@/services/multiApiManager';

interface ApiHealthMonitorProps {
  refreshInterval?: number;
}

export const ApiHealthMonitor: React.FC<ApiHealthMonitorProps> = ({ 
  refreshInterval = 30000 
}) => {
  const [apiHealth, setApiHealth] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchApiHealth = async () => {
    setIsRefreshing(true);
    try {
      const healthData = multiApiManager.getApiHealthStatus();
      setApiHealth(healthData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch API health:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApiHealth();
    const interval = setInterval(fetchApiHealth, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getHealthColor = (isActive: boolean, errorCount: number) => {
    if (!isActive || errorCount > 5) return 'hsl(var(--destructive))';
    if (errorCount > 2) return 'hsl(var(--warning))';
    return 'hsl(var(--success))';
  };

  const getHealthBadge = (isActive: boolean, errorCount: number) => {
    if (!isActive || errorCount > 5) return { variant: 'destructive' as const, text: 'Offline' };
    if (errorCount > 2) return { variant: 'secondary' as const, text: 'Degraded' };
    return { variant: 'default' as const, text: 'Online' };
  };

  const calculateUptime = (isActive: boolean, errorCount: number) => {
    if (!isActive) return 0;
    return Math.max(0, 100 - (errorCount * 10));
  };

  const handleClearCache = () => {
    multiApiManager.clearCache();
    fetchApiHealth();
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          API Health Monitor
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCache}
            className="text-xs"
          >
            Clear Cache
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchApiHealth}
            disabled={isRefreshing}
            className="text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Clock className="h-4 w-4" />
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>

        <div className="grid gap-3">
          {apiHealth.map((api) => {
            const healthBadge = getHealthBadge(api.isActive, api.errorCount);
            const uptime = calculateUptime(api.isActive, api.errorCount);
            
            return (
              <div
                key={api.name}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  {api.isActive ? (
                    <Wifi className="h-4 w-4 text-success" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-destructive" />
                  )}
                  <div>
                    <div className="font-medium text-sm">{api.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {api.errorCount > 0 && `${api.errorCount} errors`}
                      {api.responseTime > 0 && ` • ${api.responseTime}ms`}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground mb-1">Uptime</div>
                    <Progress 
                      value={uptime} 
                      className="w-16 h-2"
                      style={{ '--progress-foreground': getHealthColor(api.isActive, api.errorCount) } as any}
                    />
                    <div className="text-xs text-center mt-1">{uptime.toFixed(0)}%</div>
                  </div>
                  
                  <Badge variant={healthBadge.variant} className="text-xs">
                    {healthBadge.text}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        {apiHealth.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No API health data available</p>
          </div>
        )}
        
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Multi-API Fortress Status:</p>
            <p>
              ✅ {apiHealth.filter(api => api.isActive).length} APIs Online • 
              ⚠️ {apiHealth.filter(api => !api.isActive).length} APIs Offline • 
              🛡️ Failover Protection Active
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};