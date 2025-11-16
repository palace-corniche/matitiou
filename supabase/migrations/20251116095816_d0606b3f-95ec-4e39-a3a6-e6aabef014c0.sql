-- Add intelligence features and final missing elements

-- Add intelligence columns to shadow_trades
ALTER TABLE public.shadow_trades
ADD COLUMN IF NOT EXISTS exit_intelligence_score DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS exit_confidence DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS exit_reasoning TEXT;

-- Create exit_intelligence table
CREATE TABLE IF NOT EXISTS public.exit_intelligence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID REFERENCES public.shadow_trades(id),
  confidence DECIMAL(5,4),
  reasoning TEXT,
  recommended_exit_price DECIMAL(10,5),
  max_favorable_excursion DECIMAL(15,2),
  max_adverse_excursion DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create intelligent_targets table
CREATE TABLE IF NOT EXISTS public.intelligent_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID REFERENCES public.shadow_trades(id),
  confidence DECIMAL(5,4),
  reasoning TEXT,
  recommended_tp1 DECIMAL(10,5),
  recommended_tp2 DECIMAL(10,5),
  recommended_tp3 DECIMAL(10,5),
  recommended_sl DECIMAL(10,5),
  risk_reward_ratio DECIMAL(10,2),
  probability_of_success DECIMAL(5,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trading_instruments table
CREATE TABLE IF NOT EXISTS public.trading_instruments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  instrument_type TEXT NOT NULL,
  pip_size DECIMAL(10,5) NOT NULL,
  typical_spread DECIMAL(10,5),
  contract_size INTEGER DEFAULT 100000,
  margin_requirement DECIMAL(5,4),
  min_lot_size DECIMAL(10,2) DEFAULT 0.01,
  max_lot_size DECIMAL(10,2) DEFAULT 100.0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default EUR/USD instrument
INSERT INTO public.trading_instruments (symbol, display_name, instrument_type, pip_size, typical_spread, contract_size, margin_requirement)
VALUES ('EUR/USD', 'Euro vs US Dollar', 'forex', 0.00001, 0.00015, 100000, 0.01)
ON CONFLICT (symbol) DO NOTHING;

-- Add max_open_positions to global_trading_account
ALTER TABLE public.global_trading_account
ADD COLUMN IF NOT EXISTS max_open_positions INTEGER DEFAULT 5;

-- Create calculate_optimal_lot_size RPC function
CREATE OR REPLACE FUNCTION public.calculate_optimal_lot_size(
  p_account_balance DECIMAL(15,2),
  p_risk_percentage DECIMAL(5,2),
  p_stop_loss_pips INTEGER
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_risk_amount DECIMAL(15,2);
  v_pip_value DECIMAL(15,2);
  v_lot_size DECIMAL(10,2);
BEGIN
  -- Calculate risk amount
  v_risk_amount := p_account_balance * (p_risk_percentage / 100);
  
  -- Calculate pip value for EUR/USD (standard lot = $10 per pip)
  v_pip_value := 10;
  
  -- Calculate lot size
  v_lot_size := v_risk_amount / (p_stop_loss_pips * v_pip_value);
  
  -- Round to 2 decimals
  v_lot_size := ROUND(v_lot_size, 2);
  
  -- Ensure minimum lot size
  IF v_lot_size < 0.01 THEN
    v_lot_size := 0.01;
  END IF;
  
  -- Ensure maximum lot size
  IF v_lot_size > 10.0 THEN
    v_lot_size := 10.0;
  END IF;
  
  RETURN v_lot_size;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable RLS on new tables
ALTER TABLE public.exit_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligent_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_instruments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all access to exit_intelligence" ON public.exit_intelligence FOR ALL USING (true);
CREATE POLICY "Allow all access to intelligent_targets" ON public.intelligent_targets FOR ALL USING (true);
CREATE POLICY "Allow all access to trading_instruments" ON public.trading_instruments FOR ALL USING (true);