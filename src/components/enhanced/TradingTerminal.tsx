// Enhanced MetaTrader 4 Trading Terminal - Phase 1 Implementation
// Complete trading interface with all MT4 features

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, TrendingDown, DollarSign, Clock, Target, BarChart3,
  Plus, X, Edit3, AlertTriangle, CheckCircle, Timer, Zap, Activity,
  PieChart, LineChart, Calendar, Settings, RefreshCw, Play, Pause,
  Bell, TrendingDown as ArrowDown, TrendingUp as ArrowUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MarketWatch } from './MarketWatch';
import { OrderEntry } from './OrderEntry';
import { PendingOrders } from './PendingOrders';
import { AdvancedChart } from './AdvancedChart';
import { AccountInfo } from './AccountInfo';
import { TradingHistory } from './TradingHistory';
import RiskManagementPanel from './RiskManagementPanel';
import AutomationPanel from './AutomationPanel';
import EnhancedTickDisplay from './EnhancedTickDisplay';
import DiagnosticsPanel from './DiagnosticsPanel';
import { RealTimePriceTicker } from './RealTimePriceTicker';
import { TradeModificationDialog } from './TradeModificationDialog';

import { LotSizeManager } from './LotSizeManager';
import { AccountDefaultsManager } from './AccountDefaultsManager';
import { PreflightMonitor } from './PreflightMonitor';
import { IntelligenceWidgets } from './IntelligenceWidgets';
import { IntelligencePositionSizer } from './IntelligencePositionSizer';

interface TradingInstrument {
  symbol: string;
  display_name: string;
  instrument_type: string;
  pip_size: number;
  typical_spread: number;
  min_lot_size: number;
  max_lot_size: number;
  lot_step: number;
  contract_size: number;
  margin_percentage: number;
  bid_price?: number;
  ask_price?: number;
  change?: number;
  change_percent?: number;
}

interface Portfolio {
  id: string;
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  floating_pnl: number;
  margin_level: number;
  account_type: string;
  account_currency: string;
  leverage: number;
  account_number: number;
  account_name: string;
  account_server: string;
  account_company: string;
  daily_pnl_today: number;
  max_drawdown: number;
  current_drawdown: number;
  risk_per_trade: number;
  max_open_positions: number;
  daily_loss_limit: number;
  max_drawdown_limit: number;
  margin_call_level: number;
  stop_out_level: number;
}

interface Trade {
  id: string;
  symbol: string;
  trade_type: 'buy' | 'sell';
  lot_size: number;
  entry_price: number;
  current_price?: number;
  stop_loss: number;
  take_profit: number;
  unrealized_pnl?: number;
  profit_pips?: number;
  entry_time: string;
  status: string;
  order_type: string;
  magic_number?: number;
  comment?: string;
  trailing_stop_distance?: number;
  break_even_triggered?: boolean;
}

interface PendingOrder {
  id: string;
  symbol: string;
  order_type: string;
  trade_type: 'buy' | 'sell';
  lot_size: number;
  trigger_price: number;
  stop_loss?: number;
  take_profit?: number;
  expiry_time?: string;
  status: string;
  created_at: string;
}

const TradingTerminal: React.FC = () => {
  // State management
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [instruments, setInstruments] = useState<TradingInstrument[]>([]);
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('EUR/USD');
  const [loading, setLoading] = useState(true);
  const [autoTradingEnabled, setAutoTradingEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newsAlerts, setNewsAlerts] = useState(true);

  // Dialog states
  const [showOrderEntry, setShowOrderEntry] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showTradeModification, setShowTradeModification] = useState(false);
  const [selectedTradeForModification, setSelectedTradeForModification] = useState<Trade | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    initializeTradingTerminal();
    
    // Set up real-time subscriptions
    const tradesChannel = supabase
      .channel('enhanced-trading-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'shadow_trades' },
        () => loadOpenTrades()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'global_trading_account' },
        () => loadPortfolio()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pending_orders' },
        () => loadPendingOrders()
      )
      .subscribe();

    // Price update interval
    const priceInterval = setInterval(updateMarketPrices, 1000);

    return () => {
      clearInterval(priceInterval);
      supabase.removeChannel(tradesChannel);
    };
  }, []);

  const initializeTradingTerminal = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPortfolio(),
        loadTradingInstruments(),
        loadOpenTrades(),
        loadPendingOrders()
      ]);
    } catch (error) {
      console.error('Error initializing trading terminal:', error);
      toast.error('Failed to initialize trading terminal');
    } finally {
      setLoading(false);
    }
  };

  const loadPortfolio = async () => {
    try {
      let sessionId = localStorage.getItem('session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('session_id', sessionId);
      }

      const { data, error } = await supabase.rpc('get_global_trading_account');

      if (error) throw error;

      const account = Array.isArray(data) ? data[0] : data;
      if (account) {
        setPortfolio(account as any);
      }
    } catch (error) {
      console.error('Error loading portfolio:', error);
      toast.error('Failed to load account information');
    }
  };

  const loadTradingInstruments = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_instruments')
        .select('*')
        .eq('is_active', true)
        .order('instrument_type', { ascending: true });

      if (error) throw error;
      setInstruments(data || []);
    } catch (error) {
      console.error('Error loading instruments:', error);
      toast.error('Failed to load trading instruments');
    }
  };

  const loadOpenTrades = async () => {
    try {
      if (!portfolio) return;

      const { data, error } = await supabase
        .from('shadow_trades')
        .select('*')
        .eq('portfolio_id', portfolio.id)
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

  const loadPendingOrders = async () => {
    try {
      if (!portfolio) return;

      const { data, error } = await supabase
        .from('pending_orders')
        .select('*')
        .eq('portfolio_id', portfolio.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingOrders((data || []).map(order => ({
        ...order,
        trade_type: order.trade_type as 'buy' | 'sell'
      })));
    } catch (error) {
      console.error('Error loading pending orders:', error);
      setPendingOrders([]);
    }
  };

  const updateMarketPrices = useCallback(async () => {
    try {
      // Get latest tick data from our real-time feed
      const { data: latestTick, error } = await supabase
        .from('tick_data')
        .select('bid, ask, spread, timestamp')
        .eq('symbol', 'EUR/USD')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (!error && latestTick) {
        setInstruments(prev => prev.map(instrument => 
          instrument.symbol === 'EUR/USD' 
            ? {
                ...instrument,
                bid_price: latestTick.bid,
                ask_price: latestTick.ask,
                typical_spread: latestTick.spread * 10000, // Convert to pips
                change: latestTick.bid - (instrument.bid_price || latestTick.bid),
                change_percent: ((latestTick.bid - (instrument.bid_price || latestTick.bid)) / latestTick.bid) * 100,
                last_update: new Date(latestTick.timestamp)
              }
            : instrument
        ));
      }
    } catch (error) {
      console.error('Error updating market prices:', error);
    }
  }, [supabase]);

  const executeMarketOrder = async (orderData: any) => {
    try {
      if (!portfolio) throw new Error('No portfolio found');

      const response = await supabase.functions.invoke('enhanced-trading', {
        body: {
          action: 'execute_market_order',
          portfolioId: portfolio.id,
          ...orderData
        }
      });

      if (response.data?.success) {
        toast.success('Order executed successfully!');
        await Promise.all([loadOpenTrades(), loadPortfolio()]);
        setShowOrderEntry(false);
      } else {
        throw new Error(response.data?.error || 'Failed to execute order');
      }
    } catch (error) {
      console.error('Error executing market order:', error);
      toast.error('Failed to execute order');
    }
  };

  const placePendingOrder = async (orderData: any) => {
    try {
      if (!portfolio) throw new Error('No portfolio found');

      const response = await supabase.functions.invoke('enhanced-trading', {
        body: {
          action: 'place_pending_order',
          portfolioId: portfolio.id,
          ...orderData
        }
      });

      if (response.data?.success) {
        toast.success('Pending order placed successfully!');
        await loadPendingOrders();
        setShowOrderEntry(false);
      } else {
        throw new Error(response.data?.error || 'Failed to place pending order');
      }
    } catch (error) {
      console.error('Error placing pending order:', error);
      toast.error('Failed to place pending order');
    }
  };

  const handleCloseTrade = async (tradeId: string) => {
    try {
      const currentPrice = instruments.find(i => i.symbol === 'EUR/USD')?.bid_price || 1.17000;
      
      const { data, error } = await supabase.functions.invoke('manage-trades', {
        body: {
          action: 'close_trade',
          tradeId,
          currentPrice,
          closeReason: 'manual'
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Trade closed with P&L: $${data.data?.profit?.toFixed(2) || '0.00'}`);
        
        // Refresh data
        await Promise.all([loadOpenTrades(), loadPortfolio()]);
      } else {
        throw new Error(data?.error || 'Failed to close trade');
      }
    } catch (error) {
      console.error('Error closing trade:', error);
      toast.error('Failed to close trade. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Initializing Trading Terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">MetaTrader 4 Terminal</h1>
            <Badge variant={autoTradingEnabled ? "default" : "secondary"}>
              {autoTradingEnabled ? 'Auto Trading On' : 'Auto Trading Off'}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoTradingEnabled(!autoTradingEnabled)}
            >
              {autoTradingEnabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              <Bell className={`h-4 w-4 ${soundEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAccountSettings(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Trading Interface */}
      <div className="grid grid-cols-12 gap-4 p-4 h-[calc(100vh-80px)]">
        {/* Left Sidebar - Market Watch & Account Info */}
        <div className="col-span-3 space-y-4">
          <AccountInfo portfolio={portfolio} />
          
          {/* Intelligence Position Sizer */}
          {portfolio && (
            <IntelligencePositionSizer 
              symbol={selectedSymbol}
              accountBalance={portfolio.balance}
              baseRiskPercent={portfolio.risk_per_trade || 2}
              onRecommendationChange={(rec) => {
                console.log('Intelligence recommendation:', rec);
              }}
            />
          )}
          
          <RealTimePriceTicker 
            symbols={['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF']}
            onPriceUpdate={(tick) => {
              // Update current prices for real-time calculations
              setInstruments(prev => prev.map(inst => 
                inst.symbol === tick.symbol 
                  ? { ...inst, bid_price: tick.bid, ask_price: tick.ask }
                  : inst
              ));
            }}
          />
          <MarketWatch 
            instruments={instruments}
            selectedSymbol={selectedSymbol}
            onSymbolSelect={setSelectedSymbol}
          />
        </div>

        {/* Center - Charts & Order Entry */}
        <div className="col-span-6 space-y-4">
          <AdvancedChart 
            symbol={selectedSymbol}
            trades={openTrades}
            pendingOrders={pendingOrders}
          />
          
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowOrderEntry(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Order
            </Button>
            <Button variant="outline">
              Close All
            </Button>
            <Button variant="outline">
              Modify All
            </Button>
          </div>
        </div>

        {/* Right Sidebar - Enhanced Panels */}
        <div className="col-span-3 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="preflight">Preflight</TabsTrigger>
              <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trades">Trades</TabsTrigger>
            </TabsList>
            
            <TabsContent value="preflight" className="mt-4">
              <PreflightMonitor />
            </TabsContent>

            <TabsContent value="intelligence" className="mt-4">
              <IntelligenceWidgets 
                symbol={selectedSymbol}
                onSignalExecute={executeMarketOrder}
                className="h-[400px] overflow-y-auto"
              />
            </TabsContent>

            <TabsContent value="overview" className="mt-4">
              <div className="space-y-4">
                <EnhancedTickDisplay 
                  trades={openTrades}
                  onTickUpdate={(tick) => {
                    console.log('Tick updated in terminal:', tick);
                  }}
                />
                <TradingHistory portfolioId={portfolio?.id} />
              </div>
            </TabsContent>
            
            <TabsContent value="trades" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Open Positions ({openTrades.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[350px]">
                    {openTrades.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No open positions
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {openTrades.map((trade) => (
                          <div key={trade.id} className="p-3 border rounded-lg text-xs">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{trade.symbol}</span>
                                <Badge variant={trade.trade_type === 'buy' ? 'default' : 'destructive'}>
                                  {trade.trade_type.toUpperCase()}
                                </Badge>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTradeForModification(trade);
                                    setShowTradeModification(true);
                                  }}
                                  className="h-6 text-xs"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleCloseTrade(trade.id)}
                                  className="h-6 text-xs"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div>
                                <span className="text-muted-foreground">Lots:</span>
                                <span className="ml-1 font-medium">{trade.lot_size}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Entry:</span>
                                <span className="ml-1 font-mono">{trade.entry_price.toFixed(5)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Current:</span>
                                <span className="ml-1 font-mono">{trade.current_price?.toFixed(5) || '-'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">SL/TP:</span>
                                <span className="ml-1 font-mono text-xs">
                                  {trade.stop_loss.toFixed(5)}/{trade.take_profit.toFixed(5)}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-muted-foreground">P&L:</span>
                                <span className={`ml-1 font-medium ${(trade.unrealized_pnl || 0) >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                                  ${trade.unrealized_pnl?.toFixed(2) || '0.00'}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Pips:</span>
                                <span className={`ml-1 font-medium ${(trade.profit_pips || 0) >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                                  {trade.profit_pips?.toFixed(1) || '0.0'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            
          </Tabs>
        </div>
      </div>

      {/* Order Entry Dialog */}
      <Dialog open={showOrderEntry} onOpenChange={setShowOrderEntry}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Order</DialogTitle>
            <DialogDescription>
              Place a new market order or set up a pending order
            </DialogDescription>
          </DialogHeader>
          <OrderEntry
            symbol={selectedSymbol}
            instruments={instruments}
            onExecuteMarketOrder={executeMarketOrder}
            onPlacePendingOrder={placePendingOrder}
            onCancel={() => setShowOrderEntry(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Trade Modification Dialog */}
      <TradeModificationDialog
        trade={selectedTradeForModification}
        isOpen={showTradeModification}
        onClose={() => {
          setShowTradeModification(false);
          setSelectedTradeForModification(null);
        }}
        onTradeModified={() => {
          loadOpenTrades();
          loadPortfolio();
        }}
        currentPrice={instruments.find(i => i.symbol === selectedTradeForModification?.symbol)?.bid_price}
      />
    </div>
  );
};

export default TradingTerminal;