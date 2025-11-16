-- Final batch of missing tables for analysis modules

-- Create pattern_signals table
CREATE TABLE IF NOT EXISTS public.pattern_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  pattern_type TEXT NOT NULL,
  signal_type TEXT CHECK (signal_type IN ('buy', 'sell', 'neutral')),
  confidence DECIMAL(5,4),
  entry_price DECIMAL(10,5),
  stop_loss DECIMAL(10,5),
  take_profit DECIMAL(10,5),
  timeframe TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create market_data_enhanced table (extended market data)
CREATE TABLE IF NOT EXISTS public.market_data_enhanced (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  open_price DECIMAL(10,5),
  high_price DECIMAL(10,5),
  low_price DECIMAL(10,5),
  close_price DECIMAL(10,5),
  volume DECIMAL(15,2),
  atr DECIMAL(10,5),
  rsi DECIMAL(5,2),
  macd DECIMAL(10,5),
  bollinger_upper DECIMAL(10,5),
  bollinger_lower DECIMAL(10,5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(symbol, timestamp)
);

-- Create intelligence_backtests table
CREATE TABLE IF NOT EXISTS public.intelligence_backtests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backtest_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  strategy_config JSONB NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  initial_balance DECIMAL(15,2) DEFAULT 100000,
  final_balance DECIMAL(15,2),
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2),
  profit_factor DECIMAL(10,2),
  sharpe_ratio DECIMAL(10,4),
  max_drawdown DECIMAL(15,2),
  results JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create economic_calendar table (already partially exists as economic_events)
CREATE TABLE IF NOT EXISTS public.economic_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name TEXT NOT NULL,
  event_time TIMESTAMPTZ NOT NULL,
  country TEXT,
  currency TEXT,
  impact TEXT CHECK (impact IN ('low', 'medium', 'high')),
  actual_value DECIMAL(15,4),
  forecast_value DECIMAL(15,4),
  previous_value DECIMAL(15,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add market_data_snapshot column to modular_signals
ALTER TABLE public.modular_signals
ADD COLUMN IF NOT EXISTS market_data_snapshot JSONB DEFAULT '{}'::jsonb;

-- Enable RLS
ALTER TABLE public.pattern_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_backtests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_calendar ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all access to pattern_signals" ON public.pattern_signals FOR ALL USING (true);
CREATE POLICY "Allow all access to market_data_enhanced" ON public.market_data_enhanced FOR ALL USING (true);
CREATE POLICY "Allow all access to intelligence_backtests" ON public.intelligence_backtests FOR ALL USING (true);
CREATE POLICY "Allow all access to economic_calendar" ON public.economic_calendar FOR ALL USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pattern_signals_symbol ON public.pattern_signals(symbol, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_enhanced_symbol_time ON public.market_data_enhanced(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_economic_calendar_time ON public.economic_calendar(event_time DESC);