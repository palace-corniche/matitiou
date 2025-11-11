import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Activity, TrendingUp } from 'lucide-react';
import { ApiHealthMonitor } from '@/components/ApiHealthMonitor';
import { marketIntelligenceEngine, MarketIntelligence } from '@/services/marketIntelligenceEngine';
import { MarketRegimeIndicator } from '@/components/MarketRegimeIndicator';
import { SentimentGauge } from '@/components/SentimentGauge';
import { EconomicSurpriseTracker } from '@/components/EconomicSurpriseTracker';
import { CorrelationMatrix } from '@/components/CorrelationMatrix';
import { CentralBankTracker } from '@/components/CentralBankTracker';
import EnhancedSignalAnalyticsDashboard from '@/components/EnhancedSignalAnalyticsDashboard';
import { Newspaper } from 'lucide-react';

const FundamentalAnalysis: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('EUR/USD');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [marketIntelligence, setMarketIntelligence] = useState<MarketIntelligence | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMarketIntelligence();
  }, [selectedSymbol]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchMarketIntelligence, 60000);
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

  return (
    <>
      <PageHeader 
        title="Fundamental Analysis"
        description="Economic events, news sentiment, and market intelligence for informed trading decisions"
        icon={Newspaper}
      />
      <div className="container mx-auto px-6 py-6">
        <div className="space-y-6">
        <ApiHealthMonitor />
        
        <Tabs defaultValue="intelligence" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="intelligence">Market Intelligence</TabsTrigger>
            <TabsTrigger value="signals">Intelligence Signals</TabsTrigger>
          </TabsList>
          
          <TabsContent value="intelligence" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analysis Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="symbol-select">Trading Pair</Label>
                    <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select trading pair" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR/USD">EUR/USD</SelectItem>
                        <SelectItem value="GBP/USD">GBP/USD</SelectItem>
                        <SelectItem value="USD/JPY">USD/JPY</SelectItem>
                        <SelectItem value="USD/CHF">USD/CHF</SelectItem>
                        <SelectItem value="AUD/USD">AUD/USD</SelectItem>
                        <SelectItem value="USD/CAD">USD/CAD</SelectItem>
                        <SelectItem value="NZD/USD">NZD/USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="auto-refresh" 
                      checked={autoRefresh} 
                      onCheckedChange={setAutoRefresh}
                    />
                    <Label htmlFor="auto-refresh">Auto Refresh</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchMarketIntelligence}
                      disabled={loading}
                    >
                      <Activity className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {loading ? (
              <div className="flex items-center justify-center min-h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-muted-foreground">Loading market intelligence...</span>
              </div>
            ) : marketIntelligence ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <MarketRegimeIndicator regime={marketIntelligence.regime} />
                <SentimentGauge sentiment={marketIntelligence.sentiment} />
                <EconomicSurpriseTracker surprises={marketIntelligence.surprises} />
                <div className="md:col-span-2">
                  <CorrelationMatrix correlations={marketIntelligence.correlations} />
                </div>
                <CentralBankTracker signals={marketIntelligence.centralBankSignals} />
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">No market intelligence data available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="signals" className="space-y-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">Signal analytics will be available in the global trading system.</p>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </>
  );
};

export default FundamentalAnalysis;