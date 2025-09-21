import { UnifiedTick } from './unifiedMarketData';
import { GlobalShadowTrade } from './globalShadowTradingEngine';

export interface PnLResult {
  pips: number;
  pnl: number;
  pipValue: number;
}

/**
 * Centralized PnL and Pips calculation for EUR/USD shadow trading
 * 
 * Key formulas:
 * - Pips: For EUR/USD, 1 pip = 0.0001 price movement
 * - PnL: pips * lot_size * pip_value_per_lot
 * - EUR/USD pip value: $10 per pip for 1.0 lot size
 */
export class PnLCalculator {
  private static readonly EUR_USD_PIP_SIZE = 0.0001;
  private static readonly EUR_USD_PIP_VALUE_PER_LOT = 10; // $10 per pip for 1.0 lot

  /**
   * Calculate pips for a trade
   */
  static calculatePips(
    tradeType: 'buy' | 'sell',
    entryPrice: number,
    currentPrice: number
  ): number {
    if (tradeType === 'buy') {
      // BUY: profit when current price > entry price
      return (currentPrice - entryPrice) / this.EUR_USD_PIP_SIZE;
    } else {
      // SELL: profit when current price < entry price  
      return (entryPrice - currentPrice) / this.EUR_USD_PIP_SIZE;
    }
  }

  /**
   * Calculate PnL in USD for EUR/USD
   */
  static calculatePnL(
    pips: number,
    lotSize: number
  ): number {
    return pips * lotSize * this.EUR_USD_PIP_VALUE_PER_LOT;
  }

  /**
   * Get current market price for closing position
   */
  static getCurrentPrice(tradeType: 'buy' | 'sell', tick: UnifiedTick): number {
    // Use bid for closing long positions, ask for closing short positions
    return tradeType === 'buy' ? tick.bid : tick.ask;
  }

  /**
   * Calculate complete PnL result for a trade
   */
  static calculateTradeResult(
    trade: GlobalShadowTrade,
    currentTick: UnifiedTick
  ): PnLResult {
    const currentPrice = this.getCurrentPrice(trade.trade_type as 'buy' | 'sell', currentTick);
    const pips = this.calculatePips(trade.trade_type as 'buy' | 'sell', trade.entry_price, currentPrice);
    const pipValue = trade.lot_size * this.EUR_USD_PIP_VALUE_PER_LOT;
    const pnl = pips * pipValue;

    return {
      pips,
      pnl,
      pipValue
    };
  }

  /**
   * Calculate pip value for a given lot size
   */
  static calculatePipValue(lotSize: number): number {
    return lotSize * this.EUR_USD_PIP_VALUE_PER_LOT;
  }

  /**
   * Calculate required margin for EUR/USD trade
   */
  static calculateRequiredMargin(
    lotSize: number,
    entryPrice: number,
    leverage: number = 100
  ): number {
    const contractSize = 100000; // Standard lot size for EUR/USD
    const positionValue = lotSize * contractSize * entryPrice;
    return positionValue / leverage;
  }

  /**
   * Format pips for display (1 decimal place)
   */
  static formatPips(pips: number): string {
    return pips.toFixed(1);
  }

  /**
   * Format PnL for display (2 decimal places with currency symbol)
   */
  static formatPnL(pnl: number): string {
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}$${pnl.toFixed(2)}`;
  }
}

/**
 * Quick helper function for trade metrics calculation
 */
export function calculateTradeMetrics(trade: GlobalShadowTrade, currentTick: UnifiedTick): PnLResult {
  const currentPrice = trade.trade_type === 'buy' ? currentTick.bid : currentTick.ask;
  const pips = PnLCalculator.calculatePips(trade.trade_type, trade.entry_price, currentPrice);
  const pipValue = trade.lot_size * 10; // $10 per pip for 1.0 lot EUR/USD
  const pnl = pips * pipValue;

  return {
    pips,
    pnl,
    pipValue
  };
}

export default PnLCalculator;