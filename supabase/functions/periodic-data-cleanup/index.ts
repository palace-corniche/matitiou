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
    duplicate_trades: number;
  };
  duplicate_detection: {
    groups_found: number;
    trades_removed: number;
    details: any[];
  };
  alerts: string[];
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

    // 5. Check for and cleanup duplicate trades
    console.log("Checking for duplicate trades...");

    const { data: openTrades } = await supabase
      .from('shadow_trades')
      .select('symbol, trade_type, entry_price, id, created_at, lot_size, margin_required')
      .eq('status', 'open')
      .order('created_at', { ascending: true });

    // Group trades by key: symbol-trade_type-entry_price
    const duplicateGroups = new Map();
    openTrades?.forEach(trade => {
      const key = `${trade.symbol}-${trade.trade_type}-${trade.entry_price}`;
      if (!duplicateGroups.has(key)) {
        duplicateGroups.set(key, []);
      }
      duplicateGroups.get(key).push(trade);
    });

    let duplicateGroupsFound = 0;
    let duplicateTradesRemoved = 0;
    const duplicateDetails: any[] = [];

    for (const [key, trades] of duplicateGroups) {
      if (trades.length > 1) {
        duplicateGroupsFound++;
        const keepTrade = trades[0]; // Keep oldest
        const removeTrades = trades.slice(1);
        
        console.log(`🚨 ALERT: Found ${trades.length} duplicate trades for ${key}`);
        duplicateDetails.push({
          key,
          totalTrades: trades.length,
          duplicatesRemoved: removeTrades.length,
          keptTradeId: keepTrade.id,
          keptTradeCreated: keepTrade.created_at
        });
        
        // Close duplicates with zero P&L (using 'manual' exit_reason as allowed by constraint)
        for (const trade of removeTrades) {
          const { error: closeError } = await supabase
            .from('shadow_trades')
            .update({
              status: 'closed',
              exit_price: trade.entry_price,
              exit_time: new Date().toISOString(),
              exit_reason: 'manual', // Using 'manual' as allowed by shadow_trades_exit_reason_check constraint
              pnl: 0,
              pnl_percent: 0,
              profit_pips: 0,
              updated_at: new Date().toISOString()
            })
            .eq('id', trade.id);
          
          if (closeError) {
            console.error(`Failed to close duplicate trade ${trade.id}:`, closeError);
          } else {
            duplicateTradesRemoved++;
            console.log(`✅ Closed duplicate trade ${trade.id}`);
          }
        }
      }
    }

    // Reset global account margin if duplicates were removed
    if (duplicateTradesRemoved > 0) {
      const { data: remainingTrades } = await supabase
        .from('shadow_trades')
        .select('margin_required')
        .eq('status', 'open');
      
      const totalMargin = remainingTrades?.reduce((sum, trade) => 
        sum + parseFloat(trade.margin_required?.toString() || '0'), 0) || 0;
      
      await supabase
        .from('global_trading_account')
        .update({
          used_margin: totalMargin,
          free_margin: 100000 - totalMargin,
          margin_level: totalMargin > 0 ? (100000 / totalMargin) * 100 : 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');
    }

    const alerts: string[] = [];

    // Generate alerts if duplicates were found
    if (duplicateGroupsFound > 0) {
      alerts.push(`🚨 DUPLICATE ALERT: ${duplicateTradesRemoved} duplicate trades removed from ${duplicateGroupsFound} groups`);
      
      // Log to diagnostics table with high severity
      await supabase
        .from('trading_diagnostics')
        .insert({
          diagnostic_type: 'duplicate_trades_detected',
          severity_level: 'warning',
          metadata: {
            duplicate_groups: duplicateGroupsFound,
            trades_removed: duplicateTradesRemoved,
            details: duplicateDetails,
            timestamp: new Date().toISOString()
          }
        });
    }

    // Log successful cleanup
    await supabase
      .from('trading_diagnostics')
      .insert({
        diagnostic_type: 'periodic_cleanup_completed',
        severity_level: 'info',
        metadata: {
          diagnostics_deleted: diagnosticsDeleted,
          snapshots_deleted: snapshotsDeleted || 0,
          duplicate_trades_removed: duplicateTradesRemoved,
          timestamp: new Date().toISOString()
        }
      });

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
      message: duplicateGroupsFound > 0 
        ? `Cleanup completed - ${duplicateTradesRemoved} duplicates removed` 
        : 'Cleanup completed - no duplicates found',
      cleaned_records: {
        shadow_trades: tradesDeleted,
        trade_history: historyDeleted,
        old_diagnostics: diagnosticsDeleted,
        old_snapshots: snapshotsDeleted || 0,
        duplicate_trades: duplicateTradesRemoved
      },
      duplicate_detection: {
        groups_found: duplicateGroupsFound,
        trades_removed: duplicateTradesRemoved,
        details: duplicateDetails
      },
      alerts,
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
      message: `Cleanup failed: ${(error as Error).message}`,
      cleaned_records: {
        shadow_trades: 0,
        trade_history: 0,
        old_diagnostics: 0,
        old_snapshots: 0,
        duplicate_trades: 0
      },
      duplicate_detection: {
        groups_found: 0,
        trades_removed: 0,
        details: []
      },
      alerts: [],
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(errorResult), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
