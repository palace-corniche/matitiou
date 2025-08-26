import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ShadowTrading from "./pages/ShadowTrading";
import SignalAnalytics from "./pages/SignalAnalytics";
import EnhancedTrading from "./pages/EnhancedTrading";
import SystemMonitor from "./pages/SystemMonitor";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/enhanced-trading" element={<EnhancedTrading />} />
          <Route path="/signal-analytics" element={<SignalAnalytics />} />
          <Route path="/shadow-trading" element={<ShadowTrading />} />
          <Route path="/system-monitor" element={<SystemMonitor />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
