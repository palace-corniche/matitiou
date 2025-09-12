import React from 'react';
import NavigationBar from '@/components/NavigationBar';
import ShadowTradingDashboardUnified from '@/components/ShadowTradingDashboardUnified';

const ShadowTrading: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <div className="container mx-auto px-4 py-6">
        <ShadowTradingDashboardUnified />
      </div>
    </div>
  );
};

export default ShadowTrading;