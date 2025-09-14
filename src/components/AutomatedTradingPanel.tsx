import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { automatedTradingEngine } from '@/services/automatedTradingEngine';
import { Play, Square, Settings, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const AutomatedTradingPanel = ({ portfolioId }: { portfolioId: string }) => {
  const [isActive, setIsActive] = useState(false);
  const [performance, setPerformance] = useState(automatedTradingEngine.getPerformanceStats());
  const [executionHistory, setExecutionHistory] = useState(automatedTradingEngine.getExecutionHistory());
  const { toast } = useToast();

  // Rule creation state
  const [newRule, setNewRule] = useState({
    ruleName: '',
    ruleType: 'regime_change' as const,
    confidenceThreshold: 0.7,
    maxPositionSize: 0.05,
    stopLossPercent: 0.02,
    takeProfitPercent: 0.04
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setPerformance(automatedTradingEngine.getPerformanceStats());
      setExecutionHistory(automatedTradingEngine.getExecutionHistory());
      setIsActive(automatedTradingEngine.isMonitoring());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleToggleAutomation = async () => {
    try {
      if (isActive) {
        automatedTradingEngine.stopAutomatedTrading();
        toast({
          title: "Automation Stopped",
          description: "Automated trading has been disabled",
        });
      } else {
        await automatedTradingEngine.startAutomatedTrading(portfolioId);
        toast({
          title: "Automation Started",
          description: "Automated trading is now monitoring signals",
        });
      }
      setIsActive(!isActive);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle automation",
        variant: "destructive",
      });
    }
  };

  const recentExecutions = executionHistory.slice(-5).reverse();

  return (
    <div className="space-y-6">
      {/* Main Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Automated Trading Engine
              </CardTitle>
              <CardDescription>
                AI-powered automated trading based on intelligence signals
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? "Active" : "Inactive"}
              </Badge>
              <Switch
                checked={isActive}
                onCheckedChange={handleToggleAutomation}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {performance.totalExecutions}
              </div>
              <div className="text-sm text-muted-foreground">Total Executions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(performance.successRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {(performance.avgConfidence * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {performance.recentPerformance}
              </div>
              <div className="text-sm text-muted-foreground">Status</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rule Creation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Trading Rules
          </CardTitle>
          <CardDescription>
            Create automated trading rules based on market conditions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ruleName">Rule Name</Label>
              <Input
                id="ruleName"
                value={newRule.ruleName}
                onChange={(e) => setNewRule(prev => ({ ...prev, ruleName: e.target.value }))}
                placeholder="e.g., Regime Change Alert"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ruleType">Rule Type</Label>
              <Select
                value={newRule.ruleType}
                onValueChange={(value: typeof newRule.ruleType) => 
                  setNewRule(prev => ({ ...prev, ruleType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regime_change">Regime Change</SelectItem>
                  <SelectItem value="economic_surprise">Economic Surprise</SelectItem>
                  <SelectItem value="sentiment_momentum">Sentiment Momentum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confidence">Confidence Threshold</Label>
              <Input
                id="confidence"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={newRule.confidenceThreshold}
                onChange={(e) => setNewRule(prev => ({ 
                  ...prev, 
                  confidenceThreshold: parseFloat(e.target.value) 
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Max Position Size (%)</Label>
              <Input
                id="position"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={newRule.maxPositionSize}
                onChange={(e) => setNewRule(prev => ({ 
                  ...prev, 
                  maxPositionSize: parseFloat(e.target.value) 
                }))}
              />
            </div>
          </div>
          <Button className="w-full" disabled={!newRule.ruleName}>
            <Settings className="h-4 w-4 mr-2" />
            Create Trading Rule
          </Button>
        </CardContent>
      </Card>

      {/* Recent Executions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
          <CardDescription>
            Latest automated trading actions taken by the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentExecutions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No automated executions yet
            </div>
          ) : (
            <div className="space-y-3">
              {recentExecutions.map((execution, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {execution.result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">
                        {execution.result.success ? 'Trade Executed' : 'Execution Failed'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Confidence: {(execution.result.signalConfidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {execution.result.positionSize > 0 && 
                        `${(execution.result.positionSize * 100).toFixed(2)}%`
                      }
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(execution.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};