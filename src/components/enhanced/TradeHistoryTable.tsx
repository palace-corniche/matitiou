import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  History,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Download,
  Calendar,
  DollarSign,
  Target,
  Clock
} from 'lucide-react';
import { TradeDetailsDialog } from './TradeDetailsDialog';

interface TradeHistoryItem {
  id: string;
  action_type: string;
  symbol: string;
  trade_type: string;
  lot_size: number;
  execution_price: number;
  profit?: number;
  profit_pips?: number;
  commission?: number;
  swap?: number;
  balance_before: number;
  balance_after: number;
  execution_time: string;
  original_trade_id?: string;
}

interface TradeHistoryTableProps {
  tradeHistory: TradeHistoryItem[];
  className?: string;
}

export const TradeHistoryTable: React.FC<TradeHistoryTableProps> = ({
  tradeHistory,
  className = ""
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterSymbol, setFilterSymbol] = useState('all');
  const [sortBy, setSortBy] = useState('execution_time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort trades
  const filteredTrades = useMemo(() => {
    let filtered = tradeHistory.filter(trade => {
      const matchesSearch = 
        trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trade.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trade.trade_type.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAction = filterAction === 'all' || trade.action_type === filterAction;
      const matchesSymbol = filterSymbol === 'all' || trade.symbol === filterSymbol;
      
      return matchesSearch && matchesAction && matchesSymbol;
    });

    // Sort trades
    filtered.sort((a, b) => {
      let aVal: any = a[sortBy as keyof TradeHistoryItem];
      let bVal: any = b[sortBy as keyof TradeHistoryItem];
      
      if (sortBy === 'execution_time') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [tradeHistory, searchTerm, filterAction, filterSymbol, sortBy, sortOrder]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const closedTrades = filteredTrades.filter(t => t.action_type === 'close');
    const totalTrades = closedTrades.length;
    const winningTrades = closedTrades.filter(t => (t.profit || 0) > 0).length;
    const losingTrades = closedTrades.filter(t => (t.profit || 0) < 0).length;
    const totalProfit = closedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const totalVolume = filteredTrades.reduce((sum, t) => sum + t.lot_size, 0);
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    
    return {
      totalTrades,
      winningTrades,
      losingTrades,
      totalProfit,
      totalVolume,
      winRate
    };
  }, [filteredTrades]);

  // Get unique symbols for filter
  const uniqueSymbols = useMemo(() => {
    return Array.from(new Set(tradeHistory.map(t => t.symbol)));
  }, [tradeHistory]);

  const getPnLColor = (profit: number) => {
    if (profit > 0) return "text-green-600";
    if (profit < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'close': return 'default';
      case 'open': return 'secondary';
      case 'partial_close': return 'outline';
      default: return 'secondary';
    }
  };

  const exportData = () => {
    const csvContent = [
      ['Date', 'Action', 'Symbol', 'Type', 'Volume', 'Price', 'P&L', 'Pips', 'Commission', 'Swap', 'Balance'].join(','),
      ...filteredTrades.map(trade => [
        new Date(trade.execution_time).toISOString(),
        trade.action_type,
        trade.symbol,
        trade.trade_type,
        trade.lot_size,
        trade.execution_price,
        trade.profit || 0,
        trade.profit_pips || 0,
        trade.commission || 0,
        trade.swap || 0,
        trade.balance_after
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `trade_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (tradeHistory.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Trade History (0)
          </CardTitle>
          <CardDescription>No trade history available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Trade History</h3>
            <p className="text-muted-foreground">
              Your completed trades will appear here
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
              <History className="h-5 w-5" />
              Trade History ({filteredTrades.length})
            </CardTitle>
            <CardDescription>Complete trading activity log</CardDescription>
          </div>
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Total P&L</span>
            <span className={`font-bold ${getPnLColor(summaryStats.totalProfit)}`}>
              {summaryStats.totalProfit >= 0 ? '+' : ''}${summaryStats.totalProfit.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Win Rate</span>
            <span className="font-bold text-primary">{summaryStats.winRate.toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Total Trades</span>
            <span className="font-bold">{summaryStats.totalTrades}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Volume</span>
            <span className="font-bold">{summaryStats.totalVolume.toFixed(2)} lots</span>
          </div>
        </div>

        <Separator className="mb-6" />

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search trades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="close">Close</SelectItem>
              <SelectItem value="partial_close">Partial Close</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterSymbol} onValueChange={setFilterSymbol}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Symbol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Symbols</SelectItem>
              {uniqueSymbols.map(symbol => (
                <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
            const [field, order] = value.split('-');
            setSortBy(field);
            setSortOrder(order as 'asc' | 'desc');
          }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="execution_time-desc">Newest First</SelectItem>
              <SelectItem value="execution_time-asc">Oldest First</SelectItem>
              <SelectItem value="profit-desc">Highest P&L</SelectItem>
              <SelectItem value="profit-asc">Lowest P&L</SelectItem>
              <SelectItem value="lot_size-desc">Largest Volume</SelectItem>
              <SelectItem value="symbol-asc">Symbol A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Trade History Table */}
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>P&L</TableHead>
                <TableHead>Pips</TableHead>
                <TableHead>Fees</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {new Date(trade.execution_time).toLocaleString()}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant={getActionBadgeVariant(trade.action_type)} className="capitalize">
                      {trade.action_type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="font-medium">{trade.symbol}</TableCell>
                  
                  <TableCell>
                    <Badge 
                      variant={trade.trade_type === 'buy' ? 'default' : 'destructive'}
                      className="capitalize"
                    >
                      {trade.trade_type}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="font-mono">{trade.lot_size.toFixed(2)}</TableCell>
                  
                  <TableCell className="font-mono">{trade.execution_price.toFixed(5)}</TableCell>
                  
                  <TableCell>
                    <div className={`font-semibold ${getPnLColor(trade.profit || 0)}`}>
                      {(trade.profit || 0) >= 0 ? '+' : ''}${(trade.profit || 0).toFixed(2)}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className={`font-mono text-sm ${getPnLColor(trade.profit_pips || 0)}`}>
                      {(trade.profit_pips || 0) >= 0 ? '+' : ''}{(trade.profit_pips || 0).toFixed(1)}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-sm">
                    <div className="space-y-1">
                      {(trade.commission || 0) !== 0 && (
                        <div>C: ${(trade.commission || 0).toFixed(2)}</div>
                      )}
                      {(trade.swap || 0) !== 0 && (
                        <div>S: ${(trade.swap || 0).toFixed(2)}</div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell className="font-mono">${trade.balance_after.toFixed(2)}</TableCell>
                  
                  <TableCell className="text-right">
                    <TradeDetailsDialog 
                      trade={{
                        id: trade.id,
                        symbol: trade.symbol,
                        trade_type: trade.trade_type,
                        entry_price: trade.execution_price,
                        exit_price: trade.execution_price,
                        entry_time: trade.execution_time,
                        exit_time: trade.execution_time,
                        exit_reason: trade.action_type,
                        lot_size: trade.lot_size,
                        pnl: trade.profit,
                        profit_pips: trade.profit_pips,
                        commission: trade.commission,
                        swap: trade.swap,
                        status: 'closed'
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {filteredTrades.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Filter className="h-8 w-8 mx-auto mb-2" />
            <p>No trades match your current filters</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};