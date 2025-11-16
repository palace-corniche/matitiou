-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- ============================================================================
-- CORE TRADING TABLES
-- ============================================================================

-- Global Trading Account
CREATE TABLE IF NOT EXISTS public.global_trading_account (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
  balance DECIMAL(15,2) NOT NULL DEFAULT 100000.00,
  equity DECIMAL(15,2) NOT NULL DEFAULT 100000.00,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2) DEFAULT 0.00,
  total_pnl DECIMAL(15,2) DEFAULT 0.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default global account
INSERT INTO public.global_trading_account (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Shadow Portfolios
CREATE TABLE IF NOT EXISTS public.shadow_portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  balance DECIMAL(15,2) NOT NULL DEFAULT 100000.00,
  equity DECIMAL(15,2) NOT NULL DEFAULT 100000.00,
  margin_used DECIMAL(15,2) DEFAULT 0.00,
  free_margin DECIMAL(15,2),
  margin_level DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shadow Trades
CREATE TABLE IF NOT EXISTS public.shadow_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID REFERENCES public.shadow_portfolios(id),
  signal_id UUID,
  symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  lot_size DECIMAL(10,2) NOT NULL,
  entry_price DECIMAL(10,5) NOT NULL,
  exit_price DECIMAL(10,5),
  stop_loss DECIMAL(10,5),
  take_profit DECIMAL(10,5),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  pnl DECIMAL(15,2) DEFAULT 0.00,
  profit_pips DECIMAL(10,2) DEFAULT 0.00,
  commission DECIMAL(10,2) DEFAULT 0.00,
  swap DECIMAL(10,2) DEFAULT 0.00,
  entry_time TIMESTAMPTZ DEFAULT NOW(),
  exit_time TIMESTAMPTZ,
  exit_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trade History
CREATE TABLE IF NOT EXISTS public.trade_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID REFERENCES public.shadow_portfolios(id),
  original_trade_id UUID REFERENCES public.shadow_trades(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('open', 'close', 'partial_close', 'modify')),
  symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  lot_size DECIMAL(10,2) NOT NULL,
  execution_price DECIMAL(10,5) NOT NULL,
  profit DECIMAL(15,2) DEFAULT 0.00,
  profit_pips DECIMAL(10,2) DEFAULT 0.00,
  commission DECIMAL(10,2) DEFAULT 0.00,
  swap DECIMAL(10,2) DEFAULT 0.00,
  balance_before DECIMAL(15,2),
  balance_after DECIMAL(15,2),
  equity_before DECIMAL(15,2),
  equity_after DECIMAL(15,2),
  execution_time TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- MARKET DATA TABLES
-- ============================================================================

-- Market Data Feed
CREATE TABLE IF NOT EXISTS public.market_data_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  price DECIMAL(10,5) NOT NULL,
  bid DECIMAL(10,5),
  ask DECIMAL(10,5),
  spread DECIMAL(10,5),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'alphavantage',
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timestamp ON public.market_data_feed(symbol, timestamp DESC);

-- Tick Data
CREATE TABLE IF NOT EXISTS public.tick_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  bid DECIMAL(10,5) NOT NULL,
  ask DECIMAL(10,5) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  volume DECIMAL(15,2),
  source TEXT DEFAULT 'realtime',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tick_data_symbol_timestamp ON public.tick_data(symbol, timestamp DESC);

-- Aggregated Candles
CREATE TABLE IF NOT EXISTS public.aggregated_candles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  open_price DECIMAL(10,5) NOT NULL,
  high_price DECIMAL(10,5) NOT NULL,
  low_price DECIMAL(10,5) NOT NULL,
  close_price DECIMAL(10,5) NOT NULL,
  volume DECIMAL(15,2) DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL,
  tick_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(symbol, timeframe, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_aggregated_candles_lookup ON public.aggregated_candles(symbol, timeframe, timestamp DESC);

-- ============================================================================
-- SIGNAL TABLES
-- ============================================================================

-- Master Signals
CREATE TABLE IF NOT EXISTS public.master_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signal_type TEXT NOT NULL CHECK (signal_type IN ('buy', 'sell', 'neutral')),
  symbol TEXT NOT NULL,
  final_confidence DECIMAL(5,4) NOT NULL,
  confluence_score DECIMAL(5,2),
  contributing_modules JSONB DEFAULT '[]'::jsonb,
  fusion_algorithm TEXT,
  entry_price DECIMAL(10,5),
  stop_loss DECIMAL(10,5),
  take_profit DECIMAL(10,5),
  risk_reward_ratio DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_master_signals_status ON public.master_signals(status, created_at DESC);

-- Modular Signals
CREATE TABLE IF NOT EXISTS public.modular_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_name TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('buy', 'sell', 'neutral')),
  symbol TEXT NOT NULL,
  confidence DECIMAL(5,4) NOT NULL,
  strength DECIMAL(5,2),
  timeframe TEXT,
  supporting_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modular_signals_module ON public.modular_signals(module_name, created_at DESC);

-- Signal Rejection Logs
CREATE TABLE IF NOT EXISTS public.signal_rejection_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signal_data JSONB NOT NULL,
  reason TEXT NOT NULL,
  rejection_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- LEARNING SYSTEM TABLES
-- ============================================================================

-- Learning Outcomes
CREATE TABLE IF NOT EXISTS public.learning_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID REFERENCES public.shadow_trades(id),
  signal_id UUID,
  outcome_type TEXT NOT NULL CHECK (outcome_type IN ('win', 'loss', 'breakeven')),
  pnl DECIMAL(15,2) NOT NULL,
  pips DECIMAL(10,2),
  hold_time_minutes INTEGER,
  market_conditions JSONB DEFAULT '{}'::jsonb,
  signal_quality JSONB DEFAULT '{}'::jsonb,
  lessons_learned TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_outcomes_trade ON public.learning_outcomes(trade_id);

-- Learning Actions
CREATE TABLE IF NOT EXISTS public.learning_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type TEXT NOT NULL,
  trigger_reason TEXT,
  parameters_before JSONB,
  parameters_after JSONB,
  success BOOLEAN,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Learning Stats
CREATE TABLE IF NOT EXISTS public.system_learning_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  total_lessons INTEGER DEFAULT 0,
  patterns_discovered INTEGER DEFAULT 0,
  adaptations_made INTEGER DEFAULT 0,
  current_accuracy DECIMAL(5,4),
  improvement_rate DECIMAL(5,4),
  last_learning_cycle TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discovered Patterns
CREATE TABLE IF NOT EXISTS public.discovered_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pattern_name TEXT NOT NULL,
  pattern_type TEXT,
  conditions JSONB NOT NULL,
  success_rate DECIMAL(5,4),
  sample_size INTEGER DEFAULT 0,
  confidence_level DECIMAL(5,4),
  is_validated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ
);

-- Winning Patterns
CREATE TABLE IF NOT EXISTS public.winning_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pattern_type TEXT NOT NULL,
  pattern_criteria JSONB NOT NULL,
  win_rate DECIMAL(5,2) NOT NULL,
  sample_size INTEGER NOT NULL,
  avg_profit DECIMAL(15,2),
  avg_pips DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MODULE PERFORMANCE TABLES
-- ============================================================================

-- Module Performance
CREATE TABLE IF NOT EXISTS public.module_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_name TEXT NOT NULL UNIQUE,
  total_signals INTEGER DEFAULT 0,
  winning_signals INTEGER DEFAULT 0,
  losing_signals INTEGER DEFAULT 0,
  win_rate DECIMAL(5,4) DEFAULT 0,
  avg_confidence DECIMAL(5,4),
  sharpe_ratio DECIMAL(10,4),
  total_pnl DECIMAL(15,2) DEFAULT 0,
  last_signal_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Module Health
CREATE TABLE IF NOT EXISTS public.module_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'critical', 'disabled')),
  last_execution TIMESTAMPTZ,
  error_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,4),
  performance_score DECIMAL(5,2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SYSTEM CONFIGURATION TABLES
-- ============================================================================

-- System Health
CREATE TABLE IF NOT EXISTS public.system_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  overall_status TEXT NOT NULL DEFAULT 'healthy',
  active_modules INTEGER DEFAULT 0,
  error_rate DECIMAL(5,4) DEFAULT 0,
  uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
  last_check TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Account Defaults
CREATE TABLE IF NOT EXISTS public.account_defaults (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  default_lot_size DECIMAL(10,2) DEFAULT 0.01,
  default_stop_loss_pips INTEGER DEFAULT 50,
  default_take_profit_pips INTEGER DEFAULT 100,
  risk_percentage DECIMAL(5,2) DEFAULT 2.00,
  max_daily_trades INTEGER DEFAULT 5,
  max_open_positions INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Config
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default system config
INSERT INTO public.system_config (key, value, description) VALUES
  ('min_signal_confidence', '0.65', 'Minimum confidence for trade execution'),
  ('max_open_positions', '5', 'Maximum simultaneous open positions'),
  ('risk_per_trade', '0.02', 'Risk 2% per trade'),
  ('default_stop_loss_pips', '50', 'Default stop loss in pips'),
  ('default_take_profit_pips', '100', 'Default take profit in pips')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- ADAPTIVE THRESHOLDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.adaptive_thresholds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_name TEXT NOT NULL UNIQUE,
  current_threshold DECIMAL(5,4) NOT NULL DEFAULT 0.65,
  min_threshold DECIMAL(5,4) DEFAULT 0.50,
  max_threshold DECIMAL(5,4) DEFAULT 0.90,
  adjustment_rate DECIMAL(5,4) DEFAULT 0.05,
  last_adjusted TIMESTAMPTZ,
  performance_trend TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DIAGNOSTIC TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trade_execution_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID REFERENCES public.shadow_trades(id),
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  success BOOLEAN,
  error_message TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trade_decision_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signal_id UUID,
  decision TEXT NOT NULL CHECK (decision IN ('execute', 'reject', 'defer')),
  decision_reason TEXT,
  confidence_score DECIMAL(5,4),
  contributing_factors JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trading_diagnostics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  check_type TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ANALYSIS MODULE TABLES
-- ============================================================================

-- Elliott Waves
CREATE TABLE IF NOT EXISTS public.elliott_waves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  wave_pattern TEXT,
  current_wave TEXT,
  confidence DECIMAL(5,4),
  projected_target DECIMAL(10,5),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support Resistance
CREATE TABLE IF NOT EXISTS public.support_resistance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  level_type TEXT NOT NULL CHECK (level_type IN ('support', 'resistance')),
  price_level DECIMAL(10,5) NOT NULL,
  strength DECIMAL(5,2),
  touches INTEGER DEFAULT 1,
  timeframe TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_tested TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_support_resistance_symbol ON public.support_resistance(symbol, price_level);

-- Economic Events
CREATE TABLE IF NOT EXISTS public.economic_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name TEXT NOT NULL,
  country TEXT,
  impact TEXT CHECK (impact IN ('low', 'medium', 'high')),
  actual_value DECIMAL(15,4),
  forecast_value DECIMAL(15,4),
  previous_value DECIMAL(15,4),
  event_time TIMESTAMPTZ NOT NULL,
  currency TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_economic_events_time ON public.economic_events(event_time DESC);

-- News Events
CREATE TABLE IF NOT EXISTS public.news_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  headline TEXT NOT NULL,
  source TEXT,
  sentiment_score DECIMAL(5,4),
  relevance_score DECIMAL(5,4),
  symbols TEXT[],
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Correlations
CREATE TABLE IF NOT EXISTS public.correlations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol_pair TEXT NOT NULL,
  correlation_coefficient DECIMAL(5,4) NOT NULL,
  timeframe TEXT,
  sample_size INTEGER,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Calculate Trade PnL
CREATE OR REPLACE FUNCTION public.calculate_trade_pnl(
  p_trade_id UUID,
  p_current_price DECIMAL(10,5)
)
RETURNS TABLE(
  pnl DECIMAL(15,2),
  pips DECIMAL(10,2),
  commission DECIMAL(10,2)
) AS $$
DECLARE
  v_trade RECORD;
  v_pnl DECIMAL(15,2);
  v_pips DECIMAL(10,2);
  v_commission DECIMAL(10,2);
  v_pip_value DECIMAL(10,5);
BEGIN
  -- Get trade details
  SELECT * INTO v_trade
  FROM public.shadow_trades
  WHERE id = p_trade_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trade not found: %', p_trade_id;
  END IF;

  -- Calculate pip value (for EUR/USD standard lot = $10 per pip)
  v_pip_value := v_trade.lot_size * 100000 * 0.0001;

  -- Calculate pips
  IF v_trade.trade_type = 'buy' THEN
    v_pips := (p_current_price - v_trade.entry_price) / 0.00001;
  ELSE
    v_pips := (v_trade.entry_price - p_current_price) / 0.00001;
  END IF;

  -- Calculate PnL
  v_pnl := v_pips * v_pip_value;

  -- Calculate commission ($7 per lot per side = $14 round trip)
  v_commission := v_trade.lot_size * 14;

  RETURN QUERY SELECT v_pnl, v_pips, v_commission;
END;
$$ LANGUAGE plpgsql;

-- Close Shadow Trade
CREATE OR REPLACE FUNCTION public.close_shadow_trade(
  p_trade_id UUID,
  p_close_price DECIMAL(10,5),
  p_close_lot_size DECIMAL(10,2),
  p_close_reason TEXT DEFAULT 'manual'
)
RETURNS JSONB AS $$
DECLARE
  v_trade RECORD;
  v_portfolio RECORD;
  v_pnl DECIMAL(15,2);
  v_pips DECIMAL(10,2);
  v_commission DECIMAL(10,2);
  v_swap DECIMAL(10,2) := 0;
  v_net_profit DECIMAL(15,2);
  v_pip_value DECIMAL(10,5);
  v_is_partial BOOLEAN;
BEGIN
  -- Get trade
  SELECT * INTO v_trade FROM public.shadow_trades WHERE id = p_trade_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trade not found';
  END IF;

  -- Get portfolio
  SELECT * INTO v_portfolio FROM public.shadow_portfolios WHERE id = v_trade.portfolio_id;

  -- Determine if partial close
  v_is_partial := p_close_lot_size < v_trade.lot_size;

  -- Calculate pip value
  v_pip_value := p_close_lot_size * 100000 * 0.0001;

  -- Calculate pips and PnL
  IF v_trade.trade_type = 'buy' THEN
    v_pips := (p_close_price - v_trade.entry_price) / 0.00001;
  ELSE
    v_pips := (v_trade.entry_price - p_close_price) / 0.00001;
  END IF;

  v_pnl := v_pips * v_pip_value;
  v_commission := p_close_lot_size * 14;
  v_net_profit := v_pnl - v_commission - v_swap;

  -- Update trade
  IF v_is_partial THEN
    UPDATE public.shadow_trades
    SET 
      lot_size = lot_size - p_close_lot_size,
      pnl = COALESCE(pnl, 0) + v_net_profit,
      updated_at = NOW()
    WHERE id = p_trade_id;
  ELSE
    UPDATE public.shadow_trades
    SET 
      status = 'closed',
      exit_price = p_close_price,
      exit_time = NOW(),
      exit_reason = p_close_reason,
      pnl = v_net_profit,
      profit_pips = v_pips,
      commission = v_commission,
      swap = v_swap,
      updated_at = NOW()
    WHERE id = p_trade_id;
  END IF;

  -- Insert trade history
  INSERT INTO public.trade_history (
    portfolio_id,
    original_trade_id,
    action_type,
    symbol,
    trade_type,
    lot_size,
    execution_price,
    profit,
    profit_pips,
    commission,
    swap,
    balance_before,
    balance_after,
    equity_before,
    equity_after,
    execution_time
  ) VALUES (
    v_trade.portfolio_id,
    p_trade_id,
    CASE WHEN v_is_partial THEN 'partial_close' ELSE 'close' END,
    v_trade.symbol,
    v_trade.trade_type,
    p_close_lot_size,
    p_close_price,
    v_net_profit,
    v_pips,
    v_commission,
    v_swap,
    v_portfolio.balance,
    v_portfolio.balance + v_net_profit,
    v_portfolio.equity,
    v_portfolio.equity + v_net_profit,
    NOW()
  );

  -- Update portfolio balance
  UPDATE public.shadow_portfolios
  SET 
    balance = balance + v_net_profit,
    equity = equity + v_net_profit,
    updated_at = NOW()
  WHERE id = v_trade.portfolio_id;

  RETURN jsonb_build_object(
    'success', true,
    'pnl', v_net_profit,
    'pips', v_pips,
    'commission', v_commission,
    'is_partial', v_is_partial
  );
END;
$$ LANGUAGE plpgsql;

-- Calculate Global Performance Metrics
CREATE OR REPLACE FUNCTION public.calculate_global_performance_metrics()
RETURNS void AS $$
DECLARE
  v_total_trades INTEGER;
  v_winning_trades INTEGER;
  v_losing_trades INTEGER;
  v_win_rate DECIMAL(5,2);
  v_total_pnl DECIMAL(15,2);
  v_final_balance DECIMAL(15,2);
BEGIN
  -- Get latest balance from trade_history
  SELECT balance_after INTO v_final_balance
  FROM public.trade_history
  WHERE portfolio_id = '00000000-0000-0000-0000-000000000001'
  ORDER BY execution_time DESC
  LIMIT 1;

  IF v_final_balance IS NULL THEN
    v_final_balance := 100000.00;
  END IF;

  -- Count trades
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE profit > 0),
    COUNT(*) FILTER (WHERE profit < 0),
    COALESCE(SUM(profit), 0)
  INTO v_total_trades, v_winning_trades, v_losing_trades, v_total_pnl
  FROM public.trade_history
  WHERE portfolio_id = '00000000-0000-0000-0000-000000000001'
    AND action_type IN ('close', 'partial_close');

  -- Calculate win rate
  v_win_rate := CASE 
    WHEN v_total_trades > 0 THEN (v_winning_trades::DECIMAL / v_total_trades::DECIMAL) * 100
    ELSE 0 
  END;

  -- Update global account
  UPDATE public.global_trading_account
  SET 
    balance = v_final_balance,
    equity = v_final_balance,
    total_trades = v_total_trades,
    winning_trades = v_winning_trades,
    losing_trades = v_losing_trades,
    win_rate = v_win_rate,
    total_pnl = v_total_pnl,
    updated_at = NOW()
  WHERE id = '00000000-0000-0000-0000-000000000001';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Create learning outcome when trade closes
CREATE OR REPLACE FUNCTION public.create_learning_outcome_on_trade_close()
RETURNS TRIGGER AS $$
DECLARE
  v_outcome_type TEXT;
  v_hold_time_minutes INTEGER;
BEGIN
  IF NEW.status = 'closed' AND (OLD.status IS NULL OR OLD.status != 'closed') THEN
    -- Determine outcome type
    v_outcome_type := CASE
      WHEN NEW.pnl > 10 THEN 'win'
      WHEN NEW.pnl < -10 THEN 'loss'
      ELSE 'breakeven'
    END;

    -- Calculate hold time
    v_hold_time_minutes := EXTRACT(EPOCH FROM (NEW.exit_time - NEW.entry_time)) / 60;

    -- Insert learning outcome
    INSERT INTO public.learning_outcomes (
      trade_id,
      signal_id,
      outcome_type,
      pnl,
      pips,
      hold_time_minutes,
      market_conditions,
      signal_quality
    ) VALUES (
      NEW.id,
      NEW.signal_id,
      v_outcome_type,
      NEW.pnl,
      NEW.profit_pips,
      v_hold_time_minutes,
      NEW.metadata,
      '{}'::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_learning_outcome
AFTER UPDATE ON public.shadow_trades
FOR EACH ROW
EXECUTE FUNCTION public.create_learning_outcome_on_trade_close();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE public.shadow_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shadow_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_history ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now - customize based on auth needs)
CREATE POLICY "Allow all access to shadow_portfolios" ON public.shadow_portfolios FOR ALL USING (true);
CREATE POLICY "Allow all access to shadow_trades" ON public.shadow_trades FOR ALL USING (true);
CREATE POLICY "Allow all access to trade_history" ON public.trade_history FOR ALL USING (true);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Create default portfolio
INSERT INTO public.shadow_portfolios (id, name, balance, equity) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Global Portfolio', 100000.00, 100000.00)
ON CONFLICT (id) DO NOTHING;

-- Initialize system learning stats
INSERT INTO public.system_learning_stats (total_lessons, patterns_discovered, adaptations_made, current_accuracy)
VALUES (0, 0, 0, 0.0000)
ON CONFLICT DO NOTHING;

-- Initialize module health for core modules
INSERT INTO public.module_health (module_name, status) VALUES
  ('technical_analysis', 'healthy'),
  ('fundamental_analysis', 'healthy'),
  ('sentiment_analysis', 'healthy'),
  ('quantitative_analysis', 'healthy'),
  ('intermarket_analysis', 'healthy'),
  ('specialized_analysis', 'healthy')
ON CONFLICT (module_name) DO NOTHING;

-- Initialize module performance for core modules
INSERT INTO public.module_performance (module_name) VALUES
  ('technical_analysis'),
  ('fundamental_analysis'),
  ('sentiment_analysis'),
  ('quantitative_analysis'),
  ('intermarket_analysis'),
  ('specialized_analysis')
ON CONFLICT (module_name) DO NOTHING;

-- Initialize adaptive thresholds
INSERT INTO public.adaptive_thresholds (module_name, current_threshold) VALUES
  ('technical_analysis', 0.65),
  ('fundamental_analysis', 0.65),
  ('sentiment_analysis', 0.65),
  ('quantitative_analysis', 0.65),
  ('intermarket_analysis', 0.65),
  ('specialized_analysis', 0.65)
ON CONFLICT (module_name) DO NOTHING;