
-- ============================================
-- COMPREHENSIVE TRADING SYSTEM SCHEMA
-- ============================================

-- 1. Global Trading Account
CREATE TABLE public.global_trading_account (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  balance NUMERIC NOT NULL DEFAULT 100000,
  equity NUMERIC NOT NULL DEFAULT 100000,
  margin NUMERIC NOT NULL DEFAULT 0,
  free_margin NUMERIC NOT NULL DEFAULT 100000,
  used_margin NUMERIC NOT NULL DEFAULT 0,
  margin_level NUMERIC NOT NULL DEFAULT 0,
  floating_pnl NUMERIC NOT NULL DEFAULT 0,
  total_pnl NUMERIC NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  winning_trades INTEGER NOT NULL DEFAULT 0,
  losing_trades INTEGER NOT NULL DEFAULT 0,
  win_rate NUMERIC NOT NULL DEFAULT 0,
  average_win NUMERIC NOT NULL DEFAULT 0,
  average_loss NUMERIC NOT NULL DEFAULT 0,
  profit_factor NUMERIC NOT NULL DEFAULT 0,
  max_drawdown NUMERIC NOT NULL DEFAULT 0,
  sharpe_ratio NUMERIC NOT NULL DEFAULT 0,
  peak_balance NUMERIC NOT NULL DEFAULT 100000,
  max_equity NUMERIC NOT NULL DEFAULT 100000,
  current_drawdown NUMERIC NOT NULL DEFAULT 0,
  consecutive_wins INTEGER NOT NULL DEFAULT 0,
  consecutive_losses INTEGER NOT NULL DEFAULT 0,
  largest_win NUMERIC NOT NULL DEFAULT 0,
  largest_loss NUMERIC NOT NULL DEFAULT 0,
  total_commission NUMERIC NOT NULL DEFAULT 0,
  total_swap NUMERIC NOT NULL DEFAULT 0,
  max_open_positions INTEGER NOT NULL DEFAULT 5,
  auto_trading_enabled BOOLEAN NOT NULL DEFAULT false,
  leverage INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.global_trading_account ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to global_trading_account" ON public.global_trading_account FOR ALL USING (true) WITH CHECK (true);

-- Seed the global account
INSERT INTO public.global_trading_account (id, balance, equity, free_margin, peak_balance, max_equity)
VALUES ('00000000-0000-0000-0000-000000000001', 100000, 100000, 100000, 100000, 100000);

-- 2. Shadow Trades
CREATE TABLE public.shadow_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES public.global_trading_account(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  symbol TEXT NOT NULL DEFAULT 'EUR/USD',
  trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  current_price NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  lot_size NUMERIC NOT NULL DEFAULT 0.01,
  position_size NUMERIC DEFAULT 0,
  contract_size NUMERIC DEFAULT 100000,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  pnl NUMERIC DEFAULT 0,
  profit_pips NUMERIC DEFAULT 0,
  unrealized_pnl NUMERIC DEFAULT 0,
  commission NUMERIC DEFAULT 0,
  swap NUMERIC DEFAULT 0,
  entry_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  exit_time TIMESTAMPTZ,
  exit_reason TEXT,
  comment TEXT,
  order_type TEXT DEFAULT 'market',
  magic_number INTEGER,
  signal_id UUID,
  master_signal_id UUID,
  execution_timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shadow_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to shadow_trades" ON public.shadow_trades FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_shadow_trades_status ON public.shadow_trades(status);
CREATE INDEX idx_shadow_trades_portfolio ON public.shadow_trades(portfolio_id);
CREATE INDEX idx_shadow_trades_created ON public.shadow_trades(created_at DESC);

-- 3. Market Data Feed
CREATE TABLE public.market_data_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  price NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT DEFAULT 'twelve_data',
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE public.market_data_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to market_data_feed" ON public.market_data_feed FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_market_data_symbol_time ON public.market_data_feed(symbol, timestamp DESC);

-- 4. Tick Data
CREATE TABLE public.tick_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL DEFAULT 'EUR/USD',
  bid NUMERIC,
  ask NUMERIC,
  price NUMERIC,
  spread NUMERIC,
  volume NUMERIC DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_type TEXT,
  source TEXT DEFAULT 'api'
);

ALTER TABLE public.tick_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to tick_data" ON public.tick_data FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_tick_data_symbol_time ON public.tick_data(symbol, timestamp DESC);

-- 5. Market Data Enhanced
CREATE TABLE public.market_data_enhanced (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL DEFAULT 'EUR/USD',
  timeframe TEXT NOT NULL,
  open NUMERIC,
  high NUMERIC,
  low NUMERIC,
  close NUMERIC,
  volume NUMERIC DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  indicators JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.market_data_enhanced ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to market_data_enhanced" ON public.market_data_enhanced FOR ALL USING (true) WITH CHECK (true);

-- 6. Aggregated Candles
CREATE TABLE public.aggregated_candles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL DEFAULT 'EUR/USD',
  timeframe TEXT NOT NULL,
  open NUMERIC NOT NULL,
  high NUMERIC NOT NULL,
  low NUMERIC NOT NULL,
  close NUMERIC NOT NULL,
  volume NUMERIC DEFAULT 0,
  tick_count INTEGER DEFAULT 0,
  is_complete BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.aggregated_candles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to aggregated_candles" ON public.aggregated_candles FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_aggregated_candles_lookup ON public.aggregated_candles(symbol, timeframe, timestamp DESC);

-- 7. Modular Signals
CREATE TABLE public.modular_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID,
  module_id TEXT NOT NULL,
  module_version TEXT DEFAULT '2.0.0',
  symbol TEXT NOT NULL DEFAULT 'EUR/USD',
  timeframe TEXT DEFAULT '15m',
  signal_type TEXT CHECK (signal_type IN ('buy', 'sell')),
  confidence NUMERIC DEFAULT 0,
  strength INTEGER DEFAULT 0,
  weight NUMERIC DEFAULT 1,
  trigger_price NUMERIC,
  suggested_entry NUMERIC,
  suggested_stop_loss NUMERIC,
  suggested_take_profit NUMERIC,
  market_data_snapshot JSONB DEFAULT '{}',
  calculation_parameters JSONB DEFAULT '{}',
  market_session TEXT,
  volatility_regime TEXT,
  trend_context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.modular_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to modular_signals" ON public.modular_signals FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_modular_signals_module ON public.modular_signals(module_id, created_at DESC);

-- 8. Master Signals
CREATE TABLE public.master_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID,
  symbol TEXT NOT NULL DEFAULT 'EUR/USD',
  timeframe TEXT DEFAULT '15m',
  signal_type TEXT CHECK (signal_type IN ('buy', 'sell')),
  final_confidence NUMERIC DEFAULT 0,
  final_strength INTEGER DEFAULT 0,
  confluence_score NUMERIC DEFAULT 0,
  recommended_entry NUMERIC,
  recommended_stop_loss NUMERIC,
  recommended_take_profit NUMERIC,
  recommended_lot_size NUMERIC DEFAULT 0.01,
  risk_reward_ratio NUMERIC DEFAULT 0,
  modular_signal_ids UUID[] DEFAULT '{}',
  contributing_modules TEXT[] DEFAULT '{}',
  fusion_algorithm TEXT,
  fusion_parameters JSONB DEFAULT '{}',
  market_data_snapshot JSONB DEFAULT '{}',
  signal_hash TEXT,
  status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  actual_outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.master_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to master_signals" ON public.master_signals FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_master_signals_created ON public.master_signals(created_at DESC);

-- 9. Master Signals Fusion
CREATE TABLE public.master_signals_fusion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  master_signal_id UUID REFERENCES public.master_signals(id),
  fusion_method TEXT,
  input_signals JSONB DEFAULT '[]',
  weights JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  confidence NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.master_signals_fusion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to master_signals_fusion" ON public.master_signals_fusion FOR ALL USING (true) WITH CHECK (true);

-- 10. Module Performance
CREATE TABLE public.module_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id TEXT NOT NULL UNIQUE,
  signals_generated INTEGER DEFAULT 0,
  reliability NUMERIC DEFAULT 0,
  average_confidence NUMERIC DEFAULT 0,
  average_strength NUMERIC DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  total_signals INTEGER DEFAULT 0,
  successful_signals INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.module_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to module_performance" ON public.module_performance FOR ALL USING (true) WITH CHECK (true);

-- 11. Module Health
CREATE TABLE public.module_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_name TEXT NOT NULL,
  module_id TEXT,
  status TEXT DEFAULT 'active',
  health_score NUMERIC DEFAULT 100,
  last_signal_time TIMESTAMPTZ,
  error_count INTEGER DEFAULT 0,
  warning_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.module_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to module_health" ON public.module_health FOR ALL USING (true) WITH CHECK (true);

-- 12. System Health
CREATE TABLE public.system_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  execution_time_ms INTEGER,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  processed_items INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to system_health" ON public.system_health FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_system_health_func ON public.system_health(function_name, created_at DESC);

-- 13. Trading Signals
CREATE TABLE public.trading_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id TEXT,
  symbol TEXT DEFAULT 'EUR/USD',
  signal_type TEXT,
  confidence NUMERIC DEFAULT 0,
  entry_price NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  lot_size NUMERIC DEFAULT 0.01,
  was_executed BOOLEAN DEFAULT false,
  outcome TEXT,
  pnl NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to trading_signals" ON public.trading_signals FOR ALL USING (true) WITH CHECK (true);

-- 14. Signal Rejection Logs
CREATE TABLE public.signal_rejection_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID,
  reason TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.signal_rejection_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to signal_rejection_logs" ON public.signal_rejection_logs FOR ALL USING (true) WITH CHECK (true);

-- 15. Trade Execution Log
CREATE TABLE public.trade_execution_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  execution_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trade_execution_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to trade_execution_log" ON public.trade_execution_log FOR ALL USING (true) WITH CHECK (true);

-- 16. Economic Calendar
CREATE TABLE public.economic_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  country TEXT,
  currency TEXT,
  impact TEXT DEFAULT 'medium',
  event_time TIMESTAMPTZ NOT NULL,
  actual TEXT,
  forecast TEXT,
  previous TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.economic_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to economic_calendar" ON public.economic_calendar FOR ALL USING (true) WITH CHECK (true);

-- 17. COT Reports
CREATE TABLE public.cot_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pair TEXT NOT NULL,
  report_date DATE NOT NULL,
  long_positions NUMERIC DEFAULT 0,
  short_positions NUMERIC DEFAULT 0,
  net_position NUMERIC DEFAULT 0,
  change_long NUMERIC DEFAULT 0,
  change_short NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cot_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cot_reports" ON public.cot_reports FOR ALL USING (true) WITH CHECK (true);

-- 18. Retail Positions
CREATE TABLE public.retail_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  long_percentage NUMERIC DEFAULT 50,
  short_percentage NUMERIC DEFAULT 50,
  source TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.retail_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to retail_positions" ON public.retail_positions FOR ALL USING (true) WITH CHECK (true);

-- 19. News Events
CREATE TABLE public.news_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT,
  headline TEXT NOT NULL,
  source TEXT,
  sentiment NUMERIC DEFAULT 0,
  impact TEXT DEFAULT 'medium',
  url TEXT,
  published_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.news_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to news_events" ON public.news_events FOR ALL USING (true) WITH CHECK (true);

-- 20. Learning Actions
CREATE TABLE public.learning_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL,
  module TEXT,
  description TEXT,
  parameters JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  impact_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to learning_actions" ON public.learning_actions FOR ALL USING (true) WITH CHECK (true);

-- 21. System Learning Stats
CREATE TABLE public.system_learning_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total_adaptations INTEGER DEFAULT 0,
  patterns_discovered INTEGER DEFAULT 0,
  model_accuracy NUMERIC DEFAULT 0,
  learning_rate NUMERIC DEFAULT 0,
  modules_calibrated INTEGER DEFAULT 0,
  last_optimization TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_learning_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to system_learning_stats" ON public.system_learning_stats FOR ALL USING (true) WITH CHECK (true);

-- 22. Discovered Patterns
CREATE TABLE public.discovered_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_type TEXT NOT NULL,
  description TEXT,
  confidence NUMERIC DEFAULT 0,
  frequency INTEGER DEFAULT 0,
  parameters JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.discovered_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to discovered_patterns" ON public.discovered_patterns FOR ALL USING (true) WITH CHECK (true);

-- 23. Exit Intelligence
CREATE TABLE public.exit_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID REFERENCES public.shadow_trades(id),
  overall_score NUMERIC DEFAULT 0,
  recommendation TEXT,
  confidence NUMERIC DEFAULT 0,
  reasoning TEXT,
  factors JSONB DEFAULT '{}',
  holding_time_minutes NUMERIC,
  check_timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exit_intelligence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to exit_intelligence" ON public.exit_intelligence FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_exit_intelligence_trade ON public.exit_intelligence(trade_id, check_timestamp DESC);

-- 24. ML Exit Models
CREATE TABLE public.ml_exit_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_version TEXT NOT NULL,
  model_data JSONB DEFAULT '{}',
  accuracy NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT false,
  training_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ml_exit_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ml_exit_models" ON public.ml_exit_models FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- get_global_trading_account
CREATE OR REPLACE FUNCTION public.get_global_trading_account()
RETURNS SETOF public.global_trading_account
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.global_trading_account
  ORDER BY created_at ASC
  LIMIT 1;
$$;

-- close_shadow_trade
CREATE OR REPLACE FUNCTION public.close_shadow_trade(
  p_trade_id UUID,
  p_close_price NUMERIC,
  p_close_lot_size NUMERIC DEFAULT NULL,
  p_close_reason TEXT DEFAULT 'manual'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade RECORD;
  v_pips NUMERIC;
  v_pnl NUMERIC;
  v_account RECORD;
BEGIN
  -- Get the trade
  SELECT * INTO v_trade FROM public.shadow_trades WHERE id = p_trade_id AND status = 'open';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trade not found or already closed');
  END IF;

  -- Calculate pips
  IF v_trade.trade_type = 'buy' THEN
    v_pips := (p_close_price - v_trade.entry_price) * 10000;
  ELSE
    v_pips := (v_trade.entry_price - p_close_price) * 10000;
  END IF;

  -- Calculate PnL (pips * lot_size * 10 for standard forex)
  v_pnl := v_pips * COALESCE(p_close_lot_size, v_trade.lot_size) * 10;

  -- Update the trade
  UPDATE public.shadow_trades
  SET status = 'closed',
      exit_price = p_close_price,
      exit_time = now(),
      exit_reason = p_close_reason,
      profit_pips = v_pips,
      pnl = v_pnl,
      current_price = p_close_price,
      updated_at = now()
  WHERE id = p_trade_id;

  -- Update the account
  SELECT * INTO v_account FROM public.global_trading_account LIMIT 1;
  
  UPDATE public.global_trading_account
  SET balance = balance + v_pnl,
      equity = equity + v_pnl,
      total_trades = total_trades + 1,
      winning_trades = CASE WHEN v_pnl > 0 THEN winning_trades + 1 ELSE winning_trades END,
      losing_trades = CASE WHEN v_pnl <= 0 THEN losing_trades + 1 ELSE losing_trades END,
      win_rate = CASE WHEN (total_trades + 1) > 0
        THEN (CASE WHEN v_pnl > 0 THEN winning_trades + 1 ELSE winning_trades END)::NUMERIC / (total_trades + 1) * 100
        ELSE 0 END,
      peak_balance = GREATEST(peak_balance, balance + v_pnl),
      largest_win = CASE WHEN v_pnl > largest_win THEN v_pnl ELSE largest_win END,
      largest_loss = CASE WHEN v_pnl < largest_loss THEN v_pnl ELSE largest_loss END,
      updated_at = now()
  WHERE id = v_account.id;

  -- Log execution
  INSERT INTO public.trade_execution_log (trade_id, action, details, execution_timestamp)
  VALUES (p_trade_id, 'close', jsonb_build_object(
    'close_price', p_close_price,
    'pips', v_pips,
    'pnl', v_pnl,
    'reason', p_close_reason
  ), now());

  RETURN jsonb_build_object('success', true, 'pips', v_pips, 'pnl', v_pnl);
END;
$$;

-- calculate_optimal_lot_size
CREATE OR REPLACE FUNCTION public.calculate_optimal_lot_size(
  p_account_balance NUMERIC,
  p_risk_percentage NUMERIC,
  p_stop_loss_pips NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_risk_amount NUMERIC;
  v_lot_size NUMERIC;
BEGIN
  v_risk_amount := p_account_balance * (p_risk_percentage / 100);
  v_lot_size := v_risk_amount / (p_stop_loss_pips * 10);
  RETURN GREATEST(0.01, LEAST(1.0, ROUND(v_lot_size, 2)));
END;
$$;

-- get_ml_performance_analytics
CREATE OR REPLACE FUNCTION public.get_ml_performance_analytics()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_trades', COALESCE(COUNT(*), 0),
    'winning_trades', COALESCE(COUNT(*) FILTER (WHERE pnl > 0), 0),
    'losing_trades', COALESCE(COUNT(*) FILTER (WHERE pnl <= 0), 0),
    'total_pnl', COALESCE(SUM(pnl), 0),
    'avg_pnl', COALESCE(AVG(pnl), 0),
    'win_rate', CASE WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE pnl > 0))::NUMERIC / COUNT(*) * 100 ELSE 0 END
  ) INTO v_result
  FROM public.shadow_trades
  WHERE status = 'closed';

  RETURN v_result;
END;
$$;

-- analyze_trade_performance
CREATE OR REPLACE FUNCTION public.analyze_trade_performance()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'by_session', (
      SELECT jsonb_agg(jsonb_build_object('hour', h, 'trades', cnt, 'avg_pnl', avg_p))
      FROM (
        SELECT EXTRACT(HOUR FROM entry_time) as h, COUNT(*) as cnt, AVG(pnl) as avg_p
        FROM public.shadow_trades WHERE status = 'closed'
        GROUP BY h ORDER BY h
      ) sub
    ),
    'by_direction', jsonb_build_object(
      'buy', (SELECT jsonb_build_object('count', COUNT(*), 'avg_pnl', COALESCE(AVG(pnl),0)) FROM public.shadow_trades WHERE status='closed' AND trade_type='buy'),
      'sell', (SELECT jsonb_build_object('count', COUNT(*), 'avg_pnl', COALESCE(AVG(pnl),0)) FROM public.shadow_trades WHERE status='closed' AND trade_type='sell')
    ),
    'recent_streak', (
      SELECT jsonb_agg(jsonb_build_object('pnl', pnl, 'exit_time', exit_time))
      FROM (SELECT pnl, exit_time FROM public.shadow_trades WHERE status='closed' ORDER BY exit_time DESC LIMIT 10) sub
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- run_trading_diagnostics
CREATE OR REPLACE FUNCTION public.run_trading_diagnostics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'account_status', (SELECT row_to_json(a) FROM (SELECT balance, equity, total_trades, win_rate, auto_trading_enabled FROM public.global_trading_account LIMIT 1) a),
    'open_trades', (SELECT COUNT(*) FROM public.shadow_trades WHERE status = 'open'),
    'closed_trades_24h', (SELECT COUNT(*) FROM public.shadow_trades WHERE status = 'closed' AND exit_time > now() - interval '24 hours'),
    'recent_signals', (SELECT COUNT(*) FROM public.master_signals WHERE created_at > now() - interval '24 hours'),
    'system_health', (SELECT jsonb_agg(jsonb_build_object('function', function_name, 'status', status, 'time', created_at)) FROM (SELECT function_name, status, created_at FROM public.system_health ORDER BY created_at DESC LIMIT 5) sub),
    'data_freshness', jsonb_build_object(
      'market_data', (SELECT MAX(timestamp) FROM public.market_data_feed),
      'tick_data', (SELECT MAX(timestamp) FROM public.tick_data),
      'last_signal', (SELECT MAX(created_at) FROM public.master_signals)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_global_trading_account_updated_at
  BEFORE UPDATE ON public.global_trading_account
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shadow_trades_updated_at
  BEFORE UPDATE ON public.shadow_trades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
