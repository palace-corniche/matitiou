

# Comprehensive System Audit Results

## What's Working

| Component | Status | Evidence |
|-----------|--------|----------|
| Market data pipeline | OK | `fetch-market-data` → `aggregate-candles` → `sync-market-data-enhanced` all running on cron |
| Signal generation | OK | Latest signal `b4a43ef2` generated with correct module IDs |
| Trade execution | OK | 15 trades executed, 73% win rate, balance $100,018 |
| SL/TP exit checks | OK | Running every 2 min, 1 SL hit + 2 TP hits confirmed |
| Learning pipeline trigger | OK | `check-trade-exits` invokes `process-trade-outcome` on close |
| Contributing modules fix | DEPLOYED | Latest signal shows `[sentiment_analysis, specialized_analysis]` |
| Modular signals linkage | DEPLOYED | 3 signals linked to `analysis_id = b4a43ef2` |
| Cron jobs | OK | 10+ jobs scheduled, all pipeline stages covered |

## Active Bugs That Will Cause Trade Losses

### Bug 1: `update_module_performance_from_trade` never increments `total_signals`

The DB function updates `successful_signals` and `failed_signals`, and calculates `win_rate` using `(successful + failed + 1)`. But it **never increments `total_signals`**. The `total_signals` column (currently 5, 9, 1 for some modules) comes from signal generation counting, NOT from trade outcomes. The Bayesian engine queries `total_signals` to weight modules — if it's desynced from actual wins/losses, weights will be wrong.

**Fix:** Add `total_signals = total_signals + 1` to the UPDATE in the DB function.

### Bug 2: Old signals still have direction strings in `contributing_modules`

All signals before `16:37` (the latest one) still have `contributing_modules: ["buy", "sell", "hold"]`. When trades close from these old signals, `process-trade-outcome` will try `update_module_performance_from_trade(p_module_id='buy')` — matching nothing. This means the next ~10 trades (from signals already generated) will produce **zero learning data**.

**Impact:** Learning loop stays dead until all old signals cycle out (could take 12-24 hours).

**Fix:** Run a one-time SQL UPDATE to fix `contributing_modules` on existing signals using the same module mapping logic.

### Bug 3: Margin leak — $150 used_margin with 0 open trades

`used_margin = 150` and `free_margin = 99850` but there are **zero open trades**. The `close_shadow_trade` function doesn't release margin on close. Every trade that opens consumes margin, and it's never freed. After ~650 more trades, the system will reject new trades with "Insufficient margin."

**Fix:** Add margin release to `close_shadow_trade` DB function, and run a one-time reset of `used_margin = 0, free_margin = balance`.

### Bug 4: `intelligent-exit-engine` always fails on cron

Logs show: `"Missing required parameters"` — the cron calls it with `{"trigger": "cron"}` but the function expects `{tradeId, currentPrice}`. The cron invocation doesn't pass trade data, so it fails every time. The exit engine only works when called from `check-trade-exits` or the UI.

**Impact:** The intelligent exit engine is effectively **disabled** via cron. Trades rely solely on SL/TP/max-hold-time. This explains why 11/15 trades exit via `max_hold_time_reached` instead of intelligent exits.

**Fix:** Update `intelligent-exit-engine` to handle cron trigger by fetching all open trades and current price internally, then evaluating each.

### Bug 5: 73% exit via `max_hold_time_reached` — hold time too short?

11 of 15 trades exit at max hold time (3 hours). Many had positive pips (7-22 pips) but were still forced closed. The system is likely exiting profitable trades prematurely that could have hit TP.

**Impact:** Missed TP gains. Trades with 20+ pips could have been $4-5 winners instead of $2.

**No code change needed** — but worth monitoring after exit engine is fixed.

## Plan

### Step 1: Fix `update_module_performance_from_trade` DB function
Add `total_signals = total_signals + 1` to the UPDATE statement so total_signals stays in sync with wins+losses.

### Step 2: Fix margin leak in `close_shadow_trade` DB function
Add margin release logic: calculate `margin_to_release = position_size / leverage`, then decrement `used_margin` and increment `free_margin`. Also reset current account margin to 0 (no open trades).

### Step 3: Fix `intelligent-exit-engine` cron handling
Add logic at the top: if `trigger === 'cron'`, fetch all open trades and current price, then loop through each trade calling the exit evaluation logic.

### Step 4: Backfill `contributing_modules` on old signals
Run SQL UPDATE to map direction strings to module IDs for the ~20 old signals, so trades closing from them will still feed the learning loop.

### Step 5: Reset module_performance counters
Reset `total_signals`, `successful_signals`, `failed_signals` to 0 so they start clean with accurate data.

## Files to Edit

| File | Change |
|------|--------|
| DB function `update_module_performance_from_trade` | Add `total_signals = total_signals + 1` |
| DB function `close_shadow_trade` | Add margin release on close |
| `supabase/functions/intelligent-exit-engine/index.ts` | Handle cron trigger: fetch open trades internally |
| SQL (one-time) | Backfill contributing_modules on old signals, reset margin, reset module_performance |

