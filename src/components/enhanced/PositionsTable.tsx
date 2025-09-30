import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { calculateTradeMetrics } from '@/services/pnlCalculator';
import { unifiedMarketData, UnifiedTick } from '@/services/unifiedMarketData';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  AlertTriangle,
  X,
  MoreHorizontal,
  Activity
} from 'lucide-react';
import { GlobalShadowTrade } from '@/services/globalShadowTradingEngine';

interface PositionsTableProps {
  openTrades: GlobalShadowTrade[];
  isClosingTrade: boolean;
  onCloseTrade: (tradeId: string) => Promise<void>;
  className?: string;
}

export const PositionsTable: React.FC<PositionsTableProps> = ({
  openTrades,
  isClosingTrade,
  onCloseTrade,
  className = ""
}) => {
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null);
  const [currentTick, setCurrentTick] = useState<UnifiedTick | null>(null);

  // Subscribe to live price updates
  useEffect(() => {
    const unsubscribe = unifiedMarketData.subscribe({
      onTick: (tick) => setCurrentTick(tick),
      onConnectionChange: () => {},
      onError: () => {}
    });

    return unsubscribe;
  }, []);

  // Calculate live PnL for a trade
  const getLivePnL = (trade: GlobalShadowTrade) => {
    if (currentTick && trade.symbol === 'EUR/USD') {
      const liveMetrics = calculateTradeMetrics(trade, currentTick);
      return {
        pnl: liveMetrics.pnl,
        pips: liveMetrics.pips,
        currentPrice: trade.trade_type === 'buy' ? currentTick.bid : currentTick.ask
      };
    }
    // Fallback to DB values
    return {
      pnl: trade.unrealized_pnl || 0,
      pips: trade.profit_pips || 0,
      currentPrice: trade.current_price || trade.entry_price
    };
  };

  const formatDuration = (entryTime: string) => {
    const now = new Date();
    const entry = new Date(entryTime);
    const diffMs = now.getTime() - entry.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 24) {
      const days = Math.floor(diffHours / 24);
      return `${days}d ${diffHours % 24}h`;
    }
    return `${diffHours}h ${diffMins}m`;
  };

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return "text-green-600";
    if (pnl < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  const getPnLBadgeVariant = (pnl: number) => {
    if (pnl > 0) return "default";
    if (pnl < 0) return "destructive";
    return "secondary";
  };

  // Calculate total using live PnL
  const totalPnL = openTrades.reduce((sum, trade) => {
    const livePnL = getLivePnL(trade);
    return sum + livePnL.pnl;
  }, 0);
  const totalVolume = openTrades.reduce((sum, trade) => sum + trade.lot_size, 0);

  if (openTrades.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Open Positions (0)
          </CardTitle>
          <CardDescription>No active trades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Open Positions</h3>
            <p className="text-muted-foreground">
              Start trading to see your positions here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Open Positions ({openTrades.length})
            </CardTitle>
            <CardDescription>Currently active trades</CardDescription>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${getPnLColor(totalPnL)}`}>
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">
              Total P&L
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Total Volume</span>
            <span className="font-semibold">{totalVolume.toFixed(2)} lots</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Avg Position</span>
            <span className="font-semibold">{(totalVolume / openTrades.length).toFixed(2)} lots</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Active Symbols</span>
            <span className="font-semibold">{new Set(openTrades.map(t => t.symbol)).size}</span>
          </div>
        </div>

        <Separator className="mb-6" />

        {/* Positions Table */}
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Entry Price</TableHead>
                <TableHead>Current Price</TableHead>
                <TableHead>P&L</TableHead>
                <TableHead>Pips</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {openTrades.map((trade) => {
                const livePnL = getLivePnL(trade);
                return (
                <TableRow 
                  key={trade.id}
                  className={selectedTrade === trade.id ? "bg-muted/50" : ""}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{trade.symbol}</span>
                      {trade.stop_loss > 0 && (
                        <Badge variant="outline" className="text-xs">SL</Badge>
                      )}
                      {trade.take_profit > 0 && (
                        <Badge variant="outline" className="text-xs">TP</Badge>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge 
                      variant={trade.trade_type === 'buy' ? 'default' : 'destructive'}
                      className="capitalize"
                    >
                      {trade.trade_type}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="font-mono">
                    {trade.lot_size.toFixed(2)}
                  </TableCell>
                  
                  <TableCell className="font-mono">
                    {trade.entry_price.toFixed(5)}
                  </TableCell>
                  
                  <TableCell className="font-mono">
                    <div className="flex items-center gap-1">
                      {livePnL.currentPrice.toFixed(5)}
                      {currentTick && (
                        <div className="flex items-center gap-1">
                          {trade.trade_type === 'buy' ? 
                            livePnL.currentPrice > trade.entry_price ? 
                              <TrendingUp className="h-3 w-3 text-green-500" /> : 
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            :
                            livePnL.currentPrice < trade.entry_price ? 
                              <TrendingUp className="h-3 w-3 text-green-500" /> : 
                              <TrendingDown className="h-3 w-3 text-red-500" />
                          }
                          <Badge variant="outline" className="text-xs">LIVE</Badge>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className={`font-semibold ${getPnLColor(livePnL.pnl)}`}>
                      {livePnL.pnl >= 0 ? '+' : ''}${livePnL.pnl.toFixed(2)}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className={`font-mono ${getPnLColor(livePnL.pips)}`}>
                      {livePnL.pips >= 0 ? '+' : ''}{livePnL.pips.toFixed(1)}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(trade.entry_time)}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCloseTrade(trade.id)}
                        disabled={isClosingTrade}
                        className="h-8 px-2"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedTrade(selectedTrade === trade.id ? null : trade.id)}
                        className="h-8 px-2"
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Position Details Panel */}
        {selectedTrade && (
          <>
            <Separator className="my-4" />
            {(() => {
              const trade = openTrades.find(t => t.id === selectedTrade);
              if (!trade) return null;
              
              return (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-semibold mb-3">Position Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Trade ID</p>
                      <p className="font-mono text-xs">{trade.id.slice(0, 8)}...</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Entry Time</p>
                      <p>{new Date(trade.entry_time).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stop Loss</p>
                      <p className="font-mono">{trade.stop_loss > 0 ? trade.stop_loss.toFixed(5) : 'None'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Take Profit</p>
                      <p className="font-mono">{trade.take_profit > 0 ? trade.take_profit.toFixed(5) : 'None'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Lot Size</p>
                      <p>{trade.lot_size.toFixed(2)} lots</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Commission</p>
                      <p>${(trade.commission || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Swap</p>
                      <p>${(trade.swap || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Entry Time</p>
                      <p className="truncate">{new Date(trade.entry_time).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </CardContent>
    </Card>
  );
};