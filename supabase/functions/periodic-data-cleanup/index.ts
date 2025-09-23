// Phase 4: Periodic Data Cleanup Function
// Automatically cleans up orphaned data and prevents accumulation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CleanupResult {
  success: boolean;
  message: string;
  cleaned_records: {
    shadow_trades: number;
    trade_history: number;
    old_diagnostics: number;
    old_snapshots: number;
  };
  timestamp: string;
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("Starting periodic data cleanup...");

    // Phase 4: Cleanup old data to prevent accumulation
    
    // 1. Clean up old diagnostic records (keep only last 1000)
    const { data: oldDiagnostics, error: diagnosticsError } = await supabase
      .from('trading_diagnostics')
      .select('id')
      .order('created_at', { ascending: false })
      .range(1000, 9999);

    let diagnosticsDeleted = 0;
    if (oldDiagnostics && oldDiagnostics.length > 0) {
      const idsToDelete = oldDiagnostics.map(d => d.id);
      const { error } = await supabase
        .from('trading_diagnostics')
        .delete()
        .in('id', idsToDelete);
      
      if (!error) {
        diagnosticsDeleted = oldDiagnostics.length;
      }
    }

    // 2. Clean up old performance snapshots (keep only last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: snapshotsDeleted } = await supabase
      .from('performance_snapshots')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString());

    // 3. Check for orphaned records that should have been cleared by reset
    const { data: orphanedTrades, error: tradesError } = await supabase
      .from('shadow_trades')
      .select('id, created_at')
      .order('created_at', { ascending: false });

    const { data: orphanedHistory, error: historyError } = await supabase
      .from('trade_history')
      .select('id, created_at')
      .order('created_at', { ascending: false });

    let tradesDeleted = 0;
    let historyDeleted = 0;

    // If more than 10,000 trades exist, something is wrong - clean them up
    if (orphanedTrades && orphanedTrades.length > 10000) {
      console.log(`Found ${orphanedTrades.length} orphaned trades - cleaning up...`);
      
      const { count: deletedCount } = await supabase
        .from('shadow_trades')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      tradesDeleted = deletedCount || 0;
    }

    // If more than 10,000 history records exist, clean them up
    if (orphanedHistory && orphanedHistory.length > 10000) {
      console.log(`Found ${orphanedHistory.length} orphaned history records - cleaning up...`);
      
      const { count: deletedCount } = await supabase
        .from('trade_history')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      historyDeleted = deletedCount || 0;
    }

    // 4. Log cleanup activity
    await supabase
      .from('system_health')
      .insert({
        function_name: 'periodic_data_cleanup',
        status: 'completed',
        execution_time_ms: 0
      });

    const result: CleanupResult = {
      success: true,
      message: `Cleanup completed successfully`,
      cleaned_records: {
        shadow_trades: tradesDeleted,
        trade_history: historyDeleted,
        old_diagnostics: diagnosticsDeleted,
        old_snapshots: snapshotsDeleted || 0
      },
      timestamp: new Date().toISOString()
    };

    console.log("Cleanup completed:", result);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Cleanup failed:", error);
    
    const errorResult: CleanupResult = {
      success: false,
      message: `Cleanup failed: ${error.message}`,
      cleaned_records: {
        shadow_trades: 0,
        trade_history: 0,
        old_diagnostics: 0,
        old_snapshots: 0
      },
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(errorResult), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
