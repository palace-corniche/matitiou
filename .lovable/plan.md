

# Fix Total Return Calculation

## Problem
In `PerformanceMetricsPanel.tsx` line 62, the return is calculated against a hardcoded `100000` initial balance:
```typescript
const totalReturn = ((account.balance - 100000) / 100000) * 100;
```
With balance at `$119`, this gives `(119 - 100000) / 100000 * 100 = -99.881%`. The user wants it based on an initial balance of `$100`.

## Fix
Change line 62 in `src/components/enhanced/PerformanceMetricsPanel.tsx`:
```typescript
const totalReturn = ((account.balance - 100) / 100) * 100;
```

This yields `(119 - 100) / 100 * 100 = 19%` — correctly showing profit.

Single line change, one file.

