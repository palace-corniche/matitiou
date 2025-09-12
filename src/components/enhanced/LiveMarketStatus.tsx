import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Wifi, WifiOff, TrendingUp, TrendingDown, Clock, Globe } from 'lucide-react';
import { realTimeTickEngine } from '@/services/realTimeTickEngine';

interface LiveMarketStatusProps {
  currentPrice?: number;
  tickData?: any;
  isConnected?: boolean;
}

export const LiveMarketStatus: React.FC<LiveMarketStatusProps> = ({
  currentPrice,
  tickData,
  isConnected = false
}) => {
  const [dataSourceStatus, setDataSourceStatus] = useState<{
    isLive: boolean;
    dataSource: string;
    lastUpdate: string;
    marketOpen: boolean;
  } | null>(null);

  useEffect(() => {
    const updateStatus = async () => {
      try {
        const status = await realTimeTickEngine.getDataSourceStatus();
        setDataSourceStatus(status);
      } catch (error) {
        console.error('Failed to get data source status:', error);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getDataSourceInfo = () => {
    if (!dataSourceStatus) return { label: 'Unknown', color: 'secondary', icon: Clock };

    switch (dataSourceStatus.dataSource) {
      case 'real_market_data':
        return { 
          label: 'Live Market Data', 
          color: 'default', 
          icon: Globe,
          description: 'Real-time forex rates'
        };
      case 'enhanced_simulation':
        return { 
          label: 'Enhanced Simulation', 
          color: 'secondary', 
          icon: TrendingUp,
          description: 'Based on last real price'
        };
      case 'weekend_simulation':
        return { 
          label: 'Weekend Mode', 
          color: 'outline', 
          icon: Clock,
          description: 'Market closed simulation'
        };
      default:
        return { 
          label: 'Loading...', 
          color: 'secondary', 
          icon: Clock,
          description: 'Connecting to data source'
        };
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch {
      return 'N/A';
    }
  };

  const dataSourceInfo = getDataSourceInfo();
  const IconComponent = dataSourceInfo.icon;

  return (
    <Card className="border-muted">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Connection Status */}
            <div className="flex items-center space-x-1">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "LIVE" : "OFFLINE"}
              </Badge>
            </div>

            {/* Data Source */}
            <div className="flex items-center space-x-1">
              <IconComponent className="h-4 w-4 text-muted-foreground" />
              <Badge variant={dataSourceInfo.color as any}>
                {dataSourceInfo.label}
              </Badge>
            </div>

            {/* Market Status */}
            {dataSourceStatus && (
              <Badge variant={dataSourceStatus.marketOpen ? "default" : "outline"}>
                {dataSourceStatus.marketOpen ? "Market Open" : "Market Closed"}
              </Badge>
            )}
          </div>

          {/* Price Display */}
          <div className="text-right">
            <div className="text-lg font-mono font-bold">
              EUR/USD {currentPrice ? currentPrice.toFixed(5) : '-.-----'}
            </div>
            {tickData && (
              <div className="text-xs text-muted-foreground">
                Bid: {tickData.bid?.toFixed(5)} | Ask: {tickData.ask?.toFixed(5)}
                <br />
                Spread: {((tickData.spread || 0) * 10000).toFixed(1)} pips
              </div>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
          <span>{dataSourceInfo.description}</span>
          {dataSourceStatus && (
            <span>Last: {formatTime(dataSourceStatus.lastUpdate)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};