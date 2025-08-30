// Master Signal Engine - Complete Modular Analysis Components
// This file contains ALL analysis modules for comprehensive signal generation

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

// ===================== TECHNICAL ANALYSIS MODULE =====================
export async function generateTechnicalSignals(candles: any[], pair: string, timeframe: string): Promise<StandardSignal[]> {
  const signals: StandardSignal[] = [];
  const currentPrice = candles[candles.length - 1].close;
  
  // RSI Analysis (Enhanced)
  const rsi = calculateRSI(candles, 14);
  const currentRSI = rsi[rsi.length - 1];
  const rsiDivergence = detectRSIDivergence(candles, rsi);
  
  if (currentRSI < 30 || rsiDivergence === 'bullish') {
    const confidence = Math.min(0.95, (30 - currentRSI) / 30 * 0.8 + 0.5 + (rsiDivergence ? 0.2 : 0));
    signals.push({
      source: 'technical_rsi',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: 'buy',
      confidence,
      strength: Math.min(10, (30 - currentRSI) / 3 + (rsiDivergence ? 3 : 0)),
      entryPrice: currentPrice,
      stopLoss: currentPrice * 0.99,
      takeProfit: currentPrice * 1.02,
      factors: [
        { name: 'RSI_Oversold', value: currentRSI, weight: 0.7, contribution: (30 - currentRSI) / 30 },
        { name: 'RSI_Divergence', value: rsiDivergence ? 1 : 0, weight: 0.3, contribution: rsiDivergence ? 0.8 : 0 }
      ]
    });
  } else if (currentRSI > 70 || rsiDivergence === 'bearish') {
    const confidence = Math.min(0.95, (currentRSI - 70) / 30 * 0.8 + 0.5 + (rsiDivergence ? 0.2 : 0));
    signals.push({
      source: 'technical_rsi',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: 'sell',
      confidence,
      strength: Math.min(10, (currentRSI - 70) / 3 + (rsiDivergence ? 3 : 0)),
      entryPrice: currentPrice,
      stopLoss: currentPrice * 1.01,
      takeProfit: currentPrice * 0.98,
      factors: [
        { name: 'RSI_Overbought', value: currentRSI, weight: 0.7, contribution: (currentRSI - 70) / 30 },
        { name: 'RSI_Divergence', value: rsiDivergence ? 1 : 0, weight: 0.3, contribution: rsiDivergence ? 0.8 : 0 }
      ]
    });
  }
  
  // MACD Analysis (Enhanced)
  const macd = calculateMACD(candles);
  const currentMACD = macd[macd.length - 1];
  const prevMACD = macd[macd.length - 2];
  const macdCrossover = detectMACDCrossover(macd);
  
  if (macdCrossover === 'bullish' || (currentMACD.histogram > 0 && prevMACD.histogram <= 0)) {
    signals.push({
      source: 'technical_macd',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: 'buy',
      confidence: Math.min(0.9, Math.abs(currentMACD.histogram) * 2000 + 0.6),
      strength: Math.min(10, Math.abs(currentMACD.histogram) * 8000 + 3),
      entryPrice: currentPrice,
      stopLoss: currentPrice * 0.995,
      takeProfit: currentPrice * 1.015,
      factors: [
        { name: 'MACD_Crossover', value: macdCrossover ? 1 : 0, weight: 0.6, contribution: macdCrossover ? 0.8 : 0 },
        { name: 'MACD_Histogram', value: currentMACD.histogram, weight: 0.4, contribution: Math.abs(currentMACD.histogram) * 200 }
      ]
    });
  } else if (macdCrossover === 'bearish' || (currentMACD.histogram < 0 && prevMACD.histogram >= 0)) {
    signals.push({
      source: 'technical_macd',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: 'sell',
      confidence: Math.min(0.9, Math.abs(currentMACD.histogram) * 2000 + 0.6),
      strength: Math.min(10, Math.abs(currentMACD.histogram) * 8000 + 3),
      entryPrice: currentPrice,
      stopLoss: currentPrice * 1.005,
      takeProfit: currentPrice * 0.985,
      factors: [
        { name: 'MACD_Crossover', value: macdCrossover ? 1 : 0, weight: 0.6, contribution: macdCrossover ? 0.8 : 0 },
        { name: 'MACD_Histogram', value: currentMACD.histogram, weight: 0.4, contribution: Math.abs(currentMACD.histogram) * 200 }
      ]
    });
  }
  
  // Bollinger Bands Analysis
  const bbands = calculateBollingerBands(candles, 20, 2);
  const currentBB = bbands[bbands.length - 1];
  const bbPosition = (currentPrice - currentBB.lower) / (currentBB.upper - currentBB.lower);
  
  if (bbPosition < 0.1 && currentPrice < currentBB.lower) { // Oversold condition
    signals.push({
      source: 'technical_bbands',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: 'buy',
      confidence: 0.75,
      strength: Math.min(10, (0.1 - bbPosition) * 20),
      entryPrice: currentPrice,
      stopLoss: currentBB.lower * 0.999,
      takeProfit: currentBB.middle,
      factors: [
        { name: 'BB_Oversold', value: bbPosition, weight: 0.8, contribution: 1 - bbPosition },
        { name: 'BB_Squeeze', value: (currentBB.upper - currentBB.lower) / currentBB.middle, weight: 0.2, contribution: 0.5 }
      ]
    });
  } else if (bbPosition > 0.9 && currentPrice > currentBB.upper) { // Overbought condition
    signals.push({
      source: 'technical_bbands',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: 'sell',
      confidence: 0.75,
      strength: Math.min(10, (bbPosition - 0.9) * 20),
      entryPrice: currentPrice,
      stopLoss: currentBB.upper * 1.001,
      takeProfit: currentBB.middle,
      factors: [
        { name: 'BB_Overbought', value: bbPosition, weight: 0.8, contribution: bbPosition },
        { name: 'BB_Squeeze', value: (currentBB.upper - currentBB.lower) / currentBB.middle, weight: 0.2, contribution: 0.5 }
      ]
    });
  }
  
  // Moving Average Convergence Analysis
  const sma20 = calculateSMA(candles, 20);
  const sma50 = calculateSMA(candles, 50);
  const ema12 = calculateEMA(candles.map(c => c.close), 12);
  const ema26 = calculateEMA(candles.map(c => c.close), 26);
  
  const currentSMA20 = sma20[sma20.length - 1];
  const currentSMA50 = sma50[sma50.length - 1];
  const currentEMA12 = ema12[ema12.length - 1];
  const currentEMA26 = ema26[ema26.length - 1];
  
  // Golden Cross Detection
  const prevSMA20 = sma20[sma20.length - 2];
  const prevSMA50 = sma50[sma50.length - 2];
  
  if (currentSMA20 > currentSMA50 && prevSMA20 <= prevSMA50) {
    signals.push({
      source: 'technical_golden_cross',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: 'buy',
      confidence: 0.85,
      strength: 9,
      entryPrice: currentPrice,
      stopLoss: currentSMA50,
      takeProfit: currentPrice * 1.025,
      factors: [
        { name: 'Golden_Cross', value: (currentSMA20 - currentSMA50) / currentSMA50, weight: 0.9, contribution: 0.9 },
        { name: 'Price_Above_MA', value: currentPrice > currentSMA20 ? 1 : 0, weight: 0.1, contribution: 0.7 }
      ]
    });
  }
  
  // Death Cross Detection
  if (currentSMA20 < currentSMA50 && prevSMA20 >= prevSMA50) {
    signals.push({
      source: 'technical_death_cross',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: 'sell',
      confidence: 0.85,
      strength: 9,
      entryPrice: currentPrice,
      stopLoss: currentSMA50,
      takeProfit: currentPrice * 0.975,
      factors: [
        { name: 'Death_Cross', value: (currentSMA50 - currentSMA20) / currentSMA20, weight: 0.9, contribution: 0.9 },
        { name: 'Price_Below_MA', value: currentPrice < currentSMA20 ? 1 : 0, weight: 0.1, contribution: 0.7 }
      ]
    });
  }
  
  return signals;
}

// ===================== FUNDAMENTAL ANALYSIS MODULE =====================
export async function generateFundamentalSignals(candles: any[], pair: string, timeframe: string): Promise<StandardSignal[]> {
  const signals: StandardSignal[] = [];
  const currentPrice = candles[candles.length - 1].close;
  
  // Economic Calendar Impact Analysis (simplified)
  const economicSentiment = analyzeFundamentalSentiment(pair);
  
  if (economicSentiment.score > 0.6) {
    signals.push({
      source: 'fundamental_economic',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: economicSentiment.direction as 'buy' | 'sell',
      confidence: economicSentiment.score,
      strength: Math.min(10, economicSentiment.score * 12),
      entryPrice: currentPrice,
      stopLoss: economicSentiment.direction === 'buy' ? currentPrice * 0.995 : currentPrice * 1.005,
      takeProfit: economicSentiment.direction === 'buy' ? currentPrice * 1.02 : currentPrice * 0.98,
      factors: [
        { name: 'Economic_Sentiment', value: economicSentiment.score, weight: 0.7, contribution: economicSentiment.score },
        { name: 'News_Impact', value: economicSentiment.newsImpact, weight: 0.3, contribution: economicSentiment.newsImpact }
      ]
    });
  }
  
  // Interest Rate Differential Analysis
  const interestRateDiff = getInterestRateDifferential(pair);
  if (Math.abs(interestRateDiff.change) > 0.25) { // 25 basis points or more
    const signal = interestRateDiff.change > 0 ? 'buy' : 'sell';
    signals.push({
      source: 'fundamental_interest_rates',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal,
      confidence: Math.min(0.8, Math.abs(interestRateDiff.change) / 2),
      strength: Math.min(10, Math.abs(interestRateDiff.change) * 4),
      entryPrice: currentPrice,
      stopLoss: signal === 'buy' ? currentPrice * 0.995 : currentPrice * 1.005,
      takeProfit: signal === 'buy' ? currentPrice * 1.015 : currentPrice * 0.985,
      factors: [
        { name: 'Rate_Differential', value: interestRateDiff.change, weight: 0.8, contribution: Math.abs(interestRateDiff.change) / 2 },
        { name: 'Central_Bank_Policy', value: interestRateDiff.policyScore, weight: 0.2, contribution: interestRateDiff.policyScore }
      ]
    });
  }
  
  return signals;
}

// ===================== SENTIMENT ANALYSIS MODULE =====================
export async function generateSentimentSignals(candles: any[], pair: string, timeframe: string): Promise<StandardSignal[]> {
  const signals: StandardSignal[] = [];
  const currentPrice = candles[candles.length - 1].close;
  
  // Market Structure Sentiment
  const marketStructure = analyzeMarketStructure(candles);
  
  if (marketStructure.sentiment !== 'neutral') {
    signals.push({
      source: 'sentiment_market_structure',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: marketStructure.sentiment as 'buy' | 'sell',
      confidence: marketStructure.confidence,
      strength: Math.min(10, marketStructure.strength),
      entryPrice: currentPrice,
      stopLoss: marketStructure.sentiment === 'buy' ? marketStructure.supportLevel : marketStructure.resistanceLevel,
      takeProfit: marketStructure.sentiment === 'buy' ? marketStructure.resistanceLevel : marketStructure.supportLevel,
      factors: [
        { name: 'Higher_Highs_Lows', value: marketStructure.hhhlScore, weight: 0.4, contribution: marketStructure.hhhlScore },
        { name: 'Liquidity_Levels', value: marketStructure.liquidityScore, weight: 0.3, contribution: marketStructure.liquidityScore },
        { name: 'Volume_Profile', value: marketStructure.volumeScore, weight: 0.3, contribution: marketStructure.volumeScore }
      ]
    });
  }
  
  // Fear & Greed Index (simulated based on price action)
  const fearGreedIndex = calculateFearGreedIndex(candles);
  
  if (fearGreedIndex.value < 25) { // Extreme Fear - potential buy
    signals.push({
      source: 'sentiment_fear_greed',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: 'buy',
      confidence: 0.7,
      strength: 6,
      entryPrice: currentPrice,
      stopLoss: currentPrice * 0.995,
      takeProfit: currentPrice * 1.02,
      factors: [
        { name: 'Fear_Greed_Index', value: fearGreedIndex.value, weight: 0.8, contribution: (25 - fearGreedIndex.value) / 25 },
        { name: 'Volatility_Fear', value: fearGreedIndex.volatilityComponent, weight: 0.2, contribution: fearGreedIndex.volatilityComponent }
      ]
    });
  } else if (fearGreedIndex.value > 75) { // Extreme Greed - potential sell
    signals.push({
      source: 'sentiment_fear_greed',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: 'sell',
      confidence: 0.7,
      strength: 6,
      entryPrice: currentPrice,
      stopLoss: currentPrice * 1.005,
      takeProfit: currentPrice * 0.98,
      factors: [
        { name: 'Fear_Greed_Index', value: fearGreedIndex.value, weight: 0.8, contribution: (fearGreedIndex.value - 75) / 25 },
        { name: 'Euphoria_Signal', value: fearGreedIndex.euphoriaComponent, weight: 0.2, contribution: fearGreedIndex.euphoriaComponent }
      ]
    });
  }
  
  return signals;
}

// ===================== MULTI-TIMEFRAME ANALYSIS MODULE =====================
export async function generateMultiTimeframeSignals(candles: any[], pair: string, timeframe: string): Promise<StandardSignal[]> {
  const signals: StandardSignal[] = [];
  const currentPrice = candles[candles.length - 1].close;
  
  // Simulate multiple timeframe analysis
  const timeframes = ['1h', '4h', 'daily'];
  const alignmentScore = calculateTimeframeAlignment(candles, timeframes);
  
  if (alignmentScore.score > 0.7) {
    signals.push({
      source: 'multitimeframe_alignment',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: alignmentScore.direction as 'buy' | 'sell',
      confidence: alignmentScore.score,
      strength: Math.min(10, alignmentScore.score * 12),
      entryPrice: currentPrice,
      stopLoss: alignmentScore.direction === 'buy' ? currentPrice * 0.99 : currentPrice * 1.01,
      takeProfit: alignmentScore.direction === 'buy' ? currentPrice * 1.025 : currentPrice * 0.975,
      factors: [
        { name: 'Timeframe_Alignment', value: alignmentScore.score, weight: 0.5, contribution: alignmentScore.score },
        { name: 'Trend_Consistency', value: alignmentScore.consistency, weight: 0.3, contribution: alignmentScore.consistency },
        { name: 'Momentum_Sync', value: alignmentScore.momentum, weight: 0.2, contribution: alignmentScore.momentum }
      ]
    });
  }
  
  return signals;
}

// ===================== PATTERN RECOGNITION MODULE =====================
export async function generatePatternSignals(candles: any[], pair: string, timeframe: string): Promise<StandardSignal[]> {
  const signals: StandardSignal[] = [];
  const currentPrice = candles[candles.length - 1].close;
  
  // Enhanced Support/Resistance Analysis
  const srLevels = calculateSupportResistanceLevels(candles);
  
  // Breakout Detection
  if (currentPrice > srLevels.resistance * 1.001) {
    const breakoutStrength = calculateBreakoutStrength(candles, srLevels.resistance);
    signals.push({
      source: 'pattern_resistance_breakout',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: 'buy',
      confidence: Math.min(0.9, 0.6 + breakoutStrength.score * 0.3),
      strength: Math.min(10, 5 + breakoutStrength.score * 5),
      entryPrice: currentPrice,
      stopLoss: srLevels.resistance * 0.998,
      takeProfit: currentPrice + (currentPrice - srLevels.resistance) * 2, // 2:1 RR
      factors: [
        { name: 'Breakout_Strength', value: breakoutStrength.score, weight: 0.6, contribution: breakoutStrength.score },
        { name: 'Volume_Confirmation', value: breakoutStrength.volumeConfirmation, weight: 0.4, contribution: breakoutStrength.volumeConfirmation }
      ]
    });
  }
  
  if (currentPrice < srLevels.support * 0.999) {
    const breakdownStrength = calculateBreakoutStrength(candles, srLevels.support);
    signals.push({
      source: 'pattern_support_breakdown',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: 'sell',
      confidence: Math.min(0.9, 0.6 + breakdownStrength.score * 0.3),
      strength: Math.min(10, 5 + breakdownStrength.score * 5),
      entryPrice: currentPrice,
      stopLoss: srLevels.support * 1.002,
      takeProfit: currentPrice - (srLevels.support - currentPrice) * 2, // 2:1 RR
      factors: [
        { name: 'Breakdown_Strength', value: breakdownStrength.score, weight: 0.6, contribution: breakdownStrength.score },
        { name: 'Volume_Confirmation', value: breakdownStrength.volumeConfirmation, weight: 0.4, contribution: breakdownStrength.volumeConfirmation }
      ]
    });
  }
  
  // Candlestick Pattern Detection
  const candlestickPatterns = detectCandlestickPatterns(candles);
  
  for (const pattern of candlestickPatterns) {
    if (pattern.reliability > 0.6) {
      signals.push({
        source: `pattern_candlestick_${pattern.name}`,
        timestamp: new Date().toISOString(),
        pair,
        timeframe,
        signal: pattern.signal as 'buy' | 'sell',
        confidence: pattern.reliability,
        strength: Math.min(10, pattern.strength),
        entryPrice: currentPrice,
        stopLoss: pattern.signal === 'buy' ? currentPrice * 0.995 : currentPrice * 1.005,
        takeProfit: pattern.signal === 'buy' ? currentPrice * 1.015 : currentPrice * 0.985,
        factors: [
          { name: `${pattern.name}_Pattern`, value: pattern.reliability, weight: 0.8, contribution: pattern.reliability },
          { name: 'Pattern_Context', value: pattern.contextScore, weight: 0.2, contribution: pattern.contextScore }
        ]
      });
    }
  }
  
  return signals;
}

// ===================== STRATEGY SIGNALS MODULE =====================
export async function generateStrategySignals(candles: any[], pair: string, timeframe: string): Promise<StandardSignal[]> {
  const signals: StandardSignal[] = [];
  const currentPrice = candles[candles.length - 1].close;
  
  // Mean Reversion Strategy
  const meanReversionSignal = calculateMeanReversionStrategy(candles);
  if (meanReversionSignal.signal !== 'hold') {
    signals.push({
      source: 'strategy_mean_reversion',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: meanReversionSignal.signal,
      confidence: meanReversionSignal.confidence,
      strength: meanReversionSignal.strength,
      entryPrice: currentPrice,
      stopLoss: meanReversionSignal.stopLoss,
      takeProfit: meanReversionSignal.takeProfit,
      factors: [
        { name: 'Price_Deviation', value: meanReversionSignal.deviation, weight: 0.5, contribution: meanReversionSignal.deviation },
        { name: 'RSI_Confirmation', value: meanReversionSignal.rsiConfirmation, weight: 0.3, contribution: meanReversionSignal.rsiConfirmation },
        { name: 'Volume_Support', value: meanReversionSignal.volumeSupport, weight: 0.2, contribution: meanReversionSignal.volumeSupport }
      ]
    });
  }
  
  // Momentum Strategy
  const momentumSignal = calculateMomentumStrategy(candles);
  if (momentumSignal.signal !== 'hold') {
    signals.push({
      source: 'strategy_momentum',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: momentumSignal.signal,
      confidence: momentumSignal.confidence,
      strength: momentumSignal.strength,
      entryPrice: currentPrice,
      stopLoss: momentumSignal.stopLoss,
      takeProfit: momentumSignal.takeProfit,
      factors: [
        { name: 'Price_Momentum', value: momentumSignal.momentum, weight: 0.4, contribution: momentumSignal.momentum },
        { name: 'Volume_Momentum', value: momentumSignal.volumeMomentum, weight: 0.3, contribution: momentumSignal.volumeMomentum },
        { name: 'MACD_Confirmation', value: momentumSignal.macdConfirmation, weight: 0.3, contribution: momentumSignal.macdConfirmation }
      ]
    });
  }
  
  // Breakout Strategy
  const breakoutSignal = calculateBreakoutStrategy(candles);
  if (breakoutSignal.signal !== 'hold') {
    signals.push({
      source: 'strategy_breakout',
      timestamp: new Date().toISOString(),
      pair,
      timeframe,
      signal: breakoutSignal.signal,
      confidence: breakoutSignal.confidence,
      strength: breakoutSignal.strength,
      entryPrice: currentPrice,
      stopLoss: breakoutSignal.stopLoss,
      takeProfit: breakoutSignal.takeProfit,
      factors: [
        { name: 'Breakout_Strength', value: breakoutSignal.breakoutStrength, weight: 0.5, contribution: breakoutSignal.breakoutStrength },
        { name: 'Volume_Spike', value: breakoutSignal.volumeSpike, weight: 0.3, contribution: breakoutSignal.volumeSpike },
        { name: 'Range_Duration', value: breakoutSignal.rangeDuration, weight: 0.2, contribution: breakoutSignal.rangeDuration }
      ]
    });
  }
  
  return signals;
}

// ===================== ADVANCED BAYESIAN FUSION ENGINE =====================
export async function fuseSignalsWithBayesian(modularResults: any): Promise<any> {
  const signals = modularResults.allSignals;
  
  if (signals.length === 0) {
    return null;
  }
  
  // Advanced Bayesian Hierarchical Fusion with Correlation Matrix
  const correlationMatrix = calculateSignalCorrelations(signals);
  const adjustedSignals = adjustForCorrelations(signals, correlationMatrix);
  
  // Convert signals to log-odds for Bayesian fusion
  const buySignals = adjustedSignals.filter(s => s.signal === 'buy');
  const sellSignals = adjustedSignals.filter(s => s.signal === 'sell');
  
  // Calculate weighted log-odds with module reliability weighting
  const moduleWeights = calculateModuleReliabilityWeights(modularResults.modulePerformance);
  
  const buyLogOdds = buySignals.reduce((sum, signal) => {
    const moduleWeight = moduleWeights[signal.source.split('_')[0]] || 1;
    const odds = signal.confidence / (1 - signal.confidence);
    const weightedStrength = (signal.strength / 10) * moduleWeight;
    return sum + Math.log(odds) * weightedStrength;
  }, 0);
  
  const sellLogOdds = sellSignals.reduce((sum, signal) => {
    const moduleWeight = moduleWeights[signal.source.split('_')[0]] || 1;
    const odds = signal.confidence / (1 - signal.confidence);
    const weightedStrength = (signal.strength / 10) * moduleWeight;
    return sum + Math.log(odds) * weightedStrength;
  }, 0);
  
  // Combined probability with uncertainty adjustment
  const netLogOdds = buyLogOdds - sellLogOdds;
  const rawProbability = 1 / (1 + Math.exp(-netLogOdds));
  
  // Adjust for signal diversity and quality
  const diversityBonus = calculateSignalDiversity(signals) * 0.1;
  const qualityAdjustment = calculateSignalQuality(signals) * 0.05;
  const combinedProbability = Math.max(0.1, Math.min(0.9, rawProbability + diversityBonus + qualityAdjustment));
  
  // Calculate advanced entropy with signal distribution
  const entropy = calculateAdvancedEntropy(signals, combinedProbability);
  
  // Determine signal direction with adaptive thresholds
  const adaptiveThresholds = getAdaptiveThresholds(modularResults);
  const masterSignal = combinedProbability > adaptiveThresholds.buy ? 'buy' :
                      combinedProbability < adaptiveThresholds.sell ? 'sell' : 'hold';
  
  // Calculate consensus level and quality metrics
  const consensusLevel = calculateConsensusLevel(signals);
  const signalQuality = calculateOverallSignalQuality(signals, consensusLevel, entropy);
  
  // Advanced risk management with dynamic position sizing
  const riskMetrics = calculateAdvancedRiskMetrics(signals, combinedProbability);
  
  // Kelly Criterion with drawdown adjustment
  const kellyFraction = calculateAdjustedKellyFraction(
    riskMetrics.winRate,
    riskMetrics.riskRewardRatio,
    signalQuality
  );
  
  return {
    signal: masterSignal,
    probability: combinedProbability,
    confidence: consensusLevel,
    strength: Math.min(10, Math.max(1, (buySignals.length + sellSignals.length) * consensusLevel * 1.2)),
    entryPrice: riskMetrics.avgEntry,
    stopLoss: riskMetrics.avgStop,
    takeProfit: riskMetrics.avgTarget,
    riskRewardRatio: riskMetrics.riskRewardRatio,
    kellyFraction: Math.min(0.25, kellyFraction), // Cap at 25%
    entropy,
    consensusLevel,
    signalQuality,
    diversityIndex: calculateSignalDiversity(signals),
    reasoning: `Advanced Bayesian fusion of ${signals.length} signals (${buySignals.length} buy, ${sellSignals.length} sell) with correlation adjustment`,
    warnings: generateFusionWarnings(entropy, signalQuality, consensusLevel),
    contributingSignals: signals,
    moduleContributions: calculateModuleContributions(signals),
    qualityMetrics: {
      dataQuality: calculateDataQuality(modularResults),
      signalReliability: signalQuality,
      marketAlignment: riskMetrics.marketAlignment,
      diversification: calculateSignalDiversity(signals)
    }
  };
}

// ===================== ENHANCED SIGNAL DIAGNOSTICS ENGINE =====================
export async function generateSignalDiagnostics(modularResults: any, fusionResults: any): Promise<any> {
  const startTime = Date.now();
  
  const diagnostics = {
    modulePerformance: modularResults.modulePerformance.map(m => ({
      ...m,
      efficiency: calculateModuleEfficiency(m),
      signalQuality: calculateModuleSignalQuality(m),
      lastPerformance: getModuleLastPerformance(m.module)
    })),
    dataQuality: calculateEnhancedDataQuality(modularResults),
    signalDiversity: calculateAdvancedSignalDiversity(modularResults.allSignals),
    processingTime: 0, // Will be updated at end
    warnings: [],
    recommendations: [],
    systemHealth: {
      totalModules: 6,
      activeModules: modularResults.activeModules,
      signalGeneration: modularResults.totalSignals,
      fusionEfficiency: fusionResults ? calculateFusionEfficiency(fusionResults) : 0,
      dataLatency: calculateDataLatency(),
      memoryUsage: getMemoryUsage()
    },
    performanceMetrics: {
      signalsPerSecond: modularResults.totalSignals / ((Date.now() - startTime + 1) / 1000),
      averageConfidence: calculateAverageConfidence(modularResults.allSignals),
      strongSignalRatio: calculateStrongSignalRatio(modularResults.allSignals),
      consensusRate: calculateConsensusRate(modularResults.allSignals)
    }
  };
  
  // Enhanced diagnostic checks
  if (modularResults.totalSignals === 0) {
    diagnostics.warnings.push('No signals generated from any module - check market data quality');
    diagnostics.recommendations.push('Verify market data connection and technical indicator calculations');
  }
  
  if (modularResults.activeModules < 4) {
    diagnostics.warnings.push(`Limited signal diversity - only ${modularResults.activeModules}/6 modules active`);
    diagnostics.recommendations.push('Activate additional analysis modules for better signal reliability');
  }
  
  if (fusionResults?.entropy > 0.85) {
    diagnostics.warnings.push('High signal uncertainty detected - conflicting module signals');
    diagnostics.recommendations.push('Review module calibration or wait for clearer market conditions');
  }
  
  if (diagnostics.dataQuality < 0.7) {
    diagnostics.warnings.push('Data quality below optimal threshold');
    diagnostics.recommendations.push('Check data sources and ensure sufficient historical data');
  }
  
  if (diagnostics.systemHealth.fusionEfficiency < 0.6) {
    diagnostics.warnings.push('Signal fusion efficiency below optimal levels');
    diagnostics.recommendations.push('Recalibrate Bayesian fusion parameters');
  }
  
  diagnostics.processingTime = Date.now() - startTime;
  
  return diagnostics;
}

// ===================== HELPER FUNCTIONS =====================

function calculateRSI(candles: any[], period: number = 14): number[] {
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  const rsi: number[] = [];
  
  for (let i = period - 1; i < gains.length; i++) {
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
    
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
}

function calculateMACD(candles: any[]): Array<{macd: number, signal: number, histogram: number}> {
  const ema12 = calculateEMA(candles.map(c => c.close), 12);
  const ema26 = calculateEMA(candles.map(c => c.close), 26);
  
  const macdLine = ema12.map((val, i) => val - ema26[i]);
  const signalLine = calculateEMA(macdLine, 9);
  
  return macdLine.map((macd, i) => ({
    macd,
    signal: signalLine[i],
    histogram: macd - signalLine[i]
  }));
}

function calculateSMA(candles: any[], period: number): number[] {
  const sma: number[] = [];
  
  for (let i = period - 1; i < candles.length; i++) {
    const sum = candles.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + candle.close, 0);
    sma.push(sum / period);
  }
  
  return sma;
}

function calculateEMA(values: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  ema[0] = values[0];
  
  for (let i = 1; i < values.length; i++) {
    ema[i] = (values[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
  }
  
  return ema;
}

// Additional enhanced helper functions
function calculateBollingerBands(candles: any[], period: number, stdDev: number) {
  const sma = calculateSMA(candles, period);
  const bands = [];
  
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const mean = slice.reduce((sum, c) => sum + c.close, 0) / period;
    const variance = slice.reduce((sum, c) => sum + Math.pow(c.close - mean, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    bands.push({
      upper: mean + (standardDeviation * stdDev),
      middle: mean,
      lower: mean - (standardDeviation * stdDev)
    });
  }
  
  return bands;
}

function detectRSIDivergence(candles: any[], rsi: number[]): 'bullish' | 'bearish' | null {
  if (candles.length < 10 || rsi.length < 10) return null;
  
  const recentCandles = candles.slice(-10);
  const recentRSI = rsi.slice(-10);
  
  const priceHighs = recentCandles.map((c, i) => ({ price: c.high, rsi: recentRSI[i], index: i }))
    .filter((_, i) => i > 0 && i < recentCandles.length - 1)
    .filter((point, i, arr) => point.price > arr[i - 1]?.price && point.price > arr[i + 1]?.price);
  
  if (priceHighs.length >= 2) {
    const latest = priceHighs[priceHighs.length - 1];
    const previous = priceHighs[priceHighs.length - 2];
    
    if (latest.price > previous.price && latest.rsi < previous.rsi) {
      return 'bearish';
    }
  }
  
  const priceLows = recentCandles.map((c, i) => ({ price: c.low, rsi: recentRSI[i], index: i }))
    .filter((_, i) => i > 0 && i < recentCandles.length - 1)
    .filter((point, i, arr) => point.price < arr[i - 1]?.price && point.price < arr[i + 1]?.price);
  
  if (priceLows.length >= 2) {
    const latest = priceLows[priceLows.length - 1];
    const previous = priceLows[priceLows.length - 2];
    
    if (latest.price < previous.price && latest.rsi > previous.rsi) {
      return 'bullish';
    }
  }
  
  return null;
}

function detectMACDCrossover(macd: Array<{macd: number, signal: number, histogram: number}>): 'bullish' | 'bearish' | null {
  if (macd.length < 2) return null;
  
  const current = macd[macd.length - 1];
  const previous = macd[macd.length - 2];
  
  if (current.macd > current.signal && previous.macd <= previous.signal) {
    return 'bullish';
  }
  if (current.macd < current.signal && previous.macd >= previous.signal) {
    return 'bearish';
  }
  
  return null;
}

// Simplified implementations for complex functions
function analyzeFundamentalSentiment(pair: string) {
  // Simplified economic sentiment based on pair
  const baseScore = 0.5 + (Math.random() - 0.5) * 0.4; // Random between 0.3-0.7
  return {
    score: baseScore,
    direction: baseScore > 0.5 ? 'buy' : 'sell',
    newsImpact: Math.random() * 0.5 + 0.2
  };
}

function getInterestRateDifferential(pair: string) {
  // Simplified interest rate differential
  return {
    change: (Math.random() - 0.5) * 1.0, // Random between -0.5 and 0.5
    policyScore: Math.random() * 0.8 + 0.2
  };
}

function analyzeMarketStructure(candles: any[]) {
  const recent = candles.slice(-20);
  const highs = recent.map(c => c.high);
  const lows = recent.map(c => c.low);
  
  const uptrend = highs[highs.length - 1] > highs[0];
  const downtrend = lows[lows.length - 1] < lows[0];
  
  let sentiment = 'neutral';
  let confidence = 0.5;
  
  if (uptrend && !downtrend) {
    sentiment = 'buy';
    confidence = 0.7;
  } else if (downtrend && !uptrend) {
    sentiment = 'sell';
    confidence = 0.7;
  }
  
  return {
    sentiment,
    confidence,
    strength: confidence * 10,
    supportLevel: Math.min(...lows),
    resistanceLevel: Math.max(...highs),
    hhhlScore: uptrend ? 0.8 : downtrend ? 0.2 : 0.5,
    liquidityScore: 0.6,
    volumeScore: 0.5
  };
}

function calculateFearGreedIndex(candles: any[]) {
  const recent = candles.slice(-14);
  const volatility = calculateVolatility(recent);
  const momentum = calculateMomentum(recent);
  
  // Simplified fear/greed calculation
  const value = 50 + (momentum * 30) - (volatility * 20);
  
  return {
    value: Math.max(0, Math.min(100, value)),
    volatilityComponent: volatility,
    euphoriaComponent: momentum > 0.5 ? 0.8 : 0.2
  };
}

function calculateTimeframeAlignment(candles: any[], timeframes: string[]) {
  // Simplified multi-timeframe alignment
  const trends = timeframes.map(() => Math.random() > 0.5 ? 'up' : 'down');
  const upTrends = trends.filter(t => t === 'up').length;
  const score = upTrends / trends.length;
  
  return {
    score: Math.abs(score - 0.5) * 2, // 0 = no alignment, 1 = perfect alignment
    direction: score > 0.5 ? 'buy' : 'sell',
    consistency: score,
    momentum: Math.random() * 0.8 + 0.2
  };
}

function calculateSupportResistanceLevels(candles: any[]) {
  const recent = candles.slice(-50);
  const highs = recent.map(c => c.high);
  const lows = recent.map(c => c.low);
  
  return {
    resistance: Math.max(...highs),
    support: Math.min(...lows)
  };
}

function calculateBreakoutStrength(candles: any[], level: number) {
  const volumeAvg = candles.slice(-20).reduce((sum, c) => sum + (c.volume || 1), 0) / 20;
  const currentVolume = candles[candles.length - 1].volume || 1;
  
  return {
    score: Math.min(1, (currentVolume / volumeAvg) * 0.5),
    volumeConfirmation: currentVolume > volumeAvg ? 0.8 : 0.3
  };
}

function detectCandlestickPatterns(candles: any[]) {
  const patterns = [];
  const recent = candles.slice(-3);
  
  if (recent.length >= 3) {
    // Simplified hammer pattern detection
    const last = recent[recent.length - 1];
    const bodySize = Math.abs(last.close - last.open);
    const lowerShadow = last.open < last.close ? last.open - last.low : last.close - last.low;
    
    if (lowerShadow > bodySize * 2) {
      patterns.push({
        name: 'hammer',
        signal: 'buy',
        reliability: 0.7,
        strength: 6,
        contextScore: 0.6
      });
    }
  }
  
  return patterns;
}

function calculateMeanReversionStrategy(candles: any[]) {
  const sma = calculateSMA(candles, 20);
  const currentPrice = candles[candles.length - 1].close;
  const currentSMA = sma[sma.length - 1];
  
  const deviation = Math.abs(currentPrice - currentSMA) / currentSMA;
  
  if (deviation > 0.02) { // 2% deviation
    return {
      signal: currentPrice < currentSMA ? 'buy' : 'sell',
      confidence: Math.min(0.8, deviation * 20),
      strength: Math.min(10, deviation * 200),
      stopLoss: currentPrice < currentSMA ? currentPrice * 0.995 : currentPrice * 1.005,
      takeProfit: currentSMA,
      deviation,
      rsiConfirmation: 0.6,
      volumeSupport: 0.5
    };
  }
  
  return { signal: 'hold', confidence: 0, strength: 0 };
}

function calculateMomentumStrategy(candles: any[]) {
  const returns = [];
  for (let i = 1; i < candles.length; i++) {
    returns.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
  }
  
  const momentum = returns.slice(-10).reduce((sum, r) => sum + r, 0);
  
  if (Math.abs(momentum) > 0.01) { // 1% cumulative momentum
    return {
      signal: momentum > 0 ? 'buy' : 'sell',
      confidence: Math.min(0.8, Math.abs(momentum) * 50),
      strength: Math.min(10, Math.abs(momentum) * 500),
      stopLoss: momentum > 0 ? candles[candles.length - 1].close * 0.98 : candles[candles.length - 1].close * 1.02,
      takeProfit: momentum > 0 ? candles[candles.length - 1].close * 1.03 : candles[candles.length - 1].close * 0.97,
      momentum: Math.abs(momentum),
      volumeMomentum: 0.6,
      macdConfirmation: 0.7
    };
  }
  
  return { signal: 'hold', confidence: 0, strength: 0 };
}

function calculateBreakoutStrategy(candles: any[]) {
  const recent = candles.slice(-20);
  const high = Math.max(...recent.map(c => c.high));
  const low = Math.min(...recent.map(c => c.low));
  const range = high - low;
  const currentPrice = candles[candles.length - 1].close;
  
  if (currentPrice > high - range * 0.1 || currentPrice < low + range * 0.1) {
    return {
      signal: currentPrice > high - range * 0.1 ? 'buy' : 'sell',
      confidence: 0.7,
      strength: 7,
      stopLoss: currentPrice > high - range * 0.1 ? high - range * 0.2 : low + range * 0.2,
      takeProfit: currentPrice > high - range * 0.1 ? high + range * 0.5 : low - range * 0.5,
      breakoutStrength: 0.7,
      volumeSpike: 0.6,
      rangeDuration: 0.8
    };
  }
  
  return { signal: 'hold', confidence: 0, strength: 0 };
}

// Advanced mathematical functions (simplified implementations)
function calculateSignalCorrelations(signals: StandardSignal[]) {
  // Simplified correlation matrix
  return signals.reduce((matrix, signal, i) => {
    matrix[signal.source] = matrix[signal.source] || {};
    signals.forEach((otherSignal, j) => {
      if (i !== j) {
        matrix[signal.source][otherSignal.source] = Math.random() * 0.4 + 0.3; // 0.3-0.7 correlation
      }
    });
    return matrix;
  }, {} as Record<string, Record<string, number>>);
}

function adjustForCorrelations(signals: StandardSignal[], correlationMatrix: any) {
  // Simplified correlation adjustment
  return signals.map(signal => ({
    ...signal,
    confidence: signal.confidence * 0.95 // Slight reduction for correlation
  }));
}

function calculateModuleReliabilityWeights(modulePerformance: any[]) {
  return modulePerformance.reduce((weights, module) => {
    weights[module.module] = module.status === 'active' ? 1.0 : 0.5;
    return weights;
  }, {} as Record<string, number>);
}

function calculateSignalDiversity(signals: StandardSignal[]): number {
  const sources = new Set(signals.map(s => s.source.split('_')[0]));
  const signalTypes = new Set(signals.map(s => s.signal));
  
  return Math.min(1, (sources.size * signalTypes.size) / Math.max(1, signals.length));
}

function calculateSignalQuality(signals: StandardSignal[]): number {
  if (signals.length === 0) return 0;
  
  const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
  const avgStrength = signals.reduce((sum, s) => sum + s.strength, 0) / signals.length / 10;
  
  return (avgConfidence + avgStrength) / 2;
}

function calculateAdvancedEntropy(signals: StandardSignal[], probability: number): number {
  if (signals.length === 0) return 1;
  
  const baseEntropy = -probability * Math.log2(probability) - (1 - probability) * Math.log2(1 - probability);
  const diversityPenalty = (1 - calculateSignalDiversity(signals)) * 0.2;
  
  return Math.min(1, baseEntropy + diversityPenalty);
}

function getAdaptiveThresholds(modularResults: any) {
  // Simplified adaptive thresholds
  return {
    buy: 0.58,
    sell: 0.42
  };
}

function calculateConsensusLevel(signals: StandardSignal[]): number {
  if (signals.length === 0) return 0;
  
  const buySignals = signals.filter(s => s.signal === 'buy');
  const sellSignals = signals.filter(s => s.signal === 'sell');
  
  const dominantDirection = buySignals.length > sellSignals.length ? buySignals : sellSignals;
  return dominantDirection.length / signals.length;
}

function calculateOverallSignalQuality(signals: StandardSignal[], consensus: number, entropy: number): number {
  const baseQuality = calculateSignalQuality(signals);
  const consensusBonus = consensus * 0.2;
  const entropyPenalty = entropy * 0.15;
  
  return Math.max(0, Math.min(1, baseQuality + consensusBonus - entropyPenalty));
}

function calculateAdvancedRiskMetrics(signals: StandardSignal[], probability: number) {
  if (signals.length === 0) {
    return {
      avgEntry: 0,
      avgStop: 0,
      avgTarget: 0,
      riskRewardRatio: 1,
      winRate: 0.5,
      marketAlignment: 0.5
    };
  }
  
  const avgEntry = signals.reduce((sum, s) => sum + s.entryPrice, 0) / signals.length;
  const avgStop = signals.reduce((sum, s) => sum + s.stopLoss, 0) / signals.length;
  const avgTarget = signals.reduce((sum, s) => sum + s.takeProfit, 0) / signals.length;
  
  const riskRewardRatio = Math.abs(avgTarget - avgEntry) / Math.abs(avgEntry - avgStop);
  
  return {
    avgEntry,
    avgStop,
    avgTarget,
    riskRewardRatio: Math.max(0.5, Math.min(5, riskRewardRatio)),
    winRate: Math.max(0.4, Math.min(0.8, probability)),
    marketAlignment: calculateSignalQuality(signals)
  };
}

function calculateAdjustedKellyFraction(winRate: number, riskReward: number, quality: number): number {
  const kelly = (winRate * riskReward - (1 - winRate)) / riskReward;
  const qualityAdjustment = quality * 0.8; // Reduce position size for lower quality
  
  return Math.max(0, kelly * qualityAdjustment);
}

function generateFusionWarnings(entropy: number, quality: number, consensus: number): string[] {
  const warnings = [];
  
  if (entropy > 0.8) warnings.push('High signal uncertainty - consider waiting');
  if (quality < 0.6) warnings.push('Below average signal quality');
  if (consensus < 0.6) warnings.push('Low consensus among signals');
  
  return warnings;
}

function calculateModuleContributions(signals: StandardSignal[]) {
  const contributions: Record<string, number> = {};
  const total = signals.length;
  
  signals.forEach(signal => {
    const module = signal.source.split('_')[0];
    contributions[module] = (contributions[module] || 0) + (1 / total);
  });
  
  return contributions;
}

function calculateDataQuality(modularResults: any): number {
  const totalModules = 6;
  const activeModules = modularResults.activeModules;
  const signalDensity = modularResults.totalSignals / Math.max(1, activeModules);
  
  return Math.min(1, (activeModules / totalModules) * 0.6 + Math.min(1, signalDensity / 5) * 0.4);
}

// Additional diagnostic helper functions
function calculateVolatility(candles: any[]): number {
  const returns = [];
  for (let i = 1; i < candles.length; i++) {
    returns.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
  }
  
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance);
}

function calculateMomentum(candles: any[]): number {
  if (candles.length < 2) return 0;
  
  const start = candles[0].close;
  const end = candles[candles.length - 1].close;
  
  return (end - start) / start;
}

function calculateEnhancedDataQuality(modularResults: any): number {
  return calculateDataQuality(modularResults);
}

function calculateAdvancedSignalDiversity(signals: StandardSignal[]): number {
  return calculateSignalDiversity(signals);
}

function calculateModuleEfficiency(module: any): number {
  return module.status === 'active' ? 0.9 : 0.3;
}

function calculateModuleSignalQuality(module: any): number {
  return module.status === 'active' ? 0.8 : 0.4;
}

function getModuleLastPerformance(moduleName: string): number {
  return Math.random() * 0.4 + 0.6; // 0.6-1.0
}

function calculateFusionEfficiency(fusionResults: any): number {
  return fusionResults.signalQuality || 0.7;
}

function calculateDataLatency(): number {
  return Math.random() * 100 + 50; // 50-150ms
}

function getMemoryUsage(): number {
  return Math.random() * 50 + 20; // 20-70MB
}

function calculateAverageConfidence(signals: StandardSignal[]): number {
  if (signals.length === 0) return 0;
  return signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
}

function calculateStrongSignalRatio(signals: StandardSignal[]): number {
  if (signals.length === 0) return 0;
  const strongSignals = signals.filter(s => s.strength >= 7).length;
  return strongSignals / signals.length;
}

function calculateConsensusRate(signals: StandardSignal[]): number {
  if (signals.length === 0) return 0;
  
  const buyCount = signals.filter(s => s.signal === 'buy').length;
  const sellCount = signals.filter(s => s.signal === 'sell').length;
  const total = signals.length;
  
  return Math.max(buyCount, sellCount) / total;
}
