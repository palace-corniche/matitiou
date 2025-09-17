import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { portfolioId } = await req.json();

    if (!portfolioId) {
      return new Response(
        JSON.stringify({ error: 'Portfolio ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔄 Starting complete portfolio reset for:', portfolioId);

    // Step 1: Delete ALL historical data related to this portfolio
    const deletions = await Promise.all([
      // Delete trade history
      supabase
        .from('trade_history')
        .delete()
        .eq('portfolio_id', portfolioId),
      
      // Delete performance snapshots
      supabase
        .from('performance_snapshots')
        .delete()
        .eq('portfolio_id', portfolioId),
      
      // Delete account history
      supabase
        .from('account_history')
        .delete()
        .eq('portfolio_id', portfolioId),
      
      // Delete account transactions
      supabase
        .from('account_transactions')
        .delete()
        .eq('portfolio_id', portfolioId),
      
      // Delete pending orders
      supabase
        .from('pending_orders')
        .delete()
        .eq('portfolio_id', portfolioId),
      
      // Delete ALL trades (both open and closed)
      supabase
        .from('shadow_trades')
        .delete()
        .eq('portfolio_id', portfolioId),
      
      // Delete EA logs
      supabase
        .from('ea_logs')
        .delete()
        .eq('portfolio_id', portfolioId),
      
      // Delete automated trading rules
      supabase
        .from('automated_trading_rules')
        .delete()
        .eq('portfolio_id', portfolioId)
    ]);

    // Check for deletion errors
    const deletionErrors = deletions.filter(result => result.error);
    if (deletionErrors.length > 0) {
      console.error('❌ Deletion errors:', deletionErrors);
      return new Response(
        JSON.stringify({ error: 'Failed to delete historical data', details: deletionErrors }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count what was deleted
    const deletedCounts = {
      trade_history: deletions[0].count || 0,
      performance_snapshots: deletions[1].count || 0,
      account_history: deletions[2].count || 0,
      account_transactions: deletions[3].count || 0,
      pending_orders: deletions[4].count || 0,
      shadow_trades: deletions[5].count || 0,
      ea_logs: deletions[6].count || 0,
      automated_trading_rules: deletions[7].count || 0
    };

    console.log('🗑️ Deleted records:', deletedCounts);

    // Step 2: Reset portfolio to pristine initial state
    const { data: portfolio, error: resetError } = await supabase
      .from('shadow_portfolios')
      .update({
        // Financial reset
        balance: 100,
        equity: 100000.00,
        margin: 0.00,
        free_margin: 100000.00,
        used_margin: 0.00,
        margin_level: 0.00,
        floating_pnl: 0.00,
        
        // Performance reset
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        win_rate: 0.00,
        average_win: 0.00,
        average_loss: 0.00,
        profit_factor: 0.00,
        max_drawdown: 0.00,
        current_drawdown: 0.00,
        max_drawdown_amount: 0.00,
        peak_balance: 100000.00,
        max_equity: 100000.00,
        sharpe_ratio: 0.00,
        expectancy: 0.00,
        
        // Streaks and extremes reset
        consecutive_wins: 0,
        consecutive_losses: 0,
        largest_win: 0.00,
        largest_loss: 0.00,
        
        // Financial tracking reset
        total_commission: 0.00,
        total_swap: 0.00,
        daily_pnl_today: 0.00,
        
        // Deposits/withdrawals reset
        deposits_total: 0.00,
        withdrawals_total: 0.00,
        
        // Timestamps reset
        last_trade_time: null,
        last_daily_reset: new Date().toISOString(),
        trading_days: 0,
        
        // Updated timestamp
        updated_at: new Date().toISOString()
      })
      .eq('id', portfolioId)
      .select()
      .single();

    if (resetError) {
      console.error('❌ Portfolio reset error:', resetError);
      return new Response(
        JSON.stringify({ error: 'Failed to reset portfolio', details: resetError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Portfolio reset completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        portfolio,
        deletedCounts,
        message: 'Portfolio completely reset to initial state'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Reset portfolio error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});