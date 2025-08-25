import React from 'react';
import NavigationBar from '@/components/NavigationBar';
import RealtimeSystemMonitor from '@/components/RealtimeSystemMonitor';

const SystemMonitor: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <RealtimeSystemMonitor />
    </div>
  );
};

export default SystemMonitor;