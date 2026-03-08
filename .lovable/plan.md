

# Learning System: Critical Gaps & Fix Plan

## Current State: Learning Is Completely Disconnected

After auditing the full pipeline, there are **4 critical breaks** in the learning loop:

### Break 1: `process-trade-outcome` is never called
`check-trade-exits` closes trades via `close_shadow_trade` RPC, sends a Telegram notification, then **stops**. It never invokes `process-trade-outcome`. Zero learning happens after any trade closure. The `learning_outcomes` table stays empty unless `discover-winning-patterns` manually backfills it.

### Break 2: Module win/loss data never feeds back into signal generation
The Bayesian fusion engine in `master-signal-modules.ts` uses **hardcoded weights** (technical: 25%, quantitative: 23%, etc.). It never queries `module_performance` to adjust weights based on which modules are actually winning or losing. The feedback loop is open-ended — data goes in but never comes back out.

### Break 3: No "WHY" analysis stored
When a trade loses, the system records the PnL and contributing module names, but never stores **which specific patterns, indicators, or strategies fired** for that signal. The `learned_features` object only captures price/time data. There's no way to answer "this trade lost because the RSI divergence signal was wrong while the harmonic pattern was correct."

### Break 4: Learning orchestrator has no cron schedule
`autonomous-learning-orchestrator` exists but is never called automatically. The threshold adjustment, module calibration, and pattern discovery it orchestrates only run if manually triggered.

---

## Fix Plan

### 1. Wire `process-trade-outcome` into `check-trade-exits`
After every successful `close_shadow_trade` call, invoke `process-trade-outcome` with the trade ID. This is the single most important fix — it activates the entire learning pipeline.

### 2. Store signal details (the "WHY") in `learning_outcomes`
Enhance `process-trade-outcome` to:
- Fetch the `master_signals_fusion` record for the signal (contains `contributing_signals` with per-module signal details)
- Fetch `modular_signals` linked to this master signal to get each module's individual direction, confidence, and strength
- Store a `signal_breakdown` in `learned_features` showing which modules agreed/disagreed with the final outcome
- Calculate per-module accuracy: did this module's signal direction match the actual trade outcome?

### 3. Make Bayesian fusion use `module_performance` data
Update `fuseSignalsWithBayesian()` in `master-signal-modules.ts` to:
- Query `module_performance` table at the start of each signal generation cycle
- Use each module's `win_rate` and `average_return` to dynamically scale the base weights
- Formula: `effectiveWeight = baseWeight × (0.5 + moduleWinRate/100)` — so a 60% win rate module gets 1.1x its base weight, a 30% win rate module gets 0.8x

### 4. Schedule the learning orchestrator via cron
Add a `pg_cron` job to run `autonomous-learning-orchestrator` every 6 hours. This triggers threshold adjustment, module calibration, and pattern discovery automatically.

### 5. Add a "loss analysis" function
Create logic inside `process-trade-outcome` that specifically analyzes losing trades:
- Was the entry direction wrong? (price moved against immediately)
- Was the SL too tight? (price reversed after hitting SL)
- Was it a time exit? (signal was correct but too slow)
- Which modules voted correctly vs incorrectly?
- Store this as `loss_analysis` in the learned_features JSON

---

## Files to Edit

| File | Changes |
|------|---------|
| `supabase/functions/check-trade-exits/index.ts` | Add `process-trade-outcome` invocation after each successful trade closure |
| `supabase/functions/process-trade-outcome/index.ts` | Add signal breakdown analysis, loss categorization, per-module accuracy tracking |
| `supabase/functions/generate-confluence-signals/master-signal-modules.ts` | Add `module_performance` query and dynamic weight scaling in Bayesian fusion |
| SQL (insert tool) | Add cron job for `autonomous-learning-orchestrator` every 6 hours |

