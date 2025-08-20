import { Toaster } from "@/components/ui/sonner";
import NavigationBar from "@/components/NavigationBar";
import { ComprehensiveTradingDashboard } from '@/components/ComprehensiveTradingDashboard';
import { useState, useEffect } from 'react';
import { getForexData, CandleData } from '@/services/realMarketData';
import { useToast } from '@/hooks/use-toast';
import { useAutomationBackup } from '@/hooks/useAutomationBackup';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { manualTrigger } = useAutomationBackup();

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
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 300000);
    
    return () => clearInterval(interval);
  }, [toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading comprehensive trading analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <Toaster />
      <div className="flex items-center justify-end p-4 gap-4">
        <Button 
          onClick={manualTrigger}
          variant="outline"
          size="sm"
          className="bg-primary/10 hover:bg-primary/20"
        >
          🔄 Manual Trigger
        </Button>
      </div>
      <ComprehensiveTradingDashboard data={chartData} pair="EUR/USD" />
    </div>
  );
};

export default Index;