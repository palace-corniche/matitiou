import { supabase } from '@/integrations/supabase/client';
import { shadowTradingEngine, VirtualPortfolio } from '@/services/shadowTradingEngine';

export interface MigrationResult {
  success: boolean;
  portfolioMigrated: boolean;
  tradesMigrated: number;
  errors: string[];
}

export const migrateShadowTradingData = async (): Promise<MigrationResult> => {
  const result: MigrationResult = {
    success: false,
    portfolioMigrated: false,
    tradesMigrated: 0,
    errors: []
  };

  try {
    console.log('🚀 Starting shadow trading data migration...');
    
    // Get localStorage data
    const localPortfolio = shadowTradingEngine.getPortfolio();
    
    if (!localPortfolio || localPortfolio.totalTrades === 0) {
      result.errors.push('No local portfolio data found or no trades to migrate');
      return result;
    }

    // Get or create session ID
    let sessionId = localStorage.getItem('shadow_trading_session_id');
    if (!sessionId) {
      sessionId = `migrated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('shadow_trading_session_id', sessionId);
    }

    // Check if portfolio already exists
    const { data: existingPortfolio } = await supabase
      .from('shadow_portfolios')
      .select('id')
      .eq('session_id', sessionId)
      .single();

    let portfolioId: string;

    if (existingPortfolio) {
      portfolioId = existingPortfolio.id;
      console.log('📊 Using existing portfolio:', portfolioId);
    } else {
      // Create new portfolio with migrated data
      const { data: newPortfolio, error: portfolioError } = await supabase
        .from('shadow_portfolios')
        .insert({
          session_id: sessionId,
          balance: localPortfolio.balance,
          equity: localPortfolio.equity,
          margin: localPortfolio.margin,
          free_margin: localPortfolio.freeMargin,
          margin_level: localPortfolio.marginLevel,
          total_trades: localPortfolio.totalTrades,
          winning_trades: localPortfolio.winningTrades,
          losing_trades: localPortfolio.losingTrades,
          win_rate: localPortfolio.winRate,
          average_win: localPortfolio.averageWin,
          average_loss: localPortfolio.averageLoss,
          profit_factor: localPortfolio.profitFactor,
          max_drawdown: localPortfolio.maxDrawdown,
          sharpe_ratio: localPortfolio.sharpeRatio,
          expectancy: localPortfolio.expectancy,
          auto_trading_enabled: true,
          is_active: true
        })
        .select('id')
        .single();

      if (portfolioError) {
        result.errors.push(`Failed to create portfolio: ${portfolioError.message}`);
        return result;
      }

      portfolioId = newPortfolio.id;
      result.portfolioMigrated = true;
      console.log('✅ Portfolio migrated successfully');
    }

    // Migrate trades
    const allTrades = [...localPortfolio.openTrades, ...localPortfolio.closedTrades];
    
    if (allTrades.length > 0) {
      console.log(`📈 Migrating ${allTrades.length} trades...`);

      // Check for existing trades to avoid duplicates
      const { data: existingTrades } = await supabase
        .from('shadow_trades')
        .select('id')
        .eq('portfolio_id', portfolioId);

      const existingTradeCount = existingTrades?.length || 0;

      if (existingTradeCount === 0) {
        // Convert trades to database format
        const tradesToMigrate = allTrades.map(trade => ({
          portfolio_id: portfolioId,
          signal_id: trade.signalId,
          symbol: trade.symbol,
          trade_type: trade.type,
          entry_price: trade.entryPrice,
          entry_time: new Date(trade.entryTime).toISOString(),
          stop_loss: trade.stopLoss,
          take_profit: trade.takeProfit,
          position_size: trade.positionSize,
          confluence_score: trade.confluenceScore,
          status: trade.status,
          exit_price: trade.exitPrice,
          exit_time: trade.exitTime ? new Date(trade.exitTime).toISOString() : null,
          exit_reason: trade.exitReason,
          pnl: trade.pnl,
          pnl_percent: trade.pnlPercent,
          risk_reward_ratio: trade.riskRewardRatio,
          holding_time_minutes: trade.holdingTimeMinutes,
          created_at: new Date(trade.entryTime).toISOString(),
          updated_at: trade.exitTime ? new Date(trade.exitTime).toISOString() : new Date(trade.entryTime).toISOString()
        }));

        // Insert trades in batches of 100
        const batchSize = 100;
        let migratedCount = 0;

        for (let i = 0; i < tradesToMigrate.length; i += batchSize) {
          const batch = tradesToMigrate.slice(i, i + batchSize);
          
          const { error: tradesError } = await supabase
            .from('shadow_trades')
            .insert(batch);

          if (tradesError) {
            result.errors.push(`Failed to migrate trades batch ${i / batchSize + 1}: ${tradesError.message}`);
          } else {
            migratedCount += batch.length;
            console.log(`✅ Migrated batch ${i / batchSize + 1}: ${batch.length} trades`);
          }
        }

        result.tradesMigrated = migratedCount;
      } else {
        console.log(`⚠️ ${existingTradeCount} trades already exist in database, skipping migration`);
        result.tradesMigrated = existingTradeCount;
      }
    }

    // Create performance snapshot if we have data
    if (localPortfolio.totalTrades > 0) {
      const today = new Date().toISOString().split('T')[0];
      
      const { error: snapshotError } = await supabase
        .from('performance_snapshots')
        .upsert({
          portfolio_id: portfolioId,
          snapshot_date: today,
          equity: localPortfolio.equity,
          balance: localPortfolio.balance,
          daily_pnl: 0, // Cannot calculate historical daily P&L
          trades_today: 0,
          win_rate_today: 0,
          drawdown_percent: localPortfolio.maxDrawdown
        }, {
          onConflict: 'portfolio_id,snapshot_date'
        });

      if (snapshotError) {
        result.errors.push(`Failed to create performance snapshot: ${snapshotError.message}`);
      }
    }

    result.success = result.errors.length === 0 || (result.portfolioMigrated && result.tradesMigrated > 0);

    if (result.success) {
      console.log('🎉 Migration completed successfully!');
      console.log(`📊 Portfolio: ${result.portfolioMigrated ? 'Migrated' : 'Existing'}`);
      console.log(`📈 Trades: ${result.tradesMigrated} migrated/existing`);
      
      // Mark migration as completed
      localStorage.setItem('shadow_trading_migrated', 'true');
      localStorage.setItem('shadow_trading_migration_date', new Date().toISOString());
    }

    return result;

  } catch (error) {
    console.error('❌ Migration error:', error);
    result.errors.push(`Migration failed: ${error.message}`);
    result.success = false;
    return result;
  }
};

export const checkMigrationStatus = (): { 
  isCompleted: boolean; 
  migrationDate?: string; 
  hasLocalData: boolean;
} => {
  const isCompleted = localStorage.getItem('shadow_trading_migrated') === 'true';
  const migrationDate = localStorage.getItem('shadow_trading_migration_date');
  
  // Check if there's any local data to migrate
  const localPortfolio = shadowTradingEngine.getPortfolio();
  const hasLocalData = localPortfolio && localPortfolio.totalTrades > 0;

  return {
    isCompleted,
    migrationDate: migrationDate || undefined,
    hasLocalData: !!hasLocalData
  };
};

export const clearMigrationFlag = () => {
  localStorage.removeItem('shadow_trading_migrated');
  localStorage.removeItem('shadow_trading_migration_date');
};