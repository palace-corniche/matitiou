-- Create aggregated_candles table for tick-to-candle aggregation
CREATE TABLE IF NOT EXISTS public.aggregated_candles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL DEFAULT 'EUR/USD',
  timeframe TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  open_price NUMERIC NOT NULL,
  high_price NUMERIC NOT NULL,
  low_price NUMERIC NOT NULL,
  close_price NUMERIC NOT NULL,
  volume INTEGER NOT NULL DEFAULT 0,
  tick_count INTEGER NOT NULL DEFAULT 0,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique index to prevent duplicate candles
CREATE UNIQUE INDEX IF NOT EXISTS idx_aggregated_candles_unique 
ON public.aggregated_candles(symbol, timeframe, timestamp);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_aggregated_candles_lookup 
ON public.aggregated_candles(symbol, timeframe, created_at DESC);

-- Create index for complete candles
CREATE INDEX IF NOT EXISTS idx_aggregated_candles_complete 
ON public.aggregated_candles(symbol, timeframe, is_complete, timestamp DESC);

-- Enable RLS
ALTER TABLE public.aggregated_candles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read aggregated candles
CREATE POLICY "Anyone can view aggregated candles"
ON public.aggregated_candles
FOR SELECT
USING (true);

-- Allow system to insert/update candles
CREATE POLICY "System can manage aggregated candles"
ON public.aggregated_candles
FOR ALL
USING (true)
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.aggregated_candles IS 'OHLC candles aggregated from real-time tick data for various timeframes';