

# Fix Remaining -99.881% Return Display

## Problem
`src/components/ShadowTradingDashboardUnified.tsx` line 58 still calculates return using `100000`:
```typescript
const totalReturn = account ? ((account.balance - 100000) / 100000) * 100 : 0;
```

## Fix
Change line 58 to use `100` as the initial balance:
```typescript
const totalReturn = account ? ((account.balance - 100) / 100) * 100 : 0;
```

Single line change, one file.

