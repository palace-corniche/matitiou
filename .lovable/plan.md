

# Fix: Dashboard Total P&L Display

## Bug
Line 71 in `DashboardOverview.tsx`:
```typescript
const totalPnl = (account?.balance || 10000) - 10000;
```
This derives PnL by subtracting a hardcoded `10000` from balance. The actual initial balance is `100,000`, and the account already stores `total_pnl` directly.

## Fix
Replace the derived calculation with the authoritative `account.total_pnl` field:
```typescript
const totalPnl = account?.total_pnl || 0;
```

## File
`src/components/DashboardOverview.tsx` — line 71 only.

