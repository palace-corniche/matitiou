// ============= PHASE A: REAL-TIME DATA INTEGRATION & LIVE TRADING =============
import { unifiedMarketData, UnifiedTick } from './unifiedMarketData';
import { AdvancedQuantEngine } from './advancedQuantEngine';
import { MachineLearningModels } from './machinelearningModels';
import { StatisticalArbitrage } from './statisticalArbitrage';
import { supabase } from '@/integrations/supabase/client';

interface LiveSignal {
  id: string;
  symbol: string;
  signal_type: 'buy' | 'sell';
  confidence: number;
  strength: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  lot_size: number;
  timestamp: number;
  model_source: string;
  risk_metrics: any;
  live_data: any;
}

interface PositionUpdate {
  position_id: string;
  current_price: number;
  unrealized_pnl: number;
  pips: number;
  risk_metrics: any;
  timestamp: number;
}

class RealTimeQuantAnalytics {
  private quantEngine: AdvancedQuantEngine;
  private mlModels: MachineLearningModels;
  private statArb: StatisticalArbitrage;
  private isActive = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private positions: Map<string, any> = new Map();
  private callbacks: Array<(signal: LiveSignal) => void> = [];
  private positionCallbacks: Array<(update: PositionUpdate) => void> = [];

  constructor() {
    this.quantEngine = new AdvancedQuantEngine();
    this.mlModels = new MachineLearningModels();
    this.statArb = new StatisticalArbitrage();
    this.setupMarketDataSubscription();
  }

  // ============= REAL-TIME MARKET DATA INTEGRATION =============
  private setupMarketDataSubscription() {
    unifiedMarketData.subscribe({
      onTick: (tick: UnifiedTick) => {
        this.processTick(tick);
      },
      onConnectionChange: (connected: boolean) => {
        console.log(`📡 Market data connection: ${connected ? 'CONNECTED' : 'DISCONNECTED'}`);
      },
      onError: (error: Error) => {
        console.error('❌ Market data error:', error);
      }
    });
  }

  private async processTick(tick: UnifiedTick) {
    if (!this.isActive) return;

    try {
      // Update existing positions with real-time P&L
      await this.updatePositions(tick);

      // Generate new signals every 15 seconds
      if (Date.now() % 15000 < 5000) {
        await this.generateLiveSignals(tick);
      }

      // Run risk management checks
      await this.performRiskManagement(tick);

    } catch (error) {
      console.error('❌ Error processing tick:', error);
    }
  }

  // ============= LIVE SIGNAL GENERATION =============
  private async generateLiveSignals(tick: UnifiedTick) {
    try {
      // Get recent market data for analysis
      const marketData = await this.getRecentMarketData();
      
      if (marketData.length < 50) return; // Need sufficient data

      // Run multiple models in parallel
      const [garchResults, meanRevResults, mlPrediction, arbOpportunities] = await Promise.all([
        this.quantEngine.fitGARCH(this.extractReturns(marketData)),
        this.quantEngine.analyzeOrnsteinUhlenbeck(marketData.map(d => d.close_price)),
        { predicted_direction: 'bullish', confidence: 0.75 }, // Mock ML prediction
        [] // Mock arbitrage opportunities
      ]);

      // Generate ensemble signal
      const signal = await this.createEnsembleSignal({
        tick,
        garch: garchResults,
        meanReversion: meanRevResults,
        ml: mlPrediction,
        arbitrage: arbOpportunities
      });

      if (signal && signal.confidence > 0.7) {
        await this.broadcastSignal(signal);
      }

    } catch (error) {
      console.error('❌ Error generating live signals:', error);
    }
  }

  private async createEnsembleSignal(data: any): Promise<LiveSignal | null> {
    const { tick, garch, meanReversion, ml, arbitrage } = data;

    // Calculate confidence scores from each model
    const volatilityScore = Math.min(garch.forecast || 0, 1);
    const meanReversionScore = Math.abs(meanReversion.halfLife || 0) > 10 ? 0.8 : 0.3;
    const mlScore = ml.confidence || 0;
    const arbScore = arbitrage.length > 0 ? 0.9 : 0.1;

    // Weighted ensemble
    const weights = { volatility: 0.25, meanReversion: 0.25, ml: 0.35, arbitrage: 0.15 };
    const ensembleConfidence = 
      weights.volatility * volatilityScore +
      weights.meanReversion * meanReversionScore +
      weights.ml * mlScore +
      weights.arbitrage * arbScore;

    if (ensembleConfidence < 0.6) return null;

    // Determine signal direction
    const mlDirection = ml.predicted_direction === 'bullish' ? 1 : -1;
    const meanRevDirection = meanReversion.meanReversionStrength > 0 ? -1 : 1; // Contrarian
    const direction = mlDirection * 0.7 + meanRevDirection * 0.3 > 0 ? 'buy' : 'sell';

    // Calculate optimal entry, SL, TP using ATR
    const atr = this.calculateATR(await this.getRecentMarketData());
    const entry = tick.price;
    const riskMultiplier = 1.5;
    const rewardMultiplier = 2.5;

    return {
      id: `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: tick.symbol,
      signal_type: direction as 'buy' | 'sell',
      confidence: ensembleConfidence,
      strength: Math.round(ensembleConfidence * 10),
      entry_price: entry,
      stop_loss: direction === 'buy' 
        ? entry - (atr * riskMultiplier)
        : entry + (atr * riskMultiplier),
      take_profit: direction === 'buy'
        ? entry + (atr * rewardMultiplier)
        : entry - (atr * rewardMultiplier),
      lot_size: this.calculateOptimalLotSize(ensembleConfidence, atr),
      timestamp: Date.now(),
      model_source: 'ensemble_real_time',
      risk_metrics: {
        atr,
        volatility: garch.forecast,
        meanReversionStrength: meanReversion.meanReversionStrength,
        mlConfidence: ml.confidence
      },
      live_data: {
        tick_price: tick.price,
        spread: tick.spread,
        timestamp: tick.timestamp
      }
    };
  }

  // ============= POSITION MANAGEMENT =============
  private async updatePositions(tick: UnifiedTick) {
    const openPositions = await this.getOpenPositions();
    
    for (const position of openPositions) {
      const pnlData = this.calculatePositionPnL(position, tick);
      
      const update: PositionUpdate = {
        position_id: position.id,
        current_price: tick.price,
        unrealized_pnl: pnlData.pnl,
        pips: pnlData.pips,
        risk_metrics: {
          currentDrawdown: pnlData.drawdown,
          riskRewardRatio: pnlData.riskReward,
          timeInTrade: Date.now() - new Date(position.created_at).getTime()
        },
        timestamp: Date.now()
      };

      // Update position in database
      await supabase
        .from('shadow_trades')
        .update({
          current_price: tick.price,
          unrealized_pnl: pnlData.pnl,
          profit_pips: pnlData.pips,
          updated_at: new Date().toISOString()
        })
        .eq('id', position.id);

      // Broadcast update
      this.positionCallbacks.forEach(callback => callback(update));

      // Check for exit conditions
      await this.checkExitConditions(position, tick, pnlData);
    }
  }

  private calculatePositionPnL(position: any, tick: UnifiedTick) {
    const entryPrice = position.entry_price;
    const currentPrice = position.trade_type === 'buy' ? tick.bid : tick.ask;
    
    const pipDifference = position.trade_type === 'buy'
      ? (currentPrice - entryPrice) / 0.0001
      : (entryPrice - currentPrice) / 0.0001;
    
    const pnl = pipDifference * position.lot_size * 10; // $10 per pip for EUR/USD
    const riskAmount = Math.abs(entryPrice - position.stop_loss) * position.lot_size * 10;
    const drawdown = Math.min(0, pnl / riskAmount);

    return {
      pnl: Number(pnl.toFixed(2)),
      pips: Number(pipDifference.toFixed(1)),
      drawdown: Number((drawdown * 100).toFixed(1)),
      riskReward: riskAmount > 0 ? Number((pnl / riskAmount).toFixed(2)) : 0
    };
  }

  // ============= RISK MANAGEMENT =============
  private async performRiskManagement(tick: UnifiedTick) {
    const positions = await this.getOpenPositions();
    
    // Portfolio-level risk checks
    const totalExposure = positions.reduce((sum, pos) => sum + pos.lot_size, 0);
    const totalPnL = positions.reduce((sum, pos) => {
      const pnl = this.calculatePositionPnL(pos, tick);
      return sum + pnl.pnl;
    }, 0);

    // Risk limits
    const maxExposure = 5.0; // Max 5 lots total
    const maxDailyLoss = -2000; // Max $2000 daily loss
    
    if (totalExposure > maxExposure) {
      console.warn('⚠️ Portfolio exposure limit exceeded');
      await this.reduceExposure();
    }

    if (totalPnL < maxDailyLoss) {
      console.warn('⚠️ Daily loss limit reached');
      await this.closeAllPositions('daily_loss_limit');
    }
  }

  private async checkExitConditions(position: any, tick: UnifiedTick, pnlData: any) {
    // Time-based exit (4 hours)
    const timeInTrade = Date.now() - new Date(position.created_at).getTime();
    if (timeInTrade > 4 * 60 * 60 * 1000) {
      await this.closePosition(position.id, 'time_exit');
      return;
    }

    // Trailing stop logic
    if (pnlData.pips > 20) {
      const newStopLoss = position.trade_type === 'buy'
        ? Math.max(position.stop_loss, tick.price - 0.0015) // 15 pip trailing
        : Math.min(position.stop_loss, tick.price + 0.0015);
      
      if (newStopLoss !== position.stop_loss) {
        await supabase
          .from('shadow_trades')
          .update({ stop_loss: newStopLoss })
          .eq('id', position.id);
      }
    }
  }

  // ============= UTILITY METHODS =============
  private async getRecentMarketData() {
    const { data } = await supabase
      .from('market_data_enhanced')
      .select('*')
      .eq('symbol', 'EUR/USD')
      .order('timestamp', { ascending: false })
      .limit(100);
    
    return data || [];
  }

  private async getOpenPositions() {
    const { data } = await supabase
      .from('shadow_trades')
      .select('*')
      .eq('status', 'open')
      .eq('symbol', 'EUR/USD');
    
    return data || [];
  }

  private extractReturns(marketData: any[]): number[] {
    const returns = [];
    for (let i = 1; i < marketData.length; i++) {
      const ret = Math.log(marketData[i].close_price / marketData[i-1].close_price);
      returns.push(ret);
    }
    return returns;
  }

  private extractMLFeatures(marketData: any[]) {
    return {
      prices: marketData.map(d => d.close_price),
      volumes: marketData.map(d => d.volume || 1000),
      timestamps: marketData.map(d => new Date(d.timestamp).getTime()),
      indicators: {
        sma: this.calculateSMA(marketData.map(d => d.close_price), 20),
        ema: this.calculateEMA(marketData.map(d => d.close_price), 20),
        rsi: this.calculateRSI(marketData.map(d => d.close_price), 14)
      }
    };
  }

  private calculateATR(marketData: any[], period = 14): number {
    if (marketData.length < period + 1) return 0.0015; // Default fallback
    
    const trueRanges = [];
    for (let i = 1; i < marketData.length; i++) {
      const high = marketData[i].high_price;
      const low = marketData[i].low_price;
      const prevClose = marketData[i-1].close_price;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
    }
    
    return trueRanges.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
  }

  private calculateOptimalLotSize(confidence: number, atr: number): number {
    // Risk-based position sizing
    const riskPercent = 0.02; // 2% risk per trade
    const accountBalance = 100000; // Default balance
    const riskAmount = accountBalance * riskPercent;
    const stopLossDistance = atr * 1.5;
    const lotSize = riskAmount / (stopLossDistance * 100000); // EUR/USD contract size
    
    // Scale by confidence
    return Math.max(0.01, Math.min(0.5, lotSize * confidence));
  }

  private calculateSMA(prices: number[], period: number): number[] {
    const sma = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  private calculateEMA(prices: number[], period: number): number[] {
    const ema = [prices[0]];
    const multiplier = 2 / (period + 1);
    
    for (let i = 1; i < prices.length; i++) {
      ema.push((prices[i] - ema[i-1]) * multiplier + ema[i-1]);
    }
    return ema;
  }

  private calculateRSI(prices: number[], period: number): number[] {
    const rsi = [];
    const gains = [];
    const losses = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i-1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
    
    return rsi;
  }

  private async broadcastSignal(signal: LiveSignal) {
    // Save to database
    await supabase
      .from('trading_signals')
      .insert({
        signal_id: signal.id,
        pair: signal.symbol,
        signal_type: signal.signal_type,
        confidence: signal.confidence,
        strength: signal.strength,
        entry_price: signal.entry_price,
        stop_loss: signal.stop_loss,
        take_profit: signal.take_profit,
        risk_reward_ratio: Math.abs((signal.take_profit - signal.entry_price) / (signal.entry_price - signal.stop_loss)),
        confluence_score: signal.confidence,
        factors: signal.risk_metrics,
        description: `Live ${signal.model_source} signal`,
        alert_level: signal.confidence > 0.8 ? 'high' : 'medium'
      });

    // Broadcast to subscribers
    this.callbacks.forEach(callback => callback(signal));
  }

  private async closePosition(positionId: string, reason: string) {
    await supabase.rpc('close_shadow_trade', {
      p_trade_id: positionId,
      p_close_price: unifiedMarketData.getCurrentPrice(),
      p_close_reason: reason
    });
  }

  private async closeAllPositions(reason: string) {
    const positions = await this.getOpenPositions();
    await Promise.all(positions.map(pos => this.closePosition(pos.id, reason)));
  }

  private async reduceExposure() {
    const positions = await this.getOpenPositions();
    // Close lowest confluence score positions first
    const sortedPositions = positions.sort((a, b) => (a.confluence_score || 0) - (b.confluence_score || 0));
    
    for (let i = 0; i < Math.ceil(positions.length / 2); i++) {
      await this.closePosition(sortedPositions[i].id, 'exposure_reduction');
    }
  }

  // ============= PUBLIC API =============
  start() {
    this.isActive = true;
    console.log('🚀 Real-time quantitative analytics started');
  }

  stop() {
    this.isActive = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    console.log('⏹️ Real-time quantitative analytics stopped');
  }

  onSignal(callback: (signal: LiveSignal) => void) {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) this.callbacks.splice(index, 1);
    };
  }

  onPositionUpdate(callback: (update: PositionUpdate) => void) {
    this.positionCallbacks.push(callback);
    return () => {
      const index = this.positionCallbacks.indexOf(callback);
      if (index > -1) this.positionCallbacks.splice(index, 1);
    };
  }
}

export const realTimeQuantAnalytics = new RealTimeQuantAnalytics();