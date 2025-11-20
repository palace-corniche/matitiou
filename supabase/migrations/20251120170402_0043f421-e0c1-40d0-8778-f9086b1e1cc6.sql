-- Add started_at column to function_execution_locks
ALTER TABLE public.function_execution_locks 
ADD COLUMN IF NOT EXISTS started_at timestamp with time zone DEFAULT now();