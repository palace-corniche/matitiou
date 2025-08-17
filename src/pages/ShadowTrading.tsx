import React, { useState, useEffect } from 'react';
import NavigationBar from '@/components/NavigationBar';
import ShadowTradingDashboard from '@/components/ShadowTradingDashboard';
import { getForexData } from '@/services/realMarketData';
import { CandleData } from '@/services/realMarketData';

const ShadowTrading: React.FC = () => {
  const [marketData, setMarketData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMarketData = async () => {
      try {
        setLoading(true);
        
        // Get latest market data for EUR/USD
        const data = await getForexData('15m');
        if (data.length > 0) {
          const latestCandle = data[data.length - 1];
          setMarketData({
            'EUR/USD': latestCandle.close,
            'EURUSD': latestCandle.close, // Alternative symbol format
          });
        }
      } catch (error) {
        console.error('Error loading market data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMarketData();
    
    // Update market data every minute
    const interval = setInterval(loadMarketData, 60000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <ShadowTradingDashboard marketData={marketData} />
    </div>
  );
};

export default ShadowTrading;