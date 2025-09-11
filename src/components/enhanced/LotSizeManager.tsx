import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Plus, X, Calculator, Target, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LotSizePreset {
  id: string;
  preset_name: string;
  lot_size: number;
  is_default: boolean;
}

interface Portfolio {
  id: string;
  balance: number;
  leverage: number;
  account_currency: string;
  risk_per_trade: number;
}

interface LotSizeManagerProps {
  portfolio: Portfolio;
  symbol: string;
  entryPrice?: number;
  stopLoss?: number;
  onLotSizeChange: (lotSize: number) => void;
}

export const LotSizeManager: React.FC<LotSizeManagerProps> = ({
  portfolio,
  symbol,
  entryPrice = 1.17000,
  stopLoss = 1.16500,
  onLotSizeChange
}) => {
  const [presets, setPresets] = useState<LotSizePreset[]>([]);
  const [customLotSize, setCustomLotSize] = useState(0.01);
  const [riskAmount, setRiskAmount] = useState(portfolio.balance * (portfolio.risk_per_trade / 100));
  const [riskPercentage, setRiskPercentage] = useState(portfolio.risk_per_trade);
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [calculatedLotSize, setCalculatedLotSize] = useState(0.01);
  const { toast } = useToast();

  useEffect(() => {
    loadLotSizePresets();
  }, [portfolio.id]);

  useEffect(() => {
    calculateOptimalLotSize();
  }, [entryPrice, stopLoss, riskAmount, portfolio.balance]);

  useEffect(() => {
    setRiskAmount(portfolio.balance * (riskPercentage / 100));
  }, [riskPercentage, portfolio.balance]);

  const loadLotSizePresets = async () => {
    try {
      const { data, error } = await supabase
        .from('lot_size_presets')
        .select('*')
        .eq('portfolio_id', portfolio.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPresets(data || []);
    } catch (error) {
      console.error('Error loading lot size presets:', error);
    }
  };

  const calculateOptimalLotSize = async () => {
    if (!entryPrice || !stopLoss || entryPrice === stopLoss) {
      setCalculatedLotSize(0.01);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('calculate_optimal_lot_size', {
        p_portfolio_id: portfolio.id,
        p_symbol: symbol,
        p_risk_percentage: riskPercentage,
        p_entry_price: entryPrice,
        p_stop_loss: stopLoss
      });

      if (error) throw error;

      if (data && typeof data === 'object' && 'success' in data && data.success) {
        const result = data as { success: boolean; optimal_lot_size: number };
        setCalculatedLotSize(result.optimal_lot_size);
      }
    } catch (error) {
      console.error('Error calculating optimal lot size:', error);
      // Fallback calculation
      const pipDifference = Math.abs(entryPrice - stopLoss) / 0.0001;
      const pipValue = 10; // $10 per pip for 1 lot EUR/USD
      const riskInUSD = riskAmount;
      const calculatedSize = riskInUSD / (pipDifference * pipValue);
      setCalculatedLotSize(Math.max(0.01, Math.min(10, Math.round(calculatedSize * 100) / 100)));
    }
  };

  const createPreset = async () => {
    if (!newPresetName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a preset name.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('lot_size_presets')
        .insert({
          portfolio_id: portfolio.id,
          preset_name: newPresetName,
          lot_size: customLotSize,
          is_default: presets.length === 0
        });

      if (error) throw error;

      toast({
        title: "Preset Created",
        description: `Lot size preset "${newPresetName}" has been saved.`
      });

      setNewPresetName('');
      setShowPresetDialog(false);
      loadLotSizePresets();
    } catch (error) {
      console.error('Error creating preset:', error);
      toast({
        title: "Error",
        description: "Failed to create preset. Please try again.",
        variant: "destructive"
      });
    }
  };

  const deletePreset = async (presetId: string) => {
    try {
      const { error } = await supabase
        .from('lot_size_presets')
        .delete()
        .eq('id', presetId);

      if (error) throw error;

      toast({
        title: "Preset Deleted",
        description: "Lot size preset has been removed."
      });

      loadLotSizePresets();
    } catch (error) {
      console.error('Error deleting preset:', error);
      toast({
        title: "Error",
        description: "Failed to delete preset. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number) => {
    const symbol = portfolio.account_currency === 'USD' ? '$' : 
                   portfolio.account_currency === 'EUR' ? '€' : 
                   portfolio.account_currency === 'GBP' ? '£' : '$';
    return `${symbol}${amount.toLocaleString()}`;
  };

  const calculateMarginRequired = (lotSize: number) => {
    const contractSize = 100000; // Standard lot size for EUR/USD
    const marginPercentage = 1 / portfolio.leverage; // 1% margin for 1:100 leverage
    return (lotSize * contractSize * entryPrice * marginPercentage);
  };

  const calculatePipValue = (lotSize: number) => {
    return lotSize * 10; // $10 per pip for 1 lot EUR/USD
  };

  const quickLotSizes = [0.01, 0.05, 0.1, 0.25, 0.5, 1.0];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Lot Size Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Management */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm">Risk per Trade (%)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Slider
                value={[riskPercentage]}
                onValueChange={([value]) => setRiskPercentage(value)}
                min={0.1}
                max={10}
                step={0.1}
                className="flex-1"
              />
              <span className="text-sm font-medium w-12">{riskPercentage.toFixed(1)}%</span>
            </div>
          </div>

          <div>
            <Label className="text-sm">Risk Amount</Label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm">{portfolio.account_currency === 'USD' ? '$' : '€'}</span>
              <Input
                type="number"
                value={riskAmount}
                onChange={(e) => setRiskAmount(parseFloat(e.target.value) || 0)}
                min="0"
                step="10"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Calculated Lot Size */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Calculated Lot Size:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCustomLotSize(calculatedLotSize);
                onLotSizeChange(calculatedLotSize);
              }}
            >
              Use Calculated
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-bullish" />
            <span className="font-medium">{calculatedLotSize.toFixed(2)} lots</span>
            <Badge variant="outline">
              Risk: {formatCurrency(riskAmount)}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Pip Value: {formatCurrency(calculatePipValue(calculatedLotSize))} • 
            Margin: {formatCurrency(calculateMarginRequired(calculatedLotSize))}
          </div>
        </div>

        {/* Custom Lot Size */}
        <div>
          <Label className="text-sm">Custom Lot Size</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              value={customLotSize}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                setCustomLotSize(value);
                onLotSizeChange(value);
              }}
              min="0.01"
              max="100"
              step="0.01"
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground">lots</span>
          </div>
        </div>

        {/* Quick Lot Sizes */}
        <div>
          <Label className="text-sm">Quick Sizes</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {quickLotSizes.map(lotSize => (
              <Badge
                key={lotSize}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => {
                  setCustomLotSize(lotSize);
                  onLotSizeChange(lotSize);
                }}
              >
                {lotSize} lot{lotSize !== 1 ? 's' : ''}
              </Badge>
            ))}
          </div>
        </div>

        {/* Lot Size Presets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm">Saved Presets</Label>
            <Dialog open={showPresetDialog} onOpenChange={setShowPresetDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Lot Size Preset</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="preset-name">Preset Name</Label>
                    <Input
                      id="preset-name"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="e.g., Conservative, Aggressive"
                    />
                  </div>
                  <div>
                    <Label>Lot Size</Label>
                    <div className="text-lg font-medium">{customLotSize} lots</div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowPresetDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createPreset}>
                      Save Preset
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {presets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                No presets saved
              </p>
            ) : (
              presets.map(preset => (
                <div key={preset.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{preset.preset_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {preset.lot_size} lots
                    </Badge>
                    {preset.is_default && (
                      <Badge variant="default" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCustomLotSize(preset.lot_size);
                        onLotSizeChange(preset.lot_size);
                      }}
                    >
                      Use
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePreset(preset.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Risk Warning */}
        {customLotSize > 1 && (
          <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800 dark:text-amber-200">
              Large lot size detected. Required margin: {formatCurrency(calculateMarginRequired(customLotSize))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};