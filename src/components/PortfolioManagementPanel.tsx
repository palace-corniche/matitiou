import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Settings,
  Database,
  Merge,
  AlertTriangle,
  CheckCircle,
  Users,
  BarChart3,
  Trash2,
  Zap
} from 'lucide-react';

interface PortfolioManagementProps {
  portfolioId?: string;
  onPortfolioUpdated?: () => void;
}

export const PortfolioManagementPanel: React.FC<PortfolioManagementProps> = ({
  portfolioId,
  onPortfolioUpdated
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [portfolioStats, setPortfolioStats] = useState<any>(null);
  const [maxOpenTrades, setMaxOpenTrades] = useState([20]);
  const [autoTradingEnabled, setAutoTradingEnabled] = useState(true);
  const { toast } = useToast();

  // Load current portfolio settings
  useEffect(() => {
    const loadPortfolioStats = async () => {
      if (!portfolioId) return;

      try {
        const { data: portfolio, error } = await supabase
          .from('shadow_portfolios')
          .select('*')
          .eq('id', portfolioId)
          .single();

        if (error) throw error;

        setMaxOpenTrades([portfolio.max_open_positions || 20]);
        setAutoTradingEnabled(portfolio.auto_trading_enabled || true);
        setPortfolioStats(portfolio);
      } catch (error: any) {
        console.error('Error loading portfolio stats:', error);
      }
    };

    loadPortfolioStats();
  }, [portfolioId]);

  // Update max open trades
  const updateMaxOpenTrades = async () => {
    if (!portfolioId) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('shadow_portfolios')
        .update({ 
          max_open_positions: maxOpenTrades[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', portfolioId);

      if (error) throw error;

      toast({
        title: "Settings Updated",
        description: `Max open trades set to ${maxOpenTrades[0]}`,
      });

      onPortfolioUpdated?.();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Consolidate portfolios
  const consolidatePortfolios = async () => {
    setIsLoading(true);
    try {
      const sessionId = localStorage.getItem('session_id') || `session_${Date.now()}`;
      localStorage.setItem('session_id', sessionId);

      const { data, error } = await supabase.functions.invoke('consolidate-portfolios', {
        body: { sessionId, force: true }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Consolidation failed');
      }

      toast({
        title: "Portfolio Consolidation Complete",
        description: `${data.consolidatedData.portfoliosMerged || 0} portfolios merged into master portfolio`,
      });

      // Wait a moment then refresh
      setTimeout(() => {
        onPortfolioUpdated?.();
        window.location.reload();
      }, 1000);

    } catch (error: any) {
      toast({
        title: "Consolidation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check system health and portfolio count
  const checkSystemHealth = async () => {
    try {
      const sessionId = localStorage.getItem('session_id');
      
      const { data: portfolios, error } = await supabase
        .from('shadow_portfolios')
        .select('id, account_name, is_active, created_at, total_trades')
        .or(sessionId ? `session_id.eq.${sessionId}` : 'session_id.is.null')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        totalPortfolios: portfolios?.length || 0,
        activePortfolios: portfolios?.filter(p => p.is_active).length || 0,
        portfolios: portfolios || []
      };
    } catch (error: any) {
      console.error('Error checking system health:', error);
      return { totalPortfolios: 0, activePortfolios: 0, portfolios: [] };
    }
  };

  // Clean inactive portfolios
  const cleanInactivePortfolios = async () => {
    setIsLoading(true);
    try {
      const sessionId = localStorage.getItem('session_id');
      
      const { data, error } = await supabase
        .from('shadow_portfolios')
        .delete()
        .eq('is_active', false)
        .or(sessionId ? `session_id.eq.${sessionId}` : 'session_id.is.null');

      if (error) throw error;

      toast({
        title: "Cleanup Complete",
        description: "Inactive portfolios have been removed",
      });

      onPortfolioUpdated?.();
    } catch (error: any) {
      toast({
        title: "Cleanup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const [systemHealth, setSystemHealth] = useState<any>(null);

  useEffect(() => {
    const loadSystemHealth = async () => {
      const health = await checkSystemHealth();
      setSystemHealth(health);
    };
    loadSystemHealth();
  }, []);

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            System Health Overview
          </CardTitle>
          <CardDescription>
            Portfolio management and system optimization tools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {systemHealth && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {systemHealth.totalPortfolios}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Portfolios
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {systemHealth.activePortfolios}
                </div>
                <div className="text-sm text-muted-foreground">
                  Active Portfolios
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {systemHealth.totalPortfolios - systemHealth.activePortfolios}
                </div>
                <div className="text-sm text-muted-foreground">
                  Inactive Portfolios
                </div>
              </div>
            </div>
          )}

          {systemHealth?.totalPortfolios > 1 && (
            <div className="flex flex-col space-y-2 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-orange-600 mr-2" />
                <span className="font-medium text-orange-800">
                  Multiple Portfolios Detected
                </span>
              </div>
              <p className="text-sm text-orange-700">
                You have {systemHealth.totalPortfolios} portfolios. For optimal performance, 
                consider consolidating them into a single unified portfolio.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Portfolio Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Portfolio Configuration
          </CardTitle>
          <CardDescription>
            Adjust trading parameters and risk settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Max Open Trades Setting */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="max-trades">Maximum Open Trades</Label>
              <Badge variant="outline">{maxOpenTrades[0]} trades</Badge>
            </div>
            <Slider
              id="max-trades"
              min={5}
              max={100}
              step={5}
              value={maxOpenTrades}
              onValueChange={setMaxOpenTrades}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Conservative (5)</span>
              <span>Balanced (20)</span>
              <span>Aggressive (100)</span>
            </div>
            <Button 
              onClick={updateMaxOpenTrades}
              disabled={isLoading || !portfolioId}
              size="sm"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Update Settings
            </Button>
          </div>

          <Separator />

          {/* Quick Presets */}
          <div className="space-y-4">
            <Label>Quick Presets</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: "Conservative", value: 5 },
                { label: "Moderate", value: 10 },
                { label: "Balanced", value: 20 },
                { label: "Aggressive", value: 50 }
              ].map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => setMaxOpenTrades([preset.value])}
                  className={maxOpenTrades[0] === preset.value ? 'border-primary' : ''}
                >
                  {preset.label}
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {preset.value} trades
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Management Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Portfolio Management
          </CardTitle>
          <CardDescription>
            Consolidate and optimize your trading portfolios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={consolidatePortfolios}
              disabled={isLoading}
              className="h-16 flex flex-col items-center justify-center space-y-1"
              variant="default"
            >
              <Merge className="h-5 w-5" />
              <span className="font-medium">Consolidate Portfolios</span>
              <span className="text-xs opacity-80">
                Merge multiple portfolios into one
              </span>
            </Button>

            <Button
              onClick={cleanInactivePortfolios}
              disabled={isLoading}
              className="h-16 flex flex-col items-center justify-center space-y-1"
              variant="outline"
            >
              <Trash2 className="h-5 w-5" />
              <span className="font-medium">Clean Database</span>
              <span className="text-xs opacity-80">
                Remove inactive portfolios
              </span>
            </Button>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Zap className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Recommended Actions:</p>
                <ul className="space-y-1">
                  <li>• Use "Consolidate Portfolios" to merge all trades into one master portfolio</li>
                  <li>• Set max open trades based on your risk tolerance (20 is recommended)</li>
                  <li>• Clean inactive portfolios regularly to maintain optimal performance</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};