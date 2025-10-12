import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AutomatedTradingPanel } from '@/components/AutomatedTradingPanel';
import { MultiTimeframeAnalysis } from '@/components/MultiTimeframeAnalysis';
import { IntelligenceBacktestingPanel } from '@/components/IntelligenceBacktestingPanel';
import FundamentalSignalsPanel from '@/components/FundamentalSignalsPanel';
// Portfolio management removed - now using global system
import { Brain, Clock, BarChart3, Briefcase, DollarSign } from 'lucide-react';

export default function IntelligenceHub() {
  const [portfolioId] = useState('default-portfolio-id');

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground flex items-center justify-center gap-3">
            <Brain className="h-10 w-10 text-primary" />
            Intelligence Hub
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Advanced AI-driven trading intelligence with automated execution, multi-timeframe analysis, 
            backtesting, and professional portfolio management
          </p>
        </div>

        {/* Feature Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="flex items-center justify-center mb-2">
                <Brain className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="font-medium">Automated Trading</h3>
              <p className="text-sm text-muted-foreground">AI-powered trade execution</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="font-medium">Multi-Timeframe</h3>
              <p className="text-sm text-muted-foreground">Cross-timeframe fusion</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="flex items-center justify-center mb-2">
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
              <h3 className="font-medium">Backtesting</h3>
              <p className="text-sm text-muted-foreground">Performance analytics</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="flex items-center justify-center mb-2">
                <Briefcase className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="font-medium">Portfolio Mgmt</h3>
              <p className="text-sm text-muted-foreground">Intelligent allocation</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="automated" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="automated" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Automated Trading
            </TabsTrigger>
            <TabsTrigger value="fundamental" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Fundamental Signals
            </TabsTrigger>
            <TabsTrigger value="timeframe" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Multi-Timeframe
            </TabsTrigger>
            <TabsTrigger value="backtesting" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Backtesting
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Portfolio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="automated">
            <AutomatedTradingPanel portfolioId={portfolioId} />
          </TabsContent>

          <TabsContent value="fundamental">
            <FundamentalSignalsPanel />
          </TabsContent>

          <TabsContent value="timeframe">
            <MultiTimeframeAnalysis symbol="EUR/USD" />
          </TabsContent>

          <TabsContent value="backtesting">
            <IntelligenceBacktestingPanel symbol="EUR/USD" />
          </TabsContent>

          <TabsContent value="portfolio">
            <Card>
              <CardHeader>
                <CardTitle>Global Trading System</CardTitle>
                <CardDescription>
                  Portfolio management has been simplified to a global trading account system.
                  All trading now happens through the unified Shadow Trading interface.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Visit the Shadow Trading page to access the simplified global trading system.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}