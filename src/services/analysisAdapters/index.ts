// Analysis Adapters Main Coordinator
import { TechnicalAnalysisAdapter } from './technicalAnalysisAdapter';
import { FundamentalAnalysisAdapter } from './fundamentalAnalysisAdapter';
import { SentimentAnalysisAdapter } from './sentimentAnalysisAdapter';
import { QuantitativeAnalysisAdapter } from './quantitativeAnalysisAdapter';
import { IntermarketAnalysisAdapter } from './intermarketAnalysisAdapter';
import { SpecializedAnalysisAdapter } from './specializedAnalysisAdapter';

export interface AnalysisCoordinatorConfig {
  enabledModules: string[];
  analysisInterval: number; // milliseconds
  symbol: string;
  timeframe: string;
  parallelExecution: boolean;
}

export class AnalysisCoordinator {
  private adapters: Map<string, any> = new Map();
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(private config: AnalysisCoordinatorConfig) {
    this.initializeAdapters();
  }

  private initializeAdapters() {
    this.adapters.set('technical_analysis', new TechnicalAnalysisAdapter());
    this.adapters.set('fundamental_analysis', new FundamentalAnalysisAdapter());
    this.adapters.set('sentiment_analysis', new SentimentAnalysisAdapter());
    this.adapters.set('quantitative_analysis', new QuantitativeAnalysisAdapter());
    this.adapters.set('intermarket_analysis', new IntermarketAnalysisAdapter());
    this.adapters.set('specialized_analysis', new SpecializedAnalysisAdapter());
  }

  async runAnalysis(): Promise<{
    signals: any[];
    timing: { [module: string]: number };
    errors: { [module: string]: string };
  }> {
    const signals: any[] = [];
    const timing: { [module: string]: number } = {};
    const errors: { [module: string]: string } = {};

    const enabledAdapters = this.config.enabledModules
      .map(moduleId => ({ moduleId, adapter: this.adapters.get(moduleId) }))
      .filter(({ adapter }) => adapter);

    if (this.config.parallelExecution) {
      // Run all adapters in parallel
      const promises = enabledAdapters.map(async ({ moduleId, adapter }) => {
        const startTime = Date.now();
        try {
          const signal = await adapter.analyze(this.config.symbol, this.config.timeframe);
          timing[moduleId] = Date.now() - startTime;
          return { moduleId, signal };
        } catch (error) {
          timing[moduleId] = Date.now() - startTime;
          errors[moduleId] = error instanceof Error ? error.message : 'Unknown error';
          return { moduleId, signal: null };
        }
      });

      const results = await Promise.all(promises);
      
      results.forEach(({ moduleId, signal }) => {
        if (signal) {
          signals.push({ ...signal, moduleId });
        }
      });
    } else {
      // Run adapters sequentially
      for (const { moduleId, adapter } of enabledAdapters) {
        const startTime = Date.now();
        try {
          const signal = await adapter.analyze(this.config.symbol, this.config.timeframe);
          timing[moduleId] = Date.now() - startTime;
          
          if (signal) {
            signals.push({ ...signal, moduleId });
          }
        } catch (error) {
          timing[moduleId] = Date.now() - startTime;
          errors[moduleId] = error instanceof Error ? error.message : 'Unknown error';
        }
      }
    }

    return { signals, timing, errors };
  }

  startContinuousAnalysis(callback?: (results: any) => void): void {
    if (this.isRunning) {
      console.log('Analysis already running');
      return;
    }

    this.isRunning = true;
    
    const runCycle = async () => {
      try {
        const results = await this.runAnalysis();
        callback?.(results);
        
        console.log(`Analysis complete: ${results.signals.length} signals generated`);
        console.log('Timing:', results.timing);
        
        if (Object.keys(results.errors).length > 0) {
          console.log('Errors:', results.errors);
        }
      } catch (error) {
        console.error('Analysis cycle error:', error);
      }
    };

    // Run immediately
    runCycle();
    
    // Schedule recurring analysis
    this.intervalId = setInterval(runCycle, this.config.analysisInterval);
  }

  stopContinuousAnalysis(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Analysis stopped');
  }

  updateConfig(newConfig: Partial<AnalysisCoordinatorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.isRunning) {
      this.stopContinuousAnalysis();
      this.startContinuousAnalysis();
    }
  }

  getModuleStatus(): { [module: string]: boolean } {
    const status: { [module: string]: boolean } = {};
    
    this.config.enabledModules.forEach(moduleId => {
      status[moduleId] = this.adapters.has(moduleId);
    });
    
    return status;
  }

  async testModule(moduleId: string): Promise<{ success: boolean; signal?: any; error?: string; timing: number }> {
    const adapter = this.adapters.get(moduleId);
    
    if (!adapter) {
      return { success: false, error: 'Module not found', timing: 0 };
    }

    const startTime = Date.now();
    
    try {
      const signal = await adapter.analyze(this.config.symbol, this.config.timeframe);
      const timing = Date.now() - startTime;
      
      return { success: true, signal, timing };
    } catch (error) {
      const timing = Date.now() - startTime;
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timing 
      };
    }
  }
}

// Export adapters for individual use
export {
  TechnicalAnalysisAdapter,
  FundamentalAnalysisAdapter,
  SentimentAnalysisAdapter,
  QuantitativeAnalysisAdapter,
  IntermarketAnalysisAdapter,
  SpecializedAnalysisAdapter
};

// Default configuration
export const defaultAnalysisConfig: AnalysisCoordinatorConfig = {
  enabledModules: [
    'technical_analysis',
    'fundamental_analysis',
    'sentiment_analysis',
    'quantitative_analysis',
    'intermarket_analysis',
    'specialized_analysis'
  ],
  analysisInterval: 30000, // 30 seconds
  symbol: 'EUR/USD',
  timeframe: '15m',
  parallelExecution: true
};