// MetaTrader 4-like Trade Management Edge Function
// Handles real-time P&L calculations, trade closing, and portfolio updates

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TradeCloseRequest {
  tradeId: string;
  closePrice?: number;
  closeLotSize?: number;
  closeReason?: string;
  currentPrice: number;
}

interface PnLUpdateRequest {
  tradeIds: string[];
  currentPrice: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, ...data } = await req.json()
    console.log(`🎯 Trade management action: ${action}`, data)

    switch (action) {
      case 'close_trade':
        return await closeTrade(supabase, data as TradeCloseRequest)
      
      case 'update_pnl':
        return await updateRealTimePnL(supabase, data as PnLUpdateRequest)
      
      case 'get_trade_analytics':
        return await getTradeAnalytics(supabase, data.portfolioId)
      
      case 'modify_trade':
        return await modifyTrade(supabase, data)
      
      default:
        throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('Trade management error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function closeTrade(supabase: any, request: TradeCloseRequest) {
  const { tradeId, closePrice, closeLotSize, closeReason = 'manual', currentPrice } = request
  
  console.log(`💰 Closing trade ${tradeId} at price ${closePrice || currentPrice}`)
  
  try {
    // Get current market price if not provided
    const finalClosePrice = closePrice || currentPrice
    
    // Use the database function to close the trade
    const { data: result, error } = await supabase
      .rpc('close_shadow_trade', {
        p_trade_id: tradeId,
        p_close_price: finalClosePrice,
        p_close_lot_size: closeLotSize || null,
        p_close_reason: closeReason
      })

    if (error) {
      throw new Error(`Failed to close trade: ${error.message}`)
    }

    // Calculate slippage if applicable
    let slippage = 0
    if (closePrice && closePrice !== currentPrice) {
      slippage = Math.abs(closePrice - currentPrice) * 10000 // in pips
    }

    // Update trade with slippage info
    if (slippage > 0) {
      await supabase
        .from('shadow_trades')
        .update({
          slippage_pips: slippage,
          current_price: currentPrice
        })
        .eq('id', tradeId)
    }

    // Recalculate portfolio metrics
    await updatePortfolioMetrics(supabase, result.portfolio_id)

    console.log(`✅ Trade closed successfully: ${JSON.stringify(result)}`)
    
    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        slippage: slippage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error closing trade:', error)
    throw error
  }
}

async function updateRealTimePnL(supabase: any, request: PnLUpdateRequest) {
  const { tradeIds, currentPrice } = request
  
  try {
    const pnlUpdates = []
    
    for (const tradeId of tradeIds) {
      // Calculate real-time P&L using database function
      const { data: pnlData, error } = await supabase
        .rpc('calculate_trade_pnl', {
          p_trade_id: tradeId,
          p_current_price: currentPrice
        })

      if (error) {
        console.error(`Error calculating P&L for trade ${tradeId}:`, error)
        continue
      }

      if (pnlData && pnlData.length > 0) {
        const pnlResult = pnlData[0]
        
        // Update trade with current P&L
        await supabase
          .from('shadow_trades')
          .update({
            current_price: currentPrice,
            unrealized_pnl: pnlResult.unrealized_pnl,
            profit_pips: pnlResult.profit_pips,
            updated_at: new Date().toISOString()
          })
          .eq('id', tradeId)

        pnlUpdates.push({
          tradeId,
          unrealizedPnl: pnlResult.unrealized_pnl,
          profitPips: pnlResult.profit_pips
        })
      }
    }

    // Update portfolio floating P&L
    if (pnlUpdates.length > 0) {
      const totalFloatingPnL = pnlUpdates.reduce((sum, update) => sum + update.unrealizedPnl, 0)
      
      // Get the portfolio ID from the first trade
      const { data: trade } = await supabase
        .from('shadow_trades')
        .select('portfolio_id')
        .eq('id', tradeIds[0])
        .single()

      if (trade) {
        // Get current balance first, then calculate new equity
        const { data: currentPortfolio } = await supabase
          .from('shadow_portfolios')
          .select('balance')
          .eq('id', trade.portfolio_id)
          .single()

        if (currentPortfolio) {
          await supabase
            .from('shadow_portfolios')
            .update({
              floating_pnl: totalFloatingPnL,
              equity: currentPortfolio.balance + totalFloatingPnL,
              updated_at: new Date().toISOString()
            })
            .eq('id', trade.portfolio_id)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          updates: pnlUpdates,
          timestamp: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error updating real-time P&L:', error)
    throw error
  }
}

async function getTradeAnalytics(supabase: any, portfolioId: string) {
  try {
    // Get comprehensive trade history and analytics
    const { data: tradeHistory, error: historyError } = await supabase
      .from('trade_history')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('execution_time', { ascending: false })
      .limit(100)

    if (historyError) throw historyError

    const { data: openTrades, error: openError } = await supabase
      .from('shadow_trades')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .eq('status', 'open')

    if (openError) throw openError

    const { data: portfolio, error: portfolioError } = await supabase
      .from('shadow_portfolios')
      .select('*')
      .eq('id', portfolioId)
      .single()

    if (portfolioError) throw portfolioError

    // Calculate advanced analytics
    const analytics = calculateAdvancedAnalytics(tradeHistory, openTrades, portfolio)

    return new Response(
      JSON.stringify({
        success: true,
        data: analytics
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error getting trade analytics:', error)
    throw error
  }
}

async function modifyTrade(supabase: any, data: any) {
  const { tradeId, stopLoss, takeProfit, lotSize } = data
  
  try {
    const updateData: any = {}
    
    if (stopLoss !== undefined) updateData.stop_loss = stopLoss
    if (takeProfit !== undefined) updateData.take_profit = takeProfit
    if (lotSize !== undefined) {
      updateData.lot_size = lotSize
      updateData.remaining_lot_size = lotSize
    }
    
    updateData.updated_at = new Date().toISOString()

    const { data: result, error } = await supabase
      .from('shadow_trades')
      .update(updateData)
      .eq('id', tradeId)
      .select()
      .single()

    if (error) throw error

    // Log the modification in trade history
    const { data: trade } = await supabase
      .from('shadow_trades')
      .select('portfolio_id, symbol, trade_type, entry_price')
      .eq('id', tradeId)
      .single()

    if (trade) {
      await supabase
        .from('trade_history')
        .insert({
          portfolio_id: trade.portfolio_id,
          original_trade_id: tradeId,
          action_type: 'modify',
          symbol: trade.symbol,
          trade_type: trade.trade_type,
          lot_size: lotSize || 0,
          execution_price: trade.entry_price,
          stop_loss: stopLoss,
          take_profit: takeProfit,
          balance_before: 0,
          balance_after: 0,
          equity_before: 0,
          equity_after: 0,
          execution_time: new Date().toISOString()
        })
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error modifying trade:', error)
    throw error
  }
}

async function updatePortfolioMetrics(supabase: any, portfolioId: string) {
  try {
    // Get all closed trades for this portfolio
    const { data: closedTrades, error } = await supabase
      .from('shadow_trades')
      .select('pnl, profit_pips, commission, swap, entry_time, exit_time')
      .eq('portfolio_id', portfolioId)
      .eq('status', 'closed')

    if (error || !closedTrades) return

    // Calculate comprehensive metrics
    const totalTrades = closedTrades.length
    const winningTrades = closedTrades.filter((t: any) => t.pnl > 0)
    const losingTrades = closedTrades.filter((t: any) => t.pnl <= 0)
    
    const winRate = totalTrades > 0 ? winningTrades.length / totalTrades : 0
    const averageWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum: number, t: any) => sum + t.pnl, 0) / winningTrades.length 
      : 0
    const averageLoss = losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum: number, t: any) => sum + t.pnl, 0) / losingTrades.length)
      : 0

    const profitFactor = averageLoss > 0 ? averageWin / averageLoss : 0
    const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map((t: any) => t.pnl)) : 0
    const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map((t: any) => t.pnl)) : 0

    const totalCommission = closedTrades.reduce((sum: number, t: any) => sum + (t.commission || 0), 0)
    const totalSwap = closedTrades.reduce((sum: number, t: any) => sum + (t.swap || 0), 0)

    // Calculate consecutive wins/losses
    let consecutiveWins = 0
    let consecutiveLosses = 0
    let currentStreak = 0
    let streakType = null

    for (const trade of closedTrades.reverse()) {
      const isWin = trade.pnl > 0
      
      if (streakType === null) {
        streakType = isWin ? 'win' : 'loss'
        currentStreak = 1
      } else if ((streakType === 'win' && isWin) || (streakType === 'loss' && !isWin)) {
        currentStreak++
      } else {
        if (streakType === 'win') {
          consecutiveWins = Math.max(consecutiveWins, currentStreak)
        } else {
          consecutiveLosses = Math.max(consecutiveLosses, currentStreak)
        }
        streakType = isWin ? 'win' : 'loss'
        currentStreak = 1
      }
    }

    // Update final streak
    if (streakType === 'win') {
      consecutiveWins = Math.max(consecutiveWins, currentStreak)
    } else {
      consecutiveLosses = Math.max(consecutiveLosses, currentStreak)
    }

    // Update portfolio with calculated metrics
    await supabase
      .from('shadow_portfolios')
      .update({
        total_trades: totalTrades,
        winning_trades: winningTrades.length,
        losing_trades: losingTrades.length,
        win_rate: winRate,
        average_win: averageWin,
        average_loss: averageLoss,
        profit_factor: profitFactor,
        largest_win: largestWin,
        largest_loss: largestLoss,
        consecutive_wins: consecutiveWins,
        consecutive_losses: consecutiveLosses,
        total_commission: totalCommission,
        total_swap: totalSwap,
        updated_at: new Date().toISOString()
      })
      .eq('id', portfolioId)

  } catch (error) {
    console.error('Error updating portfolio metrics:', error)
  }
}

function calculateAdvancedAnalytics(tradeHistory: any[], openTrades: any[], portfolio: any) {
  const closedTrades = tradeHistory.filter(t => t.action_type === 'close')
  
  // Risk-reward analysis
  const riskRewardRatios = closedTrades
    .map(t => t.profit / Math.abs(t.profit < 0 ? t.profit : 1))
    .filter(r => r !== Infinity && !isNaN(r))
  
  const avgRiskReward = riskRewardRatios.length > 0 
    ? riskRewardRatios.reduce((sum, r) => sum + r, 0) / riskRewardRatios.length 
    : 0

  // Time-based analysis
  const tradeDurations = closedTrades
    .map(t => {
      const entry = new Date(t.execution_time)
      const exit = new Date(t.execution_time)
      return (exit.getTime() - entry.getTime()) / (1000 * 60) // minutes
    })
    .filter(d => d > 0)

  const avgTradeDuration = tradeDurations.length > 0
    ? tradeDurations.reduce((sum, d) => sum + d, 0) / tradeDurations.length
    : 0

  // Performance by time of day
  const hourlyPerformance = Array(24).fill(0).map(() => ({ trades: 0, profit: 0 }))
  closedTrades.forEach(t => {
    const hour = new Date(t.execution_time).getHours()
    hourlyPerformance[hour].trades++
    hourlyPerformance[hour].profit += t.profit
  })

  // Current drawdown calculation
  const currentEquity = portfolio.equity
  const peakEquity = portfolio.peak_balance || portfolio.balance
  const currentDrawdown = peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0

  return {
    portfolio,
    openTrades,
    closedTrades: closedTrades.slice(0, 50), // Last 50 trades
    analytics: {
      totalTrades: closedTrades.length,
      winRate: portfolio.win_rate * 100,
      profitFactor: portfolio.profit_factor,
      averageRiskReward: avgRiskReward,
      averageTradeDuration: avgTradeDuration,
      currentDrawdown: currentDrawdown,
      largestWin: portfolio.largest_win,
      largestLoss: portfolio.largest_loss,
      consecutiveWins: portfolio.consecutive_wins,
      consecutiveLosses: portfolio.consecutive_losses,
      totalCommission: portfolio.total_commission,
      totalSwap: portfolio.total_swap,
      hourlyPerformance,
      monthlyPnL: calculateMonthlyPnL(closedTrades),
      tradingDays: calculateTradingDays(closedTrades)
    }
  }
}

function calculateMonthlyPnL(trades: any[]) {
  const monthlyData: { [key: string]: number } = {}
  
  trades.forEach(trade => {
    const date = new Date(trade.execution_time)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = 0
    }
    monthlyData[monthKey] += trade.profit
  })

  return Object.entries(monthlyData)
    .map(([month, pnl]) => ({ month, pnl }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

function calculateTradingDays(trades: any[]) {
  const uniqueDays = new Set()
  
  trades.forEach(trade => {
    const date = new Date(trade.execution_time)
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    uniqueDays.add(dayKey)
  })

  return uniqueDays.size
}