import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Info,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Calendar
} from 'lucide-react';

interface TradeDetails {
  id: string;
  symbol: string;
  trade_type: string;
  entry_price: number;
  exit_price?: number;
  entry_time: string;
  exit_time?: string;
  exit_reason?: string;
  lot_size: number;
  stop_loss?: number;
  take_profit?: number;
  pnl?: number;
  profit_pips?: number;
  commission?: number;
  swap?: number;
  status: string;
  duration_minutes?: number;
}

interface TradeDetailsDialogProps {
  trade: TradeDetails;
}

export const TradeDetailsDialog: React.FC<TradeDetailsDialogProps> = ({ trade }) => {
  const isProfitable = (trade.pnl ?? 0) > 0;
  const isClosed = trade.status === 'closed' || trade.exit_price;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const getRiskReward = () => {
    if (!trade.entry_price || !trade.stop_loss || !trade.take_profit) return 'N/A';
    const risk = Math.abs(trade.entry_price - trade.stop_loss) * 10000;
    const reward = Math.abs(trade.take_profit - trade.entry_price) * 10000;
    return `1:${(reward / risk).toFixed(2)}`;
  };

  const getExitReasonDisplay = (reason?: string) => {
    if (!reason) return 'Open';
    const reasonMap: Record<string, string> = {
      'stop_loss': 'Stop Loss Hit',
      'take_profit': 'Take Profit Hit',
      'intelligence': 'AI Exit',
      'trailing_stop': 'Trailing Stop',
      'break_even': 'Break Even',
      'manual': 'Manual Close',
      'time_exit': 'Time-Based Exit',
      'partial_close': 'Partial Close'
    };
    return reasonMap[reason] || reason.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Trade Details: {trade.symbol}
          </DialogTitle>
          <DialogDescription>
            Complete information about this trade
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Trade Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {trade.trade_type === 'buy' ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
              <Badge variant={trade.trade_type === 'buy' ? 'default' : 'destructive'} className="capitalize">
                {trade.trade_type}
              </Badge>
              <span className="text-sm font-medium">{trade.lot_size.toFixed(2)} lots</span>
            </div>
            {isClosed && (
              <Badge variant={isProfitable ? 'default' : 'destructive'} className="text-base px-4 py-1">
                {isProfitable ? '+' : ''}{(trade.pnl ?? 0).toFixed(2)} USD
              </Badge>
            )}
          </div>

          <Separator />

          {/* Entry Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Entry Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry Time:</span>
                  <span className="font-mono">{formatDate(trade.entry_time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry Price:</span>
                  <span className="font-mono font-semibold">{trade.entry_price.toFixed(5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stop Loss:</span>
                  <span className="font-mono">{trade.stop_loss?.toFixed(5) ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Take Profit:</span>
                  <span className="font-mono">{trade.take_profit?.toFixed(5) ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk:Reward:</span>
                  <span className="font-mono font-semibold">{getRiskReward()}</span>
                </div>
              </div>
            </div>

            {/* Exit Information */}
            {isClosed && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Exit Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Exit Time:</span>
                    <span className="font-mono">{trade.exit_time ? formatDate(trade.exit_time) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Exit Price:</span>
                    <span className="font-mono font-semibold">{trade.exit_price?.toFixed(5) ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Exit Reason:</span>
                    <Badge variant="outline" className="text-xs">
                      {getExitReasonDisplay(trade.exit_reason)}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-mono">{formatDuration(trade.duration_minutes)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {isClosed && (
            <>
              <Separator />

              {/* Performance Metrics */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Performance
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">P&L (USD)</div>
                    <div className={`text-lg font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                      {isProfitable ? '+' : ''}{(trade.pnl ?? 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Pips</div>
                    <div className={`text-lg font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                      {isProfitable ? '+' : ''}{(trade.profit_pips ?? 0).toFixed(1)}
                    </div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Commission</div>
                    <div className="text-lg font-bold text-orange-600">
                      {(trade.commission ?? 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Swap</div>
                    <div className="text-lg font-bold">
                      {(trade.swap ?? 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Movement Visual */}
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <BarChart3 className="h-4 w-4" />
                  Price Movement
                </h3>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  {trade.entry_price && trade.exit_price && (
                    <div 
                      className={`absolute h-full ${isProfitable ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ 
                        width: `${Math.abs((trade.exit_price - trade.entry_price) / trade.entry_price * 10000)}%`,
                        left: isProfitable ? '0' : 'auto',
                        right: isProfitable ? 'auto' : '0'
                      }}
                    />
                  )}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{trade.entry_price.toFixed(5)}</span>
                  <span>{trade.exit_price?.toFixed(5)}</span>
                </div>
              </div>
            </>
          )}

          {/* Trade ID */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Trade ID:</span>
              <span className="font-mono">{trade.id.slice(0, 8)}...{trade.id.slice(-8)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
