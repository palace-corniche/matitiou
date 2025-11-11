import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import Index from "./pages/Index";
import ShadowTrading from "./pages/ShadowTrading";
import SignalAnalytics from "./pages/SignalAnalytics";
import EnhancedSignalAnalytics from "./pages/EnhancedSignalAnalytics";
import EnhancedTrading from "./pages/EnhancedTrading";
import SystemMonitor from "./pages/SystemMonitor";
import AutonomousLearning from "./pages/AutonomousLearning";
import IntelligenceHub from "./pages/IntelligenceHub";
import NotFound from "./pages/NotFound";
import TechnicalAnalysis from "./pages/TechnicalAnalysis";
import FundamentalAnalysis from "./pages/FundamentalAnalysis";
import SentimentAnalysis from "./pages/SentimentAnalysis";
import QuantitativeAnalysis from "./pages/QuantitativeAnalysis";
import IntermarketAnalysis from "./pages/IntermarketAnalysis";
import SpecializedAnalysis from "./pages/SpecializedAnalysis";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider defaultOpen={true}>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col w-full">
              <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-14 items-center gap-4 px-4">
                  <SidebarTrigger className="-ml-1" />
                  <div className="flex items-center gap-2 ml-auto">
                    <div className="flex items-center gap-1 text-bullish">
                      <div className="w-2 h-2 bg-bullish rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium hidden sm:inline">Live</span>
                    </div>
                  </div>
                </div>
              </header>
              <main className="flex-1 w-full">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/enhanced-trading" element={<EnhancedTrading />} />
                  <Route path="/signal-analytics" element={<SignalAnalytics />} />
                  <Route path="/enhanced-signal-analytics" element={<EnhancedSignalAnalytics />} />
                  <Route path="/shadow-trading" element={<ShadowTrading />} />
                  <Route path="/intelligence-hub" element={<IntelligenceHub />} />
                  <Route path="/metatrader4" element={<Navigate to="/shadow-trading" replace />} />
                  <Route path="/system-monitor" element={<SystemMonitor />} />
                  <Route path="/autonomous-learning" element={<AutonomousLearning />} />
                  <Route path="/technical-analysis" element={<TechnicalAnalysis />} />
                  <Route path="/fundamental-analysis" element={<FundamentalAnalysis />} />
                  <Route path="/sentiment-analysis" element={<SentimentAnalysis />} />
                  <Route path="/quantitative-analysis" element={<QuantitativeAnalysis />} />
                  <Route path="/intermarket-analysis" element={<IntermarketAnalysis />} />
                  <Route path="/specialized-analysis" element={<SpecializedAnalysis />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
