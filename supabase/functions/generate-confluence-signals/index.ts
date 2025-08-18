import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    if (dataError || !marketData || marketData.length < 20) {
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
  const factors: ConfluenceFactor[] = [];

  // Calculate technical indicators
  const technicalIndicators = calculateTechnicalIndicators(candles);
  
  // Analyze indicators for confluence factors
  technicalIndicators.forEach(indicator => {
    if (indicator.signal !== 'neutral' && indicator.strength > 3) {
      factors.push({
        type: 'technical',
        name: indicator.name,
        signal: indicator.signal,
        weight: getIndicatorWeight(indicator.name),
        strength: Math.min(10, Math.max(1, indicator.strength)),
        description: `${indicator.name}: ${indicator.value.toFixed(4)}`,
        price: indicator.value
      });
    }
  });

  // Analyze price action patterns
  const priceActionFactors = analyzePriceAction(candles);
  factors.push(...priceActionFactors);

  // Analyze market structure
  const structureFactors = analyzeMarketStructure(candles);
  factors.push(...structureFactors);

  // Calculate confluence score
  const confluenceScore = calculateConfluenceScore(factors);
  const overallSignal = determineOverallSignal(factors);

  if (overallSignal === 'neutral' || confluenceScore < 15) {
    return null;
  }

  // Calculate risk metrics
  const riskMetrics = calculateRiskMetrics(currentPrice, overallSignal);

  const signalId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    signal_id: signalId,
    pair: 'EUR/USD',
    signal_type: overallSignal,
    confluence_score: Math.round(confluenceScore * 100) / 100,
    strength: calculateStrength(factors, overallSignal),
    confidence: calculateConfidence(factors),
    entry_price: currentPrice,
    stop_loss: riskMetrics.stopLoss,
    take_profit: riskMetrics.takeProfit,
    risk_reward_ratio: riskMetrics.riskReward,
    factors,
    description: `${overallSignal.toUpperCase()} signal with ${factors.length} confluence factors`,
    alert_level: confluenceScore > 70 ? 'high' : confluenceScore > 40 ? 'medium' : 'low'
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