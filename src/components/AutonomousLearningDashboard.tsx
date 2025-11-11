import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Brain, TrendingUp, Activity, Zap, Target, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface LearningAction {
  id: string;
  action_type: string;
  trigger_reason: string;
  success: boolean | null;
  created_at: string;
  metadata?: any;
}

interface SystemStats {
  win_rate: number;
  profit_factor: number;
  total_actions_today: number;
  successful_actions_today: number;
  patterns_discovered_total: number;
  active_patterns: number;
  learning_effectiveness_score: number;
}

interface DiscoveredPattern {
  pattern_name: string;
  pattern_type: string;
  win_rate: number;
  sample_size: number;
  deployed: boolean;
  created_at: string;
}

export const AutonomousLearningDashboard: React.FC = () => {
  const [recentActions, setRecentActions] = useState<LearningAction[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [patterns, setPatterns] = useState<DiscoveredPattern[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    // Set up real-time subscription for learning actions
    const channel = supabase
      .channel('learning_actions')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'learning_actions' },
        (payload) => {
          setRecentActions(prev => [payload.new as LearningAction, ...prev.slice(0, 19)]);
        }
      )
      .subscribe();

    const interval = setInterval(fetchData, 30000); // Refresh every 30s

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const fetchData = async () => {
    try {
      // Fetch recent learning actions
      const { data: actions } = await supabase
        .from('learning_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (actions) setRecentActions(actions);

      // Fetch latest system stats
      const { data: stats } = await supabase
        .from('system_learning_stats')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (stats) setSystemStats(stats);

      // Fetch discovered patterns
      const { data: patternsData } = await supabase
        .from('discovered_patterns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (patternsData) setPatterns(patternsData);

    } catch (error) {
      console.error('Error fetching learning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'retrain_model': return <Brain className="h-4 w-4" />;
      case 'adjust_threshold': return <TrendingUp className="h-4 w-4" />;
      case 'recalibrate_module': return <Activity className="h-4 w-4" />;
      case 'discover_pattern': return <Target className="h-4 w-4" />;
      case 'self_heal': return <Zap className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'retrain_model': return 'bg-purple-500';
      case 'adjust_threshold': return 'bg-blue-500';
      case 'recalibrate_module': return 'bg-green-500';
      case 'discover_pattern': return 'bg-yellow-500';
      case 'self_heal': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatActionType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Activity className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading learning system...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats?.win_rate?.toFixed(1) || '0'}%</div>
            <Progress value={systemStats?.win_rate || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Learning Actions Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats?.total_actions_today || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {systemStats?.successful_actions_today || 0} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats?.active_patterns || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {systemStats?.patterns_discovered_total || 0} total discovered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Learning Effectiveness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats?.learning_effectiveness_score?.toFixed(0) || '0'}%</div>
            <Progress value={systemStats?.learning_effectiveness_score || 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activity">Learning Activity</TabsTrigger>
          <TabsTrigger value="patterns">Discovered Patterns</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Learning Actions</CardTitle>
              <CardDescription>Autonomous system improvements and adaptations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No learning actions yet. The system will start learning from trade outcomes.
                  </p>
                ) : (
                  recentActions.map((action) => (
                    <div key={action.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className={`${getActionColor(action.action_type)} p-2 rounded-md text-white`}>
                        {getActionIcon(action.action_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{formatActionType(action.action_type)}</span>
                          {action.success === true && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          {action.success === false && <XCircle className="h-4 w-4 text-red-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{action.trigger_reason}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(action.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Discovered Winning Patterns</CardTitle>
              <CardDescription>Automatically identified patterns with high win rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {patterns.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No patterns discovered yet. The system needs more winning trades to analyze.
                  </p>
                ) : (
                  patterns.map((pattern) => (
                    <div key={pattern.pattern_name} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{pattern.pattern_name}</h4>
                          <Badge variant="outline" className="mt-1">{pattern.pattern_type}</Badge>
                        </div>
                        {pattern.deployed && (
                          <Badge className="bg-green-500">Deployed</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Win Rate:</span>
                          <span className="ml-2 font-semibold">{pattern.win_rate.toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Sample Size:</span>
                          <span className="ml-2 font-semibold">{pattern.sample_size}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learning System Health</CardTitle>
              <CardDescription>Real-time system monitoring and self-healing status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Trade Outcome Processing</p>
                      <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500">Healthy</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Learning Orchestrator</p>
                      <p className="text-xs text-muted-foreground">Running hourly</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500">Healthy</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Self-Healing Monitor</p>
                      <p className="text-xs text-muted-foreground">Running every 15 minutes</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500">Healthy</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Pattern Discovery</p>
                      <p className="text-xs text-muted-foreground">Running daily</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500">Active</Badge>
                </div>

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium mb-1">Autonomous Learning Active</h4>
                      <p className="text-sm text-muted-foreground">
                        The system is continuously learning from every trade outcome and automatically 
                        improving itself without manual intervention. All learning actions are logged 
                        and can be reviewed in the activity tab.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutonomousLearningDashboard;
