import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import Index from "./pages/Index";
import ShadowTrading from "./pages/ShadowTrading";
import AnalysisHub from "./pages/AnalysisHub";
import SystemHub from "./pages/SystemHub";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider defaultOpen={true}>
            <div className="min-h-screen flex w-full overflow-x-hidden">
            <AppSidebar />
            <div className="flex-1 flex flex-col w-full min-w-0">
              <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b-money-green/20">
                <div className="flex h-12 sm:h-14 items-center gap-2 sm:gap-4 px-2 sm:px-4">
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
                  <Route path="/trading" element={<ShadowTrading />} />
                  <Route path="/analysis" element={<AnalysisHub />} />
                  <Route path="/system" element={<SystemHub />} />

                  {/* Redirects from old routes */}
                  <Route path="/shadow-trading" element={<Navigate to="/trading" replace />} />
                  <Route path="/enhanced-trading" element={<Navigate to="/trading" replace />} />
                  <Route path="/signal-analytics" element={<Navigate to="/" replace />} />
                  <Route path="/enhanced-signal-analytics" element={<Navigate to="/" replace />} />
                  <Route path="/intelligence-hub" element={<Navigate to="/analysis" replace />} />
                  <Route path="/system-monitor" element={<Navigate to="/system" replace />} />
                  <Route path="/autonomous-learning" element={<Navigate to="/system" replace />} />
                  <Route path="/technical-analysis" element={<Navigate to="/analysis" replace />} />
                  <Route path="/fundamental-analysis" element={<Navigate to="/analysis" replace />} />
                  <Route path="/sentiment-analysis" element={<Navigate to="/analysis" replace />} />
                  <Route path="/quantitative-analysis" element={<Navigate to="/analysis" replace />} />
                  <Route path="/intermarket-analysis" element={<Navigate to="/analysis" replace />} />
                  <Route path="/specialized-analysis" element={<Navigate to="/analysis" replace />} />
                  <Route path="/metatrader4" element={<Navigate to="/trading" replace />} />

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
