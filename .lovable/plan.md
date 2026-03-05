

# Plan: Deploy Full Trading Pipeline

## Current State
- `fetch-market-data` works -- 40 data points in `market_data_feed` with OHLC in metadata
- No signals, no trades, no candles yet
- Many edge functions exist in code but are NOT deployed
- Several database schema mismatches blocking the pipeline

## Critical Issues Found

### 1. Database Schema Gaps
The edge functions reference tables, columns, and functions that don't exist in the new database:

| Missing Object | Needed By |
|---|---|
| `function_execution_locks` table | `execute-shadow-trades` (concurrency lock) |
| `account_defaults` table | `execute-shadow-trades` (quality threshold) |
| `atomic_lock_signals` RPC | `execute-shadow-trades` (atomic signal claiming) |
| `correlations` table | `intelligent-exit-engine` |
| `exit_check_count` column on `shadow_trades` | `check-trade-exits` |
| `signal_quality_score`, `market_regime` columns on `master_signals` | `execute-shadow-trades` |
| Unique constraint on `aggregated_candles(symbol,timeframe,timestamp)` | `aggregate-candles` upsert |

### 2. Column Name Mismatches
`aggregated_candles` table has columns `open, high, low, close` but both `aggregate-candles` and `generate-confluence-signals` functions use `open_price, high_price, low_price, close_price`. Will rename columns to match the code.

### 3. Signal Rejection Logging
`signal_rejection_logs` table has only `id, signal_id, reason, details, created_at` but `generate-confluence-signals` tries to insert `value, threshold, signal_type, factors_count` etc. Will add missing columns.

### 4. System Health Column
Code inserts `details` but the column is called `metadata`. Will fix in code.

## Implementation Steps

### Step 1: Database Migration
Single migration to add all missing schema:
- Rename `aggregated_candles` columns (`open` -> `open_price`, etc.)
- Add unique constraint on `aggregated_candles(symbol, timeframe, timestamp)`
- Create `function_execution_locks` table
- Create `account_defaults` table with seed data
- Create `correlations` table
- Create `atomic_lock_signals` RPC function
- Add `exit_check_count` column to `shadow_trades`
- Add `signal_quality_score`, `market_regime` columns to `master_signals`
- Add missing columns to `signal_rejection_logs`

### Step 2: Fix Edge Function Code
- `check-trade-exits`: Already references correct column after migration
- `generate-confluence-signals`: Fix `system_config` table reference (graceful fallback already exists)
- System health inserts: Change `details` -> `metadata` in `aggregate-candles`

### Step 3: Deploy Core Edge Functions
Deploy in order of the data pipeline:
1. `aggregate-candles` - converts market_data_feed to OHLC candles
2. `generate-confluence-signals` - generates master signals from candles
3. `execute-shadow-trades` - opens trades from signals
4. `check-trade-exits` - monitors SL/TP/time exits
5. `intelligent-exit-engine` - holistic exit scoring
6. `monitor-exit-intelligence` - periodic exit monitoring
7. `manage-shadow-trades` - trade management utilities

### Step 4: End-to-End Pipeline Test
1. Call `fetch-market-data` to ensure fresh data
2. Call `aggregate-candles` to build OHLC candles from market data
3. Verify candles exist in `aggregated_candles`
4. Call `generate-confluence-signals` to generate signals
5. Verify signals appear in `master_signals`
6. Call `execute-shadow-trades` to execute trades from signals
7. Verify trades appear in `shadow_trades`

## Technical Details

The `aggregate-candles` function reads `market_data_feed.metadata` (which contains `{open, high, low, close, timeframe, is_live}`) and writes OHLC candles to `aggregated_candles`. The `generate-confluence-signals` function reads from `aggregated_candles` and needs at least 5 complete candles to generate a signal. With 40 market data points across 4 timeframes (15m, 1h, 4h, 1d), we should get ~10 candles per timeframe.

The `execute-shadow-trades` function uses `atomic_lock_signals` to claim pending signals atomically (preventing duplicate executions), validates SL/TP levels, and inserts trades into `shadow_trades`.

