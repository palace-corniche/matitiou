

# Clean Up Existing Bad Trades + Verify Fix Deployment

## Current Problems
1. **4 duplicate SELL trades** at identical price 1.15473 opened within 4 seconds (22:02:05-09)
2. **1 opposite BUY trade** at 1.15389 opened 10 minutes later alongside the SELLs
3. **6 signals stuck in `executing`** status — never completed or timed out
4. **7 signals stuck in `pending`** from hours ago — should have been processed or expired

## Plan

### Step 1: Close the 4 duplicate SELL trades, keep only the oldest one
- Close trades `4ae2dc76`, `5234fb87`, `2c7316db` (3 duplicates) at current market price via `close_shadow_trade` RPC
- Keep `4ed3d723` (the first SELL, opened at 22:02:05)

### Step 2: Decide on the opposite BUY vs remaining SELL
- The BUY (entry 1.15389) and SELL (entry 1.15473) are hedged against each other — net exposure is near zero, both losing on spread
- Close the weaker one. The BUY was opened later with lower confluence — close it, keep the SELL

### Step 3: Clean up stuck signals
- Set the 6 `executing` signals back to `expired` (they're orphaned — execution failed but status never reverted)
- Set the 7 old `pending` signals (older than 4 hours) to `expired`

### Step 4: Verify the deployed edge functions contain the fixes
- Check `execute-shadow-trades` logs to confirm the batch dedup and same-direction checks are active
- Check `generate-confluence-signals` logs to confirm directional conflict guard is working

## Changes

### Database cleanup (via migration or direct queries)
1. Close 3 duplicate trades + 1 opposite trade using `close_shadow_trade` RPC calls
2. Update stuck `executing` signals to `expired`
3. Update old `pending` signals to `expired`

### No code changes needed
The fixes were already applied to both edge functions in the previous message. This is purely a data cleanup of pre-fix trades.

