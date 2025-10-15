// OrderEntry Component - Complete order entry interface for all order types

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, DollarSign, Target, Shield, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';  // PHASE 1: Added for manual execution blocker

interface TradingInstrument {
  symbol: string;
  display_name: string;
  pip_size: number;
  min_lot_size: number;
  max_lot_size: number;
  lot_step: number;
  contract_size: number;
  typical_spread: number;
  margin_percentage: number;
  bid_price?: number;
  ask_price?: number;
}

interface OrderEntryProps {
  symbol: string;
  instruments: TradingInstrument[];
  onExecuteMarketOrder: (orderData: any) => void;
  onPlacePendingOrder: (orderData: any) => void;
  onCancel: () => void;
}

export const OrderEntry: React.FC<OrderEntryProps> = ({
  symbol,
  instruments,
  onExecuteMarketOrder,
  onPlacePendingOrder,
  onCancel
}) => {
  const { toast } = useToast(); // PHASE 1: Added for manual execution blocker
  const [orderType, setOrderType] = useState<'market' | 'pending'>('market');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [pendingOrderType, setPendingOrderType] = useState<string>('limit');
  const [lotSize, setLotSize] = useState<string>('0.01');
  const [triggerPrice, setTriggerPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [magicNumber, setMagicNumber] = useState<string>('0');
  const [expiryType, setExpiryType] = useState<string>('gtc');
  const [expiryTime, setExpiryTime] = useState<string>('');
  const [slippageTolerance, setSlippageTolerance] = useState<string>('3');
  const [partialFillAllowed, setPartialFillAllowed] = useState<boolean>(true);
  const [trailingStop, setTrailingStop] = useState<boolean>(false);
  const [trailingDistance, setTrailingDistance] = useState<string>('50');

  const selectedInstrument = instruments.find(inst => inst.symbol === symbol);
  const currentPrice = tradeType === 'buy' ? selectedInstrument?.ask_price : selectedInstrument?.bid_price;

  useEffect(() => {
    if (currentPrice) {
      setTriggerPrice(currentPrice.toFixed(5));
    }
  }, [currentPrice, symbol, tradeType]);

  const calculateMarginRequired = () => {
    if (!selectedInstrument || !lotSize) return 0;
    const lots = parseFloat(lotSize);
    const price = currentPrice || 1.0;
    const marginPercentage = selectedInstrument.margin_percentage / 100;
    return lots * selectedInstrument.contract_size * price * marginPercentage;
  };

  const calculatePipValue = () => {
    if (!selectedInstrument || !lotSize) return 0;
    const lots = parseFloat(lotSize);
    return lots * 10; // $10 per pip for 1 lot in major pairs
  };

  const calculateRiskReward = () => {
    const entry = parseFloat(triggerPrice) || currentPrice || 0;
    const sl = parseFloat(stopLoss);
    const tp = parseFloat(takeProfit);
    
    if (!sl || !tp || !entry) return { risk: 0, reward: 0, ratio: 0 };

    const risk = Math.abs(entry - sl) * 10000; // in pips
    const reward = Math.abs(tp - entry) * 10000; // in pips
    const ratio = risk > 0 ? reward / risk : 0;

    return { risk, reward, ratio };
  };

  const validateOrder = () => {
    if (!selectedInstrument) return { valid: false, error: 'No instrument selected' };
    if (!lotSize || parseFloat(lotSize) < selectedInstrument.min_lot_size) {
      return { valid: false, error: `Minimum lot size is ${selectedInstrument.min_lot_size}` };
    }
    if (parseFloat(lotSize) > selectedInstrument.max_lot_size) {
      return { valid: false, error: `Maximum lot size is ${selectedInstrument.max_lot_size}` };
    }
    if (orderType === 'pending' && !triggerPrice) {
      return { valid: false, error: 'Trigger price is required for pending orders' };
    }
    return { valid: true, error: '' };
  };

  const handleExecuteOrder = () => {
    // PHASE 1: DISABLE MANUAL EXECUTION
    toast({
      title: "Manual Execution Disabled",
      description: "All trades must be executed through the Advanced Fusion System. Signals are auto-executed when validated.",
      variant: "destructive"
    });
    return;
    
    /* OLD CODE - PERMANENTLY DISABLED
    const validation = validateOrder();
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const orderData = {
      symbol,
      tradeType,
      lotSize: parseFloat(lotSize),
      stopLoss: stopLoss ? parseFloat(stopLoss) : null,
      takeProfit: takeProfit ? parseFloat(takeProfit) : null,
      comment,
      magicNumber: parseInt(magicNumber) || 0,
      slippageTolerance: parseFloat(slippageTolerance),
      trailingStop,
      trailingDistance: trailingStop ? parseFloat(trailingDistance) : null
    };

    if (orderType === 'market') {
      onExecuteMarketOrder(orderData);
    } else {
      onPlacePendingOrder({
        ...orderData,
        orderType: pendingOrderType,
        triggerPrice: parseFloat(triggerPrice),
        expiryType,
        expiryTime: expiryTime || null,
        partialFillAllowed
      });
    }
    */
  };

  const riskReward = calculateRiskReward();

  return (
    <div className="space-y-4">
      {/* Order Type Selection */}
      <Tabs value={orderType} onValueChange={(value) => setOrderType(value as 'market' | 'pending')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="market">Market Order</TabsTrigger>
          <TabsTrigger value="pending">Pending Order</TabsTrigger>
        </TabsList>

        <TabsContent value="market" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Market Execution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Instrument Info */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{symbol}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedInstrument?.display_name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-red-600">
                    Bid: {selectedInstrument?.bid_price?.toFixed(5) || '0.00000'}
                  </div>
                  <div className="text-sm text-green-600">
                    Ask: {selectedInstrument?.ask_price?.toFixed(5) || '0.00000'}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Trade Direction */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={tradeType === 'buy' ? 'default' : 'outline'}
                  onClick={() => setTradeType('buy')}
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  BUY
                </Button>
                <Button
                  variant={tradeType === 'sell' ? 'destructive' : 'outline'}
                  onClick={() => setTradeType('sell')}
                  className="flex items-center gap-2"
                >
                  <TrendingDown className="h-4 w-4" />
                  SELL
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Pending Order Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pending Order Type */}
              <div className="space-y-2">
                <Label>Order Type</Label>
                <Select value={pendingOrderType} onValueChange={setPendingOrderType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="limit">Limit Order</SelectItem>
                    <SelectItem value="stop">Stop Order</SelectItem>
                    <SelectItem value="stop_limit">Stop Limit</SelectItem>
                    <SelectItem value="trailing_stop">Trailing Stop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Trade Direction */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={tradeType === 'buy' ? 'default' : 'outline'}
                  onClick={() => setTradeType('buy')}
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  BUY
                </Button>
                <Button
                  variant={tradeType === 'sell' ? 'destructive' : 'outline'}
                  onClick={() => setTradeType('sell')}
                  className="flex items-center gap-2"
                >
                  <TrendingDown className="h-4 w-4" />
                  SELL
                </Button>
              </div>

              {/* Trigger Price */}
              <div className="space-y-2">
                <Label>Trigger Price</Label>
                <Input
                  type="number"
                  step="0.00001"
                  value={triggerPrice}
                  onChange={(e) => setTriggerPrice(e.target.value)}
                  placeholder="Enter trigger price"
                />
              </div>

              {/* Expiry Settings */}
              <div className="space-y-2">
                <Label>Expiry</Label>
                <Select value={expiryType} onValueChange={setExpiryType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gtc">Good Till Cancelled</SelectItem>
                    <SelectItem value="day">Today Only</SelectItem>
                    <SelectItem value="specified">Custom Date</SelectItem>
                  </SelectContent>
                </Select>
                {expiryType === 'specified' && (
                  <Input
                    type="datetime-local"
                    value={expiryTime}
                    onChange={(e) => setExpiryTime(e.target.value)}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Parameters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Order Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lot Size */}
          <div className="space-y-2">
            <Label>Lot Size</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step={selectedInstrument?.lot_step || 0.01}
                min={selectedInstrument?.min_lot_size || 0.01}
                max={selectedInstrument?.max_lot_size || 100}
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                placeholder="0.01"
              />
              <div className="text-xs text-muted-foreground self-center">
                Min: {selectedInstrument?.min_lot_size || 0.01}
              </div>
            </div>
          </div>

          {/* Stop Loss */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Stop Loss
            </Label>
            <Input
              type="number"
              step="0.00001"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="Optional"
            />
          </div>

          {/* Take Profit */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Take Profit
            </Label>
            <Input
              type="number"
              step="0.00001"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="Optional"
            />
          </div>

          {/* Trailing Stop */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="trailing-stop"
                checked={trailingStop}
                onCheckedChange={(checked) => setTrailingStop(checked === true)}
              />
              <Label htmlFor="trailing-stop">Enable Trailing Stop</Label>
            </div>
            {trailingStop && (
              <div className="space-y-2">
                <Label>Trailing Distance (pips)</Label>
                <Input
                  type="number"
                  value={trailingDistance}
                  onChange={(e) => setTrailingDistance(e.target.value)}
                  placeholder="50"
                />
              </div>
            )}
          </div>

          {/* Advanced Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Magic Number</Label>
              <Input
                type="number"
                value={magicNumber}
                onChange={(e) => setMagicNumber(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Slippage (pips)</Label>
              <Input
                type="number"
                value={slippageTolerance}
                onChange={(e) => setSlippageTolerance(e.target.value)}
                placeholder="3"
              />
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label>Comment</Label>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional comment"
              maxLength={50}
            />
          </div>

          {orderType === 'pending' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="partial-fill"
                checked={partialFillAllowed}
                onCheckedChange={(checked) => setPartialFillAllowed(checked === true)}
              />
              <Label htmlFor="partial-fill">Allow Partial Fill</Label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Margin Required:</span>
            <span className="font-medium">${calculateMarginRequired().toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Pip Value:</span>
            <span className="font-medium">${calculatePipValue().toFixed(2)}</span>
          </div>
          {riskReward.risk > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span>Risk (pips):</span>
                <span className="text-red-600">{riskReward.risk.toFixed(1)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Reward (pips):</span>
                <span className="text-green-600">{riskReward.reward.toFixed(1)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Risk:Reward:</span>
                <span className={`font-medium ${riskReward.ratio >= 2 ? 'text-green-600' : riskReward.ratio >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                  1:{riskReward.ratio.toFixed(2)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleExecuteOrder} className="flex-1">
          {orderType === 'market' ? `${tradeType.toUpperCase()} ${symbol}` : 'Place Pending Order'}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};