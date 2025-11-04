import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IntelligentTargets {
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  take_profit_3: number;
  confidence: number;
  reasoning: string;
  key_levels: {
    type: string;
    price: number;
    strength: number;
  }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, trade_type, entry_price } = await req.json();

    if (!symbol || !trade_type || !entry_price) {
      throw new Error("Missing required parameters");
    }

    console.log(`🎯 Calculating intelligent targets for ${trade_type.toUpperCase()} ${symbol} @ ${entry_price}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all relevant data in parallel
    const [
      { data: fibZones },
      { data: harmonicPRZ },
      { data: elliottWaves },
      { data: marketData },
      { data: patternSignals }
    ] = await Promise.all([
      supabase.from("fibonacci_confluence_zones")
        .select("*")
        .eq("symbol", symbol)
        .eq("status", "active")
        .order("confluence_score", { ascending: false })
        .limit(10),
      
      supabase.from("harmonic_prz")
        .select("*")
        .eq("symbol", symbol)
        .eq("status", "active")
        .order("pattern_score", { ascending: false })
        .limit(10),
      
      supabase.from("elliott_waves")
        .select("*")
        .eq("symbol", symbol)
        .eq("status", "developing")
        .order("confidence", { ascending: false })
        .limit(5),
      
      supabase.from("market_data_feed")
        .select("*")
        .eq("symbol", symbol)
        .eq("timeframe", "15m")
        .order("timestamp", { ascending: false })
        .limit(100),
      
      supabase.from("pattern_signals")
        .select("*")
        .eq("symbol", symbol)
        .eq("status", "pending")
        .order("confidence", { ascending: false })
        .limit(10)
    ]);

    console.log(`📊 Fetched data: ${fibZones?.length || 0} fib zones, ${harmonicPRZ?.length || 0} harmonic PRZ, ${elliottWaves?.length || 0} waves`);

    // Calculate intelligent targets
    const targets = calculateTargets({
      symbol,
      tradeType: trade_type,
      entryPrice: entry_price,
      fibZones: fibZones || [],
      harmonicPRZ: harmonicPRZ || [],
      elliottWaves: elliottWaves || [],
      marketData: marketData || [],
      patternSignals: patternSignals || []
    });

    console.log(`✅ Calculated targets: SL=${targets.stop_loss}, TP1=${targets.take_profit_1}, TP2=${targets.take_profit_2}, TP3=${targets.take_profit_3}`);
    console.log(`   Confidence: ${targets.confidence}% | Key levels: ${targets.key_levels.length}`);

    return new Response(JSON.stringify(targets), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function calculateTargets(params: any): IntelligentTargets {
  const { tradeType, entryPrice, fibZones, harmonicPRZ, elliottWaves, marketData } = params;
  const isBuy = tradeType === "buy";
  
  const keyLevels: any[] = [];
  
  // 1. Extract Fibonacci confluence zones
  fibZones.forEach((zone: any) => {
    const distance = Math.abs(zone.zone_price - entryPrice);
    const pipDistance = distance / 0.0001;
    
    if (pipDistance > 10 && pipDistance < 200) { // Relevant range
      keyLevels.push({
        type: "fibonacci",
        price: zone.zone_price,
        strength: zone.confluence_score,
        distance: pipDistance,
        zone_type: zone.zone_type
      });
    }
  });
  
  // 2. Extract Harmonic PRZ levels
  harmonicPRZ.forEach((prz: any) => {
    keyLevels.push({
      type: "harmonic_prz",
      price: (prz.prz_low + prz.prz_high) / 2,
      strength: prz.pattern_score || 70,
      distance: Math.abs(((prz.prz_low + prz.prz_high) / 2) - entryPrice) / 0.0001,
      pattern: prz.pattern
    });
  });
  
  // 3. Extract Elliott Wave targets
  elliottWaves.forEach((wave: any) => {
    if (wave.target_1) {
      keyLevels.push({
        type: "elliott_wave",
        price: wave.target_1,
        strength: wave.confidence * 100,
        distance: Math.abs(wave.target_1 - entryPrice) / 0.0001,
        wave: wave.wave_label
      });
    }
    if (wave.target_2) {
      keyLevels.push({
        type: "elliott_wave",
        price: wave.target_2,
        strength: wave.confidence * 80,
        distance: Math.abs(wave.target_2 - entryPrice) / 0.0001,
        wave: wave.wave_label
      });
    }
  });
  
  // 4. Calculate swing highs/lows from market data
  const swingPoints = findSwingPoints(marketData, entryPrice, isBuy);
  swingPoints.forEach(point => keyLevels.push(point));
  
  // 5. Calculate volatility-adjusted zones
  const atr = calculateATR(marketData);
  const volatilityZones = calculateVolatilityZones(entryPrice, atr, isBuy);
  volatilityZones.forEach(zone => keyLevels.push(zone));
  
  // Sort and filter key levels
  const relevantLevels = keyLevels
    .filter(l => isBuy ? l.price !== entryPrice : l.price !== entryPrice)
    .sort((a, b) => b.strength - a.strength);
  
  // Calculate optimal SL (protection zone)
  const slCandidates = relevantLevels.filter(l => 
    isBuy ? l.price < entryPrice : l.price > entryPrice
  );
  
  let stopLoss: number;
  if (slCandidates.length > 0) {
    // Use strongest level below entry (buy) or above entry (sell)
    const bestSL = slCandidates
      .sort((a, b) => Math.abs(a.distance) - Math.abs(b.distance))
      .find(l => l.distance > 15 && l.distance < 50); // 15-50 pips range
    
    stopLoss = bestSL?.price || (isBuy ? entryPrice - (25 * 0.0001) : entryPrice + (25 * 0.0001));
  } else {
    stopLoss = isBuy ? entryPrice - (25 * 0.0001) : entryPrice + (25 * 0.0001);
  }
  
  // Calculate optimal TP levels (profit zones)
  const tpCandidates = relevantLevels.filter(l => 
    isBuy ? l.price > entryPrice : l.price < entryPrice
  );
  
  let tp1: number, tp2: number, tp3: number;
  
  if (tpCandidates.length >= 3) {
    // Use strongest levels
    const sorted = tpCandidates
      .filter(l => l.distance > 20 && l.distance < 300)
      .sort((a, b) => a.distance - b.distance);
    
    tp1 = sorted[0]?.price || (isBuy ? entryPrice + (40 * 0.0001) : entryPrice - (40 * 0.0001));
    tp2 = sorted[Math.floor(sorted.length / 2)]?.price || (isBuy ? entryPrice + (80 * 0.0001) : entryPrice - (80 * 0.0001));
    tp3 = sorted[sorted.length - 1]?.price || (isBuy ? entryPrice + (150 * 0.0001) : entryPrice - (150 * 0.0001));
  } else {
    // Fallback to R:R based targets
    const riskPips = Math.abs(entryPrice - stopLoss) / 0.0001;
    tp1 = isBuy ? entryPrice + (riskPips * 1.5 * 0.0001) : entryPrice - (riskPips * 1.5 * 0.0001);
    tp2 = isBuy ? entryPrice + (riskPips * 2.5 * 0.0001) : entryPrice - (riskPips * 2.5 * 0.0001);
    tp3 = isBuy ? entryPrice + (riskPips * 4.0 * 0.0001) : entryPrice - (riskPips * 4.0 * 0.0001);
  }
  
  // Build reasoning
  const slType = slCandidates[0]?.type || "volatility";
  const tp1Type = tpCandidates[0]?.type || "risk_reward";
  const tp2Type = tpCandidates[Math.floor(tpCandidates.length / 2)]?.type || "risk_reward";
  const tp3Type = tpCandidates[tpCandidates.length - 1]?.type || "risk_reward";
  
  const reasoning = `SL at ${slType} zone (${Math.abs(entryPrice - stopLoss) / 0.0001} pips). ` +
    `TP1 at ${tp1Type} (${Math.abs(entryPrice - tp1) / 0.0001} pips), ` +
    `TP2 at ${tp2Type} (${Math.abs(entryPrice - tp2) / 0.0001} pips), ` +
    `TP3 at ${tp3Type} (${Math.abs(entryPrice - tp3) / 0.0001} pips). ` +
    `${relevantLevels.length} key levels analyzed.`;
  
  const confidence = Math.min(95, 50 + (relevantLevels.length * 5));
  
  return {
    stop_loss: parseFloat(stopLoss.toFixed(5)),
    take_profit_1: parseFloat(tp1.toFixed(5)),
    take_profit_2: parseFloat(tp2.toFixed(5)),
    take_profit_3: parseFloat(tp3.toFixed(5)),
    confidence,
    reasoning,
    key_levels: relevantLevels.slice(0, 10).map(l => ({
      type: l.type,
      price: parseFloat(l.price.toFixed(5)),
      strength: Math.round(l.strength)
    }))
  };
}

function findSwingPoints(marketData: any[], entryPrice: number, isBuy: boolean): any[] {
  const swings: any[] = [];
  
  if (marketData.length < 20) return swings;
  
  // Find recent swing highs and lows
  for (let i = 5; i < marketData.length - 5; i++) {
    const candle = marketData[i];
    const prev = marketData.slice(i - 5, i);
    const next = marketData.slice(i + 1, i + 6);
    
    // Swing high
    const isSwingHigh = prev.every(c => c.high_price <= candle.high_price) &&
                        next.every(c => c.high_price <= candle.high_price);
    
    if (isSwingHigh) {
      swings.push({
        type: "swing_high",
        price: candle.high_price,
        strength: 60,
        distance: Math.abs(candle.high_price - entryPrice) / 0.0001
      });
    }
    
    // Swing low
    const isSwingLow = prev.every(c => c.low_price >= candle.low_price) &&
                       next.every(c => c.low_price >= candle.low_price);
    
    if (isSwingLow) {
      swings.push({
        type: "swing_low",
        price: candle.low_price,
        strength: 60,
        distance: Math.abs(candle.low_price - entryPrice) / 0.0001
      });
    }
  }
  
  return swings;
}

function calculateATR(marketData: any[], period: number = 14): number {
  if (marketData.length < period) return 0.0004; // Default ATR
  
  const trs: number[] = [];
  
  for (let i = 1; i < Math.min(period + 1, marketData.length); i++) {
    const high = marketData[i].high_price;
    const low = marketData[i].low_price;
    const prevClose = marketData[i - 1].price;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    
    trs.push(tr);
  }
  
  return trs.reduce((sum, tr) => sum + tr, 0) / trs.length;
}

function calculateVolatilityZones(entryPrice: number, atr: number, isBuy: boolean): any[] {
  return [
    {
      type: "volatility_zone",
      price: isBuy ? entryPrice - (atr * 1.5) : entryPrice + (atr * 1.5),
      strength: 50,
      distance: (atr * 1.5) / 0.0001
    },
    {
      type: "volatility_zone",
      price: isBuy ? entryPrice + (atr * 2) : entryPrice - (atr * 2),
      strength: 50,
      distance: (atr * 2) / 0.0001
    },
    {
      type: "volatility_zone",
      price: isBuy ? entryPrice + (atr * 3.5) : entryPrice - (atr * 3.5),
      strength: 50,
      distance: (atr * 3.5) / 0.0001
    }
  ];
}
