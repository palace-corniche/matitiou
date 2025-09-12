import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
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

  const testAPIs = async () => {
    setTesting(true);
    setResults([]);

    const apis = [
      {
        name: 'Frankfurter',
        url: 'https://api.frankfurter.dev/latest?from=EUR&to=USD',
        parse: (data: any) => data?.rates?.USD
      },
      {
        name: 'ExchangeRate-API',
        url: 'https://api.exchangerate-api.com/v4/latest/EUR',
        parse: (data: any) => data?.rates?.USD
      }
    ];

    for (const api of apis) {
      try {
        setResults(prev => [...prev, { name: api.name, status: 'testing' }]);
        
        const startTime = Date.now();
        const response = await fetch(api.url);
        const data = await response.json();
        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
          const price = api.parse(data);
          if (price) {
            setResults(prev => prev.map(r => 
              r.name === api.name 
                ? { ...r, status: 'success', price, responseTime }
                : r
            ));
          } else {
            setResults(prev => prev.map(r => 
              r.name === api.name 
                ? { ...r, status: 'error', error: 'Invalid response format' }
                : r
            ));
          }
        } else {
          setResults(prev => prev.map(r => 
            r.name === api.name 
              ? { ...r, status: 'error', error: `HTTP ${response.status}` }
              : r
          ));
        }
      } catch (error) {
        setResults(prev => prev.map(r => 
          r.name === api.name 
            ? { ...r, status: 'error', error: error.message }
            : r
        ));
      }
    }
    
    setTesting(false);
  };

  const testTickEngine = async () => {
    try {
      console.log('🧪 Testing real-time tick engine...');
      const { data, error } = await supabase.functions.invoke('real-time-tick-engine');
      
      if (error) {
        console.error('Tick engine error:', error);
      } else {
        console.log('Tick engine response:', data);
        if (data?.tick) {
          setLatestTickData(data.tick);
        }
      }
    } catch (error) {
      console.error('Failed to test tick engine:', error);
    }
  };

  const fetchLatestTick = async () => {
    try {
      const { data, error } = await supabase
        .from('tick_data')
        .select('*')
        .eq('symbol', 'EUR/USD')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching latest tick:', error);
      } else {
        setLatestTickData(data);
      }
    } catch (error) {
      console.error('Failed to fetch latest tick:', error);
    }
  };

  useEffect(() => {
    fetchLatestTick();
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Market Data API Tests</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={testAPIs} disabled={testing} className="w-full">
              <RefreshCw className={`h-4 w-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
              Test Free Market Data APIs
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
            <span>Tick Engine Test</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Button onClick={testTickEngine} variant="outline">
                Generate New Tick
              </Button>
              <Button onClick={fetchLatestTick} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Get Latest Tick
              </Button>
            </div>

            {latestTickData && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Price:</span> {((latestTickData.bid + latestTickData.ask) / 2).toFixed(5)}
                  </div>
                  <div>
                    <span className="font-medium">Data Source:</span> {latestTickData.data_source}
                  </div>
                  <div>
                    <span className="font-medium">Bid/Ask:</span> {latestTickData.bid}/{latestTickData.ask}
                  </div>
                  <div>
                    <span className="font-medium">Session:</span> {latestTickData.session_type}
                  </div>
                  <div>
                    <span className="font-medium">Spread:</span> {((latestTickData.spread || 0) * 10000).toFixed(1)} pips
                  </div>
                  <div>
                    <span className="font-medium">Live:</span> {latestTickData.is_live ? 'Yes' : 'No'}
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