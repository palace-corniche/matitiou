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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { sessionId, force = false } = await req.json();

    console.log('🔄 Starting portfolio consolidation...');

    // Step 1: Get all portfolios for this session/user
    const { data: portfolios, error: portfoliosError } = await supabase
      .from('shadow_portfolios')
      .select('*')
      .or(sessionId ? `session_id.eq.${sessionId}` : 'session_id.is.null')
      .order('created_at', { ascending: true });

    if (portfoliosError) {
      throw new Error(`Failed to fetch portfolios: ${portfoliosError.message}`);
    }

    if (!portfolios || portfolios.length === 0) {
      console.log('📝 No portfolios found, creating master portfolio...');
      
      const { data: newPortfolio, error: createError } = await supabase
        .from('shadow_portfolios')
        .insert({
          session_id: sessionId,
          balance: 100000.00,
          equity: 100000.00,
          is_active: true,
          auto_trading_enabled: true,
          account_name: 'Master Portfolio',
          max_open_positions: 20
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create master portfolio: ${createError.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          masterPortfolio: newPortfolio,
          consolidatedData: {
            portfoliosProcessed: 0,
            tradesTransferred: 0,
            historyTransferred: 0
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (portfolios.length === 1) {
      console.log('✅ Only one portfolio found, no consolidation needed');
      return new Response(
        JSON.stringify({
          success: true,
          masterPortfolio: portfolios[0],
          consolidatedData: {
            portfoliosProcessed: 1,
            tradesTransferred: 0,
            historyTransferred: 0,
            message: 'No consolidation needed - single portfolio already exists'
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Found ${portfolios.length} portfolios to consolidate`);

    // Step 2: Identify master portfolio (most recent or specified)
    const masterPortfolio = portfolios[portfolios.length - 1]; // Most recent
    const portfoliosToMerge = portfolios.filter(p => p.id !== masterPortfolio.id);

    console.log(`🎯 Master portfolio: ${masterPortfolio.id}`);
    console.log(`🔀 Portfolios to merge: ${portfoliosToMerge.length}`);

    // Step 3: Consolidate all trades into master portfolio
    let totalTradesTransferred = 0;
    let totalHistoryTransferred = 0;

    for (const portfolio of portfoliosToMerge) {
      console.log(`📦 Processing portfolio ${portfolio.id}...`);

      // Transfer open trades
      const { data: trades, error: tradesError } = await supabase
        .from('shadow_trades')
        .update({ portfolio_id: masterPortfolio.id })
        .eq('portfolio_id', portfolio.id)
        .select();

      if (tradesError) {
        console.error(`❌ Error transferring trades from ${portfolio.id}:`, tradesError);
      } else {
        totalTradesTransferred += trades?.length || 0;
        console.log(`✅ Transferred ${trades?.length || 0} trades from ${portfolio.id}`);
      }

      // Transfer trade history
      const { data: history, error: historyError } = await supabase
        .from('trade_history')
        .update({ portfolio_id: masterPortfolio.id })
        .eq('portfolio_id', portfolio.id)
        .select();

      if (historyError) {
        console.error(`❌ Error transferring history from ${portfolio.id}:`, historyError);
      } else {
        totalHistoryTransferred += history?.length || 0;
        console.log(`✅ Transferred ${history?.length || 0} history records from ${portfolio.id}`);
      }

      // Transfer other related data
      await Promise.all([
        supabase.from('account_history').update({ portfolio_id: masterPortfolio.id }).eq('portfolio_id', portfolio.id),
        supabase.from('account_transactions').update({ portfolio_id: masterPortfolio.id }).eq('portfolio_id', portfolio.id),
        supabase.from('pending_orders').update({ portfolio_id: masterPortfolio.id }).eq('portfolio_id', portfolio.id),
        supabase.from('performance_snapshots').update({ portfolio_id: masterPortfolio.id }).eq('portfolio_id', portfolio.id),
        supabase.from('ea_logs').update({ portfolio_id: masterPortfolio.id }).eq('portfolio_id', portfolio.id),
        supabase.from('automated_trading_rules').update({ portfolio_id: masterPortfolio.id }).eq('portfolio_id', portfolio.id)
      ]);

      // Deactivate old portfolio
      await supabase
        .from('shadow_portfolios')
        .update({ 
          is_active: false,
          account_name: `[MERGED] ${portfolio.account_name || 'Portfolio'}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', portfolio.id);

      console.log(`🗂️ Deactivated portfolio ${portfolio.id}`);
    }

    // Step 4: Update master portfolio with consolidated metrics
    const { data: allTrades } = await supabase
      .from('shadow_trades')
      .select('*')
      .eq('portfolio_id', masterPortfolio.id)
      .eq('status', 'closed');

    let consolidatedMetrics = {
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      win_rate: 0,
      largest_win: 0,
      largest_loss: 0,
      total_commission: 0,
      total_swap: 0
    };

    if (allTrades && allTrades.length > 0) {
      consolidatedMetrics.total_trades = allTrades.length;
      consolidatedMetrics.winning_trades = allTrades.filter(t => (t.pnl || 0) > 0).length;
      consolidatedMetrics.losing_trades = allTrades.filter(t => (t.pnl || 0) <= 0).length;
      consolidatedMetrics.win_rate = (consolidatedMetrics.winning_trades / consolidatedMetrics.total_trades) * 100;
      consolidatedMetrics.largest_win = Math.max(...allTrades.map(t => t.pnl || 0));
      consolidatedMetrics.largest_loss = Math.min(...allTrades.map(t => t.pnl || 0));
      consolidatedMetrics.total_commission = allTrades.reduce((sum, t) => sum + (t.commission || 0), 0);
      consolidatedMetrics.total_swap = allTrades.reduce((sum, t) => sum + (t.swap || 0), 0);
    }

    // Step 5: Update master portfolio
    const { data: updatedMaster, error: updateError } = await supabase
      .from('shadow_portfolios')
      .update({
        ...consolidatedMetrics,
        account_name: 'Unified Master Portfolio',
        is_active: true,
        auto_trading_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', masterPortfolio.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update master portfolio: ${updateError.message}`);
    }

    console.log('✅ Portfolio consolidation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        masterPortfolio: updatedMaster,
        consolidatedData: {
          portfoliosProcessed: portfolios.length,
          portfoliosMerged: portfoliosToMerge.length,
          tradesTransferred: totalTradesTransferred,
          historyTransferred: totalHistoryTransferred,
          consolidatedMetrics
        },
        message: `Successfully consolidated ${portfoliosToMerge.length} portfolios into master portfolio`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Portfolio consolidation error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});