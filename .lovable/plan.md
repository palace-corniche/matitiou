

# Quantitative Analysis Module: Diagnosis

## Finding: The Module is Completely Dead

The `quantitative_analysis` module has **zero signals** in the database. It has never contributed to any trading decision.

### Evidence
- `modular_signals` table has signals from: `technical_analysis` (17), `sentiment_analysis` (35), `specialized_analysis` (37), `intermarket_analysis` (31). **Zero from `quantitative_analysis`**.
- Every recent `master_signals` entry shows `contributing_modules` containing only technical, sentiment, specialized, and intermarket. **Quantitative is never listed.**
- The only code that would have populated `quantitative_analysis` signals was in `process-analysis-pipeline`, which is **explicitly disabled** (returns immediately with `disabled: true`).

### Root Cause Chain

1. **No producer**: The `process-analysis-pipeline` edge function was the only thing that inserted `module_id = 'quantitative_analysis'` rows into `modular_signals`. It was disabled because it generated fake/random signals.
2. **Consumer finds nothing**: `generateStrategySignals()` in `master-signal-modules.ts` (line 1019-1052) queries for `quantitative_analysis` signals, finds none, and silently returns an empty array.
3. **Mapping is also wrong**: In the `contributing_modules` mapping (line 613), `'timeframe'` maps to `quantitative_analysis` — but the actual source label is `strategy_quantitative`, meaning even if signals existed, the module wouldn't be correctly attributed.

### Impact on Trading Decisions
**Zero impact.** The system operates on only 4 modules: technical, sentiment, specialized, intermarket. The Bayesian fusion and confluence scoring never includes any quantitative factor. The "Quantitative Analysis" page in the UI shows an empty state.

## Proposed Fix

### Option A: Build Real Quantitative Analysis (Recommended)

Add a real quantitative module inside `generate-confluence-signals/master-signal-modules.ts` that computes from actual candle data:

- **Mean Reversion Score**: Z-score of current price vs 20-period SMA — generates buy when oversold (Z < -2), sell when overbought (Z > 2)
- **Momentum Score**: Rate of change over 10 and 20 periods
- **Volatility Regime**: ATR percentile ranking to adjust confidence
- **Statistical Edge**: Compute rolling win rate of mean-reversion vs momentum strategies from closed trades

This would be called directly in the signal generation pipeline alongside the existing `generateStrategySignals`, producing real `quantitative_analysis` modular signals stored in the database.

### Changes

| File | What |
|---|---|
| `supabase/functions/generate-confluence-signals/master-signal-modules.ts` | Add new `generateQuantitativeSignals()` function with real statistical calculations |
| `supabase/functions/generate-confluence-signals/index.ts` | Call the new function in the pipeline, store results as `quantitative_analysis` modular signals, fix the module mapping (`'strategy'` → `'quantitative_analysis'`) |
| `supabase/functions/generate-confluence-signals/index.ts` | Add quantitative weight (0.15) to the Bayesian fusion weights |

### Expected Result
- Quantitative module produces real signals based on statistical analysis of candle data
- Signals appear on the Quantitative Analysis page
- Contributing to master signal decisions with ~15% weight
- No more dead/phantom module

