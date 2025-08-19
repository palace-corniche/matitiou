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

  const startTime = Date.now();
  let processedItems = 0;
  let status = 'success';
  let errorMessage = '';

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestBody = await req.json().catch(() => ({}));
    const { signal_id, trigger } = requestBody;

    console.log('🚀 Starting shadow trade execution...');
    console.log('📋 Trigger:', trigger, 'Signal ID:', signal_id);

    // Get all active portfolios
    const { data: portfolios, error: portfoliosError } = await supabase
      .from('shadow_portfolios')
      .select('*')
      .eq('is_active', true)
      .eq('auto_trading_enabled', true);

    if (portfoliosError || !portfolios?.length) {
      console.log('⚠️ No active portfolios found for trading');
      return new Response(
        JSON.stringify({ success: true, message: 'No active portfolios found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`💼 Found ${portfolios.length} active portfolios`);

    // Get qualifying signals (either specific signal or all new signals)
    let signalsQuery = supabase
      .from('trading_signals')
      .select('*')
      .eq('was_executed', false)
      .gte('confluence_score', 25) // Minimum score threshold
      .in('signal_type', ['buy', 'sell'])
      .order('created_at', { ascending: false });

    if (signal_id) {
      signalsQuery = signalsQuery.eq('signal_id', signal_id);
    } else {
      // Only get signals from last 30 minutes if no specific signal
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      signalsQuery = signalsQuery.gte('created_at', thirtyMinutesAgo);
    }

    const { data: signals, error: signalsError } = await signalsQuery.limit(5);

    if (signalsError || !signals?.length) {
      console.log('⚠️ No qualifying signals found for execution');
      return new Response(
        JSON.stringify({ success: true, message: 'No qualifying signals found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎯 Found ${signals.length} qualifying signals to execute`);

    const executedTrades = [];

    // Execute trades for each qualifying signal and portfolio
    for (const signal of signals) {
      for (const portfolio of portfolios) {
        try {
          // Check if portfolio can accept new trades
          const { data: openTrades } = await supabase
            .from('shadow_trades')
            .select('id')
            .eq('portfolio_id', portfolio.id)
            .eq('status', 'open');

          if (openTrades && openTrades.length >= portfolio.max_open_positions) {
            console.log(`⏭️ Portfolio ${portfolio.id.slice(0, 8)} has max open positions`);
            continue;
          }

          // Check for opposing trades
          const { data: opposingTrades } = await supabase
            .from('shadow_trades')
            .select('*')
            .eq('portfolio_id', portfolio.id)
            .eq('symbol', signal.pair)
            .eq('status', 'open')
            .neq('trade_type', signal.signal_type);

          // Close opposing trades first
          if (opposingTrades?.length) {
            console.log(`🔄 Closing ${opposingTrades.length} opposing trades`);
            
            for (const opposingTrade of opposingTrades) {
              const pnl = calculatePnL(opposingTrade, signal.entry_price);
              
              await supabase
                .from('shadow_trades')
                .update({
                  status: 'closed',
                  exit_price: signal.entry_price,
                  exit_time: new Date().toISOString(),
                  exit_reason: 'opposing_signal',
                  pnl: pnl.pnl,
                  pnl_percent: pnl.pnlPercent,
                  holding_time_minutes: Math.round((Date.now() - new Date(opposingTrade.entry_time).getTime()) / 60000)
                })
                .eq('id', opposingTrade.id);

              // Update portfolio balance
              await supabase
                .from('shadow_portfolios')
                .update({
                  balance: parseFloat(portfolio.balance.toString()) + pnl.pnl,
                  total_trades: portfolio.total_trades + 1,
                  winning_trades: pnl.pnl > 0 ? portfolio.winning_trades + 1 : portfolio.winning_trades,
                  losing_trades: pnl.pnl <= 0 ? portfolio.losing_trades + 1 : portfolio.losing_trades,
                  updated_at: new Date().toISOString()
                })
                .eq('id', portfolio.id);

              console.log(`💰 Closed opposing trade: ${pnl.pnl > 0 ? 'WIN' : 'LOSS'} $${pnl.pnl.toFixed(2)}`);
            }
          }

          // Calculate position size based on risk management
          const positionSize = calculatePositionSize(
            portfolio.balance,
            signal.entry_price,
            signal.stop_loss,
            portfolio.risk_per_trade
          );

          // Create new shadow trade
          const newTrade = {
            portfolio_id: portfolio.id,
            signal_id: signal.id,
            symbol: signal.pair,
            trade_type: signal.signal_type,
            entry_price: signal.entry_price,
            entry_time: new Date().toISOString(),
            stop_loss: signal.stop_loss,
            take_profit: signal.take_profit,
            position_size: positionSize,
            confluence_score: signal.confluence_score,
            risk_reward_ratio: signal.risk_reward_ratio,
            status: 'open'
          };

          const { data: insertedTrade, error: tradeError } = await supabase
            .from('shadow_trades')
            .insert(newTrade)
            .select()
            .single();

          if (tradeError) {
            console.error('Error creating trade:', tradeError);
            continue;
          }

          // Update portfolio metrics
          const margin = positionSize * 0.01; // 1% margin requirement
          await supabase
            .from('shadow_portfolios')
            .update({
              margin: parseFloat(portfolio.margin.toString()) + margin,
              free_margin: parseFloat(portfolio.balance.toString()) - parseFloat(portfolio.margin.toString()) - margin,
              updated_at: new Date().toISOString()
            })
            .eq('id', portfolio.id);

          executedTrades.push({
            trade_id: insertedTrade.id,
            portfolio_id: portfolio.id,
            signal_type: signal.signal_type,
            entry_price: signal.entry_price,
            position_size: positionSize,
            confluence_score: signal.confluence_score
          });

          processedItems++;
          console.log(`✅ Executed ${signal.signal_type.toUpperCase()} trade for portfolio ${portfolio.id.slice(0, 8)}: $${positionSize.toFixed(2)} @ ${signal.entry_price}`);

        } catch (tradeError) {
          console.error(`Error executing trade for portfolio ${portfolio.id}:`, tradeError);
        }
      }

      // Mark signal as executed
      await supabase
        .from('trading_signals')
        .update({ 
          was_executed: true,
          execution_reason: `Executed ${processedItems} trades`,
          updated_at: new Date().toISOString()
        })
        .eq('id', signal.id);
    }

    // Log system health
    const executionTime = Date.now() - startTime;
    await supabase.from('system_health').insert({
      function_name: 'execute-shadow-trades',
      execution_time_ms: executionTime,
      status,
      error_message: errorMessage || null,
      processed_items: processedItems,
      memory_usage_mb: (performance as any).memory?.usedJSHeapSize ? 
        Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : null
    });

    console.log(`🎉 Trade execution completed: ${processedItems} trades executed in ${executionTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Executed ${processedItems} shadow trades`,
        executedTrades: executedTrades.length,
        trades: executedTrades,
        executionTimeMs: executionTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ Error in execute-shadow-trades:', error);

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.from('system_health').insert({
        function_name: 'execute-shadow-trades',
        execution_time_ms: executionTime,
        status: 'error',
        error_message: error.message,
        processed_items: processedItems
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        executionTimeMs: executionTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function calculatePositionSize(
  balance: number,
  entryPrice: number, 
  stopLoss: number,
  riskPerTrade: number
): number {
  // Enhanced position sizing with Kelly Criterion and CVaR constraints
  const riskAmount = balance * riskPerTrade;
  const stopLossDistance = Math.abs(entryPrice - stopLoss) / entryPrice;
  
  // Base position size from risk management
  let basePositionSize = riskAmount / stopLossDistance;
  
  // Kelly fraction calculation (simplified - in production, use actual win probability)
  const estimatedWinProbability = 0.6; // Conservative estimate
  const rewardRiskRatio = 2.0; // 2:1 risk-reward
  const kellyFraction = ((estimatedWinProbability * rewardRiskRatio) - (1 - estimatedWinProbability)) / rewardRiskRatio;
  const kellyPositionSize = balance * Math.max(0, Math.min(0.25, kellyFraction)); // Cap at 25%
  
  // Use the more conservative of the two approaches
  let positionSize = Math.min(basePositionSize, kellyPositionSize);
  
  // CVaR constraint - limit to 5% of portfolio value at risk
  const cvarLimit = balance * 0.05;
  const cvarConstrainedSize = cvarLimit / stopLossDistance;
  positionSize = Math.min(positionSize, cvarConstrainedSize);
  
  // Multi-level caps
  const maxPositionSize = balance * 0.08; // Reduced from 10% to 8% for better risk control
  positionSize = Math.min(positionSize, maxPositionSize);
  
  // Minimum position size (but not if risk is too high)
  const minPositionSize = balance * 0.005; // 0.5% minimum
  positionSize = Math.max(positionSize, minPositionSize);
  
  // Final validation - ensure position doesn't risk more than intended
  const actualRisk = positionSize * stopLossDistance;
  const maxAllowedRisk = balance * riskPerTrade * 1.5; // Allow 1.5x for rounding
  
  if (actualRisk > maxAllowedRisk) {
    positionSize = maxAllowedRisk / stopLossDistance;
  }
  
  return Math.round(positionSize * 100) / 100;
}

function calculatePnL(trade: any, exitPrice: number) {
  const entryPrice = parseFloat(trade.entry_price.toString());
  const positionSize = parseFloat(trade.position_size.toString());
  
  const priceMove = trade.trade_type === 'buy' 
    ? exitPrice - entryPrice
    : entryPrice - exitPrice;
  
  const pnl = (priceMove / entryPrice) * positionSize;
  const pnlPercent = (priceMove / entryPrice) * 100;
  
  return {
    pnl: Math.round(pnl * 100) / 100,
    pnlPercent: Math.round(pnlPercent * 10000) / 10000
  };
}