-- Create tables for Phase 11 comprehensive implementation
-- Intelligence Performance Tables
CREATE TABLE IF NOT EXISTS intelligence_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_source TEXT NOT NULL, -- 'regime', 'sentiment', 'economic', 'central_bank'
  symbol TEXT NOT NULL DEFAULT 'EUR/USD',
  timeframe TEXT NOT NULL DEFAULT '15m',
  signal_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  predicted_direction TEXT NOT NULL, -- 'bullish', 'bearish', 'neutral'
  confidence_score NUMERIC NOT NULL,
  actual_outcome TEXT, -- 'correct', 'incorrect', 'neutral'
  actual_move_pips NUMERIC,
  prediction_accuracy NUMERIC, -- 0-1 score
  market_regime TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Multi-Timeframe Signals
CREATE TABLE IF NOT EXISTS multi_timeframe_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL,
  symbol TEXT NOT NULL DEFAULT 'EUR/USD',
  timeframes TEXT[] NOT NULL, -- ['1m', '5m', '15m', '1h', '4h', '1d']
  signal_type TEXT NOT NULL,
  confluence_score NUMERIC NOT NULL,
  timeframe_agreement_count INTEGER NOT NULL,
  cascade_strength NUMERIC NOT NULL, -- Strength from higher timeframes
  divergence_detected BOOLEAN DEFAULT FALSE,
  primary_timeframe TEXT NOT NULL,
  signal_data JSONB NOT NULL, -- Per-timeframe signal details
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolio Allocations for Professional Management
CREATE TABLE IF NOT EXISTS portfolio_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL,
  currency_pair TEXT NOT NULL,
  target_allocation_percent NUMERIC NOT NULL,
  current_allocation_percent NUMERIC NOT NULL,
  intelligence_confidence NUMERIC NOT NULL,
  risk_budget_allocated NUMERIC NOT NULL,
  correlation_adjustment NUMERIC DEFAULT 0,
  regime_based_scaling NUMERIC DEFAULT 1,
  last_rebalance TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automated Trading Rules
CREATE TABLE IF NOT EXISTS automated_trading_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- 'regime_change', 'economic_surprise', 'sentiment_momentum'
  trigger_conditions JSONB NOT NULL,
  execution_parameters JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  confidence_threshold NUMERIC DEFAULT 0.7,
  max_position_size NUMERIC DEFAULT 0.05,
  stop_loss_percent NUMERIC DEFAULT 0.02,
  take_profit_percent NUMERIC DEFAULT 0.04,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backtesting Results
CREATE TABLE IF NOT EXISTS intelligence_backtests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  intelligence_config JSONB NOT NULL,
  total_trades INTEGER NOT NULL,
  winning_trades INTEGER NOT NULL,
  total_return NUMERIC NOT NULL,
  max_drawdown NUMERIC NOT NULL,
  sharpe_ratio NUMERIC NOT NULL,
  win_rate NUMERIC NOT NULL,
  avg_trade_duration INTERVAL,
  detailed_results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_intelligence_performance_symbol_timeframe ON intelligence_performance(symbol, timeframe, signal_timestamp);
CREATE INDEX IF NOT EXISTS idx_multi_timeframe_signals_symbol ON multi_timeframe_signals(symbol, created_at);
CREATE INDEX IF NOT EXISTS idx_portfolio_allocations_portfolio ON portfolio_allocations(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_automated_trading_rules_portfolio ON automated_trading_rules(portfolio_id, is_active);
CREATE INDEX IF NOT EXISTS idx_intelligence_backtests_symbol ON intelligence_backtests(symbol, timeframe);

-- Enable RLS
ALTER TABLE intelligence_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE multi_timeframe_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_trading_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_backtests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view intelligence performance" ON intelligence_performance FOR SELECT USING (true);
CREATE POLICY "System can manage intelligence performance" ON intelligence_performance FOR ALL USING (true);

CREATE POLICY "Users can view multi-timeframe signals" ON multi_timeframe_signals FOR SELECT USING (true);
CREATE POLICY "System can manage multi-timeframe signals" ON multi_timeframe_signals FOR ALL USING (true);

CREATE POLICY "Users can manage their portfolio allocations" ON portfolio_allocations 
FOR ALL USING (EXISTS (
  SELECT 1 FROM shadow_portfolios sp 
  WHERE sp.id = portfolio_allocations.portfolio_id 
  AND ((auth.uid() IS NOT NULL AND sp.user_id = auth.uid()) 
       OR (auth.uid() IS NULL AND sp.session_id IS NOT NULL))
));

CREATE POLICY "Users can manage their trading rules" ON automated_trading_rules 
FOR ALL USING (EXISTS (
  SELECT 1 FROM shadow_portfolios sp 
  WHERE sp.id = automated_trading_rules.portfolio_id 
  AND ((auth.uid() IS NOT NULL AND sp.user_id = auth.uid()) 
       OR (auth.uid() IS NULL AND sp.session_id IS NOT NULL))
));

CREATE POLICY "Users can view backtests" ON intelligence_backtests FOR SELECT USING (true);
CREATE POLICY "System can manage backtests" ON intelligence_backtests FOR ALL USING (true);