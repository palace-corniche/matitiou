-- Fix exit_intelligence.overall_score to support full 0-100 score range
-- Current: NUMERIC(5,4) only allows max 9.9999
-- New: NUMERIC(6,2) allows up to 9999.99

ALTER TABLE exit_intelligence 
  ALTER COLUMN overall_score TYPE NUMERIC(6,2);

COMMENT ON COLUMN exit_intelligence.overall_score IS 'Overall exit intelligence score (0-100 scale)';
