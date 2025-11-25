-- Enable real-time updates for exit_intelligence table
ALTER TABLE exit_intelligence REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE exit_intelligence;

COMMENT ON TABLE exit_intelligence IS 'Exit intelligence analysis with real-time updates enabled';