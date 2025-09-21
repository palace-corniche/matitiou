import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Zap,
  Target,
  DollarSign,
  Calculator,
  TrendingUp,
  TrendingDown,
  Activity,
  Settings,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';
import { UnifiedTick } from '@/services/unifiedMarketData';
import { TradeExecutionRequest } from '@/services/globalShadowTradingEngine';

interface TradingControlPanelProps {
  marketData: UnifiedTick | null;
  isExecutingTrade: boolean;
  onExecuteTrade: (request: TradeExecutionRequest) => Promise<void>;
  onCalculateOptimalLotSize: (symbol: string, riskPercent: number, entryPrice: number, stopLoss: number) => Promise<number>;
  className?: string;
}

export const TradingControlPanel: React.FC<TradingControlPanelProps> = ({
  marketData,
  isExecutingTrade,
  onExecuteTrade,
  onCalculateOptimalLotSize,
  className = ""
}) => {
  const [tradeConfig, setTradeConfig] = useState({
    symbol: 'EUR/USD',
    tradeType: 'buy' as 'buy' | 'sell',
    lotSize: 0.01,
    useMarketPrice: true,
    customPrice: 1.17000,
    stopLoss: 0,
    takeProfit: 0,
    comment: '',
    riskPercent: 2.0,
    autoCalculateLotSize: false,
    slippage: 3,
    expiration: 'gtc' as 'gtc' | 'day'
  });

  const [calculatedLotSize, setCalculatedLotSize] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Auto-calculate lot size when risk settings change
  useEffect(() => {
    if (tradeConfig.autoCalculateLotSize && tradeConfig.stopLoss > 0) {
      handleCalculateLotSize();
    }
  }, [tradeConfig.riskPercent, tradeConfig.stopLoss, tradeConfig.autoCalculateLotSize]);

  const handleCalculateLotSize = async () => {
    if (tradeConfig.stopLoss <= 0) return;
    
    setIsCalculating(true);
    try {
      const entryPrice = tradeConfig.useMarketPrice ? (marketData?.price || 1.17000) : tradeConfig.customPrice;
      const optimal = await onCalculateOptimalLotSize(
        tradeConfig.symbol,
        tradeConfig.riskPercent,
        entryPrice,
        tradeConfig.stopLoss
      );
      setCalculatedLotSize(optimal);
      
      if (tradeConfig.autoCalculateLotSize) {
        setTradeConfig(prev => ({ ...prev, lotSize: optimal }));
      }
    } catch (error) {
      console.error('Lot size calculation failed:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleExecuteTrade = async () => {
    if (isExecutingTrade) return;
    
    const entryPrice = tradeConfig.useMarketPrice ? (marketData?.price || 1.17000) : tradeConfig.customPrice;
    
    await onExecuteTrade({
      symbol: tradeConfig.symbol,
      trade_type: tradeConfig.tradeType,
      lot_size: tradeConfig.lotSize,
      entry_price: entryPrice,
      stop_loss: tradeConfig.stopLoss > 0 ? tradeConfig.stopLoss : undefined,
      take_profit: tradeConfig.takeProfit > 0 ? tradeConfig.takeProfit : undefined,
      comment: tradeConfig.comment || `${tradeConfig.tradeType.toUpperCase()} ${tradeConfig.symbol}`
    });
  };

  const getCurrentPrice = () => {
    if (!marketData) return 1.17000;
    return tradeConfig.tradeType === 'buy' ? (marketData.ask || marketData.price) : (marketData.bid || marketData.price);
  };

  const calculateRiskReward = () => {
    const entryPrice = tradeConfig.useMarketPrice ? getCurrentPrice() : tradeConfig.customPrice;
    if (tradeConfig.stopLoss <= 0 || tradeConfig.takeProfit <= 0) return null;
    
    const stopDistance = Math.abs(entryPrice - tradeConfig.stopLoss);
    const profitDistance = Math.abs(tradeConfig.takeProfit - entryPrice);
    
    return profitDistance / stopDistance;
  };

  const calculatePotentialProfit = () => {
    const entryPrice = tradeConfig.useMarketPrice ? getCurrentPrice() : tradeConfig.customPrice;
    if (tradeConfig.takeProfit <= 0) return null;
    
    const pipDifference = Math.abs(tradeConfig.takeProfit - entryPrice) / 0.0001;
    const pipValue = tradeConfig.lotSize * 10; // $10 per pip for 1 lot EUR/USD
    
    return pipDifference * pipValue;
  };

  const calculatePotentialLoss = () => {
    const entryPrice = tradeConfig.useMarketPrice ? getCurrentPrice() : tradeConfig.customPrice;
    if (tradeConfig.stopLoss <= 0) return null;
    
    const pipDifference = Math.abs(entryPrice - tradeConfig.stopLoss) / 0.0001;
    const pipValue = tradeConfig.lotSize * 10;
    
    return pipDifference * pipValue;
  };

  const riskReward = calculateRiskReward();
  const potentialProfit = calculatePotentialProfit();
  const potentialLoss = calculatePotentialLoss();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Quick Trade Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Trading Control Panel
          </CardTitle>
          <CardDescription>Execute trades with advanced risk management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Trade Setup */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Symbol</Label>
              <Select 
                value={tradeConfig.symbol} 
                onValueChange={(value) => setTradeConfig(prev => ({ ...prev, symbol: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR/USD">EUR/USD</SelectItem>
                  <SelectItem value="GBP/USD">GBP/USD</SelectItem>
                  <SelectItem value="USD/JPY">USD/JPY</SelectItem>
                  <SelectItem value="USD/CHF">USD/CHF</SelectItem>
                  <SelectItem value="AUD/USD">AUD/USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Trade Type</Label>
              <Select 
                value={tradeConfig.tradeType} 
                onValueChange={(value: 'buy' | 'sell') => setTradeConfig(prev => ({ ...prev, tradeType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy (Long)</SelectItem>
                  <SelectItem value="sell">Sell (Short)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Volume (Lots)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="10"
                  value={tradeConfig.lotSize}
                  onChange={(e) => setTradeConfig(prev => ({ 
                    ...prev, 
                    lotSize: parseFloat(e.target.value) || 0.01 
                  }))}
                  className="flex-1"
                />
                {calculatedLotSize && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTradeConfig(prev => ({ ...prev, lotSize: calculatedLotSize }))}
                    className="px-2"
                  >
                    Use {calculatedLotSize.toFixed(2)}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Price Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Switch
                checked={tradeConfig.useMarketPrice}
                onCheckedChange={(checked) => setTradeConfig(prev => ({ ...prev, useMarketPrice: checked }))}
              />
              <Label>Use Market Price</Label>
              {marketData && (
                <Badge variant="outline" className="font-mono">
                  {tradeConfig.tradeType === 'buy' ? 'Ask' : 'Bid'}: {getCurrentPrice().toFixed(5)}
                </Badge>
              )}
            </div>
            
            {!tradeConfig.useMarketPrice && (
              <div className="space-y-2">
                <Label>Custom Entry Price</Label>
                <Input
                  type="number"
                  step="0.00001"
                  value={tradeConfig.customPrice}
                  onChange={(e) => setTradeConfig(prev => ({ 
                    ...prev, 
                    customPrice: parseFloat(e.target.value) || 1.17000 
                  }))}
                  className="font-mono"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Risk Management */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Target className="h-4 w-4" />
              Risk Management
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stop Loss</Label>
                <Input
                  type="number"
                  step="0.00001"
                  value={tradeConfig.stopLoss || ''}
                  onChange={(e) => setTradeConfig(prev => ({ 
                    ...prev, 
                    stopLoss: parseFloat(e.target.value) || 0 
                  }))}
                  placeholder="Optional"
                  className="font-mono"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Take Profit</Label>
                <Input
                  type="number"
                  step="0.00001"
                  value={tradeConfig.takeProfit || ''}
                  onChange={(e) => setTradeConfig(prev => ({ 
                    ...prev, 
                    takeProfit: parseFloat(e.target.value) || 0 
                  }))}
                  placeholder="Optional"
                  className="font-mono"
                />
              </div>
            </div>

            {/* Auto Lot Size Calculation */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-4">
                <Switch
                  checked={tradeConfig.autoCalculateLotSize}
                  onCheckedChange={(checked) => setTradeConfig(prev => ({ ...prev, autoCalculateLotSize: checked }))}
                />
                <Label>Auto-calculate lot size based on risk</Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Risk Percentage</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={tradeConfig.riskPercent}
                    onChange={(e) => setTradeConfig(prev => ({ 
                      ...prev, 
                      riskPercent: parseFloat(e.target.value) || 2.0 
                    }))}
                  />
                </div>
                
                <div className="flex items-end">
                  <Button
                    onClick={handleCalculateLotSize}
                    disabled={isCalculating || tradeConfig.stopLoss <= 0}
                    variant="outline"
                    className="w-full"
                  >
                    {isCalculating ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Calculator className="h-4 w-4 mr-2" />
                    )}
                    Calculate
                  </Button>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Calculated Size</Label>
                  <div className="text-lg font-bold text-primary">
                    {calculatedLotSize ? `${calculatedLotSize.toFixed(2)} lots` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trade Analysis */}
          {(riskReward || potentialProfit || potentialLoss) && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-semibold">Trade Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {riskReward && (
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Risk:Reward</p>
                      <p className={`text-lg font-bold ${riskReward >= 2 ? 'text-green-600' : riskReward >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                        1:{riskReward.toFixed(2)}
                      </p>
                    </div>
                  )}
                  
                  {potentialProfit && (
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Potential Profit</p>
                      <p className="text-lg font-bold text-green-600">
                        +${potentialProfit.toFixed(2)}
                      </p>
                    </div>
                  )}
                  
                  {potentialLoss && (
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Potential Loss</p>
                      <p className="text-lg font-bold text-red-600">
                        -${potentialLoss.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Advanced Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Comment</Label>
              <Input
                value={tradeConfig.comment}
                onChange={(e) => setTradeConfig(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="Optional trade comment"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Max Slippage (pips)</Label>
              <Input
                type="number"
                min="0"
                max="10"
                value={tradeConfig.slippage}
                onChange={(e) => setTradeConfig(prev => ({ 
                  ...prev, 
                  slippage: parseInt(e.target.value) || 3 
                }))}
              />
            </div>
          </div>

          {/* Execute Button */}
          <Button 
            onClick={handleExecuteTrade}
            disabled={isExecutingTrade || tradeConfig.lotSize <= 0}
            className="w-full h-12 text-lg font-semibold"
            variant={tradeConfig.tradeType === 'buy' ? 'default' : 'destructive'}
          >
            {isExecutingTrade ? (
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            ) : tradeConfig.tradeType === 'buy' ? (
              <TrendingUp className="h-5 w-5 mr-2" />
            ) : (
              <TrendingDown className="h-5 w-5 mr-2" />
            )}
            {isExecutingTrade 
              ? 'Executing...' 
              : `${tradeConfig.tradeType.toUpperCase()} ${tradeConfig.lotSize} ${tradeConfig.symbol}`
            }
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};