import React from 'react';
import NavigationBar from '@/components/NavigationBar';
import ShadowTradingDashboardV3 from '@/components/ShadowTradingDashboardV3';

const ShadowTrading: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <div className="container mx-auto px-4 py-6">
        <ShadowTradingDashboardV3 />
      </div>
    </div>
  );
};

export default ShadowTrading;