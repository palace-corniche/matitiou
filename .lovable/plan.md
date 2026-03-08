

# Money Printer Theme - Green & Gold Rich Vibes

## Overview
Transform the UI into a "money printing machine" aesthetic with green/gold color scheme, floating money animations, glowing profit indicators, and wealth-themed visual elements.

## Changes

### 1. `src/index.css` - New Money Theme Colors + Animations
- Override primary color to rich green (`142 76% 36%`)
- Add gold accent color (`45 93% 47%`)
- Add CSS keyframe animations:
  - `float-money` - dollar signs floating up and fading
  - `glow-green` - pulsing green glow on profit cards
  - `shimmer-gold` - gold shimmer sweep effect on headers
  - `cash-rain` - subtle falling money particle effect
- Add utility classes: `.money-glow`, `.gold-shimmer`, `.cash-float`

### 2. `tailwind.config.ts` - Register New Animations
- Add `float-money`, `glow-green`, `shimmer-gold` keyframes
- Add corresponding animation utilities
- Add `money-green` and `money-gold` color tokens

### 3. `src/components/MoneyBackground.tsx` - NEW Floating Money Component
- Renders floating `$` and `💰` symbols as absolute-positioned animated elements
- Random positions, speeds, and opacity for organic feel
- Lightweight CSS-only animations (no JS animation loops)
- Used as a background layer on the main dashboard

### 4. `src/components/ShadowTradingDashboardUnified.tsx` - Apply Money Theme
- Wrap dashboard in `MoneyBackground` component
- Balance card: green glow effect, gold border, larger font
- Positive PnL values: bright green with glow
- Return card: gold shimmer on positive returns
- Cards get subtle green-tinted borders

### 5. `src/components/PageHeader.tsx` - Money-Themed Header
- Add gold shimmer gradient to the header background
- Icon background becomes green with glow
- Title gets a subtle gold text shadow

### 6. `src/components/NavigationBar.tsx` - Green Accent
- Active nav item gets green highlight instead of default primary
- Logo area gets subtle money-green tint

## Result
Every time the user opens the app, they see floating dollar signs, glowing green profit numbers, gold accents, and a rich "money printer" aesthetic that screams wealth.

