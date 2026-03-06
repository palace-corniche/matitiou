

# Complete Technical Architecture Document
## Automated EUR/USD Shadow Trading System

---

## 1. System Overview

This is an automated forex shadow trading system for EUR/USD that runs a complete pipeline: fetching market data, aggregating candles, generating confluence signals via multi-module analysis, executing trades atomically, and monitoring exits with intelligent scoring. All backend logic runs as Deno edge functions scheduled via `pg_cron`. The frontend is a React/TypeScript SPA that polls the database every 30 seconds.

---

## 2. Database Schema (28 Tables)

### Core Trading Tables

**`global_trading_account`** - Single-row singleton (ID: `00000000-0000-0000-0000-000000000001`)
- `balance` (numeric, default 100000) - Cash balance
- `equity` (numeric) - Balance + floating PnL
- `margin`, `free_margin`, `used_margin` (numeric) - Margin tracking
- `margin_level` (numeric) - Equity/UsedMargin * 100
- `floating_pnl`, `total_pnl` (numeric)
- `total_trades`, `winning_trades`, `losing_trades` (integer)
- `win_rate`, `profit_factor`, `sharpe_ratio` (numeric)
- `peak_balance`, `max_equity`, `max_drawdown`, `current_drawdown` (numeric)
- `consecutive_wins`, `consecutive_losses`, `largest_win`, `largest_loss` (numeric)
- `auto_trading_enabled` (boolean, default false) - Master kill switch
- `max_open_positions` (integer, default 5)
- `leverage` (integer, default 100)

**`shadow_trades`** - All trades (open and closed)
- `id` (uuid PK), `symbol` (text, default 'EUR/USD')
- `trade_type` (text: 'buy'|'sell'), `status` (text: 'open'|'closed')
- `entry_price`, `exit_price`, `current_price` (numeric)
- `entry_time`, `exit_time` (timestamptz)
- `lot_size` (numeric, default 0.01), `position_size` (numeric), `contract_size` (numeric, default 100000)
- `stop_loss`, `take_profit` (numeric)
- `pnl`, `profit_pips`, `unrealized_pnl`, `profit` (numeric)
- `commission`, `swap` (numeric)
- `exit_reason` (text: 'stop_loss_hit'|'take_profit_hit'|'max_hold_time_reached'|'intelligent_exit'|'manual'|'opposite_signal')
- `exit_check_count` (integer) - How many times check-trade-exits has evaluated this trade
- `signal_id`, `master_signal_id` (uuid) - Links to originating signal
- `portfolio_id` (uuid, default global account ID)
- `intelligence_exit_triggered` (boolean), `exit_intelligence_score` (numeric)
- `price_source` (text), `price_timestamp` (timestamptz)
- `order_type` (text, default 'market')
- `metadata` (jsonb)

**`master_signals`** - Generated trading signals awaiting execution
- `id` (uuid PK), `analysis_id` (uuid)
- `symbol` (text), `timeframe` (text, default '15m')
- `signal_type` (text: 'buy'|'sell'), `status` (text: 'pending'|'executing'|'executed'|'rejected')
- `final_confidence` (numeric, 0-1), `final_strength` (integer)
- `confluence_score` (numeric) - Weighted sum of all analysis modules
- `signal_quality_score` (numeric) - Calculated by `calculate_trade_quality_score` RPC
- `recommended_entry`, `recommended_stop_loss`, `recommended_take_profit` (numeric)
- `recommended_lot_size` (numeric, default 0.01)
- `risk_reward_ratio` (numeric)
- `market_regime` (text: 'trending'|'ranging'|'volatile'|etc.)
- `contributing_modules` (text[]), `modular_signal_ids` (uuid[])
- `fusion_algorithm` (text), `fusion_parameters` (jsonb)
- `market_data_snapshot` (jsonb)
- `rejection_reason` (text), `actual_outcome` (text)

### Market Data Tables

**`market_data_feed`** - Raw market data from TwelveData API
- `symbol` (text), `price` (numeric), `timestamp` (timestamptz)
- `source` (text, default 'twelve_data')
- `metadata` (jsonb) - Contains `{timeframe, open, high, low, close, volume, is_live}`

**`aggregated_candles`** - OHLC candles derived from market_data_feed
- `symbol` (text), `timeframe` (text: '15m'|'1h'|'4h'|'1d')
- `timestamp` (timestamptz)
- `open_price`, `high_price`, `low_price`, `close_price` (numeric)
- `volume` (numeric), `tick_count` (integer), `is_complete` (boolean)
- Unique constraint on `(symbol, timeframe, timestamp)`

**`tick_data`** - Real-time tick data (currently unused in pipeline)
- `symbol`, `bid`, `ask`, `price`, `spread`, `volume`, `tick_volume`
- `source`, `data_source`, `session_type`, `is_live`

### Signal Analysis Tables

**`modular_signals`** - Individual module outputs (technical, fundamental, sentiment, etc.)
- `module_id` (text), `module_version` (text)
- `symbol`, `timeframe`, `signal_type`
- `confidence` (numeric), `strength` (integer), `weight` (numeric)
- `trigger_price`, `suggested_entry`, `suggested_stop_loss`, `suggested_take_profit`
- `trend_context`, `volatility_regime`, `market_session`
- `calculation_parameters` (jsonb), `market_data_snapshot` (jsonb)

**`master_signals_fusion`** - Bayesian fusion analytics per signal
- `analysis_id`, `master_signal_id` (uuid)
- `confidence_score`, `weighted_score` (numeric)
- `contributing_signals` (jsonb), `weights` (jsonb)
- `risk_assessment`, `market_conditions`, `fusion_details` (jsonb)
- `fusion_decision`, `fusion_reasoning` (text)

**`signal_rejection_logs`** - Why signals were rejected
- `reason` (text), `value`, `threshold` (numeric)
- `signal_type`, `market_regime` (text)
- `factors_count` (integer), `probability`, `confluence_score`, `net_edge`, `entropy` (numeric)

**`signal_execution_attempts`** - Tracks each attempt to execute a signal
- `signal_id` (uuid), `attempt_number` (integer)
- `lock_acquired` (boolean), `execution_stage` (text)
- `failure_reason` (text), `market_price` (numeric)

### Exit Intelligence Tables

**`exit_intelligence`** - Holistic exit scoring per trade check
- `trade_id` (uuid), `overall_score` (numeric 0-100)
- `recommendation` (text: 'FORCE_EXIT'|'HOLD_CAUTION'|'HOLD_CONFIDENT')
- `reasoning` (text), `confidence` (numeric)
- `factors` (jsonb) - 10-factor breakdown
- `holding_time_minutes` (numeric), `check_timestamp` (timestamptz)

**`intelligent_targets`** - Calculated SL/TP targets per trade
- `trade_id` (uuid), `entry_price` (numeric)
- `suggested_sl`, `suggested_tp`, `actual_sl`, `actual_tp` (numeric)
- `recommended_tp1`, `recommended_tp2`, `recommended_tp3` (numeric)
- `confidence` (numeric), `reasoning` (text)
- `key_levels` (jsonb), `market_context` (jsonb), `factors` (jsonb)

### System & Monitoring Tables

**`system_health`** - Edge function execution logs
- `function_name` (text), `status` (text), `execution_time_ms` (integer)
- `error_message` (text), `processed_items` (integer), `metadata` (jsonb)

**`trade_execution_log`** - Detailed trade execution audit trail
- `trade_id`, `signal_id` (uuid), `action` (text)
- `details` (jsonb), `execution_timestamp` (timestamptz)
- `price_deviation_percent`, `data_freshness_ms` (numeric)
- `validation_results` (jsonb), `execution_path` (text)

**`function_execution_locks`** - Concurrency control
- `function_name` (text, unique), `lock_id` (text), `locked_at` (timestamptz)

**`account_defaults`** - Risk parameters
- `portfolio_id` (uuid), `risk_per_trade` (numeric, default 2)
- `max_position_size` (numeric, default 0.1), `min_signal_quality` (numeric, default 10)

**`adaptive_thresholds`** - Dynamic signal acceptance thresholds
- `threshold_name` (text), `probability_buy`/`probability_sell` (numeric)
- `entropy_current`/`min`/`max`, `confluence_min`/`adaptive`, `edge_min`/`adaptive` (numeric)

### Other Tables
- **`correlations`** - Inter-market correlation coefficients
- **`economic_calendar`** - Upcoming economic events
- **`news_events`** - News headlines with sentiment scores
- **`cot_reports`** - Commitment of Traders data
- **`retail_positions`** - Retail long/short ratios
- **`discovered_patterns`** / **`winning_patterns`** - Pattern discovery results
- **`module_health`** / **`module_performance`** - Per-module tracking
- **`ml_exit_models`** - ML model storage for exit optimization
- **`intelligence_backtests`** - Backtest results
- **`learning_actions`** / **`system_learning_stats`** - Continuous learning
- **`trade_performance_summary`** - Aggregated performance metrics
- **`trading_signals`** - Legacy signal table (unused by current pipeline)
- **`market_data_enhanced`** - Enhanced market data with indicators

### RLS Policies
All tables use permissive `USING (true) WITH CHECK (true)` policies - fully open access. No authentication is implemented.

---

## 3. Database Functions (RPCs)

### `atomic_lock_signals(p_limit, p_min_confluence_score, p_max_age_minutes)`
Atomically claims pending signals using `FOR UPDATE SKIP LOCKED`. Updates status to 'executing' and returns the locked rows. Prevents duplicate execution across concurrent function invocations.

### `execute_global_shadow_trade(p_symbol, p_trade_type, p_entry_price, p_lot_size, p_stop_loss, p_take_profit, p_comment, p_signal_id, p_master_signal_id)`
Inserts a new trade into `shadow_trades`, calculates margin (position_size / leverage), deducts from `free_margin`, updates `used_margin` and `margin_level` on `global_trading_account`, marks the `master_signals` row as 'executed', and logs to `trade_execution_log`. Returns the new trade UUID.

### `close_shadow_trade(p_trade_id, p_close_price, p_close_lot_size, p_close_reason)`
Calculates pips: BUY = (close - entry) / 0.0001, SELL = (entry - close) / 0.0001. PnL = pips * lot_size * 10. Updates `shadow_trades` status to 'closed', adjusts `global_trading_account` balance/equity/win_rate/counters. Logs to `trade_execution_log`. No commission is applied in this RPC (inconsistency with the shared PnL calculator).

### `calculate_trade_quality_score(p_signal_id, p_confluence_score, p_market_regime, p_volatility_percentile)`
Scores signals 0-100: base from confluence (max 50), regime bonus (trending=25, ranging=10), volatility bonus (30-70th percentile=25). Updates `master_signals.signal_quality_score`.

### `calculate_optimal_lot_size(p_account_balance, p_risk_percentage, p_stop_loss_pips)`
Returns `risk_amount / (sl_pips * 10)`, clamped to [0.01, 1.0].

### `get_global_trading_account()`
Returns the first row from `global_trading_account`.

### `get_ml_performance_analytics()` / `analyze_trade_performance()` / `run_trading_diagnostics()`
Analytics RPCs returning aggregated trade statistics as JSONB.

---

## 4. Edge Functions (Pipeline Order)

### 4.1 `fetch-market-data` (311 lines)
**Purpose**: Fetches OHLC candles from TwelveData API and stores in `market_data_feed`.
**Flow**:
1. Calls TwelveData API for 4 timeframes: 15min, 1h, 4h, 1day (10 candles each)
2. Maps API timeframes to DB format (15min→15m, 1h→H1, 4h→H4, 1day→D1)
3. Clamps future timestamps to `now()` to prevent negative-age errors
4. Deletes ALL existing `market_data_feed` rows (full refresh)
5. Inserts ~40 new data points with OHLC stored in `metadata` JSON
6. Falls back to mock data generation if API fails (base price ~1.0890 with random walk)
7. Logs execution to `system_health`

**API Key**: Hardcoded as `'demo'` (line 45). The `ALPHA_VANTAGE_API_KEY` secret exists but is unused.

### 4.2 `aggregate-candles` (311 lines)
**Purpose**: Converts `market_data_feed` JSON metadata into proper `aggregated_candles` OHLC rows.
**Flow**:
1. Reads `market_data_feed` for last 48 hours, ordered by timestamp
2. Extracts OHLC from `metadata` field: `{open, high, low, close, volume, timeframe}`
3. Normalizes timeframes: H1→1h, H4→4h, D1→1d
4. Determines completeness: candle is complete if its timestamp < current candle window start
5. Deduplicates by timestamp within each timeframe
6. Upserts into `aggregated_candles` using unique constraint `(symbol, timeframe, timestamp)`
7. Also contains a `CandleAggregator` class for tick-to-candle conversion (unused in current flow since `tick_data` is empty)

### 4.3 `generate-confluence-signals` (1936 lines + 2242-line module file)
**Purpose**: Multi-module signal analysis producing master trading signals.
**Flow**:
1. Loads `AdaptiveSignalEngine` with thresholds from `adaptive_thresholds` table
2. Queries `aggregated_candles` trying timeframes in order: 15m → 1h → 4h → 1d, needs 3+ complete candles
3. Detects market regime via `RegimeDetectionEngine` (momentum, volatility, trend strength → trending/ranging/shock/consolidation)
4. Runs 7 analysis modules (each queries database tables):
   - **Technical**: Reads `modular_signals` for technical_analysis module, calculates RSI/MACD/Bollinger/ATR from candles
   - **Fundamental**: Reads `economic_calendar`, `cot_reports` for macro bias
   - **Sentiment**: Reads `news_events`, `retail_positions` for crowd sentiment
   - **Multi-timeframe**: Cross-timeframe alignment analysis
   - **Pattern**: Candlestick pattern recognition (doji, engulfing, hammer, etc.)
   - **Strategy**: Mean reversion, breakout, momentum strategies
   - **Intermarket**: Reads `correlations` table for cross-pair signals
5. Fuses signals using Bayesian hierarchical method: weights (technical=0.4, fundamental=0.2, sentiment=0.2, pattern=0.2)
6. Runs `AdaptiveSignalEngine.evaluateSignal()` which checks entropy, probability, edge, confluence against adaptive thresholds
7. If signal passes: fetches fresh price from `market_data_feed`, adjusts SL/TP relative to fresh price, inserts into `master_signals` with status='pending'
8. Calls `calculate_trade_quality_score` RPC
9. Stores fusion analytics in `master_signals_fusion`
10. If confidence >= 20%: auto-invokes `execute-shadow-trades`
11. Duplicate prevention: skips if same signal_type exists in last 30 minutes with score within 10 points

### 4.4 `execute-shadow-trades` (1451 lines)
**Purpose**: Atomically claims pending signals and executes trades.
**Flow**:
1. Acquires concurrency lock via `function_execution_locks` (upsert with 5-min stale cleanup)
2. Fetches `global_trading_account`, checks `auto_trading_enabled`
3. Checks `isMarketOpen()`: rejects weekends (Sat all day, Sun before 22:00 UTC, Fri after 22:00 UTC)
4. Calls `atomic_lock_signals` RPC (limit=5, min_confluence=5, max_age=240min)
5. For each locked signal:
   a. **SL/TP validation**: BUY requires SL < entry < TP, SELL requires TP < entry < SL. Range: SL 15-50 pips, TP 20-100 pips
   b. **Quality check**: Rejects if `signal_quality_score < 5`
   c. **Opposite trade closure**: Closes all open trades in opposite direction via `close_shadow_trade` RPC
   d. **Price validation**: Fetches fresh price from `market_data_feed`, rejects if > 1 hour old or EUR/USD outside [0.9, 2.0]
   e. **Duplicate detection**: Skips if same signal already has an open trade (within 2 pips tolerance)
   f. **Intelligent targets**: Calls `calculate-intelligent-targets` edge function for dynamic SL/TP. Enforces minimum 20-pip SL and 2:1 R:R
   g. **Execution**: Calls `execute_global_shadow_trade` RPC with fixed 0.01 lot size
   h. **Logging**: Records to `signal_execution_attempts`, `trade_execution_log`
6. Updates executed signals to status='executed' in `master_signals`
7. Releases lock, logs to `system_health`

### 4.5 `check-trade-exits` (136 lines)
**Purpose**: Monitors SL/TP hits and time-based exits.
**Flow**:
1. Gets current EUR/USD price from `market_data_feed` (latest row)
2. Queries all open `shadow_trades` with SL or TP set
3. For each trade:
   a. Increments `exit_check_count`
   b. **Time exit**: Forces close after 3 hours holding time
   c. **SL check**: BUY: close if price <= SL; SELL: close if price >= SL
   d. **TP check**: BUY: close if price >= TP; SELL: close if price <= TP
   e. Calls `close_shadow_trade` RPC with appropriate reason

### 4.6 `intelligent-exit-engine` (385 lines)
**Purpose**: 10-factor holistic exit scoring for a single trade.
**Input**: `{tradeId, currentPrice}`
**Flow**:
1. Fetches trade, master signal, modular signals, market data, correlations, economic events
2. Calculates 10 weighted factors (total = 100%):
   - Confluence (15%): From master signal score or buy/sell signal ratio
   - Trend alignment (15%): Price vs 20-period SMA
   - Sentiment (10%): From sentiment modular signals
   - Volatility regime (10%): Current vs average candle range
   - Volume profile (8%): Current vs average volume
   - Correlation health (8%): From correlations table
   - Fundamental bias (12%): Penalizes if high-impact events upcoming
   - Harmonic completion (7%): From harmonic modular signals
   - Market structure (10%): From structure modular signals
   - Regime strength (5%): Maps regime type to score
3. Weighted sum → overall score (0-100)
4. Decision: FORCE_EXIT if score < 40 or holding > 150 min; HOLD_CAUTION if < 65; else HOLD_CONFIDENT
5. Returns result (does NOT close trades itself)

### 4.7 `monitor-exit-intelligence` (180 lines)
**Purpose**: Orchestrator that runs intelligent-exit-engine for all eligible open trades.
**Flow**:
1. Queries open trades older than 5 minutes
2. For each trade: invokes `intelligent-exit-engine` edge function
3. Stores result in `exit_intelligence` table
4. If recommendation is FORCE_EXIT: calls `close_shadow_trade` RPC
5. Updates `shadow_trades` with exit intelligence metadata

### 4.8 `manage-shadow-trades` (861 lines)
**Purpose**: Trade management utilities including ML model integration.
**Flow**:
1. Fetches global account and open trades (filtered by `portfolio_id IS NULL` - bug: trades use the global account UUID, not null)
2. Gets current price from `market_data_feed`
3. Loads active ML exit model from `ml_exit_models`
4. For each open trade: updates P&L, checks trailing stops, applies ML exit recommendations

---

## 5. Cron Jobs (pg_cron + pg_net)

Configured via SQL inserts (not in config.toml). Each job calls `net.http_post()` to the edge function URL with the anon key:

| Function | Schedule | Interval |
|---|---|---|
| `fetch-market-data` | `*/5 * * * *` | Every 5 minutes |
| `aggregate-candles` | `1-59/5 * * * *` | Every 5 minutes (offset 1 min) |
| `generate-confluence-signals` | `*/10 * * * *` | Every 10 minutes |
| `execute-shadow-trades` | `2-59/5 * * * *` | Every 5 minutes (offset 2 min) |
| `check-trade-exits` | `*/2 * * * *` | Every 2 minutes |
| `monitor-exit-intelligence` | `3-59/5 * * * *` | Every 5 minutes (offset 3 min) |

---

## 6. Frontend Architecture

### Hooks

**`useGlobalShadowTrading`** - Primary trading state manager
- Polls every 30 seconds via `setInterval` calling `refreshData()`
- `refreshData()`: Parallel fetches `getGlobalAccount()`, `getOpenTrades()`, `getTradeHistory(200)`, `getPerformanceMetrics()` from `globalShadowTradingEngine`
- Subscribes to `UnifiedMarketDataService` for live price ticks
- Exposes: `executeTrade`, `closeTrade`, `resetAccount`, `toggleAutoTrading`, `updateMaxOpenTrades`

**`useAutomationBackup`** - Client-side pipeline fallback
- Runs every 5 minutes via `setInterval`
- Checks last signal time from `master_signals` table
- If no signal in 15+ minutes: triggers full pipeline (fetch → aggregate → signals → execute → exits)
- Otherwise: periodic execute + exit checks only
- Exposes `manualTrigger()` for on-demand full pipeline run

### Services

**`globalShadowTradingEngine`** - Database abstraction layer
- `getGlobalAccount()`: Calls `get_global_trading_account` RPC
- `getOpenTrades()`: Queries `shadow_trades` WHERE status='open'
- `getTradeHistory(limit)`: Queries `shadow_trades` WHERE status='closed' ORDER BY exit_time DESC
- `executeTrade(request)`: Calls `execute_global_shadow_trade` RPC
- `closeTrade(tradeId)`: Gets fresh price from `market_data_feed`, calls `close_shadow_trade` RPC
- `resetAccount()`: Deletes all `shadow_trades`, resets `global_trading_account` to defaults

**`unifiedMarketData`** - Single price source
- Polls `market_data_feed` every 10 seconds
- Caches price for 10 seconds to reduce DB queries
- Falls back to mock data if no fresh data (<10 minutes old)
- Broadcasts ticks to all subscribers via callback pattern

### Key Pages
- **`/shadow-trading`**: Main dashboard (`ShadowTradingDashboardUnified`) - Account overview, positions, trade history, signals tab
- Uses `useGlobalShadowTrading` hook for all state

---

## 7. Complete Data Flow

```text
TwelveData API ('demo' key)
       |
       v
[fetch-market-data] ---> market_data_feed (40 rows, metadata has OHLC)
       |
       v (every 5 min)
[aggregate-candles] ---> aggregated_candles (upsert by symbol+timeframe+timestamp)
       |
       v (every 10 min)
[generate-confluence-signals]
  |-- Reads aggregated_candles (3+ complete candles needed)
  |-- Runs 7 analysis modules (technical, fundamental, sentiment, multi-tf, pattern, strategy, intermarket)
  |-- Bayesian fusion with adaptive thresholds
  |-- Writes to master_signals (status='pending')
  |-- Auto-invokes execute-shadow-trades if confidence >= 20%
       |
       v (every 5 min)
[execute-shadow-trades]
  |-- atomic_lock_signals RPC (FOR UPDATE SKIP LOCKED)
  |-- Validates SL/TP (15-50 pip SL, 20-100 pip TP)
  |-- Closes opposite trades
  |-- Calls calculate-intelligent-targets for dynamic levels
  |-- execute_global_shadow_trade RPC (0.01 lot)
  |-- Writes to shadow_trades, trade_execution_log
       |
       v (every 2 min)
[check-trade-exits]
  |-- Compares current price to SL/TP
  |-- 3-hour max hold time
  |-- close_shadow_trade RPC
       |
       v (every 5 min)
[monitor-exit-intelligence]
  |-- Calls intelligent-exit-engine per open trade
  |-- 10-factor weighted scoring
  |-- FORCE_EXIT if score < 40 or holding > 150 min
  |-- Writes to exit_intelligence
  |-- close_shadow_trade RPC if FORCE_EXIT
       |
       v
global_trading_account (balance, equity, win_rate updated)
       |
       v (every 30s)
[Frontend polling] ---> UI renders account, positions, history
```

---

## 8. Known Issues & Failure Points

1. **Demo API key**: TwelveData `'demo'` returns limited/delayed data, producing low confluence scores
2. **Commission inconsistency**: Shared PnL calculator charges $50/lot but `close_shadow_trade` RPC does not
3. **manage-shadow-trades bug**: Filters by `portfolio_id IS NULL` but trades use `'00000000-0000-0000-0000-000000000001'`
4. **Reset validation expects $100**: `validateResetCompletion` checks `account.balance !== 100` but the account is $100,000
5. **No authentication**: All RLS policies are fully open. No user accounts or login flow
6. **economic_events table**: `intelligent-exit-engine` queries `economic_events` but the table is named `economic_calendar`
7. **Stale price risk**: `monitor-exit-intelligence` uses `trade.current_price || trade.entry_price` which may be the entry price if never updated
8. **Single instrument**: Entire system is hardcoded for EUR/USD only

---

## 9. Trading Decision Logic Summary

**Signal Generation**: Confluence score = weighted sum of 7 modules. Thresholds: entropy < 0.80, buy probability > 56%, edge > 0.00005, confluence > adaptive minimum. Debug mode can bypass all checks.

**Trade Entry**: Fixed 0.01 lot. Entry = fresh market price + half spread. SL/TP from intelligent targets or signal defaults, enforced to 20+ pip SL with 2:1 R:R minimum.

**Trade Exit**: Three exit paths run in parallel:
- `check-trade-exits`: Hard SL/TP and 3-hour time limit
- `monitor-exit-intelligence`: Soft score-based exit (score < 40 or 2.5 hours)
- `execute-shadow-trades`: Closes opposite direction trades when new signal fires

**PnL Calculation**: `pips * lot_size * 10`. For 0.01 lot, 1 pip = $0.10.

