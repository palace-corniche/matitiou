import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Target, 
  TrendingUp, 
  Shield, 
  AlertCircle,
  Save,
  RotateCcw,
  Calculator
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AccountDefaults {
  portfolio_id: string;
  default_lot_size: number;
  risk_per_trade_percent: number;
  max_spread_pips: number;
  auto_lot_sizing: boolean;
  auto_sl_tp: boolean;
  default_sl_pips: number;
  default_tp_pips: number;
  max_open_trades: number;
  trading_hours_enabled: boolean;
  trading_start_hour: number;
  trading_end_hour: number;
  allowed_symbols: string[];
  blacklist_symbols: string[];
}

interface AccountDefaultsManagerProps {
  portfolioId: string;
  portfolioBalance: number;
  portfolioLeverage: number;
  accountCurrency: string;
  onDefaultsUpdate?: () => void;
}

export const AccountDefaultsManager: React.FC<AccountDefaultsManagerProps> = ({
  portfolioId,
  portfolioBalance,
  portfolioLeverage,
  accountCurrency,
  onDefaultsUpdate
}) => {
  const [defaults, setDefaults] = useState<AccountDefaults>({
    portfolio_id: portfolioId,
    default_lot_size: 0.01,
    risk_per_trade_percent: 2.0,
    max_spread_pips: 3.0,
    auto_lot_sizing: false,
    auto_sl_tp: false,
    default_sl_pips: 50,
    default_tp_pips: 100,
    max_open_trades: 10,
    trading_hours_enabled: false,
    trading_start_hour: 8,
    trading_end_hour: 17,
    allowed_symbols: ['EUR/USD', 'GBP/USD', 'USD/JPY'],
    blacklist_symbols: []
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const supa = supabase as any;

  useEffect(() => {
    loadAccountDefaults();
  }, [portfolioId]);

  const loadAccountDefaults = async () => {
    try {
      setLoading(true);
      
      // Try to get defaults using RPC function
      const { data: defaultsData, error: rpcError } = await supa.rpc('get_account_defaults' as any, { p_portfolio_id: portfolioId });

      if (!rpcError && defaultsData && defaultsData.length > 0) {
        const dbDefaults = defaultsData[0];
        setDefaults({
          portfolio_id: portfolioId,
          default_lot_size: dbDefaults.default_lot_size || 0.01,
          risk_per_trade_percent: dbDefaults.risk_per_trade_percent || 2.0,
          max_spread_pips: dbDefaults.max_spread_pips || 3.0,
          auto_lot_sizing: dbDefaults.auto_lot_sizing || false,
          auto_sl_tp: dbDefaults.auto_sl_tp || false,
          default_sl_pips: dbDefaults.default_sl_pips || 50,
          default_tp_pips: dbDefaults.default_tp_pips || 100,
          max_open_trades: dbDefaults.max_open_trades || 10,
          trading_hours_enabled: dbDefaults.trading_hours_enabled || false,
          trading_start_hour: dbDefaults.trading_start_hour || 8,
          trading_end_hour: dbDefaults.trading_end_hour || 17,
          allowed_symbols: dbDefaults.allowed_symbols || ['EUR/USD', 'GBP/USD', 'USD/JPY'],
          blacklist_symbols: dbDefaults.blacklist_symbols || []
        });
      }
    } catch (error) {
      console.error('Error loading account defaults:', error);
      toast({
        title: "Loading Error",
        description: "Failed to load account defaults. Using system defaults.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveAccountDefaults = async () => {
    try {
      setSaving(true);

      // Use RPC function to save defaults
      const { error } = await supa.rpc('upsert_account_defaults' as any, {
        p_portfolio_id: portfolioId,
        p_default_lot_size: defaults.default_lot_size,
        p_risk_per_trade_percent: defaults.risk_per_trade_percent,
        p_max_spread_pips: defaults.max_spread_pips,
        p_auto_lot_sizing: defaults.auto_lot_sizing,
        p_auto_sl_tp: defaults.auto_sl_tp,
        p_default_sl_pips: defaults.default_sl_pips,
        p_default_tp_pips: defaults.default_tp_pips,
        p_max_open_trades: defaults.max_open_trades,
        p_trading_hours_enabled: defaults.trading_hours_enabled,
        p_trading_start_hour: defaults.trading_start_hour,
        p_trading_end_hour: defaults.trading_end_hour,
        p_allowed_symbols: defaults.allowed_symbols,
        p_blacklist_symbols: defaults.blacklist_symbols
      });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Account defaults have been successfully updated and will be applied to future trades."
      });

      onDefaultsUpdate?.();
    } catch (error) {
      console.error('Error saving account defaults:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save account defaults. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setDefaults({
      portfolio_id: portfolioId,
      default_lot_size: 0.01,
      risk_per_trade_percent: 2.0,
      max_spread_pips: 3.0,
      auto_lot_sizing: false,
      auto_sl_tp: false,
      default_sl_pips: 50,
      default_tp_pips: 100,
      max_open_trades: 10,
      trading_hours_enabled: false,
      trading_start_hour: 8,
      trading_end_hour: 17,
      allowed_symbols: ['EUR/USD', 'GBP/USD', 'USD/JPY'],
      blacklist_symbols: []
    });
  };

  const calculateRiskAmount = () => {
    return (portfolioBalance * defaults.risk_per_trade_percent) / 100;
  };

  const calculateOptimalLotSize = () => {
    if (!defaults.auto_lot_sizing) return defaults.default_lot_size;
    
    const riskAmount = calculateRiskAmount();
    const slPips = defaults.default_sl_pips;
    const pipValue = 10; // USD per pip for 1 lot EUR/USD
    
    return Math.min(riskAmount / (slPips * pipValue), 10); // Max 10 lots
  };

  const availableSymbols = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'USD/CAD', 'AUD/USD', 'NZD/USD',
    'EUR/GBP', 'EUR/JPY', 'EUR/CHF', 'GBP/JPY', 'GBP/CHF', 'CHF/JPY',
    'GOLD', 'SILVER', 'OIL', 'BTC/USD', 'ETH/USD'
  ];

  const currencySymbol = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥',
    'CHF': 'Fr', 'CAD': 'C$', 'AUD': 'A$'
  }[accountCurrency] || '$';

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading account defaults...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Account Trading Defaults
        </CardTitle>
        <CardDescription>
          Configure default settings that will be applied to all shadow trading operations for this account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="trading" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trading">Trading</TabsTrigger>
            <TabsTrigger value="risk">Risk Management</TabsTrigger>
            <TabsTrigger value="filters">Filters</TabsTrigger>
          </TabsList>

          <TabsContent value="trading" className="space-y-4">
            {/* Lot Size Configuration */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Position Sizing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-lot-sizing"
                    checked={defaults.auto_lot_sizing}
                    onCheckedChange={(checked) => 
                      setDefaults({...defaults, auto_lot_sizing: checked})
                    }
                  />
                  <Label htmlFor="auto-lot-sizing">Automatic lot sizing based on risk</Label>
                </div>

                {!defaults.auto_lot_sizing && (
                  <div>
                    <Label className="text-sm">Default Lot Size</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        value={defaults.default_lot_size}
                        onChange={(e) => setDefaults({
                          ...defaults, 
                          default_lot_size: parseFloat(e.target.value) || 0.01
                        })}
                        min="0.01"
                        max="100"
                        step="0.01"
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">lots</span>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-sm">Risk Per Trade (%)</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[defaults.risk_per_trade_percent]}
                      onValueChange={([value]) => setDefaults({
                        ...defaults, 
                        risk_per_trade_percent: value
                      })}
                      min={0.1}
                      max={10}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>0.1%</span>
                      <span className="font-medium">
                        {defaults.risk_per_trade_percent}% ({currencySymbol}{calculateRiskAmount().toFixed(2)})
                      </span>
                      <span>10%</span>
                    </div>
                  </div>
                </div>

                {defaults.auto_lot_sizing && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <Calculator className="h-4 w-4" />
                      <span className="text-sm font-medium">Calculated Lot Size</span>
                    </div>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      {calculateOptimalLotSize().toFixed(2)} lots (based on {defaults.default_sl_pips} pip SL)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stop Loss & Take Profit */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Default Stop Loss & Take Profit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-sl-tp"
                    checked={defaults.auto_sl_tp}
                    onCheckedChange={(checked) => 
                      setDefaults({...defaults, auto_sl_tp: checked})
                    }
                  />
                  <Label htmlFor="auto-sl-tp">Automatically apply SL/TP to new trades</Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Stop Loss (pips)</Label>
                    <Input
                      type="number"
                      value={defaults.default_sl_pips}
                      onChange={(e) => setDefaults({
                        ...defaults, 
                        default_sl_pips: parseInt(e.target.value) || 50
                      })}
                      min="5"
                      max="500"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Take Profit (pips)</Label>
                    <Input
                      type="number"
                      value={defaults.default_tp_pips}
                      onChange={(e) => setDefaults({
                        ...defaults, 
                        default_tp_pips: parseInt(e.target.value) || 100
                      })}
                      min="5"
                      max="1000"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  Risk/Reward Ratio: 1:{(defaults.default_tp_pips / defaults.default_sl_pips).toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk" className="space-y-4">
            {/* Risk Management */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Risk Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm">Maximum Open Trades</Label>
                  <Input
                    type="number"
                    value={defaults.max_open_trades}
                    onChange={(e) => setDefaults({
                      ...defaults, 
                      max_open_trades: parseInt(e.target.value) || 10
                    })}
                    min="1"
                    max="100"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-sm">Maximum Spread (pips)</Label>
                  <Input
                    type="number"
                    value={defaults.max_spread_pips}
                    onChange={(e) => setDefaults({
                      ...defaults, 
                      max_spread_pips: parseFloat(e.target.value) || 3.0
                    })}
                    min="0.5"
                    max="20"
                    step="0.1"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Trades will be rejected if spread exceeds this value
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Trading Hours */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Trading Hours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="trading-hours"
                    checked={defaults.trading_hours_enabled}
                    onCheckedChange={(checked) => 
                      setDefaults({...defaults, trading_hours_enabled: checked})
                    }
                  />
                  <Label htmlFor="trading-hours">Restrict trading to specific hours (UTC)</Label>
                </div>

                {defaults.trading_hours_enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Start Hour (UTC)</Label>
                      <Select
                        value={defaults.trading_start_hour.toString()}
                        onValueChange={(value) => setDefaults({
                          ...defaults, 
                          trading_start_hour: parseInt(value)
                        })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({length: 24}, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i.toString().padStart(2, '0')}:00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">End Hour (UTC)</Label>
                      <Select
                        value={defaults.trading_end_hour.toString()}
                        onValueChange={(value) => setDefaults({
                          ...defaults, 
                          trading_end_hour: parseInt(value)
                        })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({length: 24}, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i.toString().padStart(2, '0')}:00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="filters" className="space-y-4">
            {/* Symbol Filters */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Allowed Trading Symbols</CardTitle>
                <CardDescription>
                  Only these symbols will be traded automatically
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {availableSymbols.map(symbol => (
                    <Badge
                      key={symbol}
                      variant={defaults.allowed_symbols.includes(symbol) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const newAllowed = defaults.allowed_symbols.includes(symbol)
                          ? defaults.allowed_symbols.filter(s => s !== symbol)
                          : [...defaults.allowed_symbols, symbol];
                        setDefaults({...defaults, allowed_symbols: newAllowed});
                      }}
                    >
                      {symbol}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        <div className="flex justify-between">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadAccountDefaults}>
              Cancel
            </Button>
            <Button onClick={saveAccountDefaults} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Defaults'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};