

# Fix: Opposite & Duplicate Trade Execution

## Root Cause Analysis

I found **three distinct bugs** causing opposite trades to coexist:

### Bug 1: Signal Generation Has No Directional Conflict Check
The `generate-confluence-signals` function (line 478-490) only checks for duplicate signals **of the same direction** within 30 minutes. It does NOT check if an opposite-direction signal already exists. So the system generates BUY at 22:10, then SELL at 22:20 — both get stored as `pending`.

**Evidence**: Master signals in the last 4 hours flip-flop: sell → buy → sell → buy → sell — sometimes only 10 minutes apart.

### Bug 2: Batch Execution Creates Duplicate Trades
The `execute-shadow-trades` function locks up to 5 signals at once via `atomic_lock_signals`. When multiple same-direction signals exist, each one creates a separate trade — resulting in 4 identical SELL trades at the same price (1.154735) opened within 3 seconds of each other (22:02:05 to 22:02:09).

### Bug 3: Opposite-Trade Closing Logic Doesn't Prevent New Opposite Opens
While the execution function (line 817-861) does close opposite trades before opening new ones, if the batch contains both BUY and SELL signals, they all get processed sequentially — the first signal closes opposites and opens, then the next opposite signal closes what was just opened. Net result: chaos.

## Proposed Fixes

### Fix 1: `generate-confluence-signals/index.ts` — Add Directional Conflict Guard
At the duplicate check (line 476-490), also check for **any** recent signal (not just same direction) within the last 30 minutes. If an opposite signal was recently created with a higher confluence score, reject the new signal.

### Fix 2: `execute-shadow-trades/index.ts` — Prevent Same-Direction Duplicates
Before executing each signal in the batch loop (around line 690), check if a trade with the **same direction and symbol** is already open. If so, skip the duplicate signal and mark it as `executed` (already covered).

### Fix 3: `execute-shadow-trades/index.ts` — Filter Conflicting Signals in Same Batch
After locking signals (line 615-636), if the batch contains both BUY and SELL signals for the same symbol, keep only the one with the highest confluence score and reject the rest.

### Fix 4: `generate-confluence-signals/index.ts` — Check Open Trades Before Generating
Before storing a new signal, query `shadow_trades` for current open positions. If open trades exist in the same direction, skip. If open trades exist in the opposite direction, only allow the new signal if the confluence score is significantly higher.

## Changes Summary

| File | What |
|---|---|
| `supabase/functions/generate-confluence-signals/index.ts` | Add opposite-direction conflict check + open trades awareness |
| `supabase/functions/execute-shadow-trades/index.ts` | Filter conflicting batch signals + prevent same-direction duplicate trades |

## Expected Result
- No more opposite BUY/SELL trades open simultaneously unless intentionally hedging
- No more duplicate trades at the same price opened seconds apart
- Cleaner signal history with directional consistency

