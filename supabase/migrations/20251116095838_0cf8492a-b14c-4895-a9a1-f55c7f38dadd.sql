-- Final completion migration - add all remaining columns and tables

-- Add missing columns to shadow_trades
ALTER TABLE public.shadow_trades
ADD COLUMN IF NOT EXISTS intelligence_exit_triggered BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'market';

-- Add missing columns to trading_instruments
ALTER TABLE public.trading_instruments
ADD COLUMN IF NOT EXISTS lot_step DECIMAL(10,2) DEFAULT 0.01,
ADD COLUMN IF NOT EXISTS margin_percentage DECIMAL(5,4);

-- Create pending_orders table
CREATE TABLE IF NOT EXISTS public.pending_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('buy_limit', 'sell_limit', 'buy_stop', 'sell_stop')),
  lot_size DECIMAL(10,2) NOT NULL,
  entry_price DECIMAL(10,5) NOT NULL,
  stop_loss DECIMAL(10,5),
  take_profit DECIMAL(10,5),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'triggered', 'cancelled', 'expired')),
  expiry_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  triggered_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_pending_orders_status ON public.pending_orders(status, created_at DESC);

-- Add missing columns to exit_intelligence
ALTER TABLE public.exit_intelligence
ADD COLUMN IF NOT EXISTS overall_score DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS recommendation TEXT,
ADD COLUMN IF NOT EXISTS factors JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS check_timestamp TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS holding_time_minutes INTEGER;

-- Add missing columns to intelligent_targets  
ALTER TABLE public.intelligent_targets
ADD COLUMN IF NOT EXISTS actual_sl DECIMAL(10,5),
ADD COLUMN IF NOT EXISTS actual_tp DECIMAL(10,5),
ADD COLUMN IF NOT EXISTS entry_price DECIMAL(10,5),
ADD COLUMN IF NOT EXISTS key_levels JSONB DEFAULT '[]'::jsonb;

-- Add missing columns to trade_performance_summary
ALTER TABLE public.trade_performance_summary
ADD COLUMN IF NOT EXISTS win_rate_percent DECIMAL(5,2) GENERATED ALWAYS AS (win_rate) STORED,
ADD COLUMN IF NOT EXISTS avg_win_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS avg_loss_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS total_realized_pnl DECIMAL(15,2) GENERATED ALWAYS AS (total_profit) STORED,
ADD COLUMN IF NOT EXISTS consecutive_wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS consecutive_losses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_consecutive_wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_consecutive_losses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_trade_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS expectancy DECIMAL(15,2);

-- Enable RLS on pending_orders
ALTER TABLE public.pending_orders ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all access to pending_orders" ON public.pending_orders FOR ALL USING (true);