// Volatility-Adaptive Stop-Loss model for EUR/USD 15m.
// Linear regression trained on 2023-2025 EUR/USD 15m data, OOS R^2 0.31-0.50,
// confirmed on May 2026 (R^2 = 0.366). Predicts MAGNITUDE only (next-hour pip range),
// NOT direction. Source: user spec, Phase "Volatility-Adaptive Stop-Loss Filter".

const MODEL_INTERCEPT = 12.3701;
const COEF = {
  range_ema5: 2.7933,
  range_ma20: 0.2373,
  range_lag1: -0.0536,
  range_lag2: -0.1194,
  hour: -0.4418,
};

export interface Candle15m {
  timestamp: string; // ISO
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
}

export interface AdaptiveSLResult {
  ok: boolean;
  reason?: string;
  predicted_1hr_range_pips?: number;
  suggested_sl_pips?: number;
  suggested_tp_pips?: number;
  regime?: "quiet" | "normal" | "elevated";
  features?: Record<string, number>;
}

// EWM mean with pandas-style `span` (alpha = 2/(span+1)), no bias-adjust.
function ewmMean(values: number[], span: number): number {
  const alpha = 2 / (span + 1);
  let s = values[0];
  for (let i = 1; i < values.length; i++) s = alpha * values[i] + (1 - alpha) * s;
  return s;
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Compute adaptive SL/TP for EUR/USD using the last ~25 15m candles.
 * Candles must be sorted ASCENDING by timestamp, most recent last.
 * Returns ok=false (with reason) if data is insufficient or the prediction
 * lands outside sane bounds — caller should fall back to fixed SL.
 */
export function computeAdaptiveSL(
  candles15m: Candle15m[],
  opts: {
    multiplier?: number;
    minSlPips?: number;
    maxSlPips?: number;
    rrRatio?: number; // TP = SL * rrRatio
  } = {},
): AdaptiveSLResult {
  const multiplier = opts.multiplier ?? 1.3;
  const minSl = opts.minSlPips ?? 8;
  const maxSl = opts.maxSlPips ?? 60;
  const rr = opts.rrRatio ?? 2.0;

  if (!Array.isArray(candles15m) || candles15m.length < 21) {
    return { ok: false, reason: `need >=21 15m candles, got ${candles15m?.length ?? 0}` };
  }

  // Use the most recent 25 (or all if fewer >=21)
  const window = candles15m.slice(-25);
  const ranges = window.map((c) => (Number(c.high_price) - Number(c.low_price)) * 10000);
  if (ranges.some((r) => !Number.isFinite(r) || r < 0)) {
    return { ok: false, reason: "non-finite or negative range in window" };
  }

  const range_ema5 = ewmMean(ranges, 5);
  const range_ma20 = mean(ranges.slice(-20));
  const range_lag1 = ranges[ranges.length - 1];
  const range_lag2 = ranges[ranges.length - 2];
  const hour = new Date(window[window.length - 1].timestamp).getUTCHours();

  const predicted =
    MODEL_INTERCEPT +
    COEF.range_ema5 * range_ema5 +
    COEF.range_ma20 * range_ma20 +
    COEF.range_lag1 * range_lag1 +
    COEF.range_lag2 * range_lag2 +
    COEF.hour * hour;

  if (!Number.isFinite(predicted) || predicted <= 0 || predicted > 200) {
    return { ok: false, reason: `prediction out of bounds: ${predicted}` };
  }

  const rawSl = predicted * multiplier;
  const sl = Math.max(minSl, Math.min(maxSl, rawSl));
  const tp = sl * rr;

  const regime: "quiet" | "normal" | "elevated" =
    predicted < 14 ? "quiet" : predicted > 28 ? "elevated" : "normal";

  return {
    ok: true,
    predicted_1hr_range_pips: Number(predicted.toFixed(2)),
    suggested_sl_pips: Number(sl.toFixed(2)),
    suggested_tp_pips: Number(tp.toFixed(2)),
    regime,
    features: {
      range_ema5: Number(range_ema5.toFixed(3)),
      range_ma20: Number(range_ma20.toFixed(3)),
      range_lag1: Number(range_lag1.toFixed(3)),
      range_lag2: Number(range_lag2.toFixed(3)),
      hour,
    },
  };
}
