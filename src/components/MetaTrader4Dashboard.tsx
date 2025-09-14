// MetaTrader 4-like Shadow Trading Dashboard
// Complete trading interface with real-time P&L, manual closing, lot size selection

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, TrendingDown, DollarSign, Clock, Target, BarChart3,
  X, Edit3, AlertTriangle, CheckCircle, Timer, Zap, Activity,
  PieChart, LineChart, Calendar, Settings, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { unifiedMarketData, UnifiedTick } from '@/services/unifiedMarketData';

interface Trade {
  id: string;
  symbol: string;
  trade_type: 'buy' | 'sell';
  lot_size: number;
  remaining_lot_size: number;
  entry_price: number;
  current_price?: number;
  stop_loss: number;
  take_profit: number;
  unrealized_pnl?: number;
  profit_pips?: number;
  entry_time: string;
  status: string;
  commission?: number;
  swap?: number;
  slippage_pips?: number;
}

interface Portfolio {
  id: string;
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  floating_pnl: number;
  win_rate: number;
  profit_factor: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  current_drawdown: number;
  max_drawdown: number;
  largest_win: number;
  largest_loss: number;
  consecutive_wins: number;
  consecutive_losses: number;
}

interface LotSizePreset {
  id: string;
  preset_name: string;
  lot_size: number;
  is_default: boolean;
}

const MetaTrader4Dashboard: React.FC = () => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [closedTrades, setClosedTrades] = useState<any[]>([]);
  const [lotSizePresets, setLotSizePresets] = useState<LotSizePreset[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(1.17000);
  const [tickData, setTickData] = useState<UnifiedTick | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  // Form states
  const [closeLotSize, setCloseLotSize] = useState<string>('');
  const [modifyStopLoss, setModifyStopLoss] = useState<string>('');
  const [modifyTakeProfit, setModifyTakeProfit] = useState<string>('');
  const [modifyLotSize, setModifyLotSize] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
    
    // Set up unified market data subscription
    const marketDataUnsubscribe = unifiedMarketData.subscribe({
      onTick: (tick) => {
        setCurrentPrice(tick.price);
        setTickData(tick);
        // Price update received
      },
      onConnectionChange: (connected) => {
        setIsConnected(connected);
        // Market data connection status updated
      },
      onError: (error) => {
        console.error('❌ MetaTrader4 market data error:', error);
        setIsConnected(false);
      }
    });

    // Get initial price
    const initialTick = unifiedMarketData.getLastTick();
    if (initialTick) {
      setCurrentPrice(initialTick.price);
      setTickData(initialTick);
      setIsConnected(unifiedMarketData.getConnectionStatus());
    }
    
    // Set up real-time subscriptions
    const tradesChannel = supabase
      .channel('trades-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'shadow_trades' },
        () => loadOpenTrades()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'shadow_portfolios' },
        () => loadPortfolio()
      )
      .subscribe();

    return () => {
      marketDataUnsubscribe();
      supabase.removeChannel(tradesChannel);
    };
  }, []);

  // Real-time PnL calculation using unified market data
  const updateTradesPnL = useCallback(async () => {
    if (openTrades.length === 0 || !tickData) return;

    try {
      // Update trades with real-time PnL calculation
      const updatedTrades = openTrades.map(trade => {
        // Use bid for buy trades (selling price) and ask for sell trades (buying price)
        const currentPrice = trade.trade_type === 'buy' ? tickData.bid : tickData.ask;
        
        // Calculate pips: (currentPrice - entryPrice) * 10000 for EUR/USD
        let profitPips: number;
        if (trade.trade_type === 'buy') {
          profitPips = (currentPrice - trade.entry_price) * 10000;
        } else {
          profitPips = (trade.entry_price - currentPrice) * 10000;
        }
        
        // Calculate PnL: Pips * lotSize * 0.10 (for EUR/USD, where 0.01 lot = $0.10 per pip)
        const pipValue = trade.lot_size * 10; // $10 per pip for 1 lot
        const unrealizedPnL = (profitPips * pipValue) / 100; // Convert to proper scale

        return {
          ...trade,
          current_price: currentPrice,
          profit_pips: parseFloat(profitPips.toFixed(1)),
          unrealized_pnl: parseFloat(unrealizedPnL.toFixed(2))
        };
      });

      setOpenTrades(updatedTrades);

      // Refresh portfolio to get updated equity
      await loadPortfolio();
      
      // PnL updated for trades
    } catch (error) {
      console.error('Error updating P&L:', error);
    }
  }, [openTrades, tickData]);

  // Real-time P&L updates using unified market data
  useEffect(() => {
    if (openTrades.length > 0 && tickData) {
      updateTradesPnL();
    }
  }, [openTrades.length, tickData, updateTradesPnL]);

  // Helper function to generate unique session ID
  const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Helper function to create default portfolio
  const createDefaultPortfolio = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('shadow_portfolios')
        .insert({
          session_id: sessionId,
          balance: 100000,
          equity: 100000,
          free_margin: 100000,
          max_open_positions: 50,
          risk_per_trade: 0.02,
          auto_trading_enabled: true,
          is_active: true,
          account_type: 'demo',
          account_currency: 'USD',
          leverage: 100,
          initial_deposit: 100000,
          daily_loss_limit: 5000,
          max_drawdown_limit: 20
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating default portfolio:', error);
      throw error;
    }
  };

  const loadDashboardData = async () => {
    try {
      // Ensure we have a session ID and portfolio
      let sessionId = localStorage.getItem('session_id');
      if (!sessionId) {
        sessionId = generateSessionId();
        localStorage.setItem('session_id', sessionId);
      }

      // Load or create portfolio first
      await loadPortfolio();
      
      // Then load other data
      await Promise.all([
        loadOpenTrades(),
        loadClosedTrades(),
        loadLotSizePresets(),
        loadAnalytics()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    }
  };

  const loadPortfolio = async () => {
    try {
      let sessionId = localStorage.getItem('session_id');
      
      // Generate session ID if missing
      if (!sessionId) {
        sessionId = generateSessionId();
        localStorage.setItem('session_id', sessionId);
      }

      // Try to find existing portfolio
      const { data, error } = await supabase
        .from('shadow_portfolios')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // If no portfolio found, create one
      if (!data) {
        // Creating default portfolio
        const newPortfolio = await createDefaultPortfolio(sessionId);
        setPortfolio(newPortfolio);
        toast.success('Welcome! A new trading portfolio has been created for you.');
      } else {
        setPortfolio(data);
      }
    } catch (error) {
      console.error('Error loading portfolio:', error);
      toast.error('Failed to load or create portfolio');
      
      // Set a minimal portfolio to prevent infinite loading
      setPortfolio({
        id: 'error',
        balance: 0,
        equity: 0,
        margin: 0,
        free_margin: 0,
        floating_pnl: 0,
        win_rate: 0,
        profit_factor: 0,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        current_drawdown: 0,
        max_drawdown: 0,
        largest_win: 0,
        largest_loss: 0,
        consecutive_wins: 0,
        consecutive_losses: 0
      });
    }
  };

  const loadOpenTrades = async () => {
    try {
      let sessionId = localStorage.getItem('session_id');
      if (!sessionId) {
        sessionId = generateSessionId();
        localStorage.setItem('session_id', sessionId);
      }

      const { data: portfolioData } = await supabase
        .from('shadow_portfolios')
        .select('id')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .maybeSingle();

      if (!portfolioData) {
        setOpenTrades([]);
        return;
      }

      const { data, error } = await supabase
        .from('shadow_trades')
        .select('*')
        .eq('portfolio_id', portfolioData.id)
        .eq('status', 'open')
        .order('entry_time', { ascending: false });

      if (error) throw error;
      setOpenTrades((data || []).map(trade => ({
        ...trade,
        trade_type: trade.trade_type as 'buy' | 'sell'
      })));
    } catch (error) {
      console.error('Error loading open trades:', error);
      setOpenTrades([]);
    }
  };

  const loadClosedTrades = async () => {
    try {
      let sessionId = localStorage.getItem('session_id');
      if (!sessionId) {
        sessionId = generateSessionId();
        localStorage.setItem('session_id', sessionId);
      }

      const { data: portfolioData } = await supabase
        .from('shadow_portfolios')
        .select('id')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .maybeSingle();

      if (!portfolioData) {
        setClosedTrades([]);
        return;
      }

      const { data, error } = await supabase
        .from('trade_history')
        .select('*')
        .eq('portfolio_id', portfolioData.id)
        .in('action_type', ['close', 'partial_close'])
        .order('execution_time', { ascending: false })
        .limit(50);

      if (error) throw error;
      setClosedTrades(data || []);
    } catch (error) {
      console.error('Error loading closed trades:', error);
      setClosedTrades([]);
    }
  };

  const loadLotSizePresets = async () => {
    try {
      if (!portfolio) return;

      const { data, error } = await supabase
        .from('lot_size_presets')
        .select('*')
        .eq('portfolio_id', portfolio.id)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setLotSizePresets(data || []);
    } catch (error) {
      console.error('Error loading lot size presets:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      let sessionId = localStorage.getItem('session_id');
      if (!sessionId) {
        sessionId = generateSessionId();
        localStorage.setItem('session_id', sessionId);
      }

      const { data: portfolioData } = await supabase
        .from('shadow_portfolios')
        .select('id')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .maybeSingle();

      if (!portfolioData) {
        setAnalytics(null);
        return;
      }

      const response = await supabase.functions.invoke('manage-trades', {
        body: {
          action: 'get_trade_analytics',
          portfolioId: portfolioData.id
        }
      });

      if (response.data?.success) {
        setAnalytics(response.data.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      setAnalytics(null);
    }
  };

  // Remove the old updateRealTimePrice function - now handled by unified market data

  // Remove the old updateRealTimePrice function - now handled by unified market data

  const closeTrade = async () => {
    if (!selectedTrade) return;

    setIsClosing(true);
    try {
      const response = await supabase.functions.invoke('manage-trades', {
        body: {
          action: 'close_trade',
          tradeId: selectedTrade.id,
          closePrice: currentPrice,
          closeLotSize: closeLotSize ? Number(closeLotSize) : null,
          closeReason: 'manual',
          currentPrice
        }
      });

      if (response.data?.success) {
        toast.success('Trade closed successfully!');
        setCloseDialogOpen(false);
        setSelectedTrade(null);
        setCloseLotSize('');
        await Promise.all([loadOpenTrades(), loadClosedTrades(), loadPortfolio()]);
      } else {
        throw new Error(response.data?.error || 'Failed to close trade');
      }
    } catch (error) {
      console.error('Error closing trade:', error);
      toast.error('Failed to close trade');
    } finally {
      setIsClosing(false);
    }
  };

  const modifyTrade = async () => {
    if (!selectedTrade) return;

    setIsModifying(true);
    try {
      const updateData: any = {};
      
      if (modifyStopLoss) updateData.stopLoss = Number(modifyStopLoss);
      if (modifyTakeProfit) updateData.takeProfit = Number(modifyTakeProfit);
      if (modifyLotSize) updateData.lotSize = Number(modifyLotSize);

      const response = await supabase.functions.invoke('manage-trades', {
        body: {
          action: 'modify_trade',
          tradeId: selectedTrade.id,
          ...updateData
        }
      });

      if (response.data?.success) {
        toast.success('Trade modified successfully!');
        setModifyDialogOpen(false);
        setSelectedTrade(null);
        setModifyStopLoss('');
        setModifyTakeProfit('');
        setModifyLotSize('');
        await loadOpenTrades();
      } else {
        throw new Error(response.data?.error || 'Failed to modify trade');
      }
    } catch (error) {
      console.error('Error modifying trade:', error);
      toast.error('Failed to modify trade');
    } finally {
      setIsModifying(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatPips = (pips: number) => {
    return `${pips >= 0 ? '+' : ''}${pips.toFixed(1)} pips`;
  };

  const getTradeColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-600';
    if (pnl < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (!portfolio) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <div className="text-center">
            <h3 className="text-lg font-semibold">Setting up your trading environment...</h3>
            <p className="text-muted-foreground">
              Creating portfolio and loading market data
            </p>
          </div>
          <Button onClick={loadDashboardData} variant="outline" className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Setup
          </Button>
        </div>
      </div>
    );
  }

  // Error state for portfolio
  if (portfolio.id === 'error') {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <AlertTriangle className="w-8 h-8 text-destructive" />
          <div className="text-center">
            <h3 className="text-lg font-semibold">Unable to load portfolio</h3>
            <p className="text-muted-foreground">
              There was an error setting up your trading environment. Please try again.
            </p>
          </div>
          <Button onClick={() => {
            localStorage.removeItem('session_id');
            window.location.reload();
          }} variant="default">
            <RefreshCw className="w-4 h-4 mr-2" />
            Start Fresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-blue-500" />
            MetaTrader 4 Shadow Trading
          </h1>
          <p className="text-muted-foreground">
            Professional trading dashboard with real-time P&L
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">EUR/USD</div>
            <div className="text-2xl font-bold">{currentPrice.toFixed(5)}</div>
          </div>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Account Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(portfolio.balance)}</div>
            <p className="text-xs text-muted-foreground">Account balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(portfolio.equity)}</div>
            <p className="text-xs text-muted-foreground">
              Floating: {formatCurrency(portfolio.floating_pnl || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Margin</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(portfolio.free_margin)}</div>
            <p className="text-xs text-muted-foreground">Available margin</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(portfolio.win_rate * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {portfolio.winning_trades}W / {portfolio.losing_trades}L
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolio.profit_factor.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Risk-reward ratio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drawdown</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {portfolio.current_drawdown.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Max: {portfolio.max_drawdown.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trading Interface */}
      <Tabs defaultValue="trades" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trades">Open Trades ({openTrades.length})</TabsTrigger>
          <TabsTrigger value="history">Trade History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="trades">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Open Positions
              </CardTitle>
              <CardDescription>
                Real-time P&L updates and manual trade management
              </CardDescription>
            </CardHeader>
            <CardContent>
              {openTrades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No open positions</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {openTrades.map((trade) => (
                      <div key={trade.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${
                            trade.trade_type === 'buy' ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          
                          <div>
                            <div className="font-medium">
                              {trade.trade_type.toUpperCase()} {trade.remaining_lot_size} {trade.symbol}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Entry: {trade.entry_price.toFixed(5)} | 
                              SL: {trade.stop_loss.toFixed(5)} | 
                              TP: {trade.take_profit.toFixed(5)}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`text-lg font-bold ${getTradeColor(trade.unrealized_pnl || 0)}`}>
                            {formatCurrency(trade.unrealized_pnl || 0)}
                          </div>
                          <div className={`text-sm ${getTradeColor(trade.profit_pips || 0)}`}>
                            {formatPips(trade.profit_pips || 0)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Dialog open={modifyDialogOpen && selectedTrade?.id === trade.id} onOpenChange={setModifyDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTrade(trade);
                                  setModifyStopLoss(trade.stop_loss.toString());
                                  setModifyTakeProfit(trade.take_profit.toString());
                                  setModifyLotSize(trade.remaining_lot_size.toString());
                                }}
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Modify Trade</DialogTitle>
                                <DialogDescription>
                                  Modify stop loss, take profit, or lot size
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="modify-sl">Stop Loss</Label>
                                  <Input
                                    id="modify-sl"
                                    type="number"
                                    step="0.00001"
                                    value={modifyStopLoss}
                                    onChange={(e) => setModifyStopLoss(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="modify-tp">Take Profit</Label>
                                  <Input
                                    id="modify-tp"
                                    type="number"
                                    step="0.00001"
                                    value={modifyTakeProfit}
                                    onChange={(e) => setModifyTakeProfit(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="modify-lot">Lot Size</Label>
                                  <Input
                                    id="modify-lot"
                                    type="number"
                                    step="0.01"
                                    value={modifyLotSize}
                                    onChange={(e) => setModifyLotSize(e.target.value)}
                                  />
                                </div>
                                <Button onClick={modifyTrade} disabled={isModifying} className="w-full">
                                  {isModifying ? 'Modifying...' : 'Modify Trade'}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog open={closeDialogOpen && selectedTrade?.id === trade.id} onOpenChange={setCloseDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setSelectedTrade(trade);
                                  setCloseLotSize('');
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Close Trade</DialogTitle>
                                <DialogDescription>
                                  Close trade at current market price: {currentPrice.toFixed(5)}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="close-lot">Lot Size to Close (leave empty for full close)</Label>
                                  <Input
                                    id="close-lot"
                                    type="number"
                                    step="0.01"
                                    max={trade.remaining_lot_size}
                                    value={closeLotSize}
                                    onChange={(e) => setCloseLotSize(e.target.value)}
                                    placeholder={`Max: ${trade.remaining_lot_size}`}
                                  />
                                </div>
                                <Alert>
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertDescription>
                                    This will close {closeLotSize || 'all'} lots at market price. 
                                    Current P&L: {formatCurrency(trade.unrealized_pnl || 0)}
                                  </AlertDescription>
                                </Alert>
                                <Button onClick={closeTrade} disabled={isClosing} className="w-full">
                                  {isClosing ? 'Closing...' : 'Close Trade'}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Trade History
              </CardTitle>
              <CardDescription>
                Complete history of all closed trades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {closedTrades.map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          trade.trade_type === 'buy' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <div className="font-medium">
                            {trade.trade_type.toUpperCase()} {trade.lot_size} {trade.symbol}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(trade.execution_time).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`font-bold ${getTradeColor(trade.profit)}`}>
                          {formatCurrency(trade.profit)}
                        </div>
                        <div className={`text-sm ${getTradeColor(trade.profit_pips || 0)}`}>
                          {formatPips(trade.profit_pips || 0)}
                        </div>
                      </div>

                      <Badge variant={trade.profit > 0 ? 'default' : 'destructive'}>
                        {trade.action_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium">Largest Win</div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(portfolio.largest_win)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Largest Loss</div>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(portfolio.largest_loss)}
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium">Consecutive Wins</div>
                    <div className="text-2xl font-bold text-green-600">
                      {portfolio.consecutive_wins}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Consecutive Losses</div>
                    <div className="text-2xl font-bold text-red-600">
                      {portfolio.consecutive_losses}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Margin Level</span>
                    <span>{portfolio.margin > 0 ? ((portfolio.equity / portfolio.margin) * 100).toFixed(1) : '0.0'}%</span>
                  </div>
                  <Progress value={portfolio.margin > 0 ? (portfolio.equity / portfolio.margin) * 100 : 0} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Current Drawdown</span>
                    <span>{portfolio.current_drawdown.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={portfolio.current_drawdown} 
                    className="h-2" 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MetaTrader4Dashboard;