import { ConfluenceSignal } from './confluenceEngine';
import { CandleData } from './realMarketData';

export interface VirtualTrade {
  id: string;
  signalId: string;
  symbol: string;
  type: 'buy' | 'sell';
  entryPrice: number;
  entryTime: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  confluenceScore: number;
  status: 'open' | 'closed';
  exitPrice?: number;
  exitTime?: number;
  exitReason?: 'tp' | 'sl' | 'time' | 'manual' | 'opposing_signal';
  pnl?: number;
  pnlPercent?: number;
  riskRewardRatio?: number;
  holdingTimeMinutes?: number;
}

export interface VirtualPortfolio {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  openTrades: VirtualTrade[];
  closedTrades: VirtualTrade[];
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  expectancy: number;
}

export interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  averageRR: number;
  totalPnl: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  expectancy: number;
  averageHoldingTime: number;
  bestTrade: number;
  worstTrade: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  monthlyReturns: Array<{ month: string; return: number; trades: number }>;
  strategyBreakdown: Record<string, { trades: number; winRate: number; pnl: number }>;
}

export class ShadowTradingEngine {
  private portfolio: VirtualPortfolio;
  private readonly INITIAL_BALANCE = 100000; // $100k virtual account
  private readonly DEFAULT_POSITION_SIZE = 10000; // $10k per trade (10%)
  private readonly MAX_RISK_PER_TRADE = 0.02; // 2% account risk
  private readonly MAX_OPEN_POSITIONS = 5;
  private readonly TRADE_TIMEOUT_HOURS = 24;

  constructor() {
    this.portfolio = this.initializePortfolio();
    this.loadPortfolioFromStorage();
  }

  private initializePortfolio(): VirtualPortfolio {
    return {
      balance: this.INITIAL_BALANCE,
      equity: this.INITIAL_BALANCE,
      margin: 0,
      freeMargin: this.INITIAL_BALANCE,
      marginLevel: 0,
      openTrades: [],
      closedTrades: [],
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      expectancy: 0
    };
  }

  // Auto-execute signal in virtual account
  public executeSignal(signal: ConfluenceSignal, currentPrice: number): VirtualTrade | null {
    try {
      // Check if we can open new positions
      if (this.portfolio.openTrades.length >= this.MAX_OPEN_POSITIONS) {
        console.log('Max open positions reached, skipping trade');
        return null;
      }

      // Check if we have an opposing signal open
      const opposingTrades = this.portfolio.openTrades.filter(trade => 
        trade.symbol === signal.pair && trade.type !== signal.signal
      );

      // Close opposing trades if any
      opposingTrades.forEach(trade => {
        this.closeTrade(trade.id, currentPrice, 'opposing_signal');
      });

      // Calculate position size based on risk
      const positionSize = this.calculatePositionSize(
        signal.stopLoss || this.calculateDefaultStopLoss(currentPrice, signal.signal),
        currentPrice,
        5 // Default risk score since ConfluenceSignal doesn't have riskScore
      );

      const trade: VirtualTrade = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        signalId: signal.id,
        symbol: signal.pair,
        type: signal.signal as 'buy' | 'sell',
        entryPrice: currentPrice,
        entryTime: Date.now(),
        stopLoss: signal.stopLoss || this.calculateDefaultStopLoss(currentPrice, signal.signal),
        takeProfit: signal.takeProfit || this.calculateDefaultTakeProfit(currentPrice, signal.signal, signal.riskRewardRatio || 2),
        positionSize,
        confluenceScore: signal.confluenceScore,
        status: 'open'
      };

      // Calculate R:R ratio
      const risk = Math.abs(trade.entryPrice - trade.stopLoss);
      const reward = Math.abs(trade.takeProfit - trade.entryPrice);
      trade.riskRewardRatio = reward / risk;

      this.portfolio.openTrades.push(trade);
      this.portfolio.totalTrades++;
      this.portfolio.margin += positionSize * 0.01; // 1% margin requirement
      this.portfolio.freeMargin = this.portfolio.balance - this.portfolio.margin;

      this.savePortfolioToStorage();
      
      console.log(`🚀 Shadow Trade Executed: ${trade.type.toUpperCase()} ${trade.symbol} @ ${trade.entryPrice}`);
      return trade;
    } catch (error) {
      console.error('Error executing shadow trade:', error);
      return null;
    }
  }

  // Update open trades with current market prices
  public updateTrades(marketData: Record<string, number>): void {
    const closedTrades: VirtualTrade[] = [];

    this.portfolio.openTrades.forEach(trade => {
      const currentPrice = marketData[trade.symbol];
      if (!currentPrice) return;

      // Check for SL/TP hits
      const shouldClose = this.shouldCloseTrade(trade, currentPrice);
      if (shouldClose.close) {
        const closedTrade = this.closeTrade(trade.id, currentPrice, shouldClose.reason);
        if (closedTrade) closedTrades.push(closedTrade);
      }

      // Check for time-based exit
      const hoursOpen = (Date.now() - trade.entryTime) / (1000 * 60 * 60);
      if (hoursOpen >= this.TRADE_TIMEOUT_HOURS) {
        const closedTrade = this.closeTrade(trade.id, currentPrice, 'time');
        if (closedTrade) closedTrades.push(closedTrade);
      }
    });

    // Update portfolio equity
    this.calculatePortfolioEquity(marketData);
    this.updatePortfolioMetrics();
    
    if (closedTrades.length > 0) {
      this.savePortfolioToStorage();
    }
  }

  private shouldCloseTrade(trade: VirtualTrade, currentPrice: number): { close: boolean; reason?: 'tp' | 'sl' } {
    if (trade.type === 'buy') {
      if (currentPrice <= trade.stopLoss) return { close: true, reason: 'sl' };
      if (currentPrice >= trade.takeProfit) return { close: true, reason: 'tp' };
    } else {
      if (currentPrice >= trade.stopLoss) return { close: true, reason: 'sl' };
      if (currentPrice <= trade.takeProfit) return { close: true, reason: 'tp' };
    }
    return { close: false };
  }

  public closeTrade(tradeId: string, exitPrice: number, reason: VirtualTrade['exitReason']): VirtualTrade | null {
    const tradeIndex = this.portfolio.openTrades.findIndex(t => t.id === tradeId);
    if (tradeIndex === -1) return null;

    const trade = this.portfolio.openTrades[tradeIndex];
    trade.status = 'closed';
    trade.exitPrice = exitPrice;
    trade.exitTime = Date.now();
    trade.exitReason = reason;
    trade.holdingTimeMinutes = (trade.exitTime - trade.entryTime) / (1000 * 60);

    // Calculate P&L
    const priceMove = trade.type === 'buy' 
      ? exitPrice - trade.entryPrice 
      : trade.entryPrice - exitPrice;
    
    trade.pnl = (priceMove / trade.entryPrice) * trade.positionSize;
    trade.pnlPercent = (priceMove / trade.entryPrice) * 100;

    // Update portfolio
    this.portfolio.balance += trade.pnl;
    this.portfolio.margin -= trade.positionSize * 0.01;
    this.portfolio.freeMargin = this.portfolio.balance - this.portfolio.margin;

    // Move to closed trades
    this.portfolio.openTrades.splice(tradeIndex, 1);
    this.portfolio.closedTrades.push(trade);

    // Update stats
    if (trade.pnl > 0) {
      this.portfolio.winningTrades++;
    } else {
      this.portfolio.losingTrades++;
    }

    console.log(`💰 Shadow Trade Closed: ${trade.pnl > 0 ? 'WIN' : 'LOSS'} ${trade.pnl.toFixed(2)} (${reason?.toUpperCase()})`);
    return trade;
  }

  private calculatePositionSize(stopLoss: number, entryPrice: number, riskScore: number): number {
    const riskAmount = this.portfolio.balance * this.MAX_RISK_PER_TRADE;
    const stopLossDistance = Math.abs(entryPrice - stopLoss) / entryPrice;
    
    // Adjust position size based on risk score (1-10)
    const riskAdjustment = Math.max(0.5, Math.min(1.5, (10 - riskScore) / 5));
    
    let positionSize = (riskAmount / stopLossDistance) * riskAdjustment;
    
    // Cap at default position size
    return Math.min(positionSize, this.DEFAULT_POSITION_SIZE);
  }

  private calculateDefaultStopLoss(price: number, signal: string): number {
    const defaultRisk = 0.015; // 1.5% default risk
    return signal === 'buy' ? price * (1 - defaultRisk) : price * (1 + defaultRisk);
  }

  private calculateDefaultTakeProfit(price: number, signal: string, rr: number): number {
    const defaultRisk = 0.015;
    const defaultReward = defaultRisk * rr;
    return signal === 'buy' ? price * (1 + defaultReward) : price * (1 - defaultReward);
  }

  private calculatePortfolioEquity(marketData: Record<string, number>): void {
    let unrealizedPnl = 0;

    this.portfolio.openTrades.forEach(trade => {
      const currentPrice = marketData[trade.symbol];
      if (currentPrice) {
        const priceMove = trade.type === 'buy' 
          ? currentPrice - trade.entryPrice 
          : trade.entryPrice - currentPrice;
        unrealizedPnl += (priceMove / trade.entryPrice) * trade.positionSize;
      }
    });

    this.portfolio.equity = this.portfolio.balance + unrealizedPnl;
    this.portfolio.marginLevel = this.portfolio.margin > 0 
      ? (this.portfolio.equity / this.portfolio.margin) * 100 
      : 0;
  }

  private updatePortfolioMetrics(): void {
    if (this.portfolio.closedTrades.length === 0) return;

    const winningTrades = this.portfolio.closedTrades.filter(t => t.pnl! > 0);
    const losingTrades = this.portfolio.closedTrades.filter(t => t.pnl! <= 0);

    this.portfolio.winRate = (winningTrades.length / this.portfolio.closedTrades.length) * 100;
    this.portfolio.averageWin = winningTrades.reduce((sum, t) => sum + t.pnl!, 0) / Math.max(1, winningTrades.length);
    this.portfolio.averageLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl!, 0)) / Math.max(1, losingTrades.length);
    this.portfolio.profitFactor = this.portfolio.averageLoss > 0 ? this.portfolio.averageWin / this.portfolio.averageLoss : 0;
    
    const totalPnl = this.portfolio.closedTrades.reduce((sum, t) => sum + t.pnl!, 0);
    this.portfolio.expectancy = totalPnl / this.portfolio.closedTrades.length;

    // Calculate max drawdown
    let peak = this.INITIAL_BALANCE;
    let maxDD = 0;
    let runningBalance = this.INITIAL_BALANCE;

    this.portfolio.closedTrades.forEach(trade => {
      runningBalance += trade.pnl!;
      if (runningBalance > peak) peak = runningBalance;
      const currentDD = ((peak - runningBalance) / peak) * 100;
      if (currentDD > maxDD) maxDD = currentDD;
    });

    this.portfolio.maxDrawdown = maxDD;
  }

  public getPortfolio(): VirtualPortfolio {
    return { ...this.portfolio };
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    const closedTrades = this.portfolio.closedTrades;
    
    if (closedTrades.length === 0) {
      return this.getEmptyMetrics();
    }

    const winningTrades = closedTrades.filter(t => t.pnl! > 0);
    const losingTrades = closedTrades.filter(t => t.pnl! <= 0);
    const totalPnl = closedTrades.reduce((sum, t) => sum + t.pnl!, 0);

    // Calculate consecutive wins/losses
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    closedTrades.forEach(trade => {
      if (trade.pnl! > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWinStreak);
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLossStreak);
      }
    });

    // Monthly returns
    const monthlyData = this.calculateMonthlyReturns();

    return {
      totalTrades: closedTrades.length,
      winRate: this.portfolio.winRate,
      averageRR: closedTrades.reduce((sum, t) => sum + (t.riskRewardRatio || 0), 0) / closedTrades.length,
      totalPnl,
      maxDrawdown: this.portfolio.maxDrawdown,
      sharpeRatio: this.calculateSharpeRatio(),
      profitFactor: this.portfolio.profitFactor,
      expectancy: this.portfolio.expectancy,
      averageHoldingTime: closedTrades.reduce((sum, t) => sum + (t.holdingTimeMinutes || 0), 0) / closedTrades.length,
      bestTrade: Math.max(...closedTrades.map(t => t.pnl!)),
      worstTrade: Math.min(...closedTrades.map(t => t.pnl!)),
      consecutiveWins: maxConsecutiveWins,
      consecutiveLosses: maxConsecutiveLosses,
      monthlyReturns: monthlyData,
      strategyBreakdown: this.calculateStrategyBreakdown()
    };
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      totalTrades: 0, winRate: 0, averageRR: 0, totalPnl: 0, maxDrawdown: 0,
      sharpeRatio: 0, profitFactor: 0, expectancy: 0, averageHoldingTime: 0,
      bestTrade: 0, worstTrade: 0, consecutiveWins: 0, consecutiveLosses: 0,
      monthlyReturns: [], strategyBreakdown: {}
    };
  }

  private calculateSharpeRatio(): number {
    if (this.portfolio.closedTrades.length < 2) return 0;
    
    const returns = this.portfolio.closedTrades.map(t => (t.pnl! / this.INITIAL_BALANCE) * 100);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? avgReturn / stdDev : 0;
  }

  private calculateMonthlyReturns(): Array<{ month: string; return: number; trades: number }> {
    const monthlyData: Record<string, { pnl: number; trades: number }> = {};
    
    this.portfolio.closedTrades.forEach(trade => {
      const date = new Date(trade.exitTime!);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { pnl: 0, trades: 0 };
      }
      
      monthlyData[monthKey].pnl += trade.pnl!;
      monthlyData[monthKey].trades++;
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      return: (data.pnl / this.INITIAL_BALANCE) * 100,
      trades: data.trades
    }));
  }

  private calculateStrategyBreakdown(): Record<string, { trades: number; winRate: number; pnl: number }> {
    const breakdown: Record<string, { trades: VirtualTrade[]; pnl: number }> = {};
    
    this.portfolio.closedTrades.forEach(trade => {
      const scoreRange = this.getConfluenceScoreRange(trade.confluenceScore);
      
      if (!breakdown[scoreRange]) {
        breakdown[scoreRange] = { trades: [], pnl: 0 };
      }
      
      breakdown[scoreRange].trades.push(trade);
      breakdown[scoreRange].pnl += trade.pnl!;
    });

    return Object.fromEntries(
      Object.entries(breakdown).map(([range, data]) => [
        range,
        {
          trades: data.trades.length,
          winRate: (data.trades.filter(t => t.pnl! > 0).length / data.trades.length) * 100,
          pnl: data.pnl
        }
      ])
    );
  }

  private getConfluenceScoreRange(score: number): string {
    if (score >= 80) return 'Very Strong (80-100%)';
    if (score >= 60) return 'Strong (60-79%)';
    if (score >= 40) return 'Moderate (40-59%)';
    if (score >= 20) return 'Weak (20-39%)';
    return 'Very Weak (0-19%)';
  }

  public resetPortfolio(): void {
    this.portfolio = this.initializePortfolio();
    this.savePortfolioToStorage();
  }

  private savePortfolioToStorage(): void {
    try {
      localStorage.setItem('shadowTradingPortfolio', JSON.stringify(this.portfolio));
    } catch (error) {
      console.error('Error saving portfolio to storage:', error);
    }
  }

  private loadPortfolioFromStorage(): void {
    try {
      const stored = localStorage.getItem('shadowTradingPortfolio');
      if (stored) {
        const parsedPortfolio = JSON.parse(stored);
        this.portfolio = { ...this.portfolio, ...parsedPortfolio };
      }
    } catch (error) {
      console.error('Error loading portfolio from storage:', error);
    }
  }
}

// Global instance
export const shadowTradingEngine = new ShadowTradingEngine();