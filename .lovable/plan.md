

# Strengthen Periodic Cleanup — Cover Missing High-Volume Tables

## What Changes
Update `supabase/functions/periodic-data-cleanup/index.ts` to add cleanup for 4 uncovered tables:

| Table | Retention | Reason |
|-------|-----------|--------|
| `tick_data` | 6 hours | Highest volume — grows fastest |
| `trade_execution_log` | 7 days | Accumulates with every trade open/close |
| `system_health` | 3 days | Logs every function run |
| `modular_signals` | 3 days | Generated every signal cycle |

## Implementation
Add 4 new delete blocks (steps 12-15) after the existing step 11 in the cleanup function, following the same pattern already used. No other files need changes.

