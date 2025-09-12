import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { calibrationEngine, CalibrationParameters } from '@/services/calibrationEngine';
import { 
  Settings, 
  Play, 
  TrendingUp, 
  Target, 
  Clock,
  Activity,
  BarChart3,
  Zap
} from 'lucide-react';

interface CalibrationJob {
  id: string;
  module_id: string;
  timeframe: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  result?: CalibrationParameters;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

export const CalibrationDashboard: React.FC = () => {
  const [calibrationJobs, setCalibrationJobs] = useState<CalibrationJob[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('M15');
  const [calibrationResults, setCalibrationResults] = useState<CalibrationParameters[]>([]);

  useEffect(() => {
    fetchCalibrationResults();
  }, []);

  const fetchCalibrationResults = async () => {
    try {
      // Use mock data until database types are updated
      const mockResults: CalibrationParameters[] = [
        {
          module_id: 'technical_analysis',
          timeframe: 'M15',
          symbol: 'EURUSD',
          parameters: {
            rsi_overbought: 75,
            rsi_oversold: 25,
            macd_signal_threshold: 0.0002,
            bb_deviation: 2.2,
            volume_threshold: 1000,
            support_resistance_strength: 0.8,
            pattern_confidence_min: 0.7,
            trend_strength_min: 0.6
          },
          performance_metrics: {
            win_rate: 0.68,
            profit_factor: 1.45,
            sharpe_ratio: 1.23,
            max_drawdown: 0.08,
            average_return: 0.015,
            total_trades: 150
          },
          calibration_period: {
            start_date: '2024-01-01T00:00:00Z',
            end_date: '2024-12-01T00:00:00Z',
            total_ticks: 8500
          },
          created_at: new Date().toISOString(),
          version: '1.0.0'
        },
        {
          module_id: 'fundamental_analysis',
          timeframe: 'H1',
          symbol: 'EURUSD',
          parameters: {
            rsi_overbought: 70,
            rsi_oversold: 30,
            macd_signal_threshold: 0.0001,
            bb_deviation: 2.0,
            volume_threshold: 800,
            support_resistance_strength: 0.75,
            pattern_confidence_min: 0.75,
            trend_strength_min: 0.65
          },
          performance_metrics: {
            win_rate: 0.72,
            profit_factor: 1.58,
            sharpe_ratio: 0.95,
            max_drawdown: 0.12,
            average_return: 0.022,
            total_trades: 89
          },
          calibration_period: {
            start_date: '2024-01-01T00:00:00Z',
            end_date: '2024-12-01T00:00:00Z',
            total_ticks: 4200
          },
          created_at: new Date().toISOString(),
          version: '1.0.0'
        }
      ];
      
      setCalibrationResults(mockResults);
    } catch (error) {
      console.error('Error fetching calibration results:', error);
    }
  };

  const runFullCalibration = async () => {
    setIsRunning(true);

    const modules = [
      'technical_analysis',
      'fundamental_analysis', 
      'sentiment_analysis',
      'quantitative_analysis',
      'intermarket_analysis',
      'specialized_analysis'
    ];

    const timeframes = ['M15', 'H1', 'H4'];

    // Initialize jobs
    const jobs: CalibrationJob[] = [];
    modules.forEach(module => {
      timeframes.forEach(timeframe => {
        jobs.push({
          id: `${module}-${timeframe}`,
          module_id: module,
          timeframe,
          status: 'pending',
          progress: 0
        });
      });
    });

    setCalibrationJobs(jobs);

    // Run calibrations sequentially
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      
      // Update job status to running
      setCalibrationJobs(prev => prev.map(j => 
        j.id === job.id 
          ? { ...j, status: 'running', started_at: new Date().toISOString() }
          : j
      ));

      try {
        // Run calibration
        const result = await calibrationEngine.runCalibration(
          job.module_id,
          job.timeframe
        );

        // Update job as completed
        setCalibrationJobs(prev => prev.map(j => 
          j.id === job.id 
            ? { 
                ...j, 
                status: 'completed', 
                progress: 100,
                result,
                completed_at: new Date().toISOString()
              }
            : j
        ));

      } catch (error) {
        // Update job as failed
        setCalibrationJobs(prev => prev.map(j => 
          j.id === job.id 
            ? { 
                ...j, 
                status: 'failed', 
                error: error instanceof Error ? error.message : 'Unknown error',
                completed_at: new Date().toISOString()
              }
            : j
        ));
      }

      // Update progress for other jobs
      const overallProgress = ((i + 1) / jobs.length) * 100;
      setCalibrationJobs(prev => prev.map(j => 
        j.status === 'pending' 
          ? { ...j, progress: Math.min(overallProgress, 95) }
          : j
      ));
    }

    setIsRunning(false);
    await fetchCalibrationResults();
  };

  const runSingleCalibration = async (module_id: string, timeframe: string) => {
    const jobId = `${module_id}-${timeframe}`;
    
    setCalibrationJobs(prev => [
      ...prev.filter(j => j.id !== jobId),
      {
        id: jobId,
        module_id,
        timeframe,
        status: 'running',
        progress: 0,
        started_at: new Date().toISOString()
      }
    ]);

    try {
      const result = await calibrationEngine.runCalibration(module_id, timeframe);
      
      setCalibrationJobs(prev => prev.map(j => 
        j.id === jobId 
          ? { 
              ...j, 
              status: 'completed', 
              progress: 100,
              result,
              completed_at: new Date().toISOString()
            }
          : j
      ));

      await fetchCalibrationResults();
    } catch (error) {
      setCalibrationJobs(prev => prev.map(j => 
        j.id === jobId 
          ? { 
              ...j, 
              status: 'failed', 
              error: error instanceof Error ? error.message : 'Unknown error',
              completed_at: new Date().toISOString()
            }
          : j
      ));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'running': return 'secondary';
      case 'failed': return 'destructive';
      case 'pending': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <Target className="h-4 w-4" />;
      case 'running': return <Activity className="h-4 w-4 animate-pulse" />;
      case 'failed': return <Zap className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatModuleName = (module_id: string) => {
    return module_id.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getPerformanceColor = (value: number, metric: string) => {
    switch (metric) {
      case 'sharpe_ratio':
        if (value > 1.5) return 'text-green-600';
        if (value > 1.0) return 'text-yellow-600';
        return 'text-red-600';
      case 'win_rate':
        if (value > 0.6) return 'text-green-600';
        if (value > 0.5) return 'text-yellow-600';
        return 'text-red-600';
      case 'profit_factor':
        if (value > 1.5) return 'text-green-600';
        if (value > 1.0) return 'text-yellow-600';
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const completedJobs = calibrationJobs.filter(j => j.status === 'completed').length;
  const totalJobs = calibrationJobs.length;
  const overallProgress = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Phase 6: Calibration Engine
            </CardTitle>
            <CardDescription>
              Historical backtesting and parameter optimization for all analysis modules
            </CardDescription>
          </div>
          <Button 
            onClick={runFullCalibration} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {isRunning ? 'Calibrating...' : 'Run Full Calibration'}
          </Button>
        </div>

        {isRunning && totalJobs > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Progress</span>
              <span>{completedJobs}/{totalJobs} modules</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="jobs" className="w-full">
          <TabsList>
            <TabsTrigger value="jobs">Calibration Jobs</TabsTrigger>
            <TabsTrigger value="results">Results & Performance</TabsTrigger>
            <TabsTrigger value="parameters">Optimized Parameters</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="mt-4">
            {calibrationJobs.length === 0 ? (
              <div className="text-center py-8">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Calibration Jobs</h3>
                <p className="text-muted-foreground mb-4">
                  Start a full calibration to optimize all analysis modules
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {calibrationJobs.map((job) => (
                  <Card key={job.id} className="border-l-4 border-l-primary/20">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-sm">
                            {formatModuleName(job.module_id)}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {job.timeframe} timeframe
                          </CardDescription>
                        </div>
                        <Badge variant={getStatusColor(job.status)} className="text-xs">
                          {getStatusIcon(job.status)}
                          <span className="ml-1">{job.status}</span>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {job.status === 'running' && (
                        <Progress value={job.progress} className="mb-2" />
                      )}
                      
                      {job.result && (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Sharpe Ratio:</span>
                            <span className={getPerformanceColor(job.result.performance_metrics.sharpe_ratio, 'sharpe_ratio')}>
                              {job.result.performance_metrics.sharpe_ratio.toFixed(3)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Win Rate:</span>
                            <span className={getPerformanceColor(job.result.performance_metrics.win_rate, 'win_rate')}>
                              {(job.result.performance_metrics.win_rate * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Profit Factor:</span>
                            <span className={getPerformanceColor(job.result.performance_metrics.profit_factor, 'profit_factor')}>
                              {job.result.performance_metrics.profit_factor.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}

                      {job.error && (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                          {job.error}
                        </div>
                      )}

                      {job.status === 'pending' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => runSingleCalibration(job.module_id, job.timeframe)}
                          className="w-full mt-2"
                        >
                          Start Calibration
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="results" className="mt-4">
            {calibrationResults.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Calibration Results</h3>
                <p className="text-muted-foreground">
                  Calibration results will appear here after running the calibration process
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {calibrationResults.map((result) => (
                  <Card key={`${result.module_id}-${result.timeframe}`}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {formatModuleName(result.module_id)} - {result.timeframe}
                      </CardTitle>
                      <CardDescription>
                        Calibrated on {new Date(result.created_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {(result.performance_metrics.win_rate * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Win Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {result.performance_metrics.profit_factor.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">Profit Factor</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {result.performance_metrics.sharpe_ratio.toFixed(3)}
                          </div>
                          <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {result.performance_metrics.total_trades}
                          </div>
                          <div className="text-xs text-muted-foreground">Total Trades</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="parameters" className="mt-4">
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Optimized Parameters</h3>
              <p className="text-muted-foreground">
                Parameter details and optimization results will be displayed here
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};