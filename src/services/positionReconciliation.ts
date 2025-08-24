export interface PortfolioState {
  id: string;
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  open_positions_count: number;
  max_open_positions: number;
  auto_trading_enabled: boolean;
  is_active: boolean;
}

export interface TradeState {
  id: string;
  portfolio_id: string;
  status: 'open' | 'closed';
  symbol: string;
  trade_type: 'buy' | 'sell';
  position_size: number;
  margin_required: number;
}

export interface ReconciliationResult {
  portfoliosChecked: number;
  inconsistenciesFound: number;
  fixedPortfolios: string[];
  errors: string[];
  ghostPositionsCleared: number;
  marginRecalculated: number;
}

export class PositionReconciliationEngine {
  
  static async reconcilePortfolioStates(supabase: any): Promise<ReconciliationResult> {
    const result: ReconciliationResult = {
      portfoliosChecked: 0,
      inconsistenciesFound: 0,
      fixedPortfolios: [],
      errors: [],
      ghostPositionsCleared: 0,
      marginRecalculated: 0
    };

    try {
      console.log('🔍 Starting portfolio state reconciliation...');

      // Get all active portfolios
      const { data: portfolios, error: portfoliosError } = await supabase
        .from('shadow_portfolios')
        .select('*')
        .eq('is_active', true);

      if (portfoliosError) {
        result.errors.push(`Failed to fetch portfolios: ${portfoliosError.message}`);
        return result;
      }

      result.portfoliosChecked = portfolios?.length || 0;

      for (const portfolio of portfolios || []) {
        try {
          const reconciled = await this.reconcileIndividualPortfolio(supabase, portfolio);
          if (reconciled.hasInconsistencies) {
            result.inconsistenciesFound++;
            result.fixedPortfolios.push(portfolio.id);
            result.ghostPositionsCleared += reconciled.ghostPositionsCleared;
            result.marginRecalculated += reconciled.marginRecalculated ? 1 : 0;
          }
        } catch (error: any) {
          result.errors.push(`Portfolio ${portfolio.id}: ${error.message}`);
        }
      }

      console.log(`✅ Reconciliation complete: ${result.inconsistenciesFound}/${result.portfoliosChecked} portfolios fixed`);
      return result;

    } catch (error: any) {
      result.errors.push(`Reconciliation failed: ${error.message}`);
      return result;
    }
  }

  private static async reconcileIndividualPortfolio(
    supabase: any, 
    portfolio: any
  ): Promise<{
    hasInconsistencies: boolean;
    ghostPositionsCleared: number;
    marginRecalculated: boolean;
  }> {
    
    // Get actual open trades from database
    const { data: openTrades, error: tradesError } = await supabase
      .from('shadow_trades')
      .select('*')
      .eq('portfolio_id', portfolio.id)
      .eq('status', 'open');

    if (tradesError) {
      throw new Error(`Failed to fetch trades: ${tradesError.message}`);
    }

    const actualOpenPositions = openTrades?.length || 0;
    const reportedMargin = parseFloat(portfolio.margin.toString());
    
    // Calculate actual margin requirement
    const actualMargin = openTrades?.reduce((total: number, trade: any) => {
      const positionSize = parseFloat(trade.position_size.toString());
      const marginReq = trade.margin_required || (positionSize * 0.01); // 1% default margin
      return total + marginReq;
    }, 0) || 0;

    let hasInconsistencies = false;
    let ghostPositionsCleared = 0;
    let marginRecalculated = false;

    // Check for ghost positions (portfolio shows open positions but database shows none)
    if (actualOpenPositions === 0 && reportedMargin > 0) {
      console.log(`👻 Clearing ghost positions for portfolio ${portfolio.id.slice(0, 8)}`);
      
      await supabase
        .from('shadow_portfolios')
        .update({
          margin: 0,
          free_margin: portfolio.balance,
          margin_level: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', portfolio.id);

      hasInconsistencies = true;
      ghostPositionsCleared = 1;
      marginRecalculated = true;
    }
    
    // Check for margin calculation inconsistencies
    else if (Math.abs(actualMargin - reportedMargin) > 0.01) {
      console.log(`💰 Recalculating margin for portfolio ${portfolio.id.slice(0, 8)}: ${reportedMargin} → ${actualMargin}`);
      
      const newFreeMargin = parseFloat(portfolio.balance.toString()) - actualMargin;
      const newMarginLevel = actualMargin > 0 ? (parseFloat(portfolio.equity.toString()) / actualMargin) * 100 : 0;

      await supabase
        .from('shadow_portfolios')
        .update({
          margin: actualMargin,
          free_margin: Math.max(0, newFreeMargin),
          margin_level: newMarginLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', portfolio.id);

      hasInconsistencies = true;
      marginRecalculated = true;
    }

    // Check for impossible states
    if (actualOpenPositions > portfolio.max_open_positions) {
      console.log(`⚠️ Portfolio ${portfolio.id.slice(0, 8)} has more positions than max allowed: ${actualOpenPositions} > ${portfolio.max_open_positions}`);
      hasInconsistencies = true;
    }

    return {
      hasInconsistencies,
      ghostPositionsCleared,
      marginRecalculated
    };
  }

  static async validatePortfolioCanTrade(
    supabase: any, 
    portfolioId: string, 
    newPositionMargin: number = 0
  ): Promise<{
    canTrade: boolean;
    reason?: string;
    actualOpenPositions: number;
    maxPositions: number;
    availableMargin: number;
    requiredMargin: number;
  }> {
    
    // Fetch portfolio state
    const { data: portfolio, error: portfolioError } = await supabase
      .from('shadow_portfolios')
      .select('*')
      .eq('id', portfolioId)
      .single();

    if (portfolioError || !portfolio) {
      return {
        canTrade: false,
        reason: 'Portfolio not found',
        actualOpenPositions: 0,
        maxPositions: 0,
        availableMargin: 0,
        requiredMargin: newPositionMargin
      };
    }

    // Get actual open positions
    const { data: openTrades } = await supabase
      .from('shadow_trades')
      .select('id, margin_required, position_size')
      .eq('portfolio_id', portfolioId)
      .eq('status', 'open');

    const actualOpenPositions = openTrades?.length || 0;
    const maxPositions = portfolio.max_open_positions;
    
    // Calculate available margin
    const actualMargin = openTrades?.reduce((total: number, trade: any) => {
      return total + (trade.margin_required || (parseFloat(trade.position_size.toString()) * 0.01));
    }, 0) || 0;
    
    const availableMargin = parseFloat(portfolio.balance.toString()) - actualMargin;

    // Validate position limits
    if (actualOpenPositions >= maxPositions) {
      return {
        canTrade: false,
        reason: `Max positions reached: ${actualOpenPositions}/${maxPositions}`,
        actualOpenPositions,
        maxPositions,
        availableMargin,
        requiredMargin: newPositionMargin
      };
    }

    // Validate margin requirements
    if (newPositionMargin > availableMargin) {
      return {
        canTrade: false,
        reason: `Insufficient margin: need ${newPositionMargin}, available ${availableMargin}`,
        actualOpenPositions,
        maxPositions,
        availableMargin,
        requiredMargin: newPositionMargin
      };
    }

    // Check if auto trading is enabled
    if (!portfolio.auto_trading_enabled) {
      return {
        canTrade: false,
        reason: 'Auto trading disabled',
        actualOpenPositions,
        maxPositions,
        availableMargin,
        requiredMargin: newPositionMargin
      };
    }

    // Check if portfolio is active
    if (!portfolio.is_active) {
      return {
        canTrade: false,
        reason: 'Portfolio inactive',
        actualOpenPositions,
        maxPositions,
        availableMargin,
        requiredMargin: newPositionMargin
      };
    }

    return {
      canTrade: true,
      actualOpenPositions,
      maxPositions,
      availableMargin,
      requiredMargin: newPositionMargin
    };
  }

  static async forcePortfolioReset(supabase: any, portfolioId: string): Promise<boolean> {
    try {
      console.log(`🔄 Force resetting portfolio ${portfolioId.slice(0, 8)}...`);

      // Close all open trades with neutral exit
      const { data: openTrades } = await supabase
        .from('shadow_trades')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('status', 'open');

      if (openTrades?.length) {
        for (const trade of openTrades) {
          await supabase
            .from('shadow_trades')
            .update({
              status: 'closed',
              exit_price: trade.entry_price, // Neutral exit
              exit_time: new Date().toISOString(),
              exit_reason: 'force_reset',
              pnl: 0,
              pnl_percent: 0,
              holding_time_minutes: Math.round((Date.now() - new Date(trade.entry_time).getTime()) / 60000)
            })
            .eq('id', trade.id);
        }
      }

      // Reset portfolio to clean state
      const { data: portfolio } = await supabase
        .from('shadow_portfolios')
        .select('balance')
        .eq('id', portfolioId)
        .single();

      if (portfolio) {
        await supabase
          .from('shadow_portfolios')
          .update({
            margin: 0,
            free_margin: portfolio.balance,
            margin_level: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', portfolioId);
      }

      console.log(`✅ Portfolio ${portfolioId.slice(0, 8)} reset successfully`);
      return true;

    } catch (error: any) {
      console.error(`❌ Failed to reset portfolio ${portfolioId}: ${error.message}`);
      return false;
    }
  }

  static async getPortfolioHealthCheck(supabase: any): Promise<{
    totalPortfolios: number;
    healthyPortfolios: number;
    portfoliosWithIssues: number;
    commonIssues: Array<{ issue: string; count: number }>;
    recommendations: string[];
  }> {
    
    const { data: portfolios } = await supabase
      .from('shadow_portfolios')
      .select('*')
      .eq('is_active', true);

    const issues: Array<{ portfolioId: string; issue: string }> = [];
    let healthyCount = 0;

    for (const portfolio of portfolios || []) {
      const validation = await this.validatePortfolioCanTrade(supabase, portfolio.id);
      const { data: openTrades } = await supabase
        .from('shadow_trades')
        .select('id')
        .eq('portfolio_id', portfolio.id)
        .eq('status', 'open');

      const actualPositions = openTrades?.length || 0;
      const reportedMargin = parseFloat(portfolio.margin.toString());

      // Check for issues
      if (actualPositions === 0 && reportedMargin > 0) {
        issues.push({ portfolioId: portfolio.id, issue: 'ghost_positions' });
      }
      if (actualPositions > portfolio.max_open_positions) {
        issues.push({ portfolioId: portfolio.id, issue: 'position_limit_exceeded' });
      }
      if (!validation.canTrade && validation.reason?.includes('margin')) {
        issues.push({ portfolioId: portfolio.id, issue: 'margin_inconsistency' });
      }
      if (!portfolio.auto_trading_enabled) {
        issues.push({ portfolioId: portfolio.id, issue: 'auto_trading_disabled' });
      }

      if (issues.filter(i => i.portfolioId === portfolio.id).length === 0) {
        healthyCount++;
      }
    }

    const issuesCounts = issues.reduce((acc, { issue }) => {
      acc[issue] = (acc[issue] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonIssues = Object.entries(issuesCounts)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count);

    const recommendations = [];
    if (commonIssues.find(i => i.issue === 'ghost_positions')) {
      recommendations.push('Run position reconciliation to clear ghost positions');
    }
    if (commonIssues.find(i => i.issue === 'margin_inconsistency')) {
      recommendations.push('Recalculate margin requirements for affected portfolios');
    }
    if (commonIssues.find(i => i.issue === 'auto_trading_disabled')) {
      recommendations.push('Review auto-trading settings for disabled portfolios');
    }

    return {
      totalPortfolios: portfolios?.length || 0,
      healthyPortfolios: healthyCount,
      portfoliosWithIssues: (portfolios?.length || 0) - healthyCount,
      commonIssues,
      recommendations
    };
  }
}