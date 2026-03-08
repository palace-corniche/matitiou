

# Full System Audit: Layer-by-Layer Verification

## Layer 1: Market Data Pipeline — WORKING
| Component | Status | Evidence |
|-----------|--------|----------|
| `fetch-market-data` | OK | Running every 5 min, latest data at 17:00 UTC, 40 data points |
| `aggregate-candles` | OK | Syncing 32 points, producing 15m/1h/4h/1d candles |
| `sync-market-data-enhanced` | OK | Syncing 500 candles to `market_data_enhanced` |
| `system_health` logs | OK | All recent entries show `status: success` |

## Layer 2: Signal Generation — WORKING
| Component | Status | Evidence |
|-----------|--------|----------|
| `generate-confluence-signals` | OK | Running every 10 min, latest at 17:00 UTC |
| Module ID mapping | FIXED | Latest signals show `[sentiment_analysis, specialized_analysis]`, `[technical_analysis]` |
| Modular signals linkage | FIXED | 7 of 35 signals linked (new ones correct, old ones remain unlinked) |
| Signal type filtering | FIXED | Only buy/sell stored, no constraint violations in logs |
| Dedup logic | OK | "Skipping signal - similar recent signal exists" working correctly |

## Layer 3: Trade Execution — WORKING (paused for weekend)
| Component | Status | Evidence |
|-----------|--------|----------|
| `execute-shadow-trades` | OK | Correctly detecting "Market closed: Sunday before 22:00 UTC" |
| `atomic_lock_signals` | OK | 15 trades executed successfully, 6 signals in `executing` status |
| Market hours guard | OK | Prevents weekend trading correctly |

## Layer 4: Exit Management — WORKING
| Component | Status | Evidence |
|-----------|--------|----------|
| `check-trade-exits` | OK | Running every 2 min, "No open trades with SL/TP to check" (correct - 0 open) |
| `intelligent-exit-engine` | OK | Logs show "CRON mode - fetching all open trades... No open trades to evaluate" |
| Margin release | FIXED | `used_margin = 0` with 0 open trades (correct) |

## Layer 5: Learning Pipeline — PARTIALLY WORKING
| Component | Status | Issue |
|-----------|--------|-------|
| `process-trade-outcome` trigger | OK | Triggered on trade close |
| `learning_outcomes` populated | OK | 10 outcomes recorded |
| `contributing_modules` in outcomes | BROKEN | All 10 show `contributing_modules: []` (empty) |
| `signal_breakdown` in outcomes | BROKEN | All show `signal_breakdown: {}` (empty) |
| `module_performance` counters | ZERO | All 6 modules: `total_signals=0, successful=0, failed=0` |
| Loss analysis | OK | 2 trades have valid `loss_analysis` with categories |

**Root Cause**: The 15 closed trades were all executed BEFORE the contributing_modules fix. Their master signals still have old data. `process-trade-outcome` looks up the signal's `contributing_modules` and finds direction strings like `["buy"]` — which don't match any `module_id` in `module_performance`. Since no new trades have closed after the fix, the learning loop has never run with correct data.

## Layer 6: Cron Jobs — ALL RUNNING
All 9+ cron jobs are active and properly scheduled. No missing jobs for `update-open-trades-pnl` or `process-trade-outcome` (these are invoked by other functions, not directly by cron — which is correct).

## Layer 7: Account State — CORRECT
| Metric | Value | Status |
|--------|-------|--------|
| Balance | $100,018.24 | OK |
| Equity | $100,018.24 | OK (matches balance, 0 open trades) |
| Used Margin | $0 | OK (no open trades) |
| Free Margin | $100,018.24 | OK |
| Win Rate | 73.3% | Good |
| Total PnL | +$18.24 | Profitable |
| Avg PnL/trade | +$1.22 | Positive |
| Open Trades | 0 | Correct (weekend) |

## Layer 8: Profitability Analysis
| Exit Reason | Count | Avg PnL | Avg Pips | Issue? |
|-------------|-------|---------|----------|--------|
| max_hold_time_reached | 11 | +$1.07 | +10.7 | Still profitable but leaving money on table |
| take_profit_hit | 2 | +$4.48 | +44.8 | Best exits |
| stop_loss_hit | 1 | -$2.36 | -23.6 | Working correctly |
| manual | 1 | -$0.08 | -0.8 | OK |

**Key insight**: Trades that hit TP earned 4x more than time-exit trades. The 3-hour hold limit is cutting profitable trades short — 11 trades averaged +10.7 pips but many could have reached the 25-pip TP target.

---

## Remaining Issues (2 bugs, 1 optimization)

### Bug 1: Learning loop has ZERO real data
`module_performance` is all zeros. The Bayesian engine queries these to weight modules, so right now all modules get equal weight. The fix is deployed but hasn't been validated by a single trade yet because:
- All 15 closed trades reference pre-fix signals
- Market is currently closed (Sunday)
- First real validation will happen Monday when new trades open AND close

**No code change needed** — this will self-heal when the market opens Monday and trades cycle through the corrected pipeline.

### Bug 2: 6 signals stuck in `executing` status
6 master signals from March 6 are stuck in `executing` status (they were locked by `atomic_lock_signals` but never resolved). These are harmless but should be cleaned up.

**Fix**: One-time SQL UPDATE to set them to `executed` or `expired`.

### Optimization: Max hold time causing premature exits
73% of exits are `max_hold_time_reached`. Average PnL for time exits is +$1.07 vs +$4.48 for TP hits. Many time-exit trades had 15-22 pips profit — close to the 25-pip TP. Extending the hold time from 3h to 6h (or making it conditional on unrealized PnL) could significantly improve profitability.

**Fix**: Update `check-trade-exits/index.ts` — change the 3-hour max hold to either:
- 6 hours flat, OR
- Dynamic: if unrealized PnL > 10 pips, extend to 6h; otherwise keep 3h

---

## Plan

### Step 1: Clean up stuck `executing` signals
One-time SQL to reset 6 stuck signals to `expired`.

### Step 2: Extend max hold time for profitable trades
Update `check-trade-exits/index.ts` to use dynamic hold time:
- Default: 4 hours
- If trade is profitable (>5 pips): extend to 8 hours
- This lets winning trades run closer to TP while still cutting losers

### Step 3: No other code changes needed
The learning pipeline, margin management, module mapping, and signal linkage fixes are all deployed and will activate automatically when trading resumes Monday.

### Files to Edit
| File | Change |
|------|--------|
| `supabase/functions/check-trade-exits/index.ts` | Dynamic hold time based on unrealized PnL |
| SQL (one-time) | Clean up 6 stuck `executing` signals |

