
-- Add unique constraint to prevent multiple running instances of same function
-- First, clean up any stale running locks
UPDATE function_execution_locks
SET status = 'completed', completed_at = NOW()
WHERE status = 'running'
  AND started_at < NOW() - INTERVAL '5 minutes';

-- Create unique partial index to enforce only ONE running instance per function
CREATE UNIQUE INDEX IF NOT EXISTS idx_function_lock_unique_running
ON function_execution_locks (function_name)
WHERE status = 'running';

COMMENT ON INDEX idx_function_lock_unique_running IS 'Ensures only one running instance per function at a time';
