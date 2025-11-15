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

    // **FIX #1: Get global trading account first**
    const globalAccountId = '00000000-0000-0000-0000-000000000001';
    
    const { data: globalAccount, error: accountError } = await supabase
      .from('global_trading_account')
      .select('*')
      .eq('id', globalAccountId)
      .single();

    if (accountError || !globalAccount) {
      console.error('❌ Error fetching global account:', accountError);
      throw new Error(`Error fetching global account: ${accountError?.message || 'Not found'}`);
    }

    console.log(`💼 Global Account: Balance=$${globalAccount.balance}, Equity=$${globalAccount.equity}`);

    // Get all open trades for global account (portfolio_id is NULL for global trades)
    const { data: openTrades, error: tradesError } = await supabase
      .from('shadow_trades')
      .select('*')
      .is('portfolio_id', null)
      .eq('status', 'open');

    if (tradesError) {
      console.error('❌ Error fetching open trades:', tradesError);
      throw new Error(`Error fetching open trades: ${tradesError.message}`);
    }
    
    const validTrades = openTrades || [];
    
    console.log(`📊 Found ${validTrades.length} open trades for global account`);

    if (!validTrades || validTrades.length === 0) {
      console.log('📊 No open trades found to manage');
      return new Response(
        JSON.stringify({ success: true, message: 'No open trades to manage' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📈 Managing ${validTrades.length} open trades`);

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

    // **PHASE 3: ML EXIT MODEL INTEGRATION**
    // Fetch active ML model for exit optimization
    const { data: activeModel } = await supabase
      .from('ml_exit_models')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeModel) {
      console.log(`🤖 ML Model ${activeModel.model_version} active - Win Rate: ${(activeModel.accuracy_score * 100).toFixed(2)}%`);
    } else {
      console.log(`ℹ️ No active ML model found - train one using /train-exit-model`);
    }

    // **PHASE 4: INTELLIGENT EXIT INTEGRATION**
    // Check each trade for exit conditions using holistic intelligence
    for (const trade of validTrades) {
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

        // **SAFETY RULE 1: Move SL to break-even at +10 pips**
        const profitPips = calculateProfitPips(trade, currentPrice);
        
        if (!shouldClose && profitPips >= 10) {
          const isBreakEvenNeeded = trade.trade_type === 'buy' 
            ? stopLoss < entryPrice 
            : stopLoss > entryPrice;
            
          if (isBreakEvenNeeded) {
            console.log(`🛡️ Moving SL to break-even for trade ${trade.id.slice(0, 8)} (+${profitPips.toFixed(1)} pips)`);
            
            await supabase
              .from('shadow_trades')
              .update({
                stop_loss: entryPrice,
                break_even_triggered: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', trade.id);
            
            // Update local variable
            trade.stop_loss = entryPrice;
            
            // Continue to next trade
            processedItems++;
            continue;
          }
        }
        
        // **SAFETY RULE 2: Activate trailing stop at +20 pips**
        if (!shouldClose && profitPips >= 20 && (!trade.trailing_stop_distance || trade.trailing_stop_distance === 0)) {
          const trailingDistance = 15 * 0.0001; // 15 pips
          let newStopLoss;
          
          if (trade.trade_type === 'buy') {
            newStopLoss = currentPrice - trailingDistance;
          } else {
            newStopLoss = currentPrice + trailingDistance;
          }
          
          console.log(`🎯 Activating trailing stop for trade ${trade.id.slice(0, 8)} at +${profitPips.toFixed(1)} pips`);
          
          await supabase
            .from('shadow_trades')
            .update({
              trailing_stop_distance: trailingDistance,
              stop_loss: newStopLoss,
              trailing_stop_triggered: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', trade.id);
          
          // Update local variables
          trade.trailing_stop_distance = trailingDistance;
          trade.stop_loss = newStopLoss;
          
          // Continue to next trade
          processedItems++;
          continue;
        }
        
        // **PHASE 2: PARTIAL CLOSE AT 75 PIPS (Secondary TP)**
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

        // **ML-BASED EXIT OPTIMIZATION (Priority 1.75 - After partial close, before trailing)**
        if (!shouldClose && activeModel) {
          const entryTime = new Date(trade.entry_time).getTime();
          const currentTime = Date.now();
          const holdingMinutes = (currentTime - entryTime) / (1000 * 60);
          const currentProfitPips = calculateProfitPips(trade, currentPrice);
          
          const modelParams = activeModel.model_parameters as any;
          
          // Extract ML features
          const features = {
            profitPips: currentProfitPips,
            slDistance: Math.abs(parseFloat(trade.entry_price.toString()) - parseFloat(trade.stop_loss.toString())) * 10000,
            tpDistance: Math.abs(parseFloat(trade.take_profit.toString()) - parseFloat(trade.entry_price.toString())) * 10000,
            confidenceScore: trade.confidence_score || 0.5,
            lotSize: parseFloat(trade.lot_size.toString()),
            holdingMinutes,
            tradeType: trade.trade_type
          };

          // Calculate ML-based exit prediction
          const optimalExitThreshold = modelParams.optimalExitThreshold || 30;
          const maxHoldingTime = modelParams.maxHoldingTime || 240; // 4 hours default
          
          // Confidence calculation based on learned patterns
          let mlConfidence = 0.5;
          
          // Profit meets optimal threshold from training
          if (currentProfitPips >= optimalExitThreshold) {
            mlConfidence += 0.3;
          }
          
          // Holding time approaching optimal exit time
          if (holdingMinutes >= maxHoldingTime * 0.7) {
            mlConfidence += 0.2;
          }

          // Store ML prediction
          const { error: predError } = await supabase.from('ml_exit_predictions').insert({
            trade_id: trade.id,
            model_version: activeModel.model_version,
            predicted_exit_price: currentPrice,
            predicted_profit_pips: currentProfitPips,
            confidence_score: mlConfidence,
            feature_values: features
          });

          if (predError) {
            console.error(`❌ Failed to store ML prediction:`, predError);
          }

          // ML recommends exit if confidence > 0.7 and profit meets threshold
          if (mlConfidence >= 0.7 && currentProfitPips >= optimalExitThreshold) {
            console.log(`🤖 ML EXIT SIGNAL - Trade ${trade.id.slice(0, 8)}:`);
            console.log(`   Profit: ${currentProfitPips.toFixed(2)} pips (threshold: ${optimalExitThreshold.toFixed(2)})`);
            console.log(`   Confidence: ${(mlConfidence * 100).toFixed(0)}%`);
            console.log(`   Holding: ${holdingMinutes.toFixed(0)}min`);
            
            shouldClose = true;
            exitReason = 'ml_optimized_exit';
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

        // **PHASE 2 FIX: INTELLIGENT EXIT SYSTEM using Supabase client**
        if (!shouldClose) {
          console.log(`🧠 Checking intelligence exit for trade ${trade.id.slice(0, 8)}...`);
          try {
            const { data: exitData, error: exitError } = await supabase.functions.invoke(
              'intelligent-exit-engine',
              {
                body: {
                  tradeId: trade.id,
                  currentPrice
                }
              }
            );
            
            if (exitError) {
              console.error(`❌ Intelligence engine error:`, exitError);
              throw exitError;
            }

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

            // Store in exit_intelligence for historical tracking
            const holdingTimeMinutes = (Date.now() - new Date(trade.entry_time).getTime()) / 60000;
            await supabase
              .from('exit_intelligence')
              .insert({
                trade_id: trade.id,
                current_price: currentPrice,
                holding_time_minutes: holdingTimeMinutes,
                overall_score: exitIntelligence.overallExitScore,
                recommendation: exitIntelligence.recommendation,
                factors: exitIntelligence.factors,
                reasoning: exitIntelligence.reasoning
              });
            
            console.log(`📊 Exit intelligence stored in historical tracking`);


            // ✅ FIX #2: Loosened intelligence exit conditions
            if (exitIntelligence.recommendation === 'FORCE_EXIT') {
              const profitPips = calculateProfitPips(trade, currentPrice);
              const holdingTimeMinutes = (Date.now() - new Date(trade.entry_time).getTime()) / 60000;
              
              // Three exit scenarios:
              // 1. Profit >= 5 pips after 10 min (original - secure profit)
              const shouldExitProfit = profitPips >= 5 && holdingTimeMinutes >= 10;
              
              // 2. Loss >= -15 pips after 30 min (NEW - cut losses early)
              const shouldExitLoss = profitPips <= -15 && holdingTimeMinutes >= 30;
              
              // 3. Exit score < 20 after 60 min (NEW - deteriorating conditions)
              const shouldExitDeteriorating = exitIntelligence.overallExitScore < 20 && holdingTimeMinutes >= 60;
              
              console.log(`⚠️ FORCE_EXIT recommendation - Checking conditions:`);
              console.log(`   Profit: ${profitPips.toFixed(1)} pips | Hold: ${holdingTimeMinutes.toFixed(0)}min | Score: ${exitIntelligence.overallExitScore.toFixed(1)}`);
              console.log(`   Exit Profit? ${shouldExitProfit} | Exit Loss? ${shouldExitLoss} | Exit Deteriorating? ${shouldExitDeteriorating}`);
              
              if (shouldExitProfit || shouldExitLoss || shouldExitDeteriorating) {
                shouldClose = true;
                exitReason = 'intelligence';
                
                const exitType = shouldExitProfit ? 'PROFIT SECURE' : 
                                shouldExitLoss ? 'LOSS CUT' : 
                                'DETERIORATING';
                
                console.log(`🧠 ✅ Intelligence ${exitType} EXIT APPROVED for ${trade.id.slice(0, 8)}`);
                console.log(`   Profit: ${profitPips.toFixed(1)} pips | Hold: ${holdingTimeMinutes.toFixed(0)}min`);
                console.log(`   Reasoning: ${exitIntelligence.reasoning}`);
                console.log(`   Score: ${exitIntelligence.overallExitScore.toFixed(2)}/100`);
                
                // Log to diagnostics
                await supabase.from('trading_diagnostics').insert({
                  diagnostic_type: 'intelligence_exit_triggered',
                  severity_level: shouldExitLoss ? 'warning' : 'info',
                  metadata: {
                    trade_id: trade.id.slice(0, 8),
                    exit_type: exitType,
                    profit_pips: profitPips,
                    holding_minutes: holdingTimeMinutes,
                    exit_score: exitIntelligence.overallExitScore,
                    recommendation: exitIntelligence.recommendation
                  }
                });
              } else {
                console.log(`⏳ Intelligence wants exit but conditions not met yet`);
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

        // **PHASE 3 FIX: Time-based exit (12 hours) with debug logging**
        if (!shouldClose) {
          const entryTime = new Date(trade.entry_time).getTime();
          const hoursOpen = (Date.now() - entryTime) / (1000 * 60 * 60);
          
          console.log(`⏰ Time check for ${trade.id.slice(0,8)}: ${hoursOpen.toFixed(1)}h open (threshold: 12h)`);
          
          if (hoursOpen >= 12) {
            console.log(`🔴 FORCING TIME-BASED EXIT for trade ${trade.id.slice(0,8)} - Open for ${hoursOpen.toFixed(1)} hours`);
            shouldClose = true;
            exitReason = 'time';
          }
        }

        if (shouldClose) {
          // **CRITICAL FIX: Use close_shadow_trade RPC function instead of direct UPDATE**
          console.log(`🔒 Closing trade ${trade.id.slice(0, 8)} via close_shadow_trade RPC...`);
          
          try {
            const { data: closeResult, error: closeError } = await supabase.rpc('close_shadow_trade', {
              p_trade_id: trade.id,
              p_close_price: currentPrice,
              p_close_lot_size: null, // Close full position
              p_close_reason: exitReason
            });

            if (closeError) {
              console.error(`❌ Error closing trade ${trade.id.slice(0, 8)} via RPC:`, closeError);
              continue;
            }

            console.log(`✅ Trade ${trade.id.slice(0, 8)} closed via RPC - PnL: $${closeResult.profit_amount}, Commission: $${closeResult.commission}`);
          } catch (rpcError) {
            console.error(`❌ RPC call failed for trade ${trade.id.slice(0, 8)}:`, rpcError);
            continue;
          }

          // **NOTE: close_shadow_trade RPC handles ALL of this automatically:**
          // - Updates shadow_trades with exit_price, exit_time, status='closed'
          // - Calculates pips, commission, and PnL correctly
          // - Updates global_trading_account balance and stats
          // - Inserts into trade_history
          // - Releases margin
          // 
          // NO NEED for manual updates here!

          // Re-fetch the closed trade to get updated values
          const { data: closedTrade } = await supabase
            .from('shadow_trades')
            .select('*')
            .eq('id', trade.id)
            .single();

          if (closedTrade) {
            closedTrades.push({
              id: closedTrade.id,
              symbol: closedTrade.symbol,
              type: closedTrade.trade_type,
              entryPrice: parseFloat(closedTrade.entry_price.toString()),
              exitPrice: parseFloat(closedTrade.exit_price.toString()),
              pnl: parseFloat(closedTrade.profit_amount?.toString() || '0'),
              exitReason: closedTrade.exit_reason || exitReason,
              holdingTimeMinutes: closedTrade.holding_time_minutes || 0
            });

            console.log(`📊 Trade closed - Pips: ${closedTrade.profit_pips}, PnL: $${closedTrade.profit_amount}, Commission: $${closedTrade.commission}`);
          }
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

    // === PHASE 1: UPDATE GLOBAL ACCOUNT BALANCE DIRECTLY ===
    if (closedTrades.length > 0) {
      try {
        // Get update for global account
        const update = portfolioUpdates.get(globalAccountId);
        
        if (update) {
          const newBalance = parseFloat(globalAccount.balance.toString()) + update.balanceChange;
          
          // Calculate floating P&L from remaining open trades
          const { data: remainingOpenTrades } = await supabase
            .from('shadow_trades')
            .select('unrealized_pnl')
            .eq('portfolio_id', globalAccountId)
            .eq('status', 'open');
          
          const floatingPnl = remainingOpenTrades?.reduce((sum, t) => 
            sum + parseFloat(t.unrealized_pnl?.toString() || '0'), 0) || 0;
          
          const newEquity = newBalance + floatingPnl;
          
          // Update global account with new balance and equity
          const { error: updateError } = await supabase
            .from('global_trading_account')
            .update({
              balance: newBalance,
              equity: newEquity,
              floating_pnl: floatingPnl,
              updated_at: new Date().toISOString()
            })
            .eq('id', globalAccountId);
          
          if (updateError) {
            console.error('Error updating global account:', updateError);
          } else {
            console.log(`💰 Global account updated: Balance $${newBalance.toFixed(2)} (${update.balanceChange >= 0 ? '+' : ''}$${update.balanceChange.toFixed(2)}), Equity $${newEquity.toFixed(2)}`);
            
            // === PHASE 3: CALCULATE PERFORMANCE METRICS ===
            const { error: metricsError } = await supabase.rpc('calculate_global_performance_metrics');
            
            if (metricsError) {
              console.error('Error calculating performance metrics:', metricsError);
            } else {
              console.log('📊 Performance metrics recalculated');
            }
          }
        }
      } catch (globalAccountError) {
        console.error('Error updating global account:', globalAccountError);
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