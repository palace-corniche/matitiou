

# Re-Verification Results: 3 Active Bugs Blocking the Learning System

## Evidence from Live Data

### Bug 1: Edge function NOT running latest code
The latest master signal (`d3ebe414`, created 16:17 UTC) has:
```
contributing_modules: ["buy", "hold", "buy", "buy", "sell"]
```
These are signal **directions**, not module IDs. The fix code (lines 548-566) maps sources to IDs like `technical_analysis`, `sentiment_analysis` — but the deployed function is still running the OLD code (`factors.map(f => f.name)`).

**Impact:** `process-trade-outcome` calls `update_module_performance_from_trade(p_module_id='buy')` which matches NO rows in `module_performance`. Result: zero learning feedback.

**Evidence:** `module_performance` table shows `successful_signals=0, failed_signals=0` for all modules despite 10+ closed trades.

### Bug 2: `modular_signals` check constraint rejects `'hold'`
Edge function logs at 16:17 and 16:20 both show:
```
⚠️ Failed to store modular signals: new row for relation "modular_signals" violates check constraint "modular_signals_signal_type_check"
```
The DB constraint is: `signal_type IN ('buy', 'sell')` — it does NOT allow `'hold'`. The sanitization code at line 679 maps unknown values to `'hold'`, which the constraint rejects. This causes the ENTIRE batch insert to fail — zero modular signals are stored with `analysis_id` linking.

**Impact:** `process-trade-outcome` step 4 queries `modular_signals WHERE analysis_id = signal.id` and always gets 0 rows. The `signal_breakdown` in `learned_features` is always `{}` (confirmed in live data).

### Bug 3: `learning_outcomes.contributing_modules` is always empty
Live data shows all 5 learning outcomes have `contributing_modules: []` because the master signals they reference have wrong values (`['buy','hold']` instead of module IDs).

**Impact:** No way to trace which modules contributed to winning vs losing trades.

## Fix Plan

### Step 1: Redeploy `generate-confluence-signals` with correct fixes
The code changes from the last session ARE in the file but the function needs redeployment. Additionally fix:
- **Line 679:** Change `'hold'` fallback to filter out non-buy/sell signals entirely (skip them instead of inserting with invalid type)
- Verify the contributing_modules IIFE works by adding a console.log

### Step 2: Redeploy `process-trade-outcome`
Also needs redeployment to ensure latest learning logic is active.

### Step 3: Backfill existing trades
After both functions are redeployed, re-run `process-trade-outcome` for the 5 most recent closed trades so `module_performance` starts accumulating real data.

## Files to Edit

| File | Change |
|------|--------|
| `supabase/functions/generate-confluence-signals/index.ts` | Line 679: filter out `'hold'` signals instead of inserting them, to avoid check constraint failure |
| Deploy | Redeploy `generate-confluence-signals` and `process-trade-outcome` |
| Backfill | Invoke `process-trade-outcome` for recent closed trades |

