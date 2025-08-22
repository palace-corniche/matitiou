import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, DollarSign, TrendingUp, Shield, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { metaTraderPositionSizing } from '@/services/metaTraderPositionSizing';

interface AccountSettingsDialogProps {
  portfolioId: string;
  currentSettings: {
    account_currency: string;
    leverage: number;
    account_type: string;
    balance: number;
    daily_loss_limit: number;
    max_drawdown_limit: number;
    margin_call_level: number;
    stop_out_level: number;
  };
  onSettingsUpdate: () => void;
}

const AccountSettingsDialog: React.FC<AccountSettingsDialogProps> = ({
  portfolioId,
  currentSettings,
  onSettingsUpdate
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(currentSettings);
  const { toast } = useToast();

  const currencies = [
    { value: 'USD', label: 'US Dollar (USD)', symbol: '$' },
    { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
    { value: 'GBP', label: 'British Pound (GBP)', symbol: '£' },
    { value: 'JPY', label: 'Japanese Yen (JPY)', symbol: '¥' },
    { value: 'CHF', label: 'Swiss Franc (CHF)', symbol: 'Fr' },
    { value: 'CAD', label: 'Canadian Dollar (CAD)', symbol: 'C$' },
    { value: 'AUD', label: 'Australian Dollar (AUD)', symbol: 'A$' }
  ];

  const accountTypes = [
    { value: 'standard', label: 'Standard Account', description: 'Standard lots (100,000 units)', minLot: '0.01' },
    { value: 'mini', label: 'Mini Account', description: 'Mini lots (10,000 units)', minLot: '0.1' },
    { value: 'micro', label: 'Micro Account', description: 'Micro lots (1,000 units)', minLot: '1.0' },
    { value: 'nano', label: 'Nano Account', description: 'Nano lots (100 units)', minLot: '10.0' }
  ];

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings]);

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Validate settings
      const validation = metaTraderPositionSizing.validateAccountSettings({
        leverage: settings.leverage,
        balance: settings.balance,
        marginCallLevel: settings.margin_call_level,
        stopOutLevel: settings.stop_out_level
      });

      if (!validation.isValid) {
        toast({
          title: "Validation Error",
          description: validation.errors.join(', '),
          variant: "destructive"
        });
        return;
      }

      // Update portfolio settings
      const { error } = await supabase
        .from('shadow_portfolios')
        .update({
          account_currency: settings.account_currency,
          leverage: settings.leverage,
          account_type: settings.account_type,
          balance: settings.balance,
          equity: settings.balance, // Reset equity to balance when changing settings
          daily_loss_limit: settings.daily_loss_limit,
          max_drawdown_limit: settings.max_drawdown_limit,
          margin_call_level: settings.margin_call_level,
          stop_out_level: settings.stop_out_level,
          updated_at: new Date().toISOString()
        })
        .eq('id', portfolioId);

      if (error) throw error;

      toast({
        title: "Settings Updated",
        description: "Account settings have been successfully updated."
      });

      onSettingsUpdate();
      setOpen(false);
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update account settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getLeverageLabel = (leverage: number) => {
    return `1:${leverage}`;
  };

  const selectedCurrency = currencies.find(c => c.value === settings.account_currency);
  const selectedAccountType = accountTypes.find(a => a.value === settings.account_type);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Account Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            MetaTrader Account Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Account Currency */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Account Currency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={settings.account_currency} 
                onValueChange={(value) => setSettings({...settings, account_currency: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(currency => (
                    <SelectItem key={currency.value} value={currency.value}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{currency.symbol}</Badge>
                        {currency.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Account Type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Account Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={settings.account_type} 
                onValueChange={(value) => setSettings({...settings, account_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {type.description} • Min lot: {type.minLot}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAccountType && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {selectedAccountType.description}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Balance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Account Balance</CardTitle>
              <CardDescription>
                Initial trading capital in {selectedCurrency?.symbol || '$'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium">{selectedCurrency?.symbol || '$'}</span>
                <Input
                  type="number"
                  value={settings.balance}
                  onChange={(e) => setSettings({...settings, balance: parseFloat(e.target.value) || 0})}
                  min="100"
                  step="100"
                  className="flex-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Leverage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Leverage</CardTitle>
              <CardDescription>
                Current: {getLeverageLabel(settings.leverage)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Slider
                  value={[settings.leverage]}
                  onValueChange={([value]) => setSettings({...settings, leverage: value})}
                  min={1}
                  max={500}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>1:1</span>
                  <span>1:100</span>
                  <span>1:500</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Risk Management */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Risk Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Daily Loss Limit</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm">{selectedCurrency?.symbol || '$'}</span>
                    <Input
                      type="number"
                      value={settings.daily_loss_limit}
                      onChange={(e) => setSettings({...settings, daily_loss_limit: parseFloat(e.target.value) || 0})}
                      min="0"
                      step="100"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Max Drawdown (%)</Label>
                  <Input
                    type="number"
                    value={settings.max_drawdown_limit}
                    onChange={(e) => setSettings({...settings, max_drawdown_limit: parseFloat(e.target.value) || 0})}
                    min="0"
                    max="100"
                    step="0.5"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Margin Call Level (%)</Label>
                  <Input
                    type="number"
                    value={settings.margin_call_level}
                    onChange={(e) => setSettings({...settings, margin_call_level: parseFloat(e.target.value) || 0})}
                    min="50"
                    max="200"
                    step="5"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Stop Out Level (%)</Label>
                  <Input
                    type="number"
                    value={settings.stop_out_level}
                    onChange={(e) => setSettings({...settings, stop_out_level: parseFloat(e.target.value) || 0})}
                    min="10"
                    max="100"
                    step="5"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning about resetting equity */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">Settings Reset Warning</p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                Changing account settings will reset your equity to the new balance amount and close all open positions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Updating...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountSettingsDialog;