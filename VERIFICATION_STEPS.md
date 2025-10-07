# Signal Execution Verification Steps

## ✅ Fixes Implemented (2025-10-07 09:00 UTC)

### Phase 1: Signal Flow Fix
- **File:** `supabase/functions/generate-confluence-signals/index.ts`
- **Change:** Removed insert to `trading_signals` table, now inserts directly to `master_signals`
- **Lines:** 470-517

### Phase 2: Lot Size Validation
- **File:** `supabase/functions/execute-shadow-trades/index.ts`
- **Change:** Added lot size cap at 0.01 for global account before database insert
- **Lines:** 579-594
- **Database:** Created `account_defaults` record for global account (0.01 max lot, 0.5% risk)

### Phase 3: Verification Queries

Run these queries to verify the fixes are working:

```sql
-- 1. Check if new signals are going to master_signals (after next cron run)
SELECT 
  id,
  signal_type,
  confluence_score,
  final_confidence,
  status,
  created_at
FROM master_signals 
WHERE created_at > NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC;

-- 2. Verify trades are being executed with correct lot sizes
SELECT 
  id,
  symbol,
  trade_type,
  lot_size,
  entry_price,
  confluence_score,
  status,
  entry_time
FROM shadow_trades
WHERE portfolio_id = '00000000-0000-0000-0000-000000000001'
  AND entry_time > NOW() - INTERVAL '30 minutes'
ORDER BY entry_time DESC;

-- 3. Check execution logs
SELECT 
  function_name,
  status,
  processed_items,
  execution_time_ms,
  error_message,
  created_at
FROM system_health
WHERE function_name IN ('generate-confluence-signals', 'execute-shadow-trades')
  AND created_at > NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC;
```

## Expected Behavior After Next Cron Run

### Signal Generation (~every 15 minutes)
1. ✅ `generate-confluence-signals` runs
2. ✅ Creates signal in `master_signals` table (NOT `trading_signals`)
3. ✅ Signal includes: `status='pending'`, `confluence_score`, `recommended_entry/sl/tp`
4. ✅ Logs: "✅ Master signal stored: [uuid]"

### Trade Execution (~every 5 minutes)
1. ✅ `execute-shadow-trades` runs
2. ✅ Finds signals in `master_signals` with `status='pending'`
3. ✅ Calculates position size, caps at 0.01 for global account
4. ✅ Creates trade in `shadow_trades` with `lot_size=0.01`
5. ✅ Updates signal `status='executed'` in `master_signals`
6. ✅ Logs: "✅ Executed [BUY/SELL] trade for portfolio...: 0.01 lots @ [price]"

## Timeline

- **08:47 UTC:** Last signal generation (old code, went to `trading_signals`)
- **08:50 UTC:** Last trade execution attempt (found no signals in `master_signals`)
- **09:00 UTC:** Fixes deployed
- **~09:05 UTC:** Next expected `execute-shadow-trades` run (may find no pending signals)
- **~09:15 UTC:** Next expected `generate-confluence-signals` run (**FIRST TEST OF NEW CODE**)
- **~09:20 UTC:** Next `execute-shadow-trades` run (**SHOULD EXECUTE TRADE IF SIGNAL EXISTS**)

## Success Criteria

✅ Master signals table receives new records  
✅ Trading signals table receives NO new records  
✅ Shadow trades table receives new trades with `lot_size <= 0.01`  
✅ No database constraint errors in logs  
✅ Signals marked as `executed` after trade creation  
✅ Account balance updates correctly after trades

## Troubleshooting

If signals still go to `trading_signals`:
- Edge function code hasn't redeployed yet (check function logs timestamp)
- Force redeploy by making a small change to the function

If trades fail with "lot size cannot exceed 0.01":
- Check if lot size cap is applied BEFORE database insert
- Verify `account_defaults` record exists for global account

If no signals are generated:
- Check adaptive thresholds are reasonable
- Review market data freshness
- Check signal generation module health
