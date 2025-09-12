import React from 'react';
import NavigationBar from '@/components/NavigationBar';
import RealtimeSystemMonitor from '@/components/RealtimeSystemMonitor';
import { SystemHealthMonitor } from '@/components/SystemHealthMonitor';
import { FeatureFlagToggle } from '@/components/FeatureFlagToggle';
import { AcceptanceTestRunner } from '@/components/AcceptanceTestRunner';
import { ProductionMonitor } from '@/components/ProductionMonitor';
import { CalibrationDashboard } from '@/components/CalibrationDashboard';
import { FusionDashboard } from '@/components/FusionDashboard';
import { ReplayValidationDashboard } from '@/components/ReplayValidationDashboard';
import { FusionActiveDashboard } from '@/components/FusionActiveDashboard';

const SystemMonitor: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <div className="container mx-auto p-6 space-y-6">
        <SystemHealthMonitor />
        <CalibrationDashboard />
        <FusionDashboard />
        <ReplayValidationDashboard />
        <FusionActiveDashboard />
        <ProductionMonitor />
        <AcceptanceTestRunner />
        <FeatureFlagToggle />
        <RealtimeSystemMonitor />
      </div>
    </div>
  );
};

export default SystemMonitor;