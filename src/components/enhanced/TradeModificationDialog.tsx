import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Edit3, Target, Shield, TrendingUp, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
}

interface TradeModificationDialogProps {
  trade: Trade | null;
  isOpen: boolean;
  onClose: () => void;
  onTradeModified: () => void;
  currentPrice?: number;
}

export const TradeModificationDialog: React.FC<TradeModificationDialogProps> = ({
  trade,
  isOpen,
  onClose,
  onTradeModified,
  currentPrice
}) => {
  const [loading, setLoading] = useState(false);
  const [stopLoss, setStopLoss] = useState(0);
  const [takeProfit, setTakeProfit] = useState(0);
  const [trailingStop, setTrailingStop] = useState(false);
  const [trailingStopDistance, setTrailingStopDistance] = useState(20);
  const [breakEven, setBreakEven] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (trade) {
      setStopLoss(trade.stop_loss);
      setTakeProfit(trade.take_profit);
      setTrailingStop(false);
      setBreakEven(false);
    }
  }, [trade]);

  if (!trade) return null;

  const formatPrice = (price: number) => {
    return price.toFixed(5);
  };

  const calculatePips = (price1: number, price2: number) => {
    return Math.abs((price1 - price2) / 0.0001);
  };

  const handleModifyTrade = async () => {
    if (!trade) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('shadow_trades')
        .update({
          stop_loss: stopLoss,
          take_profit: takeProfit,
          trailing_stop_distance: trailingStop ? trailingStopDistance : 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', trade.id);

      if (error) throw error;

      // Set break even if requested
      if (breakEven) {
        await supabase
          .from('shadow_trades')
          .update({
            stop_loss: trade.entry_price,
            break_even_triggered: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', trade.id);
      }

      toast({
        title: "Trade Modified",
        description: "Stop loss and take profit levels have been updated."
      });

      onTradeModified();
      onClose();
    } catch (error) {
      console.error('Error modifying trade:', error);
      toast({
        title: "Modification Failed",
        description: "Failed to modify trade. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePartialClose = async (percentage: number) => {
    if (!trade) return;

    try {
      setLoading(true);
      const closeAmount = trade.lot_size * (percentage / 100);
      const price = currentPrice || trade.current_price || trade.entry_price;

      const { data, error } = await supabase.functions.invoke('manage-trades', {
        body: {
          action: 'close_trade',
          tradeId: trade.id,
          currentPrice: price,
          closeReason: 'partial_close',
          partialLotSize: closeAmount
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Partial Close Successful",
          description: `Closed ${closeAmount} lots (${percentage}%) with P&L: $${data.data?.profit?.toFixed(2) || '0.00'}`
        });
        onTradeModified();
        onClose();
      }
    } catch (error) {
      console.error('Error closing partial trade:', error);
      toast({
        title: "Partial Close Failed",
        description: "Failed to partially close trade. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const quickSLDistances = [10, 20, 30, 50];
  const quickTPDistances = [20, 30, 50, 100];
  const partialClosePercentages = [25, 50, 75];

  const currentPriceValue = currentPrice || trade.current_price || trade.entry_price;
  const slPips = calculatePips(stopLoss, trade.entry_price);
  const tpPips = calculatePips(takeProfit, trade.entry_price);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Modify Trade - {trade.symbol}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Trade Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Current Position</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Direction:</span>
                  <Badge variant={trade.trade_type === 'buy' ? 'default' : 'destructive'}>
                    {trade.trade_type.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lot Size:</span>
                  <span className="font-medium">{trade.lot_size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry Price:</span>
                  <span className="font-mono">{formatPrice(trade.entry_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Price:</span>
                  <span className="font-mono">{formatPrice(currentPriceValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unrealized P&L:</span>
                  <span className={`font-medium ${(trade.unrealized_pnl || 0) >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    ${(trade.unrealized_pnl || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profit Pips:</span>
                  <span className={`font-medium ${(trade.profit_pips || 0) >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {(trade.profit_pips || 0).toFixed(1)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stop Loss Modification */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Stop Loss
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="stop-loss">Stop Loss Price</Label>
                <Input
                  id="stop-loss"
                  type="number"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                  step="0.00001"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Distance: {slPips.toFixed(1)} pips
                </p>
              </div>

              <div>
                <Label className="text-sm">Quick SL Distances (pips)</Label>
                <div className="flex gap-2 mt-2">
                  {quickSLDistances.map(pips => {
                    const price = trade.trade_type === 'buy' 
                      ? trade.entry_price - (pips * 0.0001)
                      : trade.entry_price + (pips * 0.0001);
                    
                    return (
                      <Badge
                        key={pips}
                        variant="outline"
                        className="cursor-pointer hover:bg-destructive/10"
                        onClick={() => setStopLoss(price)}
                      >
                        {pips}p
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="break-even"
                  checked={breakEven}
                  onCheckedChange={setBreakEven}
                />
                <Label htmlFor="break-even" className="text-sm">
                  Move to Break Even
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Take Profit Modification */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                Take Profit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="take-profit">Take Profit Price</Label>
                <Input
                  id="take-profit"
                  type="number"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                  step="0.00001"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Distance: {tpPips.toFixed(1)} pips
                </p>
              </div>

              <div>
                <Label className="text-sm">Quick TP Distances (pips)</Label>
                <div className="flex gap-2 mt-2">
                  {quickTPDistances.map(pips => {
                    const price = trade.trade_type === 'buy' 
                      ? trade.entry_price + (pips * 0.0001)
                      : trade.entry_price - (pips * 0.0001);
                    
                    return (
                      <Badge
                        key={pips}
                        variant="outline"
                        className="cursor-pointer hover:bg-bullish/10"
                        onClick={() => setTakeProfit(price)}
                      >
                        {pips}p
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trailing Stop */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Trailing Stop
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="trailing-stop"
                  checked={trailingStop}
                  onCheckedChange={setTrailingStop}
                />
                <Label htmlFor="trailing-stop" className="text-sm">
                  Enable Trailing Stop
                </Label>
              </div>

              {trailingStop && (
                <div>
                  <Label className="text-sm">
                    Distance: {trailingStopDistance} pips
                  </Label>
                  <Slider
                    value={[trailingStopDistance]}
                    onValueChange={([value]) => setTrailingStopDistance(value)}
                    min={5}
                    max={100}
                    step={5}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>5 pips</span>
                    <span>100 pips</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Partial Close */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <X className="h-4 w-4" />
                Partial Close
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {partialClosePercentages.map(percentage => (
                  <Button
                    key={percentage}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePartialClose(percentage)}
                    disabled={loading}
                  >
                    Close {percentage}%
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleModifyTrade} disabled={loading}>
            {loading ? 'Updating...' : 'Apply Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};