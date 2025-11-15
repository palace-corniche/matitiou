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

// Market Hours Validation - Forex market is closed on weekends
function isMarketOpen(): { open: boolean; reason?: string } {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const hour = now.getUTCHours();
  
  // Saturday - Market closed all day
  if (dayOfWeek === 6) {
    return { open: false, reason: 'Market closed: Saturday' };
  }
  
  // Sunday - Market closed until 22:00 UTC
  if (dayOfWeek === 0 && hour < 22) {
    return { open: false, reason: `Market closed: Sunday before 22:00 UTC (current: ${hour}:00 UTC)` };
  }
  
  // Friday - Market closes at 22:00 UTC
  if (dayOfWeek === 5 && hour >= 22) {
    return { open: false, reason: 'Market closed: Friday after 22:00 UTC' };
  }
  
  // Market is open
  return { open: true };
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

// Reconciliation for global_trading_account
async function reconcileGlobalAccount(supabase: any, accountId: string): Promise<boolean> {
  try {
    // Get actual open trades
    const { data: openTrades } = await supabase
      .from('shadow_trades')
      .select('*')
      .eq('portfolio_id', accountId)
      .eq('status', 'open');

    const actualOpenPositions = openTrades?.length || 0;
    
    // Get account state
    const { data: account } = await supabase
      .from('global_trading_account')
      .select('*')
      .eq('id', accountId)
      .single();

    if (!account) return false;

    // Calculate actual margin
    const actualMargin = openTrades?.reduce((total: number, trade: any) => {
      return total + (trade.margin_required || 0);
    }, 0) || 0;

    const reportedMargin = parseFloat(account.used_margin.toString());

    // Fix ghost positions
    if (actualOpenPositions === 0 && reportedMargin > 0) {
      console.log(`👻 Clearing ghost margin for global account: $${reportedMargin.toFixed(2)}`);
      
      await supabase
        .from('global_trading_account')
        .update({
          used_margin: 0,
          free_margin: account.balance,
          margin_level: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId);
      
      return true;
    }

    // Fix margin inconsistencies
    if (Math.abs(actualMargin - reportedMargin) > 0.01) {
      const newFreeMargin = parseFloat(account.balance.toString()) - actualMargin;
      const newMarginLevel = actualMargin > 0 
        ? (parseFloat(account.equity.toString()) / actualMargin) * 100 
        : 0;

      console.log(`🔧 Fixing margin inconsistency: Reported=$${reportedMargin.toFixed(2)}, Actual=$${actualMargin.toFixed(2)}`);

      await supabase
        .from('global_trading_account')
        .update({
          used_margin: actualMargin,
          free_margin: Math.max(0, newFreeMargin),
          margin_level: newMarginLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId);
      
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error reconciling global account ${accountId}:`, error);
    return false;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // **FIX #2: Comprehensive error handling and logging to debug deployment**
  console.log('🎬 FUNCTION INVOKED - execute-shadow-trades');
  console.log('📅 Timestamp:', new Date().toISOString());
  console.log('🔍 Method:', req.method);
  console.log('🌐 URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let processedItems = 0;
  let status = 'success';
  let errorMessage = '';

  try {
    console.log('🔑 Checking environment variables...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(`Missing env vars: URL=${!!supabaseUrl}, KEY=${!!supabaseKey}`);
    }
    console.log('✅ Environment variables present');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client created');

    let requestBody;
    try {
      requestBody = await req.json();
      console.log('📦 Request body:', JSON.stringify(requestBody));
    } catch (e) {
      console.log('⚠️ No request body or invalid JSON, using defaults');
      requestBody = {};
    }
    
    const { signal_id, trigger } = requestBody;

    console.log('🚀 Starting shadow trade execution...');
    console.log('📋 Trigger:', trigger || 'cron', 'Signal ID:', signal_id || 'none');

    // **ATOMIC LOCK: Try to acquire execution lock atomically**
    const executionLockId = crypto.randomUUID();
    console.log(`🔐 Attempting to acquire execution lock: ${executionLockId.slice(0,8)}`);
    
    const { data: lockData, error: lockError } = await supabase
      .from('function_execution_locks')
      .insert({
        id: executionLockId,
        function_name: 'execute-shadow-trades',
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (lockError) {
      // Lock acquisition failed - another instance is running
      console.log('⏸️ Another instance is already running (unique constraint violation)');
      console.log('   Error:', lockError.message);
      
      // Query the existing running instance for info
      const { data: runningInstances } = await supabase
        .from('function_execution_locks')
        .select('started_at')
        .eq('function_name', 'execute-shadow-trades')
        .eq('status', 'running')
        .limit(1);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Another instance already running', 
          skipped: true,
          running_since: runningInstances?.[0]?.started_at || 'unknown'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ Execution lock acquired');

    // PHASE 2 FIX: Use global_trading_account instead of shadow_portfolios
    console.log('🔍 Fetching global trading account...');
    const globalAccountId = '00000000-0000-0000-0000-000000000001';
    
    const { data: globalAccount, error: accountError } = await supabase
      .from('global_trading_account')
      .select('*')
      .eq('id', globalAccountId)
      .single();

    if (accountError) {
      console.error('❌ Error fetching global account:', accountError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error fetching global account', details: accountError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!globalAccount) {
      console.error('❌ Global trading account not found');
      return new Response(
        JSON.stringify({ success: false, error: 'Global trading account not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!globalAccount.auto_trading_enabled) {
      console.log('⚠️ Auto-trading disabled on global account');
      return new Response(
        JSON.stringify({ success: true, message: 'Auto-trading disabled', trades_executed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if forex market is open (avoid weekend trading)
    const marketStatus = isMarketOpen();
    if (!marketStatus.open) {
      console.log(`⏸️ Market is closed: ${marketStatus.reason}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Market closed', 
          reason: marketStatus.reason,
          trades_executed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Market is open - proceeding with trade execution');
    console.log('💼 Found 1 active portfolios');
    console.log(`   Global Account: Balance=$${globalAccount.balance}, Equity=$${globalAccount.equity}, Auto-trading=${globalAccount.auto_trading_enabled}`);
    
    // Create portfolios array with global account (for compatibility with rest of code)
    const portfolios = [globalAccount];

    console.log(`💼 Found ${portfolios.length} active portfolios`);

    // ⚡ ATOMIC SIGNAL LOCKING: Use SELECT FOR UPDATE SKIP LOCKED via database function
    console.log('🎯 Atomically locking available signals using SELECT FOR UPDATE SKIP LOCKED...');
    
    const { data: rawSignals, error: signalsError } = await supabase
      .rpc('atomic_lock_signals', {
        p_limit: signal_id ? 1 : 5,
        p_min_confluence_score: 12,
        p_max_age_minutes: 60
      });
    
    // Map to expected format
    const signals = rawSignals?.map(s => ({
      signal_id: s.id,
      pair: s.symbol,
      signal_type: s.signal_type,
      entry_price: s.recommended_entry,
      stop_loss: s.recommended_stop_loss,
      take_profit: s.recommended_take_profit,
      final_confidence: s.final_confidence,
      confluence_score: s.confluence_score,
      signal_quality_score: s.signal_quality_score,
      market_regime: s.market_regime,
      timeframe: s.timeframe,
      created_at: s.created_at
    }));

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
        .eq('status', 'rejected') // Changed from 'pending'
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

    console.log(`🎯 Successfully locked ${signals.length} signals atomically (no conflicts!)`);

    // Fetch account defaults to get quality threshold
    console.log('⚙️ Fetching account defaults for quality threshold...');
    const { data: accountDefaults } = await supabase
      .from('account_defaults')
      .select('min_signal_quality')
      .eq('portfolio_id', globalAccountId)
      .maybeSingle();
    
    const qualityThreshold = accountDefaults?.min_signal_quality || 10;
    console.log(`📊 Quality threshold: ${qualityThreshold}`);

    const executedTrades = [];

    // Execute trades for each locked signal
    for (const signal of signals) {
      console.log(`\n🔒 Processing locked signal ${signal.signal_id.slice(0,8)} (${signal.signal_type.toUpperCase()})...`);
      
      // **PHASE 5: BASIC VALIDATION BEFORE EXECUTION**
      console.log(`🔍 Validating signal for ${signal.pair}...`);
      
      // Additional validation: Confluence score >= 12
      if (signal.confluence_score < 12) {
        console.log(`🚫 Signal ${signal.signal_id.slice(0, 8)} confluence too low: ${signal.confluence_score} < 12`);
        continue;
      }
      
      // **ENHANCED QUALITY VALIDATION**: Use dynamic threshold from account_defaults
      if (signal.signal_quality_score !== null && signal.signal_quality_score !== undefined) {
        if (signal.signal_quality_score < qualityThreshold) {
          console.log(`🚫 Signal ${signal.signal_id.slice(0, 8)} quality too low: ${signal.signal_quality_score} < ${qualityThreshold}`);
          
          // Update signal status to rejected with reason
          await supabase
            .from('master_signals')
            .update({ 
              status: 'rejected',
              rejection_reason: `Quality score ${signal.signal_quality_score} below minimum ${qualityThreshold}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', signal.signal_id);
          
          continue;
        }
      } else {
        console.log(`⚠️ Signal ${signal.signal_id.slice(0, 8)} has no quality score - allowing execution`);
      }
      
      console.log(`✅ Signal validated for ${signal.pair}:`);
      console.log(`   Confluence: ${signal.confluence_score}, Quality: ${signal.signal_quality_score || 'N/A'} (threshold: ${qualityThreshold})`);
      
      for (const portfolio of portfolios) {
        try {
          // Reconcile account state first (global account vs regular portfolio)
          if (portfolio.id === '00000000-0000-0000-0000-000000000001') {
            await reconcileGlobalAccount(supabase, portfolio.id);
          } else {
            await reconcilePortfolioState(supabase, portfolio.id);
          }
          
          // Check if portfolio can accept new trades
          const { data: openTrades } = await supabase
            .from('shadow_trades')
            .select('id, margin_required, position_size, entry_price, trade_type, symbol')
            .eq('portfolio_id', portfolio.id)
            .eq('status', 'open');

          const actualOpenPositions = openTrades?.length || 0;

          // **CRITICAL FIX: Close ALL opposite direction trades using close_shadow_trade RPC**
          const oppositeDirection = signal.signal_type === 'buy' ? 'sell' : 'buy';
          const oppositeTrades = openTrades?.filter(t => t.trade_type === oppositeDirection) || [];
          
          if (oppositeTrades.length > 0) {
            console.log(`🔄 AUTO-CLOSING ${oppositeTrades.length} opposite ${oppositeDirection.toUpperCase()} trades before executing new ${signal.signal_type.toUpperCase()} signal`);
            
            // Get FRESH market data for closing
            const { data: freshMarketForClose } = await supabase
              .from('market_data_feed')
              .select('price, timestamp')
              .eq('symbol', signal.pair)
              .lte('timestamp', new Date().toISOString())
              .order('timestamp', { ascending: false })
              .limit(1)
              .single();
            
            if (!freshMarketForClose) {
              console.error('❌ No market data available for closing opposite trades');
              continue;
            }
            
            // **CRITICAL: Use close_shadow_trade RPC for each opposite trade**
            for (const oppTrade of oppositeTrades) {
              console.log(`   🔒 Closing ${oppTrade.trade_type.toUpperCase()} trade ${oppTrade.id.slice(0, 8)} via close_shadow_trade RPC...`);
              
              const { data: closeResult, error: closeError } = await supabase.rpc('close_shadow_trade', {
                p_trade_id: oppTrade.id,
                p_close_price: freshMarketForClose.price,
                p_close_lot_size: null, // Close full position
                p_close_reason: 'opposite_signal'
              });

              if (closeError) {
                console.error(`   ❌ Failed to close opposite trade: ${closeError.message}`);
              } else {
                console.log(`   ✅ Opposite trade closed - PnL: $${closeResult?.profit_amount || 0}`);
              }
              
              // Small delay between closes
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            console.log(`✅ All opposite ${oppositeDirection.toUpperCase()} trades processed`);
          }
          
          // Refresh open trades count after closing opposites
          const { data: refreshedTrades } = await supabase
            .from('shadow_trades')
            .select('id')
            .eq('portfolio_id', portfolio.id)
            .eq('status', 'open');
          
          const updatedOpenPositions = refreshedTrades?.length || 0;
          
          if (updatedOpenPositions >= portfolio.max_open_positions) {
            console.log(`⏭️ Portfolio ${portfolio.id.slice(0, 8)} has max open positions (${updatedOpenPositions}/${portfolio.max_open_positions})`);
            continue;
          }

          // Fetch REAL market price from market_data_feed
          const { data: freshPrice, error: priceError } = await supabase
            .from('market_data_feed')
            .select('price, timestamp')
            .eq('symbol', signal.pair)
            .lte('timestamp', new Date().toISOString()) // CRITICAL FIX: Prevent future timestamps
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();

          if (priceError || !freshPrice) {
            console.error(`❌ No price data available for ${signal.pair}:`, priceError);
            
            // **PHASE 5: Track price fetch failure**
            await supabase.from('signal_execution_attempts').insert({
              signal_id: signal.signal_id,
              attempt_number: 1,
              lock_acquired: true,
              execution_stage: 'price_fetch_failed',
              failure_reason: 'No live market price available',
              attempted_at: new Date().toISOString()
            });
            
            await supabase.from('master_signals').update({
              status: 'rejected',
              rejection_reason: 'No live market price available',
              updated_at: new Date().toISOString()
            }).eq('id', signal.signal_id);
            
            continue;
          }
          
          // **PHASE 5: Track successful price fetch**
          await supabase.from('signal_execution_attempts').insert({
            signal_id: signal.signal_id,
            attempt_number: 1,
            lock_acquired: true,
            execution_stage: 'price_fetched',
            market_price: freshPrice.price,
            attempted_at: new Date().toISOString()
          });

          const priceAge = Date.now() - new Date(freshPrice.timestamp).getTime();
          if (priceAge > 3600000 && priceAge < -3600000) { // More than 1 hour old OR more than 1 hour in future
            console.error(`❌ Price timestamp invalid: ${Math.round(priceAge/60000)} minutes ${priceAge > 0 ? 'old' : 'in future'}`);
            
            await supabase.from('master_signals').update({
              status: 'rejected',
              rejection_reason: `Price timestamp invalid (${Math.round(priceAge/60000)}m ${priceAge > 0 ? 'old' : 'in future'})`,
              updated_at: new Date().toISOString()
            }).eq('id', signal.signal_id);
            
            continue;
          }

          const price = parseFloat(String(freshPrice.price));
          const spread = 0.00015;
          const entryPrice = signal.signal_type === 'buy'
            ? price + (spread / 2)  // ASK
            : price - (spread / 2); // BID

          console.log(`💰 Entry price: ${entryPrice.toFixed(5)} from market_data_feed (${freshPrice.timestamp})`);

          // **PHASE 2: VALIDATE ENTRY PRICE IS REALISTIC**
          if (signal.pair === 'EUR/USD' && (entryPrice < 0.9 || entryPrice > 2.0)) {
            console.error(`❌ Invalid entry price ${entryPrice} for EUR/USD, skipping trade`);
            
            await supabase.from('trade_execution_log').insert({
              signal_id: signal.signal_id,
              success: false,
              entry_price: entryPrice,
              error_message: `Invalid entry price: ${entryPrice}`,
              validation_result: { valid: false, errors: ['Entry price out of range'] }
            });
            
            await supabase.from('master_signals').update({
              status: 'rejected',
              rejection_reason: `Invalid entry price: ${entryPrice}`,
              updated_at: new Date().toISOString()
            }).eq('id', signal.signal_id);
            
            continue; // SKIP THIS TRADE
          }

          console.log(`✅ Entry price validated: ${entryPrice.toFixed(5)} (age: ${Math.round(priceAge/1000)}s)`);

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




          // **FIXED DUPLICATE DETECTION**: Only check for OPEN trades (allow re-trading closed signals)
          const { data: existingOpenTrades } = await supabase
            .from('shadow_trades')
            .select('id')
            .eq('portfolio_id', portfolio.id)
            .eq('master_signal_id', signal.signal_id)
            .eq('status', 'open')
            .limit(1);
          
          if (existingOpenTrades && existingOpenTrades.length > 0) {
            console.log(`⏭️ Skipping: Signal ${signal.signal_id.slice(0, 8)} already has open trade (${existingOpenTrades[0].id.slice(0, 8)})`);
            continue;
          }
          
          console.log(`✅ No existing open trade for signal ${signal.signal_id.slice(0, 8)} - proceeding with execution`);


          // **PHASE 4: INTELLIGENT SL/TP based on multiple factors**
          console.log(`🧠 Calculating intelligent targets for ${signal.pair}...`);
          
          // Call intelligent targets function
          const targetsResponse = await fetch(
            `${supabaseUrl}/functions/v1/calculate-intelligent-targets`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`
              },
              body: JSON.stringify({
                symbol: signal.pair,
                trade_type: signal.signal_type,
                entry_price: signal.entry_price
              })
            }
          );
          
          let dynamicStopLoss = signal.stop_loss;
          let dynamicTakeProfit = signal.take_profit;
          let targetsReasoning = 'Using signal defaults';
          let targetsConfidence = 50;
          let intelligentTargets: any = null;
          
          if (targetsResponse.ok) {
            intelligentTargets = await targetsResponse.json();
            
            // **CRITICAL FIX: Enforce MINIMUM 20 pip stop loss**
            const MIN_SL_DISTANCE_PIPS = 20;
            const MIN_SL_DISTANCE = MIN_SL_DISTANCE_PIPS * 0.0001; // 20 pips in price terms
            
            const recommendedSlDistance = Math.abs(signal.entry_price - intelligentTargets.stop_loss);
            const enforcedSlDistance = Math.max(recommendedSlDistance, MIN_SL_DISTANCE);
            
            // Apply minimum SL distance
            dynamicStopLoss = signal.signal_type === 'buy'
              ? signal.entry_price - enforcedSlDistance
              : signal.entry_price + enforcedSlDistance;
            
            // Ensure TP is at least 2x the SL distance (1:2 risk:reward minimum)
            const minTpDistance = enforcedSlDistance * 2;
            const recommendedTpDistance = Math.abs(signal.entry_price - intelligentTargets.take_profit_1);
            const enforcedTpDistance = Math.max(recommendedTpDistance, minTpDistance);
            
            dynamicTakeProfit = signal.signal_type === 'buy'
              ? signal.entry_price + enforcedTpDistance
              : signal.entry_price - enforcedTpDistance;
            
            const actualSlPips = enforcedSlDistance / 0.0001;
            const actualTpPips = enforcedTpDistance / 0.0001;
            
            if (recommendedSlDistance < MIN_SL_DISTANCE) {
              console.log(`⚠️ WIDENED SL: ${Math.round(recommendedSlDistance / 0.0001)} → ${Math.round(actualSlPips)} pips (min ${MIN_SL_DISTANCE_PIPS})`);
            }
            if (recommendedTpDistance < minTpDistance) {
              console.log(`⚠️ WIDENED TP: ${Math.round(recommendedTpDistance / 0.0001)} → ${Math.round(actualTpPips)} pips (min 2:1 R:R)`);
            }
            targetsReasoning = intelligentTargets.reasoning;
            targetsConfidence = intelligentTargets.confidence;
            
            const stopPips = Math.round(Math.abs(signal.entry_price - dynamicStopLoss) / 0.0001);
            const tp1Pips = Math.round(Math.abs(signal.entry_price - intelligentTargets.take_profit_1) / 0.0001);
            const tp2Pips = Math.round(Math.abs(signal.entry_price - intelligentTargets.take_profit_2) / 0.0001);
            const tp3Pips = Math.round(Math.abs(signal.entry_price - intelligentTargets.take_profit_3) / 0.0001);
            
            console.log(`🎯 INTELLIGENT TARGETS (${targetsConfidence}% confidence):`);
            console.log(`   SL: ${dynamicStopLoss.toFixed(5)} (${stopPips} pips)`);
            console.log(`   TP1: ${intelligentTargets.take_profit_1.toFixed(5)} (${tp1Pips} pips)`);
            console.log(`   TP2: ${intelligentTargets.take_profit_2.toFixed(5)} (${tp2Pips} pips)`);
            console.log(`   TP3: ${intelligentTargets.take_profit_3.toFixed(5)} (${tp3Pips} pips)`);
            console.log(`   Reasoning: ${targetsReasoning}`);
            console.log(`   Key levels: ${intelligentTargets.key_levels.length}`);
            
            // Apply max_tp_pips constraint if configured
            const { data: accountDefaults } = await supabase
              .from('account_defaults')
              .select('max_tp_pips')
              .is('portfolio_id', null)
              .single();

            const maxTpPips = accountDefaults?.max_tp_pips || null;

            if (maxTpPips && intelligentTargets) {
              const currentTpPips = Math.abs(signal.entry_price - dynamicTakeProfit) / 0.0001;
              
              if (currentTpPips > maxTpPips) {
                console.log(`⚠️ Capping TP: ${currentTpPips.toFixed(1)} pips > ${maxTpPips} max`);
                
                // Cap TP at max distance
                dynamicTakeProfit = signal.signal_type === 'buy'
                  ? signal.entry_price + (maxTpPips * 0.0001)
                  : signal.entry_price - (maxTpPips * 0.0001);
                
                targetsReasoning = `Capped at ${maxTpPips} pips (was ${currentTpPips.toFixed(1)} pips). ${targetsReasoning}`;
                
                console.log(`   New TP: ${dynamicTakeProfit.toFixed(5)} (${maxTpPips} pips)`);
              }
            }
          } else {
            console.warn(`⚠️ Intelligent targets failed, using signal defaults`);
          }
          
          // **PHASE 1: Fixed lot size for all trades - simple and predictable**
          const fixedLotSize = 0.01; // Fixed 0.01 lot for consistency
          
          console.log(`🔒 Using fixed lot size: ${fixedLotSize}`);

          // ===================== PHASE 3: EXECUTE TRADE WITH SIGNAL LINKAGE =====================
          console.log(`🚀 Executing trade with signal linkage for signal ${signal.signal_id.slice(0, 8)}`);

          const { data: trade_id, error: tradeError } = await supabase
            .rpc('execute_global_shadow_trade', {
              p_symbol: signal.pair,
              p_trade_type: signal.signal_type,
              p_entry_price: entryPrice,
              p_lot_size: fixedLotSize,
              p_stop_loss: dynamicStopLoss || signal.stop_loss || 0,
              p_take_profit: dynamicTakeProfit || signal.take_profit || 0,
              p_comment: `Master Signal: ${signal.signal_id.slice(0, 8)} | Quality: ${signal.signal_quality_score || 'N/A'} | Confluence: ${signal.confluence_score}`,
              p_signal_id: signal.signal_id,
              p_master_signal_id: signal.signal_id
            });

          if (tradeError || !trade_id) {
            console.error(`❌ Trade execution failed:`, tradeError);
            
            // Log execution failure
            await supabase.from('trade_execution_log').insert({
              signal_id: signal.signal_id,
              success: false,
              entry_price: entryPrice,
              tick_age_ms: priceAge,
              error_message: tradeError?.message || 'Unknown error',
              validation_result: { valid: true, executed: false, error: tradeError?.message }
            });
            
            await supabase.from('ea_logs').insert({
              portfolio_id: portfolio.id,
              ea_name: 'Execute Shadow Trades',
              log_level: 'ERROR',
              message: `Trade rejected: ${tradeError?.message}`,
              symbol: signal.pair
            });
            
            continue; // Skip to next signal
          }

          console.log(`✅ Trade created successfully: ${trade_id}`);

          // Update price source tracking
          await supabase
            .from('shadow_trades')
            .update({
              price_source: 'market_data_feed',
              price_timestamp: freshPrice.timestamp
            })
            .eq('id', trade_id);

          // Log successful execution
          await supabase.from('trade_execution_log').insert({
            signal_id: signal.signal_id,
            success: true,
            entry_price: entryPrice,
            tick_age_ms: priceAge,
            validation_result: { valid: true, executed: true }
          });

          // Update trade with intelligent targets if available
          if (intelligentTargets) {
            // Store in shadow_trades
            await supabase
              .from('shadow_trades')
              .update({
                take_profit_1: intelligentTargets.take_profit_1,
                take_profit_2: intelligentTargets.take_profit_2,
                take_profit_3: intelligentTargets.take_profit_3,
                target_confidence: intelligentTargets.confidence,
                target_reasoning: targetsReasoning,
                key_levels: intelligentTargets.key_levels
              })
              .eq('id', trade_id);
            
            // Store in intelligent_targets for historical tracking
            await supabase
              .from('intelligent_targets')
              .insert({
                trade_id: trade_id,
                signal_id: signal.signal_id,
                symbol: signal.pair,
                entry_price: entryPrice,
                recommended_sl: intelligentTargets.stop_loss,
                recommended_tp1: intelligentTargets.take_profit_1,
                recommended_tp2: intelligentTargets.take_profit_2,
                recommended_tp3: intelligentTargets.take_profit_3,
                actual_sl: dynamicStopLoss,
                actual_tp: dynamicTakeProfit,
                confidence: intelligentTargets.confidence,
                reasoning: targetsReasoning,
                key_levels: intelligentTargets.key_levels
              });
            
            console.log(`📊 Intelligent targets stored in database and historical tracking`);
          }

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

          executedTrades.push({
            trade_id: trade_id,
            signal_id: signal.signal_id,
            portfolio_id: portfolio.id,
            signal_type: signal.signal_type,
            entry_price: entryPrice,  // Use validated entry price
            position_size: fixedLotSize,
            confluence_score: signal.confluence_score,
            success: true
          });

          processedItems++;
          console.log(`✅ Executed ${signal.signal_type.toUpperCase()} trade: ${fixedLotSize} lots @ ${entryPrice.toFixed(5)} (validated fresh price)`);

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
      for (const executedTrade of executedTrades.filter(t => t.success)) {
        // Find the corresponding signal to get entry_price
        const matchingSignal = signals.find(s => s.signal_id === executedTrade.signal_id);
        
        await supabase
          .from('master_signals')
          .update({ 
            status: 'executed',
            execution_timestamp: new Date().toISOString(),
            execution_price: executedTrade.entry_price,
            updated_at: new Date().toISOString()
          })
          .eq('id', executedTrade.signal_id || matchingSignal?.signal_id)
          .in('status', ['pending', 'processing']); // Accept both to handle edge cases
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
      
      console.log('📝 Logging error to system_health...');
      await supabase.from('system_health').insert({
        function_name: 'execute-shadow-trades',
        execution_time_ms: executionTime,
        status: 'error',
        error_message: (error as Error).message,
        processed_items: processedItems
      });
      console.log('✅ Error logged to system_health');
    } catch (logError) {
      console.error('❌ Failed to log error to system_health:', logError);
    }

    console.error('🔴 CRITICAL ERROR - Returning 500 response');
    console.error('🔍 Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      executionTimeMs: executionTime
    });

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message,
        stack: (error as Error).stack,
        executionTimeMs: executionTime,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  } finally {
    console.log('🏁 FUNCTION EXECUTION COMPLETE');
    console.log('⏱️ Total execution time:', Date.now() - startTime, 'ms');
    
    // **PHASE 2 FIX: Release execution lock**
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Mark lock as completed instead of deleting
        await supabase
          .from('function_execution_locks')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('function_name', 'execute-shadow-trades')
          .eq('status', 'running');
        
        console.log('🔓 Execution lock released');
      }
    } catch (lockError) {
      console.error('⚠️ Failed to release execution lock:', lockError);
    }
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