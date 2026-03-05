import React from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ShadowTradingDashboardUnified from '@/components/ShadowTradingDashboardUnified';
import MasterSignalDashboard from '@/components/MasterSignalDashboard';
import SignalOutcomeTracker from '@/components/SignalOutcomeTracker';
import ModulePerformanceTracker from '@/components/ModulePerformanceTracker';
import { TradePerformanceAnalytics } from '@/components/TradePerformanceAnalytics';
import { TradeIntelligenceWidget } from '@/components/enhanced/TradeIntelligenceWidget';
import { ExitIntelligenceDashboard } from '@/components/enhanced/ExitIntelligenceDashboard';
import { useGlobalShadowTrading } from '@/hooks/useGlobalShadowTrading';
import { DataIntegrityMonitor } from '@/components/DataIntegrityMonitor';
import { TradeExecutionMonitor } from '@/components/TradeExecutionMonitor';
import { PriceIntegrityMonitor } from '@/components/PriceIntegrityMonitor';
import { CandleDataStatus } from '@/components/enhanced/CandleDataStatus';
import PnLSystemVerification from '@/components/PnLSystemVerification';
import { CandleDataValidation } from '@/components/CandleDataValidation';
import { Target, ChevronDown, Activity, BarChart3, Cpu, LineChart, Shield } from 'lucide-react';

const ShadowTrading: React.FC = () => {
  const { openTrades } = useGlobalShadowTrading();
  const [monitoringOpen, setMonitoringOpen] = React.useState(false);

  return (
    <>
      <PageHeader 
        title="Shadow Trading"
        description="Virtual portfolio with real-time execution monitoring"
        icon={Target}
      />
      <div className="container mx-auto px-3 py-3 sm:px-6 sm:py-4 space-y-4">
        <Tabs defaultValue="trading" className="space-y-4">
          <TabsList className="inline-flex h-10 w-auto gap-1 bg-muted/60 p-1 rounded-lg">
            <TabsTrigger value="trading" className="text-xs sm:text-sm px-3 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Activity className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Trading</span>
            </TabsTrigger>
            <TabsTrigger value="signals" className="text-xs sm:text-sm px-3 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Signals</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-xs sm:text-sm px-3 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <LineChart className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Performance</span>
            </TabsTrigger>
            <TabsTrigger value="modules" className="text-xs sm:text-sm px-3 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Cpu className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Modules</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm px-3 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="trading" className="space-y-4 mt-0">
            {/* System Monitoring - Collapsed by default */}
            <Collapsible open={monitoringOpen} onOpenChange={setMonitoringOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full flex items-center justify-between px-3 py-2 h-9 bg-muted/40 hover:bg-muted/60 rounded-lg border border-border/50">
                  <span className="text-xs font-medium text-muted-foreground">System Monitoring & Data Quality</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${monitoringOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-1 gap-3">
                  <CandleDataValidation />
                  <PnLSystemVerification />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <DataIntegrityMonitor />
                    <TradeExecutionMonitor />
                    <PriceIntegrityMonitor />
                    <CandleDataStatus />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Exit Intelligence - Compact */}
            <ExitIntelligenceDashboard />

            {/* Trade Intelligence for first open trade */}
            {openTrades && openTrades.length > 0 && (
              <TradeIntelligenceWidget tradeId={openTrades[0].id} />
            )}

            {/* Main Trading Dashboard */}
            <ShadowTradingDashboardUnified />
          </TabsContent>
          
          <TabsContent value="signals" className="mt-0">
            <MasterSignalDashboard />
          </TabsContent>
          
          <TabsContent value="performance" className="mt-0">
            <SignalOutcomeTracker />
          </TabsContent>
          
          <TabsContent value="modules" className="mt-0">
            <ModulePerformanceTracker />
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
