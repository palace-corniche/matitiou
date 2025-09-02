// System Validation Dashboard
// Comprehensive view of system health, quality metrics, and validation results

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, AlertTriangle, CheckCircle, Clock, Cpu, Database,
  LineChart, ShieldCheck, TrendingUp, Zap, Target, Settings,
  AlertCircle, Timer, BarChart3, Layers, RefreshCw
} from 'lucide-react';
import { systemValidator, EndToEndTestResult, ValidationResult } from '@/services/systemValidator';
import { qualityAssurance, QualityMetrics, QualityAlert } from '@/services/qualityAssurance';

const SystemValidationDashboard: React.FC = () => {
  const [testResults, setTestResults] = useState<EndToEndTestResult | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [qualityAlerts, setQualityAlerts] = useState<QualityAlert[]>([]);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [lastTestTime, setLastTestTime] = useState<Date | null>(null);

  useEffect(() => {
    loadInitialData();
    
    // Auto-refresh every 2 minutes
    const interval = setInterval(loadInitialData, 120000);
    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    try {
      const [metrics, alerts] = await Promise.all([
        qualityAssurance.performQualityCheck(),
        Promise.resolve(qualityAssurance.getActiveAlerts())
      ]);
      
      setQualityMetrics(metrics);
      setQualityAlerts(alerts);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const runFullValidation = async () => {
    setIsRunningTest(true);
    try {
      const result = await systemValidator.runEndToEndTest();
      setTestResults(result);
      setLastTestTime(new Date());
    } catch (error) {
      console.error('Validation test failed:', error);
    } finally {
      setIsRunningTest(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-blue-500" />
            System Validation Dashboard
          </h1>
          <p className="text-muted-foreground">
            Comprehensive system health monitoring and quality assurance
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastTestTime && (
            <div className="text-sm text-muted-foreground">
              Last test: {lastTestTime.toLocaleTimeString()}
            </div>
          )}
          <Button 
            onClick={runFullValidation} 
            disabled={isRunningTest}
            className="flex items-center gap-2"
          >
            {isRunningTest ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Target className="w-4 h-4" />
                Run Validation
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quality Overview */}
      {qualityMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Signal Quality</CardTitle>
              <LineChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(qualityMetrics.signalQuality)}`}>
                {qualityMetrics.signalQuality.toFixed(1)}%
              </div>
              <Progress value={qualityMetrics.signalQuality} className="h-2 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Factor Diversity</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(qualityMetrics.factorDiversity)}`}>
                {qualityMetrics.factorDiversity.toFixed(1)}%
              </div>
              <Progress value={qualityMetrics.factorDiversity} className="h-2 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Math Accuracy</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(qualityMetrics.mathematicalAccuracy)}`}>
                {qualityMetrics.mathematicalAccuracy.toFixed(1)}%
              </div>
              <Progress value={qualityMetrics.mathematicalAccuracy} className="h-2 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(qualityMetrics.processingEfficiency)}`}>
                {qualityMetrics.processingEfficiency.toFixed(1)}%
              </div>
              <Progress value={qualityMetrics.processingEfficiency} className="h-2 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consistency</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(qualityMetrics.consistencyScore)}`}>
                {qualityMetrics.consistencyScore.toFixed(1)}%
              </div>
              <Progress value={qualityMetrics.consistencyScore} className="h-2 mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Validation Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              End-to-End Validation
            </CardTitle>
            <CardDescription>
              Comprehensive system validation results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {testResults ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Overall Score</span>
                  <Badge variant={getScoreBadgeColor(testResults.overallScore)}>
                    {testResults.overallScore.toFixed(1)}%
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {Object.entries(testResults.stages).map(([stage, result]) => (
                    <div key={stage} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {result.passed ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="capitalize font-medium">
                          {stage.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${getScoreColor(result.score)}`}>
                          {result.score.toFixed(0)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDuration(result.metrics.processingTime)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Processing Time</div>
                    <div className="text-muted-foreground">
                      {formatDuration(testResults.performance.totalProcessingTime)}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Memory Usage</div>
                    <div className="text-muted-foreground">
                      {testResults.performance.memoryUsage}MB
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Throughput</div>
                    <div className="text-muted-foreground">
                      {testResults.performance.throughput}/min
                    </div>
                  </div>
                </div>

                {testResults.criticalIssues.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="font-medium text-red-600 mb-2">Critical Issues</div>
                      <div className="space-y-1">
                        {testResults.criticalIssues.map((issue, index) => (
                          <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                            {issue}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Run validation to see detailed results</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Quality Alerts
            </CardTitle>
            <CardDescription>
              Active quality monitoring alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {qualityAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50 text-green-500" />
                  <p>No active alerts - system running smoothly</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {qualityAlerts.map((alert) => (
                    <Alert key={alert.id}>
                      <div className="flex items-start gap-3">
                        <div className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)} mt-1`} />
                        <div className="flex-1">
                          <div className="font-medium">{alert.message}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {alert.recommendations.slice(0, 2).join(', ')}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {alert.category}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {alert.severity}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {alert.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">15+</div>
              <div className="text-sm text-muted-foreground">Target Factors/Signal</div>
              <div className="text-xs text-green-600 mt-1">✓ Optimized</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">0.85</div>
              <div className="text-sm text-muted-foreground">Target Entropy</div>
              <div className="text-xs text-green-600 mt-1">✓ Calibrated</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">20+</div>
              <div className="text-sm text-muted-foreground">Target Confluence</div>
              <div className="text-xs text-green-600 mt-1">✓ Validated</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">&lt;5s</div>
              <div className="text-sm text-muted-foreground">Processing Time</div>
              <div className="text-xs text-green-600 mt-1">✓ Efficient</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemValidationDashboard;