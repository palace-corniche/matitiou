import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Zap, Play, Pause, Settings, Activity, Clock, Target,
  TrendingUp, AlertTriangle, CheckCircle, RefreshCw, Bot
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AutomationRule {
  id: string;
  name: string;
  type: 'trailing_stop' | 'break_even' | 'partial_close' | 'time_exit' | 'correlation_exit';
  enabled: boolean;
  conditions: any;
  actions: any;
  lastTriggered?: string;
  triggerCount: number;
}

interface AutomationStats {
  totalRules: number;
  activeRules: number;
  triggeredToday: number;
  successRate: number;
  profitImpact: number;
}

interface AutomationPanelProps {
  portfolioId: string | null;
  autoTradingEnabled: boolean;
  onToggleAutoTrading: (enabled: boolean) => void;
}

const AutomationPanel: React.FC<AutomationPanelProps> = ({
  portfolioId,
  autoTradingEnabled,
  onToggleAutoTrading
}) => {
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [stats, setStats] = useState<AutomationStats>({
    totalRules: 0,
    activeRules: 0,
    triggeredToday: 0,
    successRate: 0,
    profitImpact: 0
  });

  const [newRule, setNewRule] = useState<{
    name: string;
    type: 'trailing_stop' | 'break_even' | 'partial_close' | 'time_exit' | 'correlation_exit';
    enabled: boolean;
    conditions: {
      profitPips: number;
      distance: number;
      timeMinutes: number;
      partialPercent: number;
    };
  }>({
    name: '',
    type: 'trailing_stop',
    enabled: true,
    conditions: {
      profitPips: 20,
      distance: 15,
      timeMinutes: 60,
      partialPercent: 50
    }
  });

  const [isCreatingRule, setIsCreatingRule] = useState(false);

  useEffect(() => {
    if (portfolioId) {
      loadAutomationRules();
      loadAutomationStats();
    }
  }, [portfolioId]);

  const loadAutomationRules = async () => {
    if (!portfolioId) return;

    try {
      // Load automation rules from database (simplified - would need to create table)
      const defaultRules: AutomationRule[] = [
        {
          id: '1',
          name: 'Auto Break-Even',
          type: 'break_even',
          enabled: true,
          conditions: { profitPips: 20 },
          actions: { moveSLToEntry: true },
          triggerCount: 15,
          lastTriggered: '2024-01-08T10:30:00Z'
        },
        {
          id: '2',
          name: 'Trailing Stop 15 Pips',
          type: 'trailing_stop',
          enabled: true,
          conditions: { profitPips: 25, distance: 15 },
          actions: { trailingDistance: 15 },
          triggerCount: 8,
          lastTriggered: '2024-01-08T09:45:00Z'
        },
        {
          id: '3',
          name: 'Partial Close at 50 Pips',
          type: 'partial_close',
          enabled: false,
          conditions: { profitPips: 50 },
          actions: { closePercent: 50 },
          triggerCount: 3
        }
      ];

      setAutomationRules(defaultRules);
    } catch (error) {
      console.error('Error loading automation rules:', error);
    }
  };

  const loadAutomationStats = async () => {
    try {
      // Calculate stats from EA logs and trade history
      const activeRules = automationRules.filter(rule => rule.enabled).length;
      const triggeredToday = automationRules.reduce((sum, rule) => {
        const lastTriggered = rule.lastTriggered ? new Date(rule.lastTriggered) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return sum + (lastTriggered && lastTriggered >= today ? 1 : 0);
      }, 0);

      setStats({
        totalRules: automationRules.length,
        activeRules,
        triggeredToday,
        successRate: 87.5, // Would calculate from actual data
        profitImpact: 1250.75 // Would calculate from trade results
      });
    } catch (error) {
      console.error('Error loading automation stats:', error);
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    setAutomationRules(rules => 
      rules.map(rule => 
        rule.id === ruleId ? { ...rule, enabled } : rule
      )
    );

    toast.success(`Automation rule ${enabled ? 'enabled' : 'disabled'}`);
  };

  const createAutomationRule = async () => {
    if (!newRule.name.trim()) {
      toast.error('Please enter a rule name');
      return;
    }

    setIsCreatingRule(true);

    try {
      const rule: AutomationRule = {
        id: Math.random().toString(36).substr(2, 9),
        name: newRule.name,
        type: newRule.type,
        enabled: newRule.enabled,
        conditions: newRule.conditions,
        actions: getActionsForType(newRule.type, newRule.conditions),
        triggerCount: 0
      };

      setAutomationRules(prev => [...prev, rule]);
      
      // Reset form
      setNewRule({
        name: '',
        type: 'trailing_stop',
        enabled: true,
        conditions: {
          profitPips: 20,
          distance: 15,
          timeMinutes: 60,
          partialPercent: 50
        }
      });

      toast.success('Automation rule created successfully');
    } catch (error) {
      console.error('Error creating automation rule:', error);
      toast.error('Failed to create automation rule');
    } finally {
      setIsCreatingRule(false);
    }
  };

  const getActionsForType = (type: string, conditions: any) => {
    switch (type) {
      case 'trailing_stop':
        return { trailingDistance: conditions.distance };
      case 'break_even':
        return { moveSLToEntry: true };
      case 'partial_close':
        return { closePercent: conditions.partialPercent };
      case 'time_exit':
        return { closeAfterMinutes: conditions.timeMinutes };
      default:
        return {};
    }
  };

  const executeAutomationUpdate = async () => {
    if (!portfolioId) return;

    try {
      // Execute trailing stops
      await supabase.functions.invoke('enhanced-trading', {
        body: {
          action: 'update_trailing_stops'
        }
      });

      // Execute break-even management
      await supabase.functions.invoke('enhanced-trading', {
        body: {
          action: 'manage_break_even'
        }
      });

      toast.success('Automation update executed');
    } catch (error) {
      console.error('Error executing automation update:', error);
      toast.error('Failed to execute automation update');
    }
  };

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case 'trailing_stop': return 'Trailing Stop';
      case 'break_even': return 'Break-Even';
      case 'partial_close': return 'Partial Close';
      case 'time_exit': return 'Time Exit';
      case 'correlation_exit': return 'Correlation Exit';
      default: return type;
    }
  };

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case 'trailing_stop': return <TrendingUp className="h-4 w-4" />;
      case 'break_even': return <Target className="h-4 w-4" />;
      case 'partial_close': return <Activity className="h-4 w-4" />;
      case 'time_exit': return <Clock className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Automation Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Trading Automation
            <Badge variant={autoTradingEnabled ? "default" : "secondary"}>
              {autoTradingEnabled ? 'Active' : 'Inactive'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Automated trading rules and risk management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={autoTradingEnabled}
                onCheckedChange={onToggleAutoTrading}
              />
              <Label>Enable Auto Trading</Label>
            </div>
            <Button onClick={executeAutomationUpdate} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Update Now
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{stats.totalRules}</div>
              <div className="text-sm text-muted-foreground">Total Rules</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.activeRules}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.triggeredToday}</div>
              <div className="text-sm text-muted-foreground">Triggered Today</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{stats.successRate}%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Profit Impact Today</span>
              <span className="font-medium text-green-600">+${stats.profitImpact.toFixed(2)}</span>
            </div>
            <Progress value={75} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Active Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {automationRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getRuleTypeIcon(rule.type)}
                  <div>
                    <div className="font-medium">{rule.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {getRuleTypeLabel(rule.type)} • Triggered {rule.triggerCount} times
                      {rule.lastTriggered && (
                        <span> • Last: {new Date(rule.lastTriggered).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={rule.enabled ? "default" : "secondary"}>
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(enabled) => toggleRule(rule.id, enabled)}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create New Rule */}
      <Card>
        <CardHeader>
          <CardTitle>Create Automation Rule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input
                value={newRule.name}
                onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My automation rule"
              />
            </div>

            <div className="space-y-2">
              <Label>Rule Type</Label>
              <Select 
                value={newRule.type}
                onValueChange={(value: any) => setNewRule(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trailing_stop">Trailing Stop</SelectItem>
                  <SelectItem value="break_even">Break-Even</SelectItem>
                  <SelectItem value="partial_close">Partial Close</SelectItem>
                  <SelectItem value="time_exit">Time-Based Exit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dynamic conditions based on rule type */}
          <div className="grid grid-cols-2 gap-4">
            {(newRule.type === 'trailing_stop') && (
              <>
                <div className="space-y-2">
                  <Label>Profit Threshold (pips)</Label>
                  <Input
                    type="number"
                    value={newRule.conditions.profitPips}
                    onChange={(e) => setNewRule(prev => ({
                      ...prev,
                      conditions: { ...prev.conditions, profitPips: parseInt(e.target.value) }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Trailing Distance (pips)</Label>
                  <Input
                    type="number"
                    value={newRule.conditions.distance}
                    onChange={(e) => setNewRule(prev => ({
                      ...prev,
                      conditions: { ...prev.conditions, distance: parseInt(e.target.value) }
                    }))}
                  />
                </div>
              </>
            )}

            {(newRule.type === 'break_even') && (
              <div className="space-y-2">
                <Label>Profit Threshold (pips)</Label>
                <Input
                  type="number"
                  value={newRule.conditions.profitPips}
                  onChange={(e) => setNewRule(prev => ({
                    ...prev,
                    conditions: { ...prev.conditions, profitPips: parseInt(e.target.value) }
                  }))}
                />
              </div>
            )}

            {(newRule.type === 'partial_close') && (
              <>
                <div className="space-y-2">
                  <Label>Profit Threshold (pips)</Label>
                  <Input
                    type="number"
                    value={newRule.conditions.profitPips}
                    onChange={(e) => setNewRule(prev => ({
                      ...prev,
                      conditions: { ...prev.conditions, profitPips: parseInt(e.target.value) }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Close Percentage (%)</Label>
                  <Input
                    type="number"
                    value={newRule.conditions.partialPercent}
                    onChange={(e) => setNewRule(prev => ({
                      ...prev,
                      conditions: { ...prev.conditions, partialPercent: parseInt(e.target.value) }
                    }))}
                  />
                </div>
              </>
            )}

            {(newRule.type === 'time_exit') && (
              <div className="space-y-2">
                <Label>Time Limit (minutes)</Label>
                <Input
                  type="number"
                  value={newRule.conditions.timeMinutes}
                  onChange={(e) => setNewRule(prev => ({
                    ...prev,
                    conditions: { ...prev.conditions, timeMinutes: parseInt(e.target.value) }
                  }))}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={newRule.enabled}
              onCheckedChange={(enabled) => setNewRule(prev => ({ ...prev, enabled }))}
            />
            <Label>Enable immediately</Label>
          </div>

          <Button 
            onClick={createAutomationRule} 
            disabled={isCreatingRule}
            className="w-full"
          >
            {isCreatingRule ? 'Creating...' : 'Create Automation Rule'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutomationPanel;