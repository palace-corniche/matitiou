import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// SystemStatusButton removed
import { 
  BarChart3, 
  Target, 
  Activity,
  TrendingUp,
  Zap
} from 'lucide-react';

const NavigationBar: React.FC = () => {
  const location = useLocation();

  // Feature flag for analysis pages - now controlled by feature flags
  const enableAnalysisPages = true; // Enabled by default for Phase 5
  
  const coreNavItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: <BarChart3 className="h-4 w-4" />,
      description: 'Live market analysis & signals'
    },
    {
      path: '/enhanced-trading',
      label: 'Enhanced Trading',
      icon: <Zap className="h-4 w-4" />,
      description: 'Advanced trading features',
      badge: 'PRO'
    },
    {
      path: '/signal-analytics',
      label: 'Signal Analytics',
      icon: <TrendingUp className="h-4 w-4" />,
      description: 'Signal performance metrics'
    },
    {
      path: '/enhanced-signal-analytics',
      label: 'Enhanced Analytics',
      icon: <Zap className="h-4 w-4" />,
      description: 'Master signal analysis & diagnostics',
      badge: 'NEW'
    },
    {
      path: '/shadow-trading',
      label: 'Shadow Trading',
      icon: <Target className="h-4 w-4" />,
      description: 'Virtual portfolio performance'
    },
    {
      path: '/system-monitor',
      label: 'System Monitor',
      icon: <Activity className="h-4 w-4" />,
      description: 'Real-time system status'
    }
  ];

  // Analysis pages (controlled by feature flag)
  const analysisNavItems = [
    {
      path: '/technical-analysis',
      label: 'Technical',
      icon: <BarChart3 className="h-4 w-4" />,
      description: 'Technical indicators & patterns',
      badge: 'ANALYSIS'
    },
    {
      path: '/fundamental-analysis',
      label: 'Fundamental', 
      icon: <Activity className="h-4 w-4" />,
      description: 'Economic events & news',
      badge: 'ANALYSIS'
    },
    {
      path: '/sentiment-analysis',
      label: 'Sentiment',
      icon: <TrendingUp className="h-4 w-4" />,
      description: 'Market sentiment & positioning',
      badge: 'ANALYSIS'
    },
    {
      path: '/quantitative-analysis',
      label: 'Quantitative',
      icon: <Target className="h-4 w-4" />,
      description: 'Statistical analysis & models',
      badge: 'ANALYSIS'
    },
    {
      path: '/intermarket-analysis',
      label: 'Intermarket',
      icon: <Activity className="h-4 w-4" />,
      description: 'Cross-asset correlations',
      badge: 'ANALYSIS'
    },
    {
      path: '/specialized-analysis',
      label: 'Specialized',
      icon: <Target className="h-4 w-4" />,
      description: 'Elliott waves & harmonics',
      badge: 'ANALYSIS'
    }
  ];

  const navItems = enableAnalysisPages ? [...coreNavItems, ...analysisNavItems] : coreNavItems;

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">ProTrade AI</h1>
                <p className="text-xs text-muted-foreground">Professional Trading System</p>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              
              return (
                <Link key={item.path} to={item.path}>
                  <Button 
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    className="flex items-center gap-2 relative text-xs"
                  >
                    {item.icon}
                    <span className="hidden lg:inline">{item.label}</span>
                    <span className="hidden md:inline lg:hidden">{item.label.split(' ')[0]}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Status Indicators */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-bullish">
              <div className="w-2 h-2 bg-bullish rounded-full animate-pulse"></div>
              <span className="text-xs font-medium hidden sm:inline">Live</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;