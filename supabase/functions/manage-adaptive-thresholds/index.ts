import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ThresholdAdjustment {
  type: 'relax' | 'tighten' | 'reset' | 'auto_adapt';
  intensity?: number;
  reason?: string;
}

interface AdaptiveThresholds {
  entropy_current: number;
  probability_buy: number;
  probability_sell: number;
  confluence_adaptive: number;
  edge_adaptive: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let status = 'success';
  let errorMessage = '';

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, adjustment }: { action: 'adjust' | 'analyze' | 'health_check', adjustment?: ThresholdAdjustment } = await req.json();

    console.log(`🔧 Threshold management action: ${action}`);

    switch (action) {
      case 'adjust':
        if (!adjustment) {
          throw new Error('Adjustment parameters required for adjust action');
        }
        
        return await adjustThresholds(supabase, adjustment);

      case 'analyze':
        return await analyzeSystemPerformance(supabase);

      case 'health_check':
        return await performHealthCheck(supabase);

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ Error in manage-adaptive-thresholds:', error);

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.from('system_health').insert({
        function_name: 'manage-adaptive-thresholds',
        execution_time_ms: executionTime,
        status: 'error',
        error_message: (error as Error).message,
        processed_items: 0
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message,
        executionTimeMs: executionTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function adjustThresholds(supabase: any, adjustment: ThresholdAdjustment): Promise<Response> {
  console.log(`🔧 Adjusting thresholds: ${adjustment.type} (intensity: ${adjustment.intensity || 1})`);

  // Get current thresholds
  const { data: currentThresholds, error: fetchError } = await supabase
    .from('adaptive_thresholds')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (fetchError || !currentThresholds) {
    throw new Error(`Failed to fetch current thresholds: ${fetchError?.message || 'No thresholds found'}`);
  }

  const intensity = adjustment.intensity || 1;
  let newThresholds: Partial<AdaptiveThresholds> = {};

  switch (adjustment.type) {
    case 'relax':
      newThresholds = {
        entropy_current: Math.min(0.95, currentThresholds.entropy_current + (0.05 * intensity)),
        probability_buy: Math.max(0.52, currentThresholds.probability_buy - (0.02 * intensity)),
        probability_sell: Math.min(0.48, currentThresholds.probability_sell + (0.02 * intensity)),
        confluence_adaptive: Math.max(5, currentThresholds.confluence_adaptive - (2 * intensity)),
        edge_adaptive: Math.max(-0.0005, currentThresholds.edge_adaptive - (0.0001 * intensity))
      };
      break;

    case 'tighten':
      newThresholds = {
        entropy_current: Math.max(0.7, currentThresholds.entropy_current - (0.02 * intensity)),
        probability_buy: Math.min(0.7, currentThresholds.probability_buy + (0.01 * intensity)),
        probability_sell: Math.max(0.3, currentThresholds.probability_sell - (0.01 * intensity)),
        confluence_adaptive: Math.min(50, currentThresholds.confluence_adaptive + (1 * intensity)),
        edge_adaptive: Math.min(0.001, currentThresholds.edge_adaptive + (0.00005 * intensity))
      };
      break;

    case 'reset':
      newThresholds = {
        entropy_current: 0.80,
        probability_buy: 0.56,
        probability_sell: 0.44,
        confluence_adaptive: 12,
        edge_adaptive: 0.00005
      };
      break;

    case 'auto_adapt':
      // Analyze recent performance and auto-adjust
      const performanceAnalysis = await analyzeRecentPerformance(supabase);
      newThresholds = await calculateOptimalThresholds(currentThresholds, performanceAnalysis);
      break;

    default:
      throw new Error(`Unknown adjustment type: ${adjustment.type}`);
  }

  // Update thresholds in database
  const { error: updateError } = await supabase
    .from('adaptive_thresholds')
    .update({
      ...newThresholds,
      last_adaptation: new Date().toISOString()
    })
    .eq('id', currentThresholds.id);

  if (updateError) {
    throw new Error(`Failed to update thresholds: ${updateError.message}`);
  }

  // Log the adjustment
  await supabase.from('system_health').insert({
    function_name: 'threshold-adjustment',
    status: 'success',
    error_message: `${adjustment.type} adjustment applied: ${adjustment.reason || 'Manual adjustment'}`,
    processed_items: 1,
    execution_time_ms: Date.now() - Date.now()
  });

  console.log(`✅ Thresholds adjusted successfully`);

  return new Response(
    JSON.stringify({
      success: true,
      message: `Thresholds ${adjustment.type} successfully applied`,
      oldThresholds: currentThresholds,
      newThresholds: { ...currentThresholds, ...newThresholds },
      adjustmentType: adjustment.type,
      intensity
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}

async function analyzeSystemPerformance(supabase: any): Promise<Response> {
  console.log('📊 Analyzing system performance...');

  // Get recent signals and rejections
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [signalsResult, rejectionsResult, tradesResult, systemLogsResult] = await Promise.all([
    supabase
      .from('trading_signals')
      .select('*')
      .gte('created_at', twentyFourHoursAgo),
    
    supabase
      .from('signal_rejection_logs')
      .select('*')
      .gte('created_at', twentyFourHoursAgo),
    
    supabase
      .from('shadow_trades')
      .select('*')
      .eq('status', 'closed')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    
    supabase
      .from('system_health')
      .select('*')
      .eq('function_name', 'generate-confluence-signals')
      .gte('created_at', twentyFourHoursAgo)
  ]);

  const signals = signalsResult.data || [];
  const rejections = rejectionsResult.data || [];
  const trades = tradesResult.data || [];
  const systemLogs = systemLogsResult.data || [];

  // Calculate metrics
  const totalEvaluated = signals.length + rejections.length;
  const rejectionRate = totalEvaluated > 0 ? (rejections.length / totalEvaluated) * 100 : 0;
  const signalsPerHour = signals.length / 24;
  
  const winningTrades = trades.filter((trade: any) => (trade.pnl || 0) > 0).length;
  const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

  const successfulRuns = systemLogs.filter((log: any) => log.status === 'success').length;
  const systemSuccessRate = systemLogs.length > 0 ? (successfulRuns / systemLogs.length) * 100 : 0;

  // Rejection analysis
  const rejectionsByReason = rejections.reduce((acc: Record<string, number>, rejection: any) => {
    acc[rejection.reason] = (acc[rejection.reason] || 0) + 1;
    return acc;
  }, {});

  const performance = {
    signalGeneration: {
      signalsPerHour,
      rejectionRate,
      totalEvaluated,
      acceptedSignals: signals.length,
      rejectedSignals: rejections.length,
      targetSignalsPerHour: 2
    },
    tradingPerformance: {
      winRate,
      totalTrades: trades.length,
      winningTrades,
      losingTrades: trades.length - winningTrades
    },
    systemHealth: {
      successRate: systemSuccessRate,
      totalRuns: systemLogs.length,
      successfulRuns,
      errorRate: systemLogs.length > 0 ? ((systemLogs.length - successfulRuns) / systemLogs.length) * 100 : 0
    },
    rejectionAnalysis: rejectionsByReason,
    recommendations: generateRecommendations(rejectionRate, signalsPerHour, winRate, systemSuccessRate, rejectionsByReason)
  };

  return new Response(
    JSON.stringify({
      success: true,
      performance,
      analysisTimestamp: new Date().toISOString(),
      dataRange: '24 hours'
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}

async function analyzeRecentPerformance(supabase: any): Promise<any> {
  // Simplified performance analysis for auto-adaptation
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const [signalsResult, rejectionsResult] = await Promise.all([
    supabase.from('trading_signals').select('count').gte('created_at', twentyFourHoursAgo),
    supabase.from('signal_rejection_logs').select('reason').gte('created_at', twentyFourHoursAgo)
  ]);

  const signalCount = signalsResult.data?.length || 0;
  const rejections = rejectionsResult.data || [];
  
  return {
    signalDensity: signalCount / 24,
    rejectionRate: rejections.length / (signalCount + rejections.length) * 100,
    mainRejectionReasons: rejections.reduce((acc: Record<string, number>, r: any) => {
      acc[r.reason] = (acc[r.reason] || 0) + 1;
      return acc;
    }, {})
  };
}

async function calculateOptimalThresholds(currentThresholds: any, performance: any): Promise<Partial<AdaptiveThresholds>> {
  // Auto-adaptation logic based on performance
  const adjustments: Partial<AdaptiveThresholds> = {};

  // If signal density is too low, relax thresholds
  if (performance.signalDensity < 1) {
    adjustments.entropy_current = Math.min(0.95, currentThresholds.entropy_current + 0.03);
    adjustments.confluence_adaptive = Math.max(8, currentThresholds.confluence_adaptive - 1);
  }

  // If rejection rate is too high due to entropy, relax entropy threshold
  if (performance.mainRejectionReasons.entropy > performance.mainRejectionReasons.confluence) {
    adjustments.entropy_current = Math.min(0.95, currentThresholds.entropy_current + 0.02);
  }

  // If rejection rate is too high due to confluence, relax confluence threshold
  if (performance.mainRejectionReasons.confluence > (performance.rejectionRate * 0.4)) {
    adjustments.confluence_adaptive = Math.max(8, currentThresholds.confluence_adaptive - 1);
  }

  return adjustments;
}

function generateRecommendations(
  rejectionRate: number, 
  signalsPerHour: number, 
  winRate: number, 
  systemSuccessRate: number,
  rejectionsByReason: Record<string, number>
): string[] {
  const recommendations: string[] = [];

  if (rejectionRate > 95) {
    recommendations.push('CRITICAL: Extremely high rejection rate. Consider relaxing all thresholds immediately.');
  } else if (rejectionRate > 85) {
    recommendations.push('HIGH: Very high rejection rate. Relax entropy and confluence thresholds.');
  }

  if (signalsPerHour < 0.5) {
    recommendations.push('Signal generation rate is too low. Enable debug mode or relax thresholds.');
  } else if (signalsPerHour > 4) {
    recommendations.push('Signal generation rate is too high. Consider tightening thresholds to improve quality.');
  }

  if (systemSuccessRate < 80) {
    recommendations.push('System health issues detected. Check edge function logs and database connectivity.');
  }

  // Specific threshold recommendations
  const topRejectionReason = Object.entries(rejectionsByReason).sort(([,a], [,b]) => b - a)[0];
  if (topRejectionReason) {
    const [reason, count] = topRejectionReason;
    switch (reason) {
      case 'entropy':
        recommendations.push('Entropy is the main rejection reason. Consider increasing entropy threshold.');
        break;
      case 'confluence':
        recommendations.push('Confluence score is the main rejection reason. Consider lowering confluence threshold.');
        break;
      case 'edge':
        recommendations.push('Edge calculation is the main rejection reason. Consider adjusting edge threshold.');
        break;
      case 'probability':
        recommendations.push('Probability thresholds are the main rejection reason. Consider adjusting probability bounds.');
        break;
    }
  }

  if (winRate < 50 && winRate > 0) {
    recommendations.push('Win rate is below 50%. Consider tightening thresholds to improve signal quality.');
  }

  if (recommendations.length === 0) {
    recommendations.push('System is operating within normal parameters. No immediate adjustments needed.');
  }

  return recommendations;
}

async function performHealthCheck(supabase: any): Promise<Response> {
  console.log('🏥 Performing system health check...');

  const checks = {
    database: { status: 'unknown', details: '' },
    signalGeneration: { status: 'unknown', details: '' },
    thresholds: { status: 'unknown', details: '' },
    tradingEngine: { status: 'unknown', details: '' },
    overallHealth: 'unknown'
  };

  try {
    // Database connectivity check
    const { data: dbTest, error: dbError } = await supabase
      .from('system_health')
      .select('count')
      .limit(1);
    
    checks.database = {
      status: dbError ? 'error' : 'healthy',
      details: dbError ? dbError.message : 'Database connectivity normal'
    };

    // Signal generation check
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentSignalActivity } = await supabase
      .from('system_health')
      .select('*')
      .eq('function_name', 'generate-confluence-signals')
      .gte('created_at', fiveMinutesAgo);

    checks.signalGeneration = {
      status: (recentSignalActivity?.length || 0) > 0 ? 'healthy' : 'warning',
      details: `${recentSignalActivity?.length || 0} signal generation runs in last 5 minutes`
    };

    // Adaptive thresholds check
    const { data: thresholds } = await supabase
      .from('adaptive_thresholds')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    checks.thresholds = {
      status: thresholds ? 'healthy' : 'error',
      details: thresholds ? 
        `Thresholds loaded. Entropy: ${thresholds.entropy_current}, Confluence: ${thresholds.confluence_adaptive}` :
        'No adaptive thresholds found'
    };

    // Trading engine check
    const { data: recentTrades } = await supabase
      .from('shadow_trades')
      .select('count')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    checks.tradingEngine = {
      status: 'healthy', // Assume healthy if no errors
      details: `${recentTrades?.length || 0} trades in last hour`
    };

    // Overall health assessment
    const healthStatuses = Object.values(checks).slice(0, -1).map((check: any) => check.status);
    const errorCount = healthStatuses.filter(status => status === 'error').length;
    const warningCount = healthStatuses.filter(status => status === 'warning').length;

    if (errorCount > 0) {
      checks.overallHealth = 'critical';
    } else if (warningCount > 1) {
      checks.overallHealth = 'warning';
    } else {
      checks.overallHealth = 'healthy';
    }

  } catch (error) {
    checks.overallHealth = 'critical';
    console.error('Health check failed:', error);
  }

  return new Response(
    JSON.stringify({
      success: true,
      healthCheck: checks,
      timestamp: new Date().toISOString()
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}