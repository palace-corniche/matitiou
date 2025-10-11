-- ============================================
-- CRITICAL FIX #2: Global Account Update Trigger (FINAL)
-- ============================================

DROP TRIGGER IF EXISTS update_global_trading_account_metrics ON shadow_trades;
DROP FUNCTION IF EXISTS update_global_trading_account_metrics();

CREATE OR REPLACE FUNCTION update_global_trading_account_metrics()
RETURNS TRIGGER AS $$
DECLARE
  global_account_id uuid := '00000000-0000-0000-0000-000000000001';
  total_profit numeric;
  total_loss numeric;
  total_wins integer;
  total_losses integer;
  new_balance numeric;
  new_equity numeric;
  new_margin numeric;
  new_free_margin numeric;
  new_margin_level numeric;
  unrealized_pnl numeric;
BEGIN
  IF NEW.portfolio_id = global_account_id THEN
    SELECT 
      COALESCE(SUM(CASE WHEN pnl > 0 THEN pnl ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN pnl < 0 THEN ABS(pnl) ELSE 0 END), 0),
      COUNT(CASE WHEN pnl > 0 THEN 1 END),
      COUNT(CASE WHEN pnl < 0 THEN 1 END)
    INTO total_profit, total_loss, total_wins, total_losses
    FROM shadow_trades
    WHERE portfolio_id = global_account_id AND status = 'closed';

    new_balance := 100000.00 + (total_profit - total_loss);

    SELECT COALESCE(SUM(margin_required), 0) INTO new_margin
    FROM shadow_trades WHERE portfolio_id = global_account_id AND status = 'open';

    SELECT COALESCE(SUM(unrealized_pnl), 0) INTO unrealized_pnl
    FROM shadow_trades WHERE portfolio_id = global_account_id AND status = 'open';

    new_equity := new_balance + unrealized_pnl;
    new_free_margin := new_equity - new_margin;
    new_margin_level := CASE WHEN new_margin > 0 THEN (new_equity / new_margin) * 100 ELSE 0 END;

    UPDATE global_trading_account SET 
      balance = new_balance, equity = new_equity, margin = new_margin,
      used_margin = new_margin, free_margin = new_free_margin, margin_level = new_margin_level,
      floating_pnl = unrealized_pnl, total_trades = total_wins + total_losses,
      winning_trades = total_wins, losing_trades = total_losses,
      win_rate = CASE WHEN (total_wins + total_losses) > 0 
                 THEN (total_wins::numeric / (total_wins + total_losses)) * 100 ELSE 0 END,
      largest_win = (SELECT COALESCE(MAX(pnl), 0) FROM shadow_trades 
                     WHERE portfolio_id = global_account_id AND status = 'closed' AND pnl > 0),
      largest_loss = (SELECT COALESCE(MIN(pnl), 0) FROM shadow_trades 
                      WHERE portfolio_id = global_account_id AND status = 'closed' AND pnl < 0),
      average_win = CASE WHEN total_wins > 0 THEN total_profit / total_wins ELSE 0 END,
      average_loss = CASE WHEN total_losses > 0 THEN total_loss / total_losses ELSE 0 END,
      profit_factor = CASE WHEN total_loss > 0 THEN total_profit / total_loss ELSE 0 END,
      updated_at = NOW()
    WHERE id = global_account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_global_trading_account_metrics
  AFTER INSERT OR UPDATE OF status, pnl, unrealized_pnl
  ON shadow_trades FOR EACH ROW
  EXECUTE FUNCTION update_global_trading_account_metrics();

-- ============================================
-- CRITICAL FIX #3: Trade Duplication Prevention
-- ============================================

-- Simpler approach: unique constraint on signal+portfolio for open trades only
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_open_signal_portfolio
ON shadow_trades (signal_id, portfolio_id)
WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_master_signals_status_created
ON master_signals (status, created_at DESC)
WHERE status IN ('pending', 'validated');

CREATE TABLE IF NOT EXISTS trade_execution_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL,
  signal_type text NOT NULL,
  symbol text NOT NULL,
  last_execution_time timestamptz NOT NULL DEFAULT NOW(),
  execution_count integer DEFAULT 1,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup
ON trade_execution_rate_limit (portfolio_id, signal_type, symbol, last_execution_time DESC);

ALTER TABLE trade_execution_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage rate limits"
ON trade_execution_rate_limit FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION cleanup_old_rate_limits() RETURNS void AS $$
BEGIN DELETE FROM trade_execution_rate_limit WHERE created_at < NOW() - INTERVAL '24 hours'; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;