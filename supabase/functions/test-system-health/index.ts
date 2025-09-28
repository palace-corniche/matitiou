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

    console.log('🔍 Running comprehensive system health check...');
    
    // Test 1: Check duplicate trades (using manual query)
    const { data: allOpenTrades } = await supabase
      .from('shadow_trades')
      .select('symbol, trade_type, entry_price')
      .eq('status', 'open');

    // Group trades to find duplicates
    const tradeGroups = new Map();
    allOpenTrades?.forEach(trade => {
      const key = `${trade.symbol}-${trade.trade_type}-${trade.entry_price}`;
      tradeGroups.set(key, (tradeGroups.get(key) || 0) + 1);
    });
    
    const duplicateTrades = Array.from(tradeGroups.entries())
      .filter(([_, count]) => count > 1)
      .map(([key, count]) => ({ key, count }));

    // Test 2: Check lot sizes
    const { data: openTrades } = await supabase
      .from('shadow_trades')
      .select('id, symbol, lot_size, entry_price')
      .eq('status', 'open');

    const invalidLotSizes = openTrades?.filter(trade => {
      const lotSize = parseFloat(trade.lot_size.toString());
      return lotSize < 0.01 || lotSize > 1.0 || lotSize > 100; // Flag unrealistic sizes
    }) || [];

    // Test 3: Check account margin health  
    const { data: account } = await supabase
      .from('global_trading_account')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    // Test 4: Check module health
    const { data: modules } = await supabase
      .from('module_health')
      .select('module_name, status, error_count, last_error');

    const activeModules = modules?.filter(m => m.status === 'active') || [];
    const errorModules = modules?.filter(m => m.error_count > 0 || m.last_error) || [];

    // Test 5: Check for signals being generated
    const { data: recentSignals } = await supabase
      .from('trading_signals')
      .select('id, created_at, confluence_score')
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
      .order('created_at', { ascending: false });

    // Generate health report
    const healthReport = {
      timestamp: new Date().toISOString(),
      
      // Trading Issues
      duplicateTradeGroups: duplicateTrades?.length || 0,
      totalOpenTrades: openTrades?.length || 0,
      invalidLotSizes: invalidLotSizes.length,
      
      // Account Health
      accountBalance: account?.balance || 0,
      marginLevel: account?.margin_level || 0,
      usedMargin: account?.used_margin || 0,
      marginStatus: account?.margin_level > 200 ? 'healthy' : account?.margin_level > 100 ? 'warning' : 'critical',
      
      // Module Health
      totalModules: modules?.length || 0,
      activeModules: activeModules.length,
      modulesWithErrors: errorModules.length,
      moduleHealth: activeModules.length >= 8 ? 'healthy' : activeModules.length >= 6 ? 'warning' : 'critical',
      
      // Signal Generation
      signalsLast2Hours: recentSignals?.length || 0,
      signalGeneration: (recentSignals?.length || 0) > 0 ? 'active' : 'inactive',
      
      // Overall System Status
      overallStatus: 'unknown'
    };

    // Calculate overall status
    const issues = [];
    if (healthReport.duplicateTradeGroups > 0) issues.push('duplicate trades');
    if (healthReport.invalidLotSizes > 0) issues.push('invalid lot sizes');
    if (healthReport.marginStatus !== 'healthy') issues.push('margin issues');
    if (healthReport.moduleHealth !== 'healthy') issues.push('module failures');
    if (healthReport.signalGeneration === 'inactive') issues.push('no recent signals');

    if (issues.length === 0) {
      healthReport.overallStatus = 'healthy';
    } else if (issues.length <= 2) {
      healthReport.overallStatus = 'warning';
    } else {
      healthReport.overallStatus = 'critical';
    }

    // Detailed diagnostics
    const diagnostics = {
      duplicateTrades: duplicateTrades,
      invalidLotSizes: invalidLotSizes.map(t => ({
        id: t.id,
        symbol: t.symbol,
        lotSize: t.lot_size,
        entryPrice: t.entry_price
      })),
      moduleStatus: modules?.map(m => ({
        name: m.module_name,
        status: m.status,
        errorCount: m.error_count,
        lastError: m.last_error
      })),
      recentSignals: recentSignals?.slice(0, 5).map(s => ({
        id: s.id,
        created: s.created_at,
        score: s.confluence_score
      }))
    };

    console.log(`🏥 Health Check Complete - Status: ${healthReport.overallStatus.toUpperCase()}`);
    if (issues.length > 0) {
      console.log(`⚠️ Issues found: ${issues.join(', ')}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        healthReport,
        diagnostics,
        issues,
        recommendations: issues.length > 0 ? [
          'Run emergency-system-fix to resolve critical issues',
          'Monitor margin level closely',
          'Check module error logs',
          'Verify signal generation is working'
        ] : ['System is healthy - continue normal operation']
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in test-system-health:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});