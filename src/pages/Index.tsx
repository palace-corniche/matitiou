import { PageHeader } from "@/components/PageHeader";
import { DashboardOverview } from '@/components/DashboardOverview';
import { MoneyBackground } from '@/components/MoneyBackground';
import { BarChart3 } from 'lucide-react';

const Index = () => {
  return (
    <MoneyBackground>
      <PageHeader
        title="Dashboard"
        description="Account overview, latest signals, and trading performance"
        icon={BarChart3}
      />
      <div className="container mx-auto px-3 py-4 sm:px-6">
        <DashboardOverview />
      </div>
    </MoneyBackground>
  );
};

export default Index;
