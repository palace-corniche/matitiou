import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GLOBAL_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001'
const STARTING_BALANCE = 100

// Always wiped (trade execution surface)
const TRADE_TABLES = [
  'exit_intelligence',
  'trade_execution_log',
  'intelligent_targets',
  'signal_execution_attempts',
  'shadow_trades',
]

// Learning state — wiped per user choice
const LEARNING_TABLES = [
  'learning_outcomes',
  'learning_actions',
  'adaptive_thresholds',
  'discovered_patterns',
  'system_learning_stats',
  'module_performance',
]

// Intentionally NOT wiped (audit trail per user choice):
//   master_signals, signal_rejection_logs, master_signals_fusion,
//   modular_signals, trading_signals, news_events, market_data_feed,
//   tick_data, aggregated_candles, economic_calendar, cot_reports,
//   correlations, retail_positions, system_health, system_config,
//   trading_config, function_execution_locks

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const beforeCounts: Record<string, number> = {}
    const deleted: Record<string, number> = {}
    const errors: Record<string, string> = {}

    const allTables = [...TRADE_TABLES, ...LEARNING_TABLES]

    // BEFORE counts
    for (const t of allTables) {
      const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true })
      if (error) {
        errors[`${t}:count_before`] = error.message
        beforeCounts[t] = -1
      } else {
        beforeCounts[t] = count ?? 0
      }
    }

    // Get account before
    const { data: acctBefore } = await supabase
      .from('global_trading_account')
      .select('balance, equity, total_trades')
      .eq('id', GLOBAL_ACCOUNT_ID)
      .single()

    // DELETE — neq trick deletes all rows; works regardless of PK type
    for (const t of allTables) {
      const before = beforeCounts[t] ?? 0
      if (before <= 0) { deleted[t] = 0; continue }
      const { error } = await supabase.from(t).delete().not('id', 'is', null)
      if (error) {
        errors[`${t}:delete`] = error.message
        deleted[t] = 0
        continue
      }
      const { count: after } = await supabase.from(t).select('*', { count: 'exact', head: true })
      deleted[t] = before - (after ?? 0)
    }

    // Reset account
    const { error: acctErr } = await supabase
      .from('global_trading_account')
      .update({
        balance: STARTING_BALANCE,
        equity: STARTING_BALANCE,
        free_margin: STARTING_BALANCE,
        used_margin: 0,
        margin: 0,
        margin_level: 0,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        win_rate: 0,
        total_pnl: 0,
        largest_win: 0,
        largest_loss: 0,
        average_win: 0,
        average_loss: 0,
        profit_factor: 0,
        peak_balance: STARTING_BALANCE,
        updated_at: new Date().toISOString(),
      })
      .eq('id', GLOBAL_ACCOUNT_ID)
    if (acctErr) errors['global_trading_account:reset'] = acctErr.message

    const { data: acctAfter } = await supabase
      .from('global_trading_account')
      .select('balance, equity, total_trades')
      .eq('id', GLOBAL_ACCOUNT_ID)
      .single()

    const success = Object.keys(errors).length === 0
    return new Response(JSON.stringify({
      success,
      starting_balance: STARTING_BALANCE,
      tables: allTables.map(t => ({
        table: t,
        before: beforeCounts[t] ?? 0,
        deleted: deleted[t] ?? 0,
        kind: TRADE_TABLES.includes(t) ? 'trade' : 'learning',
      })),
      account_before: acctBefore,
      account_after: acctAfter,
      preserved_tables: ['master_signals', 'signal_rejection_logs', 'master_signals_fusion', 'modular_signals'],
      errors,
      timestamp: new Date().toISOString(),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: success ? 200 : 500 })
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})
