

# Fix: MarketRegimeIndicator null crash

The error is `Cannot read properties of null (reading 'toFixed')` at line 276 (source-mapped to the component). The `regime.indicators.vix`, `usdIndex`, `commodities`, or `equities` values can be `null` when the market intelligence engine returns no data for those fields.

## Fix
Add null-safe defaults (`?? 0`) before calling `.toFixed()` on all four indicator values (lines 61, 66, 71, 77). Also add a null guard for `regime.indicators` itself.

**File:** `src/components/MarketRegimeIndicator.tsx`
- Line 61: `{(regime.indicators.vix ?? 0).toFixed(1)}`
- Line 66: `{(regime.indicators.usdIndex ?? 0).toFixed(2)}`
- Line 71: `{(regime.indicators.commodities ?? 0).toFixed(0)}%`
- Line 77: `{(regime.indicators.equities ?? 0).toFixed(0)}%`
- Add early return if `!regime?.indicators`

