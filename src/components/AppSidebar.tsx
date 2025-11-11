import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  BarChart3,
  Target,
  Activity,
  TrendingUp,
  Zap,
  Brain,
  LineChart,
  Newspaper,
  TrendingDown,
  Calculator,
  Network,
  Waves,
  Settings,
  GraduationCap
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';

const navigationGroups = [
  {
    label: 'Trading',
    items: [
      { title: 'Dashboard', url: '/', icon: BarChart3, end: true },
      { title: 'Shadow Trading', url: '/shadow-trading', icon: Target },
      { title: 'Enhanced Trading', url: '/enhanced-trading', icon: Zap, badge: 'PRO' },
      { title: 'Intelligence Hub', url: '/intelligence-hub', icon: Brain, badge: 'NEW' },
    ]
  },
  {
    label: 'Analytics & Signals',
    items: [
      { title: 'Signal Analytics', url: '/signal-analytics', icon: TrendingUp },
      { title: 'Enhanced Analytics', url: '/enhanced-signal-analytics', icon: Zap, badge: 'NEW' },
    ]
  },
  {
    label: 'Market Analysis',
    items: [
      { title: 'Technical', url: '/technical-analysis', icon: LineChart },
      { title: 'Fundamental', url: '/fundamental-analysis', icon: Newspaper },
      { title: 'Sentiment', url: '/sentiment-analysis', icon: TrendingDown },
      { title: 'Quantitative', url: '/quantitative-analysis', icon: Calculator },
      { title: 'Intermarket', url: '/intermarket-analysis', icon: Network },
      { title: 'Specialized', url: '/specialized-analysis', icon: Waves },
    ]
  },
  {
    label: 'System & Learning',
    items: [
      { title: 'System Monitor', url: '/system-monitor', icon: Activity },
      { title: 'Autonomous Learning', url: '/autonomous-learning', icon: GraduationCap },
    ]
  }
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-lg font-bold">ProTrade AI</h2>
              <p className="text-xs text-muted-foreground">Professional Trading</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = item.end 
                    ? location.pathname === item.url 
                    : location.pathname.startsWith(item.url);
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <NavLink 
                          to={item.url} 
                          end={item.end}
                          className="hover:bg-muted/50"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          {item.badge && !collapsed && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
