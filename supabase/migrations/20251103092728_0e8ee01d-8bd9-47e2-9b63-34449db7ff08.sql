-- Phase 1: Lower quality threshold from 60 to 40 to unblock trade execution
UPDATE account_defaults 
SET min_signal_quality = 40.0 
WHERE portfolio_id = 'be578374-9a6d-4eec-af7c-a620739431d5';

-- Also update global default if it exists
UPDATE account_defaults 
SET min_signal_quality = 40.0 
WHERE min_signal_quality = 60.0;