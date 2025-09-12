import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Clock, Play, BarChart3 } from 'lucide-react';
import { replayValidationEngine, ReplayValidationResult } from '@/services/replayValidationEngine';

export const ReplayValidationDashboard: React.FC = () => {
  const [validationResults, setValidationResults] = useState<ReplayValidationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadValidationResults();
  }, []);

  const loadValidationResults = async () => {
    try {
      const results = await replayValidationEngine.getRecentValidationResults();
      setValidationResults(results);
    } catch (error) {
      console.error('Error loading validation results:', error);
    }
  };

  const runValidation = async () => {
    setIsRunning(true);
    setProgress(0);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
      const endDate = new Date().toISOString();
      
      const results = await replayValidationEngine.runReplayValidation(startDate, endDate);
      setValidationResults(results);
      setProgress(100);
      
      setTimeout(() => {
        setIsRunning(false);
        setProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Error running validation:', error);
      setIsRunning(false);
      setProgress(0);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Replay Validation Engine</h3>
          <p className="text-sm text-muted-foreground">
            Phase 8: Historical tick replay with fusion engine validation
          </p>
        </div>
        <Button 
          onClick={runValidation} 
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          <Play className="h-4 w-4" />
          {isRunning ? 'Running...' : 'Run Validation'}
        </Button>
      </div>

      {isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 animate-spin" />
              Validation in Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              Running PnL Tick Test, Win Rate Test, and Audit Trail Test...
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pnl-test">PnL Tick Test</TabsTrigger>
          <TabsTrigger value="win-rate">Win Rate Test</TabsTrigger>
          <TabsTrigger value="audit-trail">Audit Trail Test</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {validationResults.map((result) => (
              <Card key={result.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {result.validation_type.replace(/_/g, ' ').toUpperCase()}
                    </CardTitle>
                    {getStatusIcon(result.validation_status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Status:</span>
                    <Badge variant="outline" className={`${getStatusColor(result.validation_status)} text-white`}>
                      {result.validation_status}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Signals:</span>
                    <span>{result.signals_executed}/{result.signals_generated}</span>
                  </div>
                  {result.validation_type === 'pnl_tick_test' && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Win Rate:</span>
                        <span>{result.win_rate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total PnL:</span>
                        <span className={result.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ${result.total_pnl.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>Execution:</span>
                    <span>{result.execution_time_ms}ms</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {validationResults.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Validation Results</h3>
                <p className="text-muted-foreground mb-4">
                  Run your first replay validation to see results here.
                </p>
                <Button onClick={runValidation} disabled={isRunning}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Validation
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pnl-test" className="space-y-4">
          {validationResults
            .filter(r => r.validation_type === 'pnl_tick_test')
            .map((result) => (
              <Card key={result.id}>
                <CardHeader>
                  <CardTitle>PnL Tick Test Results</CardTitle>
                  <CardDescription>
                    MT4-accurate PnL, pip calculation, balance, and margin validation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {result.total_ticks_processed}
                      </div>
                      <div className="text-sm text-muted-foreground">Ticks Processed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {result.win_rate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Win Rate</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${result.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${result.total_pnl.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total PnL</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {result.sharpe_ratio.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>PnL Accuracy:</span>
                      <span>{result.pnl_accuracy.toFixed(1)}%</span>
                    </div>
                    <Progress value={result.pnl_accuracy} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Margin Accuracy:</span>
                      <span>{result.margin_accuracy.toFixed(1)}%</span>
                    </div>
                    <Progress value={result.margin_accuracy} className="h-2" />
                  </div>

                  {result.discrepancies.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Discrepancies Found:</h4>
                      <div className="space-y-1">
                        {result.discrepancies.map((disc, index) => (
                          <div key={index} className="text-sm bg-yellow-50 p-2 rounded">
                            {disc.description || 'Discrepancy detected'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="win-rate" className="space-y-4">
          {validationResults
            .filter(r => r.validation_type === 'win_rate_test')
            .map((result) => (
              <Card key={result.id}>
                <CardHeader>
                  <CardTitle>Win Rate Test Results</CardTitle>
                  <CardDescription>
                    Comparison of system output vs actual EUR/USD market behavior
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {result.win_rate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Actual Win Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {result.total_pips.toFixed(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Pips</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {result.max_drawdown.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Max Drawdown</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {result.test_results.map((test, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="capitalize">{test.metric?.replace(/_/g, ' ')}:</span>
                        <div className="flex items-center gap-2">
                          <span>Expected: {test.expected}</span>
                          <span>Actual: {test.actual}</span>
                          <Badge variant={Math.abs(test.variance) <= 5 ? "default" : "destructive"}>
                            {test.variance > 0 ? '+' : ''}{test.variance}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="audit-trail" className="space-y-4">
          {validationResults
            .filter(r => r.validation_type === 'audit_trail_test')
            .map((result) => (
              <Card key={result.id}>
                <CardHeader>
                  <CardTitle>Audit Trail Test Results</CardTitle>
                  <CardDescription>
                    Signal reproducibility and decision logging validation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {result.signals_generated}
                      </div>
                      <div className="text-sm text-muted-foreground">Decisions Logged</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {result.pnl_accuracy.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Timestamp Accuracy</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {result.discrepancies.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Discrepancies</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Audit Checks:</h4>
                    {result.test_results.map((check, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded bg-gray-50">
                        <span className="capitalize">{check.check?.replace(/_/g, ' ')}:</span>
                        <div className="flex items-center gap-2">
                          {check.passed ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm text-muted-foreground">{check.details}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {result.discrepancies.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Issues Found:</h4>
                      <div className="space-y-1">
                        {result.discrepancies.map((disc, index) => (
                          <div key={index} className="text-sm bg-yellow-50 p-2 rounded flex justify-between">
                            <span>{disc.type?.replace(/_/g, ' ')}</span>
                            <Badge variant="outline">{disc.count} occurrences</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};