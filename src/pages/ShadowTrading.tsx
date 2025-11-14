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
import { useGlobalShadowTrading } from '@/hooks/useGlobalShadowTrading';
import { DataIntegrityMonitor } from '@/components/DataIntegrityMonitor';
import { TradeExecutionMonitor } from '@/components/TradeExecutionMonitor';
import { PriceIntegrityMonitor } from '@/components/PriceIntegrityMonitor';
import { CandleDataStatus } from '@/components/enhanced/CandleDataStatus';
import PnLSystemVerification from '@/components/PnLSystemVerification';
import { CandleDataValidation } from '@/components/CandleDataValidation';
import { Target, ChevronDown } from 'lucide-react';

const ShadowTrading: React.FC = () => {
  const { openTrades } = useGlobalShadowTrading();
  const [monitoringOpen, setMonitoringOpen] = React.useState(false);

  return (
    <>
      <PageHeader 
        title="Shadow Trading"
        description="Virtual portfolio performance tracking with real-time execution monitoring"
        icon={Target}
      />
      <div className="container mx-auto px-6 py-6">
        <Tabs defaultValue="trading" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="trading">Shadow Trading</TabsTrigger>
            <TabsTrigger value="signals">Master Signals</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="trading" className="space-y-6">
            <Collapsible open={monitoringOpen} onOpenChange={setMonitoringOpen}>
              <Card className="p-4">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full flex items-center justify-between p-2">
                    <span className="text-sm font-medium">System Monitoring & Data Quality</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${monitoringOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <div className="grid grid-cols-1 gap-4">
                    <CandleDataValidation />
                    <PnLSystemVerification />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <DataIntegrityMonitor />
                      <TradeExecutionMonitor />
                      <PriceIntegrityMonitor />
                      <CandleDataStatus />
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {openTrades && openTrades.length > 0 && (
              <TradeIntelligenceWidget tradeId={openTrades[0].id} />
            )}
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
    </>
  );
};

export default ShadowTrading;
