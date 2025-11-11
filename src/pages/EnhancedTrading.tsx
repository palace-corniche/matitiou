import React from 'react';
import { PageHeader } from '@/components/PageHeader';
import ShadowTradingDashboardUnified from '@/components/ShadowTradingDashboardUnified';
import { Zap } from 'lucide-react';

const EnhancedTrading: React.FC = () => {
  return (
    <>
      <PageHeader 
        title="Enhanced Trading"
        description="Advanced trading features with intelligent position sizing and risk management"
        icon={Zap}
        badge="PRO"
      />
      <div className="container mx-auto px-6 py-6">
        <ShadowTradingDashboardUnified />
      </div>
    </>
  );
};

export default EnhancedTrading;