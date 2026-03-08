import React from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SystemHealthMonitor } from '@/components/SystemHealthMonitor';
import RealtimeSystemMonitor from '@/components/RealtimeSystemMonitor';
import AutonomousLearningDashboard from '@/components/AutonomousLearningDashboard';
import ModulePerformanceTracker from '@/components/ModulePerformanceTracker';
import { DataIntegrityMonitor } from '@/components/DataIntegrityMonitor';
import { TradeExecutionMonitor } from '@/components/TradeExecutionMonitor';
import { PriceIntegrityMonitor } from '@/components/PriceIntegrityMonitor';
import { CandleDataStatus } from '@/components/enhanced/CandleDataStatus';
import PnLSystemVerification from '@/components/PnLSystemVerification';
import { CandleDataValidation } from '@/components/CandleDataValidation';
import { Activity, Cpu, GraduationCap, Shield } from 'lucide-react';

const SystemHub: React.FC = () => {
  return (
    <>
      <PageHeader
        title="System"
        description="Health monitoring, module performance, autonomous learning, and data integrity"
        icon={Activity}
      />
      <div className="container mx-auto px-3 py-4 sm:px-6 space-y-4">
        <Tabs defaultValue="health" className="space-y-4">
          <TabsList className="inline-flex h-10 w-auto gap-1 bg-muted/60 p-1 rounded-lg">
            <TabsTrigger value="health" className="text-xs sm:text-sm px-3 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Activity className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Health</span>
            </TabsTrigger>
            <TabsTrigger value="modules" className="text-xs sm:text-sm px-3 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Cpu className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Modules</span>
            </TabsTrigger>
            <TabsTrigger value="learning" className="text-xs sm:text-sm px-3 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <GraduationCap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Learning</span>
            </TabsTrigger>
            <TabsTrigger value="integrity" className="text-xs sm:text-sm px-3 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Data Quality</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="space-y-4 mt-0">
            <SystemHealthMonitor />
            <RealtimeSystemMonitor />
          </TabsContent>

          <TabsContent value="modules" className="mt-0">
            <ModulePerformanceTracker />
          </TabsContent>

          <TabsContent value="learning" className="mt-0">
            <AutonomousLearningDashboard />
          </TabsContent>

          <TabsContent value="integrity" className="space-y-4 mt-0">
            <CandleDataValidation />
            <PnLSystemVerification />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DataIntegrityMonitor />
              <TradeExecutionMonitor />
              <PriceIntegrityMonitor />
              <CandleDataStatus />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default SystemHub;
