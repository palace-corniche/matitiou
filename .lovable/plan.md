

# End-to-End Test & Remaining Mock Data Cleanup

## Current State Summary

### Pipeline Status (from edge function logs)
- `fetch-market-data`: Working, 40 data points fetched
- `aggregate-candles`: Working, producing 15m/1h/4h/1d candles
- `check-trade-exits`: Working, checking SL/TP
- `execute-shadow-trades`: Working (market closed on Sunday)
- `sync-market-data-enhanced`: Working, 500 candles synced
- `generate-confluence-signals`: Only showing shutdown logs — may not be producing `modular_signals`

### Console Errors
1. **CorrelationMatrix.tsx line 120**: `data-lov-id` prop on `React.Fragment` — harmless dev warning from Lovable's instrumentation, not a real bug

### Remaining `Math.random()` in Frontend Components (4 files)
| File | Usage | Verdict |
|------|-------|---------|
| `IntelligenceBacktestingPanel.tsx:52` | Progress bar animation | Acceptable (cosmetic) |
| `sidebar.tsx:653` | Skeleton loading width | Acceptable (UI lib) |
| `TradingTerminal.tsx:189` | Session ID generation | Acceptable (ID gen) |
| `AutomationPanel.tsx:176` | Rule ID generation | Acceptable (ID gen) |

### Remaining `Math.random()` in Services (problematic — generates fake data)

| File | Lines | Issue | Fix |
|------|-------|-------|-----|
| **`intelligenceBacktester.ts`** | 193-220, 672-717 | `generateSyntheticMarketData()` fallback creates random OHLC; `runBacktest()` returns entirely random results | Replace `runBacktest()` with real backtest using DB data; keep synthetic as labeled fallback |
| **`newsAnalysis.ts`** | 130-197 | `fetchRelevantNews()` and `fetchEconomicEvents()` return mock data instead of querying `news_events` and `economic_calendar` tables | Query real tables |
| **`quantitativeAnalysisAdapter.ts`** | 187, 232 | Implied vol and beta use `Math.random()` | Compute IV as 1.12x historical vol; estimate beta from returns correlation |

## Implementation Plan

### Phase 1: Fix `newsAnalysis.ts` — query real DB tables
- Replace `fetchRelevantNews()` to query `news_events` table (21 real rows)
- Replace `fetchEconomicEvents()` to query `economic_calendar` table (32 real rows)
- Map DB columns to existing `NewsItem` and `EconomicEvent` interfaces
- Keep empty-array fallback if no data

### Phase 2: Fix `quantitativeAnalysisAdapter.ts` — remove 2 random lines
- Line 187: `impliedVol = historicalVol * 1.12` (standard premium, no randomness)
- Line 232: `betaToMarket = 1.0` (neutral beta without market index data)

### Phase 3: Fix `intelligenceBacktester.ts` `runBacktest()` 
- The `runBacktest()` method (lines 672-720) returns entirely random results — replace with actual computation from the real backtest engine that already exists in lines 230-670
- The `generateSyntheticMarketData()` fallback (lines 193-220) is acceptable as a labeled fallback when no DB data exists, but add a console warning

### Phase 4: Trigger pipeline and verify `modular_signals`
- Invoke `generate-confluence-signals` to confirm it produces modular_signals rows
- Check that all 6 analysis page queries return real data

**Files to edit:**
- `src/services/newsAnalysis.ts`
- `src/services/analysisAdapters/quantitativeAnalysisAdapter.ts`
- `src/services/intelligenceBacktester.ts`

