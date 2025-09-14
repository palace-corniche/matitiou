import { UnifiedTick } from './unifiedMarketData';
import { UnifiedShadowTrade } from './shadowTradingEngineUnified';

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
   * Calculate PnL for a trade
   */
  static calculatePnL(
    tradeType: 'buy' | 'sell',
    entryPrice: number,
    currentPrice: number,
    lotSize: number
  ): number {
    const pips = this.calculatePips(tradeType, entryPrice, currentPrice);
    const pipValue = lotSize * this.EUR_USD_PIP_VALUE_PER_LOT;
    return pips * pipValue;
  }

  /**
   * Get the appropriate current price for a trade based on direction
   * BUY positions: use bid price (selling price)
   * SELL positions: use ask price (buying back price)
   */
  static getCurrentPrice(tradeType: 'buy' | 'sell', tick: UnifiedTick): number {
    if (tradeType === 'buy') {
      return tick.bid; // BUY positions close at bid
    } else {
      return tick.ask; // SELL positions close at ask
    }
  }

  /**
   * Calculate complete PnL result for a trade
   */
  static calculateTradeResult(
    trade: UnifiedShadowTrade,
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

export default PnLCalculator;