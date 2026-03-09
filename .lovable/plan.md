
## Problem Diagnosis

There are **4 separate functions** that can close trades, with inconsistent Telegram notification behavior:

| Function | Closes Trades | Sends Telegram |
|---|---|---|
| `check-trade-exits` | SL/TP/time-limit | ✅ Yes |
| `intelligent-exit-engine` (CRON) | FORCE_EXIT | ❌ No |
| `monitor-exit-intelligence` | FORCE_EXIT (same trades!) | ✅ Yes (duplicate) |
| `manage-shadow-trades` | SL/TP/time-based | ❌ No |
| `execute-shadow-trades` | Opposite-direction flush | ❌ No |

**Root causes:**

1. **`intelligent-exit-engine` and `monitor-exit-intelligence` are duplicate functions** — both run as CRON, both query open trades, both call `close_shadow_trade` on the same FORCE_EXIT trades. This causes double-close attempts AND inconsistent Telegram behavior.

2. **`manage-shadow-trades` closes trades silently** — no Telegram sent for those exits.

3. **`execute-shadow-trades` closes opposite trades silently** — no Telegram for those.

## Fix Plan

### 1. Centralize Telegram notification into `send-telegram-notification`
No changes needed here — it already works correctly.

### 2. Fix `intelligent-exit-engine` — add Telegram for FORCE_EXIT (CRON mode)
In the CRON loop (lines 94–111), after successful `close_shadow_trade`, invoke `send-telegram-notification` with trade details — same pattern used in `check-trade-exits`.

### 3. Remove `monitor-exit-intelligence` as a trade-closer
`monitor-exit-intelligence` currently duplicates what `intelligent-exit-engine` CRON already does. Fix: make `monitor-exit-intelligence` only **store exit intelligence analysis** (no `close_shadow_trade` call). The actual close + Telegram stays in `intelligent-exit-engine`.

### 4. Fix `manage-shadow-trades` — add Telegram after close
After the `close_shadow_trade` RPC call succeeds (lines 540–557), invoke `send-telegram-notification` with the exit reason, PnL and pips.

### 5. Fix `execute-shadow-trades` — add Telegram for opposite-trade closes
After closing opposite-direction trades (lines 888–906), invoke `send-telegram-notification` per closed trade with reason `opposite_signal`.

## Files to Change

```text
supabase/functions/intelligent-exit-engine/index.ts
  - Add Telegram invoke after FORCE_EXIT close in CRON mode (lines ~98-111)

supabase/functions/monitor-exit-intelligence/index.ts
  - Remove the close_shadow_trade + Telegram block
  - Keep only: fetch trades → call intelligent-exit-engine → store exit_intelligence

supabase/functions/manage-shadow-trades/index.ts
  - Add Telegram invoke after successful close_shadow_trade RPC (~line 553)

supabase/functions/execute-shadow-trades/index.ts
  - Add Telegram invoke after each opposite trade close (~line 901)
```

## Result
Every single trade close path — regardless of reason (SL, TP, time, intelligence, opposite-flush) — will send exactly **one** Telegram notification with the reason, PnL, and pips.
