

# Verification Results: 1 Bug Found

## What's Confirmed Working

| Component | Verified |
|-----------|----------|
| `update_module_performance_from_trade` | Has `total_signals = total_signals + 1` |
| `close_shadow_trade` margin release | Calculates and releases margin correctly |
| Dynamic hold time (4h/8h) | Code deployed in `check-trade-exits` |
| Stuck signals cleanup | 6 signals moved to `expired` |
| Old direction strings backfill | 0 signals with `buy/sell/hold` in `contributing_modules` |
| Module performance reset | All 6 modules at 0/0/0 (clean slate) |
| Modular signals linkage | New signals correctly linked via `analysis_id` |
| Account margin state | `used_margin = 0` with 0 open trades |

## Bug Found: Account Stats Never Updated

`close_shadow_trade` updates `balance`, `equity`, `winning_trades`, `losing_trades`, `win_rate`, `largest_win`, `largest_loss` — but it **never updates**:

| Field | Current Value | Should Be |
|-------|--------------|-----------|
| `total_pnl` | 0 | 18.24 |
| `average_win` | 0 | ~1.93 |
| `average_loss` | 0 | ~-0.59 |
| `profit_factor` | 0 | ~9.0 |

These are dashboard display fields. If any UI or risk management logic reads `total_pnl` or `profit_factor`, it will see zeros.

## Fix Plan

### Step 1: Update `close_shadow_trade` DB function
Add these lines to the `UPDATE global_trading_account` statement:
```sql
total_pnl = total_pnl + v_pnl,
average_win = CASE WHEN v_pnl > 0 
  THEN (average_win * winning_trades + v_pnl) / (winning_trades + 1) 
  ELSE average_win END,
average_loss = CASE WHEN v_pnl <= 0 
  THEN CASE WHEN losing_trades > 0 
    THEN (average_loss * losing_trades + v_pnl) / (losing_trades + 1) 
    ELSE v_pnl END 
  ELSE average_loss END,
profit_factor = CASE WHEN (CASE WHEN v_pnl <= 0 THEN losing_trades + 1 ELSE losing_trades END) > 0
  THEN ABS(
    (CASE WHEN v_pnl > 0 THEN average_win * winning_trades + v_pnl ELSE average_win * winning_trades END) /
    GREATEST(0.01, ABS(CASE WHEN v_pnl <= 0 THEN average_loss * losing_trades + v_pnl ELSE average_loss * losing_trades END))
  ) ELSE 0 END,
```

### Step 2: One-time backfill of account stats
Run SQL to calculate correct values from the 15 closed trades and update the account.

### Files to change
- Database function: `close_shadow_trade` (add 4 fields to UPDATE)
- One-time SQL: backfill `total_pnl`, `average_win`, `average_loss`, `profit_factor`

