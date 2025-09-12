import { supabase } from '@/integrations/supabase/client';

export interface ElliottWaveData {
  currentWave: string;
  waveCount: number;
  impulseOrCorrection: 'impulse' | 'correction';
  targetLevels: number[];
  confidence: number;
}

export interface HarmonicPatternData {
  patternType: string;
  completion: number; // 0-1 scale
  prz: { min: number; max: number }; // Potential Reversal Zone
  targets: number[];
  validity: boolean;
}

export interface OrderFlowData {
  volumeProfile: {
    poc: number; // Point of Control
    vah: number; // Value Area High
    val: number; // Value Area Low
  };
  delta: number; // Buy volume - Sell volume
  cumulativeDelta: number;
  liquidityLevels: { price: number; strength: number }[];
  institutionalFlow: 'buying' | 'selling' | 'neutral';
}

export interface SpecializedSignal {
  moduleId: string;
  symbol: string;
  timeframe: string;
  signalType: 'buy' | 'sell';
  confidence: number;
  strength: number;
  weight: number;
  triggerPrice: number;
  suggestedEntry: number;
  suggestedStopLoss: number;
  suggestedTakeProfit: number;
  elliottWave: ElliottWaveData;
  harmonicPattern: HarmonicPatternData | null;
  orderFlow: OrderFlowData;
  primaryPattern: string;
  patternMaturity: number;
}

export class SpecializedAnalysisAdapter {
  private moduleId = 'specialized_analysis';
  private moduleVersion = '1.0.0';

  async analyze(symbol: string = 'EUR/USD', timeframe: string = '15m'): Promise<SpecializedSignal | null> {
    try {
      // Get extended market data for pattern analysis
      const { data: marketData } = await supabase
        .from('market_data_enhanced')
        .select('*')
        .eq('symbol', symbol)
        .eq('timeframe', timeframe)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (!marketData || marketData.length < 50) {
        console.log('Insufficient data for specialized analysis');
        return null;
      }

      // Perform Elliott Wave analysis
      const elliottWave = this.analyzeElliottWave(marketData.slice().reverse());
      
      // Detect harmonic patterns
      const harmonicPattern = this.detectHarmonicPatterns(marketData.slice().reverse());
      
      // Analyze order flow
      const orderFlow = this.analyzeOrderFlow(marketData.slice().reverse());
      
      // Generate signal based on specialized analysis
      const analysis = this.generateSpecializedSignal(elliottWave, harmonicPattern, orderFlow);
      
      if (analysis.confidence > 0.6) {
        const signal = this.createSignal(marketData[0], analysis, elliottWave, harmonicPattern, orderFlow, symbol, timeframe);
        if (signal) {
          await this.saveSignal(signal);
          return signal;
        }
      }

      return null;
    } catch (error) {
      console.error('Specialized analysis error:', error);
      return null;
    }
  }

  private analyzeElliottWave(data: any[]): ElliottWaveData {
    const prices = data.map(d => d.close_price);
    const highs = data.map(d => d.high_price);
    const lows = data.map(d => d.low_price);
    
    // Simplified Elliott Wave detection
    const swings = this.findSwingPoints(highs, lows, prices);
    const wavePattern = this.identifyWavePattern(swings);
    
    return {
      currentWave: wavePattern.current,
      waveCount: wavePattern.count,
      impulseOrCorrection: wavePattern.type,
      targetLevels: this.calculateWaveTargets(swings),
      confidence: wavePattern.confidence
    };
  }

  private findSwingPoints(highs: number[], lows: number[], closes: number[]): { price: number; type: 'high' | 'low'; index: number }[] {
    const swings: { price: number; type: 'high' | 'low'; index: number }[] = [];
    const lookback = 3;
    
    for (let i = lookback; i < highs.length - lookback; i++) {
      // Check for swing high
      let isSwingHigh = true;
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && highs[j] >= highs[i]) {
          isSwingHigh = false;
          break;
        }
      }
      
      if (isSwingHigh) {
        swings.push({ price: highs[i], type: 'high', index: i });
      }
      
      // Check for swing low
      let isSwingLow = true;
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && lows[j] <= lows[i]) {
          isSwingLow = false;
          break;
        }
      }
      
      if (isSwingLow) {
        swings.push({ price: lows[i], type: 'low', index: i });
      }
    }
    
    return swings.sort((a, b) => a.index - b.index);
  }

  private identifyWavePattern(swings: any[]): { current: string; count: number; type: 'impulse' | 'correction'; confidence: number } {
    if (swings.length < 5) {
      return { current: 'Wave 1', count: 1, type: 'impulse', confidence: 0.3 };
    }
    
    // Simplified pattern recognition
    const recentSwings = swings.slice(-5);
    let confidence = 0.5;
    
    // Check for 5-wave impulse pattern
    if (recentSwings.length === 5) {
      const wave1 = Math.abs(recentSwings[1].price - recentSwings[0].price);
      const wave3 = Math.abs(recentSwings[3].price - recentSwings[2].price);
      const wave5 = Math.abs(recentSwings[4].price - recentSwings[3].price);
      
      // Wave 3 should be longest or close to it
      if (wave3 >= wave1 && wave3 >= wave5) {
        confidence = 0.7;
        return { current: 'Wave 5', count: 5, type: 'impulse', confidence };
      }
    }
    
    // Default to early wave
    return { current: `Wave ${Math.min(recentSwings.length, 5)}`, count: recentSwings.length, type: 'impulse', confidence };
  }

  private calculateWaveTargets(swings: any[]): number[] {
    if (swings.length < 3) return [];
    
    const recent = swings.slice(-3);
    const wave1Length = Math.abs(recent[1].price - recent[0].price);
    const currentPrice = recent[recent.length - 1].price;
    
    // Fibonacci projections
    const targets = [
      currentPrice + (wave1Length * 1.0),
      currentPrice + (wave1Length * 1.618),
      currentPrice + (wave1Length * 2.618)
    ];
    
    return targets;
  }

  private detectHarmonicPatterns(data: any[]): HarmonicPatternData | null {
    const prices = data.map(d => ({ 
      high: d.high_price, 
      low: d.low_price, 
      close: d.close_price,
      index: data.indexOf(d)
    }));
    
    // Look for ABCD pattern (simplified)
    const pattern = this.findABCDPattern(prices);
    
    if (pattern) {
      return {
        patternType: 'ABCD',
        completion: pattern.completion,
        prz: pattern.prz,
        targets: pattern.targets,
        validity: pattern.completion > 0.8
      };
    }
    
    return null;
  }

  private findABCDPattern(prices: any[]): any | null {
    if (prices.length < 20) return null;
    
    // Simplified ABCD detection
    const recentPrices = prices.slice(-20);
    const highs = recentPrices.map(p => p.high);
    const lows = recentPrices.map(p => p.low);
    
    const highestIndex = highs.indexOf(Math.max(...highs));
    const lowestIndex = lows.indexOf(Math.min(...lows));
    
    if (Math.abs(highestIndex - lowestIndex) > 5) {
      const currentPrice = recentPrices[recentPrices.length - 1].close;
      const highPrice = Math.max(...highs);
      const lowPrice = Math.min(...lows);
      
      return {
        completion: 0.85, // Simulated completion
        prz: { min: lowPrice * 1.01, max: lowPrice * 1.03 },
        targets: [highPrice * 0.618, highPrice * 0.786, highPrice],
        validity: true
      };
    }
    
    return null;
  }

  private analyzeOrderFlow(data: any[]): OrderFlowData {
    const prices = data.map(d => d.close_price);
    const volumes = data.map(d => d.volume || 1000); // Default volume if not available
    
    // Calculate volume profile (simplified)
    const priceRanges = this.createPriceRanges(prices);
    const volumeProfile = this.calculateVolumeProfile(priceRanges, volumes);
    
    // Simulate delta and institutional flow
    const delta = (Math.random() - 0.5) * 1000;
    const cumulativeDelta = delta * 5;
    
    return {
      volumeProfile: {
        poc: volumeProfile.poc,
        vah: volumeProfile.vah,
        val: volumeProfile.val
      },
      delta,
      cumulativeDelta,
      liquidityLevels: this.findLiquidityLevels(prices),
      institutionalFlow: this.determineInstitutionalFlow(delta, cumulativeDelta)
    };
  }

  private createPriceRanges(prices: number[]): { min: number; max: number; volume: number }[] {
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;
    const tickSize = range / 20; // 20 price levels
    
    const ranges: { min: number; max: number; volume: number }[] = [];
    
    for (let i = 0; i < 20; i++) {
      ranges.push({
        min: minPrice + (i * tickSize),
        max: minPrice + ((i + 1) * tickSize),
        volume: Math.random() * 1000
      });
    }
    
    return ranges;
  }

  private calculateVolumeProfile(ranges: any[], volumes: number[]): { poc: number; vah: number; val: number } {
    // Find Point of Control (highest volume)
    const maxVolumeRange = ranges.reduce((max, range) => range.volume > max.volume ? range : max);
    const poc = (maxVolumeRange.min + maxVolumeRange.max) / 2;
    
    // Calculate Value Area (70% of volume)
    const totalVolume = ranges.reduce((sum, range) => sum + range.volume, 0);
    const valueAreaVolume = totalVolume * 0.7;
    
    // Simplified Value Area calculation
    const vah = poc + ((maxVolumeRange.max - maxVolumeRange.min) * 2);
    const val = poc - ((maxVolumeRange.max - maxVolumeRange.min) * 2);
    
    return { poc, vah, val };
  }

  private findLiquidityLevels(prices: number[]): { price: number; strength: number }[] {
    const levels: { price: number; strength: number }[] = [];
    
    // Find price levels that were touched multiple times
    const priceMap = new Map<number, number>();
    
    prices.forEach(price => {
      const roundedPrice = Math.round(price * 10000) / 10000; // Round to 4 decimals
      priceMap.set(roundedPrice, (priceMap.get(roundedPrice) || 0) + 1);
    });
    
    priceMap.forEach((count, price) => {
      if (count > 2) {
        levels.push({ price, strength: count });
      }
    });
    
    return levels.sort((a, b) => b.strength - a.strength).slice(0, 5);
  }

  private determineInstitutionalFlow(delta: number, cumulativeDelta: number): 'buying' | 'selling' | 'neutral' {
    if (cumulativeDelta > 2000) return 'buying';
    if (cumulativeDelta < -2000) return 'selling';
    return 'neutral';
  }

  private generateSpecializedSignal(
    elliottWave: ElliottWaveData,
    harmonicPattern: HarmonicPatternData | null,
    orderFlow: OrderFlowData
  ): {
    signalType: 'buy' | 'sell' | null;
    confidence: number;
    primaryPattern: string;
    patternMaturity: number;
  } {
    let bullishScore = 0;
    let bearishScore = 0;
    let primaryPattern = 'elliott_wave';
    let patternMaturity = 0;

    // Elliott Wave analysis
    if (elliottWave.currentWave === 'Wave 5' && elliottWave.confidence > 0.6) {
      if (elliottWave.impulseOrCorrection === 'impulse') {
        bearishScore += 0.4; // End of impulse = reversal
        patternMaturity = 0.8;
      }
    } else if (elliottWave.currentWave === 'Wave 3') {
      bullishScore += 0.3; // Wave 3 continuation
      patternMaturity = 0.6;
    }

    // Harmonic pattern analysis
    if (harmonicPattern && harmonicPattern.validity && harmonicPattern.completion > 0.8) {
      bearishScore += 0.5; // Pattern completion = reversal
      primaryPattern = 'harmonic_' + harmonicPattern.patternType.toLowerCase();
      patternMaturity = Math.max(patternMaturity, harmonicPattern.completion);
    }

    // Order flow analysis
    if (orderFlow.institutionalFlow === 'buying' && orderFlow.cumulativeDelta > 1000) {
      bullishScore += 0.3;
      primaryPattern = 'order_flow';
      patternMaturity = Math.max(patternMaturity, 0.7);
    } else if (orderFlow.institutionalFlow === 'selling' && orderFlow.cumulativeDelta < -1000) {
      bearishScore += 0.3;
      primaryPattern = 'order_flow';
      patternMaturity = Math.max(patternMaturity, 0.7);
    }

    const netScore = bullishScore - bearishScore;
    const confidence = Math.min(Math.abs(netScore), 1.0);
    const signalType = netScore > 0.3 ? 'buy' : netScore < -0.3 ? 'sell' : null;

    return {
      signalType,
      confidence,
      primaryPattern,
      patternMaturity
    };
  }

  private createSignal(
    currentBar: any,
    analysis: any,
    elliottWave: ElliottWaveData,
    harmonicPattern: HarmonicPatternData | null,
    orderFlow: OrderFlowData,
    symbol: string,
    timeframe: string
  ): SpecializedSignal | null {
    if (!analysis.signalType) return null;

    const currentPrice = currentBar.close_price;
    
    // Use pattern-specific levels for entry/exit
    let suggestedEntry = currentPrice;
    let suggestedStopLoss = currentPrice;
    let suggestedTakeProfit = currentPrice;
    
    if (harmonicPattern && harmonicPattern.validity) {
      // Use harmonic pattern levels
      suggestedEntry = analysis.signalType === 'buy' ? harmonicPattern.prz.min : harmonicPattern.prz.max;
      suggestedStopLoss = analysis.signalType === 'buy' 
        ? harmonicPattern.prz.min * 0.98
        : harmonicPattern.prz.max * 1.02;
      suggestedTakeProfit = analysis.signalType === 'buy'
        ? harmonicPattern.targets[0]
        : harmonicPattern.targets[harmonicPattern.targets.length - 1];
    } else if (elliottWave.targetLevels.length > 0) {
      // Use Elliott Wave targets
      const target = elliottWave.targetLevels[0];
      const waveSize = Math.abs(target - currentPrice);
      
      suggestedEntry = analysis.signalType === 'buy' 
        ? currentPrice + (waveSize * 0.1)
        : currentPrice - (waveSize * 0.1);
      suggestedStopLoss = analysis.signalType === 'buy'
        ? currentPrice - (waveSize * 0.3)
        : currentPrice + (waveSize * 0.3);
      suggestedTakeProfit = target;
    } else {
      // Use order flow levels
      const atr = (currentBar.high_price - currentBar.low_price);
      suggestedEntry = analysis.signalType === 'buy'
        ? currentPrice + (atr * 0.2)
        : currentPrice - (atr * 0.2);
      suggestedStopLoss = analysis.signalType === 'buy'
        ? currentPrice - (atr * 1.5)
        : currentPrice + (atr * 1.5);
      suggestedTakeProfit = analysis.signalType === 'buy'
        ? currentPrice + (atr * 3)
        : currentPrice - (atr * 3);
    }

    return {
      moduleId: this.moduleId,
      symbol,
      timeframe,
      signalType: analysis.signalType,
      confidence: analysis.confidence,
      strength: Math.round(analysis.confidence * 10),
      weight: 1.3, // Specialized analysis gets higher weight when confident
      triggerPrice: currentPrice,
      suggestedEntry,
      suggestedStopLoss,
      suggestedTakeProfit,
      elliottWave,
      harmonicPattern,
      orderFlow,
      primaryPattern: analysis.primaryPattern,
      patternMaturity: analysis.patternMaturity
    };
  }

  private async saveSignal(signal: SpecializedSignal): Promise<void> {
    const analysisId = crypto.randomUUID();
    
    const { error } = await (supabase as any)
      .from('modular_signals')
      .insert({
        analysis_id: analysisId,
        module_id: signal.moduleId,
        symbol: signal.symbol,
        timeframe: signal.timeframe,
        signal_type: signal.signalType,
        confidence: signal.confidence,
        strength: signal.strength,
        weight: signal.weight,
        trigger_price: signal.triggerPrice,
        suggested_entry: signal.suggestedEntry,
        suggested_stop_loss: signal.suggestedStopLoss,
        suggested_take_profit: signal.suggestedTakeProfit,
        trend_context: signal.primaryPattern,
        volatility_regime: `maturity_${Math.round(signal.patternMaturity * 100)}`,
        market_data_snapshot: {
          timestamp: new Date().toISOString(),
          price: signal.triggerPrice,
          specialized_data: {
            elliott_wave: signal.elliottWave,
            harmonic_pattern: signal.harmonicPattern,
            order_flow: signal.orderFlow
          }
        },
        calculation_parameters: {
          primary_pattern: signal.primaryPattern,
          pattern_maturity: signal.patternMaturity,
          elliott_wave_count: signal.elliottWave.waveCount,
          harmonic_pattern_type: signal.harmonicPattern?.patternType
        },
        intermediate_values: {
          elliott_wave: signal.elliottWave,
          harmonic_pattern: signal.harmonicPattern,
          order_flow: signal.orderFlow,
          pattern_analysis: {
            primary: signal.primaryPattern,
            maturity: signal.patternMaturity
          }
        }
      });

    if (error) {
      console.error('Error saving specialized signal:', error);
    }
  }
}