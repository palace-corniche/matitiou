-- Add missing historical_weight column to module_performance
ALTER TABLE module_performance 
ADD COLUMN IF NOT EXISTS historical_weight NUMERIC DEFAULT 1.0;