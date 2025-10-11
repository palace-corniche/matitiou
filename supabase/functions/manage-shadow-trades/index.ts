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

    console.log('🔄 Starting shadow trade management...');

    // Get all open trades
    const { data: openTrades, error: tradesError } = await supabase
      .from('shadow_trades')
      .select(`
        *,
        shadow_portfolios!inner (
          id, balance, is_active, auto_trading_enabled
        )
      `)
      .eq('status', 'open')
      .eq('shadow_portfolios.is_active', true);

    if (tradesError) {
      throw new Error(`Error fetching open trades: ${tradesError.message}`);
    }

    if (!openTrades || openTrades.length === 0) {
      console.log('📊 No open trades found to manage');
      return new Response(
        JSON.stringify({ success: true, message: 'No open trades to manage' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📈 Managing ${openTrades.length} open trades`);

    // Get current market price
    const { data: latestPrice, error: priceError } = await supabase
      .from('market_data_feed')
      .select('price, timestamp')
      .eq('symbol', 'EUR/USD')
      .eq('timeframe', '15m')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (priceError || !latestPrice) {
      throw new Error(`Error fetching current price: ${priceError?.message || 'No price data'}`);
    }

    const currentPrice = parseFloat(latestPrice.price.toString());
    console.log(`💰 Current EUR/USD price: ${currentPrice}`);

    const closedTrades = [];
    const portfolioUpdates = new Map();

    // **PHASE 4: INTELLIGENT EXIT INTEGRATION**
    // Check each trade for exit conditions using holistic intelligence
    for (const trade of openTrades) {
      try {
        const entryPrice = parseFloat(trade.entry_price.toString());
        const stopLoss = parseFloat(trade.stop_loss.toString());
        const takeProfit = parseFloat(trade.take_profit.toString());
        const positionSize = parseFloat(trade.position_size.toString());
        
        let shouldClose = false;
        let exitReason = '';
        let exitIntelligence = null;

        // **ALWAYS RESPECT HARD SL/TP LIMITS (Priority 1)**
        if (trade.trade_type === 'buy') {
          if (currentPrice <= stopLoss) {
            shouldClose = true;
            exitReason = 'stop_loss';
          } else if (currentPrice >= takeProfit) {
            shouldClose = true;
            exitReason = 'take_profit';
          }
        } else { // sell
          if (currentPrice >= stopLoss) {
            shouldClose = true;
            exitReason = 'stop_loss';
          } else if (currentPrice <= takeProfit) {
            shouldClose = true;
            exitReason = 'take_profit';
          }
        }

        // **PHASE 2: PARTIAL CLOSE AT 75 PIPS (Secondary TP)**
        const profitPips = calculateProfitPips(trade, currentPrice);
        const partialCloseThreshold = 75; // 75 pips for 50% partial close
        
        if (!shouldClose && profitPips >= partialCloseThreshold && !trade.partial_close_triggered) {
          // Close 50% of position at 75 pips
          const closeSize = parseFloat(trade.remaining_lot_size.toString()) * 0.5;
          
          if (closeSize >= 0.01) { // Only if remaining size is sufficient
            console.log(`💰 PARTIAL CLOSE triggered at ${profitPips.toFixed(1)} pips profit - closing 50% (${closeSize} lots)`);
            
            // Calculate partial P&L
            const partialPnl = calculatePnL({ ...trade, position_size: closeSize }, currentPrice);
            
            // Update trade with partial close
            await supabase
              .from('shadow_trades')
              .update({
                remaining_lot_size: parseFloat(trade.remaining_lot_size.toString()) - closeSize,
                partial_close_triggered: true,
                realized_pnl: (parseFloat(trade.realized_pnl?.toString() || '0')) + partialPnl.pnl,
                partial_close_count: (trade.partial_close_count || 0) + 1,
                updated_at: new Date().toISOString()
              })
              .eq('id', trade.id);
            
            // Update portfolio balance with partial profits
            const portfolioId = trade.portfolio_id;
            await supabase
              .from('shadow_portfolios')
              .update({
                balance: parseFloat(trade.shadow_portfolios.balance.toString()) + partialPnl.pnl,
                equity: parseFloat(trade.shadow_portfolios.equity.toString()) + partialPnl.pnl,
                updated_at: new Date().toISOString()
              })
              .eq('id', portfolioId);
            
            // Log to trade history
            await supabase
              .from('trade_history')
              .insert({
                portfolio_id: portfolioId,
                original_trade_id: trade.id,
                action_type: 'partial_close',
                symbol: trade.symbol,
                trade_type: trade.trade_type,
                lot_size: closeSize,
                execution_price: currentPrice,
                profit: partialPnl.pnl,
                profit_pips: profitPips,
                balance_before: parseFloat(trade.shadow_portfolios.balance.toString()),
                balance_after: parseFloat(trade.shadow_portfolios.balance.toString()) + partialPnl.pnl,
                execution_time: new Date().toISOString()
              });
            
            console.log(`✅ Partial close completed: $${partialPnl.pnl.toFixed(2)} realized, ${(parseFloat(trade.remaining_lot_size.toString()) - closeSize).toFixed(2)} lots remaining`);
            
            // Update local trade object for trailing stop logic
            trade.remaining_lot_size = parseFloat(trade.remaining_lot_size.toString()) - closeSize;
            trade.partial_close_triggered = true;
          }
        }

        // **TRAILING STOP LOGIC (Priority 1.5 - Before intelligence check)**
        if (!shouldClose && trade.trailing_stop_distance && trade.trailing_stop_distance > 0) {
          const profitPips = calculateProfitPips(trade, currentPrice);
          const trailingDistance = parseFloat(trade.trailing_stop_distance.toString());
          
          // Activate trailing stop after 20 pips profit
          if (profitPips >= 20) {
            let newStopLoss = stopLoss;
            
            if (trade.trade_type === 'buy') {
              // For BUY: move SL up as price moves up
              const potentialNewSL = currentPrice - (trailingDistance * 0.0001);
              
              if (potentialNewSL > stopLoss) {
                newStopLoss = potentialNewSL;
                
                // Update the trade's stop loss in database
                await supabase
                  .from('shadow_trades')
                  .update({ 
                    stop_loss: newStopLoss,
                    trailing_stop_triggered: true,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', trade.id);
                
                console.log(`📈 Trailing stop activated for BUY trade ${trade.id.slice(0, 8)}: SL moved from ${stopLoss.toFixed(5)} to ${newStopLoss.toFixed(5)} (+${profitPips.toFixed(1)} pips profit)`);
                
                // Update local variable for immediate check
                trade.stop_loss = newStopLoss;
                
                // Check if new SL was hit
                if (currentPrice <= newStopLoss) {
                  shouldClose = true;
                  exitReason = 'trailing_stop';
                }
              }
            } else {
              // For SELL: move SL down as price moves down
              const potentialNewSL = currentPrice + (trailingDistance * 0.0001);
              
              if (potentialNewSL < stopLoss) {
                newStopLoss = potentialNewSL;
                
                // Update the trade's stop loss in database
                await supabase
                  .from('shadow_trades')
                  .update({ 
                    stop_loss: newStopLoss,
                    trailing_stop_triggered: true,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', trade.id);
                
                console.log(`📉 Trailing stop activated for SELL trade ${trade.id.slice(0, 8)}: SL moved from ${stopLoss.toFixed(5)} to ${newStopLoss.toFixed(5)} (+${profitPips.toFixed(1)} pips profit)`);
                
                // Update local variable for immediate check
                trade.stop_loss = newStopLoss;
                
                // Check if new SL was hit
                if (currentPrice >= newStopLoss) {
                  shouldClose = true;
                  exitReason = 'trailing_stop';
                }
              }
            }
          }
        }

        // **INTELLIGENT EXIT SYSTEM (Priority 2 - Only if SL/TP not hit)**
        if (!shouldClose) {
          console.log(`🧠 Checking intelligence exit for trade ${trade.id.slice(0, 8)}...`);
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const exitEngineResponse = await fetch(
              `${supabaseUrl}/functions/v1/intelligent-exit-engine`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  tradeId: trade.id,
                  currentPrice
                }),
                signal: controller.signal
              }
            );
            
            clearTimeout(timeoutId);
            
            if (!exitEngineResponse.ok) {
              const errorText = await exitEngineResponse.text();
              console.error(`❌ Intelligence engine HTTP error ${exitEngineResponse.status}:`, errorText);
              throw new Error(`HTTP ${exitEngineResponse.status}: ${errorText}`);
            }

            const exitData = await exitEngineResponse.json();
            exitIntelligence = exitData.exitIntelligence;
            console.log(`✅ Intelligence score: ${exitIntelligence.overallExitScore}, Recommendation: ${exitIntelligence.recommendation}`);

            // Store intelligence in trade record
            console.log(`💾 Storing intelligence score in database...`);
            const { error: updateError } = await supabase
              .from('shadow_trades')
              .update({
                exit_intelligence_score: exitIntelligence.overallExitScore,
                exit_factors: exitIntelligence.factors,
                intelligence_exit_triggered: exitIntelligence.recommendation === 'FORCE_EXIT'
              })
              .eq('id', trade.id);
            
            if (updateError) {
              console.error(`❌ Failed to update intelligence score:`, updateError);
            } else {
              console.log(`✅ Intelligence score ${exitIntelligence.overallExitScore.toFixed(2)} stored, trigger: ${exitIntelligence.recommendation === 'FORCE_EXIT'}`);
            }

            // Decision based on intelligence score with minimum requirements
            if (exitIntelligence.recommendation === 'FORCE_EXIT') {
              // PHASE 3: Apply minimum profit/time requirements
              const profitPips = calculateProfitPips(trade, currentPrice);
              const holdingTimeMinutes = (Date.now() - new Date(trade.entry_time).getTime()) / 60000;
              
              const MIN_PROFIT_PIPS = 5;
              const MIN_HOLD_TIME_MINUTES = 10;
              
              console.log(`⚠️ FORCE_EXIT recommendation - Checking minimums:`);
              console.log(`   Current profit: ${profitPips.toFixed(1)} pips (min: ${MIN_PROFIT_PIPS})`);
              console.log(`   Holding time: ${holdingTimeMinutes.toFixed(0)}min (min: ${MIN_HOLD_TIME_MINUTES})`);
              
              if (profitPips >= MIN_PROFIT_PIPS && holdingTimeMinutes >= MIN_HOLD_TIME_MINUTES) {
                shouldClose = true;
                exitReason = 'intelligence_exit';
                console.log(`🧠 ✅ Intelligence EXIT APPROVED for ${trade.id.slice(0, 8)}`);
                console.log(`   Profit: ${profitPips.toFixed(1)} pips | Hold: ${holdingTimeMinutes.toFixed(0)}min`);
                console.log(`   Reasoning: ${exitIntelligence.reasoning}`);
                console.log(`   Score: ${exitIntelligence.overallExitScore.toFixed(2)}/100`);
              } else {
                console.log(`⏳ Intelligence wants exit but BLOCKED by minimums:`);
                console.log(`   Need: ${MIN_PROFIT_PIPS} pips & ${MIN_HOLD_TIME_MINUTES}min`);
                console.log(`   Have: ${profitPips.toFixed(1)} pips & ${holdingTimeMinutes.toFixed(0)}min`);
              }
            } else if (exitIntelligence.recommendation === 'HOLD_CONFIDENT') {
              console.log(`✅ Intelligence HOLD_CONFIDENT for ${trade.id.slice(0, 8)}`);
              console.log(`   Score: ${exitIntelligence.overallExitScore.toFixed(2)}/100 - ${exitIntelligence.reasoning}`);
            } else {
              console.log(`⚠️ Intelligence HOLD_CAUTION for ${trade.id.slice(0, 8)}`);
              console.log(`   Score: ${exitIntelligence.overallExitScore.toFixed(2)}/100 - ${exitIntelligence.reasoning}`);
            }
          } catch (intelligenceError) {
            console.error(`❌ ====== INTELLIGENCE EXIT ENGINE FAILED ======`);
            console.error(`Trade ID: ${trade.id.slice(0, 8)}`);
            console.error(`Error Type: ${(intelligenceError as Error).name}`);
            console.error(`Error Message: ${(intelligenceError as Error).message}`);
            
            if ((intelligenceError as Error).name === 'AbortError') {
              console.error(`⏱️ TIMEOUT: Exit engine took >10 seconds - check engine performance`);
            } else if ((intelligenceError as any).cause?.code === 'ECONNREFUSED') {
              console.error(`🔌 CONNECTION REFUSED: Exit engine not deployed or not accessible`);
            } else {
              console.error(`Stack trace:`, (intelligenceError as Error).stack);
            }
            
            console.error(`Attempted URL: ${supabaseUrl}/functions/v1/intelligent-exit-engine`);
            console.error(`========================================`);
            // Continue with fallback logic if intelligence fails
          }
        }

        // **FALLBACK: Time-based exit (24 hours) - Only if no other exit triggered**
        if (!shouldClose) {
          const entryTime = new Date(trade.entry_time).getTime();
          const hoursOpen = (Date.now() - entryTime) / (1000 * 60 * 60);
          
          if (hoursOpen >= 24) {
            shouldClose = true;
            exitReason = 'time';
          }
        }

        if (shouldClose) {
          // Calculate P&L and holding time
          const entryTime = new Date(trade.entry_time).getTime();
          const pnlResult = calculatePnL(trade, currentPrice);
          const holdingTimeMinutes = Math.round((Date.now() - entryTime) / 60000);

          // Update trade record with intelligence data
          const { error: updateError } = await supabase
            .from('shadow_trades')
            .update({
              status: 'closed',
              exit_price: currentPrice,
              exit_time: new Date().toISOString(),
              exit_reason: exitReason,
              pnl: pnlResult.pnl,
              pnl_percent: pnlResult.pnlPercent,
              holding_time_minutes: holdingTimeMinutes,
              intelligence_exit_triggered: exitReason === 'intelligence_exit',
              updated_at: new Date().toISOString()
            })
            .eq('id', trade.id);

          if (updateError) {
            console.error(`Error updating trade ${trade.id}:`, updateError);
            continue;
          }

          closedTrades.push({
            id: trade.id,
            symbol: trade.symbol,
            type: trade.trade_type,
            entryPrice,
            exitPrice: currentPrice,
            pnl: pnlResult.pnl,
            exitReason,
            holdingTimeMinutes
          });

          // Prepare portfolio updates
          const portfolioId = trade.portfolio_id;
          const currentBalance = parseFloat(trade.shadow_portfolios.balance.toString());
          
          if (!portfolioUpdates.has(portfolioId)) {
            portfolioUpdates.set(portfolioId, {
              portfolioId,
              balanceChange: 0,
              completedTrades: 0,
              wins: 0,
              losses: 0,
              marginReleased: 0
            });
          }

          const update = portfolioUpdates.get(portfolioId);
          update.balanceChange += pnlResult.pnl;
          update.completedTrades += 1;
          update.marginReleased += positionSize * 0.01; // 1% margin
          
          if (pnlResult.pnl > 0) {
            update.wins += 1;
          } else {
            update.losses += 1;
          }

          processedItems++;
          console.log(`💰 Closed ${trade.trade_type.toUpperCase()} trade: ${pnlResult.pnl > 0 ? 'WIN' : 'LOSS'} $${pnlResult.pnl.toFixed(2)} (${exitReason.toUpperCase()}) after ${holdingTimeMinutes}min`);
        }

      } catch (tradeError) {
        console.error(`Error processing trade ${trade.id}:`, tradeError);
      }
    }

    // Apply portfolio updates
    for (const [portfolioId, update] of portfolioUpdates) {
      try {
        // Get current portfolio state
        const { data: portfolio, error: portfolioError } = await supabase
          .from('shadow_portfolios')
          .select('*')
          .eq('id', portfolioId)
          .single();

        if (portfolioError || !portfolio) {
          console.error(`Error fetching portfolio ${portfolioId}:`, portfolioError);
          continue;
        }

        const newBalance = parseFloat(portfolio.balance.toString()) + update.balanceChange;
        const newTotalTrades = portfolio.total_trades + update.completedTrades;
        const newWinningTrades = portfolio.winning_trades + update.wins;
        const newLosingTrades = portfolio.losing_trades + update.losses;
        const newWinRate = newTotalTrades > 0 ? (newWinningTrades / newTotalTrades) * 100 : 0;
        const newMargin = Math.max(0, parseFloat(portfolio.margin.toString()) - update.marginReleased);
        const newFreeMargin = newBalance - newMargin;

        // Calculate equity (balance + unrealized P&L of open trades)
        const { data: remainingOpenTrades } = await supabase
          .from('shadow_trades')
          .select('trade_type, entry_price, position_size')
          .eq('portfolio_id', portfolioId)
          .eq('status', 'open');

        let unrealizedPnl = 0;
        if (remainingOpenTrades) {
          for (const openTrade of remainingOpenTrades) {
            const openTradeEntryPrice = parseFloat(openTrade.entry_price.toString());
            const openTradePositionSize = parseFloat(openTrade.position_size.toString());
            
            const priceMove = openTrade.trade_type === 'buy' 
              ? currentPrice - openTradeEntryPrice
              : openTradeEntryPrice - currentPrice;
            
            unrealizedPnl += (priceMove / openTradeEntryPrice) * openTradePositionSize;
          }
        }

        const newEquity = newBalance + unrealizedPnl;
        const marginLevel = newMargin > 0 ? (newEquity / newMargin) * 100 : 0;

        // Update portfolio
        const { error: updatePortfolioError } = await supabase
          .from('shadow_portfolios')
          .update({
            balance: Math.round(newBalance * 100) / 100,
            equity: Math.round(newEquity * 100) / 100,
            margin: Math.round(newMargin * 100) / 100,
            free_margin: Math.round(newFreeMargin * 100) / 100,
            margin_level: Math.round(marginLevel * 100) / 100,
            total_trades: newTotalTrades,
            winning_trades: newWinningTrades,
            losing_trades: newLosingTrades,
            win_rate: Math.round(newWinRate * 100) / 100,
            updated_at: new Date().toISOString()
          })
          .eq('id', portfolioId);

        if (updatePortfolioError) {
          console.error(`Error updating portfolio ${portfolioId}:`, updatePortfolioError);
        } else {
          console.log(`📊 Updated portfolio ${portfolioId.slice(0, 8)}: Balance $${newBalance.toFixed(2)}, Equity $${newEquity.toFixed(2)}, Win Rate ${newWinRate.toFixed(1)}%`);
        }

      } catch (portfolioError) {
        console.error(`Error updating portfolio ${portfolioId}:`, portfolioError);
      }
    }

    // Update portfolio equity for all active portfolios (for real-time display)
    await updatePortfolioEquities(supabase, currentPrice);

    // Log execution
    const executionTime = Date.now() - startTime;

    console.log(`🎉 Trade management completed: ${processedItems} trades closed in ${executionTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Managed ${openTrades.length} trades, closed ${processedItems}`,
        closedTrades: closedTrades.length,
        trades: closedTrades,
        currentPrice,
        executionTimeMs: executionTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ Error in manage-shadow-trades:', error);

    // Error logged to console

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message,
        executionTimeMs: executionTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// PHASE 3: Helper function to calculate profit in pips
function calculateProfitPips(trade: any, currentPrice: number): number {
  const entryPrice = parseFloat(trade.entry_price.toString());
  
  if (trade.trade_type === 'buy') {
    return (currentPrice - entryPrice) / 0.0001;
  } else {
    return (entryPrice - currentPrice) / 0.0001;
  }
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

async function updatePortfolioEquities(supabase: any, currentPrice: number) {
  try {
    // Get all active portfolios with open trades
    const { data: portfoliosWithTrades, error } = await supabase
      .from('shadow_portfolios')
      .select(`
        id, balance, margin,
        shadow_trades!inner (
          trade_type, entry_price, position_size, status
        )
      `)
      .eq('is_active', true)
      .eq('shadow_trades.status', 'open');

    if (error || !portfoliosWithTrades) return;

    // Group trades by portfolio
    const portfolioEquities = new Map();

    for (const portfolio of portfoliosWithTrades) {
      const portfolioId = portfolio.id;
      const balance = parseFloat(portfolio.balance.toString());
      const margin = parseFloat(portfolio.margin.toString());
      
      if (!portfolioEquities.has(portfolioId)) {
        portfolioEquities.set(portfolioId, {
          balance,
          margin,
          unrealizedPnl: 0
        });
      }

      const equity = portfolioEquities.get(portfolioId);
      
      // Calculate unrealized P&L for this trade
      const entryPrice = parseFloat(portfolio.shadow_trades.entry_price.toString());
      const positionSize = parseFloat(portfolio.shadow_trades.position_size.toString());
      
      const priceMove = portfolio.shadow_trades.trade_type === 'buy'
        ? currentPrice - entryPrice
        : entryPrice - currentPrice;
      
      equity.unrealizedPnl += (priceMove / entryPrice) * positionSize;
    }

    // Update equity for each portfolio
    for (const [portfolioId, equity] of portfolioEquities) {
      const newEquity = equity.balance + equity.unrealizedPnl;
      const marginLevel = equity.margin > 0 ? (newEquity / equity.margin) * 100 : 0;

      await supabase
        .from('shadow_portfolios')
        .update({
          equity: Math.round(newEquity * 100) / 100,
          margin_level: Math.round(marginLevel * 100) / 100,
          free_margin: Math.round((equity.balance - equity.margin) * 100) / 100,
          updated_at: new Date().toISOString()
        })
        .eq('id', portfolioId);
    }

  } catch (error) {
    console.error('Error updating portfolio equities:', error);
  }
}