import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { unifiedMarketData, UnifiedTick } from '@/services/unifiedMarketData';
import { Globe, Clock, TrendingUp, RefreshCw } from 'lucide-react';

interface APITestResult {
  name: string;
  status: 'success' | 'error' | 'testing';
  price?: number;
  responseTime?: number;
  error?: string;
}

export const MarketDataTest: React.FC = () => {
  const [results, setResults] = useState<APITestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [latestTickData, setLatestTickData] = useState<UnifiedTick | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const testUnifiedMarketData = async () => {
    setTesting(true);
    
    try {
      setResults([{ name: 'Unified Market Data', status: 'testing' }]);
      
      const startTime = Date.now();
      const lastTick = unifiedMarketData.getLastTick();
      const connected = unifiedMarketData.getConnectionStatus();
      const responseTime = Date.now() - startTime;
      
      if (lastTick && connected) {
        setResults([{
          name: 'Unified Market Data (Live)',
          status: 'success',
          price: lastTick.price,
          responseTime
        }]);
        setLatestTickData(lastTick);
      } else if (lastTick) {
        // Has data but not connected - might be fallback data
        setResults([{
          name: 'Unified Market Data (Fallback)',
          status: 'success',
          price: lastTick.price,
          responseTime
        }]);
        setLatestTickData(lastTick);
      } else {
        setResults([{
          name: 'Unified Market Data',
          status: 'error',
          error: 'No tick data available'
        }]);
      }
    } catch (error: any) {
      setResults([{
        name: 'Unified Market Data',
        status: 'error',
        error: error.message
      }]);
    }
    
    setTesting(false);
  };

  const fetchLatestTick = () => {
    const lastTick = unifiedMarketData.getLastTick();
    if (lastTick) {
      setLatestTickData(lastTick);
    } else {
      console.warn('No unified market data tick available');
    }
  };

  useEffect(() => {
    fetchLatestTick();
    
    // Subscribe to unified market data
    const unsubscribe = unifiedMarketData.subscribe({
      onTick: (tick) => {
        setLatestTickData(tick);
      },
      onConnectionChange: (connected) => {
        setIsConnected(connected);
      },
      onError: (error) => {
        console.error('Unified market data error:', error);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Unified Market Data (TwelveData API)</span>
            </div>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? 'LIVE' : 'FALLBACK'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={testUnifiedMarketData} disabled={testing} className="w-full">
              <RefreshCw className={`h-4 w-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
              Test Unified Market Data
            </Button>
            
            <div className="space-y-2">
              {results.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{result.name}</span>
                    <Badge variant={
                      result.status === 'success' ? 'default' : 
                      result.status === 'error' ? 'destructive' : 'secondary'
                    }>
                      {result.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    {result.price && (
                      <div className="font-mono text-sm">
                        EUR/USD {result.price.toFixed(5)}
                      </div>
                    )}
                    {result.responseTime && (
                      <div className="text-xs text-muted-foreground">
                        {result.responseTime}ms
                      </div>
                    )}
                    {result.error && (
                      <div className="text-xs text-red-500">
                        {result.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Live EUR/USD Tick Data</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={fetchLatestTick} variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              Fetch Latest Tick
            </Button>

            {latestTickData && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Price:</span> {latestTickData.price?.toFixed(5)}
                  </div>
                  <div>
                    <span className="font-medium">Data Source:</span> {latestTickData.source}
                  </div>
                  <div>
                    <span className="font-medium">Bid/Ask:</span> {latestTickData.bid?.toFixed(5)}/{latestTickData.ask?.toFixed(5)}
                  </div>
                  <div>
                    <span className="font-medium">Symbol:</span> {latestTickData.symbol}
                  </div>
                  <div>
                    <span className="font-medium">Spread:</span> {latestTickData.spread} pips
                  </div>
                  <div>
                    <span className="font-medium">Connection:</span> {isConnected ? 'Live API' : 'Fallback'}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Timestamp:</span> {new Date(latestTickData.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};