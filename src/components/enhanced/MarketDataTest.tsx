import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { tradingViewFeed } from '@/services/tradingViewFeed';
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
  const [latestTickData, setLatestTickData] = useState<any>(null);
  const [tvConnected, setTvConnected] = useState(false);

  const testTradingViewFeed = async () => {
    setTesting(true);
    
    try {
      setResults([{ name: 'TradingView WebSocket', status: 'testing' }]);
      
      const startTime = Date.now();
      const lastTick = tradingViewFeed.getLastTick();
      const isConnected = tradingViewFeed.getConnectionStatus();
      const responseTime = Date.now() - startTime;
      
      if (lastTick && isConnected) {
        setResults([{
          name: 'TradingView WebSocket',
          status: 'success',
          price: lastTick.price,
          responseTime
        }]);
        setLatestTickData(lastTick);
      } else if (lastTick) {
        // Has data but not connected - might be mock data
        setResults([{
          name: 'TradingView WebSocket (Mock)',
          status: 'success',
          price: lastTick.price,
          responseTime
        }]);
        setLatestTickData(lastTick);
      } else {
        setResults([{
          name: 'TradingView WebSocket',
          status: 'error',
          error: 'No tick data available'
        }]);
      }
    } catch (error) {
      setResults([{
        name: 'TradingView WebSocket',
        status: 'error',
        error: error.message
      }]);
    }
    
    setTesting(false);
  };

  const fetchLatestTick = () => {
    const lastTick = tradingViewFeed.getLastTick();
    if (lastTick) {
      setLatestTickData(lastTick);
    } else {
      console.warn('No TradingView tick data available');
    }
  };

  useEffect(() => {
    fetchLatestTick();
    
    // Subscribe to TradingView connection status
    const unsubscribe = tradingViewFeed.subscribe({
      onTick: (tick) => {
        setLatestTickData(tick);
      },
      onConnectionChange: (connected) => {
        setTvConnected(connected);
      },
      onError: (error) => {
        console.error('TradingView feed error:', error);
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
              <span>FOREX.com TradingView Feed</span>
            </div>
            <Badge variant={tvConnected ? 'default' : 'secondary'}>
              {tvConnected ? 'LIVE' : 'MOCK'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={testTradingViewFeed} disabled={testing} className="w-full">
              <RefreshCw className={`h-4 w-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
              Test FOREX.com WebSocket
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
            <span>TradingView Tick Data</span>
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
                    <span className="font-medium">Data Source:</span> TradingView
                  </div>
                  <div>
                    <span className="font-medium">Bid/Ask:</span> {latestTickData.bid?.toFixed(5)}/{latestTickData.ask?.toFixed(5)}
                  </div>
                  <div>
                    <span className="font-medium">Symbol:</span> {latestTickData.symbol}
                  </div>
                  <div>
                    <span className="font-medium">Spread:</span> {(((latestTickData.ask - latestTickData.bid) || 0) * 10000).toFixed(1)} pips
                  </div>
                  <div>
                    <span className="font-medium">Connection:</span> {tvConnected ? 'Live' : 'Mock'}
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