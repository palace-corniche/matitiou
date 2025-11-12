import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { 
  generateTechnicalSignals, 
  generateFundamentalSignals, 
  generateSentimentSignals,
  generateMultiTimeframeSignals,
  generatePatternSignals,
  generateStrategySignals,
  generateIntermarketSignals,
  fuseSignalsWithBayesian,
  generateSignalDiagnostics
} from './master-signal-modules.ts';

// Master Signal Engine - Comprehensive signal generation with modular analysis
interface StandardSignal {
  source: string;
  timestamp: string;
  pair: string;
  timeframe: string;
  signal: 'buy' | 'sell' | 'hold';
  confidence: number;
  strength: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  factors: Array<{
    name: string;
    value: number;
    weight: number;
    contribution: number;
  }>;
}

interface MasterSignal {
  signal: 'buy' | 'sell' | 'hold' | null;
  probability: number;
  confidence: number;
  strength: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  kellyFraction: number;
  entropy: number;
  consensusLevel: number;
  reasoning: string;
  warnings: string[];
  contributingSignals: StandardSignal[];
  qualityMetrics: {
    dataQuality: number;
    signalReliability: number;
    marketAlignment: number;
    diversification: number;
  };
}

interface CompleteSignalAnalysis {
  success: boolean;
  timestamp: string;
  pair: string;
  timeframe: string;
  masterSignal?: MasterSignal;
  rejectionReason?: string;
  modularResults: any;
  fusionResults: any;
  diagnostics: any;
  performanceMetrics: any;
  qualityIndicators: any;
  recommendation: {
    action: 'TRADE' | 'WAIT' | 'REVIEW_SETUP' | 'CHECK_DATA';
    reasoning: string;
    nextActions: string[];
  };
}

// Enhanced Adaptive Signal Engine with database integration
interface AdaptiveThresholds {
  entropy: { min: number; max: number; current: number };
  probability: { buy: number; sell: number };
  confluence: { min: number; adaptive: number };
  edge: { min: number; adaptive: number };
}

interface DebugConfig {
  enabled: boolean;
  accept_all_signals: boolean;
  log_level: string;
}

class AdaptiveSignalEngine {
  private thresholds: AdaptiveThresholds;
  private supabase: any;
  private debugConfig: DebugConfig = { enabled: false, accept_all_signals: false, log_level: 'info' };

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
    this.thresholds = {
      entropy: { min: 0.7, max: 0.95, current: 0.80 }, // More relaxed default
      probability: { buy: 0.56, sell: 0.44 }, // More relaxed defaults
      confluence: { min: 8, adaptive: 12 }, // More relaxed defaults
      edge: { min: -0.0002, adaptive: 0.00005 } // More permissive defaults
    };
  }

  async loadThresholds(): Promise<void> {
    try {
      const { data: thresholds } = await this.supabase
        .from('adaptive_thresholds')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (thresholds) {
        this.thresholds = {
          entropy: { 
            min: thresholds.entropy_min, 
            max: thresholds.entropy_max, 
            current: thresholds.entropy_current 
          },
          probability: { 
            buy: thresholds.probability_buy, 
            sell: thresholds.probability_sell 
          },
          confluence: { 
            min: thresholds.confluence_min, 
            adaptive: thresholds.confluence_adaptive 
          },
          edge: { 
            min: thresholds.edge_min, 
            adaptive: thresholds.edge_adaptive 
          }
        };
      }
    } catch (error) {
      console.warn('Failed to load adaptive thresholds from database, using defaults:', error);
    }
  }

  async loadDebugConfig(): Promise<void> {
    try {
      const { data: config } = await this.supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'debug_mode')
        .single();

      if (config?.config_value) {
        this.debugConfig = config.config_value;
      }
    } catch (error) {
      console.warn('Failed to load debug config:', error);
    }
  }

  async evaluateSignal(
    probabilisticFactors: any[],
    combinedProbability: number,
    entropy: number,
    netEdge: number,
    confluenceScore: number,
    regime: string,
    signalType: 'buy' | 'sell' | 'neutral'
  ): Promise<{ accepted: boolean; reason?: string }> {
    
    // Load latest config and thresholds
    await this.loadDebugConfig();
    await this.loadThresholds();

    // Debug mode: accept all signals
    if (this.debugConfig.accept_all_signals) {
      console.log('🔧 DEBUG MODE: Accepting all signals');
      await this.logSignal(true, confluenceScore, null, signalType, probabilisticFactors.length);
      return { accepted: true, reason: 'debug_mode_accept_all' };
    }

    // Entropy check with adaptive threshold
    if (entropy > this.thresholds.entropy.current) {
      const reason = `entropy_too_high_${entropy.toFixed(3)}_>${this.thresholds.entropy.current.toFixed(3)}`;
      await this.logRejection('entropy', entropy, this.thresholds.entropy.current, signalType, probabilisticFactors.length, combinedProbability, confluenceScore, netEdge, regime);
      return { accepted: false, reason };
    }

    // Probability check with adaptive thresholds
    if (signalType === 'buy' && combinedProbability < this.thresholds.probability.buy) {
      const reason = `buy_probability_too_low_${(combinedProbability*100).toFixed(1)}%_<${(this.thresholds.probability.buy*100).toFixed(1)}%`;
      await this.logRejection('probability', combinedProbability, this.thresholds.probability.buy, signalType, probabilisticFactors.length, combinedProbability, confluenceScore, netEdge, regime);
      return { accepted: false, reason };
    }

    if (signalType === 'sell' && combinedProbability > this.thresholds.probability.sell) {
      const reason = `sell_probability_too_high_${(combinedProbability*100).toFixed(1)}%_>${(this.thresholds.probability.sell*100).toFixed(1)}%`;
      await this.logRejection('probability', combinedProbability, this.thresholds.probability.sell, signalType, probabilisticFactors.length, combinedProbability, confluenceScore, netEdge, regime);
      return { accepted: false, reason };
    }

    // Edge check with adaptive threshold
    if (netEdge <= this.thresholds.edge.adaptive) {
      const reason = `edge_too_low_${netEdge.toFixed(6)}_<=${this.thresholds.edge.adaptive.toFixed(6)}`;
      await this.logRejection('edge', netEdge, this.thresholds.edge.adaptive, signalType, probabilisticFactors.length, combinedProbability, confluenceScore, netEdge, regime);
      return { accepted: false, reason };
    }

    // Confluence check
    if (confluenceScore < this.thresholds.confluence.adaptive) {
      const reason = `confluence_too_low_${confluenceScore.toFixed(1)}_<${this.thresholds.confluence.adaptive.toFixed(1)}`;
      await this.logRejection('confluence', confluenceScore, this.thresholds.confluence.adaptive, signalType, probabilisticFactors.length, combinedProbability, confluenceScore, netEdge, regime);
      return { accepted: false, reason };
    }

    // Signal accepted
    await this.logSignal(true, confluenceScore, null, signalType, probabilisticFactors.length);
    return { accepted: true };
  }

  private async logRejection(
    reason: string, 
    value: number, 
    threshold: number, 
    signalType: string, 
    factorsCount: number,
    probability?: number,
    confluenceScore?: number,
    netEdge?: number,
    regime?: string
  ): Promise<void> {
    try {
      await this.supabase.from('signal_rejection_logs').insert({
        reason,
        value,
        threshold,
        signal_type: signalType,
        factors_count: factorsCount,
        entropy: reason === 'entropy' ? value : null,
        probability: probability,
        confluence_score: confluenceScore,
        net_edge: netEdge,
        market_regime: regime
      });
    } catch (error) {
      console.warn('Failed to log signal rejection:', error);
    }
  }

  private async logSignal(
    accepted: boolean, 
    score: number, 
    reason?: string | null,
    signalType?: string,
    factorsCount?: number
  ): Promise<void> {
    try {
      // Log to system health for tracking
      await this.supabase.from('system_health').insert({
        function_name: 'signal-evaluation',
        status: accepted ? 'success' : 'warning',
        error_message: reason,
        processed_items: 1,
        execution_time_ms: 0
      });
    } catch (error) {
      console.warn('Failed to log signal evaluation:', error);
    }
  }

  getCurrentThresholds(): AdaptiveThresholds {
    return { ...this.thresholds };
  }
}

// Initialize adaptive engine (will be created with supabase client in serve function)
let adaptiveEngine: AdaptiveSignalEngine;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simplified technical indicator calculations for Edge Function
interface TechnicalIndicator {
  name: string;
  signal: 'buy' | 'sell' | 'neutral';
  strength: number;
  value: number;
}

interface ConfluenceFactor {
  type: string;
  name: string;
  signal: 'buy' | 'sell' | 'neutral';
  weight: number;
  strength: number;
  description: string;
  price?: number;
}

interface ConfluenceSignal {
  signal_id: string;
  pair: string;
  signal_type: 'buy' | 'sell' | 'neutral';
  confluence_score: number;
  strength: number;
  confidence: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  risk_reward_ratio: number;
  factors: ConfluenceFactor[];
  description: string;
  alert_level: 'low' | 'medium' | 'high' | 'extreme';
}

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

    // Initialize adaptive engine with supabase client
    if (!adaptiveEngine) {
      adaptiveEngine = new AdaptiveSignalEngine(supabase);
    }

    console.log('🔄 Starting confluence signal generation...');

    // Phase 4: Fetch aggregated candles (tick-to-candle system)
    // Try to get 15m data first, fall back to 1h, 4h, or 1d if insufficient
    let marketData = null;
    let selectedTimeframe = '15m';
    let dataError = null;
    
    const timeframesToTry = ['15m', '1h', '4h', '1d'];
    
    for (const tf of timeframesToTry) {
      const { data, error } = await supabase
        .from('aggregated_candles')
        .select('timestamp, open_price, high_price, low_price, close_price, volume, tick_count, is_complete')
        .eq('symbol', 'EUR/USD')
        .eq('timeframe', tf)
        .eq('is_complete', true) // Only use complete candles for analysis
        .lte('timestamp', new Date().toISOString())
        .order('timestamp', { ascending: false })
        .limit(100);
      
      // LOWER THRESHOLD TO 5 CANDLES for faster signal generation
      if (!error && data && data.length >= 5) {
        marketData = data;
        selectedTimeframe = tf;
        dataError = null;
        console.log(`✅ Found ${data.length} complete candles for ${tf} timeframe (avg ${Math.round(data.reduce((sum, c) => sum + c.tick_count, 0) / data.length)} ticks/candle)`);
        break;
      } else {
        console.log(`⚠️ Insufficient data for ${tf}: ${data?.length || 0} complete candles (need 5+)`);
      }
    }

    if (dataError) {
      console.error('Market data fetch error:', dataError);
      throw new Error(`Market data error: ${dataError.message}`);
    }
    
    // LOWER THRESHOLD TO 5 CANDLES
    if (!marketData || marketData.length < 5) {
      console.error('Insufficient aggregated candle data from all timeframes - cannot generate signals');
      throw new Error(`Insufficient candle data from aggregated_candles (need at least 5 complete candles, have ${marketData?.length || 0}). System is building candles from tick data.`);
    }

    console.log(`📊 Analyzing ${marketData.length} candles from ${selectedTimeframe} timeframe`);

    // Convert to candle format for analysis
    const candles = marketData.reverse().map(d => ({
      time: d.timestamp,
      open: parseFloat(d.open_price.toString()),
      high: parseFloat(d.high_price.toString()),
      low: parseFloat(d.low_price.toString()),
      close: parseFloat(d.close_price.toString()),
      volume: d.volume
    }));

    const currentPrice = candles[candles.length - 1].close;

    // Generate comprehensive signal analysis using Enhanced Master Signal Engine with Real Data
    const pair = 'EUR/USD';
    const timeframe = selectedTimeframe; // Use the timeframe that had sufficient data
    
    // **PHASE 2 FIX: Detect actual market regime instead of hardcoding**
    const regimeDetection = detectMarketRegime(candles, candles.map(() => 1));
    const regime = regimeDetection.type;
    console.log(`📊 Market regime detected: ${regime} (strength: ${(regimeDetection.strength * 100).toFixed(1)}%, confidence: ${(regimeDetection.confidence * 100).toFixed(1)}%)`);
    
    console.log(`🎯 Starting comprehensive analysis for ${pair} (${timeframe}) with ${candles.length} candles`);
    
    // Generate modular signals with enhanced real data
    const modularSignals = await generateModularSignals(supabase, candles, pair, timeframe, regime);
    
    // Generate master signal with Bayesian fusion
    const masterSignal = await generateMasterSignalAnalysis(supabase, candles, pair, timeframe, regime, modularSignals);

    // Enhanced diagnostics with real data
    const diagnostics = await generateEnhancedDiagnostics(supabase, masterSignal, modularSignals, pair, timeframe);
    
    // Create complete signal analysis
    const signalAnalysis = {
      success: true,
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      masterSignal,
      modularResults: modularSignals,
      fusionResults: masterSignal,
      diagnostics,
      performanceMetrics: masterSignal?.performance || {},
      qualityIndicators: masterSignal?.quality || {},
      recommendation: {
        action: (masterSignal?.signal ? 'TRADE' : 'WAIT') as 'TRADE' | 'WAIT' | 'REVIEW_SETUP' | 'CHECK_DATA',
        reasoning: masterSignal?.reasoning || 'No qualifying signal found',
        nextActions: ['Monitor for signal improvements']
      },
      rejectionReason: !masterSignal?.signal ? 'No qualifying master signal generated' : undefined
    };

    // Phase 1 & 2: Enhanced signal validation and error handling
    if (signalAnalysis?.success && signalAnalysis.masterSignal?.signal && signalAnalysis.masterSignal?.signal !== 'hold') {
      console.log('✅ Valid master signal found, converting to database format...');
      
      let confluenceSignal;
      try {
        // Convert master signal to database format with enhanced error handling
        confluenceSignal = convertMasterSignalToDatabase(signalAnalysis);
      } catch (conversionError) {
        console.error('❌ Signal conversion failed:', (conversionError as Error).message);
        
        // Phase 2: Log conversion failures for monitoring
        await supabase.from('system_health').insert({
          function_name: 'convert-master-signal',
          status: 'error',
          error_message: `Signal conversion failed: ${(conversionError as Error).message}`,
          execution_time_ms: Date.now() - startTime,
          processed_items: 0
        });
        
        status = 'error';
        errorMessage = `Signal conversion failed: ${(conversionError as Error).message}`;
        confluenceSignal = null;
      }
      
      // **FIX 1: Check master_signals instead of trading_signals for duplicates**
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: recentSignals } = await supabase
        .from('master_signals')
        .select('signal_type, confluence_score')
        .eq('symbol', 'EUR/USD')
        .eq('signal_type', confluenceSignal.signal_type)
        .gte('created_at', thirtyMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1);

      // Only create signal if conversion was successful and no similar recent signal exists
      const shouldCreateSignal = confluenceSignal && (!recentSignals?.length || 
        confluenceSignal.confluence_score > (recentSignals[0].confluence_score + 10));

      if (shouldCreateSignal) {
        // **PHASE 1 FIX: Store directly into master_signals table**
        console.log(`🎯 Storing ${confluenceSignal.signal_type.toUpperCase()} signal (Score: ${confluenceSignal.confluence_score})`);
        
        try {
          // **CRITICAL FIX: Get fresh market data for accurate entry price**
          const { data: freshMarketData } = await supabase
            .from('market_data_feed')
            .select('price, timestamp')
            .eq('symbol', 'EUR/USD')
            .lte('timestamp', new Date().toISOString()) // CRITICAL FIX: Prevent future timestamps
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();
          
          // Override entry price with REAL current market price
          if (freshMarketData) {
            const freshPrice = freshMarketData.price;
            const dataAge = Date.now() - new Date(freshMarketData.timestamp).getTime();
            
            console.log(`🔄 Updating entry price from ${confluenceSignal.entry_price.toFixed(5)} to fresh market ${freshPrice.toFixed(5)} (${dataAge}ms old)`);
            
            // Update all price-dependent values with fresh price
            const originalEntry = confluenceSignal.entry_price;
            const priceRatio = freshPrice / originalEntry;
            
            confluenceSignal.entry_price = freshPrice;
            confluenceSignal.stop_loss = confluenceSignal.signal_type === 'buy'
              ? freshPrice - (originalEntry - confluenceSignal.stop_loss)
              : freshPrice + (confluenceSignal.stop_loss - originalEntry);
            confluenceSignal.take_profit = confluenceSignal.signal_type === 'buy'
              ? freshPrice + (confluenceSignal.take_profit - originalEntry)
              : freshPrice - (originalEntry - confluenceSignal.take_profit);
          } else {
            console.warn('⚠️ No fresh tick data available - using candle price (may be stale!)');
          }
          
          // **CRITICAL FIX: Generate proper UUID instead of using string ID**
          const analysisId = crypto.randomUUID();
          
          // Insert master signal directly into master_signals table
          const { data: masterSignalData, error: masterSignalError } = await supabase
            .from('master_signals')
            .insert({
              analysis_id: analysisId,
              symbol: confluenceSignal.pair,
              timeframe: '15m',
              signal_type: confluenceSignal.signal_type,
              final_confidence: confluenceSignal.confidence, // Keep in 0-1 range (database constraint)
              final_strength: confluenceSignal.strength,
              confluence_score: confluenceSignal.confluence_score,
              recommended_entry: confluenceSignal.entry_price,
              recommended_stop_loss: confluenceSignal.stop_loss,
              recommended_take_profit: confluenceSignal.take_profit,
              recommended_lot_size: 0.01,
              risk_reward_ratio: confluenceSignal.risk_reward_ratio,
              contributing_modules: confluenceSignal.factors?.map((f: any) => f.name) || [],
              modular_signal_ids: [],
              fusion_algorithm: 'bayesian_hierarchical',
              fusion_parameters: {
                reasoning: confluenceSignal.description,
                risk_reward_ratio: confluenceSignal.risk_reward_ratio,
                factors: confluenceSignal.factors
              },
              market_data_snapshot: {
                price: confluenceSignal.entry_price,
                volatility: 'normal',
                trend: confluenceSignal.signal_type,
                session: 'london',
                timestamp: new Date().toISOString(),
                // Store regime details in snapshot since columns don't exist
                regime_strength: regimeDetection.strength,
                regime_confidence: regimeDetection.confidence
              },
              // ✅ FIX #1: Save market regime (regime_strength/confidence stored in market_data_snapshot)
              market_regime: regime,
              status: 'pending', // Signal awaits execution evaluation
              rejection_reason: null
            })
            .select()
            .single();

          if (masterSignalError) {
            console.error('❌ Master signal INSERT failed:', masterSignalError);
            status = 'error';
            errorMessage = masterSignalError.message;
          } else {
            console.log(`✅ Master signal stored: ${masterSignalData.id}`);
            
            // **PHASE 2 FIX: Calculate and update signal quality score**
            try {
              const { data: qualityScore, error: qualityError } = await supabase
                .rpc('calculate_trade_quality_score', {
                  p_signal_id: masterSignalData.id,
                  p_confluence_score: confluenceSignal.confluence_score,
                  p_market_regime: confluenceSignal.market_regime || 'unknown',
                  p_volatility_percentile: 50 // Default, can be enhanced later
                });

              if (qualityError) {
                console.error('⚠️ Quality score calculation failed:', qualityError);
              } else {
                // Update master signal with quality score
                const { error: updateError } = await supabase
                  .from('master_signals')
                  .update({ signal_quality_score: qualityScore })
                  .eq('id', masterSignalData.id);

                if (updateError) {
                  console.error('⚠️ Quality score update failed:', updateError);
                } else {
                  console.log(`📊 Signal quality score: ${qualityScore}`);
                }
              }
            } catch (scoreError) {
              console.error('⚠️ Quality scoring error:', scoreError);
            }
            
            processedItems = 1;

            // Store fusion analytics
            await supabase.from('master_signals_fusion').insert({
              analysis_id: analysisId,
              confidence_score: confluenceSignal.confidence,
              contributing_signals: confluenceSignal.factors || [],
              weighted_score: confluenceSignal.confluence_score,
              signal_weights: {
                technical: 0.4,
                fundamental: 0.2,
                sentiment: 0.2,
                pattern: 0.2
              },
              recommended_entry: confluenceSignal.entry_price,
              recommended_stop_loss: confluenceSignal.stop_loss,
              recommended_take_profit: confluenceSignal.take_profit,
              recommended_lot_size: 0.01,
              risk_assessment: {
                risk_level: confluenceSignal.confidence > 0.8 ? 'low' : 'medium',
                max_loss: Math.abs(confluenceSignal.entry_price - confluenceSignal.stop_loss),
                expected_profit: Math.abs(confluenceSignal.take_profit - confluenceSignal.entry_price)
              },
              market_conditions: {
                volatility: 'normal',
                trend: confluenceSignal.signal_type,
                momentum: confluenceSignal.strength > 7 ? 'strong' : 'moderate'
              },
              timeframe: '15m',
              fusion_decision: confluenceSignal.signal_type,
              fusion_reasoning: `Bayesian fusion of ${(confluenceSignal.factors || []).length} signals`,
              symbol: confluenceSignal.pair
            });

            console.log('✅ Master signal and fusion data stored successfully');
          }
        } catch (storageError) {
            console.error('⚠️ Failed to store master signal data:', storageError);
          }

          // Trigger trade execution for high-quality master signals
          if (signalAnalysis.masterSignal.confidence >= 0.75) {
            console.log('🚀 Triggering trade execution for high-quality master signal');
            
            try {
              const { data: executeResult } = await supabase.functions.invoke('execute-shadow-trades', {
                body: { 
                  signal_id: confluenceSignal.signal_id,
                  trigger: 'auto_execution_master_signal',
                  master_signal: signalAnalysis.masterSignal
                }
              });
              
              if (executeResult) {
                console.log('✅ Trade execution triggered successfully');
              }
            } catch (executeError) {
              console.warn('Error triggering trade execution:', executeError);
            }
          }
        }
      else {
        console.log(`⏭️ Skipping signal - similar recent signal exists`);
      }
    } else if (signalAnalysis?.rejectionReason) {
      console.log(`📊 Signal rejected: ${signalAnalysis.rejectionReason}`);
      
      // Log detailed rejection analysis
      await supabase.from('signal_rejection_logs').insert({
        reason: signalAnalysis.rejectionReason,
        signal_type: 'master_signal_analysis',
        factors_count: signalAnalysis.modularResults?.allSignals?.length || 0,
        value: signalAnalysis.masterSignal?.confidence || 0,
        threshold: 0.5
      });
    } else {
      console.log('📊 No qualifying master signal generated');
    }

    // Log system health with performance metrics
    const executionTime = Date.now() - startTime;
    
    // Phase 3: Enhanced system monitoring
    const performanceMetrics = {
      executionTime,
      signalsGenerated: processedItems,
      modularSignalsCount: signalAnalysis?.modularResults?.allSignals?.length || 0,
      fusionSuccess: !!signalAnalysis?.masterSignal,
      diagnosticsSuccess: !!signalAnalysis?.diagnostics,
      moduleErrors: signalAnalysis?.modularResults?.moduleErrors?.length || 0
    };
    
    await supabase.from('system_health').insert({
      function_name: 'generate-confluence-signals',
      execution_time_ms: executionTime,
      status,
      error_message: errorMessage || null,
      processed_items: processedItems,
      memory_usage_mb: (performance as any).memory?.usedJSHeapSize ? 
        Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : null
    });

    // Phase 4: Performance optimization - log detailed metrics for monitoring
    console.log(`📊 Performance Summary:`, performanceMetrics);
    
    // Alert if execution time is too high (> 30 seconds)
    if (executionTime > 30000) {
      console.warn(`⚠️ High execution time detected: ${executionTime}ms - consider optimization`);
    }
    
    // Alert if no signals generated
    if (processedItems === 0 && !errorMessage) {
      console.warn(`⚠️ No signals generated - check signal generation criteria`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Signal generation completed in ${executionTime}ms`,
        signal: signalAnalysis?.masterSignal ? {
          type: signalAnalysis.masterSignal.signal,
          confidence: signalAnalysis.masterSignal.confidence,
          strength: signalAnalysis.masterSignal.strength,
          recommendation: signalAnalysis.recommendation.action
        } : null,
        analysis: {
          modularSignals: signalAnalysis?.modularResults?.allSignals?.length || 0,
          fusionMethod: 'bayesian_hierarchical',
          diagnostics: signalAnalysis?.diagnostics || null
        },
        processedItems,
        executionTimeMs: executionTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ Error in generate-confluence-signals:', error);

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.from('system_health').insert({
        function_name: 'generate-confluence-signals',
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

// Enhanced Modular Signal Generation with Real Database Integration
async function generateModularSignals(supabase: any, candles: any[], pair: string, timeframe: string, regime: string) {
  console.log('🔧 Generating modular signals from real data...');
  
  const signals = [];
  const moduleErrors = [];
  
  // Technical signals with enhanced error handling
  try {
    const technicalSignals = await generateTechnicalSignals(candles, pair, timeframe, supabase);
    if (technicalSignals?.length > 0) {
      signals.push(...technicalSignals);
      console.log(`✅ Generated ${technicalSignals.length} technical signals`);
    }
  } catch (error) {
    console.error('Error generating technical signals:', error);
    moduleErrors.push({ module: 'technical', error: (error as Error).message });
    // Add fallback technical signal
    signals.push(generateFallbackSignal('technical_fallback', candles, pair, timeframe));
  }

  // Fundamental signals with enhanced error handling
  try {
    const fundamentalSignals = await generateFundamentalSignals(candles, pair, timeframe, supabase);
    if (fundamentalSignals?.length > 0) {
      signals.push(...fundamentalSignals);
      console.log(`✅ Generated ${fundamentalSignals.length} fundamental signals`);
    }
  } catch (error) {
    console.error('Error generating fundamental signals:', error);
    moduleErrors.push({ module: 'fundamental', error: (error as Error).message });
    // Add fallback fundamental signal
    signals.push(generateFallbackSignal('fundamental_fallback', candles, pair, timeframe));
  }

  // Sentiment signals with enhanced error handling
  try {
    const sentimentSignals = await generateSentimentSignals(candles, pair, timeframe, supabase, regime);
    if (sentimentSignals?.length > 0) {
      signals.push(...sentimentSignals);
      console.log(`✅ Generated ${sentimentSignals.length} sentiment signals`);
    }
  } catch (error) {
    console.error('Error generating sentiment signals:', error);
    moduleErrors.push({ module: 'sentiment', error: (error as Error).message });
    // Add fallback sentiment signal
    signals.push(generateFallbackSignal('sentiment_fallback', candles, pair, timeframe));
  }

  // Multi-timeframe signals with enhanced error handling
  try {
    const multiTimeframeSignals = await generateMultiTimeframeSignals(candles, pair, timeframe, supabase);
    if (multiTimeframeSignals?.length > 0) {
      signals.push(...multiTimeframeSignals);
      console.log(`✅ Generated ${multiTimeframeSignals.length} multi-timeframe signals`);
    }
  } catch (error) {
    console.error('Error generating multi-timeframe signals:', error);
    moduleErrors.push({ module: 'multi_timeframe', error: (error as Error).message });
  }

  // Pattern signals with enhanced error handling
  try {
    const patternSignals = await generatePatternSignals(candles, pair, timeframe, supabase);
    if (patternSignals?.length > 0) {
      signals.push(...patternSignals);
      console.log(`✅ Generated ${patternSignals.length} pattern signals`);
    }
  } catch (error) {
    console.error('Error generating pattern signals:', error);
    moduleErrors.push({ module: 'pattern', error: (error as Error).message });
  }

  // Strategy signals with enhanced error handling
  try {
    const strategySignals = await generateStrategySignals(candles, pair, timeframe, supabase);
    if (strategySignals?.length > 0) {
      signals.push(...strategySignals);
      console.log(`✅ Generated ${strategySignals.length} strategy signals`);
    }
  } catch (error) {
    console.error('Error generating strategy signals:', error);
    moduleErrors.push({ module: 'strategy', error: (error as Error).message });
  }

  // Intermarket signals with enhanced error handling
  try {
    const intermarketSignals = await generateIntermarketSignals(supabase, pair, timeframe, regime, candles);
    if (intermarketSignals?.length > 0) {
      signals.push(...intermarketSignals);
      console.log(`✅ Generated ${intermarketSignals.length} intermarket signals`);
    }
  } catch (error) {
    console.error('Error generating intermarket signals:', error);
    moduleErrors.push({ module: 'intermarket', error: (error as Error).message });
  }

  // Log module errors for monitoring
  if (moduleErrors.length > 0) {
    console.warn(`⚠️ Module errors encountered:`, moduleErrors);
    try {
      await supabase.from('system_health').insert({
        function_name: 'generate-modular-signals',
        status: 'warning',
        error_message: `Module errors: ${moduleErrors.map(e => e.module).join(', ')}`,
        processed_items: signals.length
      });
    } catch (logError) {
      console.warn('Failed to log module errors:', logError);
    }
  }

  console.log(`📊 Total modular signals generated: ${signals.length}`);
  return {
    allSignals: signals,
    technicalCount: signals.filter(s => s.source?.includes('technical')).length,
    fundamentalCount: signals.filter(s => s.source?.includes('fundamental')).length,
    sentimentCount: signals.filter(s => s.source?.includes('sentiment')).length,
    patternCount: signals.filter(s => s.source?.includes('pattern')).length,
    multiTimeframeCount: signals.filter(s => s.source?.includes('timeframe')).length,
    strategyCount: signals.filter(s => s.source?.includes('strategy')).length,
    intermarketCount: signals.filter(s => s.source?.includes('intermarket')).length,
    moduleErrors,
    qualityMetrics: {
      dataFreshness: calculateDataFreshness(signals),
      signalDiversity: signals.length > 0 ? new Set(signals.map(s => s.source)).size / signals.length : 0,
      averageConfidence: signals.length > 0 ? signals.reduce((sum, s) => sum + (s.confidence || 0), 0) / signals.length : 0
    }
  };
}

// Enhanced Master Signal Analysis with Bayesian Fusion - FIX PARAMETER ORDER & ERROR HANDLING
async function generateMasterSignalAnalysis(supabase: any, candles: any[], pair: string, timeframe: string, regime: string, modularSignals: any) {
  console.log('🧠 Running enhanced Bayesian fusion with real data...');
  
  try {
    // Validate modular signals input
    if (!modularSignals || !Array.isArray(modularSignals.allSignals)) {
      console.warn('⚠️ Invalid modular signals input, using fallback');
      return generateFallbackMasterSignal(candles, pair, timeframe, regime);
    }

    // FIX: Correct parameter order for fuseSignalsWithBayesian
    const masterSignal = await fuseSignalsWithBayesian(modularSignals.allSignals, supabase);
    
    // Validate fusion result
    if (!masterSignal || (!masterSignal.signal && masterSignal.signal !== 'hold')) {
      console.warn('⚠️ Invalid fusion result, using fallback');
      return generateFallbackMasterSignal(candles, pair, timeframe, regime);
    }
    
    // **PHASE 2 FIX: Attach market regime to master signal**
    masterSignal.market_regime = regime;
    masterSignal.regime = regime; // Dual field for compatibility
    
    return masterSignal;
  } catch (error) {
    console.error('Error in enhanced Bayesian fusion:', error);
    
    // Log fusion error for monitoring
    try {
      await supabase.from('system_health').insert({
        function_name: 'fusion-bayesian',
        status: 'error',
        error_message: (error as Error).message,
        processed_items: modularSignals?.allSignals?.length || 0
      });
    } catch (logError) {
      console.warn('Failed to log fusion error:', logError);
    }
    
    // Return fallback master signal
    return generateFallbackMasterSignal(candles, pair, timeframe, regime);
  }
}

// Enhanced Diagnostics with Real Data - FIX PARAMETER ORDER
async function generateEnhancedDiagnostics(supabase: any, masterSignal: any, modularSignals: any, pair: string, timeframe: string) {
  console.log('🔍 Running enhanced diagnostics...');
  
  try {
    // FIX: Pass signals array correctly for diagnostics - remove extra parameter
    const diagnostics = await generateSignalDiagnostics(modularSignals?.allSignals || [], masterSignal, null);
    return diagnostics;
  } catch (error) {
    console.error('Error generating enhanced diagnostics:', error);
    return {
      dataQuality: 0.5,
      signalIntegrity: 0.5,
      marketConditions: 'unknown',
      recommendations: ['Error in diagnostics generation']
    };
  }
}

// Helper function to calculate data freshness
function calculateDataFreshness(signals: any[]): number {
  if (!signals.length) return 0;
  
  const now = Date.now();
  const avgAge = signals.reduce((sum, signal) => {
    const signalTime = new Date(signal.timestamp || signal.created_at || now).getTime();
    return sum + (now - signalTime);
  }, 0) / signals.length;
  
  // Convert to freshness score (higher = fresher)
  // Fresh data (< 1 hour) = 1.0, older data decreases exponentially
  const hoursOld = avgAge / (1000 * 60 * 60);
  return Math.max(0, Math.exp(-hoursOld));
}

// Legacy function removed - using enhanced version at line 540 with real database integration

// Convert master signal to database format - PHASE 1: FIX NULL HANDLING & VALIDATION
function convertMasterSignalToDatabase(analysis: CompleteSignalAnalysis): any {
  console.log('🔄 Converting master signal to database format...');
  
  // Phase 1: Comprehensive validation
  if (!analysis) {
    throw new Error('Analysis object is null or undefined');
  }
  
  const masterSignal = analysis.masterSignal;
  
  if (!masterSignal) {
    throw new Error('Master signal is null or undefined');
  }
  
  if (!masterSignal.signal || masterSignal.signal === 'hold') {
    throw new Error('No valid signal type found');
  }
  
  // Handle missing entryPrice - use current market price as fallback
  let currentPrice = masterSignal.entryPrice;
  
  if (!currentPrice && analysis.modularResults?.allSignals?.length > 0) {
    // Fallback: extract price from modular signals
    const signalWithPrice = analysis.modularResults.allSignals.find((s: any) => s.entryPrice || s.entry_price);
    currentPrice = signalWithPrice?.entryPrice || signalWithPrice?.entry_price;
  }
  
  if (!currentPrice) {
    // Last resort: use a reasonable default for EUR/USD
    currentPrice = 1.17; // Safe fallback for EUR/USD
    console.warn('⚠️ Using fallback price for signal conversion');
  }
  
  // **PHASE 2 FIX: Include market_regime from analysis**
  const marketRegime = masterSignal.market_regime || analysis.masterSignal?.regime || 'unknown';
  
  return {
    signal_id: `master_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    pair: analysis.pair,
    signal_type: masterSignal.signal,
    confluence_score: Math.round((masterSignal.confidence || 0.5) * 100),
    strength: Math.min(100, Math.max(0, Math.round((masterSignal.strength || 0.5) * 10))),
    confidence: masterSignal.confidence || 0.5,
    entry_price: currentPrice,
    stop_loss: masterSignal.stopLoss || currentPrice * 0.995,
    take_profit: masterSignal.takeProfit || currentPrice * 1.015,
    risk_reward_ratio: masterSignal.riskRewardRatio || 2.0,
    market_regime: marketRegime,  // **ADDED: Pass through market regime**
    description: masterSignal.reasoning || 'Master signal generated',
    alert_level: (masterSignal.confidence || 0.5) > 0.8 ? 'high' : 
                 (masterSignal.confidence || 0.5) > 0.6 ? 'medium' : 'low',
    factors: (masterSignal.contributingSignals || []).map((signal: any) => ({
      type: signal.source || 'unknown',
      name: signal.signal || 'hold',
      strength: signal.strength || 0.5,
      confidence: signal.confidence || 0.5,
      factors: signal.factors || []
    })),
    execution_reason: `Master signal analysis: ${analysis.recommendation?.action || 'WAIT'}`,
    was_executed: false
  };
}

async function generateConfluenceSignal(candles: any[], currentPrice: number): Promise<ConfluenceSignal | null> {
  // Initialize the Probabilistic Signal Engine inline
  const factors: ConfluenceFactor[] = [];

  // Calculate technical indicators
  const technicalIndicators = calculateTechnicalIndicators(candles);
  
  // Convert traditional factors to probabilistic format
  const probabilisticFactors: any[] = [];
  
  // Analyze indicators for confluence factors with probabilistic conversion
  technicalIndicators.forEach(indicator => {
    if (indicator.signal !== 'neutral' && indicator.strength > 3) {
      // Convert strength to probability
      const baseProbability = convertStrengthToProbability(indicator.strength, indicator.signal);
      const logOdds = Math.log(baseProbability / (1 - baseProbability));
      
      const factor = {
        type: 'technical',
        name: indicator.name,
        signal: indicator.signal,
        weight: getIndicatorWeight(indicator.name),
        strength: Math.min(10, Math.max(1, indicator.strength)),
        description: `${indicator.name}: ${indicator.value.toFixed(4)}`,
        price: indicator.value,
        probability: baseProbability,
        logOdds: logOdds,
        confidence: 0.7 + (indicator.strength / 20) // Confidence based on strength
      };
      
      factors.push(factor);
      probabilisticFactors.push(factor);
    }
  });

  // Analyze price action patterns with probabilistic conversion
  const priceActionFactors = analyzePriceAction(candles);
  priceActionFactors.forEach(factor => {
    const baseProbability = convertStrengthToProbability(factor.strength, factor.signal);
    const enhancedFactor = {
      ...factor,
      probability: baseProbability,
      logOdds: Math.log(baseProbability / (1 - baseProbability)),
      confidence: 0.6 // Pattern confidence
    };
    probabilisticFactors.push(enhancedFactor);
  });
  factors.push(...priceActionFactors);

  // Analyze market structure with probabilistic conversion
  const structureFactors = analyzeMarketStructure(candles);
  structureFactors.forEach(factor => {
    const baseProbability = convertStrengthToProbability(factor.strength, factor.signal);
    const enhancedFactor = {
      ...factor,
      probability: baseProbability,
      logOdds: Math.log(baseProbability / (1 - baseProbability)),
      confidence: 0.8 // High confidence in structure
    };
    probabilisticFactors.push(enhancedFactor);
  });
  factors.push(...structureFactors);

  // Bayesian Fusion of Probabilities
  const { combinedProbability, combinedLogOdds, entropy } = fuseProbabilities(probabilisticFactors);
  
  // Determine signal type based on probability
  const signalType: 'buy' | 'sell' | 'neutral' = 
    combinedProbability > 0.6 ? 'buy' : 
    combinedProbability < 0.4 ? 'sell' : 'neutral';
  
  console.log(`📊 Signal probability analysis: ${(combinedProbability * 100).toFixed(1)}% → ${signalType}`);
  
  if (signalType === 'neutral') {
    return null;
  }
  
  // Calculate Expected Returns and Net Edge
  const expectedReturn = currentPrice * 0.02; // 2% expected return
  const expectedLoss = currentPrice * 0.01; // 1% expected loss
  const tradingCosts = currentPrice * 0.0001; // 1 pip spread
  
  // NetEdge = p_combined * R_avg - (1 - p_combined) * L_avg - Cost_trade
  const netEdge = combinedProbability * expectedReturn - (1 - combinedProbability) * expectedLoss - tradingCosts;
  
  console.log(`📊 Net edge calculated: ${netEdge.toFixed(6)}`);

  // Calculate Kelly Fraction for position sizing
  const kellyFraction = calculateKellyFraction(combinedProbability, expectedReturn, expectedLoss);
  
  // Enhanced confluence score using probabilistic methods with regime awareness
  const baseScore = (Math.abs(combinedProbability - 0.5) * 2) * 100 * (1 - entropy);
  
  // Detect current market regime for score adjustment
  const currentRegime = detectMarketRegime(candles, [1, 1, 1]); // Simplified volume array
  let regimeMultiplier = 1.0;
  
  // Adjust score based on regime confidence and strength
  switch (currentRegime.type) {
    case 'trending':
      regimeMultiplier = 1.2; // Higher confidence in trending markets
      break;
    case 'ranging':
      regimeMultiplier = 0.9; // Lower confidence in ranging markets
      break;
    case 'shock':
      regimeMultiplier = 0.6; // Much lower confidence in shock regimes
      break;
    case 'news_driven':
      regimeMultiplier = 0.7; // Lower confidence during news events
      break;
    default:
      regimeMultiplier = 1.0;
  }
  
  const enhancedConfluenceScore = Math.min(100, Math.max(0, baseScore * regimeMultiplier));

  console.log(`📊 Confluence score calculated: ${enhancedConfluenceScore.toFixed(1)}`);

  // Use adaptive engine for signal evaluation
  const evaluation = await adaptiveEngine.evaluateSignal(
    probabilisticFactors,
    combinedProbability,
    entropy,
    netEdge,
    enhancedConfluenceScore,
    currentRegime.type,
    signalType
  );

  if (!evaluation.accepted) {
    console.log(`🚫 Signal rejected: ${evaluation.reason}`);
    return null;
  }
  console.log(`✅ Signal accepted by adaptive engine`);

  // Calculate risk metrics with Kelly-optimized sizing
  const riskMetrics = calculateRiskMetrics(currentPrice, signalType);

  const signalId = `prob_${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`🎯 Probabilistic signal generated: ${signalType.toUpperCase()} | Regime: ${currentRegime.type} | Probability: ${(combinedProbability * 100).toFixed(1)}% | Edge: ${netEdge.toFixed(6)} | Kelly: ${(kellyFraction * 100).toFixed(2)}%`);
  
  return {
    signal_id: signalId,
    pair: 'EUR/USD',
    signal_type: signalType,
    confluence_score: Math.round(enhancedConfluenceScore * 100) / 100,
    strength: Math.round(Math.abs(combinedProbability - 0.5) * 20), // 0-10 scale
    confidence: Math.min(1, 1 - entropy), // Lower entropy = higher confidence
    entry_price: currentPrice,
    stop_loss: riskMetrics.stopLoss,
    take_profit: riskMetrics.takeProfit,
    risk_reward_ratio: riskMetrics.riskReward,
    factors: factors.map(f => ({
      ...f,
      // Add probabilistic metadata to factors
      metadata: {
        probability: probabilisticFactors.find(pf => pf.name === f.name)?.probability || 0.5,
        logOdds: probabilisticFactors.find(pf => pf.name === f.name)?.logOdds || 0,
        netEdge: netEdge,
        kellyFraction: kellyFraction
      }
    })),
    description: `${signalType.toUpperCase()} signal | Regime: ${currentRegime.type} | Prob: ${(combinedProbability * 100).toFixed(1)}% | Edge: ${netEdge.toFixed(4)} | Kelly: ${(kellyFraction * 100).toFixed(1)}%`,
    alert_level: enhancedConfluenceScore > 70 ? 'high' : enhancedConfluenceScore > 50 ? 'medium' : 'low'
  };
}

function calculateTechnicalIndicators(candles: any[]): TechnicalIndicator[] {
  const indicators: TechnicalIndicator[] = [];
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  // RSI calculation
  const rsi = calculateRSI(closes, 14);
  if (rsi) {
    const rsiSignal = rsi < 30 ? 'buy' : rsi > 70 ? 'sell' : 'neutral';
    const rsiStrength = rsi < 30 ? (30 - rsi) / 3 : rsi > 70 ? (rsi - 70) / 3 : 0;
    
    indicators.push({
      name: 'RSI',
      signal: rsiSignal,
      strength: Math.min(10, Math.max(1, rsiStrength)),
      value: rsi
    });
  }

  // Moving Average analysis
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  if (sma20 && sma50) {
    const currentPrice = closes[closes.length - 1];
    const maSignal = sma20 > sma50 && currentPrice > sma20 ? 'buy' : 
                     sma20 < sma50 && currentPrice < sma20 ? 'sell' : 'neutral';
    
    indicators.push({
      name: 'Moving Average Trend',
      signal: maSignal,
      strength: maSignal === 'neutral' ? 3 : 6,
      value: sma20
    });
  }

  // Bollinger Bands
  const bb = calculateBollingerBands(closes, 20, 2);
  if (bb) {
    const currentPrice = closes[closes.length - 1];
    const bbSignal = currentPrice <= bb.lower ? 'buy' : 
                     currentPrice >= bb.upper ? 'sell' : 'neutral';
    
    if (bbSignal !== 'neutral') {
      indicators.push({
        name: 'Bollinger Bands',
        signal: bbSignal,
        strength: bbSignal === 'buy' ? (bb.lower - currentPrice) / bb.lower * 1000 :
                                      (currentPrice - bb.upper) / bb.upper * 1000,
        value: currentPrice
      });
    }
  }

  return indicators;
}

function analyzePriceAction(candles: any[]): ConfluenceFactor[] {
  const factors: ConfluenceFactor[] = [];
  
  if (candles.length < 5) return factors;

  const recent = candles.slice(-5);
  
  // Higher highs and higher lows pattern
  let bullishStructure = true;
  let bearishStructure = true;
  
  for (let i = 1; i < recent.length; i++) {
    if (recent[i].high <= recent[i-1].high || recent[i].low <= recent[i-1].low) {
      bullishStructure = false;
    }
    if (recent[i].high >= recent[i-1].high || recent[i].low >= recent[i-1].low) {
      bearishStructure = false;
    }
  }

  if (bullishStructure) {
    factors.push({
      type: 'pattern',
      name: 'Bullish Market Structure',
      signal: 'buy',
      weight: 8,
      strength: 7,
      description: 'Higher highs and higher lows pattern'
    });
  } else if (bearishStructure) {
    factors.push({
      type: 'pattern',
      name: 'Bearish Market Structure',
      signal: 'sell',
      weight: 8,
      strength: 7,
      description: 'Lower highs and lower lows pattern'
    });
  }

  return factors;
}

function analyzeMarketStructure(candles: any[]): ConfluenceFactor[] {
  const factors: ConfluenceFactor[] = [];
  
  if (candles.length < 20) return factors;

  const recent = candles.slice(-10);
  const previous = candles.slice(-20, -10);

  const recentHigh = Math.max(...recent.map(c => c.high));
  const recentLow = Math.min(...recent.map(c => c.low));
  const previousHigh = Math.max(...previous.map(c => c.high));
  const previousLow = Math.min(...previous.map(c => c.low));

  // Breakout analysis
  if (recentHigh > previousHigh) {
    factors.push({
      type: 'market_structure',
      name: 'Upside Breakout',
      signal: 'buy',
      weight: 7,
      strength: 6,
      description: 'Price breaking above recent highs',
      price: recentHigh
    });
  }

  if (recentLow < previousLow) {
    factors.push({
      type: 'market_structure',
      name: 'Downside Breakdown',
      signal: 'sell',
      weight: 7,
      strength: 6,
      description: 'Price breaking below recent lows',
      price: recentLow
    });
  }

  return factors;
}

// Utility functions for calculations
function calculateRSI(prices: number[], period: number): number | null {
  if (prices.length < period + 1) return null;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(0, change)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -change)) / period;
  }
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

function calculateBollingerBands(prices: number[], period: number, stdDev: number) {
  if (prices.length < period) return null;
  
  const sma = calculateSMA(prices, period)!;
  const slice = prices.slice(-period);
  const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
  const std = Math.sqrt(variance);
  
  return {
    upper: sma + (std * stdDev),
    middle: sma,
    lower: sma - (std * stdDev)
  };
}

function getIndicatorWeight(name: string): number {
  const weights: Record<string, number> = {
    'RSI': 8,
    'Moving Average Trend': 7,
    'Bollinger Bands': 9,
    'MACD': 8
  };
  return weights[name] || 5;
}

// ==================== PROBABILISTIC HELPER FUNCTIONS ====================

function convertStrengthToProbability(strength: number, signal: 'buy' | 'sell' | 'neutral'): number {
  // Convert strength (1-10) to probability (0.5-0.85 for buy, 0.5-0.15 for sell)
  const normalizedStrength = Math.max(1, Math.min(10, strength));
  
  if (signal === 'buy') {
    return 0.51 + (normalizedStrength - 1) * 0.034; // Maps 1-10 to 0.51-0.816
  } else if (signal === 'sell') {
    return 0.49 - (normalizedStrength - 1) * 0.034; // Maps 1-10 to 0.49-0.184
  }
  return 0.5; // Neutral
}

function fuseProbabilities(factors: any[]): { combinedProbability: number; combinedLogOdds: number; entropy: number } {
  if (factors.length === 0) {
    return { combinedProbability: 0.5, combinedLogOdds: 0, entropy: 1 };
  }

  // Decorrelate signals by reducing weight of similar factor types
  const typeGroups: Record<string, any[]> = {};
  factors.forEach(f => {
    if (!typeGroups[f.type]) typeGroups[f.type] = [];
    typeGroups[f.type].push(f);
  });

  // Weighted combination with decorrelation
  let weightedLogOdds = 0;
  let totalWeight = 0;

  Object.values(typeGroups).forEach(group => {
    const correlationPenalty = 1 / Math.sqrt(group.length); // Reduce correlation within groups
    
    group.forEach(factor => {
      const adjustedWeight = factor.weight * factor.confidence * correlationPenalty;
      weightedLogOdds += adjustedWeight * factor.logOdds;
      totalWeight += adjustedWeight;
    });
  });

  const combinedLogOdds = totalWeight > 0 ? weightedLogOdds / totalWeight : 0;
  const combinedProbability = 1 / (1 + Math.exp(-combinedLogOdds));

  // Calculate entropy: H(p) = -p*log2(p) - (1-p)*log2(1-p)
  const entropy = -combinedProbability * Math.log2(Math.max(0.001, combinedProbability)) - 
                 (1 - combinedProbability) * Math.log2(Math.max(0.001, 1 - combinedProbability));

  return { combinedProbability, combinedLogOdds, entropy };
}

function calculateKellyFraction(winProbability: number, expectedReturn: number, expectedLoss: number): number {
  // Kelly Criterion: f* = (p * b - q) / b
  // Where: p = win probability, q = loss probability, b = reward/risk ratio
  const lossProbability = 1 - winProbability;
  const rewardRiskRatio = Math.abs(expectedReturn / expectedLoss);
  
  const kelly = (winProbability * rewardRiskRatio - lossProbability) / rewardRiskRatio;
  
  // Cap Kelly at 25% for safety and ensure non-negative
  return Math.max(0, Math.min(0.25, kelly));
}

function detectMarketRegime(candles: any[], volume: number[]): { type: string; strength: number; confidence: number } {
  // Simplified regime detection for Edge Function
  const recent = candles.slice(-10);
  const prices = recent.map((c: any) => c.close);
  
  if (prices.length < 5) {
    return { type: 'ranging', strength: 0.5, confidence: 0.3 };
  }
  
  // Calculate volatility
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  const volatility = returns.length > 0 ? Math.sqrt(returns.reduce((sum, r) => sum + r*r, 0) / returns.length) : 0;
  
  // Calculate trend
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const trendStrength = Math.abs(lastPrice - firstPrice) / firstPrice;
  
  // Determine regime
  if (volatility > 0.003) {
    return { type: 'shock', strength: Math.min(1, volatility * 300), confidence: 0.8 };
  } else if (trendStrength > 0.008) {
    return { type: 'trending', strength: Math.min(1, trendStrength * 100), confidence: 0.7 };
  } else {
    return { type: 'ranging', strength: Math.min(1, (0.008 - trendStrength) * 100), confidence: 0.6 };
  }
}

function calculateConfluenceScore(factors: ConfluenceFactor[]): number {
  if (factors.length === 0) return 0;
  
  const buyFactors = factors.filter(f => f.signal === 'buy');
  const sellFactors = factors.filter(f => f.signal === 'sell');
  
  const buyScore = buyFactors.reduce((sum, f) => sum + (f.weight * f.strength), 0);
  const sellScore = sellFactors.reduce((sum, f) => sum + (f.weight * f.strength), 0);
  
  const netScore = Math.abs(buyScore - sellScore);
  const maxPossibleScore = Math.max(buyScore + sellScore, 100);
  
  return Math.min(100, (netScore / maxPossibleScore) * 100);
}

function determineOverallSignal(factors: ConfluenceFactor[]): 'buy' | 'sell' | 'neutral' {
  const buyScore = factors.filter(f => f.signal === 'buy').reduce((sum, f) => sum + f.weight, 0);
  const sellScore = factors.filter(f => f.signal === 'sell').reduce((sum, f) => sum + f.weight, 0);
  
  const threshold = 5;
  
  if (buyScore > sellScore + threshold) return 'buy';
  if (sellScore > buyScore + threshold) return 'sell';
  return 'neutral';
}

function calculateStrength(factors: ConfluenceFactor[], signal: string): number {
  const relevantFactors = factors.filter(f => f.signal === signal);
  if (relevantFactors.length === 0) return 5;
  
  const avgStrength = relevantFactors.reduce((sum, f) => sum + f.strength, 0) / relevantFactors.length;
  const factorBonus = Math.min(3, relevantFactors.length * 0.5);
  
  return Math.round(Math.min(10, avgStrength + factorBonus));
}

function calculateConfidence(factors: ConfluenceFactor[]): number {
  const factorCount = factors.length;
  const avgStrength = factors.reduce((sum, f) => sum + f.strength, 0) / Math.max(1, factorCount);
  
  const baseConfidence = avgStrength / 10;
  const factorBonus = Math.min(0.3, factorCount * 0.05);
  
  return Math.min(1, Math.round((baseConfidence + factorBonus) * 100) / 100);
}

function calculateRiskMetrics(entryPrice: number, signal: 'buy' | 'sell') {
  const riskPercent = 0.015; // 1.5% default risk
  const rewardRatio = 2; // 2:1 RR
  
  const stopLoss = signal === 'buy' 
    ? entryPrice * (1 - riskPercent)
    : entryPrice * (1 + riskPercent);
  
  const takeProfit = signal === 'buy'
    ? entryPrice * (1 + (riskPercent * rewardRatio))
    : entryPrice * (1 - (riskPercent * rewardRatio));
  
  return {
    stopLoss: Math.round(stopLoss * 100000) / 100000,
    takeProfit: Math.round(takeProfit * 100000) / 100000,
    riskReward: rewardRatio
  };
}

// Build complete analysis from all components
function buildCompleteAnalysis(
  modularResults: any, 
  fusionResults: any, 
  diagnostics: any, 
  pair: string, 
  timeframe: string
): CompleteSignalAnalysis {
  const timestamp = new Date().toISOString();
  
  if (!fusionResults || fusionResults.signal === 'hold') {
    return {
      success: false,
      timestamp,
      pair,
      timeframe,
      rejectionReason: `No valid signal generated: ${!fusionResults ? 'No fusion results' : 'Hold signal'}`,
      modularResults,
      fusionResults: fusionResults || null,
      diagnostics,
      performanceMetrics: {
        processingTimeMs: diagnostics.processingTime,
        activeModules: modularResults.activeModules,
        totalSignals: modularResults.totalSignals
      },
      qualityIndicators: {
        dataQuality: diagnostics.dataQuality || 0,
        signalDiversity: diagnostics.signalDiversity || 0,
        confidence: 0
      },
      recommendation: {
        action: 'WAIT',
        reasoning: 'No qualifying signals detected across analysis modules',
        nextActions: ['Wait for clearer market conditions', 'Check module configurations']
      }
    };
  }
  
  // Build master signal
  const masterSignal: MasterSignal = {
    signal: fusionResults.signal,
    probability: fusionResults.probability,
    confidence: fusionResults.confidence,
    strength: fusionResults.strength,
    entryPrice: fusionResults.entryPrice,
    stopLoss: fusionResults.stopLoss,
    takeProfit: fusionResults.takeProfit,
    riskRewardRatio: fusionResults.riskRewardRatio,
    kellyFraction: fusionResults.kellyFraction,
    entropy: fusionResults.entropy,
    consensusLevel: fusionResults.consensusLevel,
    reasoning: fusionResults.reasoning,
    warnings: fusionResults.warnings,
    contributingSignals: fusionResults.contributingSignals,
    qualityMetrics: {
      dataQuality: diagnostics.dataQuality || 0.5,
      signalReliability: fusionResults.confidence,
      marketAlignment: Math.max(0, 1 - fusionResults.entropy),
      diversification: Math.min(1, modularResults.allSignals.length / 5)
    }
  };
  
  // Determine recommendation
  const recommendation = generateRecommendation(masterSignal, diagnostics);
  
  return {
    success: true,
    timestamp,
    pair,
    timeframe,
    masterSignal,
    modularResults,
    fusionResults,
    diagnostics,
    performanceMetrics: {
      processingTimeMs: diagnostics.processingTime,
      activeModules: modularResults.activeModules,
      totalSignals: modularResults.totalSignals,
      fusionEfficiency: fusionResults.consensusLevel
    },
    qualityIndicators: {
      dataQuality: diagnostics.dataQuality || 0,
      signalDiversity: modularResults.allSignals.length > 1 ? 1 : 0,
      confidence: masterSignal.confidence,
      entropy: masterSignal.entropy
    },
    recommendation
  };
}

// Generate recommendation based on master signal quality
function generateRecommendation(masterSignal: MasterSignal, diagnostics: any): any {
  const { confidence, entropy, warnings } = masterSignal;
  const { dataQuality } = diagnostics;
  
  // High confidence, low entropy = TRADE
  if (confidence >= 0.75 && entropy <= 0.6 && dataQuality >= 0.7) {
    return {
      action: 'TRADE',
      reasoning: `High-quality signal with ${(confidence * 100).toFixed(1)}% confidence and low uncertainty`,
      nextActions: [
        'Execute trade with calculated position size',
        'Monitor signal performance',
        'Set alerts for stop-loss and take-profit levels'
      ]
    };
  }
  
  // Medium confidence = WAIT for better setup
  if (confidence >= 0.6 && entropy <= 0.75) {
    return {
      action: 'WAIT',
      reasoning: `Moderate signal quality - wait for better confirmation`,
      nextActions: [
        'Monitor for additional confirming signals',
        'Wait for entropy to decrease below 0.6',
        'Check for fundamental catalysts'
      ]
    };
  }
  
  // Low data quality = CHECK_DATA
  if (dataQuality < 0.5) {
    return {
      action: 'CHECK_DATA',
      reasoning: 'Poor data quality detected - verify system inputs',
      nextActions: [
        'Check market data feed connectivity',
        'Verify technical indicator calculations',
        'Review module error logs'
      ]
    };
  }
  
  // High entropy or warnings = REVIEW_SETUP
  if (entropy > 0.8 || warnings.length > 0) {
    return {
      action: 'REVIEW_SETUP',
      reasoning: `High uncertainty (${(entropy * 100).toFixed(1)}%) or system warnings detected`,
      nextActions: [
        'Review signal threshold configurations',
        'Check for conflicting module outputs',
        'Consider market regime adjustments'
      ]
    };
  }
  
  // Default fallback
  return {
    action: 'WAIT',
    reasoning: 'Signal quality below trading threshold',
    nextActions: [
      'Wait for clearer market conditions',
      'Monitor signal development',
      'Review system performance'
    ]
  };
}

// Build error analysis when master signal generation fails
function buildErrorAnalysis(errorMessage: string, pair: string, timeframe: string): CompleteSignalAnalysis {
  return {
    success: false,
    timestamp: new Date().toISOString(),
    pair,
    timeframe,
    rejectionReason: `Error in signal generation: ${errorMessage}`,
    modularResults: { allSignals: [], modulePerformance: [], totalSignals: 0, activeModules: 0 },
    fusionResults: null,
    diagnostics: { warnings: [errorMessage], recommendations: ['Check system logs', 'Verify data inputs'] },
    performanceMetrics: { processingTimeMs: 0, activeModules: 0, totalSignals: 0 },
    qualityIndicators: { dataQuality: 0, signalDiversity: 0, confidence: 0 },
    recommendation: {
      action: 'CHECK_DATA',
      reasoning: 'Critical error in signal generation pipeline',
      nextActions: ['Review system logs', 'Check data connectivity', 'Restart signal generation service']
    }
  };
}

// ===================== FALLBACK FUNCTIONS FOR ERROR HANDLING =====================

// Generate fallback signal when a module fails
function generateFallbackSignal(source: string, candles: any[], pair: string, timeframe: string): any {
  const currentPrice = candles[candles.length - 1]?.close || 1.17065;
  const prices = candles.map(c => c.close);
  const trend = prices[prices.length - 1] > prices[0] ? 'buy' : 'sell';
  
  return {
    source: source,
    timestamp: new Date(),
    pair,
    timeframe,
    signal: trend,
    confidence: 0.3, // Low confidence for fallback
    strength: 0.3,
    entryPrice: currentPrice,
    stopLoss: currentPrice * (trend === 'buy' ? 0.995 : 1.005),
    takeProfit: currentPrice * (trend === 'buy' ? 1.01 : 0.99),
    factors: [
      { name: 'fallback_trend', value: 0.3, weight: 1.0, contribution: 0.3 }
    ]
  };
}

// Generate fallback master signal when fusion fails
function generateFallbackMasterSignal(candles: any[], pair: string, timeframe: string, regime: string = 'unknown'): any {
  const currentPrice = candles[candles.length - 1]?.close || 1.17065;
  const prices = candles.map(c => c.close);
  
  // Simple trend analysis
  const shortMA = prices.slice(-5).reduce((a, b) => a + b) / 5;
  const longMA = prices.slice(-20).reduce((a, b) => a + b) / 20;
  const signal = shortMA > longMA ? 'buy' : 'sell';
  
  return {
    signal: signal,
    probability: 0.5,
    confidence: 0.4, // Low confidence for fallback
    strength: 0.4,
    entryPrice: currentPrice,
    stopLoss: currentPrice * (signal === 'buy' ? 0.99 : 1.01),
    takeProfit: currentPrice * (signal === 'buy' ? 1.02 : 0.98),
    riskRewardRatio: 2.0,
    kellyFraction: 0.02,
    entropy: 0.7,
    consensusLevel: 0.3,
    market_regime: regime,  // **PHASE 2 FIX: Include regime in fallback**
    regime: regime,  // Dual field for compatibility
    reasoning: 'Fallback signal generated due to system error - basic trend analysis',
    warnings: ['System fallback mode active', 'Reduced signal reliability'],
    contributingSignals: [generateFallbackSignal('fallback_technical', candles, pair, timeframe)],
    qualityMetrics: {
      dataQuality: 0.3,
      signalReliability: 0.3,
      marketAlignment: 0.5,
      diversification: 0.2
    }
  };
}