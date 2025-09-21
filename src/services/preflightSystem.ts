import { supabase } from '@/integrations/supabase/client';
import Decimal from 'decimal.js';

export interface DataProvider {
  name: string;
  type: 'market_data' | 'news' | 'historical' | 'dom';
  status: 'active' | 'inactive' | 'error' | 'unknown';
  latency: number | null;
  lastUpdate: string | null;
  errorMessage?: string;
}

export interface PreflightReport {
  success: boolean;
  timestamp: string;
  providers: DataProvider[];
  latencyCheck: {
    passed: boolean;
    avgLatency: number;
    maxLatency: number;
  };
  decimalMathCheck: {
    passed: boolean;
    testResults: any[];
  };
  criticalErrors: string[];
  warnings: string[];
}

class PreflightSystem {
  private readonly LATENCY_THRESHOLD = 100; // 100ms threshold
  private readonly DECIMAL_PRECISION = 5; // 5 decimal places for forex

  async runPreflightChecks(): Promise<PreflightReport> {
    console.log('🚀 Starting preflight checks...');
    
    const report: PreflightReport = {
      success: false,
      timestamp: new Date().toISOString(),
      providers: [],
      latencyCheck: { passed: false, avgLatency: 0, maxLatency: 0 },
      decimalMathCheck: { passed: false, testResults: [] },
      criticalErrors: [],
      warnings: []
    };

    try {
      // Phase 1: Check all data providers
      report.providers = await this.checkDataProviders();
      
      // Phase 2: Latency validation
      report.latencyCheck = await this.validateLatency();
      
      // Phase 3: Decimal math verification
      report.decimalMathCheck = this.validateDecimalMath();
      
      // Determine overall success
      const criticalProviders = report.providers.filter(p => 
        p.type === 'market_data' && p.status === 'error'
      );
      
      if (criticalProviders.length > 0) {
        report.criticalErrors.push('Market data provider unavailable - system cannot operate');
      }
      
      if (!report.latencyCheck.passed) {
        report.criticalErrors.push(`Tick latency exceeds threshold: ${report.latencyCheck.avgLatency}ms > ${this.LATENCY_THRESHOLD}ms`);
      }
      
      if (!report.decimalMathCheck.passed) {
        report.criticalErrors.push('Decimal math precision test failed - risk of calculation errors');
      }
      
      report.success = report.criticalErrors.length === 0;
      
      console.log(report.success ? '✅ Preflight checks passed' : '❌ Preflight checks failed');
      return report;
      
    } catch (error) {
      report.criticalErrors.push(`Preflight system error: ${error.message}`);
      console.error('❌ Preflight system error:', error);
      return report;
    }
  }

  private async checkDataProviders(): Promise<DataProvider[]> {
    const providers: DataProvider[] = [];
    
    // Market Data Provider Check
    try {
      const startTime = Date.now();
      const { data: latestTick, error } = await supabase
        .from('tick_data')
        .select('*')
        .eq('symbol', 'EUR/USD')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();
      
      const latency = Date.now() - startTime;
      
      if (error) {
        providers.push({
          name: 'Market Data Engine',
          type: 'market_data',
          status: 'error',
          latency: null,
          lastUpdate: null,
          errorMessage: error.message
        });
      } else {
        const tickAge = Date.now() - new Date(latestTick.timestamp).getTime();
        providers.push({
          name: 'Market Data Engine',
          type: 'market_data',
          status: tickAge < 10000 ? 'active' : 'inactive', // 10 second threshold
          latency,
          lastUpdate: latestTick.timestamp
        });
      }
    } catch (error) {
      providers.push({
        name: 'Market Data Engine',
        type: 'market_data',
        status: 'error',
        latency: null,
        lastUpdate: null,
        errorMessage: error.message
      });
    }

    // Historical Data Provider Check
    try {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('market_data_enhanced')
        .select('*')
        .eq('symbol', 'EUR/USD')
        .order('timestamp', { ascending: false })
        .limit(1);
      
      const latency = Date.now() - startTime;
      
      providers.push({
        name: 'Historical Data Archive',
        type: 'historical',
        status: error ? 'error' : (data.length > 0 ? 'active' : 'inactive'),
        latency,
        lastUpdate: data[0]?.timestamp || null,
        errorMessage: error?.message
      });
    } catch (error) {
      providers.push({
        name: 'Historical Data Archive',
        type: 'historical',
        status: 'error',
        latency: null,
        lastUpdate: null,
        errorMessage: error.message
      });
    }

    // News Provider Check (placeholder - would connect to real news API)
    providers.push({
      name: 'Economic News Feed',
      type: 'news',
      status: 'inactive', // No real news provider implemented
      latency: null,
      lastUpdate: null,
      errorMessage: 'News provider not implemented'
    });

    // DOM Provider Check (placeholder - would connect to real DOM feed)
    providers.push({
      name: 'Depth of Market',
      type: 'dom',
      status: 'inactive', // No real DOM provider implemented
      latency: null,
      lastUpdate: null,
      errorMessage: 'DOM provider not implemented'
    });

    return providers;
  }

  private async validateLatency(): Promise<{ passed: boolean; avgLatency: number; maxLatency: number }> {
    const latencyTests: number[] = [];
    
    // Run 5 latency tests
    for (let i = 0; i < 5; i++) {
      try {
        const startTime = performance.now();
        await supabase
          .from('tick_data')
          .select('timestamp')
          .eq('symbol', 'EUR/USD')
          .limit(1);
        
        const latency = performance.now() - startTime;
        latencyTests.push(latency);
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        latencyTests.push(999); // High latency for errors
      }
    }
    
    const avgLatency = Math.round(latencyTests.reduce((a, b) => a + b, 0) / latencyTests.length);
    const maxLatency = Math.round(Math.max(...latencyTests));
    
    return {
      passed: avgLatency < this.LATENCY_THRESHOLD && maxLatency < this.LATENCY_THRESHOLD * 2,
      avgLatency,
      maxLatency
    };
  }

  private validateDecimalMath(): { passed: boolean; testResults: any[] } {
    const testResults = [];
    let allTestsPassed = true;

    // Test 1: Basic decimal precision
    try {
      const price1 = new Decimal('1.17234');
      const price2 = new Decimal('1.17256');
      const difference = price2.minus(price1);
      const expectedPips = difference.div('0.0001').toNumber();
      
      testResults.push({
        test: 'Pip Calculation',
        input: { price1: '1.17234', price2: '1.17256' },
        expected: 2.2,
        actual: expectedPips,
        passed: Math.abs(expectedPips - 2.2) < 0.001
      });
      
      if (Math.abs(expectedPips - 2.2) >= 0.001) allTestsPassed = false;
    } catch (error) {
      testResults.push({
        test: 'Pip Calculation',
        error: error.message,
        passed: false
      });
      allTestsPassed = false;
    }

    // Test 2: Lot size calculation
    try {
      const lotSize = new Decimal('0.1');
      const pipValue = lotSize.mul(10); // $10 per pip for 1 lot EUR/USD
      const expectedValue = 1;
      
      testResults.push({
        test: 'Lot Size Calculation',
        input: { lotSize: '0.1' },
        expected: 1,
        actual: pipValue.toNumber(),
        passed: pipValue.toNumber() === expectedValue
      });
      
      if (pipValue.toNumber() !== expectedValue) allTestsPassed = false;
    } catch (error) {
      testResults.push({
        test: 'Lot Size Calculation',
        error: error.message,
        passed: false
      });
      allTestsPassed = false;
    }

    // Test 3: P&L calculation with high precision
    try {
      const entryPrice = new Decimal('1.173456');
      const exitPrice = new Decimal('1.174567');
      const lotSize = new Decimal('0.15');
      
      const pipDiff = exitPrice.minus(entryPrice).div('0.0001');
      const pnl = pipDiff.mul(lotSize).mul(10);
      
      testResults.push({
        test: 'High Precision P&L',
        input: { entry: '1.173456', exit: '1.174567', lots: '0.15' },
        pipDiff: pipDiff.toFixed(2),
        pnl: pnl.toFixed(2),
        passed: pnl.toFixed(2) === '16.67'
      });
      
      if (pnl.toFixed(2) !== '16.67') allTestsPassed = false;
    } catch (error) {
      testResults.push({
        test: 'High Precision P&L',
        error: error.message,
        passed: false
      });
      allTestsPassed = false;
    }

    return {
      passed: allTestsPassed,
      testResults
    };
  }

  async triggerGracefulFailure(reason: string): Promise<void> {
    console.error(`🚫 System entering graceful failure mode: ${reason}`);
    
    // Log the failure to system health
    try {
      await supabase.from('system_health').insert({
        function_name: 'preflight_system',
        status: 'error',
        error_message: `Graceful failure: ${reason}`,
        execution_time_ms: 0
      });
    } catch (error) {
      console.error('Failed to log graceful failure:', error);
    }
    
    // Disable auto-trading on global account
    try {
      const { error } = await supabase
        .from('global_trading_account')
        .update({ 
          auto_trading_enabled: false
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');
      
      if (error) {
        console.error('Failed to disable auto-trading:', error);
      } else {
        console.log('✅ Auto-trading disabled system-wide');
      }
    } catch (error) {
      console.error('Failed to disable trading:', error);
    }
    
    // Stop market data engine
    // Note: In a real system, you would send a shutdown signal to the tick engine
    console.log('📴 Market data engine shutdown requested');
  }
}

export const preflightSystem = new PreflightSystem();