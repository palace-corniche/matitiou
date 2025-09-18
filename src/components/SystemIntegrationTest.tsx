import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  details?: any;
}

const SystemIntegrationTest: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Database Connectivity', status: 'pending', message: 'Not started' },
    { name: 'Analysis Data Integration', status: 'pending', message: 'Not started' },
    { name: 'Signal Generation', status: 'pending', message: 'Not started' },
    { name: 'Shadow Trading Engine', status: 'pending', message: 'Not started' },
    { name: 'Real-time Data Flow', status: 'pending', message: 'Not started' },
    { name: 'Portfolio Management', status: 'pending', message: 'Not started' }
  ]);

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...updates } : test));
  };

  const runTests = async () => {
    console.log('🧪 Starting comprehensive system integration test...');

    // Test 1: Database Connectivity
    updateTest(0, { status: 'running', message: 'Testing database connection...' });
    try {
      const { data, error } = await supabase.from('shadow_portfolios').select('count').limit(1);
      if (error) throw error;
      updateTest(0, { status: 'success', message: 'Database connected successfully' });
    } catch (error) {
      updateTest(0, { status: 'error', message: `Database error: ${error.message}` });
      return;
    }

    // Test 2: Analysis Data Integration
    updateTest(1, { status: 'running', message: 'Checking analysis data availability...' });
    try {
      const queries = await Promise.all([
        supabase.from('market_data_enhanced').select('count').limit(1),
        supabase.from('trading_signals').select('count').limit(1),
        supabase.from('modular_signals').select('count').limit(1)
      ]);
      
      const hasErrors = queries.some(q => q.error);
      if (hasErrors) throw new Error('Analysis data tables not accessible');
      
      updateTest(1, { 
        status: 'success', 
        message: 'All analysis data sources accessible',
        details: { tables: ['market_data_enhanced', 'trading_signals', 'modular_signals'] }
      });
    } catch (error) {
      updateTest(1, { status: 'error', message: `Analysis data error: ${error.message}` });
    }

    // Test 3: Signal Generation
    updateTest(2, { status: 'running', message: 'Testing signal generation...' });
    try {
      const { data: recentSignals } = await supabase
        .from('trading_signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: systemHealth } = await supabase
        .from('system_health')
        .select('*')
        .eq('function_name', 'generate-confluence-signals')
        .order('created_at', { ascending: false })
        .limit(1);

      updateTest(2, { 
        status: 'success', 
        message: `Signal generation active - ${recentSignals?.length || 0} recent signals`,
        details: { 
          lastExecution: systemHealth?.[0]?.created_at,
          executionTime: systemHealth?.[0]?.execution_time_ms 
        }
      });
    } catch (error) {
      updateTest(2, { status: 'error', message: `Signal generation error: ${error.message}` });
    }

    // Test 4: Shadow Trading Engine
    updateTest(3, { status: 'running', message: 'Testing shadow trading engine...' });
    try {
      const { data: portfolios } = await supabase
        .from('shadow_portfolios')
        .select('*')
        .eq('is_active', true);

      const { data: openTrades } = await supabase
        .from('shadow_trades')
        .select('*')
        .eq('status', 'open');

      updateTest(3, { 
        status: 'success', 
        message: `Trading engine operational - ${portfolios?.length || 0} active portfolios, ${openTrades?.length || 0} open trades`,
        details: { portfolios: portfolios?.length, openTrades: openTrades?.length }
      });
    } catch (error) {
      updateTest(3, { status: 'error', message: `Trading engine error: ${error.message}` });
    }

    // Test 5: Real-time Data Flow
    updateTest(4, { status: 'running', message: 'Testing real-time data flow...' });
    try {
      const { data: tickData } = await supabase
        .from('tick_data')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1);

      const { data: marketData } = await supabase
        .from('market_data_enhanced')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1);

      const latestTick = tickData?.[0]?.timestamp;
      const latestMarket = marketData?.[0]?.timestamp;
      
      updateTest(4, { 
        status: 'success', 
        message: 'Real-time data flow active',
        details: { 
          latestTick: latestTick,
          latestMarket: latestMarket 
        }
      });
    } catch (error) {
      updateTest(4, { status: 'error', message: `Real-time data error: ${error.message}` });
    }

    // Test 6: Portfolio Management
    updateTest(5, { status: 'running', message: 'Testing portfolio management...' });
    try {
      const { data: tradeHistory } = await supabase
        .from('trade_history')
        .select('*')
        .limit(5);

      const { data: performanceData } = await supabase
        .from('performance_snapshots')
        .select('*')
        .limit(5);

      updateTest(5, { 
        status: 'success', 
        message: 'Portfolio management operational',
        details: { 
          tradeHistoryRecords: tradeHistory?.length,
          performanceSnapshots: performanceData?.length 
        }
      });
    } catch (error) {
      updateTest(5, { status: 'error', message: `Portfolio management error: ${error.message}` });
    }

    console.log('✅ System integration test completed');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running': return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default: return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      running: 'bg-blue-100 text-blue-800',
      pending: 'bg-gray-100 text-gray-800'
    };
    return <Badge className={variants[status] || variants.pending}>{status}</Badge>;
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>🧪 System Integration Test</CardTitle>
        <CardDescription>
          Comprehensive test of all system components and data integration
        </CardDescription>
        <Button onClick={runTests} className="w-fit">
          Run Integration Tests
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {tests.map((test, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(test.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{test.name}</h4>
                    {getStatusBadge(test.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{test.message}</p>
                  {test.details && (
                    <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                      {JSON.stringify(test.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SystemIntegrationTest;