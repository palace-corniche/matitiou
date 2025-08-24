import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AdaptiveSignalEngine } from "./adaptiveSignalEngine.ts";

// Initialize adaptive engine
const adaptiveEngine = new AdaptiveSignalEngine();

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

    console.log('🔄 Starting confluence signal generation...');

    // Fetch recent market data
    const { data: marketData, error: dataError } = await supabase
      .from('market_data_feed')
      .select('*')
      .eq('symbol', 'EUR/USD')
      .eq('timeframe', '15m')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (dataError || !marketData || marketData.length < 10) {
      throw new Error(`Insufficient market data: ${dataError?.message || 'Not enough candles'}`);
    }

    console.log(`📊 Analyzing ${marketData.length} candles`);

    // Convert to candle format for analysis
    const candles = marketData.reverse().map(d => ({
      time: d.timestamp,
      open: parseFloat(d.open_price.toString()),
      high: parseFloat(d.high_price.toString()),
      low: parseFloat(d.low_price.toString()),
      close: parseFloat(d.price.toString()),
      volume: d.volume
    }));

    const currentPrice = candles[candles.length - 1].close;

    // Generate confluence signal
    const confluenceSignal = await generateConfluenceSignal(candles, currentPrice);

    if (confluenceSignal && confluenceSignal.signal_type !== 'neutral') {
      // Check if similar signal was generated recently (last 30 minutes)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: recentSignals } = await supabase
        .from('trading_signals')
        .select('signal_type, confluence_score')
        .eq('pair', 'EUR/USD')
        .eq('signal_type', confluenceSignal.signal_type)
        .gte('created_at', thirtyMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1);

      // Only create signal if no similar recent signal or this one is significantly stronger
      const shouldCreateSignal = !recentSignals?.length || 
        confluenceSignal.confluence_score > (recentSignals[0].confluence_score + 10);

      if (shouldCreateSignal) {
        const { error: insertError } = await supabase
          .from('trading_signals')
          .insert(confluenceSignal);

        if (insertError) {
          console.error('Error inserting signal:', insertError);
          status = 'error';
          errorMessage = insertError.message;
        } else {
          console.log(`🎯 Generated ${confluenceSignal.signal_type.toUpperCase()} signal (Score: ${confluenceSignal.confluence_score})`);
          processedItems = 1;

          // Trigger trade execution for qualifying signals
          if (confluenceSignal.confluence_score >= 30) {
            console.log('🚀 Triggering trade execution for high-quality signal');
            
            // Call execute-shadow-trades function
            try {
              const executeUrl = `${supabaseUrl}/functions/v1/execute-shadow-trades`;
              const executeResponse = await fetch(executeUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  signal_id: confluenceSignal.signal_id,
                  trigger: 'auto_execution'
                })
              });

              if (!executeResponse.ok) {
                console.warn('Failed to trigger trade execution:', executeResponse.statusText);
              } else {
                console.log('✅ Trade execution triggered successfully');
              }
            } catch (executeError) {
              console.warn('Error triggering trade execution:', executeError);
            }
          }
        }
      } else {
        console.log(`⏭️  Skipping signal - similar recent signal exists`);
      }
    } else {
      console.log('📊 No qualifying confluence signal generated');
    }

    // Log system health
    const executionTime = Date.now() - startTime;
    await supabase.from('system_health').insert({
      function_name: 'generate-confluence-signals',
      execution_time_ms: executionTime,
      status,
      error_message: errorMessage || null,
      processed_items: processedItems,
      memory_usage_mb: (performance as any).memory?.usedJSHeapSize ? 
        Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : null
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Signal generation completed in ${executionTime}ms`,
        signal: confluenceSignal ? {
          type: confluenceSignal.signal_type,
          score: confluenceSignal.confluence_score,
          strength: confluenceSignal.strength
        } : null,
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
  
  // Further relaxed entropy filter for calibration (increased to 0.9)
  const maxEntropy = 0.9;
  if (entropy > maxEntropy) {
    console.log(`🚫 Signal rejected due to high entropy: ${entropy.toFixed(3)} > ${maxEntropy}`);
    return null;
  }
  console.log(`✅ Entropy check passed: ${entropy.toFixed(3)} <= ${maxEntropy}`);
  
  // Further relaxed probability thresholds for calibration (widened to 0.6/0.4)
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
  
  // Relaxed edge requirement (allow very small positive edge for calibration)
  if (netEdge <= -0.0001) { // Allow even tiny positive edge instead of strict positive
    console.log(`🚫 Signal rejected due to negative edge: ${netEdge.toFixed(6)}`);
    return null;
  }
  console.log(`✅ Edge check passed: ${netEdge.toFixed(6)} > -0.0001`);

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

  // Dramatically relaxed confluence threshold for calibration (reduced to 10)
  if (enhancedConfluenceScore < 10) {
    console.log(`🚫 Signal rejected due to low confluence: ${enhancedConfluenceScore.toFixed(1)} < 10`);
    return null;
  }
  console.log(`✅ Confluence check passed: ${enhancedConfluenceScore.toFixed(1)} >= 10`);

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