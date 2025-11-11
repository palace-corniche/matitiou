import React from 'react';
import { PageHeader } from '@/components/PageHeader';
import RealtimeSystemMonitor from '@/components/RealtimeSystemMonitor';
import { SystemHealthMonitor } from '@/components/SystemHealthMonitor';
import { Activity } from 'lucide-react';

const SystemMonitor: React.FC = () => {
  return (
    <>
      <PageHeader 
        title="System Monitor"
        description="Real-time system health, performance metrics, and service status monitoring"
        icon={Activity}
      />
      <div className="container mx-auto px-6 py-6 space-y-6">
        <SystemHealthMonitor />
        <RealtimeSystemMonitor />
      </div>
    </>
  );
};

export default SystemMonitor;