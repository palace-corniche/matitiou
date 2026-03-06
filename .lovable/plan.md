

# Full System Diagnostic Report

## System Architecture Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                        DATA PIPELINE FLOW                           │
│                                                                      │
│  fetch-market-data ──► aggregate-candles ──► generate-confluence     │
│  (TwelveData API)      (OHLC candles)        -signals               │
│                                               │                      │
│                                               ▼                      │
│  check-trade-exits ◄── shadow_trades ◄── execute-shadow-trades      │
│  intelligent-exit       (open/closed)     (atomic signal locking)    │
│  -engine                                                             │
│                                               │                      │
│                                               ▼                      │
│                                    global_trading_account            │
│                                    (balance, equity, P&L)            │
└──────────────────────────────────────────────────────────────────────┘
```

## Current State Summary

| Component | Status | Data |
|---|---|---|
| Account Balance | $99,999.93 | 1 trade executed, 1 closed |
| Open Trades | 0 | None currently open |
| Closed Trades | 1 | -$0.075 loss (manual close) |
| Pending Signals | 3 | Confluence scores of 10, 10, 10 |
| Executed Signals | 1 | Score 20, was the only one executed |
| Aggregated Candles | 12 total | 8x 4h, 2x 1d, 1x 15m, 1x 1h |
| Market Data Feed | 40 points | Fresh data from TwelveData |
| Tick Data | 0 | Empty (not used in current flow) |
| Auto-Trading | ENABLED | But no cron jobs trigger it |

---

## CRITICAL ISSUES FOUND (Root Causes)

### Issue #1: NO CRON JOBS -- Nothing Runs Automatically
**Severity: CRITICAL**

The `supabase/config.toml` contains ONLY `project_id`. There are ZERO cron schedules configured. This means:
- `fetch-market-data` is never called automatically
- `aggregate-candles` is never called automatically
- `generate-confluence-signals` is never called automatically
- `execute-shadow-trades` is never called automatically
- `check-trade-exits` is never called automatically

The client-side `useAutomationBackup` hook tries to compensate by checking `trading_signals` table (NOT `master_signals`) every 10 minutes, but it only triggers `fetch-market-data` and `generate-confluence-signals` -- it NEVER triggers `execute-shadow-trades` or `check-trade-exits`.

**Result**: Trades only execute when manually invoked. The system is effectively idle.

### Issue #2: TwelveData Using 'demo' API Key
**Severity: HIGH**

In `fetch-market-data/index.ts` line 45:
```typescript
const TWELVE_DATA_API_KEY = 'demo';
```
The demo key returns limited/delayed data (only 10 candles per timeframe, max 800 requests/day). The `ALPHA_VANTAGE_API_KEY` secret exists but is never used. The system is not using real API keys for market data.

### Issue #3: Insufficient Candle Data for Signal Quality
**Severity: HIGH**

Signal generation logs show:
- 15m: Only 1 complete candle (needs 5+) -- **REJECTED**
- 1h: 0 complete candles (needs 5+) -- **REJECTED**
- 4h: 7 complete candles -- Only timeframe generating signals
- 1d: 2 candles -- Too few for reliable analysis

With only 4h timeframe working, signals have very low confluence scores (10 out of possible 100+). The system generates BUY-only signals in a "ranging" market with low confidence.

### Issue #4: Signals Score Too Low (10) vs Execution Threshold
**Severity: HIGH**

The 3 pending signals all have `confluence_score = 10`. The `execute-shadow-trades` function's `atomic_lock_signals` uses `p_min_confluence_score: 5`, so these SHOULD be picked up. But execute-shadow-trades is NEVER CALLED (Issue #1).

Even when called, the pre-execution SL/TP validation requires:
- SL: 15-50 pips
- TP: 20-100 pips

The signals have SL=20 pips, TP=25 pips -- these pass validation. The real blocker is Issue #1.

### Issue #5: Missing `signal_execution_attempts` Table
**Severity: MEDIUM**

`execute-shadow-trades` tries to insert into `signal_execution_attempts` (lines 891-898, 910-917) but this table doesn't exist. This would cause the function to crash when it tries to log execution attempts.

### Issue #6: Missing `calculate_trade_quality_score` RPC
**Severity: LOW (non-blocking)**

Edge function logs show:
```
Could not find the function public.calculate_trade_quality_score
```
This means `signal_quality_score` is always NULL. The executor allows NULL quality scores through, so this doesn't block execution, but it means no quality filtering occurs.

### Issue #7: `useAutomationBackup` Checks Wrong Table
**Severity: MEDIUM**

The backup hook checks `trading_signals` table for the last signal time, but the pipeline writes to `master_signals`. Since `trading_signals` has no recent data, the backup ALWAYS triggers (every 10 minutes), repeatedly calling `fetch-market-data` and `generate-confluence-signals` but never `execute-shadow-trades`.

### Issue #8: Commission Model Too Aggressive
**Severity: MEDIUM**

The shared PnL calculator charges $50/lot commission (`COMMISSION_PER_LOT = 50`). For a 0.01 lot trade, that's $0.50 commission. On a 25-pip TP trade at 0.01 lots, gross profit = $2.50, net = $2.00. On a 20-pip SL trade, gross loss = -$2.00, net = -$2.50. This creates a negative edge even at 50% win rate.

However, the `close_shadow_trade` RPC does NOT include commission in its calculation, so the actual PnL stored is commission-free. This creates inconsistency between displayed and actual PnL.

---

## How Everything Connects (Data Flow)

1. **fetch-market-data**: Calls TwelveData API with 'demo' key, fetches 10 candles per timeframe (15m, 1h, 4h, 1d), stores raw OHLC in `market_data_feed.metadata` JSON field
2. **aggregate-candles**: Reads `market_data_feed`, extracts OHLC from metadata, normalizes timeframes (H1→1h), upserts into `aggregated_candles`
3. **generate-confluence-signals**: Reads `aggregated_candles`, runs technical/sentiment/pattern analysis, generates `master_signals` with confluence scores. Needs 5+ complete candles per timeframe
4. **execute-shadow-trades**: Atomically locks pending `master_signals` via `atomic_lock_signals` RPC, validates SL/TP, calls `execute_global_shadow_trade` RPC to insert into `shadow_trades`
5. **check-trade-exits**: Reads open `shadow_trades`, compares current price to SL/TP, calls `close_shadow_trade` RPC. Also has 3-hour max hold time
6. **intelligent-exit-engine**: Runs multi-factor exit analysis, stores scores in `exit_intelligence`
7. **Client UI**: `useGlobalShadowTrading` hook polls every 30 seconds, reads from `global_trading_account`, `shadow_trades`

---

## Fix Plan (Prioritized)

### Step 1: Database Migration
Create `signal_execution_attempts` table and `calculate_trade_quality_score` RPC to prevent edge function crashes.

### Step 2: Add Cron Schedules to config.toml
Configure scheduled function invocations:
- `fetch-market-data`: Every 5 minutes
- `aggregate-candles`: Every 5 minutes (offset by 1 min)
- `generate-confluence-signals`: Every 10 minutes
- `execute-shadow-trades`: Every 5 minutes
- `check-trade-exits`: Every 2 minutes
- `intelligent-exit-engine`: Every 5 minutes

### Step 3: Fix TwelveData API Key
Use the `ALPHA_VANTAGE_API_KEY` secret or add a proper TwelveData key. Increase `outputsize` from 50 to get more historical data for better signal quality.

### Step 4: Fix useAutomationBackup
Change from checking `trading_signals` to `master_signals` table. Add `execute-shadow-trades` to the backup trigger chain.

### Step 5: Improve Signal Quality
- Request more candles per timeframe (50 instead of 10)
- Ensure all timeframes have enough data for analysis
- Consider lowering the minimum candle requirement from 5 to 3 for faster startup

### Step 6: Verify Edge Function Deployments
Test each function end-to-end after fixes to ensure no runtime crashes from missing tables/RPCs.

