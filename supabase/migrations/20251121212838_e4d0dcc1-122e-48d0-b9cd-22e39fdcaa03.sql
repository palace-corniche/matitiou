-- Add missing updated_at column to master_signals table
ALTER TABLE public.master_signals 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_master_signals_updated_at ON public.master_signals(updated_at);

-- Add comment
COMMENT ON COLUMN public.master_signals.updated_at IS 'Timestamp of last update to the signal record';