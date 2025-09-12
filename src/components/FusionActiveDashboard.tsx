import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Square, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Settings,
  Eye,
  Activity
} from 'lucide-react';
import { fusionActiveEngine, ActiveSignalExecution, FusionActiveMode } from '@/services/fusionActiveEngine';
import { fusionEngine } from '@/services/fusionEngine';

export const FusionActiveDashboard: React.FC = () => {
  const [activeMode, setActiveMode] = useState<FusionActiveMode>(fusionActiveEngine.getActiveConfiguration());
  const [pendingExecutions, setPendingExecutions] = useState<ActiveSignalExecution[]>([]);
  const [executedSignals, setExecutedSignals] = useState<ActiveSignalExecution[]>([]);
  const [reliabilityStats, setReliabilityStats] = useState<any>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setPendingExecutions(fusionActiveEngine.getPendingExecutions());
    setExecutedSignals(fusionActiveEngine.getExecutedSignals());
    const stats = await fusionActiveEngine.monitorMasterSignalReliability();
    setReliabilityStats(stats);
  };

  const toggleActiveMode = (enabled: boolean) => {
    fusionActiveEngine.setActiveMode(enabled);
    setActiveMode(fusionActiveEngine.getActiveConfiguration());
  };

  const handleUserDecision = async (executionId: string, decision: 'execute' | 'pause' | 'stop') => {
    await fusionActiveEngine.handleUserDecision(executionId, decision);
    loadData();
  };

  const generateTestSignal = async () => {
    // Generate a test master signal
    const masterSignal = await fusionEngine.generateMasterSignal('EURUSD', 'M15');
    if (masterSignal) {
      await fusionActiveEngine.processMasterSignal(masterSignal);
      loadData();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'executed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected': return <Square className="h-4 w-4 text-red-500" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getReliabilityColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Fusion Active Mode</h3>
          <p className="text-sm text-muted-foreground">
            Phase 9: Master Signals → User-Controlled Shadow Trading
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="text-sm">Active Mode</span>
            <Switch 
              checked={activeMode.enabled} 
              onCheckedChange={toggleActiveMode}
            />
          </div>
          <Button 
            onClick={generateTestSignal}
            variant="outline"
            size="sm"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Generate Test Signal
          </Button>
        </div>
      </div>

      {!activeMode.enabled && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Fusion Active Mode is disabled. Enable it to process Master Signals for execution.
          </AlertDescription>
        </Alert>
      )}

      {activeMode.enabled && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            🔥 Fusion Active Mode is ENABLED. Master Signals are now visible and executable.
          </AlertDescription>
        </Alert>
      )}

      {/* System Health Monitor */}
      {reliabilityStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Master Signal Reliability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getReliabilityColor(reliabilityStats.reliability_score)}`}>
                  {reliabilityStats.reliability_score.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Reliability Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {reliabilityStats.total_signals_processed}
                </div>
                <div className="text-sm text-muted-foreground">Signals Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {reliabilityStats.successful_executions}
                </div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {reliabilityStats.failed_executions}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Execution Rate</span>
                <span>{reliabilityStats.execution_rate.toFixed(1)}%</span>
              </div>
              <Progress value={reliabilityStats.execution_rate} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Signals ({pendingExecutions.length})
          </TabsTrigger>
          <TabsTrigger value="executed">
            Executed ({executedSignals.length})
          </TabsTrigger>
          <TabsTrigger value="settings">
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingExecutions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pending Signals</h3>
                <p className="text-muted-foreground mb-4">
                  No Master Signals awaiting user decision.
                </p>
                <Button onClick={generateTestSignal} variant="outline">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Generate Test Signal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingExecutions.map((execution) => (
                <Card key={execution.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        Master Signal Execution
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(execution.execution_status)}
                        <Badge variant="outline">
                          {execution.execution_status}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>
                      Signal ID: {execution.master_signal_id.slice(0, 8)}...
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Created:</span>
                        <div>{new Date(execution.created_at).toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <div className="capitalize">{execution.execution_status}</div>
                      </div>
                    </div>

                    {execution.execution_status === 'pending' && (
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleUserDecision(execution.id, 'execute')}
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Play className="h-3 w-3" />
                          Execute
                        </Button>
                        <Button 
                          onClick={() => handleUserDecision(execution.id, 'pause')}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Pause className="h-3 w-3" />
                          Pause
                        </Button>
                        <Button 
                          onClick={() => handleUserDecision(execution.id, 'stop')}
                          variant="destructive"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Square className="h-3 w-3" />
                          Stop
                        </Button>
                      </div>
                    )}

                    {execution.rejection_reason && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {execution.rejection_reason}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="executed" className="space-y-4">
          {executedSignals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Executed Signals</h3>
                <p className="text-muted-foreground">
                  No signals have been executed yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {executedSignals.map((execution) => (
                <Card key={execution.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        Executed Signal
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(execution.execution_status)}
                        <Badge variant="outline">
                          {execution.execution_status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Executed:</span>
                        <div>{execution.execution_timestamp ? new Date(execution.execution_timestamp).toLocaleString() : 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Trade ID:</span>
                        <div>{execution.trade_id ? execution.trade_id.slice(0, 8) + '...' : 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">User Decision:</span>
                        <div className="capitalize">{execution.user_decision || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <div className="capitalize">{execution.execution_status}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Fusion Active Configuration
              </CardTitle>
              <CardDescription>
                Configure how Master Signals are processed and executed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Concurrent Trades</label>
                  <div className="text-2xl font-bold text-blue-600">
                    {activeMode.max_concurrent_trades}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Risk Per Trade</label>
                  <div className="text-2xl font-bold text-green-600">
                    {activeMode.risk_per_trade}%
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Daily Loss Limit</label>
                  <div className="text-2xl font-bold text-red-600">
                    ${activeMode.daily_loss_limit}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stop Loss Mode</label>
                  <div className="text-2xl font-bold text-purple-600 capitalize">
                    {activeMode.stop_loss_mode}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Auto Execute</div>
                    <div className="text-sm text-muted-foreground">
                      Automatically execute approved signals
                    </div>
                  </div>
                  <Switch 
                    checked={activeMode.auto_execute}
                    onCheckedChange={(checked) => {
                      fusionActiveEngine.updateActiveConfiguration({ auto_execute: checked });
                      setActiveMode(fusionActiveEngine.getActiveConfiguration());
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">User Confirmation Required</div>
                    <div className="text-sm text-muted-foreground">
                      Require user confirmation before execution
                    </div>
                  </div>
                  <Switch 
                    checked={activeMode.user_confirmation_required}
                    onCheckedChange={(checked) => {
                      fusionActiveEngine.updateActiveConfiguration({ user_confirmation_required: checked });
                      setActiveMode(fusionActiveEngine.getActiveConfiguration());
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};