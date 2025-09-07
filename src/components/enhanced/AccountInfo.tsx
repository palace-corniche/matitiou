// AccountInfo Component - Account balance and status display

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingUp, TrendingDown, Shield, Zap } from 'lucide-react';

interface Portfolio {
  id: string;
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  floating_pnl: number;
  margin_level: number;
  account_type: string;
  account_currency: string;
  leverage: number;
  account_number: number;
  account_name: string;
  account_server: string;
  account_company: string;
}

interface AccountInfoProps {
  portfolio: Portfolio | null;
}

export const AccountInfo: React.FC<AccountInfoProps> = ({ portfolio }) => {
  if (!portfolio) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Account Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Loading account information...
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: portfolio.account_currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const marginLevelColor = () => {
    const level = portfolio.margin_level;
    if (level >= 200) return 'text-green-600';
    if (level >= 100) return 'text-yellow-600';
    return 'text-red-600';
  };

  const marginLevelProgress = () => {
    const level = portfolio.margin_level;
    return Math.min(level / 500 * 100, 100); // Cap at 500% for display
  };

  const floatingPnLColor = () => {
    const pnl = portfolio.floating_pnl || 0;
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          Account Info
          <Badge variant={portfolio.account_type === 'demo' ? 'secondary' : 'default'}>
            {portfolio.account_type.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Account Details */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            <div>#{portfolio.account_number}</div>
            <div>{portfolio.account_name}</div>
            <div>{portfolio.account_server}</div>
          </div>
        </div>

        {/* Balance Information */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Balance</span>
            <span className="font-medium">{formatCurrency(portfolio.balance)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Equity</span>
            <span className="font-medium">{formatCurrency(portfolio.equity)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Floating P&L</span>
            <span className={`font-medium flex items-center gap-1 ${floatingPnLColor()}`}>
              {portfolio.floating_pnl >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {formatCurrency(portfolio.floating_pnl || 0)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Used Margin</span>
            <span className="font-medium">{formatCurrency(portfolio.margin)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Free Margin</span>
            <span className="font-medium">{formatCurrency(portfolio.free_margin)}</span>
          </div>
        </div>

        {/* Margin Level */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Margin Level
            </span>
            <span className={`font-medium ${marginLevelColor()}`}>
              {portfolio.margin_level.toFixed(2)}%
            </span>
          </div>
          <Progress 
            value={marginLevelProgress()} 
            className={`h-2 ${
              portfolio.margin_level >= 200 ? '[&>div]:bg-green-500' :
              portfolio.margin_level >= 100 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'
            }`}
          />
          <div className="text-xs text-muted-foreground">
            {portfolio.margin_level < 100 ? 'Margin Call Risk' : 
             portfolio.margin_level < 200 ? 'Low Margin' : 'Safe'}
          </div>
        </div>

        {/* Leverage */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Leverage
          </span>
          <span className="font-medium">1:{portfolio.leverage}</span>
        </div>

        {/* Account Status Indicators */}
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">
            {portfolio.account_currency}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {portfolio.account_company}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};