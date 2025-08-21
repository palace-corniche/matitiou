import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSystemStatus, SystemStatus } from '@/hooks/useSystemStatus';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Power,
  RefreshCw,
  Clock,
  Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const StatusIcon = ({ status, loading }: { status: SystemStatus; loading: boolean }) => {
  if (loading) {
    return <RefreshCw className="h-4 w-4 animate-spin" />;
  }

  switch (status) {
    case 'active':
      return <CheckCircle2 className="h-4 w-4 text-bullish" />;
    case 'degraded':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'failing':
      return <XCircle className="h-4 w-4 text-bearish" />;
    case 'offline':
      return <Power className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

const StatusColor = (status: SystemStatus) => {
  switch (status) {
    case 'active': return 'bg-bullish/10 text-bullish border-bullish/20';
    case 'degraded': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'failing': return 'bg-bearish/10 text-bearish border-bearish/20';
    case 'offline': return 'bg-muted text-muted-foreground border-border';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

const StatusLabel = (status: SystemStatus) => {
  switch (status) {
    case 'active': return 'Active';
    case 'degraded': return 'Degraded';
    case 'failing': return 'Failing';
    case 'offline': return 'Offline';
    default: return 'Unknown';
  }
};

export const SystemStatusButton: React.FC = () => {
  const { statusData, loading, refetch } = useSystemStatus();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-2 ${StatusColor(statusData.status)} border`}
        >
          <StatusIcon status={statusData.status} loading={loading} />
          <span className="hidden sm:inline text-xs font-medium">
            {StatusLabel(statusData.status)}
          </span>
          {statusData.errorCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {statusData.errorCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">System Status</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={refetch}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>

          <div className={`p-3 rounded-lg ${StatusColor(statusData.status)} border`}>
            <div className="flex items-center gap-2 mb-1">
              <StatusIcon status={statusData.status} loading={loading} />
              <span className="font-medium text-sm">{StatusLabel(statusData.status)}</span>
            </div>
            <p className="text-xs opacity-90">{statusData.details}</p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Success Rate:</span>
              <span className="font-medium">{statusData.successRate}%</span>
            </div>
            
            {statusData.lastSignal && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Signal:</span>
                <span className="font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(statusData.lastSignal), { addSuffix: true })}
                </span>
              </div>
            )}
            
            {statusData.lastMarketData && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Data:</span>
                <span className="font-medium flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {formatDistanceToNow(new Date(statusData.lastMarketData), { addSuffix: true })}
                </span>
              </div>
            )}

            {statusData.errorCount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recent Errors:</span>
                <Badge variant="destructive" className="h-4 text-xs">
                  {statusData.errorCount}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};