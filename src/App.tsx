import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ShadowTrading from "./pages/ShadowTrading";
import SignalAnalytics from "./pages/SignalAnalytics";
import EnhancedSignalAnalytics from "./pages/EnhancedSignalAnalytics";
import EnhancedTrading from "./pages/EnhancedTrading";
import SystemMonitor from "./pages/SystemMonitor";
import NotFound from "./pages/NotFound";
import TechnicalAnalysis from "./pages/TechnicalAnalysis";
import FundamentalAnalysis from "./pages/FundamentalAnalysis";
import SentimentAnalysis from "./pages/SentimentAnalysis";
import QuantitativeAnalysis from "./pages/QuantitativeAnalysis";
import IntermarketAnalysis from "./pages/IntermarketAnalysis";
import SpecializedAnalysis from "./pages/SpecializedAnalysis";
import MetaTrader4Dashboard from "./components/MetaTrader4Dashboard";
import NavigationBar from "./components/NavigationBar";

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
          <Route path="/enhanced-signal-analytics" element={<EnhancedSignalAnalytics />} />
          <Route path="/shadow-trading" element={<ShadowTrading />} />
          <Route path="/metatrader4" element={<div className="min-h-screen bg-background"><NavigationBar /><MetaTrader4Dashboard /></div>} />
          <Route path="/system-monitor" element={<SystemMonitor />} />
          <Route path="/technical-analysis" element={<TechnicalAnalysis />} />
          <Route path="/fundamental-analysis" element={<FundamentalAnalysis />} />
          <Route path="/sentiment-analysis" element={<SentimentAnalysis />} />
          <Route path="/quantitative-analysis" element={<QuantitativeAnalysis />} />
          <Route path="/intermarket-analysis" element={<IntermarketAnalysis />} />
          <Route path="/specialized-analysis" element={<SpecializedAnalysis />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
