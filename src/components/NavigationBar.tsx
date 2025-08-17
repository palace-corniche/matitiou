import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Target, 
  Activity,
  TrendingUp,
  Zap
} from 'lucide-react';

const NavigationBar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    {
      path: '/',
      label: 'Trading Dashboard',
      icon: <BarChart3 className="h-4 w-4" />,
      description: 'Live market analysis & signals'
    },
    {
      path: '/shadow-trading',
      label: 'Shadow Trading',
      icon: <Target className="h-4 w-4" />,
      description: 'Virtual portfolio performance',
      badge: 'NEW'
    }
  ];

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
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              
              return (
                <Link key={item.path} to={item.path}>
                  <Button 
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    className="flex items-center gap-2 relative"
                  >
                    {item.icon}
                    <span className="hidden sm:inline">{item.label}</span>
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
            <div className="flex items-center gap-1 text-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium hidden sm:inline">Live</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-xs font-medium hidden sm:inline">AI Active</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;