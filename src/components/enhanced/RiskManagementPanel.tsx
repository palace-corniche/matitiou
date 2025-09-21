import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, TrendingUp, Target, AlertTriangle, Calculator,
  DollarSign, Percent, BarChart3, Activity, Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RiskSettings {
  riskPercentage: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  positionSizeMethod: 'fixed' | 'percentage' | 'kelly' | 'volatility';
  autoBreakEven: boolean;
  trailingStopEnabled: boolean;
  correlationLimit: number;
  maxPositions: number;
}

interface Portfolio {
  id: string;
  balance: number;
  equity: number;
  daily_pnl_today: number;
  max_drawdown: number;
  current_drawdown: number;
  risk_per_trade: number;
  max_open_positions: number;
}

interface RiskMetrics {
  currentRisk: number;
  dailyRisk: number;
  portfolioHeat: number;
  positionCount: number;
  correlationRisk: number;
}

interface RiskManagementPanelProps {
  portfolio: Portfolio | null;
  openPositions: number;
  onSettingsUpdate?: (settings: RiskSettings) => void;
}

const RiskManagementPanel: React.FC<RiskManagementPanelProps> = ({
  portfolio,
  openPositions,
  onSettingsUpdate
}) => {
  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    riskPercentage: 2,
    maxDailyLoss: 5000,
    maxDrawdown: 20,
    positionSizeMethod: 'percentage',
    autoBreakEven: true,
    trailingStopEnabled: true,
    correlationLimit: 0.7,
    maxPositions: 10
  });

  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>({
    currentRisk: 0,
    dailyRisk: 0,
    portfolioHeat: 0,
    positionCount: 0,
    correlationRisk: 0
  });

  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [positionCalc, setPositionCalc] = useState({
    entryPrice: '',
    stopLoss: '',
    symbol: 'EUR/USD',
    riskAmount: ''
  });

  useEffect(() => {
    if (portfolio) {
      calculateRiskMetrics();
      loadRiskSettings();
    }
  }, [portfolio, openPositions]);

  const loadRiskSettings = async () => {
    if (!portfolio) return;

    try {
      // Load existing risk settings or use defaults
      setRiskSettings(prev => ({
        ...prev,
        riskPercentage: portfolio.risk_per_trade * 100,
        maxPositions: portfolio.max_open_positions
      }));
    } catch (error) {
      console.error('Error loading risk settings:', error);
    }
  };

  const calculateRiskMetrics = async () => {
    if (!portfolio) return;

    try {
      // Calculate current portfolio risk metrics
      const currentRisk = Math.abs(portfolio.daily_pnl_today);
      const dailyRisk = (currentRisk / portfolio.balance) * 100;
      const portfolioHeat = (portfolio.current_drawdown / 100) * 100;

      setRiskMetrics({
        currentRisk,
        dailyRisk,
        portfolioHeat,
        positionCount: openPositions,
        correlationRisk: 0 // Would calculate from position correlations
      });
    } catch (error) {
      console.error('Error calculating risk metrics:', error);
    }
  };

  const updateRiskSettings = async (newSettings: Partial<RiskSettings>) => {
    if (!portfolio) return;

    const updatedSettings = { ...riskSettings, ...newSettings };
    setRiskSettings(updatedSettings);

    try {
      // Update global account risk settings (simplified for global system)
      const { error } = await supabase
        .from('global_trading_account')
        .update({
          max_open_positions: updatedSettings.maxPositions
        })
        .eq('id', portfolio.id);

      if (error) throw error;

      toast.success('Risk settings updated successfully');
      onSettingsUpdate?.(updatedSettings);
    } catch (error) {
      console.error('Error updating risk settings:', error);
      toast.error('Failed to update risk settings');
    }
  };

  const calculatePositionSize = async () => {
    if (!portfolio || !positionCalc.entryPrice || !positionCalc.stopLoss) return;

    try {
      const response = await supabase.functions.invoke('enhanced-trading', {
        body: {
          action: 'calculate_position_size',
          portfolioId: portfolio.id,
          symbol: positionCalc.symbol,
          riskPercentage: riskSettings.riskPercentage,
          entryPrice: parseFloat(positionCalc.entryPrice),
          stopLoss: parseFloat(positionCalc.stopLoss)
        }
      });

      if (response.data?.success) {
        const result = response.data;
        setPositionCalc(prev => ({
          ...prev,
          riskAmount: `$${result.risk_amount.toFixed(2)} | ${result.optimal_lot_size} lots`
        }));
      }
    } catch (error) {
      console.error('Error calculating position size:', error);
      toast.error('Failed to calculate position size');
    }
  };

  const getRiskLevel = (value: number, thresholds: { low: number; medium: number }) => {
    if (value <= thresholds.low) return 'low';
    if (value <= thresholds.medium) return 'medium';
    return 'high';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  if (!portfolio) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">No portfolio data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Risk Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risk Overview
          </CardTitle>
          <CardDescription>
            Current portfolio risk metrics and exposure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Daily P&L</span>
                <span className={`text-sm font-medium ${portfolio.daily_pnl_today >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${portfolio.daily_pnl_today.toFixed(2)}
                </span>
              </div>
              <Progress 
                value={Math.min(Math.abs(riskMetrics.dailyRisk), 100)} 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Drawdown</span>
                <span className={`text-sm font-medium ${getRiskColor(getRiskLevel(riskMetrics.portfolioHeat, { low: 5, medium: 15 }))}`}>
                  {riskMetrics.portfolioHeat.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={riskMetrics.portfolioHeat} 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Open Positions</span>
                <span className="text-sm font-medium">
                  {riskMetrics.positionCount} / {riskSettings.maxPositions}
                </span>
              </div>
              <Progress 
                value={(riskMetrics.positionCount / riskSettings.maxPositions) * 100} 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Risk per Trade</span>
                <span className="text-sm font-medium">
                  {riskSettings.riskPercentage}%
                </span>
              </div>
              <Progress 
                value={(riskSettings.riskPercentage / 5) * 100} 
                className="h-2"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Badge variant={getRiskLevel(riskMetrics.dailyRisk, { low: 2, medium: 5 }) === 'low' ? 'default' : 'destructive'}>
              Daily Risk: {riskMetrics.dailyRisk.toFixed(1)}%
            </Badge>
            <Badge variant={riskMetrics.positionCount < riskSettings.maxPositions ? 'default' : 'destructive'}>
              Position Count: {riskMetrics.positionCount}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Risk Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Risk Management Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Risk per Trade (%)</Label>
              <div className="px-3">
                <Slider
                  value={[riskSettings.riskPercentage]}
                  onValueChange={([value]) => updateRiskSettings({ riskPercentage: value })}
                  max={10}
                  min={0.1}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0.1%</span>
                  <span>{riskSettings.riskPercentage}%</span>
                  <span>10%</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Max Daily Loss ($)</Label>
              <Input
                type="number"
                value={riskSettings.maxDailyLoss}
                onChange={(e) => updateRiskSettings({ maxDailyLoss: parseFloat(e.target.value) })}
                placeholder="5000"
              />
            </div>

            <div className="space-y-2">
              <Label>Max Drawdown (%)</Label>
              <Input
                type="number"
                value={riskSettings.maxDrawdown}
                onChange={(e) => updateRiskSettings({ maxDrawdown: parseFloat(e.target.value) })}
                placeholder="20"
              />
            </div>

            <div className="space-y-2">
              <Label>Max Open Positions</Label>
              <Input
                type="number"
                value={riskSettings.maxPositions}
                onChange={(e) => updateRiskSettings({ maxPositions: parseInt(e.target.value) })}
                placeholder="10"
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Position Sizing Method</Label>
              <Select 
                value={riskSettings.positionSizeMethod}
                onValueChange={(value: any) => updateRiskSettings({ positionSizeMethod: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Lot Size</SelectItem>
                  <SelectItem value="percentage">Risk Percentage</SelectItem>
                  <SelectItem value="kelly">Kelly Criterion</SelectItem>
                  <SelectItem value="volatility">Volatility Based</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-breakeven">Auto Break-Even</Label>
                <Switch
                  id="auto-breakeven"
                  checked={riskSettings.autoBreakEven}
                  onCheckedChange={(checked) => updateRiskSettings({ autoBreakEven: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="trailing-stop">Trailing Stops</Label>
                <Switch
                  id="trailing-stop"
                  checked={riskSettings.trailingStopEnabled}
                  onCheckedChange={(checked) => updateRiskSettings({ trailingStopEnabled: checked })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Position Size Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Position Size Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Symbol</Label>
              <Select 
                value={positionCalc.symbol}
                onValueChange={(value) => setPositionCalc(prev => ({ ...prev, symbol: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR/USD">EUR/USD</SelectItem>
                  <SelectItem value="GBP/USD">GBP/USD</SelectItem>
                  <SelectItem value="USD/JPY">USD/JPY</SelectItem>
                  <SelectItem value="AUD/USD">AUD/USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Entry Price</Label>
              <Input
                type="number"
                step="0.00001"
                value={positionCalc.entryPrice}
                onChange={(e) => setPositionCalc(prev => ({ ...prev, entryPrice: e.target.value }))}
                placeholder="1.17000"
              />
            </div>

            <div className="space-y-2">
              <Label>Stop Loss</Label>
              <Input
                type="number"
                step="0.00001"
                value={positionCalc.stopLoss}
                onChange={(e) => setPositionCalc(prev => ({ ...prev, stopLoss: e.target.value }))}
                placeholder="1.16500"
              />
            </div>

            <div className="space-y-2">
              <Label>Calculated Size</Label>
              <Input
                value={positionCalc.riskAmount}
                readOnly
                placeholder="Calculate position size"
              />
            </div>
          </div>

          <Button onClick={calculatePositionSize} className="w-full">
            <Calculator className="h-4 w-4 mr-2" />
            Calculate Position Size
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskManagementPanel;