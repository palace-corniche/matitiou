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
 * CRITICAL: This calculator matches the backend close_shadow_trade function exactly
 * 
 * Key formulas:
 * - Pips: For EUR/USD, 1 pip = 0.0001 price movement
 * - BUY: pips = (close_price - entry_price) / 0.0001
 * - SELL: pips = (entry_price - close_price) / 0.0001
 * - PnL: pips * lot_size * $10 - commission - swap
 * - EUR/USD pip value: $10 per pip for 1.0 lot size
 * 
 * Bid/Ask Spread Handling:
 * - BUY trades: enter at ASK (market + spread/2), close at BID (market - spread/2)
 * - SELL trades: enter at BID (market - spread/2), close at ASK (market + spread/2)
 */
export class PnLCalculator {
  private static readonly EUR_USD_PIP_SIZE = 0.0001;
  private static readonly EUR_USD_PIP_VALUE_PER_LOT = 10; // $10 per pip for 1.0 lot
  private static readonly DEFAULT_SPREAD = 0.00015; // 1.5 pips
  private static readonly COMMISSION_PER_LOT = 0.5; // $0.50 per 0.01 lot

  /**
   * Apply bid/ask spread to market price
   * BUY: close at BID (market - spread/2)
   * SELL: close at ASK (market + spread/2)
   */
  static applySpread(
    tradeType: 'buy' | 'sell',
    marketPrice: number,
    spread: number = this.DEFAULT_SPREAD
  ): number {
    if (tradeType === 'buy') {
      return marketPrice - (spread / 2); // BID
    } else {
      return marketPrice + (spread / 2); // ASK
    }
  }

  /**
   * Calculate pips for a trade
   * CRITICAL: This matches the backend calculation exactly
   */
  static calculatePips(
    tradeType: 'buy' | 'sell',
    entryPrice: number,
    closePrice: number
  ): number {
    if (tradeType === 'buy') {
      // BUY: profit when close price > entry price
      return (closePrice - entryPrice) / this.EUR_USD_PIP_SIZE;
    } else {
      // SELL: profit when close price < entry price  
      return (entryPrice - closePrice) / this.EUR_USD_PIP_SIZE;
    }
  }

  /**
   * Calculate gross PnL in USD (before fees)
   */
  static calculateGrossPnL(
    pips: number,
    lotSize: number
  ): number {
    return pips * lotSize * this.EUR_USD_PIP_VALUE_PER_LOT;
  }

  /**
   * Calculate commission
   */
  static calculateCommission(lotSize: number): number {
    return lotSize * this.COMMISSION_PER_LOT;
  }

  /**
   * Calculate net PnL (after fees)
   */
  static calculateNetPnL(
    pips: number,
    lotSize: number,
    commission?: number,
    swap?: number
  ): number {
    const grossPnL = this.calculateGrossPnL(pips, lotSize);
    const totalCommission = commission ?? this.calculateCommission(lotSize);
    const totalSwap = swap ?? 0;
    return grossPnL - totalCommission - totalSwap;
  }

  /**
   * Get current market price for closing position with spread applied
   */
  static getCurrentPrice(tradeType: 'buy' | 'sell', tick: UnifiedTick): number {
    // BUY closes at BID, SELL closes at ASK
    return tradeType === 'buy' ? tick.bid : tick.ask;
  }

  /**
   * Calculate complete PnL result for a trade
   * CRITICAL: This matches backend calculation exactly
   */
  static calculateTradeResult(
    trade: GlobalShadowTrade,
    currentTick: UnifiedTick
  ): PnLResult {
    // Get the correct close price (bid for BUY, ask for SELL)
    const closePrice = this.getCurrentPrice(trade.trade_type as 'buy' | 'sell', currentTick);
    
    // Calculate pips using exact backend formula
    const pips = this.calculatePips(
      trade.trade_type as 'buy' | 'sell', 
      trade.entry_price, 
      closePrice
    );
    
    // Calculate pip value
    const pipValue = trade.lot_size * this.EUR_USD_PIP_VALUE_PER_LOT;
    
    // Calculate net PnL with commission
    const pnl = this.calculateNetPnL(pips, trade.lot_size);

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
 * CRITICAL: Uses the unified PnLCalculator for consistency
 */
export function calculateTradeMetrics(trade: GlobalShadowTrade, currentTick: UnifiedTick): PnLResult {
  return PnLCalculator.calculateTradeResult(trade, currentTick);
}

export default PnLCalculator;