import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NavigationBar from '@/components/NavigationBar';
import ShadowTradingDashboardUnified from '@/components/ShadowTradingDashboardUnified';
import MasterSignalDashboard from '@/components/MasterSignalDashboard';
import SignalOutcomeTracker from '@/components/SignalOutcomeTracker';
import ModulePerformanceTracker from '@/components/ModulePerformanceTracker';
import TradePerformanceAnalytics from '@/components/TradePerformanceAnalytics';
import TradeExecutionMonitor from '@/components/TradeExecutionMonitor';  // PHASE 3: Pipeline monitor

const ShadowTrading: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="trading" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="trading">Shadow Trading</TabsTrigger>
            <TabsTrigger value="signals">Master Signals</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="trading" className="space-y-6">
            <TradeExecutionMonitor />
            <ShadowTradingDashboardUnified />
          </TabsContent>
          
          <TabsContent value="signals" className="space-y-6">
            <MasterSignalDashboard />
          </TabsContent>
          
          <TabsContent value="performance" className="space-y-6">
            <SignalOutcomeTracker />
          </TabsContent>
          
          <TabsContent value="modules" className="space-y-6">
            <ModulePerformanceTracker />
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-6">
            <TradePerformanceAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ShadowTrading;