
# Specialized Analysis: Godmode Upgrade

## Current State Analysis

Looking at the existing code, the Specialized Analysis module has a basic structure:

### Backend (`master-signal-modules.ts`)
- **Current `generateSpecializedSignals()`**: Simple implementation that reads existing specialized_analysis signals from the database (circular dependency pattern like the others had)
- **Limited Logic**: Only basic signal reading, no real analysis computation
- **Dummy Data**: Existing signals likely from test functions with generic calculation_parameters

### Frontend (`EnhancedSpecializedAnalysis.tsx`)
- **Basic UI**: Shows Elliott Wave patterns (but no elliott_waves table exists), order flow from tick data, and specialized signals
- **Empty States**: Most sections show "N/A" or empty data due to lack of real computation
- **Limited Functionality**: Only reads from modular_signals without rich visualization

## Plan: Advanced Pattern Recognition & Market Structure Engine

Replace the basic module with a sophisticated pattern recognition system that combines multiple specialized analysis techniques.

### Backend: New `generateSpecializedSignals()` - 6-Model System

**1. Elliott Wave Analysis**
- **Wave Counting Algorithm**: Implement Ralph Elliott's wave theory using fractal analysis
- **Fibonacci Ratios**: Validate wave relationships using 0.618, 1.618, 2.618 ratios
- **Wave Degree Classification**: Identify Primary, Intermediate, Minor waves
- **Pattern Recognition**: Detect impulse (1-2-3-4-5) and corrective (A-B-C) sequences

**2. Harmonic Pattern Detection**
- **Gartley Patterns**: AB=CD with 0.618 retracement ratios
- **Butterfly Patterns**: Extended Gartley with 1.27-1.618 extensions
- **Bat Patterns**: 0.382-0.500 retracement with specific PRZ (Potential Reversal Zone)
- **Crab Patterns**: 1.618 extension with deep retracements

**3. Market Structure Analysis**
- **Higher Highs/Higher Lows**: Trend structure identification
- **Break of Structure (BOS)**: Trend continuation signals
- **Change of Character (CHoCH)**: Trend reversal identification
- **Order Blocks**: Institutional supply/demand zones
- **Fair Value Gaps (FVG)**: Imbalance areas requiring retracement

**4. Fibonacci Analysis**
- **Retracement Levels**: 23.6%, 38.2%, 50%, 61.8%, 78.6%
- **Extension Levels**: 127.2%, 161.8%, 200%, 261.8%
- **Time Projections**: Fibonacci time zones for cycle analysis
- **Confluence Zones**: Multiple Fibonacci level alignments

**5. Volume Profile Analysis**
- **Point of Control (POC)**: Highest volume trading level
- **Value Area**: 70% of volume distribution
- **Volume Gaps**: Low volume areas indicating weak price acceptance
- **Volume Shelf**: Horizontal volume accumulation zones

**6. Divergence Analysis**
- **RSI Divergence**: Price vs RSI momentum divergence
- **MACD Divergence**: Price vs MACD histogram divergence
- **Volume Divergence**: Price vs volume flow divergence
- **Hidden Divergence**: Continuation pattern identification

### Composite Scoring System
```text
Weights:
  Elliott Wave      0.20
  Harmonic Patterns 0.20
  Market Structure  0.20
  Fibonacci         0.15
  Volume Profile    0.15
  Divergence        0.10
```

**Signal Logic**: 
- Calculate each model score [0-1]
- Apply weights to create composite score
- Signal fires when composite > 0.60
- Always store diagnostic data (including HOLD signals)

### Rich Data Storage
Store comprehensive analysis in `calculation_parameters`:
```json
{
  "elliott_wave": {
    "current_wave": "3",
    "wave_degree": "intermediate",
    "pattern_type": "impulse",
    "completion_percentage": 78.5,
    "projected_targets": [1.1650, 1.1680, 1.1720]
  },
  "harmonic_patterns": [
    {
      "pattern_type": "gartley_bullish",
      "completion": 0.95,
      "prz_zone": [1.1520, 1.1535],
      "confidence": 0.82
    }
  ],
  "market_structure": {
    "trend": "bullish",
    "last_bos": 1.1580,
    "key_levels": [1.1520, 1.1580, 1.1620],
    "structure_score": 0.75
  },
  "fibonacci": {
    "key_retracements": [1.1545, 1.1520, 1.1485],
    "extensions": [1.1650, 1.1720, 1.1780],
    "confluence_zones": [1.1520, 1.1720]
  },
  "volume_profile": {
    "poc": 1.1565,
    "value_area_high": 1.1585,
    "value_area_low": 1.1545,
    "volume_gaps": [1.1590, 1.1610]
  },
  "divergences": [
    {
      "type": "rsi_bullish",
      "strength": 0.68,
      "time_span": "4h"
    }
  ]
}
```

### Frontend: Complete `SpecializedAnalysis.tsx` Rebuild

**1. Top Metrics Row** (6 cards):
- Elliott Wave Status (current wave + completion %)
- Active Harmonic Patterns count
- Market Structure trend + BOS level
- Fibonacci Confluence strength
- Volume Profile POC deviation
- Active Divergences count

**2. Pattern Recognition Panel**:
- **Elliott Wave Visualization**: Wave labeling with degree and progress bars
- **Harmonic Pattern Overlay**: Active patterns with completion percentages
- **Market Structure Map**: BOS/CHoCH levels with trend classification

**3. Key Levels Dashboard**:
- **Fibonacci Grid**: All active retracement and extension levels
- **Volume Profile**: POC and Value Area visualization
- **Support/Resistance**: Order blocks and key structure levels

**4. Divergence Analysis**:
- **Active Divergences Table**: Type, strength, timeframe, status
- **Historical Performance**: Divergence success rates by type

**5. Signal History with Pattern Context**:
- Enhanced signal list with pattern breakdown
- Pattern completion status and projected targets

### Changes Summary

| File | What |
|---|---|
| `supabase/functions/generate-confluence-signals/master-signal-modules.ts` | Replace `generateSpecializedSignals()` with 6-model pattern recognition engine |
| `src/pages/SpecializedAnalysis.tsx` | Complete rebuild with pattern visualization, key levels, and divergence analysis |

### Expected Result
- Advanced pattern recognition with Elliott Wave, Harmonic, and Market Structure analysis
- Real-time pattern completion tracking and target projection
- Professional-grade technical analysis dashboard
- Always-populated UI with live pattern data
- Integration of volume profile and divergence analysis
- Sophisticated signal generation based on pattern confluence

