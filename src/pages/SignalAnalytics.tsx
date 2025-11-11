import React from 'react';
import { PageHeader } from '@/components/PageHeader';
import SignalAnalyticsDashboard from '@/components/SignalAnalyticsDashboard';
import { TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SignalAnalytics: React.FC = () => {
  return (
    <>
      <PageHeader 
        title="Signal Analytics"
        description="Comprehensive signal performance metrics, win rates, and profitability analysis"
        icon={TrendingUp}
      />
      <div className="container mx-auto px-6 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="timeframes">Timeframes</TabsTrigger>
            <TabsTrigger value="modules">Modules</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <SignalAnalyticsDashboard />
          </TabsContent>
          
          <TabsContent value="performance" className="space-y-6">
            <SignalAnalyticsDashboard />
          </TabsContent>
          
          <TabsContent value="timeframes" className="space-y-6">
            <SignalAnalyticsDashboard />
          </TabsContent>
          
          <TabsContent value="modules" className="space-y-6">
            <SignalAnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default SignalAnalytics;