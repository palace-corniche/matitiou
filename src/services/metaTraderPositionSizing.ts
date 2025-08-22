// MetaTrader-style position sizing with lot-based calculations
interface LotSizeConfig {
  type: 'standard' | 'mini' | 'micro' | 'nano';
  contractSize: number;
  minLotSize: number;
  maxLotSize: number;
  lotStep: number;
}

interface AccountConfig {
  currency: string;
  leverage: number;
  accountType: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginCallLevel: number;
  stopOutLevel: number;
}

interface PipConfig {
  symbol: string;
  digits: number;
  pipPosition: number;
  pointValue: number;
}

export interface PositionCalculation {
  lotSize: number;
  contractSize: number;
  positionValue: number;
  marginRequired: number;
  pipValue: number;
  maxLotSize: number;
  recommendedLotSize: number;
  riskAmount: number;
  marginLevel: number;
  canTrade: boolean;
  warnings: string[];
}

export class MetaTraderPositionSizing {
  private lotConfigs: Record<string, LotSizeConfig> = {
    standard: {
      type: 'standard',
      contractSize: 100000,
      minLotSize: 0.01,
      maxLotSize: 100,
      lotStep: 0.01
    },
    mini: {
      type: 'mini',
      contractSize: 10000,
      minLotSize: 0.1,
      maxLotSize: 1000,
      lotStep: 0.1
    },
    micro: {
      type: 'micro',
      contractSize: 1000,
      minLotSize: 1,
      maxLotSize: 10000,
      lotStep: 1
    },
    nano: {
      type: 'nano',
      contractSize: 100,
      minLotSize: 10,
      maxLotSize: 100000,
      lotStep: 10
    }
  };

  private pipConfigs: Record<string, PipConfig> = {
    'EUR/USD': { symbol: 'EURUSD', digits: 5, pipPosition: 4, pointValue: 0.00001 },
    'GBP/USD': { symbol: 'GBPUSD', digits: 5, pipPosition: 4, pointValue: 0.00001 },
    'USD/JPY': { symbol: 'USDJPY', digits: 3, pipPosition: 2, pointValue: 0.001 },
    'USD/CHF': { symbol: 'USDCHF', digits: 5, pipPosition: 4, pointValue: 0.00001 },
    'AUD/USD': { symbol: 'AUDUSD', digits: 5, pipPosition: 4, pointValue: 0.00001 },
    'USD/CAD': { symbol: 'USDCAD', digits: 5, pipPosition: 4, pointValue: 0.00001 }
  };

  calculatePosition(
    symbol: string,
    entryPrice: number,
    stopLoss: number,
    riskPercent: number,
    account: AccountConfig
  ): PositionCalculation {
    const lotConfig = this.lotConfigs[account.accountType] || this.lotConfigs.standard;
    const pipConfig = this.pipConfigs[symbol] || this.pipConfigs['EUR/USD'];
    
    // Calculate risk amount in account currency
    const riskAmount = account.balance * (riskPercent / 100);
    
    // Calculate stop loss distance in pips
    const stopLossDistance = Math.abs(entryPrice - stopLoss);
    const stopLossPips = stopLossDistance / pipConfig.pointValue;
    
    // Calculate pip value for one lot
    const basePipValue = this.calculatePipValue(symbol, lotConfig.contractSize, entryPrice, account.currency);
    
    // Calculate optimal lot size based on risk
    let optimalLotSize = 0;
    if (stopLossPips > 0 && basePipValue > 0) {
      optimalLotSize = riskAmount / (stopLossPips * basePipValue);
    }
    
    // Round to valid lot size
    const validLotSize = this.roundToValidLotSize(optimalLotSize, lotConfig);
    
    // Calculate margin required
    const marginRequired = this.calculateMarginRequired(
      validLotSize,
      entryPrice,
      lotConfig.contractSize,
      account.leverage
    );
    
    // Calculate position value
    const positionValue = validLotSize * lotConfig.contractSize * entryPrice;
    
    // Calculate pip value for actual position
    const actualPipValue = basePipValue * validLotSize;
    
    // Calculate maximum lot size based on free margin
    const maxLotSizeByMargin = this.calculateMaxLotSize(account, entryPrice, lotConfig);
    
    // Calculate margin level after trade
    const newMargin = account.margin + marginRequired;
    const marginLevel = newMargin > 0 ? (account.equity / newMargin) * 100 : 999;
    
    // Generate warnings
    const warnings: string[] = [];
    let canTrade = true;
    
    if (marginLevel < account.marginCallLevel) {
      warnings.push(`Margin call risk: ${marginLevel.toFixed(2)}% < ${account.marginCallLevel}%`);
      canTrade = false;
    }
    
    if (marginLevel < account.stopOutLevel) {
      warnings.push(`Stop out risk: ${marginLevel.toFixed(2)}% < ${account.stopOutLevel}%`);
      canTrade = false;
    }
    
    if (marginRequired > account.freeMargin) {
      warnings.push(`Insufficient free margin: ${marginRequired.toFixed(2)} > ${account.freeMargin.toFixed(2)}`);
      canTrade = false;
    }
    
    if (validLotSize > maxLotSizeByMargin) {
      warnings.push(`Lot size exceeds margin limit: ${validLotSize} > ${maxLotSizeByMargin.toFixed(2)}`);
    }
    
    return {
      lotSize: validLotSize,
      contractSize: lotConfig.contractSize,
      positionValue,
      marginRequired,
      pipValue: actualPipValue,
      maxLotSize: maxLotSizeByMargin,
      recommendedLotSize: Math.min(validLotSize, maxLotSizeByMargin),
      riskAmount,
      marginLevel,
      canTrade,
      warnings
    };
  }

  private calculatePipValue(
    symbol: string,
    contractSize: number,
    price: number,
    accountCurrency: string
  ): number {
    const pipConfig = this.pipConfigs[symbol] || this.pipConfigs['EUR/USD'];
    
    // Base pip value calculation
    let pipValue = contractSize * pipConfig.pointValue;
    
    // Currency conversion logic
    const baseCurrency = symbol.substring(0, 3);
    const quoteCurrency = symbol.substring(4, 7);
    
    if (quoteCurrency === accountCurrency) {
      // Direct calculation (e.g., EUR/USD for USD account)
      return pipValue;
    } else if (baseCurrency === accountCurrency) {
      // Inverse calculation (e.g., USD/JPY for USD account)
      return pipValue / price;
    } else {
      // Cross currency - simplified (would need conversion rates in real system)
      return pipValue; // Placeholder - would need exchange rates
    }
  }

  private calculateMarginRequired(
    lotSize: number,
    price: number,
    contractSize: number,
    leverage: number
  ): number {
    const positionValue = lotSize * contractSize * price;
    return positionValue / leverage;
  }

  private roundToValidLotSize(lotSize: number, config: LotSizeConfig): number {
    if (lotSize <= 0) return config.minLotSize;
    
    // Round to valid step
    const steps = Math.round(lotSize / config.lotStep);
    let validLotSize = steps * config.lotStep;
    
    // Ensure within bounds
    validLotSize = Math.max(config.minLotSize, validLotSize);
    validLotSize = Math.min(config.maxLotSize, validLotSize);
    
    return validLotSize;
  }

  private calculateMaxLotSize(
    account: AccountConfig,
    entryPrice: number,
    lotConfig: LotSizeConfig
  ): number {
    const maxMarginUsage = account.freeMargin * 0.8; // Use max 80% of free margin
    const marginPerLot = this.calculateMarginRequired(1, entryPrice, lotConfig.contractSize, account.leverage);
    
    if (marginPerLot <= 0) return lotConfig.maxLotSize;
    
    const maxLots = maxMarginUsage / marginPerLot;
    return this.roundToValidLotSize(maxLots, lotConfig);
  }

  calculatePipPnL(
    symbol: string,
    lotSize: number,
    entryPrice: number,
    currentPrice: number,
    tradeType: 'buy' | 'sell',
    accountCurrency: string
  ): { pips: number; pipPnL: number; currencyPnL: number } {
    const pipConfig = this.pipConfigs[symbol] || this.pipConfigs['EUR/USD'];
    const lotConfig = this.lotConfigs.standard; // Assume standard for pip calculation
    
    // Calculate pips
    const priceDistance = tradeType === 'buy' 
      ? currentPrice - entryPrice 
      : entryPrice - currentPrice;
    
    const pips = priceDistance / pipConfig.pointValue;
    
    // Calculate pip value for the position
    const pipValue = this.calculatePipValue(symbol, lotConfig.contractSize, entryPrice, accountCurrency);
    const pipPnL = pips * pipValue * lotSize;
    
    // Calculate currency P&L
    const contractSize = lotSize * lotConfig.contractSize;
    const currencyPnL = contractSize * priceDistance;
    
    return {
      pips: Math.round(pips * 10) / 10, // Round to 1 decimal
      pipPnL,
      currencyPnL
    };
  }

  getLotSizeOptions(accountType: string): LotSizeConfig {
    return this.lotConfigs[accountType] || this.lotConfigs.standard;
  }

  validateAccountSettings(account: Partial<AccountConfig>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!account.leverage || account.leverage < 1 || account.leverage > 500) {
      errors.push('Leverage must be between 1:1 and 1:500');
    }
    
    if (!account.balance || account.balance <= 0) {
      errors.push('Account balance must be greater than 0');
    }
    
    if (account.marginCallLevel && (account.marginCallLevel < 50 || account.marginCallLevel > 200)) {
      errors.push('Margin call level should be between 50% and 200%');
    }
    
    if (account.stopOutLevel && (account.stopOutLevel < 10 || account.stopOutLevel > 100)) {
      errors.push('Stop out level should be between 10% and 100%');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const metaTraderPositionSizing = new MetaTraderPositionSizing();