import React from 'react';
import { PageHeader } from '@/components/PageHeader';
import SignalAnalyticsDashboard from '@/components/SignalAnalyticsDashboard';
import { TrendingUp } from 'lucide-react';

const SignalAnalytics: React.FC = () => {
  return (
    <>
      <PageHeader 
        title="Signal Analytics"
        description="Performance metrics and analytics for trading signals across all timeframes"
        icon={TrendingUp}
      />
      <div className="container mx-auto px-6 py-6">
        <SignalAnalyticsDashboard />
      </div>
    </>
  );
};

export default SignalAnalytics;