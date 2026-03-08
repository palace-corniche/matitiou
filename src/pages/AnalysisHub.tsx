import React, { Suspense, lazy } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Newspaper, TrendingDown, Calculator, Network, Waves } from 'lucide-react';

// Lazy load heavy analysis pages
const TechnicalAnalysis = lazy(() => import('@/pages/TechnicalAnalysis'));
const FundamentalAnalysis = lazy(() => import('@/pages/FundamentalAnalysis'));
const SentimentAnalysis = lazy(() => import('@/pages/SentimentAnalysis'));
const QuantitativeAnalysis = lazy(() => import('@/pages/QuantitativeAnalysis'));
const IntermarketAnalysis = lazy(() => import('@/pages/IntermarketAnalysis'));
const SpecializedAnalysis = lazy(() => import('@/pages/SpecializedAnalysis'));

const AnalysisLoading = () => (
  <div className="space-y-4 p-6">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-64 w-full rounded-xl" />
    <div className="grid grid-cols-2 gap-4">
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  </div>
);

const tabs = [
  { value: 'technical', label: 'Technical', icon: BarChart3 },
  { value: 'fundamental', label: 'Fundamental', icon: Newspaper },
  { value: 'sentiment', label: 'Sentiment', icon: TrendingDown },
  { value: 'quantitative', label: 'Quantitative', icon: Calculator },
  { value: 'intermarket', label: 'Intermarket', icon: Network },
  { value: 'specialized', label: 'Specialized', icon: Waves },
];

const AnalysisHub: React.FC = () => {
  return (
    <>
      <PageHeader
        title="Market Analysis"
        description="Six-pillar analysis across technical, fundamental, sentiment, quantitative, intermarket, and specialized modules"
        icon={BarChart3}
      />
      <div className="container mx-auto px-3 py-4 sm:px-6">
        <Tabs defaultValue="technical" className="space-y-4">
          <TabsList className="inline-flex h-10 w-auto gap-1 bg-muted/60 p-1 rounded-lg flex-wrap">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-xs sm:text-sm px-3 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="technical" className="mt-0">
            <Suspense fallback={<AnalysisLoading />}>
              <TechnicalAnalysis />
            </Suspense>
          </TabsContent>

          <TabsContent value="fundamental" className="mt-0">
            <Suspense fallback={<AnalysisLoading />}>
              <FundamentalAnalysis />
            </Suspense>
          </TabsContent>

          <TabsContent value="sentiment" className="mt-0">
            <Suspense fallback={<AnalysisLoading />}>
              <SentimentAnalysis />
            </Suspense>
          </TabsContent>

          <TabsContent value="quantitative" className="mt-0">
            <Suspense fallback={<AnalysisLoading />}>
              <QuantitativeAnalysis />
            </Suspense>
          </TabsContent>

          <TabsContent value="intermarket" className="mt-0">
            <Suspense fallback={<AnalysisLoading />}>
              <IntermarketAnalysis />
            </Suspense>
          </TabsContent>

          <TabsContent value="specialized" className="mt-0">
            <Suspense fallback={<AnalysisLoading />}>
              <SpecializedAnalysis />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default AnalysisHub;
