import React from 'react';
import NavigationBar from '@/components/NavigationBar';
import EnhancedSignalAnalyticsDashboard from '@/components/EnhancedSignalAnalyticsDashboard';

const EnhancedSignalAnalytics: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <EnhancedSignalAnalyticsDashboard />
    </div>
  );
};

export default EnhancedSignalAnalytics;