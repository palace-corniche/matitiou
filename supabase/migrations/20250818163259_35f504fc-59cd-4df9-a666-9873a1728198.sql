-- Create comprehensive shadow trading system tables

-- Shadow portfolios table - stores virtual portfolio state
CREATE TABLE public.shadow_portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  balance DECIMAL(15,2) NOT NULL DEFAULT 100000.00,
  equity DECIMAL(15,2) NOT NULL DEFAULT 100000.00,
  margin DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  free_margin DECIMAL(15,2) NOT NULL DEFAULT 100000.00,
  margin_level DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  total_trades INTEGER NOT NULL DEFAULT 0,
  winning_trades INTEGER NOT NULL DEFAULT 0,
  losing_trades INTEGER NOT NULL DEFAULT 0,
  win_rate DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  average_win DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  average_loss DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  profit_factor DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  max_drawdown DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  sharpe_ratio DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  expectancy DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_trading_enabled BOOLEAN NOT NULL DEFAULT true,
  risk_per_trade DECIMAL(4,3) NOT NULL DEFAULT 0.020,
  max_open_positions INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shadow trades table - stores all virtual trades
CREATE TABLE public.shadow_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.shadow_portfolios(id) ON DELETE CASCADE,
  signal_id UUID,
  symbol TEXT NOT NULL DEFAULT 'EUR/USD',
  trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  entry_price DECIMAL(10,5) NOT NULL,
  entry_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  stop_loss DECIMAL(10,5) NOT NULL,
  take_profit DECIMAL(10,5) NOT NULL,
  position_size DECIMAL(15,2) NOT NULL,
  confluence_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  exit_price DECIMAL(10,5),
  exit_time TIMESTAMP WITH TIME ZONE,
  exit_reason TEXT CHECK (exit_reason IN ('tp', 'sl', 'time', 'manual', 'opposing_signal')),
  pnl DECIMAL(15,2),
  pnl_percent DECIMAL(8,4),
  risk_reward_ratio DECIMAL(6,2),
  holding_time_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trading signals table - stores all confluence signals
CREATE TABLE public.trading_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  signal_id TEXT NOT NULL UNIQUE,
  pair TEXT NOT NULL DEFAULT 'EUR/USD',
  signal_type TEXT NOT NULL CHECK (signal_type IN ('buy', 'sell', 'neutral')),
  confluence_score DECIMAL(5,2) NOT NULL,
  strength INTEGER NOT NULL CHECK (strength >= 1 AND strength <= 10),
  confidence DECIMAL(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  entry_price DECIMAL(10,5) NOT NULL,
  stop_loss DECIMAL(10,5) NOT NULL,
  take_profit DECIMAL(10,5) NOT NULL,
  risk_reward_ratio DECIMAL(6,2) NOT NULL,
  factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT NOT NULL,
  alert_level TEXT NOT NULL DEFAULT 'medium' CHECK (alert_level IN ('low', 'medium', 'high', 'extreme')),
  was_executed BOOLEAN NOT NULL DEFAULT false,
  execution_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Market data feed table - caches real-time market data
CREATE TABLE public.market_data_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL DEFAULT 'EUR/USD',
  timeframe TEXT NOT NULL DEFAULT '15m',
  price DECIMAL(10,5) NOT NULL,
  open_price DECIMAL(10,5) NOT NULL,
  high_price DECIMAL(10,5) NOT NULL,
  low_price DECIMAL(10,5) NOT NULL,
  volume BIGINT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  data_source TEXT NOT NULL DEFAULT 'twelve_data',
  is_live BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- System health monitoring table
CREATE TABLE public.system_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'warning')),
  error_message TEXT,
  processed_items INTEGER DEFAULT 0,
  memory_usage_mb DECIMAL(8,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Performance snapshots table - daily portfolio snapshots
CREATE TABLE public.performance_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.shadow_portfolios(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  equity DECIMAL(15,2) NOT NULL,
  balance DECIMAL(15,2) NOT NULL,
  daily_pnl DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  trades_today INTEGER NOT NULL DEFAULT 0,
  win_rate_today DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  drawdown_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, snapshot_date)
);

-- Enable Row Level Security
ALTER TABLE public.shadow_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shadow_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shadow_portfolios
CREATE POLICY "Users can manage their own portfolios" 
ON public.shadow_portfolios 
FOR ALL 
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR 
  (auth.uid() IS NULL AND session_id IS NOT NULL)
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR 
  (auth.uid() IS NULL AND session_id IS NOT NULL)
);

-- RLS Policies for shadow_trades
CREATE POLICY "Users can view their own trades" 
ON public.shadow_trades 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.shadow_portfolios sp 
    WHERE sp.id = shadow_trades.portfolio_id 
    AND (
      (auth.uid() IS NOT NULL AND sp.user_id = auth.uid()) OR 
      (auth.uid() IS NULL AND sp.session_id IS NOT NULL)
    )
  )
);

CREATE POLICY "System can manage all trades" 
ON public.shadow_trades 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update trades" 
ON public.shadow_trades 
FOR UPDATE 
USING (true);

-- RLS Policies for trading_signals
CREATE POLICY "Users can view their own signals" 
ON public.trading_signals 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR 
  (auth.uid() IS NULL AND session_id IS NOT NULL)
);

CREATE POLICY "System can create signals" 
ON public.trading_signals 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update signals" 
ON public.trading_signals 
FOR UPDATE 
USING (true);

-- RLS Policies for market_data_feed (public read access)
CREATE POLICY "Anyone can read market data" 
ON public.market_data_feed 
FOR SELECT 
USING (true);

CREATE POLICY "System can manage market data" 
ON public.market_data_feed 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update market data" 
ON public.market_data_feed 
FOR UPDATE 
USING (true);

-- RLS Policies for system_health (admin/system access)
CREATE POLICY "System can manage health data" 
ON public.system_health 
FOR ALL 
USING (true);

-- RLS Policies for performance_snapshots
CREATE POLICY "Users can view their own performance" 
ON public.performance_snapshots 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.shadow_portfolios sp 
    WHERE sp.id = performance_snapshots.portfolio_id 
    AND (
      (auth.uid() IS NOT NULL AND sp.user_id = auth.uid()) OR 
      (auth.uid() IS NULL AND sp.session_id IS NOT NULL)
    )
  )
);

CREATE POLICY "System can manage performance data" 
ON public.performance_snapshots 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update performance data" 
ON public.performance_snapshots 
FOR UPDATE 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_shadow_portfolios_user_id ON public.shadow_portfolios(user_id);
CREATE INDEX idx_shadow_portfolios_session_id ON public.shadow_portfolios(session_id);
CREATE INDEX idx_shadow_portfolios_active ON public.shadow_portfolios(is_active);

CREATE INDEX idx_shadow_trades_portfolio_id ON public.shadow_trades(portfolio_id);
CREATE INDEX idx_shadow_trades_status ON public.shadow_trades(status);
CREATE INDEX idx_shadow_trades_symbol ON public.shadow_trades(symbol);
CREATE INDEX idx_shadow_trades_entry_time ON public.shadow_trades(entry_time);

CREATE INDEX idx_trading_signals_user_id ON public.trading_signals(user_id);
CREATE INDEX idx_trading_signals_session_id ON public.trading_signals(session_id);
CREATE INDEX idx_trading_signals_signal_id ON public.trading_signals(signal_id);
CREATE INDEX idx_trading_signals_created_at ON public.trading_signals(created_at);
CREATE INDEX idx_trading_signals_executed ON public.trading_signals(was_executed);

CREATE INDEX idx_market_data_symbol_time ON public.market_data_feed(symbol, timestamp);
CREATE INDEX idx_market_data_timeframe ON public.market_data_feed(timeframe);
CREATE INDEX idx_market_data_live ON public.market_data_feed(is_live);

CREATE INDEX idx_system_health_function ON public.system_health(function_name);
CREATE INDEX idx_system_health_created_at ON public.system_health(created_at);

CREATE INDEX idx_performance_snapshots_portfolio_date ON public.performance_snapshots(portfolio_id, snapshot_date);

-- Create updated_at triggers
CREATE TRIGGER update_shadow_portfolios_updated_at
  BEFORE UPDATE ON public.shadow_portfolios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shadow_trades_updated_at
  BEFORE UPDATE ON public.shadow_trades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trading_signals_updated_at
  BEFORE UPDATE ON public.trading_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();