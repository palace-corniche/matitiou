-- Create function_execution_locks table for preventing concurrent edge function runs
CREATE TABLE IF NOT EXISTS public.function_execution_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL UNIQUE,
  locked_at timestamp with time zone DEFAULT now(),
  lock_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.function_execution_locks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (edge functions use service role)
CREATE POLICY "Allow all access to function_execution_locks"
  ON public.function_execution_locks
  FOR ALL
  USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_function_execution_locks_name 
  ON public.function_execution_locks(function_name);

-- Add comment
COMMENT ON TABLE public.function_execution_locks IS 'Prevents concurrent executions of edge functions';