import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Running comprehensive system diagnostic...');

    // 1. Check Tick Data
    const { data: tickData } = await supabase
      .from('tick_data')
      .select('COUNT(*)')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

    // 2. Check Trading Signals 
    const { data: signalsData } = await supabase
      .from('trading_signals')
      .select('confluence_score, signal_type, was_executed, created_at')
      .eq('was_executed', false)
      .gte('confluence_score', 15)
      .order('created_at', { ascending: false })
      .limit(10);

    // 3. Check Shadow Trades
    const { data: tradesData } = await supabase
      .from('shadow_trades')
      .select('COUNT(*)')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    // 4. Check Portfolio State
    const { data: portfolioData } = await supabase
      .from('shadow_portfolios')
      .select('auto_trading_enabled, balance, used_margin, portfolio_name');

    // 5. Test Tick Data Generation
    const testTicks = generateTestTicks();
    const { error: tickInsertError } = await supabase
      .from('tick_data')
      .insert(testTicks);

    // 6. Run Trading Diagnostics
    const { data: diagnostics, error: diagError } = await supabase
      .rpc('run_trading_diagnostics');

    // 7. Test Trade Execution Function
    let tradeExecutionTest = null;
    try {
      const { data: execResponse } = await supabase.functions.invoke('execute-shadow-trades', {
        body: { trigger: 'manual_test' }
      });
      tradeExecutionTest = execResponse;
    } catch (execError) {
      tradeExecutionTest = { error: (execError as Error).message };
    }

    const systemHealth = {
      timestamp: new Date().toISOString(),
      tickData: {
        status: tickInsertError ? 'ERROR' : 'OK',
        recentTicks: (tickData?.[0] as any)?.COUNT || 0,
        testInsertResult: tickInsertError?.message || 'Success'
      },
      tradingSignals: {
        status: signalsData ? 'OK' : 'ERROR', 
        qualifyingSignals: signalsData?.length || 0,
        signals: signalsData?.slice(0, 3) || []
      },
      shadowTrades: {
        status: 'OK',
        recentTrades: (tradesData?.[0] as any)?.COUNT || 0
      },
      portfolios: {
        status: (portfolioData && portfolioData.length > 0) ? 'OK' : 'ERROR',
        activePortfolios: portfolioData?.filter(p => p.auto_trading_enabled).length || 0,
        portfolios: portfolioData || []
      },
      systemDiagnostics: {
        status: diagError ? 'ERROR' : 'OK',
        diagnostics: diagnostics || [],
        error: diagError?.message
      },
      tradeExecution: {
        status: tradeExecutionTest?.success ? 'OK' : 'WARNING',
        result: tradeExecutionTest
      },
      overallStatus: getOverallStatus({
        tickData: !tickInsertError,
        signals: (signalsData?.length || 0) > 0,
        portfolios: (portfolioData?.length || 0) > 0,
        diagnostics: !diagError
      })
    };

    console.log('📊 System diagnostic completed');
    console.log('Overall Status:', systemHealth.overallStatus);

    return new Response(
      JSON.stringify(systemHealth),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ System diagnostic error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function generateTestTicks() {
  const now = new Date();
  return [
    {
      symbol: 'EUR/USD',
      timestamp: now.toISOString(),
      bid: 1.1680,
      ask: 1.1682,
      spread: 0.0002,
      tick_volume: 50,
      data_source: 'diagnostic_test',
      session_type: 'london',
      is_live: true
    },
    {
      symbol: 'EUR/USD', 
      timestamp: new Date(now.getTime() - 60000).toISOString(), // 1 minute ago
      bid: 1.1679,
      ask: 1.1681,
      spread: 0.0002,
      tick_volume: 45,
      data_source: 'diagnostic_test',
      session_type: 'london',
      is_live: true
    }
  ];
}

function getOverallStatus(checks: Record<string, boolean>): string {
  const passedChecks = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.values(checks).length;
  
  if (passedChecks === totalChecks) return 'HEALTHY';
  if (passedChecks >= totalChecks * 0.7) return 'WARNING';
  return 'CRITICAL';
}