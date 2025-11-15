/**
 * SHARED PNL CALCULATOR - Single Source of Truth
 * 
 * This is the ONLY place where pip and PnL calculations should happen.
 * All edge functions MUST use this utility to ensure consistency.
 * 
 * CRITICAL: This matches the backend close_shadow_trade function exactly.
 */

const EUR_USD_PIP_SIZE = 0.0001;
const EUR_USD_PIP_VALUE_PER_LOT = 10; // $10 per pip for 1.0 lot
const COMMISSION_PER_LOT = 50; // $50 per full lot = $0.50 per 0.01 lot

export interface PnLResult {
  pips: number;
  pnl: number;
  grossPnl: number;
  commission: number;
  pipValue: number;
}

/**
 * Calculate pips for a trade
 * BUY: profit when close > entry
 * SELL: profit when close < entry
 */
export function calculatePips(
  tradeType: 'buy' | 'sell',
  entryPrice: number,
  exitPrice: number
): number {
  if (tradeType === 'buy') {
    return (exitPrice - entryPrice) / EUR_USD_PIP_SIZE;
  } else {
    return (entryPrice - exitPrice) / EUR_USD_PIP_SIZE;
  }
}

/**
 * Calculate commission for a trade
 */
export function calculateCommission(lotSize: number): number {
  return lotSize * COMMISSION_PER_LOT;
}

/**
 * Calculate gross PnL (before commission)
 */
export function calculateGrossPnL(pips: number, lotSize: number): number {
  return pips * lotSize * EUR_USD_PIP_VALUE_PER_LOT;
}

/**
 * Calculate complete PnL result for a trade
 * This is the MAIN function that should be used everywhere
 */
export function calculateTradePnL(
  tradeType: 'buy' | 'sell',
  entryPrice: number,
  exitPrice: number,
  lotSize: number
): PnLResult {
  const pips = calculatePips(tradeType, entryPrice, exitPrice);
  const grossPnl = calculateGrossPnL(pips, lotSize);
  const commission = calculateCommission(lotSize);
  const pnl = grossPnl - commission;
  const pipValue = lotSize * EUR_USD_PIP_VALUE_PER_LOT;

  return {
    pips,
    pnl,
    grossPnl,
    commission,
    pipValue
  };
}

/**
 * Format pips for display
 */
export function formatPips(pips: number): string {
  return pips.toFixed(1);
}

/**
 * Format PnL for display
 */
export function formatPnL(pnl: number): string {
  const sign = pnl >= 0 ? '+' : '';
  return `${sign}$${pnl.toFixed(2)}`;
}

/**
 * Calculate required margin for EUR/USD trade
 */
export function calculateRequiredMargin(
  lotSize: number,
  entryPrice: number,
  leverage: number = 100
): number {
  const contractSize = 100000; // Standard lot size
  const positionValue = lotSize * contractSize * entryPrice;
  return positionValue / leverage;
}
