import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const { action, portfolioId, ...requestData } = await req.json();

    console.log(`🎯 Enhanced Trading Action: ${action}`, { portfolioId, requestData });

    let result;

    switch (action) {
      case 'execute_market_order':
        result = await executeMarketOrder(supabase, portfolioId, requestData);
        break;
      case 'place_pending_order':
        result = await placePendingOrder(supabase, portfolioId, requestData);
        break;
      case 'calculate_position_size':
        result = await calculatePositionSize(supabase, portfolioId, requestData);
        break;
      case 'modify_trade':
        result = await modifyTrade(supabase, requestData);
        break;
      case 'close_trade':
        result = await closeTrade(supabase, requestData);
        break;
      case 'update_trailing_stops':
        result = await updateTrailingStops(supabase);
        break;
      case 'manage_break_even':
        result = await manageBreakEven(supabase);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Enhanced trading error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: (error as Error).message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function executeMarketOrder(supabase: any, portfolioId: string, orderData: any) {
  console.log('📊 Executing market order:', orderData);

  // Use the database function for advanced order execution
  const { data, error } = await supabase.rpc('execute_advanced_order', {
    p_portfolio_id: portfolioId,
    p_order_data: orderData
  });

  if (error) throw error;

  console.log('✅ Market order executed:', data);
  return data;
}

async function placePendingOrder(supabase: any, portfolioId: string, orderData: any) {
  console.log('📝 Placing pending order:', orderData);

  const { data, error } = await supabase
    .from('pending_orders')
    .insert({
      portfolio_id: portfolioId,
      symbol: orderData.symbol,
      order_type: orderData.orderType,
      trade_type: orderData.tradeType,
      lot_size: orderData.lotSize,
      trigger_price: orderData.triggerPrice,
      stop_loss: orderData.stopLoss,
      take_profit: orderData.takeProfit,
      expiry_time: orderData.expiryTime,
      notes: orderData.comment || ''
    })
    .select()
    .single();

  if (error) throw error;

  console.log('✅ Pending order placed:', data);
  return { success: true, order: data };
}

async function calculatePositionSize(supabase: any, portfolioId: string, requestData: any) {
  console.log('📐 Calculating position size:', requestData);

  const { data, error } = await supabase.rpc('calculate_optimal_lot_size', {
    p_portfolio_id: portfolioId,
    p_symbol: requestData.symbol,
    p_risk_percentage: requestData.riskPercentage,
    p_entry_price: requestData.entryPrice,
    p_stop_loss: requestData.stopLoss
  });

  if (error) throw error;

  console.log('✅ Position size calculated:', data);
  return data;
}

async function modifyTrade(supabase: any, requestData: any) {
  console.log('📝 Modifying trade:', requestData);

  const { data, error } = await supabase
    .from('shadow_trades')
    .update({
      stop_loss: requestData.stopLoss,
      take_profit: requestData.takeProfit,
      trailing_stop_distance: requestData.trailingStopDistance,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestData.tradeId)
    .select()
    .single();

  if (error) throw error;

  // Log the modification
  await supabase.from('ea_logs').insert({
    portfolio_id: data.portfolio_id,
    trade_id: data.id,
    ea_name: 'Enhanced Trading Engine',
    log_level: 'INFO',
    message: `Trade modified - SL: ${requestData.stopLoss}, TP: ${requestData.takeProfit}`,
    symbol: data.symbol
  });

  console.log('✅ Trade modified:', data);
  return { success: true, trade: data };
}

async function closeTrade(supabase: any, requestData: any) {
  console.log('🔒 Closing trade:', requestData);

  // Get current market price (simplified)
  const { data: marketData, error: marketError } = await supabase
    .from('market_data_enhanced')
    .select('close_price')
    .eq('symbol', requestData.symbol)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  const closePrice = marketData?.close_price || requestData.closePrice;

  // Use the database function to close the trade
  const { data, error } = await supabase.rpc('close_shadow_trade', {
    p_trade_id: requestData.tradeId,
    p_close_price: closePrice,
    p_close_lot_size: requestData.lotSize,
    p_close_reason: requestData.reason || 'manual'
  });

  if (error) throw error;

  console.log('✅ Trade closed:', data);
  return data;
}

async function updateTrailingStops(supabase: any) {
  console.log('🎯 Updating trailing stops...');

  const { data, error } = await supabase.rpc('update_trailing_stops');

  if (error) throw error;

  console.log('✅ Trailing stops updated');
  return { success: true, message: 'Trailing stops updated' };
}

async function manageBreakEven(supabase: any) {
  console.log('⚖️ Managing break-even...');

  const { data, error } = await supabase.rpc('manage_break_even');

  if (error) throw error;

  console.log('✅ Break-even management completed');
  return { success: true, message: 'Break-even management completed' };
}