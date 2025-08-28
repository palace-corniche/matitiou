import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, TrendingDown, Activity, AlertTriangle, CheckCircle, XCircle, Eye, Target } from 'lucide-react';

interface MasterSignalData {
  id: string;
  timestamp: string;
  signal: 'buy' | 'sell' | 'hold';
  fusedProbability: number;
  confidence: number;
  strength: number;
  kellyFraction: number;
  moduleContributions: Record<string, number>;
  entropyValue: number;
  signalQuality: number;
  diversityIndex: number;
  consensusLevel: number;
  reasoning: string;
  warnings: string[];
}

interface ModuleAnalytics {
  module: string;
  signalsGenerated: number;
  avgProbability: number;
  avgConfidence: number;
  contributionPercent: number;
  status: 'active' | 'inactive' | 'error';
  lastSignal?: string;
}

interface SignalDiagnostics {
  totalFactors: number;
  activeModules: string[];
  missingModules: string[];
  dataQuality: Record<string, number>;
  processingTime: number;
  errors: string[];
  warnings: string[];
}

interface RejectionAnalysis {
  reason: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

const EnhancedSignalAnalyticsDashboard: React.FC = () => {
  const [masterSignals, setMasterSignals] = useState<MasterSignalData[]>([]);
  const [moduleAnalytics, setModuleAnalytics] = useState<ModuleAnalytics[]>([]);
  const [diagnostics, setDiagnostics] = useState<SignalDiagnostics | null>(null);
  const [rejectionAnalysis, setRejectionAnalysis] = useState<RejectionAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load recent master signals (mocked for now)
      const mockMasterSignals: MasterSignalData[] = [
        {
          id: 'master_001',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          signal: 'buy',
          fusedProbability: 0.68,
          confidence: 0.82,
          strength: 7,
          kellyFraction: 0.12,
          moduleContributions: {
            technical: 0.35,
            patterns: 0.25,
            strategies: 0.20,
            sentiment: 0.15,
            multiTimeframe: 0.05
          },
          entropyValue: 0.45,
          signalQuality: 0.78,
          diversityIndex: 0.83,
          consensusLevel: 0.75,
          reasoning: 'BUY signal generated from 8 factors across 5 modules. Top contributors: technical: 35%, patterns: 25%, strategies: 20%',
          warnings: []
        },
        {
          id: 'master_002',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          signal: 'sell',
          fusedProbability: 0.34,
          confidence: 0.71,
          strength: 6,
          kellyFraction: 0.08,
          moduleContributions: {
            technical: 0.40,
            sentiment: 0.30,
            strategies: 0.20,
            patterns: 0.10
          },
          entropyValue: 0.58,
          signalQuality: 0.65,
          diversityIndex: 0.67,
          consensusLevel: 0.80,
          reasoning: 'SELL signal generated from 6 factors across 4 modules. Top contributors: technical: 40%, sentiment: 30%, strategies: 20%',
          warnings: ['Limited signal diversity - increased risk']
        }
      ];

      // Load module analytics
      const mockModuleAnalytics: ModuleAnalytics[] = [
        {
          module: 'technical',
          signalsGenerated: 156,
          avgProbability: 0.62,
          avgConfidence: 0.78,
          contributionPercent: 32,
          status: 'active',
          lastSignal: '2 minutes ago'
        },
        {
          module: 'patterns',
          signalsGenerated: 89,
          avgProbability: 0.58,
          avgConfidence: 0.74,
          contributionPercent: 22,
          status: 'active',
          lastSignal: '5 minutes ago'
        },
        {
          module: 'strategies',
          signalsGenerated: 123,
          avgProbability: 0.65,
          avgConfidence: 0.71,
          contributionPercent: 19,
          status: 'active',
          lastSignal: '3 minutes ago'
        },
        {
          module: 'sentiment',
          signalsGenerated: 67,
          avgProbability: 0.59,
          avgConfidence: 0.66,
          contributionPercent: 15,
          status: 'active',
          lastSignal: '8 minutes ago'
        },
        {
          module: 'fundamental',
          signalsGenerated: 34,
          avgProbability: 0.61,
          avgConfidence: 0.82,
          contributionPercent: 8,
          status: 'active',
          lastSignal: '45 minutes ago'
        },
        {
          module: 'multiTimeframe',
          signalsGenerated: 23,
          avgProbability: 0.55,
          avgConfidence: 0.69,
          contributionPercent: 4,
          status: 'inactive',
          lastSignal: '2 hours ago'
        }
      ];

      // Load diagnostics
      const mockDiagnostics: SignalDiagnostics = {
        totalFactors: 47,
        activeModules: ['technical', 'patterns', 'strategies', 'sentiment', 'fundamental'],
        missingModules: ['multiTimeframe'],
        dataQuality: {
          technical: 0.95,
          patterns: 0.87,
          strategies: 0.92,
          sentiment: 0.76,
          fundamental: 0.83,
          multiTimeframe: 0.45
        },
        processingTime: 247,
        errors: [],
        warnings: ['MultiTimeframe module experiencing reduced data quality']
      };

      // Load rejection analysis
      const { data: rejectionLogs } = await supabase
        .from('signal_rejection_logs')
        .select('reason, value, threshold, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      const rejectionCounts = rejectionLogs?.reduce((acc, log) => {
        const reason = log.reason;
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const totalRejections = Object.values(rejectionCounts).reduce((sum, count) => sum + count, 0);
      
      const mockRejectionAnalysis: RejectionAnalysis[] = Object.entries(rejectionCounts).map(([reason, count]) => ({
        reason: reason.replace(/_/g, ' ').toUpperCase(),
        count,
        percentage: totalRejections > 0 ? (count / totalRejections) * 100 : 0,
        trend: 'stable' as const
      }));

      setMasterSignals(mockMasterSignals);
      setModuleAnalytics(mockModuleAnalytics);
      setDiagnostics(mockDiagnostics);
      setRejectionAnalysis(mockRejectionAnalysis);
      setLastUpdate(new Date());

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'buy': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'sell': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'inactive': return <Eye className="w-4 h-4 text-yellow-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 0.8) return 'text-green-600';
    if (quality >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading Enhanced Signal Analytics...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Signal Analytics</h1>
          <p className="text-muted-foreground">
            Multi-layer signal fusion with mathematical traceability
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Status Alert */}
      {diagnostics && diagnostics.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            System warnings: {diagnostics.warnings.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Modules</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{diagnostics?.activeModules.length || 0}/6</div>
            <p className="text-xs text-muted-foreground">
              {diagnostics?.missingModules.length || 0} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Factors</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{diagnostics?.totalFactors || 0}</div>
            <p className="text-xs text-muted-foreground">
              {((diagnostics?.totalFactors || 0) / 6).toFixed(1)} avg per module
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Time</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{diagnostics?.processingTime || 0}ms</div>
            <p className="text-xs text-muted-foreground">
              {((diagnostics?.processingTime || 0) / (diagnostics?.totalFactors || 1)).toFixed(1)}ms per factor
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signal Quality</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {masterSignals.length > 0 ? (masterSignals[0].signalQuality * 100).toFixed(0) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Latest master signal
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="master-signals" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="master-signals">Master Signals</TabsTrigger>
          <TabsTrigger value="module-breakdown">Module Breakdown</TabsTrigger>
          <TabsTrigger value="fusion-diagnostics">Fusion Diagnostics</TabsTrigger>
          <TabsTrigger value="rejection-analysis">Rejection Analysis</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Master Signals Tab */}
        <TabsContent value="master-signals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Master Signal Feed</CardTitle>
              <CardDescription>
                Latest fused signals from mathematical fusion engine
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {masterSignals.map((signal) => (
                  <Card key={signal.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {getSignalIcon(signal.signal)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-lg">
                              {signal.signal.toUpperCase()}
                            </span>
                            <Badge variant={signal.signal === 'buy' ? 'default' : 'destructive'}>
                              {(signal.fusedProbability * 100).toFixed(1)}%
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(signal.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Kelly: {(signal.kellyFraction * 100).toFixed(1)}%</p>
                        <p className="text-sm">Quality: <span className={getQualityColor(signal.signalQuality)}>{(signal.signalQuality * 100).toFixed(0)}%</span></p>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Confidence: </span>
                        <span className="font-medium">{(signal.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Diversity: </span>
                        <span className="font-medium">{(signal.diversityIndex * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Consensus: </span>
                        <span className="font-medium">{(signal.consensusLevel * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Module Contributions</h4>
                      <div className="space-y-2">
                        {Object.entries(signal.moduleContributions).map(([module, contribution]) => (
                          <div key={module} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{module}</span>
                            <div className="flex items-center space-x-2">
                              <Progress value={contribution * 100} className="w-24" />
                              <span className="text-sm w-12 text-right">{(contribution * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground">{signal.reasoning}</p>
                    </div>

                    {signal.warnings.length > 0 && (
                      <div className="mt-3">
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            {signal.warnings.join(', ')}
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Module Breakdown Tab */}
        <TabsContent value="module-breakdown" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {moduleAnalytics.map((module) => (
              <Card key={module.module}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium capitalize">{module.module}</CardTitle>
                  {getStatusIcon(module.status)}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Signals Generated</span>
                      <span className="font-medium">{module.signalsGenerated}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Avg Probability</span>
                      <span className="font-medium">{(module.avgProbability * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Avg Confidence</span>
                      <span className="font-medium">{(module.avgConfidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Contribution</span>
                      <span className="font-medium">{module.contributionPercent}%</span>
                    </div>
                    {module.lastSignal && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Last Signal</span>
                        <span className="font-medium text-xs">{module.lastSignal}</span>
                      </div>
                    )}
                    <div className="mt-2">
                      <Progress value={module.contributionPercent} className="w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Fusion Diagnostics Tab */}
        <TabsContent value="fusion-diagnostics" className="space-y-4">
          {diagnostics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Data Quality by Module</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(diagnostics.dataQuality).map(([module, quality]) => (
                      <div key={module} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{module}</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={quality * 100} className="w-24" />
                          <span className={`text-sm w-12 text-right ${getQualityColor(quality)}`}>
                            {(quality * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Active Modules</span>
                      <Badge variant="secondary">{diagnostics.activeModules.length}/6</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Processing Time</span>
                      <span className="text-sm font-medium">{diagnostics.processingTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Factors</span>
                      <span className="text-sm font-medium">{diagnostics.totalFactors}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Errors</span>
                      <Badge variant={diagnostics.errors.length > 0 ? "destructive" : "secondary"}>
                        {diagnostics.errors.length}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Warnings</span>
                      <Badge variant={diagnostics.warnings.length > 0 ? "outline" : "secondary"}>
                        {diagnostics.warnings.length}
                      </Badge>
                    </div>
                  </div>

                  {diagnostics.missingModules.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Inactive Modules</h4>
                      <div className="flex flex-wrap gap-1">
                        {diagnostics.missingModules.map((module) => (
                          <Badge key={module} variant="outline" className="text-xs">
                            {module}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Rejection Analysis Tab */}
        <TabsContent value="rejection-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Signal Rejection Breakdown</CardTitle>
              <CardDescription>
                Analysis of why signals are being rejected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rejectionAnalysis.map((rejection) => (
                  <div key={rejection.reason} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <span className="font-medium">{rejection.reason}</span>
                      <p className="text-sm text-muted-foreground">
                        {rejection.count} rejections ({rejection.percentage.toFixed(1)}%)
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Progress value={rejection.percentage} className="w-24" />
                      <Badge variant="outline">{rejection.percentage.toFixed(0)}%</Badge>
                    </div>
                  </div>
                ))}
                {rejectionAnalysis.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No rejection data available for the last 24 hours
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Attribution</CardTitle>
              <CardDescription>
                Historical performance by module and signal type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Performance tracking will be available once sufficient historical data is collected.
                <br />
                <span className="text-sm">Connect to live trading to enable performance attribution.</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedSignalAnalyticsDashboard;