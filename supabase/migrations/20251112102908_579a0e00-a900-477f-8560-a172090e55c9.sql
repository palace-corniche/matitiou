
-- Create signal_execution_locks table for preventing concurrent signal execution
CREATE TABLE IF NOT EXISTS public.signal_execution_locks (
  signal_id UUID PRIMARY KEY REFERENCES public.master_signals(id) ON DELETE CASCADE,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_by TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes')
);

-- Create index for efficient cleanup of expired locks
CREATE INDEX IF NOT EXISTS idx_signal_locks_expires 
ON public.signal_execution_locks(expires_at);

-- Enable RLS
ALTER TABLE public.signal_execution_locks ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage locks
CREATE POLICY "Service role can manage signal locks"
ON public.signal_execution_locks
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create cleanup function for expired locks
CREATE OR REPLACE FUNCTION public.cleanup_expired_signal_locks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.signal_execution_locks
  WHERE expires_at < NOW();
END;
$$;

COMMENT ON TABLE public.signal_execution_locks IS 'Prevents concurrent execution of the same signal by multiple function instances';
COMMENT ON FUNCTION public.cleanup_expired_signal_locks IS 'Removes expired signal locks (older than 5 minutes)';
