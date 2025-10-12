interface SourceConfig {
  lastUsed: number;
  requestCount: number;
  cooldownMs: number;
  successCount: number;
  failureCount: number;
}

export class RotationManager {
  private sources: Map<string, SourceConfig>;
  private readonly COOLDOWNS: Record<string, number> = {
    stocktwits: 60000,      // 1 minute
    reddit_direct: 60000,   // 1 minute
    reddit_apify: 300000,   // 5 minutes (rate limited)
    swaggystocks: 120000    // 2 minutes
  };

  constructor() {
    this.sources = new Map();
    this.initializeSources();
  }

  private initializeSources(): void {
    const sourceNames = ['stocktwits', 'reddit_direct', 'reddit_apify', 'swaggystocks'];
    
    for (const name of sourceNames) {
      this.sources.set(name, {
        lastUsed: 0,
        requestCount: 0,
        cooldownMs: this.COOLDOWNS[name] || 60000,
        successCount: 0,
        failureCount: 0
      });
    }
  }

  async canUseSource(sourceName: string): Promise<boolean> {
    const config = this.sources.get(sourceName);
    if (!config) return false;

    const now = Date.now();
    const timeSinceLastUse = now - config.lastUsed;

    // Check if cooldown period has passed
    if (timeSinceLastUse < config.cooldownMs) {
      console.log(`⏳ ${sourceName} in cooldown (${Math.round((config.cooldownMs - timeSinceLastUse) / 1000)}s remaining)`);
      return false;
    }

    // Check failure rate - disable if too many failures
    const totalRequests = config.successCount + config.failureCount;
    if (totalRequests > 10 && config.failureCount / totalRequests > 0.8) {
      console.log(`❌ ${sourceName} disabled due to high failure rate`);
      return false;
    }

    return true;
  }

  async recordUsage(sourceName: string, success: boolean): Promise<void> {
    const config = this.sources.get(sourceName);
    if (!config) return;

    config.lastUsed = Date.now();
    config.requestCount++;

    if (success) {
      config.successCount++;
    } else {
      config.failureCount++;
    }

    this.sources.set(sourceName, config);

    // Log stats periodically
    if (config.requestCount % 10 === 0) {
      const successRate = (config.successCount / config.requestCount * 100).toFixed(1);
      console.log(`📊 ${sourceName} stats: ${config.requestCount} requests, ${successRate}% success`);
    }
  }

  getSourceStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [name, config] of this.sources.entries()) {
      const totalRequests = config.successCount + config.failureCount;
      const successRate = totalRequests > 0 
        ? (config.successCount / totalRequests * 100).toFixed(1) 
        : 'N/A';

      stats[name] = {
        requests: totalRequests,
        successRate: successRate,
        lastUsed: new Date(config.lastUsed).toISOString()
      };
    }

    return stats;
  }
}
