-- Create function execution locks table to prevent concurrent runs
CREATE TABLE IF NOT EXISTS public.function_execution_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_function_locks_running 
ON public.function_execution_locks(function_name, status, started_at) 
WHERE status = 'running';

-- Create signal execution attempts tracking table for observability
CREATE TABLE IF NOT EXISTS public.signal_execution_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID NOT NULL REFERENCES public.master_signals(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL,
  lock_acquired BOOLEAN NOT NULL,
  execution_stage TEXT,
  failure_reason TEXT,
  market_price NUMERIC(10, 5),
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signal_execution_attempts_signal 
ON public.signal_execution_attempts(signal_id, attempted_at DESC);

-- Add processing timeout counter to master_signals
ALTER TABLE public.master_signals 
ADD COLUMN IF NOT EXISTS processing_timeout_count INT DEFAULT 0;

ALTER TABLE public.master_signals 
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE public.function_execution_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_execution_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies for read access
CREATE POLICY "Allow read access to function_execution_locks"
  ON public.function_execution_locks FOR SELECT
  USING (true);

CREATE POLICY "Allow read access to signal_execution_attempts"
  ON public.signal_execution_attempts FOR SELECT
  USING (true);

-- Reset stuck signals to pending (quick fix)
UPDATE public.master_signals
SET status = 'pending', updated_at = NOW()
WHERE status = 'processing' 
  AND updated_at < NOW() - INTERVAL '2 minutes';