// Multi-Level Risk Management System - Cascading Risk Controls for Survivability
// Implements hierarchical risk controls with black swan protection and automated circuit breakers

export interface RiskLimits {
  // Position Level
  maxPositionSize: number; // Max % of account per position
  maxLeverage: number; // Maximum leverage allowed
  maxRiskPerTrade: number; // Max % risk per trade
  
  // Portfolio Level  
  maxTotalExposure: number; // Max % of account in all positions
  maxCorrelatedExposure: number; // Max exposure to correlated positions
  maxSectorExposure: number; // Max exposure per sector/currency
  
  // Time-based Limits
  maxDailyLoss: number; // Max daily loss %
  maxWeeklyLoss: number; // Max weekly loss %
  maxMonthlyLoss: number; // Max monthly loss %
  
  // Drawdown Limits
  maxDrawdown: number; // Max portfolio drawdown %
  dailyDrawdownLimit: number; // Daily drawdown circuit breaker
  
  // Frequency Limits
  maxTradesPerDay: number;
  maxTradesPerHour: number;
  minTimeBetweenTrades: number; // Seconds
}

export interface RiskEvent {
  id: string;
  timestamp: Date;
  type: 'warning' | 'limit_breach' | 'circuit_breaker' | 'black_swan';
  level: 'position' | 'portfolio' | 'system';
  message: string;
  currentValue: number;
  limitValue: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionTaken: string;
  affectedPositions: string[];
}

export interface PortfolioMetrics {
  totalValue: number;
  totalExposure: number;
  totalMargin: number;
  unrealizedPnL: number;
  realizedPnL: number;
  dailyPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
  currentDrawdown: number;
  maxDrawdownToday: number;
  positionCount: number;
  correlationRisk: number;
  var95: number; // Value at Risk 95%
  cvar95: number; // Conditional VaR 95%
}

export interface BlackSwanIndicator {
  name: string;
  value: number;
  threshold: number;
  severity: number; // 0-1
  description: string;
  timeDetected: Date;
}

export class RiskManagement {
  private riskLimits: RiskLimits;
  private riskEvents: RiskEvent[] = [];
  private lastTradeTime: Date | null = null;
  private dailyTradeCount: number = 0;
  private hourlyTradeCount: number = 0;
  private currentHour: number = new Date().getHours();
  private currentDate: string = new Date().toDateString();
  private systemPaused: boolean = false;
  private pauseReason: string = '';
  
  constructor(limits?: Partial<RiskLimits>) {
    this.riskLimits = {
      // Position Level Defaults
      maxPositionSize: 0.10, // 10%
      maxLeverage: 10,
      maxRiskPerTrade: 0.02, // 2%
      
      // Portfolio Level Defaults
      maxTotalExposure: 0.50, // 50%
      maxCorrelatedExposure: 0.25, // 25%
      maxSectorExposure: 0.30, // 30%
      
      // Time-based Defaults
      maxDailyLoss: 0.05, // 5%
      maxWeeklyLoss: 0.10, // 10%
      maxMonthlyLoss: 0.15, // 15%
      
      // Drawdown Defaults
      maxDrawdown: 0.20, // 20%
      dailyDrawdownLimit: 0.03, // 3%
      
      // Frequency Defaults
      maxTradesPerDay: 20,
      maxTradesPerHour: 5,
      minTimeBetweenTrades: 30, // 30 seconds
      
      ...limits
    };
  }
  
  // ==================== PRIMARY RISK VALIDATION ====================
  
  validateNewPosition(
    positionSize: number,
    entryPrice: number,
    stopLoss: number,
    symbol: string,
    portfolioMetrics: PortfolioMetrics,
    openPositions: any[]
  ): { allowed: boolean; reasons: string[]; adjustedSize?: number } {
    const reasons: string[] = [];
    let allowed = true;
    let adjustedSize = positionSize;
    
    // Check if system is paused
    if (this.systemPaused) {
      return { 
        allowed: false, 
        reasons: [`System paused: ${this.pauseReason}`] 
      };
    }
    
    // 1. Position Size Validation
    const positionSizePercent = positionSize / portfolioMetrics.totalValue;
    if (positionSizePercent > this.riskLimits.maxPositionSize) {
      adjustedSize = portfolioMetrics.totalValue * this.riskLimits.maxPositionSize;
      reasons.push(`Position size reduced from ${(positionSizePercent * 100).toFixed(1)}% to ${(this.riskLimits.maxPositionSize * 100).toFixed(1)}%`);
    }
    
    // 2. Risk Per Trade Validation
    const riskAmount = Math.abs(entryPrice - stopLoss) / entryPrice * adjustedSize;
    const riskPercent = riskAmount / portfolioMetrics.totalValue;
    if (riskPercent > this.riskLimits.maxRiskPerTrade) {
      const maxRiskSize = (this.riskLimits.maxRiskPerTrade * portfolioMetrics.totalValue) / (Math.abs(entryPrice - stopLoss) / entryPrice);
      adjustedSize = Math.min(adjustedSize, maxRiskSize);
      reasons.push(`Risk per trade capped at ${(this.riskLimits.maxRiskPerTrade * 100).toFixed(1)}%`);
    }
    
    // 3. Total Exposure Validation
    const newTotalExposure = (portfolioMetrics.totalExposure + adjustedSize) / portfolioMetrics.totalValue;
    if (newTotalExposure > this.riskLimits.maxTotalExposure) {
      const availableExposure = (this.riskLimits.maxTotalExposure * portfolioMetrics.totalValue) - portfolioMetrics.totalExposure;
      if (availableExposure > 0) {
        adjustedSize = Math.min(adjustedSize, availableExposure);
        reasons.push(`Total exposure limit: using available exposure of ${(availableExposure / portfolioMetrics.totalValue * 100).toFixed(1)}%`);
      } else {
        allowed = false;
        reasons.push(`Total exposure limit exceeded: ${(newTotalExposure * 100).toFixed(1)}% > ${(this.riskLimits.maxTotalExposure * 100).toFixed(1)}%`);
      }
    }
    
    // 4. Correlation Risk Validation
    const correlationRisk = this.calculateCorrelationRisk(symbol, adjustedSize, openPositions);
    if (correlationRisk > this.riskLimits.maxCorrelatedExposure) {
      allowed = false;
      reasons.push(`Correlation risk too high: ${(correlationRisk * 100).toFixed(1)}% > ${(this.riskLimits.maxCorrelatedExposure * 100).toFixed(1)}%`);
    }
    
    // 5. Frequency Validation
    const frequencyCheck = this.validateTradingFrequency();
    if (!frequencyCheck.allowed) {
      allowed = false;
      reasons.push(frequencyCheck.reason);
    }
    
    // 6. Drawdown Validation
    if (portfolioMetrics.currentDrawdown > this.riskLimits.maxDrawdown) {
      allowed = false;
      reasons.push(`Maximum drawdown exceeded: ${(portfolioMetrics.currentDrawdown * 100).toFixed(1)}% > ${(this.riskLimits.maxDrawdown * 100).toFixed(1)}%`);
    }
    
    // 7. Daily Loss Validation
    const dailyLossPercent = Math.abs(portfolioMetrics.dailyPnL) / portfolioMetrics.totalValue;
    if (portfolioMetrics.dailyPnL < 0 && dailyLossPercent > this.riskLimits.maxDailyLoss) {
      allowed = false;
      reasons.push(`Daily loss limit exceeded: ${(dailyLossPercent * 100).toFixed(1)}% > ${(this.riskLimits.maxDailyLoss * 100).toFixed(1)}%`);
    }
    
    // Log risk event if position was blocked or adjusted
    if (!allowed || adjustedSize !== positionSize) {
      this.logRiskEvent({
        type: allowed ? 'warning' : 'limit_breach',
        level: 'position',
        message: `Position validation: ${allowed ? 'adjusted' : 'blocked'}`,
        currentValue: positionSize,
        limitValue: adjustedSize,
        severity: allowed ? 'medium' : 'high',
        actionTaken: allowed ? 'Position size adjusted' : 'Position blocked',
        affectedPositions: []
      });
    }
    
    return { allowed, reasons, adjustedSize: allowed ? adjustedSize : undefined };
  }
  
  // ==================== CONTINUOUS MONITORING ====================
  
  monitorPortfolioRisk(
    portfolioMetrics: PortfolioMetrics,
    openPositions: any[]
  ): { alerts: RiskEvent[]; actions: string[] } {
    const alerts: RiskEvent[] = [];
    const actions: string[] = [];
    
    // 1. Monitor Drawdown Levels
    if (portfolioMetrics.currentDrawdown > this.riskLimits.dailyDrawdownLimit) {
      alerts.push(this.createRiskEvent({
        type: 'circuit_breaker',
        level: 'portfolio',
        message: 'Daily drawdown circuit breaker triggered',
        currentValue: portfolioMetrics.currentDrawdown,
        limitValue: this.riskLimits.dailyDrawdownLimit,
        severity: 'critical',
        actionTaken: 'System paused for remainder of day',
        affectedPositions: openPositions.map(p => p.id)
      }));
      
      this.pauseSystem('Daily drawdown limit exceeded');
      actions.push('PAUSE_SYSTEM');
    }
    
    // 2. Monitor VaR/CVaR Levels
    if (portfolioMetrics.cvar95 > portfolioMetrics.totalValue * 0.10) { // CVaR > 10% of portfolio
      alerts.push(this.createRiskEvent({
        type: 'warning',
        level: 'portfolio',
        message: 'High CVaR detected',
        currentValue: portfolioMetrics.cvar95 / portfolioMetrics.totalValue,
        limitValue: 0.10,
        severity: 'high',
        actionTaken: 'Reduce position sizes',
        affectedPositions: openPositions.map(p => p.id)
      }));
      
      actions.push('REDUCE_POSITIONS');
    }
    
    // 3. Monitor Correlation Risk
    if (portfolioMetrics.correlationRisk > this.riskLimits.maxCorrelatedExposure) {
      alerts.push(this.createRiskEvent({
        type: 'limit_breach',
        level: 'portfolio',
        message: 'Correlation risk limit exceeded',
        currentValue: portfolioMetrics.correlationRisk,
        limitValue: this.riskLimits.maxCorrelatedExposure,
        severity: 'high',
        actionTaken: 'Close most correlated positions',
        affectedPositions: this.identifyMostCorrelatedPositions(openPositions)
      }));
      
      actions.push('CLOSE_CORRELATED');
    }
    
    // 4. Black Swan Detection
    const blackSwanIndicators = this.detectBlackSwanEvents(portfolioMetrics, openPositions);
    blackSwanIndicators.forEach(indicator => {
      alerts.push(this.createRiskEvent({
        type: 'black_swan',
        level: 'system',
        message: `Black swan detected: ${indicator.name}`,
        currentValue: indicator.value,
        limitValue: indicator.threshold,
        severity: 'critical',
        actionTaken: 'Emergency position reduction',
        affectedPositions: openPositions.map(p => p.id)
      }));
      
      actions.push('EMERGENCY_REDUCE');
    });
    
    return { alerts, actions };
  }
  
  // ==================== BLACK SWAN DETECTION ====================
  
  private detectBlackSwanEvents(
    portfolioMetrics: PortfolioMetrics,
    openPositions: any[]
  ): BlackSwanIndicator[] {
    const indicators: BlackSwanIndicator[] = [];
    
    // 1. Extreme Volatility Spike
    const volatilitySpike = this.calculateVolatilitySpike(openPositions);
    if (volatilitySpike > 3.0) { // 3x normal volatility
      indicators.push({
        name: 'Extreme Volatility Spike',
        value: volatilitySpike,
        threshold: 3.0,
        severity: Math.min(1, (volatilitySpike - 3) / 2),
        description: `Market volatility increased ${volatilitySpike.toFixed(1)}x normal levels`,
        timeDetected: new Date()
      });
    }
    
    // 2. Correlation Breakdown
    const correlationBreakdown = this.detectCorrelationBreakdown(openPositions);
    if (correlationBreakdown > 0.8) {
      indicators.push({
        name: 'Correlation Breakdown',
        value: correlationBreakdown,
        threshold: 0.8,
        severity: correlationBreakdown,
        description: 'Historical correlations breaking down - systematic risk event',
        timeDetected: new Date()
      });
    }
    
    // 3. Liquidity Crunch
    const liquidityCrunch = this.detectLiquidityCrunch(portfolioMetrics);
    if (liquidityCrunch > 0.7) {
      indicators.push({
        name: 'Liquidity Crunch',
        value: liquidityCrunch,
        threshold: 0.7,
        severity: liquidityCrunch,
        description: 'Market liquidity severely degraded',
        timeDetected: new Date()
      });
    }
    
    // 4. Gap Risk
    const gapRisk = this.calculateGapRisk(openPositions);
    if (gapRisk > 0.05) { // 5% gap risk
      indicators.push({
        name: 'Extreme Gap Risk',
        value: gapRisk,
        threshold: 0.05,
        severity: Math.min(1, gapRisk / 0.1),
        description: `High probability of overnight gaps affecting ${(gapRisk * 100).toFixed(1)}% of portfolio`,
        timeDetected: new Date()
      });
    }
    
    return indicators;
  }
  
  // ==================== UTILITY FUNCTIONS ====================
  
  private validateTradingFrequency(): { allowed: boolean; reason: string } {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDate = now.toDateString();
    
    // Reset counters if new hour/day
    if (currentHour !== this.currentHour) {
      this.hourlyTradeCount = 0;
      this.currentHour = currentHour;
    }
    
    if (currentDate !== this.currentDate) {
      this.dailyTradeCount = 0;
      this.currentDate = currentDate;
    }
    
    // Check daily limit
    if (this.dailyTradeCount >= this.riskLimits.maxTradesPerDay) {
      return { allowed: false, reason: `Daily trade limit reached: ${this.dailyTradeCount}/${this.riskLimits.maxTradesPerDay}` };
    }
    
    // Check hourly limit
    if (this.hourlyTradeCount >= this.riskLimits.maxTradesPerHour) {
      return { allowed: false, reason: `Hourly trade limit reached: ${this.hourlyTradeCount}/${this.riskLimits.maxTradesPerHour}` };
    }
    
    // Check minimum time between trades
    if (this.lastTradeTime) {
      const timeSinceLastTrade = (now.getTime() - this.lastTradeTime.getTime()) / 1000;
      if (timeSinceLastTrade < this.riskLimits.minTimeBetweenTrades) {
        return { 
          allowed: false, 
          reason: `Minimum time between trades not met: ${timeSinceLastTrade.toFixed(0)}s < ${this.riskLimits.minTimeBetweenTrades}s` 
        };
      }
    }
    
    return { allowed: true, reason: 'Frequency check passed' };
  }
  
  recordTrade(): void {
    this.lastTradeTime = new Date();
    this.dailyTradeCount++;
    this.hourlyTradeCount++;
  }
  
  private calculateCorrelationRisk(symbol: string, positionSize: number, openPositions: any[]): number {
    // Simplified correlation calculation
    const sameSymbolExposure = openPositions
      .filter(pos => pos.symbol === symbol)
      .reduce((sum, pos) => sum + Math.abs(pos.size), 0);
    
    const sameCurrencyExposure = openPositions
      .filter(pos => pos.symbol.includes(symbol.split('/')[0]) || pos.symbol.includes(symbol.split('/')[1]))
      .reduce((sum, pos) => sum + Math.abs(pos.size), 0);
    
    const totalPortfolioValue = openPositions.reduce((sum, pos) => sum + Math.abs(pos.size), 0) + positionSize;
    
    return Math.max(
      (sameSymbolExposure + positionSize) / totalPortfolioValue,
      sameCurrencyExposure / totalPortfolioValue * 0.7 // Partial correlation
    );
  }
  
  private calculateVolatilitySpike(openPositions: any[]): number {
    // Simplified volatility spike calculation
    // In production, this would compare current volatility to historical average
    return 1.0; // Placeholder
  }
  
  private detectCorrelationBreakdown(openPositions: any[]): number {
    // Simplified correlation breakdown detection
    return 0.0; // Placeholder
  }
  
  private detectLiquidityCrunch(portfolioMetrics: PortfolioMetrics): number {
    // Simplified liquidity detection based on spread widening
    return 0.0; // Placeholder
  }
  
  private calculateGapRisk(openPositions: any[]): number {
    // Calculate overnight gap risk based on position sizes and volatility
    return 0.0; // Placeholder
  }
  
  private identifyMostCorrelatedPositions(openPositions: any[]): string[] {
    // Identify positions with highest correlation for closure
    return openPositions.slice(0, Math.ceil(openPositions.length / 2)).map(p => p.id);
  }
  
  private createRiskEvent(params: Omit<RiskEvent, 'id' | 'timestamp'>): RiskEvent {
    const event: RiskEvent = {
      id: `risk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...params
    };
    
    this.riskEvents.push(event);
    
    // Keep only last 1000 events
    if (this.riskEvents.length > 1000) {
      this.riskEvents.shift();
    }
    
    return event;
  }
  
  private logRiskEvent(params: Omit<RiskEvent, 'id' | 'timestamp'>): void {
    this.createRiskEvent(params);
  }
  
  private pauseSystem(reason: string): void {
    this.systemPaused = true;
    this.pauseReason = reason;
    
    // Auto-resume at start of next day (simplified)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeToResume = tomorrow.getTime() - Date.now();
    setTimeout(() => {
      this.resumeSystem();
    }, timeToResume);
  }
  
  resumeSystem(): void {
    this.systemPaused = false;
    this.pauseReason = '';
    this.logRiskEvent({
      type: 'warning',
      level: 'system',
      message: 'System resumed after pause',
      currentValue: 0,
      limitValue: 0,
      severity: 'low',
      actionTaken: 'System resumed',
      affectedPositions: []
    });
  }
  
  // ==================== PUBLIC INTERFACE ====================
  
  updateRiskLimits(newLimits: Partial<RiskLimits>): void {
    this.riskLimits = { ...this.riskLimits, ...newLimits };
    
    this.logRiskEvent({
      type: 'warning',
      level: 'system',
      message: 'Risk limits updated',
      currentValue: Object.keys(newLimits).length,
      limitValue: 0,
      severity: 'low',
      actionTaken: 'Risk parameters updated',
      affectedPositions: []
    });
  }
  
  getRiskLimits(): RiskLimits {
    return { ...this.riskLimits };
  }
  
  getRecentRiskEvents(hours: number = 24): RiskEvent[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.riskEvents.filter(event => event.timestamp >= cutoff);
  }
  
  getSystemStatus(): {
    isPaused: boolean;
    pauseReason: string;
    dailyTrades: number;
    hourlyTrades: number;
    lastTradeTime: Date | null;
    recentAlerts: number;
  } {
    const recentAlerts = this.getRecentRiskEvents(1).filter(e => e.severity === 'high' || e.severity === 'critical').length;
    
    return {
      isPaused: this.systemPaused,
      pauseReason: this.pauseReason,
      dailyTrades: this.dailyTradeCount,
      hourlyTrades: this.hourlyTradeCount,
      lastTradeTime: this.lastTradeTime,
      recentAlerts
    };
  }
}
