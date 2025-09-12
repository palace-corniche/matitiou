import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'analysis' | 'trading' | 'system';
  risk: 'low' | 'medium' | 'high';
}

const DEFAULT_FLAGS: FeatureFlag[] = [
  {
    key: 'enable_page_analysis_tabs',
    name: 'Analysis Pages Navigation',
    description: 'Show Technical, Fundamental, Sentiment, Quantitative, Intermarket, and Specialized analysis pages in navigation',
    enabled: true, // Enable by default for Phase 5
    category: 'analysis',
    risk: 'low'
  },
  {
    key: 'enable_adapters',
    name: 'Analysis Adapters',
    description: 'Enable real-time analysis adapters for signal generation',
    enabled: true,
    category: 'analysis',
    risk: 'medium'
  },
  {
    key: 'fusion_mode',
    name: 'Fusion Mode',
    description: 'Master signal fusion mode: observe_only, assist, or full_auto',
    enabled: false,
    category: 'trading',
    risk: 'high'
  },
  {
    key: 'enable_real_time_pipeline',
    name: 'Real-time Pipeline',
    description: 'Process live market data through analysis pipeline',
    enabled: true,
    category: 'system',
    risk: 'medium'
  },
  {
    key: 'enable_pattern_detection',
    name: 'Pattern Detection',
    description: 'Advanced harmonic and Elliott wave pattern detection',
    enabled: true,
    category: 'analysis',
    risk: 'low'
  }
];

export const FeatureFlagToggle: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>(DEFAULT_FLAGS);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    // Load flags from localStorage
    const savedFlags = localStorage.getItem('feature_flags');
    if (savedFlags) {
      try {
        const parsed = JSON.parse(savedFlags);
        setFlags(current => current.map(flag => ({
          ...flag,
          enabled: parsed[flag.key] ?? flag.enabled
        })));
      } catch (error) {
        console.error('Error loading feature flags:', error);
      }
    }
  }, []);

  const updateFlag = (key: string, enabled: boolean) => {
    setFlags(current => {
      const updated = current.map(flag => 
        flag.key === key ? { ...flag, enabled } : flag
      );
      
      // Save to localStorage
      const flagsObject = updated.reduce((acc, flag) => {
        acc[flag.key] = flag.enabled;
        return acc;
      }, {} as Record<string, boolean>);
      
      localStorage.setItem('feature_flags', JSON.stringify(flagsObject));
      
      // Trigger page reload for navigation changes
      if (key === 'enable_page_analysis_tabs') {
        setTimeout(() => window.location.reload(), 100);
      }
      
      return updated;
    });
  };

  const resetToDefaults = () => {
    setFlags(DEFAULT_FLAGS);
    localStorage.removeItem('feature_flags');
    window.location.reload();
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'analysis': return '📊';
      case 'trading': return '💹';
      case 'system': return '⚙️';
      default: return '🔧';
    }
  };

  const visibleFlags = showAll ? flags : flags.filter(flag => flag.risk !== 'high');
  const enabledCount = flags.filter(flag => flag.enabled).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Feature Flags
            </CardTitle>
            <CardDescription>
              Control system features and experimental functionality
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {enabledCount}/{flags.length} enabled
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showAll ? 'Hide Advanced' : 'Show All'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {visibleFlags.map((flag) => (
            <div key={flag.key} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{getCategoryIcon(flag.category)}</span>
                  <h4 className="font-medium">{flag.name}</h4>
                  <Badge variant={getRiskColor(flag.risk)} className="text-xs">
                    {flag.risk} risk
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {flag.description}
                </p>
                {flag.risk === 'high' && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-orange-600">
                    <AlertTriangle className="h-3 w-3" />
                    High-risk feature - use with caution
                  </div>
                )}
              </div>
              <Switch
                checked={flag.enabled}
                onCheckedChange={(enabled) => updateFlag(flag.key, enabled)}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Changes take effect immediately. Some features may require page refresh.
            </div>
            <Button variant="outline" size="sm" onClick={resetToDefaults}>
              Reset to Defaults
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Export feature flag utility functions
export const getFeatureFlag = (key: string, defaultValue: boolean = false): boolean => {
  try {
    const flags = localStorage.getItem('feature_flags');
    if (flags) {
      const parsed = JSON.parse(flags);
      return parsed[key] ?? defaultValue;
    }
  } catch (error) {
    console.error('Error reading feature flag:', error);
  }
  return defaultValue;
};

export const setFeatureFlag = (key: string, value: boolean): void => {
  try {
    const flags = localStorage.getItem('feature_flags');
    const parsed = flags ? JSON.parse(flags) : {};
    parsed[key] = value;
    localStorage.setItem('feature_flags', JSON.stringify(parsed));
  } catch (error) {
    console.error('Error setting feature flag:', error);
  }
};