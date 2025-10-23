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

    console.log('🔧 Fixing trade_history balance records...');

    const globalAccountId = '00000000-0000-0000-0000-000000000001';

    // Get current correct balance
    const { data: globalAccount } = await supabase
      .from('global_trading_account')
      .select('balance, equity')
      .eq('id', globalAccountId)
      .single();

    if (!globalAccount) {
      throw new Error('Global account not found');
    }

    console.log(`Current correct balance: $${globalAccount.balance}`);

    // Fix the closed trade record with -33.2 pips
    const { data: incorrectRecord, error: selectError } = await supabase
      .from('trade_history')
      .select('*')
      .eq('portfolio_id', globalAccountId)
      .eq('action_type', 'close')
      .eq('profit', 0)
      .eq('profit_pips', -33.2)
      .order('execution_time', { ascending: false })
      .limit(1)
      .single();

    if (selectError || !incorrectRecord) {
      console.log('No incorrect record found to fix');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No records needed fixing',
          current_balance: globalAccount.balance
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate correct P&L for -33.2 pips with 0.01 lot
    const pnlDollars = -33.2 * 0.1; // -$3.32 (0.01 lot = $0.10 per pip)
    const correctedBalance = 100; // Current actual balance

    // Update the record
    const { error: updateError } = await supabase
      .from('trade_history')
      .update({
        profit: pnlDollars,
        balance_before: 100,
        balance_after: correctedBalance,
        equity_before: 100,
        equity_after: correctedBalance
      })
      .eq('id', incorrectRecord.id);

    if (updateError) {
      throw updateError;
    }

    // Fix all open trade records to show current balance
    const { data: openRecords } = await supabase
      .from('trade_history')
      .select('id')
      .eq('portfolio_id', globalAccountId)
      .eq('action_type', 'open')
      .eq('balance_before', 10000);

    if (openRecords && openRecords.length > 0) {
      const { error: openUpdateError } = await supabase
        .from('trade_history')
        .update({
          balance_before: correctedBalance,
          balance_after: correctedBalance,
          equity_before: correctedBalance,
          equity_after: correctedBalance
        })
        .in('id', openRecords.map(r => r.id));

      if (openUpdateError) {
        console.error('Error updating open records:', openUpdateError);
      } else {
        console.log(`✅ Updated ${openRecords.length} open trade records`);
      }
    }

    console.log('✅ Trade history corrected successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Trade history balance corrected',
        corrected_pnl: pnlDollars,
        corrected_balance: correctedBalance,
        records_updated: 1 + (openRecords?.length || 0)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fixing trade history:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
