// TradingHistory Component - Complete trading history with analytics

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, TrendingUp, TrendingDown, Download, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TradeHistoryItem {
  id: string;
  symbol: string;
  trade_type: string;
  action_type: string;
  lot_size: number;
  execution_price: number;
  profit: number;
  profit_pips: number;
  commission: number;
  swap: number;
  execution_time: string;
  balance_after: number;
}

interface TradingHistoryProps {
  portfolioId?: string;
}

export const TradingHistory: React.FC<TradingHistoryProps> = ({ portfolioId }) => {
  const [history, setHistory] = useState<TradeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    if (portfolioId) {
      loadTradingHistory();
    }
  }, [portfolioId, filter, dateRange]);

  const loadTradingHistory = async () => {
    if (!portfolioId) return;
    
    setLoading(true);
    try {
      // **PHASE 3 FIX**: Query shadow_trades directly, excluding duplicate_cleanup
      let query = supabase
        .from('shadow_trades')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('status', 'closed')
        .neq('exit_reason', 'duplicate_cleanup')
        .order('exit_time', { ascending: false });

      // Apply filters (adapt to shadow_trades columns)
      if (filter === 'close') {
        query = query.in('exit_reason', ['stop_loss', 'take_profit', 'manual', 'trailing_stop', 'ai_exit']);
      } else if (filter === 'open') {
        // Show only recently closed trades that were market entries
        query = query.eq('order_type', 'market');
      }

      // Apply date range using exit_time
      const now = new Date();
      let startDate = new Date();
      switch (dateRange) {
        case '1d':
          startDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
      }
      
      if (dateRange !== 'all') {
        query = query.gte('exit_time', startDate.toISOString());
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      
      // Transform shadow_trades to match TradeHistoryItem interface
      const transformedData: TradeHistoryItem[] = (data || []).map(trade => ({
        id: trade.id,
        symbol: trade.symbol,
        trade_type: trade.trade_type,
        action_type: 'close',
        lot_size: trade.lot_size,
        execution_price: trade.exit_price || trade.entry_price,
        profit: trade.profit || 0,
        profit_pips: trade.profit_pips || 0,
        commission: trade.commission || 0,
        swap: trade.swap || 0,
        execution_time: trade.exit_time || trade.created_at,
        balance_after: 0
      }));
      
      setHistory(transformedData);
    } catch (error) {
      console.error('Error loading trading history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalProfit = () => {
    return history.reduce((sum, item) => sum + (item.profit || 0), 0);
  };

  const getWinRate = () => {
    const closedTrades = history.filter(item => 
      item.action_type === 'close' || item.action_type === 'partial_close'
    );
    const winningTrades = closedTrades.filter(item => (item.profit || 0) > 0);
    return closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
  };

  const getActionBadgeVariant = (actionType: string) => {
    switch (actionType) {
      case 'close': return 'default';
      case 'partial_close': return 'secondary';
      case 'modify': return 'outline';
      default: return 'default';
    }
  };

  const getTradeTypeBadgeVariant = (tradeType: string) => {
    return tradeType === 'buy' ? 'default' : 'destructive';
  };

  const getProfitColor = (profit: number) => {
    return profit >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Trading History</CardTitle>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="close">Closed</SelectItem>
              <SelectItem value="partial_close">Partial</SelectItem>
              <SelectItem value="modify">Modified</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">1D</SelectItem>
              <SelectItem value="7d">7D</SelectItem>
              <SelectItem value="30d">30D</SelectItem>
              <SelectItem value="90d">90D</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Total P&L</div>
            <div className={`font-medium ${getProfitColor(getTotalProfit())}`}>
              {formatCurrency(getTotalProfit())}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Win Rate</div>
            <div className="font-medium">
              {getWinRate().toFixed(1)}%
            </div>
          </div>
        </div>

        {/* History List */}
        <ScrollArea className="h-[200px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No trading history</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <div key={item.id} className="p-2 border rounded-lg text-xs">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.symbol}</span>
                      <Badge 
                        variant={getActionBadgeVariant(item.action_type)}
                        className="text-xs"
                      >
                        {item.action_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {item.trade_type && (
                        <Badge 
                          variant={getTradeTypeBadgeVariant(item.trade_type)}
                          className="text-xs"
                        >
                          {item.trade_type.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground">
                      {formatTime(item.execution_time)}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Lots:</span>
                      <span className="ml-1 font-medium">{item.lot_size}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Price:</span>
                      <span className="ml-1 font-medium">{item.execution_price.toFixed(5)}</span>
                    </div>
                    
                    {item.profit !== undefined && (
                      <div>
                        <span className="text-muted-foreground">P&L:</span>
                        <span className={`ml-1 font-medium ${getProfitColor(item.profit)}`}>
                          {formatCurrency(item.profit)}
                        </span>
                      </div>
                    )}
                    
                    {item.profit_pips !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Pips:</span>
                        <span className={`ml-1 font-medium ${getProfitColor(item.profit_pips)}`}>
                          {item.profit_pips.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Additional Info */}
                  {(item.commission || item.swap) && (
                    <div className="mt-2 pt-2 border-t border-muted/50">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        {item.commission > 0 && (
                          <span>Commission: {formatCurrency(item.commission)}</span>
                        )}
                        {item.swap !== 0 && (
                          <span>Swap: {formatCurrency(item.swap)}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Balance After */}
                  <div className="mt-2 pt-2 border-t border-muted/50">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Balance After:</span>
                      <span className="font-medium">{formatCurrency(item.balance_after)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};