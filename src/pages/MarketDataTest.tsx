import React from 'react';
import NavigationBar from '@/components/NavigationBar';
import { MarketDataTest } from '@/components/enhanced/MarketDataTest';
import { LiveMarketStatus } from '@/components/enhanced/LiveMarketStatus';
import { useShadowTradingUnified } from '@/hooks/useShadowTradingUnified';

const MarketDataTestPage: React.FC = () => {
  const { currentPrice, tickData, isConnected } = useShadowTradingUnified();

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Market Data Implementation Test</h1>
            <p className="text-muted-foreground mt-1">
              Testing the 5-phase real-time market data implementation
            </p>
          </div>

          <LiveMarketStatus 
            currentPrice={currentPrice}
            tickData={tickData}
            isConnected={isConnected}
          />

          <MarketDataTest />
        </div>
      </div>
    </div>
  );
};

export default MarketDataTestPage;