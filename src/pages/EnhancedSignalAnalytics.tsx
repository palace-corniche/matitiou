import React from 'react';
import { PageHeader } from '@/components/PageHeader';
import EnhancedSignalAnalyticsDashboard from '@/components/EnhancedSignalAnalyticsDashboard';
import { Zap, Activity, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const EnhancedSignalAnalytics: React.FC = () => {
  return (
    <>
      <PageHeader 
        title="Enhanced Signal Analytics"
        description="Master signal fusion analysis with real-time diagnostics, confluence scoring, and AI-powered insights"
        icon={Zap}
        badge="NEW"
      />
      <div className="container mx-auto px-6 py-6">
        <Tabs defaultValue="master" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="master">Master Signals</TabsTrigger>
            <TabsTrigger value="confluence">Confluence</TabsTrigger>
            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
            <TabsTrigger value="realtime">Real-Time</TabsTrigger>
            <TabsTrigger value="ai">AI Insights</TabsTrigger>
          </TabsList>
          
          <TabsContent value="master" className="space-y-6">
            <EnhancedSignalAnalyticsDashboard />
          </TabsContent>
          
          <TabsContent value="confluence" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Confluence Scoring & Module Alignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedSignalAnalyticsDashboard />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="diagnostics" className="space-y-6">
            <EnhancedSignalAnalyticsDashboard />
          </TabsContent>
          
          <TabsContent value="realtime" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Live Signal Generation
                  <Badge variant="default" className="ml-2">Live</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedSignalAnalyticsDashboard />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="ai" className="space-y-6">
            <EnhancedSignalAnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default EnhancedSignalAnalytics;