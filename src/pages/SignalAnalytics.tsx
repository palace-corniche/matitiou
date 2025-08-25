import React from 'react';
import NavigationBar from '@/components/NavigationBar';
import SignalAnalyticsDashboard from '@/components/SignalAnalyticsDashboard';

const SignalAnalytics: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <SignalAnalyticsDashboard />
    </div>
  );
};

export default SignalAnalytics;