

# Intermarket Analysis: Godmode Upgrade

## Current State
The intermarket module has the **same circular dependency problem** as quantitative had before the fix. `generateIntermarketSignals()` only **reads** existing `intermarket_analysis` signals from the database — but nothing computes and inserts them (the `process-analysis-pipeline` is disabled). The signals that exist (31 records) are from the `module-reactivation` test function inserting dummy data with generic `calculation_parameters: {factors: 3, source: "intermarket_multi"}`.

The UI shows mostly "N/A" values because the signals carry no real intermarket data.

## Plan: Build a Real Intermarket Engine

Replace `generateIntermarketSignals()` with a self-contained engine that computes from real data (correlations table + candle data + news sentiment), similar to the Quantitative Godmode pattern.

### Backend: `master-signal-modules.ts` — New `generateIntermarketSignals()`

**5-model composite system:**

1. **Correlation Regime Analysis** — Read real-time correlations from the `correlations` table (DXY, GBP/USD, USD/JPY, GOLD, OIL, SPX, VIX). Compute a "correlation alignment score" — when multiple correlated assets agree on direction, signal strength increases.

2. **Dollar Index Divergence** — EUR/USD has -0.81 correlation with DXY. Detect divergences where EUR/USD and DXY move in the same direction (anomaly = reversion opportunity). Score based on divergence magnitude.

3. **Risk Appetite Index** — Composite of VIX correlation, SPX correlation, and Gold correlation. Classify as risk-on/risk-off/neutral. In risk-off, favor safe-haven flows (USD strength = EUR/USD sell). In risk-on, favor risk currencies.

4. **Commodity Flow Analysis** — Gold and Oil correlations with EUR/USD indicate capital flow patterns. Strong positive gold correlation + rising gold sentiment = EUR/USD bullish. Use news sentiment for commodity direction proxy.

5. **Cross-Currency Confirmation** — If GBP/USD (+0.76 corr) and AUD/USD (+0.54 corr) are both trending in the same direction as EUR/USD signal, boost confidence. If they diverge, reduce confidence.

**Composite scoring:**
```text
Weights:
  Correlation alignment  0.25
  DXY divergence         0.25
  Risk appetite          0.20
  Commodity flow         0.15
  Cross-currency confirm 0.15
```

Signal fires when composite > 0.55. Always stores diagnostic record (including HOLD) with all model outputs — same pattern as Quantitative Godmode.

### Backend: `index.ts`
Update the call to pass candles directly (already done). No major changes needed since the function signature stays the same.

### Frontend: `src/pages/IntermarketAnalysis.tsx` — Full Rebuild

Replace the current page with a dashboard that reads the stored `calculation_parameters`:

1. **Top metrics row** (5 cards): Correlation Alignment Score, DXY Divergence, Risk Appetite (risk-on/off badge), Commodity Flow Score, Cross-Currency Confirmation Score
2. **Correlation Heatmap** — Visual grid of all tracked correlations from the `correlations` table with color intensity
3. **Model Breakdown Table** — Each of the 5 models with current value, weight, contribution, and status
4. **Risk Environment Panel** — Risk-on/off classification with contributing factors
5. **Signal History** — Latest intermarket signals with full intermediate data

### Changes

| File | What |
|---|---|
| `supabase/functions/generate-confluence-signals/master-signal-modules.ts` | Replace `generateIntermarketSignals()` with 5-model composite engine computing from correlations table + candles + news |
| `src/pages/IntermarketAnalysis.tsx` | Full rebuild with correlation heatmap, model breakdown, risk environment panel |

### Expected Result
- Intermarket module produces real signals based on cross-asset correlation analysis
- Dashboard always shows live model outputs (even on HOLD)
- Correlation data from `correlations` table is actively used for signal generation
- Risk-on/risk-off classification drives confidence adjustments

