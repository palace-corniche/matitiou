

# Full App Audit: Real vs Mock/Static Data — Every Page & Button

## Methodology
Reviewed all 14 pages, their components, and the services they depend on. Searched for `Math.random()` across all source files (found 783 matches in 46 files). Cross-referenced with database table contents.

---

## PAGE-BY-PAGE STATUS

### 1. Dashboard (`/`) — MOSTLY REAL
- **Real**: Live EUR/USD price from TwelveData API, candle chart from `aggregated_candles`, 120+ technical indicators computed client-side from real candle data
- **Real**: Confluence signal engine runs on real data
- **Working buttons**: Refresh analysis button triggers real re-computation
- **Issue**: If candle data is stale (>5 min), falls back to computed variations

### 2. Shadow Trading (`/shadow-trading`) — REAL
- **Real**: Account balance, equity, P&L from `global_trading_account`
- **Real**: Open/closed trades from `shadow_trades`, trade execution via `execute_global_shadow_trade` DB function
- **Real**: Exit intelligence from `exit_intelligence` table
- **Working buttons**: Close trade, toggle auto-trading, reset account, refresh — all real DB operations
- **Real**: Master signals tab queries `master_signals`, module performance from `module_performance`
- **Real**: Data integrity monitors query real tables
- **Issue**: CandleDataValidation and PnLSystemVerification query real data but may show empty if no recent trades

### 3. Enhanced Trading (`/enhanced-trading`) — REAL
- Same component as Shadow Trading (`ShadowTradingDashboardUnified`), fully real

### 4. Intelligence Hub (`/intelligence-hub`) — MIXED
- **Tab: Automated Trading** — FUNCTIONAL but client-side only
  - Toggle start/stop works but `automatedTradingEngine` runs in-browser, not server-side
  - Rule creation works (stored in memory, not persisted to DB)
- **Tab: Fundamental Signals** — REAL but likely EMPTY
  - Queries `modular_signals` where `module_id = 'fundamental_analysis'` — likely 0 rows
  - Also filters by `is_active = true` column that doesn't exist → silently fails
- **Tab: Multi-Timeframe** — FAKE
  - `MultiTimeframeAnalysis` uses `Math.random()` for signal generation (lines 42-48)
  - Shows random bullish/bearish signals with random strength/confidence
- **Tab: Backtesting** — ENTIRELY FAKE
  - `IntelligenceBacktestingPanel` generates equity curve with `Math.random()` (lines 29-38)
  - Monthly returns are random, progress bar is fake animation
- **Tab: Portfolio** — Static text saying "visit Shadow Trading"

### 5. Signal Analytics (`/signal-analytics`) — REAL
- `SignalAnalyticsDashboard` queries real data: `adaptive_thresholds`, `signal_rejection_logs`, `master_signals`, `system_health`
- **Working buttons**: Refresh, pipeline triggers (invoke edge functions)
- All 4 tabs render the same dashboard (redundant but functional)

### 6. Enhanced Signal Analytics (`/enhanced-signal-analytics`) — MIXED
- `EnhancedSignalAnalyticsDashboard` queries real `master_signals`, `module_health`, `signal_rejection_logs`
- **FAKE**: Module stats calculation uses `Math.random()` (lines 316-324) for `avgProb`, `avgConf`, `contribution`, and `lastSignal` — these should come from real DB data
- 5 tabs all render same dashboard (redundant)

### 7. Technical Analysis (`/technical-analysis`) — REAL
- **Real**: Live price subscription from `unifiedMarketData` service
- **Real**: 75 technical indicators computed client-side from real TwelveData candle data
- **Real**: Key levels engine computes support/resistance from real candles
- **Partially empty**: Queries `modular_signals` for `technical_analysis` → may be empty
- **Broken query**: Queries `pattern_signals` table → table doesn't exist, silently fails
- **Working buttons**: Timeframe selector, refresh, category filter, search — all functional

### 8. Fundamental Analysis (`/fundamental-analysis`) — REAL (after recent fix)
- **Real**: `marketIntelligenceEngine` now queries real `aggregated_candles` for VIX proxy, real `news_events` for sentiment, real `economic_calendar` for surprises, real `correlations` table
- **Real**: Central bank signals derived from real news headlines
- **Working buttons**: Symbol selector, auto-refresh toggle, refresh button
- **Gap**: USD Index, commodity prices, equity prices show `null` (no free source for these)
- **Signals tab**: Shows static text "Signal analytics will be available" — not connected

### 9. Sentiment Analysis (`/sentiment-analysis`) — LIKELY EMPTY
- Queries `modular_signals` where `module_id = 'sentiment_analysis'` → likely 0 rows → shows "No Sentiment Signals"
- **Broken column references**: Queries `retail_positions` ordering by `as_of` column (doesn't exist, column is `timestamp`) and displays `pos.broker` (column is `source`)
- **Real queries**: COT, news, retail data queries are correctly structured (just empty tables)
- **COT card rendering**: References `cot.commercial_long`, `cot.large_traders_long`, `cot.retail_long` — columns don't exist (actual columns: `long_positions`, `short_positions`, `net_position`)

### 10. Quantitative Analysis (`/quantitative-analysis`) — EMPTY
- Queries `modular_signals` where `module_id = 'quantitative_analysis'` → 0 rows
- Shows "No quantitative signals generated yet" — honest empty state
- No mock data, no broken queries — just no data source populating it

### 11. Intermarket Analysis (`/intermarket-analysis`) — BROKEN + FAKE
- Queries `modular_signals` where `module_id = 'intermarket_analysis'` → 0 rows → shows empty
- **Queries non-existent tables**: `market_snapshot`, `volatility_metrics` → silently fail
- **HARDCODED fake data** in enrichment (lines 85-137):
  - Forex correlations: GBPUSD: 0.72, USDJPY: -0.68, AUDUSD: 0.81 (static, never changes)
  - Copper price: $4.25 (hardcoded)
  - Bond yields: US 10Y: 4.32%, GER 10Y: 2.18% (hardcoded)
  - Yield spread: 214 bps (hardcoded)

### 12. Specialized Analysis (`/specialized-analysis`) — EMPTY + BROKEN
- Queries `modular_signals` where `module_id = 'specialized_analysis'` → 0 rows
- **Queries non-existent tables**: `harmonic_prz`, `elliott_waves` → silently fail
- Order flow from `tick_data` → 0 rows → all zeros
- Shows "No Specialized Signals" empty state

### 13. System Monitor (`/system-monitor`) — MIXED
- **Real**: `SystemHealthMonitor` queries real `module_health` table with realtime subscription
- **FAKE in RealtimeSystemMonitor**:
  - Database metrics: `connectionCount`, `queryTime`, `errorRate` all use `Math.random()` (lines 116-119)
  - Performance chart: `signalGeneration`, `tradeExecution`, `dataLatency` all `Math.random()` (lines 128-131)
- **Real**: Signal generation and trade execution stats come from real `system_health` queries

### 14. Autonomous Learning (`/autonomous-learning`) — REAL
- **Real**: Queries `learning_actions`, `system_learning_stats`, `discovered_patterns` — all real tables
- **Real**: Has realtime subscription for new learning actions
- **Real**: Trigger buttons invoke real edge functions (`autonomous-learning-orchestrator`, `discover-winning-patterns`, etc.)
- Data may be sparse but is genuinely from the database

---

## SUMMARY: ITEMS THAT NEED FIXING

### Critical (Fake data shown as real):
1. **IntelligenceBacktestingPanel** — entirely `Math.random()` equity curves and returns
2. **MultiTimeframeAnalysis** — `Math.random()` signals masquerading as analysis
3. **EnhancedSignalAnalyticsDashboard** — module stats (`avgProb`, `avgConf`, `contribution`) are `Math.random()`
4. **RealtimeSystemMonitor** — database metrics and performance chart are `Math.random()`
5. **IntermarketAnalysis page** — hardcoded correlations, bond yields, copper price

### Broken (queries to non-existent tables/columns):
6. **TechnicalAnalysis** — queries `pattern_signals` table (doesn't exist)
7. **IntermarketAnalysis** — queries `market_snapshot`, `volatility_metrics` (don't exist)
8. **SpecializedAnalysis** — queries `harmonic_prz`, `elliott_waves` (don't exist)
9. **SentimentAnalysis** — wrong column names: `as_of` should be `timestamp`, `broker` should be `source`, COT columns wrong

### Empty (no data pipeline populates them):
10. **modular_signals** — 0 rows for all module_ids (technical, sentiment, quantitative, intermarket, specialized)
11. **FundamentalSignalsPanel** — queries non-existent `is_active` column on `modular_signals`
12. **Fundamental "Signals" tab** — just shows static text

### Not persisted:
13. **AutomatedTradingPanel** — rules stored in-memory only, lost on refresh

---

## PROPOSED FIX PLAN

### Phase 1: Fix broken queries (prevent errors)
- Remove queries to non-existent tables (`pattern_signals`, `market_snapshot`, `volatility_metrics`, `harmonic_prz`, `elliott_waves`)
- Fix SentimentAnalysis column references (`as_of` → `timestamp`, `broker` → `source`, COT column names)
- Remove `is_active` filter from FundamentalSignalsPanel

### Phase 2: Replace Math.random() with real data
- **IntelligenceBacktestingPanel**: Query `intelligence_backtests` table for real backtest results, show "No backtests run yet" if empty
- **MultiTimeframeAnalysis**: Already calls `multiTimeframeIntelligenceEngine.analyzeMultiTimeframe()` which uses real candle data — remove the `Math.random()` fallback, use the real result
- **EnhancedSignalAnalyticsDashboard**: Calculate module stats from real `module_performance` and `module_health` tables instead of `Math.random()`
- **RealtimeSystemMonitor**: Get real DB metrics from `system_health` table instead of random values

### Phase 3: Populate modular_signals
- Edit `generate-confluence-signals/index.ts` to INSERT individual module signals into `modular_signals` as they're computed — this populates Technical, Sentiment, Quantitative, Intermarket, and Specialized pages

### Phase 4: Fix Intermarket hardcoded values
- Replace hardcoded correlations with real data from `correlations` table
- Replace hardcoded bond/copper values with "Data unavailable (requires paid API)" honestly
- Use real VIX proxy from ATR calculation

### Phase 5: Connect Fundamental Signals tab
- Wire the Fundamental Analysis "Signals" tab to show real signals from `modular_signals`

