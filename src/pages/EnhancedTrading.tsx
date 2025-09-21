import React from 'react';
import NavigationBar from '@/components/NavigationBar';
import ShadowTradingDashboardUnified from '@/components/ShadowTradingDashboardUnified';

const EnhancedTrading: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <ShadowTradingDashboardUnified />
    </div>
  );
};

export default EnhancedTrading;