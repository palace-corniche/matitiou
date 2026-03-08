

# Quantitative Analysis Verification Report

## Status: Engine Running, But No Signals Stored

### What's Working
1. The Godmode engine **IS running** on every cron cycle. Latest log at 23:26:19:
   ```
   📐 Quant Godmode: HOLD | H=0.29 Z=-1.31 OU=-2.10 Entropy=0.59
   ```
2. All 7 models compute successfully (Hurst, Z-score, OU, Entropy visible in logs)
3. The `calculateKellyFraction` duplicate error from 23:25:23 was resolved by a redeployment at 23:26:18

### Why Zero Signals in Database
The engine has **two gatekeeping layers** that both block storage:

**Layer 1 (line 1701):** If no regime-specific threshold is met, `signalType` stays `'hold'` and the function returns empty immediately — before even computing Bayesian, Kelly, or Monte Carlo.

Current values: H=0.29 (mean-reverting regime), Z=-1.31. The mean-reversion threshold requires `|Z| > 1.5`, so the signal stays `hold`.

**Layer 2 (line 1765):** Even if a direction is chosen, composite must be > 0.55 AND Monte Carlo P(TP) > 0.50.

**Result:** The market is in a quiet ranging state. Z-score of -1.31 is close but below the 1.5 threshold. No signal gets stored, so the UI dashboard shows all defaults/zeros.

### The Real Problem
The dashboard only displays data from stored `modular_signals` records. When the engine outputs HOLD, **nothing is stored** — meaning the UI never shows the live model outputs (Hurst, Entropy, Z-score, etc.) even though they're computed every cycle.

## Proposed Fix

### 1. Always store quant model state (even on HOLD)
Store a "diagnostic" record to a lightweight table or reuse `modular_signals` with `signal_type = 'hold'` so the dashboard can always display live model outputs.

Specifically: when `signalType === 'hold'`, still insert a `modular_signals` row with `signal_type = 'hold'`, `confidence = compositeScore`, and all model outputs in `calculation_parameters`. This gives the UI something to read.

### 2. Update the frontend to read HOLD records
Change the `QuantitativeAnalysis.tsx` query to fetch the latest `quantitative_analysis` signal regardless of `signal_type` (including `hold`), and parse the model outputs from `calculation_parameters` to populate the gauges.

### Changes

| File | What |
|---|---|
| `supabase/functions/generate-confluence-signals/master-signal-modules.ts` | After HOLD determination (line 1701-1703), insert a modular_signal with `signal_type='hold'` containing all computed model metrics in `calculation_parameters` |
| `src/pages/QuantitativeAnalysis.tsx` | Update query to include `hold` signals; parse and display model outputs from the latest record |

### Expected Result
- Dashboard always shows live Hurst, Entropy, Z-score, OU params, regime — even when no trade signal fires
- When a real BUY/SELL signal fires, it appears highlighted as actionable
- No more permanently empty UI

