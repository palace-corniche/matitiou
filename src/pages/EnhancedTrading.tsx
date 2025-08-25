import React from 'react';
import NavigationBar from '@/components/NavigationBar';
import EnhancedTradingDashboard from '@/components/EnhancedTradingDashboard';

const EnhancedTrading: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <EnhancedTradingDashboard />
    </div>
  );
};

export default EnhancedTrading;