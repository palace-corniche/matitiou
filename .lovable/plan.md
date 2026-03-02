

# Clean Data Storage and Start Fresh

## Problem
Your database is **1,244 MB** but your actual trading data is only **7.5 MB**. The bloat comes from:
- **cron.job_run_details**: 719 MB (logs from every cron job execution)
- **net._http_response**: 508 MB (HTTP response logs from edge function calls)

These are system log tables that accumulate every minute from your 11 active cron jobs.

## Plan

### Step 1: Purge cron and net log tables (~1.2 GB freed)
Run SQL to delete all historical entries from:
- `cron.job_run_details` (719 MB) - safe to delete, just execution logs
- `net._http_response` (508 MB) - safe to delete, just HTTP call logs

### Step 2: Purge old trading data (start fresh)
Delete all rows from these tables while keeping the table structure intact:
- `shadow_trades` (15 closed trades)
- `trade_history` (15 records)
- `learning_outcomes` (15 records)
- `candlestick_patterns` (9 records)

### Step 3: Reset global trading account to starting state
Reset the `global_trading_account` row to:
- Balance: $100,000
- Equity: $100,000
- Total trades/wins/losses: 0
- Total PnL: 0
- Auto-trading: enabled

### Step 4: Set up automatic log cleanup
Create a cron job that runs daily to automatically purge:
- `cron.job_run_details` older than 24 hours
- `net._http_response` older than 24 hours

This prevents the 1.2 GB bloat from returning.

### Step 5: Update the periodic-data-cleanup edge function
Add cron/net cleanup to the existing cleanup function so it also runs on the 7-day schedule.

## What stays untouched
- All database functions (execute_global_shadow_trade, close_shadow_trade, etc.)
- All triggers
- All table schemas
- All edge functions
- All cron job schedules
- `account_defaults` (your 20-pip SL / 25-pip TP settings)
- `system_config`, `module_health`, `module_performance`
- `adaptive_thresholds`, `lot_size_presets`

## Technical Details

### Migration SQL (Step 1-3)
```sql
-- Purge cron logs (719 MB)
DELETE FROM cron.job_run_details;

-- Purge net logs (508 MB)  
DELETE FROM net._http_response;

-- Clear trading data for fresh start
TRUNCATE shadow_trades CASCADE;
TRUNCATE trade_history CASCADE;
TRUNCATE learning_outcomes CASCADE;
TRUNCATE candlestick_patterns CASCADE;
TRUNCATE exit_intelligence CASCADE;
TRUNCATE signal_rejection_logs CASCADE;
TRUNCATE master_signals CASCADE;
TRUNCATE modular_signals CASCADE;
TRUNCATE master_signals_fusion CASCADE;

-- Reset global account
UPDATE global_trading_account SET
  balance = 100000, equity = 100000,
  total_trades = 0, winning_trades = 0, losing_trades = 0,
  win_rate = 0, total_pnl = 0, auto_trading_enabled = true,
  updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001';
```

### Auto-cleanup cron job (Step 4)
```sql
-- Daily cleanup of system logs to prevent bloat
SELECT cron.schedule(
  'cleanup-system-logs-daily',
  '0 3 * * *',
  $$
    DELETE FROM cron.job_run_details WHERE end_time < NOW() - INTERVAL '24 hours';
    DELETE FROM net._http_response WHERE created < NOW() - INTERVAL '24 hours';
  $$
);
```

### Expected result
- Database size drops from ~1,244 MB to ~20 MB
- Fresh trading account ready to trade
- Automatic daily cleanup prevents future bloat
- All system functions and cron jobs remain active

