

# Next-Level Equity Curve Enhancement

## Current State
Basic `LineChart` with a single line, no gradient, no area fill, minimal styling — 200px tall, plain tooltip.

## Plan

### 1. Upgrade Chart in `src/components/DashboardOverview.tsx`

Replace the basic LineChart (lines 166-203) with a premium equity curve featuring:

- **Gradient Area Fill**: `AreaChart` with a green-to-transparent `linearGradient` under the line — gives the "money growing" feel
- **Glowing Line**: Thicker stroke (3px) with green color + a blurred duplicate line behind it for glow effect using `<defs>` filter
- **Taller Chart**: Increase height from 200 → 280px for more visual impact
- **Grid Lines**: Add `CartesianGrid` with subtle dashed lines
- **Enhanced Tooltip**: Custom tooltip component with money-themed styling — green background, gold border, dollar icon, larger P&L number
- **Profit/Loss Coloring**: Green gradient when profitable, red when in drawdown (use two area fills split at zero)
- **Reference Line at Zero**: Horizontal dashed line at $0 baseline
- **Stats Banner**: Add a row above the chart showing key stats: Peak P&L, Current P&L, Max Drawdown — with money-glow effects
- **Card Styling**: Gold border, money-glow class on the card, `💰` emoji in title
- **Animation**: Chart fades in with the existing `animate-fade-in` class

### Technical Details
- Import `AreaChart, Area, CartesianGrid, ReferenceLine` from recharts (already installed)
- Custom tooltip as inline React component
- Use CSS `linearGradient` in SVG `<defs>` for the area fill
- Split into green (above zero) and red (below zero) using `ReferenceLine`

### Single file change
Only `src/components/DashboardOverview.tsx` needs editing (lines ~166-203 replaced with enhanced version).

