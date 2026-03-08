

# Learning System Re-Verification: 3 Critical Bugs Found

## Verification Results

### What works
- `check-trade-exits` correctly has the `process-trade-outcome` invocation (line 125)
- `process-trade-outcome` is deployed and runs successfully (tested live, returned `success: true`)
- `learning_outcomes` row was created for the test trade
- Bayesian fusion correctly queries `module_performance` and applies dynamic weight scaling (lines 1368-1413 in master-signal-modules.ts)
- Loss analysis logic is comprehensive (lines 89-134 in process-trade-outcome)

### Bug 1: `contributing_modules` stores signal directions, not module IDs
**Location:** `generate-confluence-signals/index.ts` line 548
```
contributing_modules: confluenceSignal.factors?.map((f: any) => f.name) || []
```
The `factors[].name` contains values like `"buy"`, `"sell"`, `"hold"` — these are signal directions, NOT module IDs like `"technical_analysis"`. This means `process-trade-outcome` step 10 iterates over `['buy', 'sell']` instead of `['technical_analysis', 'sentiment_analysis']`, so `update_module_performance_from_trade` is called with `p_module_id = 'buy'` which matches no rows.

**Fix:** Map factors to their source module IDs using the same `moduleMapping` used elsewhere, or store the source module names from the signal's `source` field.

### Bug 2: `modular_signals.analysis_id` is always NULL
**Location:** `generate-confluence-signals/index.ts` lines 909-926
The modular signal inserts don't set `analysis_id`. The master signal's `analysis_id` is a random UUID (line 530), but modular signals are never linked to it. So `process-trade-outcome` step 4 queries `modular_signals WHERE analysis_id = signal.id` and always gets 0 rows — no "WHY" breakdown is ever built.

**Fix:** Set `analysis_id` on the modular signal inserts to match the master signal's ID (or its `analysis_id`). This must happen after the master signal is created, so either: (a) insert modular signals after master signal insert using its returned ID, or (b) pre-generate the analysis_id and use it for both.

### Bug 3: `modular_signals` check constraint rejects some signal types
From edge function logs: `"new row for relation "modular_signals" violates check constraint "modular_signals_signal_type_check""`
Some signals have `signal_type` values that don't match the allowed enum. This silently drops signals from storage, reducing learning data.

**Fix:** Sanitize `signal_type` to only `'buy' | 'sell' | 'hold'` before insert.

## Plan

### Step 1: Fix `contributing_modules` in signal generation
In `index.ts`, change line 548 to store actual module source IDs from the signals' `source` field, deduplicated, instead of factor names.

### Step 2: Link modular_signals to master signal via analysis_id
Move the modular signal insert to AFTER the master signal insert. Set `analysis_id` to the master signal's returned `id` so `process-trade-outcome` can look up per-module signals.

### Step 3: Sanitize signal_type before modular insert
Clamp `signal_type` to valid values (`buy`, `sell`, `hold`) to prevent check constraint failures.

### Step 4: Backfill learning for existing closed trades
Invoke `process-trade-outcome` for all 5 existing closed trades so the learning data starts populating immediately.

## Files to Edit

| File | Changes |
|------|---------|
| `supabase/functions/generate-confluence-signals/index.ts` | Fix contributing_modules mapping, link modular_signals analysis_id, sanitize signal_type |
| SQL (backfill) | Run process-trade-outcome for existing 5 closed trades |

