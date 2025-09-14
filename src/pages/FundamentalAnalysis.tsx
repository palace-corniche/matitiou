import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ApiHealthMonitor } from '@/components/ApiHealthMonitor';
import { Activity, TrendingUp } from 'lucide-react';
import { marketIntelligenceEngine, MarketIntelligence } from '@/services/marketIntelligenceEngine';
import { MarketRegimeIndicator } from '@/components/MarketRegimeIndicator';
import { SentimentGauge } from '@/components/SentimentGauge';
import { EconomicSurpriseTracker } from '@/components/EconomicSurpriseTracker';
import { CorrelationMatrix } from '@/components/CorrelationMatrix';
import { CentralBankTracker } from '@/components/CentralBankTracker';

export default function FundamentalAnalysisPage() {
  const [marketIntelligence, setMarketIntelligence] = useState<MarketIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState('EUR/USD');

  useEffect(() => {
    fetchMarketIntelligence();
  }, [selectedSymbol]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchMarketIntelligence, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedSymbol]);

  const fetchMarketIntelligence = async () => {
    try {
      setLoading(true);
      const intelligenceResult = await marketIntelligenceEngine.getMarketIntelligence(selectedSymbol);
      setMarketIntelligence(intelligenceResult);
    } catch (error) {
      console.error('Error fetching market intelligence:', error);
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-muted-foreground">Loading market intelligence...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* API Health Monitor */}
      <div className="mb-6">
        <ApiHealthMonitor refreshInterval={30000} />
      </div>

      {/* Header with Controls */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <TrendingUp className="h-8 w-8" />
              Market Intelligence Dashboard
            </h1>
            <p className="text-muted-foreground">
              Real-time market regime analysis, sentiment tracking, and correlation insights
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select 
              value={selectedSymbol} 
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="EUR/USD">EUR/USD</option>
              <option value="GBP/USD">GBP/USD</option>
              <option value="USD/JPY">USD/JPY</option>
              <option value="AUD/USD">AUD/USD</option>
              <option value="USD/CAD">USD/CAD</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
              {autoRefresh ? 'Live' : 'Paused'}
            </Button>
          </div>
        </div>
      </div>

      {/* Market Intelligence Dashboard */}
      {marketIntelligence && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <MarketRegimeIndicator regime={marketIntelligence.regime} />
          <SentimentGauge sentiment={marketIntelligence.sentiment} />
          <EconomicSurpriseTracker surprises={marketIntelligence.surprises} />
          <div className="md:col-span-2">
            <CorrelationMatrix correlations={marketIntelligence.correlations} />
          </div>
          <CentralBankTracker signals={marketIntelligence.centralBankSignals} />
        </div>
      )}
    </div>
  );
}