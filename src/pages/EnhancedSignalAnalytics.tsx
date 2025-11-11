import React from 'react';
import { PageHeader } from '@/components/PageHeader';
import EnhancedSignalAnalyticsDashboard from '@/components/EnhancedSignalAnalyticsDashboard';
import { Zap } from 'lucide-react';

const EnhancedSignalAnalytics: React.FC = () => {
  return (
    <>
      <PageHeader 
        title="Enhanced Signal Analytics"
        description="Master signal analysis with advanced diagnostics and performance tracking"
        icon={Zap}
        badge="NEW"
      />
      <div className="container mx-auto px-6 py-6">
        <EnhancedSignalAnalyticsDashboard />
      </div>
    </>
  );
};

export default EnhancedSignalAnalytics;