

# Learning, Confluence & Pattern System Audit Report

## 1. Learning System: NOT RUNNING

| Component | Status | Issue |
|-----------|--------|-------|
| `learning_actions` table | **EMPTY** | Orchestrator has never run |
| `discovered_patterns` table | **EMPTY** | Pattern discovery has never run |
| `winning_patterns` table | **EMPTY** | Pattern generator has never run |
| `system_learning_stats` table | **EMPTY** | Stats never updated |
| `adaptive_thresholds` table | **EMPTY** | No adaptive tuning has occurred |

**Root Cause:** The `autonomous-learning-orchestrator` and `discover-winning-patterns` functions exist but are never invoked by any cron job or trigger. They also depend on tables that don't exist:
- `learning_outcomes` — referenced by `discover-winning-patterns` but **does not exist** in the database
- `intelligence_performance` — referenced by Bayesian fusion but **does not exist**
- `system_config` — referenced by debug mode loader but **does not exist**

**Impact:** The entire self-improvement loop (retrain model → adjust thresholds → discover patterns → calibrate modules) is dead code. The system never learns from its trades.

---

## 2. Confluence Score Calculation: HAS BUGS

### How it works
Confluence score = `confidence * 100` (line 1161). So a confidence of 0.2 → confluence of 20, confidence of 0.5 → confluence of 50.

### Bug: `confluence_score` equals `final_confidence * 100`
Looking at the DB data:
- `final_confidence: 0.5` → `confluence_score: 50`
- `final_confidence: 0.2` → `confluence_score: 20`
- `final_confidence: 0.3` → `confluence_score: 30`

This is **not** a true confluence score. It's just confidence scaled by 100. A real confluence score should count how many independent modules agree (e.g., 5 modules saying BUY = high confluence). The `contributing_modules` field shows this info (e.g., `[buy, buy, buy, buy, buy]` → score 50, `[buy, buy]` → score 20, `[buy]` → score 10), suggesting the score is actually `10 * count_of_contributing_directions`.

**The score is just 10 × number_of_agreeing_signals**, not a weighted multi-factor confluence. This means:
- 1 signal saying "buy" → confluence 10
- 5 signals all saying "buy" → confluence 50
- Module quality, confidence, and strength are NOT factored in

### Bug: Confidence boost inflates technical signals
Line 92 in `master-signal-modules.ts`: `confidence: Math.min(1, signal.confidence * 1.2)` — a 20% artificial boost. A signal with confidence 0.85 becomes 1.02, capped to 1.0. This inflates technical signal weight in the Bayesian fusion.

### Bug: `confidence` exceeds 1.0 in modular_signals
The DB shows `confidence: 1.1` for technical signals stored in `modular_signals`. The `Math.min(1, ...)` cap is applied in `master-signal-modules.ts` but **not** when writing to the `modular_signals` table (line 917): `confidence: s.confidence || 0` just passes through the raw 1.2x-boosted value.

---

## 3. Module Performance Tracking: BARELY WORKING

| Module | signals_generated | avg_confidence | avg_strength |
|--------|------------------|----------------|--------------|
| sentiment_analysis | 1 | 0.41 | 4 |
| technical_analysis | 0 | 0 | 0 |
| fundamental_analysis | 0 | 0 | 0 |
| quantitative_analysis | 0 | 0 | 0 |
| intermarket_analysis | 0 | 0 | 0 |
| specialized_analysis | 0 | 0 | 0 |

**Issue:** Only `sentiment_analysis` has been counted (1 signal), despite `modular_signals` containing 15 rows across technical, sentiment, and specialized. The `updateModulePerformance()` function uses a running average formula that divides by 2 each time (`(existing + new) / 2`), which exponentially decays rather than computing a true cumulative average.

Also, `win_rate` is always 0 because there is no logic connecting trade outcomes back to which module's signals led to the trade.

---

## 4. Pattern Discovery: COMPLETELY BROKEN

The `discover-winning-patterns` function queries `learning_outcomes` table — **which does not exist**. It would always fail or return empty. The `generate-winning-patterns` function queries `shadow_trades` correctly but is never invoked.

Neither function is scheduled via cron.

---

## 5. Bayesian Fusion: PARTIALLY CORRECT

The fusion logic itself is sound:
- Weighted probability aggregation per signal source
- Regime-aware weight adjustment (quant boosted in ranging, intermarket boosted in trending)
- Entropy calculation for signal disagreement
- Kelly fraction for position sizing
- Consensus threshold before emitting a signal

**But** the `intelligence_performance` table it queries for dynamic weight adjustment **does not exist**, so weight adaptation always falls back to static defaults.

---

## 6. Adaptive Thresholds: NEVER INITIALIZED

The `adaptive_thresholds` table is empty. The `AdaptiveSignalEngine` loads from this table but falls back to hardcoded defaults:
- Entropy max: 0.80
- Buy probability min: 0.56
- Sell probability max: 0.44
- Confluence min: 8
- Edge min: -0.0002

Since the learning orchestrator never runs, these thresholds never adapt.

---

## Fixes Required

### Phase 1: Create missing tables
- `learning_outcomes` — stores trade results linked to signals for pattern discovery
- `intelligence_performance` — stores per-source prediction accuracy for dynamic weight adjustment
- `system_config` — stores debug flags and system configuration

### Phase 2: Fix confluence score calculation
- Change from `confidence * 100` to a real weighted multi-module confluence that accounts for module count, individual confidence, strength, and agreement direction
- Cap `confidence` to 1.0 before writing to `modular_signals`
- Remove the 1.2x artificial boost on technical signals

### Phase 3: Fix module performance tracking
- Use proper cumulative average instead of `(old + new) / 2`
- Add outcome tracking: when a trade closes, trace back to which `master_signal` → which `modular_signals` → which modules, and update win rates

### Phase 4: Initialize adaptive thresholds
- Seed the `adaptive_thresholds` table with the current default values so the system has a starting point to adapt from

### Phase 5: Wire up learning orchestrator
- Seed `learning_outcomes` from closed `shadow_trades` joined with their `master_signals`
- Schedule `autonomous-learning-orchestrator` and `generate-winning-patterns` via cron or manual trigger
- Fix `discover-winning-patterns` to query from the correct tables

**Files to edit:**
- `supabase/functions/generate-confluence-signals/index.ts` (confluence score fix, confidence cap)
- `supabase/functions/generate-confluence-signals/master-signal-modules.ts` (remove 1.2x boost)
- `supabase/functions/discover-winning-patterns/index.ts` (fix table references)
- Database migrations for missing tables + threshold seeding
- `supabase/functions/generate-confluence-signals/index.ts` (`updateModulePerformance` averaging fix)

