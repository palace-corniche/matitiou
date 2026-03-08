

# Fix All Market Analysis Pages with Real Data

## Problem Summary

All 6 analysis pages are broken because of **3 root causes**:

1. **`market_data_enhanced` table is empty** (0 rows) — all 6 adapters query this table, so they all return `null`
2. **Missing tables** — `economic_events` and `news_sentiment` don't exist (functions try to write to them and fail)
3. **Schema mismatches** — `calculate-correlations` writes `asset_a`/`asset_b`/`correlation_value` but the `correlations` table expects `symbol_pair`/`correlation_coefficient`
4. **`Math.random()` fake data** in sentiment adapter and market intelligence engine where real DB data is empty

## Solution: Connect Real Data Through Existing Pipeline

All data sources are **free** — no new API keys needed. The system already has:
- **TwelveData** (demo key) → `market_data_feed` (40 rows, working)
- **ForexFactory** (free public JSON) → economic calendar
- **Alpha Vantage** (key already stored) → news sentiment
- **Aggregated candles** (2,881 rows, working)

The fix is to **bridge the gaps** between existing data and the pages.

---

## Changes

### Phase 1: Populate `market_data_enhanced` from `aggregated_candles`

**Create edge function `sync-market-data-enhanced/index.ts`**

This function copies data from `aggregated_candles` (2,881 rows) into `market_data_enhanced` with the column mapping the adapters expect (`open_price` → `open`, `close_price` → `close`, etc.). Runs after each `aggregate-candles` cycle.

This single fix will make **Technical, Quantitative, Specialized, and partially Intermarket/Sentiment** pages work — since all adapters query `market_data_enhanced`.

### Phase 2: Fix database schema mismatches

**Migration: Create missing tables and fix columns**

1. Create `economic_events` table (the `populate-economic-calendar` function writes to this, not `economic_calendar`)
2. Fix `calculate-correlations` function to use correct column names (`symbol_pair`, `correlation_coefficient`) matching the existing `correlations` table schema

### Phase 3: Fix `populate-economic-calendar` to also write to `economic_calendar`

Edit the function to insert into the existing `economic_calendar` table (which the Fundamental adapter queries) in addition to `economic_events`. Map fields: `event_name`, `event_time`, `currency`, `impact`, `actual_value`, `forecast_value`, `previous_value`.

### Phase 4: Fix Sentiment adapter — replace `Math.random()` with real DB queries

**Edit `sentimentAnalysisAdapter.ts`**

Replace `gatherSentimentData()` which currently returns `Math.random()` values for COT, news, and market sentiment. Instead:
- Query `cot_reports` table for COT data (use last available or show "no data")
- Query `news_events` table for news sentiment (populated by `populate-economic-calendar`)
- Derive market sentiment from real `aggregated_candles` volatility data

### Phase 5: Fix Intermarket adapter — replace hardcoded prices with real data

**Edit `intermarketAnalysisAdapter.ts`**

Replace `Math.random()` for gold price, oil price, VIX level, bond yields, etc. Instead:
- Use real correlations from DB (after Phase 2 fix)
- Derive volatility (VIX proxy) from real candle data ATR
- Show "N/A" for commodity/bond prices we can't fetch for free (rather than fake numbers)

### Phase 6: Fix `calculate-correlations` column mapping

**Edit `calculate-correlations/index.ts`**

Change the insert to use correct column names:
- `asset_a`/`asset_b` → combine into `symbol_pair` (e.g., "EUR/USD|GBP/USD")
- `correlation_value` → `correlation_coefficient`
- Remove non-existent columns (`window_period`, `calculation_date`)

### Phase 7: Fix Market Intelligence Engine — remove `Math.random()`

**Edit `marketIntelligenceEngine.ts`**

Replace random VIX, USD index, commodities, equities values. Instead:
- Calculate real volatility regime from `aggregated_candles` ATR
- Pull real economic surprises from `economic_calendar`
- Use real correlations from DB

### Phase 8: Wire up the pipeline — add cron triggers

Add cron jobs for the new/fixed functions:
- `sync-market-data-enhanced` — every 2 minutes (after candle aggregation)
- `populate-economic-calendar` — every 6 hours
- `calculate-correlations` — every hour

### Phase 9: Run initial data population

Invoke `populate-economic-calendar`, `calculate-correlations`, and `sync-market-data-enhanced` once to bootstrap data so pages show content immediately.

---

## Free Data Sources Used

| Data | Source | Cost |
|------|--------|------|
| EUR/USD prices | TwelveData demo API | Free |
| Economic calendar | ForexFactory JSON endpoint | Free |
| News sentiment | Alpha Vantage (key already stored) | Free (5/min) |
| Correlations | Computed from price data | Free |
| Technical indicators | Computed from candle data | Free |
| Volatility metrics | Computed from candle data | Free |
| Order flow proxy | Computed from volume data | Free |

## What Will Still Show "No Data" (Honestly)

- Real-time commodity prices (Gold, Oil, Copper) — requires paid API
- Real bond yields (US10Y, GER10Y) — requires paid API  
- Real VIX level — requires paid API
- COT reports — requires CFTC data scraping (can add later)

These will show as "Data unavailable" instead of fake random numbers, which is more honest and professional.

