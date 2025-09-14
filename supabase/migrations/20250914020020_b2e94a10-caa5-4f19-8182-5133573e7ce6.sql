-- Fix missing RLS on trading_instruments table
ALTER TABLE trading_instruments ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for trading_instruments
CREATE POLICY "Anyone can view trading instruments" ON trading_instruments FOR SELECT USING (true);
CREATE POLICY "System can manage trading instruments" ON trading_instruments FOR ALL USING (true);