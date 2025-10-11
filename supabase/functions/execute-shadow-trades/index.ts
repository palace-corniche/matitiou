import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Enhanced Edge Engine - integrated directly into edge function
interface EdgeComponents {
  baseEdge: number;
  executionCosts: number;
  slippageCosts: number;
  microstructureCosts: number;
  opportunityCosts: number;
  regimeAdjustment: number;
  volatilityAdjustment: number;
  liquidityAdjustment: number;
  timingPenalty: number;
  netEdge: number;
}

class EnhancedEdgeEngine {
  static calculateEnhancedEdge(
    winProbability: number,
    expectedReturn: number,
    expectedLoss: number,
    candles: any[],
    regime: string,
    currentPrice: number,
    positionSize: number
  ): EdgeComponents {
    // Base edge calculation
    const baseEdge = (winProbability * expectedReturn) - ((1 - winProbability) * Math.abs(expectedLoss));
    
    // Calculate various cost components
    const executionCosts = this.calculateExecutionCosts(positionSize);
    const slippageCosts = this.calculateSlippageCosts(candles, positionSize);
    const microstructureCosts = this.calculateMicrostructureCosts(candles);
    const opportunityCosts = this.calculateOpportunityCosts(regime);
    
    // Apply adjustments
    const regimeAdjustment = this.calculateRegimeAdjustment(baseEdge, regime);
    const volatilityAdjustment = this.calculateVolatilityAdjustment(candles);
    const liquidityAdjustment = this.calculateLiquidityAdjustment(candles, positionSize);
    const timingPenalty = this.calculateTimingPenalty(candles);
    
    // Calculate net edge
    const netEdge = baseEdge 
      - executionCosts 
      - slippageCosts 
      - microstructureCosts 
      - opportunityCosts
      + regimeAdjustment
      + volatilityAdjustment
      + liquidityAdjustment
      - timingPenalty;
    
    return {
      baseEdge,
      executionCosts,
      slippageCosts,
      microstructureCosts,
      opportunityCosts,
      regimeAdjustment,
      volatilityAdjustment,
      liquidityAdjustment,
      timingPenalty,
      netEdge
    };
  }
  
  private static calculateExecutionCosts(positionSize: number): number {
    const spread = 0.0001; // 1 pip for EUR/USD
    const commission = 0.00002; // $2 per 100k
    return (spread + commission) * (positionSize / 100000);
  }
  
  private static calculateSlippageCosts(candles: any[], positionSize: number): number {
    if (!candles.length) return 0;
    
    const avgVolume = candles.reduce((sum, c) => sum + (c.volume || 1000), 0) / candles.length;
    const currentVolume = candles[candles.length - 1]?.volume || avgVolume;
    
    const volumeRatio = currentVolume / avgVolume;
    const liquidityMultiplier = volumeRatio < 0.5 ? 2.0 : volumeRatio < 0.8 ? 1.5 : 1.0;
    
    const baseSlippage = 0.00005; // 0.5 pips base
    return baseSlippage * liquidityMultiplier * Math.min(positionSize / 500000, 2.0);
  }
  
  private static calculateMicrostructureCosts(candles: any[]): number {
    if (!candles.length) return 0;
    
    // Information asymmetry cost
    const priceChanges = candles.slice(-5).map((c, i, arr) => 
      i > 0 ? Math.abs(c.close - arr[i-1].close) / arr[i-1].close : 0
    ).filter(x => x > 0);
    
    const avgPriceChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    return avgPriceChange * 0.1; // 10% of average price volatility as info cost
  }
  
  private static calculateOpportunityCosts(regime: string): number {
    const regimeCosts = {
      'trending': 0.00002,
      'ranging': 0.00005,
      'shock': 0.0001,
      'news_driven': 0.00015
    };
    return regimeCosts[regime as keyof typeof regimeCosts] || 0.00003;
  }
  
  private static calculateRegimeAdjustment(baseEdge: number, regime: string): number {
    const regimeMultipliers = {
      'trending': 1.2,
      'ranging': 0.8,
      'shock': 0.6,
      'news_driven': 1.1
    };
    const multiplier = regimeMultipliers[regime as keyof typeof regimeMultipliers] || 1.0;
    return baseEdge * (multiplier - 1);
  }
  
  private static calculateVolatilityAdjustment(candles: any[]): number {
    if (!candles.length) return 0;
    
    const returns = candles.slice(-10).map((c, i, arr) => 
      i > 0 ? (c.close - arr[i-1].close) / arr[i-1].close : 0
    ).filter(x => x !== 0);
    
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length);
    const normalizedVol = volatility / 0.0001; // Normalize to typical FX volatility
    
    return normalizedVol > 2.0 ? -0.00005 : normalizedVol < 0.5 ? 0.00002 : 0;
  }
  
  private static calculateLiquidityAdjustment(candles: any[], positionSize: number): number {
    if (!candles.length) return 0;
    
    const avgVolume = candles.reduce((sum, c) => sum + (c.volume || 1000), 0) / candles.length;
    const sizeToVolumeRatio = positionSize / (avgVolume * 100);
    
    return sizeToVolumeRatio > 0.1 ? -0.00003 : sizeToVolumeRatio < 0.01 ? 0.00001 : 0;
  }
  
  private static calculateTimingPenalty(candles: any[]): number {
    if (!candles.length) return 0;
    
    const now = new Date();
    const marketClose = new Date(now);
    marketClose.setUTCHours(21, 0, 0, 0); // 21:00 UTC = NY close
    
    const hoursToClose = (marketClose.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Penalty for trading close to market close
    return hoursToClose < 1 ? 0.00002 : 0;
  }
}

// Continuous Learning Engine - integrated directly into edge function
interface LearningMetrics {
  accuracy: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  avgHoldingTime: number;
  signalCount: number;
  lastUpdate: string;
}

class ContinuousLearningEngine {
  private static outcomeHistory: Array<{
    signalId: string;
    outcome: 'win' | 'loss';
    pnl: number;
    holdingTime: number;
    signalStrength: number;
    confluenceScore: number;
    marketRegime: string;
    timestamp: string;
  }> = [];
  
  static addOutcome(
    signalId: string,
    outcome: 'win' | 'loss',
    pnl: number,
    holdingTime: number,
    signalStrength: number,
    confluenceScore: number,
    marketRegime: string
  ): void {
    this.outcomeHistory.push({
      signalId,
      outcome,
      pnl,
      holdingTime,
      signalStrength,
      confluenceScore,
      marketRegime,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 1000 outcomes for memory efficiency
    if (this.outcomeHistory.length > 1000) {
      this.outcomeHistory = this.outcomeHistory.slice(-1000);
    }
  }
  
  static calculatePerformanceMetrics(): LearningMetrics {
    if (this.outcomeHistory.length === 0) {
      return {
        accuracy: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        profitFactor: 0,
        avgHoldingTime: 0,
        signalCount: 0,
        lastUpdate: new Date().toISOString()
      };
    }
    
    const recentOutcomes = this.outcomeHistory.slice(-100); // Last 100 trades
    const wins = recentOutcomes.filter(o => o.outcome === 'win');
    const losses = recentOutcomes.filter(o => o.outcome === 'loss');
    
    const winRate = wins.length / recentOutcomes.length;
    const totalWinAmount = wins.reduce((sum, w) => sum + Math.abs(w.pnl), 0);
    const totalLossAmount = losses.reduce((sum, l) => sum + Math.abs(l.pnl), 0);
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : 0;
    
    // Calculate Sharpe ratio
    const returns = recentOutcomes.map(o => o.pnl);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const returnStdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;
    
    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = 0;
    let runningTotal = 0;
    
    for (const outcome of recentOutcomes) {
      runningTotal += outcome.pnl;
      if (runningTotal > peak) {
        peak = runningTotal;
      }
      const drawdown = (peak - runningTotal) / Math.max(peak, 1);
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    const avgHoldingTime = recentOutcomes.reduce((sum, o) => sum + o.holdingTime, 0) / recentOutcomes.length;
    
    return {
      accuracy: winRate,
      sharpeRatio,
      maxDrawdown: maxDrawdown * 100,
      winRate: winRate * 100,
      profitFactor,
      avgHoldingTime,
      signalCount: recentOutcomes.length,
      lastUpdate: new Date().toISOString()
    };
  }
  
  static getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const metrics = this.calculatePerformanceMetrics();
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (metrics.winRate < 40) {
      issues.push('Low win rate detected');
      recommendations.push('Review signal generation thresholds');
      status = 'warning';
    }
    
    if (metrics.sharpeRatio < 0.5) {
      issues.push('Poor risk-adjusted returns');
      recommendations.push('Optimize position sizing and risk management');
      status = 'warning';
    }
    
    if (metrics.maxDrawdown > 15) {
      issues.push('High drawdown detected');
      recommendations.push('Reduce position sizes or tighten stop losses');
      status = 'critical';
    }
    
    if (metrics.signalCount < 10) {
      issues.push('Insufficient signal history for reliable analysis');
      recommendations.push('Continue trading to build performance history');
    }
    
    return { status, issues, recommendations };
  }
}

// Enhanced position reconciliation
async function reconcilePortfolioState(supabase: any, portfolioId: string): Promise<boolean> {
  try {
    // Get actual open trades
    const { data: openTrades } = await supabase
      .from('shadow_trades')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .eq('status', 'open');

    const actualOpenPositions = openTrades?.length || 0;
    
    // Get portfolio state
    const { data: portfolio } = await supabase
      .from('shadow_portfolios')
      .select('*')
      .eq('id', portfolioId)
      .single();

    if (!portfolio) return false;

    // Calculate actual margin
    const actualMargin = openTrades?.reduce((total: number, trade: any) => {
      return total + (trade.margin_required || (parseFloat(trade.position_size.toString()) * 0.01));
    }, 0) || 0;

    const reportedMargin = parseFloat(portfolio.margin.toString());

    // Fix ghost positions
    if (actualOpenPositions === 0 && reportedMargin > 0) {
      console.log(`👻 Clearing ghost positions for portfolio ${portfolioId.slice(0, 8)}`);
      
      await supabase
        .from('shadow_portfolios')
        .update({
          margin: 0,
          free_margin: portfolio.balance,
          margin_level: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', portfolioId);
      
      return true;
    }

    // Fix margin inconsistencies
    if (Math.abs(actualMargin - reportedMargin) > 0.01) {
      const newFreeMargin = parseFloat(portfolio.balance.toString()) - actualMargin;
      const newMarginLevel = actualMargin > 0 ? (parseFloat(portfolio.equity.toString()) / actualMargin) * 100 : 0;

      await supabase
        .from('shadow_portfolios')
        .update({
          margin: actualMargin,
          free_margin: Math.max(0, newFreeMargin),
          margin_level: newMarginLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', portfolioId);
      
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error reconciling portfolio ${portfolioId}:`, error);
    return false;
  }
}

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

    // Get all active portfolios (removed is_active filter as column doesn't exist)
    console.log('🔍 Fetching active portfolios...');
    const { data: portfolios, error: portfoliosError } = await supabase
      .from('shadow_portfolios')
      .select('*')
      .eq('auto_trading_enabled', true);

    if (portfoliosError) {
      console.error('❌ Error fetching portfolios:', portfoliosError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error fetching portfolios', details: portfoliosError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!portfolios?.length) {
      console.log('⚠️ No active portfolios found for trading');
      console.log('💡 Checking all portfolios...');
      
      // Check if any portfolios exist at all
      const { data: allPortfolios } = await supabase
        .from('shadow_portfolios')
        .select('id, auto_trading_enabled, portfolio_name');
      
      console.log(`📊 Total portfolios in database: ${allPortfolios?.length || 0}`);
      allPortfolios?.forEach(p => {
        console.log(`  - ${p.portfolio_name} (${p.id.slice(0, 8)}): auto_trading=${p.auto_trading_enabled}`);
      });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active portfolios found', 
          totalPortfolios: allPortfolios?.length || 0,
          portfolios: allPortfolios 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`💼 Found ${portfolios.length} active portfolios`);

    // **FIX 7: Query master_signals instead of trading_signals**
    console.log('🎯 Fetching qualifying signals from master_signals...');
    let signalsQuery = supabase
      .from('master_signals')
      .select('*, id as signal_id, symbol as pair, signal_type, recommended_entry as entry_price, recommended_stop_loss as stop_loss, recommended_take_profit as take_profit')
      .eq('status', 'pending')
      .gte('confluence_score', 12) // Lower threshold to allow more signals
      .in('signal_type', ['buy', 'sell'])
      .order('created_at', { ascending: false });

    if (signal_id) {
      signalsQuery = signalsQuery.eq('id', signal_id);
    } else {
      // Only get signals from last 60 minutes
      const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      signalsQuery = signalsQuery.gte('created_at', sixtyMinutesAgo);
    }

    const { data: signals, error: signalsError } = await signalsQuery.limit(5);

    if (signalsError) {
      console.error('❌ Error fetching signals:', signalsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error fetching signals', details: signalsError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!signals?.length) {
      console.log('⚠️ No qualifying signals found for execution');
      
      // Check what signals exist in master_signals
      const { data: allSignals } = await supabase
        .from('master_signals')
        .select('confluence_score, signal_type, status, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);
      
      console.log(`📊 Recent pending master signals: ${allSignals?.length || 0}`);
      allSignals?.forEach(s => {
        console.log(`  - Score: ${s.confluence_score}, Type: ${s.signal_type}, Age: ${Math.round((Date.now() - new Date(s.created_at).getTime()) / 60000)}min`);
      });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No qualifying signals found', 
          recentSignals: allSignals?.length || 0,
          signals: allSignals 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎯 Found ${signals.length} qualifying signals to execute`);

    const executedTrades = [];

    // Execute trades for each qualifying signal and portfolio
    for (const signal of signals) {
      // **PHASE 5: CONFLUENCE VALIDATION BEFORE EXECUTION**
      // Check market conditions using should_trade_now() function
      console.log(`🔍 Validating trading conditions for ${signal.pair}...`);
      const { data: tradingConditions, error: conditionsError } = await supabase
        .rpc('should_trade_now', { 
          p_symbol: signal.pair,
          p_min_quality_score: 50 
        });
      
      if (conditionsError) {
        console.error(`❌ Error checking trading conditions:`, conditionsError);
      } else if (tradingConditions && !tradingConditions.allowed) {
        console.log(`🚫 Trading blocked for ${signal.pair}: ${tradingConditions.reason}`);
        console.log(`   Hour: ${tradingConditions.current_hour}, Volatility: ${tradingConditions.volatility_percent?.toFixed(3)}%`);
        continue; // Skip this signal
      }
      
      // Additional validation: Confluence score >= 12
      if (signal.confluence_score < 12) {
        console.log(`🚫 Signal ${signal.signal_id.slice(0, 8)} confluence too low: ${signal.confluence_score} < 12`);
        continue;
      }
      
      // Additional validation: Quality score >= 50 (if available)
      if (signal.signal_quality_score && signal.signal_quality_score < 50) {
        console.log(`🚫 Signal ${signal.signal_id.slice(0, 8)} quality too low: ${signal.signal_quality_score} < 50`);
        continue;
      }
      
      console.log(`✅ Trading conditions validated for ${signal.pair}:`);
      console.log(`   Confluence: ${signal.confluence_score}, Quality: ${signal.signal_quality_score || 'N/A'}`);
      console.log(`   Volatility: ${tradingConditions?.volatility_percent?.toFixed(3)}%`);
      
      for (const portfolio of portfolios) {
        try {
          // Reconcile portfolio state first
          await reconcilePortfolioState(supabase, portfolio.id);
          
          // Check if portfolio can accept new trades
          const { data: openTrades } = await supabase
            .from('shadow_trades')
            .select('id, margin_required, position_size, entry_price, trade_type, symbol')
            .eq('portfolio_id', portfolio.id)
            .eq('status', 'open');

          const actualOpenPositions = openTrades?.length || 0;

          if (actualOpenPositions >= portfolio.max_open_positions) {
            console.log(`⏭️ Portfolio ${portfolio.id.slice(0, 8)} has max open positions (${actualOpenPositions}/${portfolio.max_open_positions})`);
            continue;
          }

          // CRITICAL FIX: Check for duplicate entry price trades (within 2 pips tolerance)
          const pipTolerance = 0.0002; // 2 pips for EUR/USD
          const duplicateTrade = openTrades?.find(trade => 
            trade.symbol === signal.pair &&
            trade.trade_type === signal.signal_type &&
            Math.abs(parseFloat(trade.entry_price.toString()) - signal.entry_price) <= pipTolerance
          );

          if (duplicateTrade) {
            console.log(`🚫 Duplicate trade detected for ${signal.pair} ${signal.signal_type} at ${signal.entry_price} - skipping`);
            continue;
          }

          // **PHASE 2 OPTIMIZATION: Time-based filter (avoid Asian session, prefer London/NY overlap)**
          const currentHour = new Date().getUTCHours();
          const isAsianSession = currentHour >= 22 || currentHour < 8; // 22:00-08:00 UTC
          const isLondonNYOverlap = currentHour >= 12 && currentHour <= 16; // 12:00-16:00 UTC (London/NY overlap)
          
          if (isAsianSession) {
            console.log(`🌙 Asian session detected (${currentHour}:00 UTC) - skipping low-liquidity period`);
            continue;
          }
          
          if (isLondonNYOverlap) {
            console.log(`🌟 London/NY overlap detected (${currentHour}:00 UTC) - optimal trading window`);
          }

          // **PHASE 2 OPTIMIZATION: Volume confirmation (require 1.5x avg volume)**
          const { data: recentVolumes } = await supabase
            .from('market_data_feed')
            .select('volume')
            .eq('symbol', signal.pair)
            .not('volume', 'is', null)
            .order('timestamp', { ascending: false })
            .limit(20);
          
          if (recentVolumes && recentVolumes.length > 0) {
            const avgVolume = recentVolumes.reduce((sum, v) => sum + (Number(v.volume) || 0), 0) / recentVolumes.length;
            
            // Get current candle volume
            const { data: currentCandle } = await supabase
              .from('market_data_feed')
              .select('volume')
              .eq('symbol', signal.pair)
              .not('volume', 'is', null)
              .order('timestamp', { ascending: false })
              .limit(1)
              .single();
            
            const currentVolume = Number(currentCandle?.volume) || 0;
            const volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 0;
            
            if (volumeRatio < 1.5) {
              console.log(`📊 Volume too low: ${currentVolume.toFixed(0)} vs avg ${avgVolume.toFixed(0)} (${volumeRatio.toFixed(2)}x < 1.5x required) - skipping low-probability trade`);
              continue;
            }
            
            console.log(`✅ Volume confirmed: ${currentVolume.toFixed(0)} vs avg ${avgVolume.toFixed(0)} (${volumeRatio.toFixed(2)}x >= 1.5x)`);
          }

          // Rate limit: prevent >1 trade per 5 min per signal type per symbol
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          const { data: recentExec } = await supabase
            .from('trade_execution_rate_limit')
            .select('*')
            .eq('portfolio_id', portfolio.id)
            .eq('signal_type', signal.signal_type)
            .eq('symbol', signal.pair)
            .gte('last_execution_time', fiveMinutesAgo)
            .limit(1);

          if (recentExec && recentExec.length > 0) {
            console.log(`⏱️ Rate limit hit for ${signal.pair} ${signal.signal_type} on portfolio ${portfolio.id.slice(0,8)} - skipping`);
            continue;
          }

          // **ENHANCED DUPLICATE DETECTION**: Check by signal_id/analysis_id
          const signalRef = signal.signal_id || signal.id || signal.analysis_id;
          const { data: existingSignalTrade } = await supabase
            .from('shadow_trades')
            .select('id')
            .eq('portfolio_id', portfolio.id)
            .eq('status', 'open')
            .ilike('comment', `%${signalRef}%`)
            .limit(1);
          
          if (existingSignalTrade) {
            console.log(`🚫 Duplicate: Signal ${String(signalRef).slice(0, 8)} already executed`);
            
            // Log to audit table
            await supabase.from('trade_execution_audit').insert({
              signal_id: String(signalRef),
              analysis_id: signal.analysis_id,
              portfolio_id: portfolio.id,
              result: 'skipped_duplicate',
              reason: `Signal already has open trade: ${existingSignalTrade.id}`,
              metadata: { signal_type: signal.signal_type, symbol: signal.pair }
            });
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

          // **PHASE 4: Dynamic SL/TP based on ATR**
          // Calculate ATR from recent market data
          const { data: recentCandles } = await supabase
            .from('market_data_feed')
            .select('*')
            .eq('symbol', signal.pair)
            .order('timestamp', { ascending: false })
            .limit(14);
          
          const atr = calculateATR(recentCandles || []);
          console.log(`📊 Calculated ATR: ${atr.toFixed(5)} for ${signal.pair}`);
          
          // Dynamic SL/TP based on ATR with MINIMUM 30 PIPS constraint
          let dynamicStopLoss = signal.stop_loss;
          let dynamicTakeProfit = signal.take_profit;
          
          if (atr > 0) {
            // Calculate ATR-based stops
            const atrStopDistance = 1.5 * atr;
            const atrTakeProfitDistance = 4 * atr;
            
            // CRITICAL FIX: Ensure minimum 30 pips (0.0030 for EUR/USD)
            const MIN_STOP_DISTANCE = 0.0030; // 30 pips minimum
            const MIN_TP_DISTANCE = 0.0050; // 50 pips minimum for TP
            
            const actualStopDistance = Math.max(atrStopDistance, MIN_STOP_DISTANCE);
            const actualTpDistance = Math.max(atrTakeProfitDistance, MIN_TP_DISTANCE);
            
            if (signal.signal_type === 'buy') {
              dynamicStopLoss = signal.entry_price - actualStopDistance;
              dynamicTakeProfit = signal.entry_price + actualTpDistance;
            } else {
              dynamicStopLoss = signal.entry_price + actualStopDistance;
              dynamicTakeProfit = signal.entry_price - actualTpDistance;
            }
            
            const stopPips = Math.round(actualStopDistance / 0.0001);
            const tpPips = Math.round(actualTpDistance / 0.0001);
            
            console.log(`🎯 Optimized SL/TP: SL=${dynamicStopLoss.toFixed(5)} (${stopPips} pips), TP=${dynamicTakeProfit.toFixed(5)} (${tpPips} pips)`);
          }
          
          // **PHASE 1: Fixed lot size for all trades - simple and predictable**
          const positionSize = 0.01; // Fixed 0.01 lot for consistency across all accounts
          
          console.log(`🔒 Using fixed lot size: ${positionSize}`);

          console.log(`📏 Calculated position size: ${positionSize} for signal ${signal.signal_id}`);

          // Create new shadow trade with correct schema fields
          const contractSize = 100000; // Standard lot size for EUR/USD
          const marginRequiredLots = positionSize * signal.entry_price * contractSize * 0.01; // 1% margin
          
          const newTrade = {
            portfolio_id: portfolio.id,
            symbol: signal.pair,
            trade_type: signal.signal_type,
            lot_size: positionSize,
            position_size: positionSize,
            remaining_lot_size: positionSize, // NEW: Track remaining size for partial closes
            entry_price: signal.entry_price,
            stop_loss: dynamicStopLoss || signal.stop_loss || 0,
            take_profit: dynamicTakeProfit || signal.take_profit || 0,
            trailing_stop_distance: Math.round(Math.max(atr / 0.0001, 15)), // Minimum 15 pips trailing distance
            contract_size: contractSize,
            margin_required: marginRequiredLots,
            confluence_score: signal.confluence_score,
            comment: `Signal ${signal.signal_id.slice(0, 8)} | ATR: ${atr.toFixed(5)}`,
            status: 'open'
          };

          console.log(`💾 Creating trade:`, newTrade);

          const { data: insertedTrade, error: tradeError } = await supabase
            .from('shadow_trades')
            .insert(newTrade)
            .select()
            .single();

          if (tradeError) {
            console.error(`❌ Error creating trade for signal ${signal.signal_id}:`, tradeError);
            console.error(`❌ Trade data that failed:`, newTrade);
            continue;
          }

          console.log(`✅ Successfully created trade ${insertedTrade.id} for signal ${signal.signal_id}`);

          // Immediately mark signal as executed to prevent reprocessing
          await supabase
            .from('master_signals')
            .update({ 
              status: 'executed',
              execution_timestamp: new Date().toISOString(),
              execution_price: signal.entry_price,
              updated_at: new Date().toISOString()
            })
            .eq('id', signal.signal_id);

          // Upsert/update rate limit record
          const { data: existingRate } = await supabase
            .from('trade_execution_rate_limit')
            .select('id')
            .eq('portfolio_id', portfolio.id)
            .eq('signal_type', signal.signal_type)
            .eq('symbol', signal.pair)
            .limit(1);

          if (existingRate && existingRate.length > 0) {
            await supabase
              .from('trade_execution_rate_limit')
              .update({ last_execution_time: new Date().toISOString(), execution_count: 1 })
              .eq('id', existingRate[0].id);
          } else {
            await supabase
              .from('trade_execution_rate_limit')
              .insert({
                portfolio_id: portfolio.id,
                signal_type: signal.signal_type,
                symbol: signal.pair,
                last_execution_time: new Date().toISOString(),
                execution_count: 1
              });
          }

          // Update portfolio metrics
          const margin = newTrade.margin_required;
          await supabase
            .from('shadow_portfolios')
            .update({
              used_margin: parseFloat(portfolio.used_margin.toString()) + margin,
              free_margin: parseFloat(portfolio.free_margin.toString()) - margin,
              margin_level: (parseFloat(portfolio.equity.toString()) / (parseFloat(portfolio.used_margin.toString()) + margin)) * 100,
              updated_at: new Date().toISOString()
            })
            .eq('id', portfolio.id);

          executedTrades.push({
            trade_id: insertedTrade.id,
            portfolio_id: portfolio.id,
            signal_type: signal.signal_type,
            entry_price: signal.entry_price,
            position_size: positionSize,
            confluence_score: signal.confluence_score,
            success: true
          });

          processedItems++;
          console.log(`✅ Executed ${signal.signal_type.toUpperCase()} trade for portfolio ${portfolio.id.slice(0, 8)}: ${positionSize} lots @ ${signal.entry_price}`);

        } catch (tradeError) {
          console.error(`❌ Error executing trade for portfolio ${portfolio.id}:`, tradeError);
          executedTrades.push({
            signal_id: signal.signal_id,
            portfolio_id: portfolio.id,
            error: (tradeError as Error).message,
            success: false
          });
        }
      }
    }

    // **FIX 9: Mark signals as executed in master_signals**
    if (executedTrades.filter(t => t.success).length > 0) {
      for (const signal of signals) {
        const hasSuccessfulTrade = executedTrades.some(t => t.success);
        if (hasSuccessfulTrade) {
          await supabase
            .from('master_signals')
            .update({ 
              status: 'executed',
              execution_timestamp: new Date().toISOString(),
              execution_price: signal.entry_price,
              updated_at: new Date().toISOString()
            })
            .eq('id', signal.signal_id);
        }
      }
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
        error_message: (error as Error).message,
        processed_items: processedItems
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

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

function calculatePositionSize(
  balance: number,
  entryPrice: number, 
  stopLoss: number,
  riskPerTrade: number
): number {
  // CRITICAL FIX: Convert from dollar amounts to proper forex lot sizes
  const riskAmount = balance * riskPerTrade;
  const stopLossDistance = Math.abs(entryPrice - stopLoss);
  const stopLossPips = stopLossDistance / 0.0001; // Convert to pips
  
  // For EUR/USD: 1 standard lot = 100,000 units, 1 pip = $10 for 1 lot
  const pipValuePerLot = 10; // $10 per pip for 1 standard lot
  const maxRiskPips = stopLossPips > 0 ? stopLossPips : 50; // Default 50 pips if no SL
  
  // Calculate lot size based on risk
  const dollarRiskPerPip = riskAmount / maxRiskPips;
  let lotSize = dollarRiskPerPip / pipValuePerLot;
  
  // CRITICAL: Ensure lot size is in proper forex range (0.01 to 1.0)
  lotSize = Math.max(0.01, Math.min(1.0, lotSize));
  
  // Round to valid lot increments (0.01 steps)
  lotSize = Math.round(lotSize * 100) / 100;
  
  // Final validation - default to 0.01 if invalid
  if (isNaN(lotSize) || lotSize <= 0) {
    console.warn(`⚠️ Invalid lot size calculated, defaulting to 0.01`);
    lotSize = 0.01;
  }
  
  console.log(`📊 Position Sizing: Risk=$${riskAmount}, SL Pips=${maxRiskPips}, Lot Size=${lotSize}`);
  
  return lotSize;
}

// PHASE 4: Calculate ATR (Average True Range) for dynamic SL/TP
function calculateATR(candles: any[]): number {
  if (!candles || candles.length < 2) return 0.0003; // Default 3 pips if no data
  
  const trueRanges: number[] = [];
  
  for (let i = 1; i < Math.min(candles.length, 14); i++) {
    const high = parseFloat(candles[i].high_price?.toString() || candles[i].price?.toString() || '0');
    const low = parseFloat(candles[i].low_price?.toString() || candles[i].price?.toString() || '0');
    const prevClose = parseFloat(candles[i - 1].price?.toString() || '0');
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    
    trueRanges.push(tr);
  }
  
  if (trueRanges.length === 0) return 0.0003;
  
  const atr = trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length;
  return Math.max(atr, 0.0001); // Minimum 1 pip ATR
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