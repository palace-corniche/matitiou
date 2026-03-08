

# Godmode Quantitative Analysis Engine

## Current State
The module uses 3 simple indicators: Z-score vs SMA20, ROC momentum, ATR percentile. It produces basic buy/sell signals. The UI is a flat list of signals with no statistical depth.

## Upgrade: Advanced Statistical & Probabilistic Engine

### Backend: `master-signal-modules.ts` — Replace `generateQuantitativeSignals()`

Add these mathematical models stacked into a composite scoring system:

1. **Hurst Exponent** — Measures fractal memory of the price series. H > 0.5 = trending (favor momentum), H < 0.5 = mean-reverting (favor Z-score). Dynamically shifts strategy weights.

2. **Ornstein-Uhlenbeck Mean Reversion** — Fit OU process parameters (θ, μ, σ) to estimate mean-reversion speed and half-life. Generates signals when price deviates > 2σ from equilibrium AND half-life < 20 bars.

3. **Kalman Filter Price Estimation** — Recursive state estimator that separates signal from noise. Generates a smoothed "true price" estimate. Signal fires when raw price deviates significantly from Kalman estimate.

4. **Entropy-Based Regime Detection** — Shannon entropy of return distribution over rolling window. Low entropy = predictable regime (boost confidence). High entropy = chaotic (reduce confidence).

5. **Bayesian Probability of Profit** — Given the current Z-score, momentum, vol regime, and Hurst exponent, compute P(profit | features) using closed-form Bayesian update from historical trade outcomes stored in `shadow_trades`.

6. **Optimal Kelly Criterion** — Full Kelly with fractional Kelly (0.25x) for position sizing recommendation based on computed edge and win probability.

7. **Monte Carlo Confidence Bands** — 1000-iteration bootstrap of recent returns to estimate probability of hitting TP before SL. Only signal when P(TP) > 60%.

Each model outputs a sub-score [0, 1]. The composite signal combines them with learned weights:

```text
Signal Score = Σ (model_weight × model_score)

Weights (initial):
  Hurst regime      0.15
  OU mean-reversion  0.20
  Kalman deviation   0.15
  Entropy regime     0.10
  Bayesian P(profit) 0.25
  Monte Carlo P(TP)  0.15
```

Signal fires BUY/SELL only when composite > 0.65 AND Monte Carlo P(TP) > 0.60.

### Backend: Store Rich Intermediate Data
The `intermediate_values` field in `modular_signals` will store all model outputs:
```json
{
  "hurst_exponent": 0.42,
  "ou_params": { "theta": 0.15, "mu": 1.1540, "sigma": 0.0003, "half_life": 12.3 },
  "kalman_estimate": 1.1538,
  "kalman_deviation": -0.0005,
  "shannon_entropy": 0.72,
  "bayesian_p_profit": 0.68,
  "monte_carlo_p_tp": 0.64,
  "kelly_fraction": 0.08,
  "composite_score": 0.71,
  "strategy_selected": "mean_reversion",
  "regime": "mean_reverting"
}
```

### Frontend: `src/pages/QuantitativeAnalysis.tsx` — Full Rebuild

Replace the basic page with a rich dashboard:

1. **Top metrics row** (6 cards): Hurst Exponent gauge, Current Regime badge, Shannon Entropy, Bayesian P(Profit), Kelly Fraction, Monte Carlo P(TP hit)

2. **Probability Distribution Panel** — Visual bar showing BUY vs SELL probability from Bayesian computation, with confidence interval

3. **Model Breakdown Table** — Each of the 7 models with its current output value, weight, contribution score, and status indicator

4. **Statistical Metrics Card** — OU half-life, Kalman deviation, Z-score, rolling Sharpe, rolling Sortino, max drawdown estimate

5. **Signal History** — Enhanced version of current list with all intermediate values displayed per signal

## Changes Summary

| File | What |
|---|---|
| `supabase/functions/generate-confluence-signals/master-signal-modules.ts` | Replace `generateQuantitativeSignals()` with 7-model composite engine (Hurst, OU, Kalman, Entropy, Bayesian, Kelly, Monte Carlo) |
| `src/pages/QuantitativeAnalysis.tsx` | Full rebuild with probability gauges, model breakdown table, regime indicator, statistical metrics |

## Expected Result
- Quantitative module becomes the most mathematically rigorous signal source
- Each signal carries full probabilistic justification
- Dashboard shows real-time model outputs with transparency into why each decision was made
- Better signal quality through multi-model consensus

