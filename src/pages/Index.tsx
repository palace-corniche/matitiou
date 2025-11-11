import { Toaster } from "@/components/ui/sonner";
import { PageHeader } from "@/components/PageHeader";
import { ComprehensiveTradingDashboard } from '@/components/ComprehensiveTradingDashboard';
import { useState, useEffect } from 'react';
import { getForexData, CandleData } from '@/services/realMarketData';
import { useToast } from '@/hooks/use-toast';
import { useAutomationBackup } from '@/hooks/useAutomationBackup';
import { BarChart3 } from 'lucide-react';
const Index = () => {
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    toast
  } = useToast();
  const {
    manualTrigger
  } = useAutomationBackup();
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getForexData('1h');
        setChartData(data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Data Load Failed",
          description: "Failed to load market data for analysis",
          variant: "destructive"
        });
        setLoading(false);
      }
    };
    loadData();
    const interval = setInterval(loadData, 300000);
    return () => clearInterval(interval);
  }, [toast]);
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading comprehensive trading analysis...</p>
        </div>
      </div>;
  }
  return (
    <>
      <PageHeader 
        title="Trading Dashboard"
        description="Real-time market analysis, signals, and comprehensive trading intelligence"
        icon={BarChart3}
      />
      <Toaster />
      <div className="container mx-auto px-6 py-6">
        <ComprehensiveTradingDashboard data={chartData} pair="EUR/USD" />
      </div>
    </>
  );
};
export default Index;