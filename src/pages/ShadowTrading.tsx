import React from 'react';
import { PageHeader } from '@/components/PageHeader';
import ShadowTradingDashboardUnified from '@/components/ShadowTradingDashboardUnified';
import MasterSignalDashboard from '@/components/MasterSignalDashboard';
import SignalOutcomeTracker from '@/components/SignalOutcomeTracker';
import { TradePerformanceAnalytics } from '@/components/TradePerformanceAnalytics';
import { TradeIntelligenceWidget } from '@/components/enhanced/TradeIntelligenceWidget';
import { ExitIntelligenceDashboard } from '@/components/enhanced/ExitIntelligenceDashboard';
import { useGlobalShadowTrading } from '@/hooks/useGlobalShadowTrading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, Activity, BarChart3, LineChart } from 'lucide-react';

const ShadowTrading: React.FC = () => {
  const { openTrades } = useGlobalShadowTrading();

  return (
    <>
      <PageHeader
        title="Trading"
        description="Execute trades, monitor positions, and track performance"
        icon={Target}
      />
      <div className="container mx-auto px-3 py-3 sm:px-6 sm:py-4 space-y-4">
        {/* Exit Intelligence — compact inline status */}
        <ExitIntelligenceDashboard />

        {/* Trade Intelligence for first open trade */}
        {openTrades && openTrades.length > 0 && (
          <TradeIntelligenceWidget tradeId={openTrades[0].id} />
        )}

        {/* Main Trading Dashboard (positions, execution, history all in one) */}
        <ShadowTradingDashboardUnified />

        {/* Secondary tabs for signals & analytics */}
        <Tabs defaultValue="signals" className="space-y-4">
          <TabsList className="inline-flex h-10 w-auto gap-1 bg-muted/60 p-1 rounded-lg">
            <TabsTrigger value="signals" className="text-xs sm:text-sm px-3 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Signals</span>
            </TabsTrigger>
            <TabsTrigger value="outcomes" className="text-xs sm:text-sm px-3 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Activity className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Outcomes</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm px-3 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <LineChart className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signals" className="mt-0">
            <MasterSignalDashboard />
          </TabsContent>

          <TabsContent value="outcomes" className="mt-0">
            <SignalOutcomeTracker />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <TradePerformanceAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default ShadowTrading;
