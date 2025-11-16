-- Add harmonic patterns table and final missing columns

-- Create harmonic_prz table
CREATE TABLE IF NOT EXISTS public.harmonic_prz (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  pattern TEXT NOT NULL,
  completion_level DECIMAL(5,4),
  confidence DECIMAL(5,4),
  prz_low DECIMAL(10,5),
  prz_high DECIMAL(10,5),
  timeframe TEXT,
  entry_price DECIMAL(10,5),
  stop_loss DECIMAL(10,5),
  targets JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Add tick_volume to tick_data
ALTER TABLE public.tick_data
ADD COLUMN IF NOT EXISTS tick_volume DECIMAL(15,2);

-- Enable RLS
ALTER TABLE public.harmonic_prz ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all access to harmonic_prz" ON public.harmonic_prz FOR ALL USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_harmonic_prz_symbol ON public.harmonic_prz(symbol, status, created_at DESC);