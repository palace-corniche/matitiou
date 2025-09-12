import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap, 
  Database, 
  TrendingUp,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { preflightSystem, PreflightReport, DataProvider } from '@/services/preflightSystem';

export const PreflightMonitor: React.FC = () => {
  const [report, setReport] = useState<PreflightReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  useEffect(() => {
    runPreflightCheck();
    
    // Run checks every 30 seconds
    const interval = setInterval(runPreflightCheck, 30000);
    return () => clearInterval(interval);
  }, []);

  const runPreflightCheck = async () => {
    setIsRunning(true);
    try {
      const result = await preflightSystem.runPreflightChecks();
      setReport(result);
      setLastCheck(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Preflight check failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getProviderIcon = (type: DataProvider['type']) => {
    switch (type) {
      case 'market_data': return <TrendingUp className="h-4 w-4" />;
      case 'historical': return <Database className="h-4 w-4" />;
      case 'news': return <AlertTriangle className="h-4 w-4" />;
      case 'dom': return <Zap className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: DataProvider['status']) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      error: 'destructive',
      unknown: 'outline'
    } as const;

    return (
      <Badge variant={variants[status]} className="ml-2">
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 50) return 'text-green-500';
    if (latency < 100) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (!report) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Running preflight checks...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {report.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              System Preflight Status
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Last check: {lastCheck}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={runPreflightCheck}
                disabled={isRunning}
              >
                {isRunning ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {report.criticalErrors.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {report.criticalErrors.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {report.warnings.length > 0 && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {report.warnings.map((warning, index) => (
                    <div key={index}>• {warning}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Data Providers */}
      <Card>
        <CardHeader>
          <CardTitle>Data Providers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {report.providers.map((provider, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getProviderIcon(provider.type)}
                  <div>
                    <div className="font-medium">{provider.name}</div>
                    {provider.lastUpdate && (
                      <div className="text-sm text-muted-foreground">
                        Last update: {new Date(provider.lastUpdate).toLocaleTimeString()}
                      </div>
                    )}
                    {provider.errorMessage && (
                      <div className="text-sm text-red-500">
                        {provider.errorMessage}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {provider.latency && (
                    <span className={`text-sm ${getLatencyColor(provider.latency)}`}>
                      {provider.latency.toFixed(0)}ms
                    </span>
                  )}
                  {getStatusBadge(provider.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Latency Check */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Latency Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Average Latency:</span>
                <span className={getLatencyColor(report.latencyCheck.avgLatency)}>
                  {report.latencyCheck.avgLatency}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span>Max Latency:</span>
                <span className={getLatencyColor(report.latencyCheck.maxLatency)}>
                  {report.latencyCheck.maxLatency}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span>Threshold:</span>
                <span>100ms</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                {report.latencyCheck.passed ? (
                  <Badge variant="default">PASSED</Badge>
                ) : (
                  <Badge variant="destructive">FAILED</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Decimal Math Check */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Decimal Precision
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.decimalMathCheck.testResults.map((test, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{test.test}:</span>
                  {test.passed ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              ))}
              <div className="mt-3 pt-3 border-t">
                <div className="flex justify-between">
                  <span className="font-medium">Overall:</span>
                  {report.decimalMathCheck.passed ? (
                    <Badge variant="default">PASSED</Badge>
                  ) : (
                    <Badge variant="destructive">FAILED</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};